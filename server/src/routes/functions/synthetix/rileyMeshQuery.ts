// Ported from synthetix-ai/base44/functions/rileyMeshQuery/entry.ts
import { registerFunction } from '../registry.js';

const OPENROUTER_KEY = () => process.env.OPENROUTER_API_KEY || '';
const SYNTH_MODEL = 'openai/gpt-4o';
const PERSONA_MODEL = 'openai/gpt-4o-mini';
const AGENT_TIMEOUT_MS = 45000;

// TODO(port): base44.asServiceRole.functions.invoke(...) has no equivalent in
// base44Compat. Ported as a same-process HTTP call to this server's own
// /api/functions/<name> route, forwarding the caller's auth headers. Requires
// 'rileyCognitivePipeline' / 'workspaceBridge' / any dynamic bridge_function_name
// target to be registered (ported) separately.
async function invokeFunction(req: any, name: string, payload: any): Promise<any> {
  const port = process.env.PORT || 8080;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (req.headers.authorization) headers.Authorization = req.headers.authorization as string;
  if (req.headers.cookie) headers.Cookie = req.headers.cookie as string;
  const r = await fetch(`http://localhost:${port}/api/functions/${name}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload || {}),
  });
  const data: any = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data?.error || `${name} invocation failed (${r.status})`);
  return data;
}

async function callOpenRouter(messages: any, model: any, maxTokens: any, temperature = 0.3) {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${OPENROUTER_KEY()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: model || SYNTH_MODEL, messages, max_tokens: maxTokens, temperature }),
    signal: AbortSignal.timeout(30000),
  });
  const data: any = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.choices?.[0]?.message?.content || '';
}

// Patch C — lean keyword + priority scoring, no LLM needed
function selectCouncilAgents(question: string, allActiveNodes: any[], maxAgents = 3) {
  const q = question.toLowerCase();
  const scored = allActiveNodes
    .filter(n => n.agent_name !== 'Riley')
    .map(n => {
      let score = (n.priority_weight || 50) / 10;
      for (const specialty of (n.specialties || [])) {
        if (q.includes(specialty.toLowerCase())) score += 10;
      }
      return { node: n, score };
    })
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, maxAgents).map(s => s.node);
}

// Patch A — Pull relevant memories and format context string
async function buildMemoryContext(base44: any, question: string) {
  try {
    const memories = await base44.asServiceRole.entities.RileyMemory.list('-confidence', 50);
    if (!memories || memories.length === 0) return { context: '', count: 0 };

    const q = question.toLowerCase();
    const words = q.split(/\s+/).filter((w: string) => w.length > 4);

    const scored = memories.map((m: any) => {
      const titleWords = (m.title || '').toLowerCase();
      const catWords = (m.category || '').toLowerCase();
      const contentWords = (m.content || '').toLowerCase().substring(0, 200);
      let relevance = 0;
      for (const word of words) {
        if (titleWords.includes(word)) relevance += 3;
        if (catWords.includes(word)) relevance += 2;
        if (contentWords.includes(word)) relevance += 1;
      }
      return { memory: m, relevance };
    }).filter((s: any) => s.relevance > 0).sort((a: any, b: any) => b.relevance - a.relevance);

    const top = scored.slice(0, 8).map((s: any) => s.memory);
    if (top.length === 0) return { context: '', count: 0 };

    const lines = top.map((m: any) =>
      `- [${m.category || 'general'}]: ${m.title || 'Untitled'} — ${(m.content || '').substring(0, 200)}`
    );

    const context = `RELEVANT LONG-TERM CONTEXT (James Hatcher / Hermetica):\n${lines.join('\n')}`;
    return { context, count: top.length };
  } catch (_) {
    return { context: '', count: 0 };
  }
}

// Patch B — Persona dispatch via local OpenRouter call
async function dispatchPersonaAgent(node: any, question: string, memoryContext: string) {
  const start = Date.now();
  const systemPrompt = [
    node.personality_prompt || `You are ${node.agent_name}.`,
    node.system_context || '',
    memoryContext || '',
  ].filter(Boolean).join('\n\n');

  try {
    const text = await callOpenRouter(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: question },
      ],
      PERSONA_MODEL,
      1500,
      0.7
    );
    return { agent: node.agent_name, text, dispatch_mode: 'persona', speed_ms: Date.now() - start, success: true };
  } catch (e: any) {
    return { agent: node.agent_name, text: null, dispatch_mode: 'persona', error: e.message, speed_ms: Date.now() - start, success: false };
  }
}

// Bridge dispatch (deferred to Phase 17.2 — kept for future use)
async function dispatchBridgeAgent(req: any, node: any, question: string, memoryContext: string, timeoutMs: number) {
  const start = Date.now();
  const prompt = [
    node.personality_prompt ? `[Your identity]: ${node.personality_prompt}` : '',
    node.system_context ? `[Context]: ${node.system_context}` : '',
    memoryContext ? `[Long-term context]: ${memoryContext}` : '',
    `[Question]: ${question}`,
  ].filter(Boolean).join('\n\n');

  try {
    const result: any = await Promise.race([
      invokeFunction(req, 'workspaceBridge', {
        target_app_id: node.app_id,
        action: 'query_agent',
        agent_name: node.agent_name,
        payload: { prompt, question },
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeoutMs)),
    ]);
    return {
      agent: node.agent_name,
      text: result?.response || result?.answer || result?.text || JSON.stringify(result).substring(0, 1000),
      dispatch_mode: 'bridge',
      speed_ms: Date.now() - start,
      success: true,
    };
  } catch (e: any) {
    return { agent: node.agent_name, text: null, dispatch_mode: 'bridge', error: e.message, speed_ms: Date.now() - start, success: false };
  }
}

// Route dispatch by mode
async function dispatchAgent(req: any, node: any, question: string, memoryContext: string, timeoutMs: number) {
  const mode = node.dispatch_mode || 'persona';
  if (mode === 'manual') {
    return { agent: node.agent_name, text: null, dispatch_mode: 'manual', skipped: true, success: false, error: 'Agent in manual mode — not consulted' };
  }
  if (mode === 'persona') {
    return dispatchPersonaAgent(node, question, memoryContext);
  }
  if (mode === 'function' && node.bridge_function_name) {
    try {
      const result: any = await invokeFunction(req, node.bridge_function_name, { question, memory_context: memoryContext });
      return { agent: node.agent_name, text: result?.answer || result?.text || JSON.stringify(result).substring(0, 1000), dispatch_mode: 'function', success: true };
    } catch (e: any) {
      return { agent: node.agent_name, text: null, dispatch_mode: 'function', error: e.message, success: false };
    }
  }
  // Default: bridge
  return dispatchBridgeAgent(req, node, question, memoryContext, timeoutMs);
}

registerFunction('rileyMeshQuery', async (req, res, base44) => {
  let _activeQueryId: string | null = null;
  try {
    const user = await base44.auth.me();

    // Allow cross-app workspace API key calls (no user session, but valid app header)
    // TODO(port): original used the Fetch-API `req.headers.get(...)`; Express's
    // req.headers is a plain object keyed by lower-cased header name.
    const callingAppId = (req.headers['x-base44-app-id'] as string) || (req.headers['x-app-id'] as string) || '';
    const isCrossApp = !user && !!callingAppId;

    if (!user && !isCrossApp) { res.status(401).json({ error: 'Unauthorized' }); return; }

    const body = req.body || {};
    const { question, depth = 'focused', specific_agents, project_id, max_cost_usd, requesting_app, requesting_agent: crossAppAgent } = body;
    if (!question) { res.status(400).json({ error: 'question is required' }); return; }

    if (depth === 'full_mesh') { res.status(400).json({ error: 'full_mesh not yet enabled. Use depth: council.' }); return; }
    if (depth === 'maximum') { res.status(400).json({ error: 'maximum depth reserved for post-revenue infrastructure. Use depth: council.' }); return; }
    if (max_cost_usd && max_cost_usd < 0.01) { res.status(400).json({ error: 'max_cost_usd too low. Minimum $0.01.' }); return; }

    // Log cross-app invocations
    if (isCrossApp) {
      await base44.asServiceRole.entities.ActivityLog.create({
        action: 'cross_app_mesh_query',
        entity_type: 'MeshQuery',
        entity_id: null,
        summary: `Cross-app mesh query from app=${callingAppId} agent=${crossAppAgent || 'unknown'} app_name=${requesting_app || 'unknown'} depth=${depth}`,
        severity: 'info',
        timestamp: new Date().toISOString(),
      }).catch(() => {});
    }

    const runStart = Date.now();
    const now = new Date().toISOString();

    // Patch A — build memory context upfront (used for ALL depth levels)
    const { context: memoryContext, count: memoryCount } = await buildMemoryContext(base44, question);

    const meshQuery = await base44.asServiceRole.entities.MeshQuery.create({
      query_name: `${depth} — ${question.substring(0, 60)}`,
      original_question: question,
      requesting_agent: 'Riley',
      requesting_user: user?.email || '',
      depth,
      agents_planned: [],
      agents_consulted: [],
      agents_failed: [],
      status: 'dispatching',
      project_id: project_id || '',
    });
    _activeQueryId = meshQuery.id;

    // ── FOCUSED ──────────────────────────────────────────────────────────────
    if (depth === 'focused') {
      let rileyResponse: any;
      try {
        rileyResponse = await invokeFunction(req, 'rileyCognitivePipeline', {
          question,
          depth: 'deep',
          project_id,
          memory_context: memoryContext,
        });
      } catch (_) {
        const fullPrompt = memoryContext
          ? `${memoryContext}\n\n---\n\nQuestion: ${question}`
          : question;
        rileyResponse = {
          answer: await callOpenRouter([{ role: 'user', content: fullPrompt }], SYNTH_MODEL, 2000),
          confidence: 70,
          models_consulted: 1,
        };
      }

      const synthesis = rileyResponse?.answer || rileyResponse?.synthesis || 'No response.';
      const confidence = rileyResponse?.confidence || 75;
      const duration = Date.now() - runStart;

      await base44.asServiceRole.entities.MeshQuery.update(meshQuery.id, {
        synthesis,
        synthesis_method: 'riley_cognitive_pipeline',
        agents_planned: ['Riley'],
        agents_consulted: ['Riley'],
        agents_failed: [],
        agent_responses: JSON.stringify({ Riley: synthesis }),
        total_models_fired: rileyResponse?.models_consulted || 16,
        total_agents_consulted: 1,
        confidence,
        duration_ms: duration,
        estimated_cost_usd: rileyResponse?.total_cost_usd || 0,
        status: 'complete',
      });

      res.json({
        success: true,
        query_id: meshQuery.id,
        synthesis,
        confidence,
        agents_consulted: ['Riley'],
        contradictions: [],
        total_models_fired: rileyResponse?.models_consulted || 16,
        duration_ms: duration,
        estimated_cost_usd: rileyResponse?.total_cost_usd || 0,
        memory_count: memoryCount,
      });
      return;
    }

    // ── COUNCIL ──────────────────────────────────────────────────────────────
    const allNodes = await base44.asServiceRole.entities.MeshNode.filter({ status: 'active' }, '-priority_weight', 50);

    let selectedNodes: any[];
    if (specific_agents?.length) {
      selectedNodes = (allNodes as any[]).filter(n => specific_agents.includes(n.agent_name) && n.agent_name !== 'Riley');
    } else {
      // Patch C — lean keyword + priority scoring
      selectedNodes = selectCouncilAgents(question, allNodes as any[], 3);
    }

    const plannedAgents = ['Riley', ...selectedNodes.map(n => n.agent_name)];
    await base44.asServiceRole.entities.MeshQuery.update(meshQuery.id, {
      agents_planned: plannedAgents,
      status: 'awaiting_responses',
    });

    // Dispatch Riley + all selected agents in parallel
    const rileyDispatch = invokeFunction(req, 'rileyCognitivePipeline', {
      question, depth: 'standard', project_id, memory_context: memoryContext,
    }).catch(() => ({ answer: null }));

    const agentDispatches = selectedNodes.map(node =>
      dispatchAgent(req, node, question, memoryContext, AGENT_TIMEOUT_MS)
    );

    const [rileyResult, ...agentResults] = await Promise.allSettled([rileyDispatch, ...agentDispatches]);

    const rileyText = rileyResult.status === 'fulfilled'
      ? ((rileyResult.value as any)?.answer || (rileyResult.value as any)?.synthesis || '')
      : '';

    const agentResponses: Record<string, any> = { Riley: rileyText };
    const agentDispatchModes: Record<string, any> = { Riley: 'cognitive_pipeline' };
    const successfulAgents: string[] = ['Riley'];
    const failedAgents: string[] = [];
    const manualAgents: string[] = [];

    agentResults.forEach((result, i) => {
      const node = selectedNodes[i];
      if (result.status === 'fulfilled') {
        const r: any = result.value;
        agentDispatchModes[node.agent_name] = r.dispatch_mode || node.dispatch_mode;
        if (r.success) {
          agentResponses[node.agent_name] = r.text;
          successfulAgents.push(node.agent_name);
        } else if (r.skipped) {
          manualAgents.push(node.agent_name);
        } else {
          failedAgents.push(node.agent_name);
        }
      } else {
        failedAgents.push(node.agent_name);
        agentDispatchModes[node.agent_name] = node.dispatch_mode;
      }
    });

    // Degraded fallback
    let degraded = false;
    if (successfulAgents.length < 2) {
      degraded = true;
      const synthesis = rileyText || 'Insufficient agent responses — degraded to focused mode.';
      const duration = Date.now() - runStart;
      await base44.asServiceRole.entities.MeshQuery.update(meshQuery.id, {
        synthesis,
        synthesis_method: 'degraded_to_focused',
        agents_consulted: successfulAgents,
        agents_failed: failedAgents,
        agent_responses: JSON.stringify(agentResponses),
        total_agents_consulted: successfulAgents.length,
        confidence: 60,
        duration_ms: duration,
        status: 'complete',
        error_message: 'Council degraded: fewer than 2 agents responded.',
      });
      res.json({
        success: true, query_id: meshQuery.id, synthesis, confidence: 60,
        agents_consulted: successfulAgents, degraded: true,
        note: 'Fewer than 2 agents responded — fell back to focused mode.',
        duration_ms: duration,
        memory_count: memoryCount,
        dispatch_modes: agentDispatchModes,
      });
      return;
    }

    // Synthesis
    await base44.asServiceRole.entities.MeshQuery.update(meshQuery.id, { status: 'synthesising' });

    const responseBlocks = Object.entries(agentResponses)
      .map(([agent, text]) => `## ${agent}\n${(text || 'No response').substring(0, Object.keys(agentResponses).length > 10 ? 600 : 800)}`)
      .join('\n\n---\n\n');

    const synthPrompt = `You are Riley's synthesis layer for the Hermetic Mesh — a council of ${successfulAgents.length} specialised AI agents.

Question asked: "${question}"

Agent responses:
${responseBlocks}

Your task:
1. Detect contradictions between agents
2. Weight insights by agent specialty relevance to this question
3. Produce ONE unified, definitive answer that attributes key insights to the agents that contributed them
4. Score overall confidence (0-100) based on agent agreement

Return JSON only:
{
  "synthesis": "...",
  "contradictions": [{"agents": ["A", "B"], "conflict": "..."}],
  "key_contributions": [{"agent": "...", "insight": "..."}],
  "confidence": 85
}`;

    let synthesis = rileyText;
    let contradictions: any[] = [];
    let confidence = 75;
    let synthFallbackUsed = false;

    try {
      const raw = await callOpenRouter([{ role: 'user', content: synthPrompt }], SYNTH_MODEL, 2000, 0.3);
      const match = raw.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(match ? match[0] : raw);
      synthesis = parsed.synthesis || synthesis;
      contradictions = parsed.contradictions || [];
      confidence = parsed.confidence || 80;
    } catch (_) {
      synthFallbackUsed = true;
      confidence = 60;
      // Synthesis LLM failed — Riley's raw response is the fallback, still mark complete
    }

    const duration = Date.now() - runStart;
    const estimatedCost = successfulAgents.length * 0.008;

    await base44.asServiceRole.entities.MeshQuery.update(meshQuery.id, {
      synthesis,
      synthesis_method: synthFallbackUsed ? 'synthesis_fallback_used' : 'council_persona_synthesis',
      agents_consulted: successfulAgents,
      agents_failed: failedAgents,
      agent_responses: JSON.stringify(agentResponses),
      contradictions_detected: JSON.stringify(contradictions),
      total_models_fired: successfulAgents.length * 16,
      total_agents_consulted: successfulAgents.length,
      confidence,
      duration_ms: duration,
      estimated_cost_usd: estimatedCost,
      status: 'complete',
      ...(synthFallbackUsed ? { error_message: 'Synthesis fallback used — Riley raw response returned' } : {}),
    });

    await Promise.allSettled(
      selectedNodes.filter(n => successfulAgents.includes(n.agent_name)).map(node =>
        base44.asServiceRole.entities.MeshNode.update(node.id, {
          last_query_at: now,
          total_mesh_queries: (node.total_mesh_queries || 0) + 1,
        })
      )
    );

    await base44.asServiceRole.entities.ActivityLog.create({
      action: 'mesh_query_complete',
      entity_type: 'MeshQuery',
      entity_id: meshQuery.id,
      summary: `Council query complete. ${successfulAgents.length} agents. Confidence: ${confidence}%. Memory: ${memoryCount} records.`,
      severity: 'info',
      timestamp: now,
    }).catch(() => {});

    res.json({
      success: true,
      query_id: meshQuery.id,
      synthesis,
      confidence,
      agents_consulted: successfulAgents,
      agents_failed: failedAgents,
      manual_agents: manualAgents,
      contradictions,
      total_models_fired: successfulAgents.length * 16,
      duration_ms: duration,
      estimated_cost_usd: estimatedCost,
      memory_count: memoryCount,
      dispatch_modes: agentDispatchModes,
      degraded,
    });
    return;
  } catch (error: any) {
    // Recovery: ensure MeshQuery never stays stuck in synthesising/awaiting_responses
    if (_activeQueryId) {
      try {
        await base44.asServiceRole.entities.MeshQuery.update(_activeQueryId, {
          status: 'failed',
          error_message: (error.message || 'Unknown error').substring(0, 500),
        });
      } catch (_) {}
    }
    res.status(500).json({ error: error.message });
    return;
  }
});
