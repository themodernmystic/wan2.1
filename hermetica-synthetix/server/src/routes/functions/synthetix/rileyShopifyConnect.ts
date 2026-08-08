// Ported from synthetix-ai/base44/functions/rileyShopifyConnect/entry.ts
import { registerFunction } from '../registry.js';

/**
 * rileyShopifyConnect — Manage Hermetic Crystals Shopify store.
 * Input: { action, data }
 */

async function shopifyRequest(method: string, endpoint: string, data: any, storeUrl: string, token: string) {
  const start = Date.now();
  const url = `https://${storeUrl}/admin/api/2024-01${endpoint}`;
  const options: any = {
    method,
    headers: {
      'X-Shopify-Access-Token': token,
      'Content-Type': 'application/json',
    },
    signal: AbortSignal.timeout(30000),
  };
  if (data && method !== 'GET') options.body = JSON.stringify(data);
  const fullUrl = method === 'GET' && data && Object.keys(data).length > 0
    ? `${url}?${new URLSearchParams(data).toString()}`
    : url;
  const res = await fetch(fullUrl, options);
  const json: any = await res.json();
  return { json, status: res.status, duration: Date.now() - start };
}

registerFunction('rileyShopifyConnect', async (req, res, base44) => {
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

    const storeUrl = process.env.SHOPIFY_STORE_URL || '';
    const token = process.env.SHOPIFY_ACCESS_TOKEN || '';
    if (!storeUrl || !token) {
      res.status(500).json({ error: 'SHOPIFY_STORE_URL or SHOPIFY_ACCESS_TOKEN not configured' });
      return;
    }

    let method: string, endpoint: string, payload: any;
    switch (action) {
      case 'list_products':
        [method, endpoint, payload] = ['GET', '/products.json', { limit: 50, ...data }]; break;
      case 'create_product':
        [method, endpoint, payload] = ['POST', '/products.json', { product: data }]; break;
      case 'update_product':
        [method, endpoint, payload] = ['PUT', `/products/${data.id}.json`, { product: data }]; break;
      case 'list_orders':
        [method, endpoint, payload] = ['GET', '/orders.json', { status: 'any', limit: 50, ...data }]; break;
      case 'get_order':
        [method, endpoint, payload] = ['GET', `/orders/${data.id}.json`, null]; break;
      case 'list_collections':
        [method, endpoint, payload] = ['GET', '/custom_collections.json', data]; break;
      case 'inventory_levels':
        [method, endpoint, payload] = ['GET', '/inventory_levels.json', data]; break;
      case 'create_collection':
        [method, endpoint, payload] = ['POST', '/custom_collections.json', { custom_collection: data }]; break;
      default:
        res.status(400).json({ error: `Unknown action: ${action}` });
        return;
    }

    const { json, status, duration } = await shopifyRequest(method, endpoint, payload, storeUrl, token);

    await base44.asServiceRole.entities.IntegrationJob.create({
      integration_name: 'Shopify',
      action,
      request_payload: JSON.stringify(data).substring(0, 2000),
      response_payload: JSON.stringify(json).substring(0, 2000),
      status: status < 300 ? 'success' : 'failed',
      error_message: json.errors ? JSON.stringify(json.errors) : '',
      duration_ms: duration,
      timestamp: new Date().toISOString(),
    }).catch(() => {});

    await base44.asServiceRole.entities.CreditLedger.create({
      function_name: 'rileyShopifyConnect',
      provider: 'free',
      model: 'shopify_api',
      estimated_cost: 0,
      credit_type: 'external_api',
      tokens_used: 0,
      duration_ms: duration,
      timestamp: new Date().toISOString(),
      notes: `action: ${action}`,
    }).catch(() => {});

    if (json.errors) {
      res.status(400).json({ error: json.errors });
      return;
    }
    res.json({ success: true, action, data: json });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
