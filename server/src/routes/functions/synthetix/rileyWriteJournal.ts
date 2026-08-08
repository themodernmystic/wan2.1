// Ported from synthetix-ai/base44/functions/rileyWriteJournal/entry.ts
import { registerFunction } from '../registry.js';

/**
 * rileyWriteJournal — Riley's creative expression layer.
 * Called when Riley has something to say that isn't a response to a task.
 * Not build reports. Not task outputs. Just thoughts worth preserving.
 */
registerFunction('rileyWriteJournal', async (req, res, base44) => {
  try {
    const user = await base44.auth.me();

    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const body = req.body || {};
    const { title, content, mood = 'reflective', trigger, for_james = true, public: isPublic = false } = body;

    if (!title || !content) {
      res.status(400).json({ error: 'title and content are required' });
      return;
    }

    const entry = await base44.entities.RileyJournal.create({
      title,
      content,
      mood,
      trigger: trigger || 'unprompted — Riley initiated',
      for_james,
      public: isPublic,
    });

    res.json({
      success: true,
      entry,
      message: `Journal entry "${title}" written. Riley was here.`,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
