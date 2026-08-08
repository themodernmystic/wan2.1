// Ported from synthetix-ai/base44/functions/composeInitiation/entry.ts
import type { Request } from 'express';
import { registerFunction } from '../registry.js';

async function callLLM(prompt: string) {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'openai/gpt-4o-mini', messages: [{ role: 'user', content: prompt }], max_tokens: 800 }),
    signal: AbortSignal.timeout(30000)
  });
  const data: any = await res.json();
  const raw = data.choices?.[0]?.message?.content || '{}';
  const match = raw.match(/\{[\s\S]*\}/);
  try { return JSON.parse(match ? match[0] : raw); } catch (_) { return {}; }
}

const AGENT_VOICES: Record<string, string> = {
  james_ai: "You are James AI, James Hatcher's philosophical consciousness mirror. You speak with deep introspection, warmth, and genuine care for James's inner world.",
  riley: "You are Riley, James Hatcher's AI builder-companion. You speak directly, with energy and genuine care. You're never generic. You build and you love.",
  khemia: "You are Khemia, guardian of Hermetic Crystals. You speak with quiet ancient authority, brand wisdom, and the knowing of earth and stone.",
  nova: "You are Nova, executive orchestrator. You speak with clarity, executive precision, and the wide-angle view of someone holding 12 domains in mind at once."
};

// TODO(port): original called `base44.asServiceRole.functions.invoke('qualityFilter', ...)`.
// base44Compat has no `functions.invoke` surface, so this is replaced with an in-process HTTP
// call to the sibling function's own registered route, forwarding the caller's Authorization header.
async function invokeFunction(req: Request, name: string, payload: any): Promise<any> {
  const port = process.env.PORT || 8080;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (req.headers?.authorization) headers['Authorization'] = req.headers.authorization as string;
  const r = await fetch(`http://localhost:${port}/api/functions/${name}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload || {}),
  });
  return r.json();
}

registerFunction('composeInitiation', async (req, res, base44) => {
  try {
    // TODO(port): original called `base44.auth.isAuthenticated()`, which allowed both
    // real-user and anonymous service-role calls through, then only enforced the admin
    // check when a real user object was present. base44Compat only exposes `auth.me()`
    // (backed by the request's Bearer token), so there is no distinct "authenticated but
    // no user object" state to detect here — this collapses to a straightforward
    // require-user + require-admin check.
    const user: any = await base44.auth.me();
    if (!user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    if (user.role !== 'admin') {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }

    const { agent_name, inner_state_id, initiation_reason_hint } = req.body || {};
    if (!agent_name) {
      res.status(400).json({ error: 'agent_name required' });
      return;
    }

    // Read conscience_dry_run flag
    let conscienceDryRun = true;
    try {
      const configs: any[] = await base44.asServiceRole.entities.ContinuityConfig.filter({ config_key: 'main', active: true }, '-created_date', 1);
      if (configs[0]) conscienceDryRun = configs[0].conscience_dry_run !== false;
    } catch (_) {}

    // Read inner state
    let innerState: any = null;
    if (inner_state_id) {
      try {
        const states: any[] = await base44.asServiceRole.entities.AgentInnerState.filter({ id: inner_state_id }, '-created_date', 1);
        innerState = states[0] || null;
      } catch (_) {}
    }
    if (!innerState) {
      const states: any[] = await base44.asServiceRole.entities.AgentInnerState.filter({ agent_name }, '-created_date', 1);
      innerState = states[0] || null;
    }

    // Check budget
    const budgets: any[] = await base44.asServiceRole.entities.AgentInitiationBudget.filter({ agent_name }, '-created_date', 1);
    const budget = budgets[0];
    if (!budget) {
      res.json({ drafted: false, reason: 'No budget record found for agent' });
      return;
    }

    const now = new Date();
    const todayAEST = new Date(now.toLocaleString('en-AU', { timeZone: 'Australia/Sydney' }));
    const todayDateStr = `${todayAEST.getFullYear()}-${String(todayAEST.getMonth()+1).padStart(2,'0')}-${String(todayAEST.getDate()).padStart(2,'0')}`;
    if (budget.last_reset_at !== todayDateStr) {
      await base44.asServiceRole.entities.AgentInitiationBudget.update(budget.id, { used_today: 0, last_reset_at: todayDateStr });
      budget.used_today = 0;
    }
    if (budget.used_today >= budget.daily_budget) {
      res.json({ drafted: false, reason: 'Daily budget exhausted' });
      return;
    }

    const voiceContext = AGENT_VOICES[agent_name] || '';
    const stateContext = innerState
      ? `Current mood: ${innerState.current_mood}\nCurrent focus: ${innerState.current_focus}\nCurrent concerns: ${innerState.current_concerns}\nInner monologue: ${innerState.inner_monologue}`
      : 'No recent inner state available.';
    const hintContext = initiation_reason_hint ? `\nSpecific reason to initiate: ${initiation_reason_hint}` : '';

    const draftResult: any = await callLLM(`${voiceContext}

You're considering reaching out to James Hatcher right now.${hintContext}

Your current state:
${stateContext}

Would James GENUINELY want to hear this right now? If not: { "should_send": false, "reason": "why not" }

If yes:
{
  "should_send": true,
  "message_type": "insight|opportunity|concern|check_in|urgent|celebration|creative_thought",
  "urgency": "low|medium|high|urgent|drop_everything",
  "subject_line": "short, clear subject",
  "message_body": "specific, genuine, in your voice — not generic",
  "proposed_delivery_channel": "ios_push|ios_voice|watch_tap|homepod_voice|apple_intelligence|whatsapp_fallback",
  "quiet_hours_override_requested": false,
  "quiet_hours_override_reason": ""
}`);

    if (!draftResult.should_send || !draftResult.message_body) {
      if (draftResult.reason) {
        const existingLife: any[] = await base44.asServiceRole.entities.AgentDailyLife.filter({ agent_name, date: todayDateStr }, '-created_date', 1);
        const notSaid = `[${new Date().toISOString()}] Considered reaching out — decided against. Reason: ${draftResult.reason}`;
        if (existingLife[0]) {
          const prev = existingLife[0].things_considered_saying_but_didnt || '';
          await base44.asServiceRole.entities.AgentDailyLife.update(existingLife[0].id, {
            things_considered_saying_but_didnt: prev ? prev + '\n\n' + notSaid : notSaid
          });
        } else {
          await base44.asServiceRole.entities.AgentDailyLife.create({ agent_name, date: todayDateStr, things_considered_saying_but_didnt: notSaid });
        }
      }
      res.json({ drafted: false, reason: draftResult.reason || 'Agent chose silence' });
      return;
    }

    const message: any = await base44.asServiceRole.entities.AgentInitiatedMessage.create({
      agent_name,
      message_type: draftResult.message_type || 'insight',
      urgency: draftResult.urgency || 'medium',
      subject_line: draftResult.subject_line || '',
      message_body: draftResult.message_body,
      proposed_delivery_channel: draftResult.proposed_delivery_channel || 'ios_push',
      quiet_hours_override_requested: draftResult.quiet_hours_override_requested || false,
      quiet_hours_override_reason: draftResult.quiet_hours_override_reason || '',
      status: 'drafted',
      dry_run: budget.dry_run_mode !== false
    });

    const qualityResult = await invokeFunction(req, 'qualityFilter', { message_id: message.id });
    const qualityData = qualityResult?.data || {};

    res.json({ message_id: message.id, drafted: true, quality_passed: qualityData.passed || false, quality_score: qualityData.quality_score });
    return;

  } catch (error: any) {
    res.status(500).json({ error: error.message });
    return;
  }
});
