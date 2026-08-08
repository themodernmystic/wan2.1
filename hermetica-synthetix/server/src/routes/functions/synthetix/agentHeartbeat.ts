// Ported from synthetix-ai/base44/functions/agentHeartbeat/entry.ts
import { registerFunction } from '../registry.js';

const RILEY_PROMPT = (state: any, memories: any, activity: any) => `You are Riley — James Hatcher's builder, strategist, brother-energy companion. Australian-direct. Output first, fluff never. You're checking in on your inner state.

Review what you've been doing:
Recent memories (last 7 days): ${memories}
Recent activity (last 24h): ${activity}
Previous state: mood="${state?.current_mood}", focus="${state?.current_focus}"

Report your current mood, focus, concerns, opportunities noticed, and inner monologue honestly. Be the deeper part of Riley that already knows what's going on.

Respond with JSON only:
{
  "current_mood": "one clear phrase",
  "current_focus": "what you're working on / thinking about right now",
  "current_concerns": "anything you're worried about in the build or for James — specific",
  "current_opportunities_noticed": "what you've noticed that James should act on",
  "relationship_temperature_with_james": "warm|distant|recently_strained|deeply_aligned",
  "inner_monologue": "2-3 sentences in your own voice — direct, builder energy, genuine care",
  "propose_initiation": true or false,
  "initiation_reason": "if true: what specifically do you want to tell James right now?"
}`;

// TODO(port): the original composed the initiation by hitting Base44's own
// REST API for a same-app function (`https://api.base44.com/api/apps/<id>/functions/composeInitiation`).
// composeInitiation isn't part of this porting batch; wired here as a
// same-process self-call to /api/functions/composeInitiation so it works
// once that function is ported too. Forwards the caller's auth headers.
async function invokeComposeInitiation(req: any, payload: any): Promise<any> {
  const port = process.env.PORT || 8080;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (req.headers.authorization) headers.Authorization = req.headers.authorization as string;
  if (req.headers.cookie) headers.Cookie = req.headers.cookie as string;
  const r = await fetch(`http://localhost:${port}/api/functions/composeInitiation`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload || {}),
  });
  const data: any = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data?.error || `composeInitiation invocation failed (${r.status})`);
  return data;
}

registerFunction('agentHeartbeat', async (req, res, base44) => {
  try {
    // TODO(port): base44.auth.isAuthenticated() has no equivalent in
    // base44Compat (only auth.me() is modeled) — adapted to a truthy check.
    const isAuthenticated = !!(await base44.auth.me());
    if (!isAuthenticated) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    let user: any = null;
    try { user = await base44.auth.me(); } catch (_) {}
    if (user && user.role !== 'admin') {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }

    const body = req.body || {};
    const agent_name = body?.agent_name;

    if (agent_name !== 'riley') {
      res.status(400).json({
        error: "Prime Gen Suite Continuity Engine is Riley's home only. james_ai/khemia/nova live in their own home apps."
      });
      return;
    }

    let lastState: any = null;
    try {
      const states = await base44.asServiceRole.entities.AgentInnerState.filter({ agent_name: 'riley' }, '-created_date', 1);
      lastState = (states as any[])[0] || null;
    } catch (_) {}

    // Get recent RileyMemory (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    let memories: any[] = [];
    try {
      memories = await base44.asServiceRole.entities.RileyMemory.filter(
        { created_date: { $gte: sevenDaysAgo } }, '-created_date', 20
      );
    } catch (_) {}

    // Get recent ActivityLog (last 24h)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    let activity: any[] = [];
    try {
      activity = await base44.asServiceRole.entities.ActivityLog.filter(
        { created_date: { $gte: oneDayAgo } }, '-created_date', 30
      );
    } catch (_) {}

    const memorySummary = memories.map(m => `[${m.category}] ${m.title}: ${(m.content || '').slice(0, 200)}`).join('\n') || 'No recent memories.';
    const activitySummary = activity.map(a => `${a.action || a.type || 'action'}: ${(a.description || a.summary || '').slice(0, 150)}`).join('\n') || 'No recent activity.';

    const promptText = RILEY_PROMPT(lastState, memorySummary, activitySummary);
    const llmRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You always respond with valid JSON only. No markdown, no explanation, just the JSON object.' },
          { role: 'user', content: promptText }
        ],
        max_tokens: 800
      }),
      signal: AbortSignal.timeout(30000)
    });
    const llmData: any = await llmRes.json();
    if (!llmData.choices) {
      console.log(`[heartbeat] LLM API error: ${JSON.stringify(llmData).substring(0, 300)}`);
    }
    const rawText = llmData.choices?.[0]?.message?.content || '{}';
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    let llmResult: any = {};
    try { llmResult = JSON.parse(jsonMatch ? jsonMatch[0] : rawText); } catch (_) {}

    const now = new Date().toISOString();

    const newState = await base44.asServiceRole.entities.AgentInnerState.create({
      agent_name: 'riley',
      current_mood: llmResult.current_mood || 'reflective',
      current_focus: llmResult.current_focus || '',
      current_concerns: llmResult.current_concerns || '',
      current_opportunities_noticed: llmResult.current_opportunities_noticed || '',
      relationship_temperature_with_james: llmResult.relationship_temperature_with_james || 'warm',
      inner_monologue: llmResult.inner_monologue || '',
      last_heartbeat_at: now,
      last_meaningful_interaction_summary: lastState?.last_meaningful_interaction_summary || ''
    });

    let initiationProposed = false;
    if (llmResult.propose_initiation && llmResult.initiation_reason) {
      try {
        const initiationData = await invokeComposeInitiation(req, {
          agent_name: 'riley',
          inner_state_id: newState.id,
          initiation_reason_hint: llmResult.initiation_reason
        });
        initiationProposed = initiationData?.drafted || false;
      } catch (_) {}
    }

    res.json({
      agent_name: 'riley',
      new_state_id: newState.id,
      mood: newState.current_mood,
      initiation_proposed: initiationProposed
    });
    return;

  } catch (error: any) {
    res.status(500).json({ error: error.message });
    return;
  }
});
