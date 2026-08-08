// Ported from synthetix-ai/base44/functions/rileyMemoryConsolidation/entry.ts
import { registerFunction } from '../registry.js';

/**
 * rileyMemoryConsolidation — Weekly memory dedup, prune, and promote.
 * Archives duplicates (never deletes). Runs Sundays at 6am AEST (20:00 UTC).
 */
registerFunction('rileyMemoryConsolidation', async (req, res, base44) => {
  try {
    const user = await base44.auth.me();
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const allMemories: any[] = await base44.asServiceRole.entities.RileyMemory.filter({ active: true }, '-created_date', 500);

    let archived_count = 0;
    let promoted_count = 0;
    const archive_log: any[] = [];

    // --- DEDUPLICATION (same title, keep highest confidence) ---
    const byTitle: Record<string, any[]> = {};
    for (const mem of allMemories) {
      const key = mem.title.trim().toLowerCase();
      if (!byTitle[key]) {
        byTitle[key] = [];
      }
      byTitle[key].push(mem);
    }

    for (const [title, group] of Object.entries(byTitle)) {
      if (group.length <= 1) continue;
      // Sort by confidence desc, keep first
      group.sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
      const [keep, ...dupes] = group;
      for (const dupe of dupes) {
        await base44.asServiceRole.entities.RileyMemory.update(dupe.id, {
          active: false,
          archive_reason: `Duplicate of "${keep.title}" (id: ${keep.id}), archived by consolidation`,
        });
        archived_count++;
        archive_log.push({ reason: 'duplicate', title: dupe.title });
      }
    }

    // --- PRUNE low-confidence stale memories (confidence < 30, older than 30 days) ---
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    for (const mem of allMemories) {
      if ((mem.confidence || 80) < 30 && mem.created_date < thirtyDaysAgo) {
        await base44.asServiceRole.entities.RileyMemory.update(mem.id, {
          active: false,
          archive_reason: 'Low confidence (<30%) and older than 30 days — archived by consolidation',
        });
        archived_count++;
        archive_log.push({ reason: 'stale_low_confidence', title: mem.title });
      }
    }

    // --- PROMOTE high-value memories (confidence >= 90, last_used_at recent) ---
    for (const mem of allMemories) {
      if ((mem.confidence || 0) >= 90 && !mem.notes?.includes('promoted')) {
        await base44.asServiceRole.entities.RileyMemory.update(mem.id, {
          notes: (mem.notes || '') + ' [promoted by consolidation]',
        });
        promoted_count++;
      }
    }

    // Log to ActivityLog
    await base44.asServiceRole.entities.ActivityLog.create({
      event_type: 'memory_consolidation',
      actor: 'Riley',
      summary: `Memory consolidation complete: ${archived_count} archived, ${promoted_count} promoted from ${allMemories.length} total.`,
      severity: 'Info',
      timestamp: new Date().toISOString(),
      notes: JSON.stringify(archive_log.slice(0, 50)),
    });

    res.json({
      success: true,
      total_processed: allMemories.length,
      archived_count,
      promoted_count,
      archive_log: archive_log.slice(0, 20),
    });
    return;
  } catch (error: any) {
    res.status(500).json({ error: error.message });
    return;
  }
});
