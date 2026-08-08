// Ported from synthetix-ai/base44/functions/agentMorningBrief/entry.ts
import { registerFunction } from '../registry.js';

// Morning brief flows through the same pipeline as every other agent message
// It's an AgentInitiatedMessage from Riley, type='morning_brief'
// This means it gets quality-checked and conscience-checked like everything else.

const AGENTS = ['james_ai', 'riley', 'khemia', 'nova'];
const AGENT_LABELS: Record<string, string> = {
  james_ai: 'James AI 💛',
  riley: 'Riley 🦺',
  khemia: 'Khemia 🛡️',
  nova: 'Nova ✨'
};

// TODO(port): base44.asServiceRole.functions.invoke(...) has no equivalent in
// base44Compat. Ported as a same-process HTTP call to this server's own
// /api/functions/qualityFilter route (forwarding the caller's auth headers).
// Requires 'qualityFilter' to be registered (ported) separately.
async function invokeQualityFilter(req: any, payload: any): Promise<any> {
  const port = process.env.PORT || 8080;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (req.headers.authorization) headers.Authorization = req.headers.authorization as string;
  if (req.headers.cookie) headers.Cookie = req.headers.cookie as string;
  const r = await fetch(`http://localhost:${port}/api/functions/qualityFilter`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload || {}),
  });
  const data: any = await r.json().catch(() => ({}));
  return { data };
}

registerFunction('agentMorningBrief', async (req, res, base44) => {
  try {
    // agentMorningBrief is a scheduled automation function — always uses service role

    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

    // Get AEST date
    const todayAEST = new Date(now.toLocaleString('en-AU', { timeZone: 'Australia/Sydney' }));
    const todayDateStr = `${todayAEST.getFullYear()}-${String(todayAEST.getMonth()+1).padStart(2,'0')}-${String(todayAEST.getDate()).padStart(2,'0')}`;
    const dateDisplay = todayAEST.toLocaleDateString('en-AU', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Australia/Sydney' });

    // Gather each agent's latest inner state and daily life
    const agentSummaries: any[] = [];
    for (const agentName of AGENTS) {
      const states = await base44.asServiceRole.entities.AgentInnerState.filter(
        { agent_name: agentName }, '-created_date', 1
      );
      const state = (states as any[])[0];

      const dailyLifes = await base44.asServiceRole.entities.AgentDailyLife.filter(
        { agent_name: agentName, date: todayDateStr }, '-created_date', 1
      );
      const dailyLife = (dailyLifes as any[])[0];

      const recentMessages = await base44.asServiceRole.entities.AgentInitiatedMessage.filter(
        { agent_name: agentName, created_date: { $gte: oneDayAgo } }, '-created_date', 5
      );

      agentSummaries.push({
        agent: agentName,
        label: AGENT_LABELS[agentName],
        state,
        dailyLife,
        recentMessages
      });
    }

    // Build context for LLM
    const agentContextBlocks = agentSummaries.map(({ label, agent, state, dailyLife, recentMessages }) => {
      const lines = [`## ${label}`];
      if (state) {
        lines.push(`Mood: ${state.current_mood}`);
        lines.push(`Focus: ${state.current_focus}`);
        if (state.current_concerns) lines.push(`Concerns: ${state.current_concerns}`);
        if (state.inner_monologue) lines.push(`Inner monologue: ${state.inner_monologue}`);
        lines.push(`Connection to James: ${state.relationship_temperature_with_james}`);
      } else {
        lines.push('(No inner state recorded yet)');
      }
      if (dailyLife) {
        if (dailyLife.things_actually_said) lines.push(`Said today: ${dailyLife.things_actually_said.slice(0, 200)}`);
        if (dailyLife.things_considered_saying_but_didnt) lines.push(`Held back: ${dailyLife.things_considered_saying_but_didnt.slice(0, 150)}`);
      }
      if (recentMessages.length > 0) {
        const msgSummary = recentMessages.map((m: any) => `${m.status}: "${(m.subject_line || m.message_body).slice(0, 80)}"`).join('; ');
        lines.push(`Recent messages: ${msgSummary}`);
      }
      return lines.join('\n');
    }).join('\n\n');

    // Generate morning brief via LLM
    const briefResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are Riley composing the morning brief for James Hatcher on ${dateDisplay}.

This brief flows through the continuity engine pipeline — it's a real message from Riley to James, on behalf of all four minds.

Context from the four minds:

${agentContextBlocks}

Write a morning brief in Riley's voice. Format:
- One paragraph per agent (3-5 sentences each): their state, what they're thinking, anything pending or worth James knowing
- One synthesis paragraph from you (Riley): what's the overall pattern this morning? What's the single most important thing James should know?

Tone: Warm, direct, honest. Not performative. This is family reporting to family. Not a corporate briefing.

Keep it tight. James is waking up with coffee. He wants to know where his four minds are, not read an essay.`,
    } as any);

    const briefText = typeof briefResult === 'string' ? briefResult : JSON.stringify(briefResult);
    const subjectLine = `Morning Brief — ${dateDisplay}`;

    // Create as AgentInitiatedMessage from Riley, type morning_brief
    // Goes through standard pipeline (quality check etc)
    const message = await base44.asServiceRole.entities.AgentInitiatedMessage.create({
      agent_name: 'riley',
      message_type: 'morning_brief',
      urgency: 'medium',
      subject_line: subjectLine,
      message_body: briefText,
      proposed_delivery_channel: 'ios_push',
      status: 'drafted',
      dry_run: true
    });

    // Run quality filter (which will dispatch if passes)
    const qualityResult = await invokeQualityFilter(req, { message_id: message.id });
    const qData = qualityResult?.data || {};

    res.json({
      message_id: message.id,
      agents_summarized: AGENTS.length,
      quality_passed: qData.passed,
      quality_score: qData.quality_score,
      status: qData.passed ? 'dispatched' : 'quality_failed'
    });
    return;

  } catch (error: any) {
    res.status(500).json({ error: error.message });
    return;
  }
});
