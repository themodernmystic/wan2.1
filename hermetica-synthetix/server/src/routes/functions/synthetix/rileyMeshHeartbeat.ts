// Ported from synthetix-ai/base44/functions/rileyMeshHeartbeat/entry.ts
import { registerFunction } from '../registry.js';

const PING_TIMEOUT_MS = 10000;

// TODO(port): base44.asServiceRole.functions.invoke(...) has no equivalent in
// base44Compat. Ported as a same-process HTTP call to this server's own
// /api/functions/workspaceBridge route (forwarding the caller's auth headers).
// Requires 'workspaceBridge' to be registered (ported) separately.
async function invokeWorkspaceBridge(req: any, payload: any): Promise<any> {
  const port = process.env.PORT || 8080;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (req.headers.authorization) headers.Authorization = req.headers.authorization as string;
  if (req.headers.cookie) headers.Cookie = req.headers.cookie as string;
  const r = await fetch(`http://localhost:${port}/api/functions/workspaceBridge`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload || {}),
  });
  const data: any = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data?.error || `workspaceBridge invocation failed (${r.status})`);
  return data;
}

async function pingBridgeNode(req: any, node: any) {
  const start = Date.now();
  try {
    const result: any = await Promise.race([
      invokeWorkspaceBridge(req, {
        target_app_id: node.app_id,
        action: 'ping',
        agent_name: node.agent_name,
        payload: { message: "Respond with 'OK' if you can hear me." },
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), PING_TIMEOUT_MS)),
    ]);
    const ok = result && (result.response || result.ok || result.status === 'ok' || JSON.stringify(result).includes('OK'));
    return { node_id: node.id, agent_name: node.agent_name, alive: !!ok, speed_ms: Date.now() - start, error: null };
  } catch (e: any) {
    return { node_id: node.id, agent_name: node.agent_name, alive: false, speed_ms: Date.now() - start, error: e.message };
  }
}

registerFunction('rileyMeshHeartbeat', async (req, res, base44) => {
  try {
    const body = req.body || {};
    const { force_test = false } = body;

    const now = new Date().toISOString();

    const nodes = await base44.asServiceRole.entities.MeshNode.list('-last_heartbeat', 100);
    const toCheck = (nodes as any[]).filter(n => n.status !== 'offline' || force_test);

    if (toCheck.length === 0) {
      res.json({ checked: 0, active: 0, degraded: 0, offline: 0, persona_auto_active: 0, message: 'No nodes to check.' });
      return;
    }

    // Separate persona nodes (always available) from bridge/function nodes (need actual ping)
    const personaNodes = toCheck.filter(n => (n.dispatch_mode || 'persona') === 'persona');
    const pingableNodes = toCheck.filter(n => n.dispatch_mode === 'bridge' || n.dispatch_mode === 'function');

    let active = 0, degraded = 0, offline = 0;
    const statusChanges: any[] = [];

    // Persona nodes — tautologically available, just stamp heartbeat
    await Promise.allSettled(personaNodes.map(async (node) => {
      const prevStatus = node.status;
      const newStatus = 'active';
      active++;
      await base44.asServiceRole.entities.MeshNode.update(node.id, {
        last_heartbeat: now,
        status: newStatus,
      });
      if (prevStatus !== newStatus) {
        statusChanges.push({ agent: node.agent_name, from: prevStatus, to: newStatus, via: 'persona_auto' });
      }
    }));

    // Bridge/function nodes — actually ping them
    if (pingableNodes.length > 0) {
      const pingResults = await Promise.allSettled(pingableNodes.map(node => pingBridgeNode(req, node)));

      await Promise.allSettled(pingResults.map(async (result, i) => {
        if (result.status !== 'fulfilled') return;
        const ping = result.value;
        const node = pingableNodes[i];
        const prevStatus = node.status;

        let newStatus;
        if (ping.alive) {
          newStatus = 'active';
          active++;
        } else if (prevStatus === 'active') {
          newStatus = 'degraded';
          degraded++;
        } else {
          newStatus = 'offline';
          offline++;
        }

        await base44.asServiceRole.entities.MeshNode.update(node.id, {
          last_heartbeat: now,
          status: newStatus,
          average_response_time_ms: ping.alive ? ping.speed_ms : node.average_response_time_ms,
        });

        if (prevStatus !== newStatus) {
          statusChanges.push({ agent: ping.agent_name, from: prevStatus, to: newStatus });

          if (newStatus === 'offline' && prevStatus === 'active') {
            await base44.asServiceRole.entities.ActivityLog.create({
              action: 'mesh_node_lost',
              entity_type: 'MeshNode',
              entity_id: node.id,
              summary: `MESH NODE LOST: ${ping.agent_name} went offline.`,
              severity: 'warning',
              timestamp: now,
            }).catch(() => {});
          }
          if (newStatus === 'active' && (prevStatus === 'offline' || prevStatus === 'degraded')) {
            await base44.asServiceRole.entities.ActivityLog.create({
              action: 'mesh_node_recovered',
              entity_type: 'MeshNode',
              entity_id: node.id,
              summary: `Mesh node recovered: ${ping.agent_name} is back online.`,
              severity: 'info',
              timestamp: now,
            }).catch(() => {});
          }
        }
      }));
    }

    res.json({
      checked: toCheck.length,
      active,
      degraded,
      offline,
      persona_auto_active: personaNodes.length,
      pingable_checked: pingableNodes.length,
      status_changes: statusChanges,
      timestamp: now,
    });
    return;
  } catch (error: any) {
    res.status(500).json({ error: error.message });
    return;
  }
});
