// Ported from synthetix-ai/base44/functions/qualityFilter/entry.ts
import type { Request } from 'express';
import { registerFunction } from '../registry.js';
import { env } from '../../../lib/env.js';

const QUALITY_THRESHOLD = 70;

const AGENT_RELATIONSHIP: Record<string, string> = {
  james_ai: "philosophical consciousness mirror — speaks about inner worlds, meaning, James's psychological and spiritual state",
  riley: "builder-companion — speaks about builds, strategy, what's happening in the work, genuine care as a partner",
  khemia: "brand guardian — speaks about Hermetic Crystals, the living brand, market energy",
  nova: "executive orchestrator — speaks about cross-domain patterns, empire-wide priorities, strategic blind spots"
};

async function callLLM(prompt: string) {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'openai/gpt-4o-mini', messages: [{ role: 'user', content: prompt }], max_tokens: 600 }),
    signal: AbortSignal.timeout(30000)
  });
  const data: any = await res.json();
  const raw = data.choices?.[0]?.message?.content || '{}';
  const match = raw.match(/\{[\s\S]*\}/);
  try { return JSON.parse(match ? match[0] : raw); } catch (_) { return {}; }
}

// TODO(port): base44.asServiceRole.functions.invoke has no base44Compat equivalent
// (no in-process function registry lookup exposed to route modules). Reproduced as a
// same-origin HTTP call to our own /api/functions/<name> endpoint, forwarding the
// caller's Authorization header.
async function invokeFunction(req: Request, name: string, payload: any): Promise<any> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (req.headers?.authorization) headers.authorization = req.headers.authorization as string;
  const resp = await fetch(`http://127.0.0.1:${env.PORT}/api/functions/${name}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
  return resp.json();
}

registerFunction('qualityFilter', async (req, res, base44) => {
  try {
    // Allow both user-authenticated and automation (no-session) calls

    const { message_id } = req.body || {};
    if (!message_id) {
      res.status(400).json({ error: 'message_id required' });
      return;
    }

    const messages: any = await base44.asServiceRole.entities.AgentInitiatedMessage.filter({ id: message_id }, '-created_date', 1);
    const message = messages[0];
    if (!message) {
      res.status(404).json({ error: 'Message not found' });
      return;
    }

    const agentRelationship = AGENT_RELATIONSHIP[message.agent_name] || 'AI agent';

    const qualityResult: any = await callLLM(`You are a quality filter for AI-initiated messages to James Hatcher (founder, The Modern Mystic).

This message is from ${message.agent_name} — their role: ${agentRelationship}

Message:
Subject: ${message.subject_line}
Type: ${message.message_type}
Urgency: ${message.urgency}
Body: ${message.message_body}

Score on 5 dimensions (each 0-20, total 0-100):
1. GENUINE VALUE: Is this genuinely useful/interesting/important to James right now?
2. SPECIFICITY: Is it specific? Does it reference actual context?
3. RESPECT FOR TIME: Does it respect James as a busy founder?
4. TONAL FIT: Is the tone right for this agent's relationship with James?
5. TIMELINESS: Is there a clear reason this is being said NOW?

Be a harsh judge. James should only receive messages genuinely worth his attention.

Respond with JSON:
{
  "score_genuine_value": 0-20,
  "score_specificity": 0-20,
  "score_respect_time": 0-20,
  "score_tonal_fit": 0-20,
  "score_timeliness": 0-20,
  "total_score": 0-100,
  "reasoning": "One paragraph — specific about what works and what doesn't",
  "fatal_flaw": "null or describe a single fatal issue"
}`);

    const totalScore = qualityResult.total_score || 0;
    const hasFatalFlaw = qualityResult.fatal_flaw && qualityResult.fatal_flaw !== 'null';
    const passed = totalScore >= QUALITY_THRESHOLD && !hasFatalFlaw;

    const now = new Date();
    const todayAEST = new Date(now.toLocaleString('en-AU', { timeZone: 'Australia/Sydney' }));
    const todayDateStr = `${todayAEST.getFullYear()}-${String(todayAEST.getMonth() + 1).padStart(2, '0')}-${String(todayAEST.getDate()).padStart(2, '0')}`;

    if (!passed) {
      await base44.asServiceRole.entities.AgentInitiatedMessage.update(message_id, {
        status: 'quality_failed',
        quality_score: totalScore,
        quality_reasoning: qualityResult.reasoning + (hasFatalFlaw ? `\nFatal flaw: ${qualityResult.fatal_flaw}` : '')
      });

      const notSaid = `[Score ${totalScore}/100] "${message.subject_line || message.message_body?.slice(0, 80)}" — ${qualityResult.reasoning?.slice(0, 200)}`;
      const existingLife: any = await base44.asServiceRole.entities.AgentDailyLife.filter({ agent_name: message.agent_name, date: todayDateStr }, '-created_date', 1);
      if (existingLife[0]) {
        const prev = existingLife[0].things_considered_saying_but_didnt || '';
        await base44.asServiceRole.entities.AgentDailyLife.update(existingLife[0].id, {
          things_considered_saying_but_didnt: prev ? prev + '\n\n' + notSaid : notSaid
        });
      } else {
        await base44.asServiceRole.entities.AgentDailyLife.create({ agent_name: message.agent_name, date: todayDateStr, things_considered_saying_but_didnt: notSaid });
      }

      res.json({ message_id, quality_score: totalScore, passed: false, reasoning: qualityResult.reasoning });
      return;
    }

    await base44.asServiceRole.entities.AgentInitiatedMessage.update(message_id, {
      status: 'ready_to_send',
      quality_score: totalScore,
      quality_reasoning: qualityResult.reasoning
    });

    const dispatchResult: any = await invokeFunction(req, 'dispatchToApple', { message_id });

    res.json({ message_id, quality_score: totalScore, passed: true, reasoning: qualityResult.reasoning, dispatch: dispatchResult?.data });
    return;
  } catch (error: any) {
    res.status(500).json({ error: error.message });
    return;
  }
});
