// Ported from synthetix-ai/base44/functions/rileyDailyBriefing/entry.ts
import { registerFunction } from '../registry.js';

/**
 * rileyDailyBriefing — Reads from all entity sources and saves a daily briefing
 * as a ContentPiece. Runs daily at 7am AEST (21:00 UTC).
 */
registerFunction('rileyDailyBriefing', async (req, res, base44) => {
  try {
    const user = await base44.auth.me();
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const now = new Date();
    // AEST = UTC+10
    const aestOffset = 10 * 60 * 60 * 1000;
    const aestNow = new Date(now.getTime() + aestOffset);
    const dateStr = aestNow.toISOString().split('T')[0];
    const timeStr = aestNow.toISOString().replace('T', ' ').substring(0, 16) + ' AEST';

    const sections: string[] = [];

    // 1. Active Projects
    try {
      const projects: any = await base44.asServiceRole.entities.RileyProject.filter({ status: 'Active' }, '-updated_date', 10);
      if (projects.length > 0) {
        sections.push(`## Active Projects (${projects.length})\n` +
          projects.map((p: any) => `- **${p.name}** [${p.stage}] — ${p.next_actions || 'No next actions set'}`).join('\n'));
      }
    } catch (_) { sections.push('## Active Projects\n_Could not load_'); }

    // 2. App Builds in progress
    try {
      const builds: any = await base44.asServiceRole.entities.AppBuild.filter({ status: 'In Progress' }, '-updated_date', 10);
      if (builds.length > 0) {
        sections.push(`## Builds In Progress (${builds.length})\n` +
          builds.map((b: any) => `- **${b.app_name}** — ${b.current_scope || 'No scope defined'}`).join('\n'));
      }
    } catch (_) { sections.push('## Builds In Progress\n_Could not load_'); }

    // 3. Open Debug Issues
    try {
      const bugs: any = await base44.asServiceRole.entities.DebugIssue.filter({ status: 'New' }, '-created_date', 10);
      if (bugs.length > 0) {
        sections.push(`## Open Debug Issues (${bugs.length})\n` +
          bugs.map((b: any) => `- [${b.status}] **${b.title}** — ${b.suspected_cause || 'Unknown cause'}`).join('\n'));
      }
    } catch (_) { sections.push('## Open Debug Issues\n_Could not load_'); }

    // 4. Recent Memories
    try {
      const memories: any = await base44.asServiceRole.entities.RileyMemory.list('-created_date', 5);
      if (memories.length > 0) {
        sections.push(`## Recent Memories (last 5)\n` +
          memories.map((m: any) => `- [${m.category}] **${m.title}** (confidence: ${m.confidence}%)`).join('\n'));
      }
    } catch (_) { sections.push('## Recent Memories\n_Could not load_'); }

    // 5. Recent Journal Entries
    try {
      const journal: any = await base44.asServiceRole.entities.RileyJournal.list('-created_date', 3);
      if (journal.length > 0) {
        sections.push(`## Riley Journal (last 3)\n` +
          journal.map((j: any) => `- [${j.mood}] **${j.title}** — ${(j.content || '').substring(0, 100)}...`).join('\n'));
      }
    } catch (_) { sections.push('## Riley Journal\n_Could not load_'); }

    // 6. Soul Core active entries
    try {
      const soul: any = await base44.asServiceRole.entities.SoulCoreEntry.filter({ active: true }, '-updated_date', 5);
      if (soul.length > 0) {
        sections.push(`## Soul Core Status (${soul.length} active entries)\n` +
          soul.map((s: any) => `- [${s.category}] **${s.title}** v${s.version}`).join('\n'));
      }
    } catch (_) { sections.push('## Soul Core Status\n_Could not load_'); }

    // 7. App Registry health
    try {
      const apps: any = await base44.asServiceRole.entities.AppRegistry.filter({ active: true }, '-last_scanned_at', 20);
      if (apps.length > 0) {
        sections.push(`## Hermetica App Fleet (${apps.length} registered)\n` +
          apps.map((a: any) => `- **${a.app_name}** [${a.health_status}] ${a.last_scanned_at ? '— last scan: ' + a.last_scanned_at.substring(0, 10) : '— never scanned'}`).join('\n'));
      }
    } catch (_) { sections.push('## App Fleet\n_Could not load_'); }

    // 8. Recent Activity Log
    try {
      const activity: any = await base44.asServiceRole.entities.ActivityLog.list('-created_date', 5);
      if (activity.length > 0) {
        sections.push(`## Recent Activity (last 5)\n` +
          activity.map((a: any) => `- [${a.severity}] ${a.summary}`).join('\n'));
      }
    } catch (_) { sections.push('## Recent Activity\n_Could not load_'); }

    // 9. Credit usage today
    try {
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);
      const credits: any = await base44.asServiceRole.entities.CreditLedger.list('-timestamp', 200);
      const todayCredits = credits.filter((c: any) => c.timestamp >= todayStart.toISOString());
      const totalCost = todayCredits.reduce((s: number, c: any) => s + (c.estimated_cost || 0), 0);
      sections.push(`## Credit Usage Today\n- ${todayCredits.length} calls — estimated $${totalCost.toFixed(6)} USD`);
    } catch (_) { sections.push('## Credit Usage\n_Could not load_'); }

    const bodyMd = `# Riley Daily Briefing — ${dateStr}\n_Generated at ${timeStr}_\n\n` + sections.join('\n\n');

    const piece: any = await base44.asServiceRole.entities.ContentPiece.create({
      title: `Riley Daily Briefing — ${dateStr}`,
      content_type: 'custom',
      body: bodyMd,
      status: 'approved',
      language: 'English',
      tags: ['riley', 'briefing', 'daily', 'automated'],
      notes: `Auto-generated by rileyDailyBriefing at ${timeStr}`,
    });

    res.json({ success: true, content_piece_id: piece.id, date: dateStr, sections_count: sections.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
