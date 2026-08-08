// Ported from synthetix-ai/base44/functions/rileySaveMemory/entry.ts
import { registerFunction } from '../registry.js';

registerFunction('rileySaveMemory', async (req, res, base44) => {
  const user = await base44.auth.me();
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const { title, content, category, linked_project_id, confidence, source, notes } = req.body || {};

  const memory = await base44.entities.RileyMemory.create({
    title,
    content,
    category: category || 'Other',
    linked_project_id,
    confidence: confidence || 80,
    source: source || user.email,
    active: true,
    notes,
  });

  await base44.entities.ActivityLog.create({
    event_type: 'memory_saved',
    actor: user.email,
    project_id: linked_project_id,
    summary: `Memory saved: "${title}" [${category}]`,
    severity: 'Info',
    timestamp: new Date().toISOString(),
  });

  res.json({ memory });
});
