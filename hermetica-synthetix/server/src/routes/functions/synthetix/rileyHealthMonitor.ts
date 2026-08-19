// Ported from synthetix-ai/base44/functions/rileyHealthMonitor/entry.ts
import { registerFunction } from '../registry.js';

/**
 * rileyHealthMonitor — Checks 7 local health indicators + scans AppRegistry
 * via workspaceBridge. Logs results to ActivityLog. Runs every 6 hours.
 */

// TODO(port): base44.asServiceRole.functions.invoke(...) has no equivalent in
// base44Compat. Ported as a same-process HTTP call to this server's own
// /api/functions/workspaceBridge route, forwarding the caller's auth headers.
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

registerFunction('rileyHealthMonitor', async (req, res, base44) => {
  try {
    const user = await base44.auth.me();
    if (!user) { res.status(401).json({ error: 'Unauthorized' }); return; }

    const indicators: any[] = [];
    let overallStatus = 'healthy';

    const check = async (label: string, fn: () => Promise<string>) => {
      try {
        const result = await fn();
        indicators.push({ label, status: 'pass', detail: result });
      } catch (err: any) {
        indicators.push({ label, status: 'fail', detail: err.message });
        overallStatus = 'warning';
      }
    };

    // 1. Active projects exist
    await check('Active Projects', async () => {
      const p = await base44.asServiceRole.entities.RileyProject.filter({ status: 'Active' }, '-updated_date', 1);
      return `${p.length} active projects`;
    });

    // 2. Soul Core has active entries
    await check('Soul Core Integrity', async () => {
      const s = await base44.asServiceRole.entities.SoulCoreEntry.filter({ active: true }, '-updated_date', 1);
      if (s.length === 0) throw new Error('No active Soul Core entries');
      return `${s.length} active entries`;
    });

    // 3. Memory vault not stale (last memory < 7 days)
    await check('Memory Vault Freshness', async () => {
      const m = await base44.asServiceRole.entities.RileyMemory.list('-created_date', 1);
      if (m.length === 0) throw new Error('No memories found');
      const age = Date.now() - new Date((m as any[])[0].created_date).getTime();
      const days = Math.floor(age / 86400000);
      if (days > 7) throw new Error(`Last memory is ${days} days old`);
      return `Last memory ${days}d ago`;
    });

    // 4. No critical unresolved debug issues
    await check('Debug Issue Queue', async () => {
      const bugs = await base44.asServiceRole.entities.DebugIssue.filter({ status: 'New' }, '-created_date', 50);
      if (bugs.length > 10) throw new Error(`${bugs.length} unresolved debug issues`);
      return `${bugs.length} open issues`;
    });

    // 5. Recent activity log has entries
    await check('Activity Log', async () => {
      const a = await base44.asServiceRole.entities.ActivityLog.list('-created_date', 1);
      return `${a.length > 0 ? 'Active' : 'Empty'} — last entry found`;
    });

    // 6. Credit ledger accessible
    await check('Credit Ledger', async () => {
      const c = await base44.asServiceRole.entities.CreditLedger.list('-timestamp', 1);
      return `Credit ledger accessible (${c.length} recent entries)`;
    });

    // 7. AppRegistry has entries
    await check('App Registry', async () => {
      const a = await base44.asServiceRole.entities.AppRegistry.filter({ active: true }, '-last_scanned_at', 1);
      if (a.length === 0) throw new Error('AppRegistry is empty');
      return `${a.length} registered apps`;
    });

    // === Remote App Health via workspaceBridge ===
    const remoteResults: any[] = [];
    try {
      const apps = await base44.asServiceRole.entities.AppRegistry.filter({ active: true }, '-last_scanned_at', 20);

      for (const app of apps as any[]) {
        if (!app.app_id || !app.known_entities || app.known_entities.length === 0) {
          remoteResults.push({ app: app.app_name, status: 'unknown', reason: 'No app_id or known_entities' });
          await base44.asServiceRole.entities.AppRegistry.update(app.id, { health_status: 'unknown' });
          continue;
        }

        const probeEntity = app.known_entities[0];
        try {
          const result: any = await invokeWorkspaceBridge(req, {
            operation: 'list',
            app_id: app.app_id,
            entity: probeEntity,
            limit: 1,
          });
          const isHealthy = result && !result.error;
          const newStatus = isHealthy ? 'healthy' : 'warning';
          await base44.asServiceRole.entities.AppRegistry.update(app.id, {
            health_status: newStatus,
            last_scanned_at: new Date().toISOString(),
          });
          remoteResults.push({ app: app.app_name, status: newStatus, entity_probed: probeEntity });
        } catch (err: any) {
          await base44.asServiceRole.entities.AppRegistry.update(app.id, { health_status: 'critical' });
          remoteResults.push({ app: app.app_name, status: 'critical', reason: err.message });
          overallStatus = 'warning';
        }
      }
    } catch (err: any) {
      remoteResults.push({ app: 'ALL', status: 'error', reason: err.message });
    }

    // Log to ActivityLog
    await base44.asServiceRole.entities.ActivityLog.create({
      event_type: 'health_monitor',
      actor: 'Riley',
      summary: `Health monitor: ${overallStatus.toUpperCase()} — ${indicators.filter(i => i.status === 'pass').length}/${indicators.length} local checks passed. ${remoteResults.length} remote apps scanned.`,
      severity: overallStatus === 'healthy' ? 'Info' : 'Warning',
      timestamp: new Date().toISOString(),
      notes: JSON.stringify({ indicators, remoteResults }),
    });

    res.json({ overall_status: overallStatus, indicators, remote_apps: remoteResults });
    return;
  } catch (error: any) {
    res.status(500).json({ error: error.message });
    return;
  }
});
