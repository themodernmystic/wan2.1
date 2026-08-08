// Ported from synthetix-ai/base44/functions/rileyMorningBrief/entry.ts
import { registerFunction } from '../registry.js';

/**
 * rileyMorningBrief — UPGRADED daily briefing with intelligence, pipeline, and meta layers.
 * Input: {} — runs on schedule
 */

registerFunction('rileyMorningBrief', async (req, res, base44) => {
  try {
    const user = await base44.auth.me();
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

    // Gather all data in parallel
    const [
      activeProjects,
      activeBuilds,
      debugIssues,
      recentMemories,
      recentIntelligence,
      newOpportunities,
      recentActivities,
      creditLedger,
      competitorUpdates,
    ]: any[] = await Promise.all([
      base44.asServiceRole.entities.RileyProject.filter({ status: 'Active' }, '-updated_date', 10).catch(() => []),
      base44.asServiceRole.entities.AppBuild.filter({ status: 'In Progress' }, '-updated_date', 10).catch(() => []),
      base44.asServiceRole.entities.DebugIssue.filter({ status: 'New' }, '-created_date', 10).catch(() => []),
      base44.asServiceRole.entities.RileyMemory.list('-created_date', 5).catch(() => []),
      base44.asServiceRole.entities.IntelligenceReport.filter({ james_read: false }, '-created_date', 10).catch(() => []),
      base44.asServiceRole.entities.OpportunityRegister.filter({ status: 'discovered' }, '-created_date', 10).catch(() => []),
      base44.asServiceRole.entities.ActivityLog.list('-created_date', 20).catch(() => []),
      base44.asServiceRole.entities.CreditLedger.list('-created_date', 50).catch(() => []),
      base44.asServiceRole.entities.CompetitorProfile.list('-last_scanned_at', 5).catch(() => []),
    ]);

    // Calculate credit usage last 24h
    const recentCredits = creditLedger.filter((c: any) => c.timestamp > yesterday);
    const totalCreditCost = recentCredits.reduce((s: number, c: any) => s + (c.estimated_cost || 0), 0);

    // Recent intelligence alerts
    const criticalIntel = recentIntelligence.filter((r: any) => r.urgency === 'critical' || r.urgency === 'act_now');
    const highValueOpps = newOpportunities.filter((o: any) => (o.probability || 0) >= 70);

    // Riley health assessment
    const recentErrors = recentActivities.filter((a: any) => a.severity === 'Error' || a.severity === 'Critical');
    const rileyHealth = recentErrors.length === 0 ? 'operational' : recentErrors.length <= 2 ? 'degraded' : 'critical';

    // Determine top priorities
    const priorities: string[] = [];
    if (criticalIntel.length > 0) priorities.push(`🚨 Review ${criticalIntel.length} critical intelligence alert(s): ${criticalIntel.map((i: any) => i.title).join(', ')}`);
    if (highValueOpps.length > 0) priorities.push(`💰 Act on ${highValueOpps.length} high-value opportunity/ies: ${highValueOpps.map((o: any) => o.title).join(', ')}`);
    if (debugIssues.length > 0) priorities.push(`🐛 Resolve ${debugIssues.length} open bug(s) in active builds`);
    if (priorities.length === 0) priorities.push('✅ No critical actions — review intelligence reports and advance active builds');

    // Build the briefing
    const aestDate = new Date(now.getTime() + 10 * 60 * 60 * 1000).toISOString().split('T')[0];
    const aestTime = new Date(now.getTime() + 10 * 60 * 60 * 1000).toISOString().split('T')[1].substring(0, 5);

    const briefingMd = `# 🌅 Riley Morning Brief — ${aestDate} ${aestTime} AEST

---

## 📌 Section 1: Today's Priorities

${priorities.map((p, i) => `${i + 1}. ${p}`).join('\n')}

---

## 🔍 Section 2: Intelligence

**Unread Reports:** ${recentIntelligence.length} (${criticalIntel.length} critical/act-now)
${criticalIntel.length > 0 ? criticalIntel.map((r: any) => `- ⚠️ **${r.title}** — ${r.summary?.substring(0, 100)}`).join('\n') : '- No critical alerts.'}

**New Opportunities:** ${newOpportunities.length} discovered
${highValueOpps.length > 0 ? highValueOpps.map((o: any) => `- 💡 **${o.title}** — ${o.estimated_value || 'TBD'} (${o.probability}% probability)`).join('\n') : '- No high-value opportunities flagged.'}

**Competitor Updates:** ${competitorUpdates.filter((c: any) => c.last_scanned_at > yesterday).length} profiles updated recently

---

## 🏗️ Section 3: Builds & Projects

**Active Projects:** ${activeProjects.length}
${activeProjects.slice(0, 5).map((p: any) => `- ${p.name} (${p.stage || 'Unknown stage'})`).join('\n') || '- None active'}

**Builds In Progress:** ${activeBuilds.length}
**Unresolved Issues:** ${debugIssues.length}

---

## 🧠 Section 4: System Meta

**Credit Usage (24h):** $${totalCreditCost.toFixed(4)} USD across ${recentCredits.length} calls
**Memories Saved (24h):** ${recentMemories.filter((m: any) => m.created_date > yesterday).length}
**Riley Health:** ${rileyHealth === 'operational' ? '✅ Operational' : rileyHealth === 'degraded' ? '⚠️ Degraded' : '🔴 Critical'}
${recentErrors.length > 0 ? `**Recent Errors:** ${recentErrors.map((e: any) => e.summary).join('; ')}` : ''}

---

## 💡 Riley's Recommendation

${criticalIntel.length > 0
  ? `The most important thing today is addressing the ${criticalIntel[0].title} — urgency level: ${criticalIntel[0].urgency.toUpperCase()}.`
  : highValueOpps.length > 0
    ? `Focus on the "${highValueOpps[0].title}" opportunity — ${highValueOpps[0].probability}% probability, estimated value: ${highValueOpps[0].estimated_value}.`
    : activeBuilds.length > 0
      ? `Advance the "${activeBuilds[0].app_name}" build — it's the most active project in progress.`
      : 'All systems green. Good day to run a market scan or plan the next product sprint.'
}

---
*Auto-generated by Riley — Hermetica Holdings Intelligence Engine*`;

    // Save as ContentPiece
    const content: any = await base44.asServiceRole.entities.ContentPiece.create({
      title: `Morning Brief — ${aestDate}`,
      content: briefingMd,
      content_type: 'article',
      status: 'published',
      tags: ['morning_brief', 'automated', aestDate],
      notes: `Riley health: ${rileyHealth}. Credits 24h: $${totalCreditCost.toFixed(4)}. Opportunities: ${newOpportunities.length}. Alerts: ${criticalIntel.length}.`,
    });

    // Log to ActivityLog
    await base44.asServiceRole.entities.ActivityLog.create({
      event_type: 'morning_brief_generated',
      actor: 'Riley',
      summary: `Morning brief generated. ${criticalIntel.length} critical alerts, ${newOpportunities.length} opportunities, health: ${rileyHealth}.`,
      severity: rileyHealth === 'critical' ? 'Error' : 'Info',
      timestamp: now.toISOString(),
    }).catch(() => {});

    res.json({
      content_id: content.id,
      date_aest: aestDate,
      critical_alerts: criticalIntel.length,
      new_opportunities: newOpportunities.length,
      riley_health: rileyHealth,
      top_priority: priorities[0],
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
