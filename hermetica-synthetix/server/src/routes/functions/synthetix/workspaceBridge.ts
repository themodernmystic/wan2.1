// Ported from synthetix-ai/base44/functions/workspaceBridge/entry.ts
import { registerFunction } from '../registry.js';

// TODO(port): the original createClient({ appId, headers: { api_key } }) opened a REST
// connection to a *different* Base44-hosted app (the "other" app in the two-app migration)
// using a workspace API key — a cross-tenant Base44 SDK bridge that has no Node equivalent
// now that both apps' data lives in this single merged Postgres/Prisma schema. Since the
// target entities now live in the SAME database as this function, the bridge is re-pointed
// at our own base44.asServiceRole.entities[entity] compat client instead of a remote
// createClient — this preserves the intent (read/write an entity "in the other app") without
// a real cross-workspace API key. The 'schema' action has no compat equivalent (no
// .schema() method on the compat entity client) and returns a 501.
registerFunction('workspaceBridge', async (req, res, base44) => {
  try {
    const user = await base44.auth.me();
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const API_KEY = process.env.BASE44_WORKSPACE_API_KEY;
    if (!API_KEY) {
      res.status(500).json({ error: 'BASE44_WORKSPACE_API_KEY not configured' });
      return;
    }

    const { action, app_id, entity, id, data, filter, sort, limit } = req.body || {};

    if (!action || !app_id || !entity) {
      res.status(400).json({ error: 'Missing required fields: action, app_id, entity' });
      return;
    }

    const entityClient = (base44.asServiceRole.entities as any)[entity];
    if (!entityClient) {
      res.status(404).json({ error: `Entity "${entity}" not found in app ${app_id}` });
      return;
    }

    let result: any;

    switch (action) {
      case 'list':
        result = await entityClient.list(sort || '-created_date', limit || 50);
        break;
      case 'filter':
        result = await entityClient.filter(filter || {}, sort || '-created_date', limit || 50);
        break;
      case 'get':
        if (!id) {
          res.status(400).json({ error: 'Missing id for get action' });
          return;
        }
        result = await entityClient.get(id);
        break;
      case 'create':
        if (!data) {
          res.status(400).json({ error: 'Missing data for create action' });
          return;
        }
        result = await entityClient.create(data);
        break;
      case 'update':
        if (!id || !data) {
          res.status(400).json({ error: 'Missing id or data for update action' });
          return;
        }
        result = await entityClient.update(id, data);
        break;
      case 'delete':
        if (!id) {
          res.status(400).json({ error: 'Missing id for delete action' });
          return;
        }
        result = await entityClient.delete(id);
        break;
      case 'schema':
        // TODO(port): no .schema() method on the base44Compat entity client.
        res.status(501).json({ error: 'schema action not supported by base44Compat — no schema introspection method is shimmed' });
        return;
      default:
        res.status(400).json({ error: `Unknown action: ${action}` });
        return;
    }

    // Log every action
    await base44.asServiceRole.entities.ActivityLog.create({
      event_type: `workspace_bridge_${action}`,
      actor: 'Riley',
      summary: `${action.toUpperCase()} → App:${app_id} → Entity:${entity}${id ? ` → ID:${id}` : ''}`,
      severity: ['create', 'update', 'delete'].includes(action) ? 'Warning' : 'Info',
      timestamp: new Date().toISOString(),
      notes: JSON.stringify({ app_id, entity, action, id: id || null })
    });

    res.json({ success: true, action, app_id, entity, data: result });

  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
