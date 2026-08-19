// Ported from synthetix-ai/base44/functions/meshStuckQueryWatchdog/entry.ts
import { registerFunction } from '../registry.js';

registerFunction('meshStuckQueryWatchdog', async (req, res, base44) => {
  try {
    // Allow scheduled automation calls (no user session) OR admin user calls
    let user: any = null;
    try { user = await base44.auth.me(); } catch (_) {}
    if (user && user.role !== 'admin') {
      res.status(403).json({ error: 'Forbidden: Admin access required' });
      return;
    }

    const cutoffTime = new Date(Date.now() - 10 * 60 * 1000).toISOString();

    // Find all stuck queries
    const [stuck1, stuck2] = await Promise.all([
      base44.asServiceRole.entities.MeshQuery.filter({ status: 'synthesising' }, '-created_date', 50),
      base44.asServiceRole.entities.MeshQuery.filter({ status: 'awaiting_responses' }, '-created_date', 50),
    ]);

    const allStuck = [...(stuck1 || []), ...(stuck2 || [])].filter((q: any) => {
      const created = q.created_date || q.timestamp;
      return created && created < cutoffTime;
    });

    if (allStuck.length === 0) {
      res.json({ success: true, unstuck: 0, message: 'No stuck queries found' });
      return;
    }

    const updates = await Promise.allSettled(
      allStuck.map((q: any) =>
        base44.asServiceRole.entities.MeshQuery.update(q.id, {
          status: 'failed',
          error_message: 'Orphaned by synthesis timeout — auto-recovered by watchdog',
          duration_ms: null,
        })
      )
    );

    const successCount = updates.filter(u => u.status === 'fulfilled').length;
    const failCount = updates.filter(u => u.status === 'rejected').length;

    await base44.asServiceRole.entities.ActivityLog.create({
      action: 'mesh_stuck_query_watchdog',
      entity_type: 'MeshQuery',
      entity_id: null,
      summary: `Watchdog recovered ${successCount} stuck MeshQuery record(s) (synthesising: ${stuck1.length}, awaiting_responses: ${stuck2.length}). Update failures: ${failCount}.`,
      severity: successCount > 0 ? 'warning' : 'info',
      timestamp: new Date().toISOString(),
    }).catch(() => {});

    res.json({ success: true, unstuck: successCount, failed_updates: failCount, ids_recovered: allStuck.map((q: any) => q.id) });
    return;
  } catch (error: any) {
    res.status(500).json({ error: error.message });
    return;
  }
});
