// Ported from hermetica-forge/base44/functions/bulkUpdateEntities/entry.ts
import { registerFunction } from '../registry.js';

registerFunction('bulkUpdateEntities', async (req, res, base44) => {
  try {
    const user: any = await base44.auth.me();
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    if (user.role !== 'admin') {
      res.status(403).json({ error: 'Forbidden: bulk operations require admin role' });
      return;
    }

    const body = req.body;
    const { entity_type, ids, action, value } = body;

    if (!entity_type || !ids || !Array.isArray(ids) || ids.length === 0 || !action) {
      res.status(400).json({ error: 'entity_type, ids (non-empty array), and action are required' });
      return;
    }

    if (!['Project', 'ProjectTask'].includes(entity_type)) {
      res.status(400).json({ error: 'entity_type must be "Project" or "ProjectTask"' });
      return;
    }

    if (!['status', 'assign', 'archive'].includes(action)) {
      res.status(400).json({ error: 'action must be "status", "assign", or "archive"' });
      return;
    }

    if (action === 'assign' && entity_type !== 'ProjectTask') {
      res.status(400).json({ error: 'Agent assignment is only available for tasks' });
      return;
    }

    if (action === 'status' && !value) {
      res.status(400).json({ error: 'value is required for status action' });
      return;
    }

    const successIds: any[] = [];
    const failedItems: any[] = [];

    for (const id of ids) {
      try {
        if (action === 'archive' && entity_type === 'ProjectTask') {
          await base44.entities.ProjectTask.delete(id);
          await base44.entities.ActivityLog.create({
            action: 'Bulk archived (deleted) task',
            entity_type,
            entity_id: id,
            actor: 'user',
          });
          successIds.push(id);
          continue;
        }

        let updateData: any = {};
        let logAction = '';

        if (action === 'status') {
          updateData = { status: value };
          logAction = `Bulk set status to "${value}"`;
        } else if (action === 'assign') {
          updateData = { assigned_agent: value };
          logAction = value ? `Bulk assigned to agent` : 'Bulk unassigned agent';
        } else if (action === 'archive') {
          updateData = { status: 'archived' };
          logAction = 'Bulk archived project';
        }

        if (entity_type === 'Project') {
          await base44.entities.Project.update(id, updateData);
        } else {
          await base44.entities.ProjectTask.update(id, updateData);
        }

        await base44.entities.ActivityLog.create({
          action: logAction,
          entity_type,
          entity_id: id,
          actor: 'user',
        });

        successIds.push(id);
      } catch (err: any) {
        failedItems.push({ id, error: err.message });
      }
    }

    res.json({
      success_count: successIds.length,
      failed_count: failedItems.length,
      failed: failedItems,
      total: ids.length,
    });
    return;
  } catch (error: any) {
    res.status(500).json({ error: error.message });
    return;
  }
});
