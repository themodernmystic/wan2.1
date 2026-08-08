// Ported from synthetix-ai/base44/functions/rileyMeshSeedSouls/entry.ts
import { registerFunction } from '../registry.js';

registerFunction('rileyMeshSeedSouls', async (req, res, base44) => {
  try {
    const user = await base44.auth.me();
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const body = req.body || {};
    const { agents, overwrite_existing = true } = body;

    if (!agents || !Array.isArray(agents) || agents.length === 0) {
      res.status(400).json({ error: 'agents array is required and must be non-empty' });
      return;
    }

    const now = new Date().toISOString();

    // Load all existing nodes once for deduplication
    const existingNodes = await base44.asServiceRole.entities.MeshNode.list('-priority_weight', 200);
    const existingMap: Record<string, any> = {};
    for (const node of existingNodes as any[]) {
      existingMap[node.agent_name] = node;
    }

    let created = 0;
    let updated = 0;
    let failed = 0;
    const failures: any[] = [];

    const results = await Promise.allSettled(agents.map(async (agentDef: any) => {
      if (!agentDef.agent_name) throw new Error('agent_name is required');

      const nodeData = {
        agent_name: agentDef.agent_name,
        agent_role: agentDef.agent_role || '',
        app_id: agentDef.app_id || 'TBC',
        app_url: agentDef.app_url || '',
        endpoint_type: agentDef.endpoint_type || 'workspace_bridge',
        dispatch_mode: agentDef.dispatch_mode || 'persona',
        model_count: agentDef.model_count || 16,
        specialties: Array.isArray(agentDef.specialties)
          ? agentDef.specialties
          : (agentDef.specialties || '').split(',').map((s: string) => s.trim()).filter(Boolean),
        personality_prompt: agentDef.personality_prompt || '',
        system_context: agentDef.system_context || '',
        priority_weight: agentDef.priority_weight ?? 50,
        status: agentDef.status || 'active',
        notes: agentDef.notes || '',
        last_heartbeat: now,
      };

      const existing = existingMap[agentDef.agent_name];

      let action: string;
      if (existing && overwrite_existing) {
        // Preserve runtime stats, only update provided fields
        await base44.asServiceRole.entities.MeshNode.update(existing.id, {
          ...nodeData,
          // Preserve existing runtime stats
          total_mesh_queries: existing.total_mesh_queries || 0,
          average_quality_score: existing.average_quality_score,
          average_response_time_ms: existing.average_response_time_ms,
          last_query_at: existing.last_query_at,
        });
        action = 'updated';
      } else if (!existing) {
        await base44.asServiceRole.entities.MeshNode.create({
          ...nodeData,
          total_mesh_queries: 0,
        });
        action = 'created';
      } else {
        action = 'skipped';
      }

      await base44.asServiceRole.entities.ActivityLog.create({
        action: 'mesh_soul_seeded',
        entity_type: 'MeshNode',
        summary: `Soul seeded [${action}]: ${agentDef.agent_name} — dispatch_mode: ${nodeData.dispatch_mode}`,
        severity: 'info',
        timestamp: now,
      }).catch(() => {});

      return action;
    }));

    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      if (r.status === 'fulfilled') {
        if (r.value === 'created') created++;
        else if (r.value === 'updated') updated++;
        // skipped counts as neither
      } else {
        failed++;
        failures.push({ agent: agents[i]?.agent_name || `index_${i}`, error: (r as any).reason?.message || 'Unknown error' });
      }
    }

    res.json({
      success: true,
      total_processed: agents.length,
      created,
      updated,
      failed,
      failures,
      timestamp: now,
    });
    return;
  } catch (error: any) {
    res.status(500).json({ error: error.message });
    return;
  }
});
