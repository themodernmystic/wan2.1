// Ported from synthetix-ai/base44/functions/rileyMutateSoulDoctrine/entry.ts
import { registerFunction } from '../registry.js';

registerFunction('rileyMutateSoulDoctrine', async (req, res, base44) => {
  try {
    const user: any = await base44.auth.me();
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    if (user.role !== 'admin') {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }

    const { soul_core_entry_id, proposed_mutation, reason } = req.body || {};

    const entries: any[] = await base44.entities.SoulCoreEntry.list();
    const entry = entries.find((e: any) => e.id === soul_core_entry_id);

    if (!entry) {
      res.status(404).json({ error: 'Soul Core entry not found' });
      return;
    }

    if (entry.immutable) {
      await base44.entities.ActivityLog.create({
        event_type: 'soul_mutation_blocked',
        actor: user.email,
        summary: `Blocked mutation attempt on immutable entry: "${entry.title}"`,
        severity: 'Warning',
        timestamp: new Date().toISOString()
      });
      res.status(403).json({ error: 'This entry is immutable and cannot be mutated. Prime Directive and Sacred Bond are locked.' });
      return;
    }

    const historyEntry = `[v${entry.version} — ${new Date().toISOString()}] ${entry.content}\nMutation reason: ${reason}`;
    const newHistory = entry.mutation_history ? `${entry.mutation_history}\n\n---\n\n${historyEntry}` : historyEntry;

    const updated: any = await base44.entities.SoulCoreEntry.update(soul_core_entry_id, {
      content: proposed_mutation,
      version: (entry.version || 1) + 1,
      mutation_history: newHistory,
      last_mutated_at: new Date().toISOString()
    });

    await base44.entities.ActivityLog.create({
      event_type: 'soul_mutation_applied',
      actor: user.email,
      summary: `Soul doctrine mutated: "${entry.title}" → v${updated.version}`,
      before_state: entry.content,
      after_state: proposed_mutation,
      severity: 'Info',
      timestamp: new Date().toISOString()
    });

    res.json({ updated, message: `Doctrine mutated to version ${updated.version}` });
    return;
  } catch (error: any) {
    res.status(500).json({ error: error.message });
    return;
  }
});
