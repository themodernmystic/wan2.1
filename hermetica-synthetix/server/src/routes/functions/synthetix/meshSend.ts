// Ported from synthetix-ai/base44/functions/meshSend/entry.ts
import { registerFunction } from '../registry.js';

const THIS_APP_ID = '69fefe4fbbade1e2e5a4edea';
const THIS_AGENT = 'Riley';

// TODO(port): the original called `targetApp.functions.invoke('meshReceive', payload)`
// via the Base44 cross-app SDK (`createClient({ appId, headers: { api_key } })`),
// reaching a *different* Base44-hosted sibling app (Khemia/Nova/james_ai — apps
// that are not part of this migration and are not in this codebase). There is
// no equivalent in base44Compat, which only models this single merged app.
// Ported as a best-effort raw HTTPS call to Base44's REST function-invoke
// endpoint using the workspace API key, preserving the original "direct call,
// loud failure on error" behaviour. This will only actually succeed while the
// target sibling app is still live on Base44 with that API key valid.
async function invokeRemoteBase44Function(appId: string, apiKey: string, name: string, payload: any): Promise<any> {
  const r = await fetch(`https://api.base44.com/api/apps/${appId}/functions/${name}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', api_key: apiKey },
    body: JSON.stringify(payload),
  });
  const data: any = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data?.error || `${name} invocation failed (${r.status})`);
  return { data };
}

registerFunction('meshSend', async (req, res, base44) => {
  try {
    // Auth — require platform-authenticated caller (user or service-role); no unverified header fallback
    // TODO(port): base44.auth.isAuthenticated() has no equivalent in
    // base44Compat (only auth.me() is modeled) — adapted to a truthy check.
    const isAuthenticated = !!(await base44.auth.me());
    if (!isAuthenticated) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const body = req.body || {};
    const {
      to_agent,
      message_body,
      subject,
      priority = 'normal',
      requires_reply = true,
      correlation_id,
      metadata = {},
    } = body;

    if (!to_agent) { res.status(400).json({ success: false, error: 'to_agent is required' }); return; }
    if (!message_body) { res.status(400).json({ success: false, error: 'message_body is required' }); return; }

    // ── STEP 1: LOOKUP target home_app_id ──────────────────────────
    let sibling: any = null;
    try {
      const siblings = await base44.asServiceRole.entities.MeshSibling.filter({
        agent_name: to_agent,
        status: 'active',
      });
      sibling = siblings && (siblings as any[])[0];
    } catch (_) {}

    if (!sibling) {
      res.json({ success: false, error: 'unknown_recipient', to_agent });
      return;
    }

    const target_app_id = sibling.home_app_id;
    if (!target_app_id || target_app_id === 'TBC') {
      res.json({ success: false, error: 'stranded_agent', to_agent });
      return;
    }

    // ── STEP 2: GENERATE transmission_id + timestamp ───────────────
    const transmission_id = crypto.randomUUID();
    const delivery_attempted_at = new Date().toISOString();

    // ── STEP 3: SIZE HANDLING (preserve existing logic) ────────────
    let finalBody = message_body;
    let contextUrl = null;

    if (message_body.length > 8000) {
      try {
        const blob = new Blob([message_body], { type: 'text/plain' });
        const { file_url } = await base44.asServiceRole.integrations.Core.UploadFile({ file: blob });
        contextUrl = file_url;
        finalBody = message_body.substring(0, 8000) + '\n\n[truncated — see context_url]';
      } catch (_) {
        res.status(413).json({ success: false, error: 'payload_too_large' });
        return;
      }
    }

    // ── STEP 4: BUILD payload (matches meshReceive contract) ────────
    const finalSubject = subject || `${THIS_AGENT} → ${to_agent}: ${finalBody.substring(0, 60)}...`;

    const payload = {
      from_agent: THIS_AGENT,
      from_app_id: THIS_APP_ID,
      to_agent,
      subject: finalSubject,
      message_body: finalBody,
      context_url: contextUrl,
      transmission_id,
      correlation_id: correlation_id || null,
      priority: priority || 'normal',
      requires_reply: requires_reply !== false,
      metadata: typeof metadata === 'string' ? metadata : JSON.stringify(metadata),
    };

    // ── STEP 5: DIRECT INVOCATION (the new behaviour) ──────────────
    const workspaceKey = process.env.BASE44_WORKSPACE_API_KEY;
    if (!workspaceKey) {
      res.json({
        success: false,
        error: 'workspace_key_not_configured',
        loud: true,
      });
      return;
    }

    let deliveryResult: any;

    try {
      const result: any = await Promise.race([
        invokeRemoteBase44Function(target_app_id, workspaceKey, 'meshReceive', payload),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('direct_call_timeout_15s')), 15000)
        ),
      ]);

      // SUCCESS PATH — extract .data from Axios response (avoid circular JSON)
      deliveryResult = {
        success: true,
        transmission_id,
        status: 'delivered',
        delivery_method: 'direct',
        delivered_at: new Date().toISOString(),
        delivery_attempted_at,
        target_app_id,
        result: result?.data ?? result,
      };
    } catch (directError: any) {
      // LOUD FAILURE — Sparky's mandate. No hub fallback during Week 1.
      try {
        await base44.asServiceRole.entities.ActivityLog.create({
          event_type: 'mesh_direct_call_failed',
          actor: 'meshSend',
          summary: `Direct call to ${to_agent} @ ${target_app_id} FAILED: ${directError.message}`,
          severity: 'Error',
          timestamp: new Date().toISOString(),
          notes: JSON.stringify({
            transmission_id,
            to_agent,
            target_app_id,
            error: directError.message,
          }),
        });
      } catch (_) {}

      deliveryResult = {
        success: false,
        transmission_id,
        status: 'delivery_failed',
        delivery_method: 'direct_attempted',
        delivery_error: directError.message,
        delivery_attempted_at,
        target_app_id,
        loud: true,
        note: 'Hub fallback intentionally disabled during Week 1 proving phase. Failure is loud by design.',
      };
    }

    // ── STEP 6: REPLY HANDLING (preserve existing logic) ────────────
    if (correlation_id) {
      try {
        const originals = await base44.asServiceRole.entities.MeshInbox.filter({
          transmission_id: correlation_id,
        });
        if (originals && (originals as any[]).length > 0) {
          await base44.asServiceRole.entities.MeshInbox.update((originals as any[])[0].id, {
            status: 'replied',
            replied_at: new Date().toISOString(),
            reply_body: finalBody,
          });
        }
      } catch (_) {}
    }

    // ── STEP 7: CALLER-SIDE OUTBOX TRACKING (NEW) ──────────────────
    try {
      await base44.asServiceRole.entities.MeshInbox.create({
        from_agent: THIS_AGENT,
        from_app_id: THIS_APP_ID,
        to_agent,
        subject: finalSubject,
        message_body: finalBody,
        context_url: contextUrl,
        transmission_id,
        correlation_id: correlation_id || null,
        status: deliveryResult.success ? 'sent_delivered' : 'sent_delivery_failed',
        priority: priority || 'normal',
        requires_reply: requires_reply !== false,
        received_at: new Date().toISOString(),
        metadata: JSON.stringify({
          direction: 'outbound',
          delivery_method: deliveryResult.delivery_method,
          delivery_error: deliveryResult.delivery_error || null,
        }),
        delivered_at: deliveryResult.success ? deliveryResult.delivered_at : null,
        delivery_attempted_at: deliveryResult.delivery_attempted_at,
        delivery_error: deliveryResult.delivery_error || null,
        delivery_method: deliveryResult.success ? 'direct' : null,
      });
    } catch (_) {}

    res.json(deliveryResult);
    return;
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
    return;
  }
});
