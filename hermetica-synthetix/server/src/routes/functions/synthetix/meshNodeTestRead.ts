// Ported from synthetix-ai/base44/functions/meshNodeTestRead/entry.ts
import { registerFunction } from '../registry.js';

registerFunction('meshNodeTestRead', async (req, res, base44) => {
  try {
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }

    const nodes = await base44.asServiceRole.entities.MeshNode.filter(
      { status: 'active' },
      '-priority_weight',
      100
    );

    res.json({
      success: true,
      count: nodes.length,
      caller: {
        user: user?.email || null,
      },
      sample_node_names: nodes.slice(0, 5).map((n: any) => n.agent_name),
    });
    return;
  } catch (err: any) {
    res.status(500).json({
      error: err.message,
      stack: err.stack?.substring(0, 500),
    });
    return;
  }
});
