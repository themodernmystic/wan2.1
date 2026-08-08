// Ported from synthetix-ai/base44/functions/rileyEmailConnect/entry.ts
import { registerFunction } from '../registry.js';

/**
 * rileyEmailConnect — Send emails via Resend → SendGrid → Gmail cascade.
 * CRITICAL: NEVER sends without approved_by_james = true.
 * Input: { action, data }
 */

async function sendViaResend(to: any, subject: string, bodyHtml: string, bodyText: string, apiKey: string) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'James Hatcher <james@hermeticaholdings.com>',
      to: Array.isArray(to) ? to : [to],
      subject,
      html: bodyHtml || `<p>${bodyText || ''}</p>`,
      text: bodyText || '',
    }),
    signal: AbortSignal.timeout(20000),
  });
  const json = await res.json();
  return { json, provider: 'resend', success: res.status < 300 };
}

async function sendViaSendGrid(to: any, subject: string, bodyHtml: string, bodyText: string, apiKey: string) {
  const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: Array.isArray(to) ? to[0] : to }] }],
      from: { email: 'james@hermeticaholdings.com', name: 'James Hatcher' },
      subject,
      content: [
        { type: 'text/html', value: bodyHtml || `<p>${bodyText || ''}</p>` },
        { type: 'text/plain', value: bodyText || '' },
      ],
    }),
    signal: AbortSignal.timeout(20000),
  });
  return { json: { status: res.status }, provider: 'sendgrid', success: res.status < 300 };
}

registerFunction('rileyEmailConnect', async (req, res, base44) => {
  try {
    const user = await base44.auth.me();
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { action, data = {} } = req.body || {};
    if (!action) {
      res.status(400).json({ error: 'action is required' });
      return;
    }

    const { to, subject, body_html, body_text, search_query, max_results = 20, approved_by_james = false } = data;

    if (action === 'draft') {
      // Save as draft — no send
      const draft = await base44.asServiceRole.entities.IntegrationJob.create({
        integration_name: 'Email',
        action: 'draft',
        request_payload: JSON.stringify({ to, subject, body_html: (body_html || '').substring(0, 500) }),
        response_payload: 'Saved as draft',
        status: 'success',
        timestamp: new Date().toISOString(),
        notes: 'Email draft saved — awaiting James approval before send',
      });
      res.json({ status: 'drafted', message_id: draft.id, provider_used: 'none', note: 'Awaiting approved_by_james flag to send.' });
      return;
    }

    if (action === 'send') {
      // HARD GATE — never send without approval
      if (!approved_by_james) {
        res.status(403).json({
          error: 'BLOCKED: Riley will not send emails without approved_by_james = true. Save as draft instead.',
          status: 'blocked',
        });
        return;
      }

      if (!to || !subject) {
        res.status(400).json({ error: 'to and subject are required for send' });
        return;
      }

      const resendKey = process.env.RESEND_API_KEY || '';
      const sendgridKey = process.env.SENDGRID_API_KEY || '';
      const start = Date.now();
      let result: any;

      if (resendKey) {
        result = await sendViaResend(to, subject, body_html, body_text, resendKey);
      } else if (sendgridKey) {
        result = await sendViaSendGrid(to, subject, body_html, body_text, sendgridKey);
      } else {
        res.status(500).json({ error: 'No email provider configured (RESEND_API_KEY or SENDGRID_API_KEY required)' });
        return;
      }

      const duration = Date.now() - start;
      await base44.asServiceRole.entities.IntegrationJob.create({
        integration_name: 'Email',
        action: 'send',
        request_payload: JSON.stringify({ to, subject }),
        response_payload: JSON.stringify(result.json).substring(0, 1000),
        status: result.success ? 'success' : 'failed',
        error_message: result.success ? '' : JSON.stringify(result.json),
        duration_ms: duration,
        timestamp: new Date().toISOString(),
      }).catch(() => {});

      await base44.asServiceRole.entities.CreditLedger.create({
        function_name: 'rileyEmailConnect',
        provider: 'free',
        model: result.provider,
        estimated_cost: 0,
        credit_type: 'external_api',
        tokens_used: 0,
        duration_ms: duration,
        timestamp: new Date().toISOString(),
        notes: `Sent to: ${to}`,
      }).catch(() => {});

      res.json({
        status: result.success ? 'sent' : 'failed',
        message_id: result.json?.id || null,
        provider_used: result.provider,
      });
      return;
    }

    if (action === 'list_inbox' || action === 'search') {
      // No API keys needed for listing — return helpful note
      res.json({
        status: 'not_configured',
        message: 'Gmail inbox access requires Google OAuth connector. Use Base44 connectors (gmail) for inbox read access.',
        search_query: search_query || null,
      });
      return;
    }

    res.status(400).json({ error: `Unknown action: ${action}` });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
