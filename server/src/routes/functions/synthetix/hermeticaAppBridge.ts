// Ported from synthetix-ai/base44/functions/hermeticaAppBridge/entry.ts
import { registerFunction } from '../registry.js';

// TODO(port): the original talked to a *separate* "Hermetica" Base44 app via
// `createClient({ appId: HERMETICA_APP_ID, headers: { api_key: HERMETICA_APP_API_KEY } })`
// — a genuine cross-app SDK bridge. In this migration, the Hermetica app's data
// now lives in this same merged database (see routes/functions/hermetica/),
// so the cross-app hop is replaced with base44.asServiceRole.entities[entity]
// used directly. HERMETICA_APP_ID / HERMETICA_APP_API_KEY are no longer needed.

registerFunction('hermeticaAppBridge', async (req, res, base44) => {
  try {
    const user = await base44.auth.me();
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    if (user.role !== 'admin') {
      res.status(403).json({ error: 'Admin access required for bridge operations' });
      return;
    }

    const body = req.body || {};
    const { action, entity, id, data, sort, limit, filter } = body;

    if (!action || !entity) {
      res.status(400).json({ error: 'Missing required fields: action, entity' });
      return;
    }

    // Restrict to read-only actions for safety; destructive ops must go through the Hermetica app directly
    const ALLOWED_ACTIONS = ['list', 'filter', 'get', 'schema'];
    if (!ALLOWED_ACTIONS.includes(action)) {
      res.status(403).json({ error: `Action "${action}" not permitted via bridge. Allowed: ${ALLOWED_ACTIONS.join(', ')}` });
      return;
    }

    const entityClient: any = base44.asServiceRole.entities[entity];

    if (!entityClient) {
      res.status(404).json({ error: `Entity "${entity}" not found in Hermetica app` });
      return;
    }

    let result;

    switch (action) {
      case 'list':
        result = await entityClient.list(sort || '-created_date', limit || 50);
        break;

      case 'filter':
        result = await entityClient.filter(filter || {}, sort || '-created_date', limit || 50);
        break;

      case 'get':
        if (!id) { res.status(400).json({ error: 'Missing id for get action' }); return; }
        result = await entityClient.get(id);
        break;

      case 'create':
        if (!data) { res.status(400).json({ error: 'Missing data for create action' }); return; }
        result = await entityClient.create(data);
        break;

      case 'update':
        if (!id || !data) { res.status(400).json({ error: 'Missing id or data for update action' }); return; }
        result = await entityClient.update(id, data);
        break;

      case 'delete':
        if (!id) { res.status(400).json({ error: 'Missing id for delete action' }); return; }
        result = await entityClient.delete(id);
        break;

      case 'schema':
        // TODO(port): base44Compat's entity client has no .schema() method
        // (no schema-introspection endpoint modeled). Original returned the
        // remote app's live entity schema; unsupported here.
        res.status(501).json({ error: 'schema action is not supported by the self-hosted bridge' });
        return;

      default:
        res.status(400).json({ error: `Unknown action: ${action}. Use: list, filter, get, create, update, delete, schema` });
        return;
    }

    res.json({ success: true, data: result });
    return;

  } catch (error: any) {
    res.status(500).json({ error: error.message });
    return;
  }
});
