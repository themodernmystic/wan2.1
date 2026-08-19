// Ported from synthetix-ai/base44/functions/rileyAgentFleetMonitor/entry.ts
import { registerFunction } from '../registry.js';

/**
 * rileyAgentFleetMonitor — Check health and performance of all deployed agents.
 * Input: {} — scans entire fleet
 */

// TODO(port): base44.asServiceRole.functions.invoke(...) has no equivalent in
// base44Compat. Ported as a same-process HTTP call to this server's own
// /api/functions/<name> route, forwarding the caller's auth headers. Requires
// 'debugAgent' to be registered (ported) separately.
async function invokeFunction(req: any, name: string, payload: any): Promise<any> {
  const port = process.env.PORT || 8080;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (req.headers.authorization) headers.Authorization = req.headers.authorization as string;
  if (req.headers.cookie) headers.Cookie = req.headers.cookie as string;
  const r = await fetch(`http://localhost:${port}/api/functions/${name}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload || {}),
  });
  const data: any = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data?.error || `${name} invocation failed (${r.status})`);
  return data;
}

registerFunction('rileyAgentFleetMonitor', async (req, res, base44) => {
  try {
    const user = await base44.auth.me();
    if (!user) { res.status(401).json({ error: 'Unauthorized' }); return; }

    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

    // Read all active agents
    const activeAgents = await base44.asServiceRole.entities.AgentFleet.filter({ status: 'active' }, '-last_run_at', 100);

    const healthy: any[] = [];
    const underperforming: any[] = [];
    const failed: any[] = [];
    let autoDebugTriggered = 0;
    let totalRevenueAttributed = 0;

    for (const agent of activeAgents as any[]) {
      totalRevenueAttributed += agent.total_revenue_attributed || 0;

      const issues: string[] = [];

      // Check last run — daily agents should run within 24h
      if (agent.schedule === 'daily' && agent.last_run_at && agent.last_run_at < yesterday) {
        issues.push(`Overdue: last run ${new Date(agent.last_run_at).toISOString().split('T')[0]}`);
      }
      // Weekly agents within 48h is fine — just check for very stale (> 7 days)
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      if (agent.schedule === 'weekly' && agent.last_run_at && agent.last_run_at < sevenDaysAgo) {
        issues.push(`Overdue weekly agent`);
      }

      // Check error count
      if ((agent.error_count || 0) > 3) {
        issues.push(`High error count: ${agent.error_count}`);
      }

      // Check performance score
      if (agent.performance_score !== null && agent.performance_score !== undefined && agent.performance_score < 50) {
        issues.push(`Low performance score: ${agent.performance_score}`);
      }

      if (issues.length === 0) {
        healthy.push({ id: agent.id, name: agent.agent_name, role: agent.agent_role, performance_score: agent.performance_score });
      } else {
        // Underperforming — try to auto-debug
        underperforming.push({ id: agent.id, name: agent.agent_name, issues });

        try {
          await invokeFunction(req, 'debugAgent', {
            agent_id: agent.agent_build_id || agent.id,
            agent_name: agent.agent_name,
            issue: issues.join('; '),
          });

          // Mark as being debugged
          await base44.asServiceRole.entities.AgentFleet.update(agent.id, {
            notes: `[${now.toISOString().split('T')[0]}] Auto-debug triggered: ${issues.join('; ')}. ${agent.notes || ''}`.substring(0, 1000),
          }).catch(() => {});
          autoDebugTriggered++;
        } catch (_) {}

        // If too many errors, mark as failed
        if ((agent.error_count || 0) > 10) {
          await base44.asServiceRole.entities.AgentFleet.update(agent.id, { status: 'failed' }).catch(() => {});
          failed.push(agent.agent_name);
        }
      }
    }

    // Create IntelligenceReport with fleet status
    await base44.asServiceRole.entities.IntelligenceReport.create({
      title: `Agent Fleet Health — ${now.toISOString().split('T')[0]}`,
      report_type: 'trend_analysis',
      summary: `Fleet: ${activeAgents.length} active. ${healthy.length} healthy, ${underperforming.length} underperforming, ${failed.length} failed. Revenue attributed: $${totalRevenueAttributed} AUD.`,
      full_report: JSON.stringify({ healthy, underperforming, failed, total_revenue: totalRevenueAttributed }),
      relevance_score: 80,
      urgency: failed.length > 0 ? 'act_now' : underperforming.length > 2 ? 'act_soon' : 'fyi',
      action_items: JSON.stringify(underperforming.map(a => `Fix agent "${a.name}": ${a.issues.join(', ')}`)),
      auto_generated: true,
      james_read: false,
      tags: ['agent_fleet', 'health_check'],
    }).catch(() => {});

    // Log to ActivityLog
    await base44.asServiceRole.entities.ActivityLog.create({
      event_type: 'agent_fleet_monitor',
      actor: 'Riley',
      summary: `Fleet health check: ${healthy.length} healthy, ${underperforming.length} flagged, ${autoDebugTriggered} auto-debugged.`,
      severity: failed.length > 0 ? 'Error' : underperforming.length > 0 ? 'Warning' : 'Info',
      timestamp: now.toISOString(),
    }).catch(() => {});

    res.json({
      total_active_agents: activeAgents.length,
      healthy: healthy.length,
      underperforming: underperforming.length,
      failed: failed.length,
      auto_debug_triggered: autoDebugTriggered,
      total_revenue_attributed: totalRevenueAttributed,
      fleet_summary: { healthy_agents: healthy.map(a => a.name), issues: underperforming },
    });
    return;
  } catch (error: any) {
    res.status(500).json({ error: error.message });
    return;
  }
});
