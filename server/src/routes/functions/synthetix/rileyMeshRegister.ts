// Ported from synthetix-ai/base44/functions/rileyMeshRegister/entry.ts
import { registerFunction } from '../registry.js';

registerFunction('rileyMeshRegister', async (req, res, base44) => {
  try {
    const user = await base44.auth.me();
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const body = req.body || {};
    const { agent_name, app_id } = body;
    if (!agent_name || !app_id) {
      res.status(400).json({ error: 'agent_name and app_id are required' });
      return;
    }

    // Check for duplicate
    const existing = await base44.asServiceRole.entities.MeshNode.filter({ agent_name });
    const now = new Date().toISOString();

    const nodeData = {
      agent_name,
      agent_role: body.agent_role || '',
      app_id,
      app_url: body.app_url || '',
      endpoint_type: body.endpoint_type || 'workspace_bridge',
      bridge_function_name: body.bridge_function_name || '',
      model_count: body.model_count || 16,
      specialties: body.specialties || [],
      personality_prompt: body.personality_prompt || '',
      system_context: body.system_context || '',
      priority_weight: body.priority_weight ?? 50,
      last_heartbeat: now,
      total_mesh_queries: 0,
      notes: body.notes || '',
      status: body.endpoint_type && body.endpoint_type !== 'manual' ? 'active' : 'pending_setup',
    };

    let node: any;
    let action: string;
    if (existing && existing.length > 0) {
      node = await base44.asServiceRole.entities.MeshNode.update(existing[0].id, nodeData);
      action = 'updated';
    } else {
      node = await base44.asServiceRole.entities.MeshNode.create(nodeData);
      action = 'created';
    }

    await base44.asServiceRole.entities.ActivityLog.create({
      action: 'mesh_node_registered',
      entity_type: 'MeshNode',
      entity_id: node.id,
      summary: `Mesh node ${action}: ${agent_name}`,
      severity: 'info',
      timestamp: now,
    }).catch(() => {});

    res.json({ success: true, node, action });
    return;
  } catch (error: any) {
    res.status(500).json({ error: error.message });
    return;
  }
});
