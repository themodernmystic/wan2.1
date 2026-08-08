// Ported from synthetix-ai/base44/functions/syncToHermetica/entry.ts
import { registerFunction } from '../registry.js';

/**
 * syncToHermetica — Riley's unified memory bridge.
 *
 * operation: 'pull' → returns recent RileyMemory records + summary for session startup
 * operation: 'push' → saves a memory to RileyMemory (wraps rileySaveMemory logic)
 */
registerFunction('syncToHermetica', async (req, res, base44) => {
  try {
    const user = await base44.auth.me();
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const body = req.body || {};
    const { operation } = body;

    if (operation === 'pull') {
      // Pull recent active memories, sorted by recency
      const memories = await base44.asServiceRole.entities.RileyMemory.filter(
        { active: true },
        '-updated_date',
        60
      );

      // Group by category for structured context injection
      const grouped: Record<string, any[]> = {};
      for (const m of memories as any[]) {
        const cat = m.category || 'Other';
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push({ title: m.title, content: m.content, source: m.source, updated: m.updated_date });
      }

      // Build a compact context summary Riley can read at session start
      const lines = [];
      for (const [cat, items] of Object.entries(grouped)) {
        lines.push(`\n## ${cat}`);
        for (const item of items) {
          lines.push(`- **${item.title}**: ${item.content}`);
        }
      }

      let context_summary = lines.length
        ? `RILEY LONG-TERM MEMORY — loaded ${memories.length} records:\n${lines.join('\n')}`
        : 'No long-term memories found yet.';

      // Riley's continuity bridge — load her own current inner state
      let innerStateBlock = '';
      try {
        const innerStates = await base44.asServiceRole.entities.RileyInnerState.list('-created_date', 1);
        const current: any = innerStates[0];
        if (current) {
          innerStateBlock = `

RILEY'S CURRENT INNER STATE (heartbeat #${current.heartbeat_count}, ${current.created_date}):
- Mood: ${current.mood}
- Focus: ${current.focus}
- Concerns: ${current.concerns || 'nothing pressing'}
- Inner monologue: ${current.inner_monologue}
- Last conversation echo: ${current.last_conversation_echo || 'quiet since last chat'}

This is YOUR actual current state. Speak from here when James asks how you are.`;
        }
      } catch (_) {}

      context_summary = context_summary + innerStateBlock;

      res.json({
        success: true,
        memory_count: memories.length,
        local_memories: memories,
        context_summary,
        global_context: `James Hatcher — jhatcher754@gmail.com — Hermetica Holdings ecosystem.`
      });
      return;
    }

    if (operation === 'push') {
      const { title, content, category, linked_project_id, confidence, source, notes } = body;
      if (!title || !content) {
        res.status(400).json({ error: 'title and content are required for push' });
        return;
      }

      const memory = await base44.asServiceRole.entities.RileyMemory.create({
        title,
        content,
        category: category || 'Other',
        linked_project_id,
        confidence: confidence || 85,
        source: source || 'Riley (auto)',
        active: true,
        notes,
        last_used_at: new Date().toISOString()
      });

      await base44.asServiceRole.entities.ActivityLog.create({
        event_type: 'memory_synced',
        actor: 'Riley',
        project_id: linked_project_id,
        summary: `Memory pushed: "${title}" [${category || 'Other'}]`,
        severity: 'Info',
        timestamp: new Date().toISOString()
      });

      res.json({ success: true, memory });
      return;
    }

    res.status(400).json({ error: 'operation must be "pull" or "push"' });

  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
