// Ported from synthetix-ai/base44/functions/rileyStripeConnect/entry.ts
import { registerFunction } from '../registry.js';

/**
 * rileyStripeConnect — Manage Stripe operations.
 * Input: { action, data }
 */

function toFormData(obj: any, prefix = ''): string[] {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(obj || {})) {
    const key = prefix ? `${prefix}[${k}]` : k;
    if (v !== null && v !== undefined && typeof v === 'object' && !Array.isArray(v)) {
      parts.push(...toFormData(v, key));
    } else if (Array.isArray(v)) {
      v.forEach((item, i) => {
        if (typeof item === 'object') {
          parts.push(...toFormData(item, `${key}[${i}]`));
        } else {
          parts.push(`${encodeURIComponent(`${key}[${i}]`)}=${encodeURIComponent(item)}`);
        }
      });
    } else if (v !== null && v !== undefined) {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(v as any)}`);
    }
  }
  return parts;
}

async function stripeRequest(method: string, path: string, data: any, apiKey: string) {
  const start = Date.now();
  const url = `https://api.stripe.com/v1${path}`;
  const options: any = {
    method,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    signal: AbortSignal.timeout(30000),
  };
  if (data && method !== 'GET') {
    options.body = toFormData(data).join('&');
  }
  const res = await fetch(method === 'GET' && data ? `${url}?${toFormData(data).join('&')}` : url, options);
  const json: any = await res.json();
  return { json, status: res.status, duration: Date.now() - start };
}

registerFunction('rileyStripeConnect', async (req, res, base44) => {
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

    const apiKey = process.env.STRIPE_API_KEY || process.env.STRIPE_SECRET_KEY || '';
    if (!apiKey) {
      res.status(500).json({ error: 'STRIPE_API_KEY not configured' });
      return;
    }

    const ROUTES: Record<string, [string, string, any]> = {
      create_product:        ['POST', '/products',         data],
      create_price:          ['POST', '/prices',           data],
      create_payment_link:   ['POST', '/payment_links',    data],
      list_products:         ['GET',  '/products',         { limit: 20, ...data }],
      list_subscriptions:    ['GET',  '/subscriptions',    { limit: 20, ...data }],
      create_invoice:        ['POST', '/invoices',         data],
      get_balance:           ['GET',  '/balance',          null],
      list_recent_charges:   ['GET',  '/charges',          { limit: 20, ...data }],
    };

    const route = ROUTES[action];
    if (!route) {
      res.status(400).json({ error: `Unknown action: ${action}` });
      return;
    }

    const [method, path, payload] = route;
    const { json, status, duration } = await stripeRequest(method, path, payload, apiKey);

    // Log to IntegrationJob
    await base44.asServiceRole.entities.IntegrationJob.create({
      integration_name: 'Stripe',
      action,
      request_payload: JSON.stringify(data).substring(0, 2000),
      response_payload: JSON.stringify(json).substring(0, 2000),
      status: status < 300 ? 'success' : 'failed',
      error_message: json.error?.message || '',
      duration_ms: duration,
      timestamp: new Date().toISOString(),
    }).catch(() => {});

    await base44.asServiceRole.entities.CreditLedger.create({
      function_name: 'rileyStripeConnect',
      provider: 'free',
      model: 'stripe_api',
      estimated_cost: 0,
      credit_type: 'external_api',
      tokens_used: 0,
      duration_ms: duration,
      timestamp: new Date().toISOString(),
      notes: `action: ${action}`,
    }).catch(() => {});

    if (json.error) {
      res.status(400).json({ error: json.error.message, stripe_error: json.error });
      return;
    }
    res.json({ success: true, action, data: json });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
