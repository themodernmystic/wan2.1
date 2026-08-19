// Ported from synthetix-ai/base44/functions/callMesh/entry.ts
import { registerFunction } from '../registry.js';

// TODO(port): the original called `createClient({ appId: PRIME_GEN_APP_ID, ... })`
// then `.functions.invoke('rileyMeshQuery', ...)` — a cross-app Base44 SDK call
// to the sibling "Prime Gen Suite" app. In this merged codebase, Prime Gen
// Suite's rileyMeshQuery function lives locally (see
// routes/functions/synthetix/rileyMeshQuery.ts), so the cross-app hop is
// replaced with a same-process HTTP call to our own /api/functions/rileyMeshQuery
// route, forwarding the caller's auth headers so the target function's own
// auth check still sees the same caller.
async function invokeRileyMeshQuery(req: any, payload: any): Promise<any> {
  const port = process.env.PORT || 8080;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (req.headers.authorization) headers.Authorization = req.headers.authorization as string;
  if (req.headers.cookie) headers.Cookie = req.headers.cookie as string;
  const r = await fetch(`http://localhost:${port}/api/functions/rileyMeshQuery`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload || {}),
  });
  const data: any = await r.json().catch(() => ({}));
  return { data };
}

registerFunction('callMesh', async (req, res, base44) => {
  try {
    const user = await base44.auth.me();
    if (!user) { res.status(401).json({ error: 'Unauthorized' }); return; }

    const body = req.body || {};
    const {
      question,
      depth = 'council',
      requesting_agent = 'unknown',
      specific_agents,
      linked_entity_type,
      linked_entity_id,
    } = body;

    if (!question) { res.status(400).json({ error: 'question is required' }); return; }

    const apiKey = process.env.BASE44_WORKSPACE_API_KEY;
    if (!apiKey) { res.status(500).json({ error: 'BASE44_WORKSPACE_API_KEY not configured' }); return; }

    // Create pending MeshConversation record
    const conversation = await base44.asServiceRole.entities.MeshConversation.create({
      question,
      depth,
      requesting_agent,
      requesting_user: user.email || user.id,
      siblings_consulted: [],
      status: 'pending',
      linked_entity_type: linked_entity_type || null,
      linked_entity_id: linked_entity_id || null,
      timestamp: new Date().toISOString(),
      estimated_cost_usd: 0,
    });

    const startTime = Date.now();

    // Call Prime Gen Suite's rileyMeshQuery via cross-app SDK
    let meshResponse: any;
    try {
      meshResponse = await invokeRileyMeshQuery(req, {
        question,
        depth,
        ...(specific_agents ? { specific_agents } : {}),
        requesting_app: 'ICARE',
        requesting_agent,
      });
    } catch (invokeError: any) {
      await base44.asServiceRole.entities.MeshConversation.update(conversation.id, {
        status: 'failed',
        synthesis_received: `Mesh unreachable: ${invokeError.message}`,
        duration_ms: Date.now() - startTime,
      });
      res.status(503).json({
        success: false,
        error: `Mesh call failed: ${invokeError.message}. Retry in a few seconds.`,
        conversation_id: conversation.id,
      });
      return;
    }

    const duration_ms = Date.now() - startTime;
    const data = meshResponse?.data || meshResponse || {};

    const siblings_consulted = data.agents_consulted || data.agentsConsulted || [];
    const synthesis = data.synthesis || data.result || '(No synthesis returned)';
    const confidence = data.confidence || 0;
    const estimated_cost_usd = data.estimated_cost_usd || 0;
    const mesh_query_id = data.query_id || data.id || null;

    await base44.asServiceRole.entities.MeshConversation.update(conversation.id, {
      status: 'complete',
      siblings_consulted,
      synthesis_received: synthesis,
      confidence,
      duration_ms,
      estimated_cost_usd,
      mesh_query_id,
    });

    res.json({
      success: true,
      synthesis,
      siblings_consulted,
      confidence,
      duration_ms,
      estimated_cost_usd,
      conversation_id: conversation.id,
      mesh_query_id,
    });
    return;
  } catch (error: any) {
    res.status(500).json({ error: error.message });
    return;
  }
});
