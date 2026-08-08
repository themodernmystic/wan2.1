// Ported from synthetix-ai/base44/functions/meshSiblingSync/entry.ts
import { registerFunction } from '../registry.js';

const PRIME_GEN_APP_ID = '69fefe4fbbade1e2e5a4edea';

registerFunction('meshSiblingSync', async (req, res, base44) => {
  try {
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }

    const apiKey = process.env.BASE44_WORKSPACE_API_KEY;
    if (!apiKey) { res.status(500).json({ error: 'BASE44_WORKSPACE_API_KEY not configured' }); return; }

    // Fetch all active MeshNodes from Prime Gen Suite directly via SDK
    // TODO(port): the original fetched MeshNode rows from the sibling "Prime
    // Gen Suite" app via `createClient({ appId: PRIME_GEN_APP_ID, ... })`.
    // Since this migration merges Prime Gen Suite's data into this same
    // database, MeshNode is already local — read directly via
    // base44.asServiceRole.entities.MeshNode instead of a cross-app call.
    const sourceNodes = await base44.asServiceRole.entities.MeshNode.filter(
      { status: 'active' },
      '-priority_weight',
      100
    );

    // Fetch existing local MeshSibling records
    const existing = await base44.asServiceRole.entities.MeshSibling.list('-updated_date', 200);
    const existingByName: Record<string, any> = {};
    for (const s of existing as any[]) existingByName[s.agent_name] = s;

    const now = new Date().toISOString();
    let created_count = 0;
    let updated_count = 0;
    let failed_count = 0;
    const processedNames = new Set<string>();

    for (const node of sourceNodes as any[]) {
      const personality_summary = node.personality_prompt
        ? node.personality_prompt.substring(0, 200)
        : '';

      // Derive a readable home_app_name from app_url
      let home_app_name = 'Prime Gen Suite';
      if (node.app_url) {
        const match = node.app_url.match(/https?:\/\/([^.]+)\.base44\.app/);
        if (match) home_app_name = match[1].replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
      }

      const siblingData = {
        agent_name: node.agent_name,
        agent_role: node.agent_role || '',
        home_app_id: node.app_id || PRIME_GEN_APP_ID,
        home_app_name,
        specialties: Array.isArray(node.specialties) ? node.specialties : [],
        personality_summary,
        priority_weight: node.priority_weight || 50,
        status: node.status || 'active',
        last_synced_at: now,
      };

      processedNames.add(node.agent_name);

      try {
        if (existingByName[node.agent_name]) {
          await base44.asServiceRole.entities.MeshSibling.update(existingByName[node.agent_name].id, siblingData);
          updated_count++;
        } else {
          await base44.asServiceRole.entities.MeshSibling.create(siblingData);
          created_count++;
        }
      } catch (e) {
        failed_count++;
      }
    }

    // Remove siblings that no longer exist in Prime Gen Suite
    let removed_count = 0;
    for (const local of existing as any[]) {
      if (!processedNames.has(local.agent_name)) {
        try {
          await base44.asServiceRole.entities.MeshSibling.delete(local.id);
          removed_count++;
        } catch (e) { /* ignore */ }
      }
    }

    res.json({
      success: true,
      synced_count: created_count + updated_count,
      created_count,
      updated_count,
      removed_count,
      failed_count,
      total_source_nodes: (sourceNodes as any[]).length,
    });
    return;
  } catch (error: any) {
    res.status(500).json({ error: error.message });
    return;
  }
});
