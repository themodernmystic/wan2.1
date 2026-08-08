// Ported from synthetix-ai/base44/functions/rileyMultiMind/entry.ts
import { registerFunction } from '../registry.js';

/**
 * rileyMultiMind — Query multiple AI models in parallel, synthesise best answer.
 * Input: { prompt, task_type, models, synthesise, project_id }
 */

const OPENROUTER_MODELS = new Set([
  'anthropic/claude-3.5-sonnet', 'claude-3.5-sonnet',
  'anthropic/claude-3-haiku', 'claude-3-haiku',
  'deepseek/deepseek-chat', 'deepseek-chat',
  'deepseek/deepseek-coder', 'deepseek-coder',
  'mistralai/mistral-large', 'mistral-large',
  'mistralai/codestral-mamba', 'codestral',
  'google/gemma-3', 'gemma-3',
  'meta-llama/llama-3.1-70b-instruct', 'llama-3.1-70b',
]);

const OPENAI_MODELS = new Set(['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo']);

// Normalize short names to full model IDs
const MODEL_MAP: Record<string, string> = {
  'claude-3.5-sonnet': 'anthropic/claude-3.5-sonnet',
  'claude-3-haiku': 'anthropic/claude-3-haiku',
  'deepseek-chat': 'deepseek/deepseek-chat',
  'deepseek-coder': 'deepseek/deepseek-coder',
  'mistral-large': 'mistralai/mistral-large',
  'codestral': 'mistralai/codestral-mamba',
  'gemma-3': 'google/gemma-3-27b-it',
  'llama-3.1-70b': 'meta-llama/llama-3.1-70b-instruct',
};

const MODEL_COSTS: Record<string, number> = {
  'gpt-4o': 0.005, 'gpt-4o-mini': 0.0001,
  'anthropic/claude-3.5-sonnet': 0.003, 'anthropic/claude-3-haiku': 0.00025,
  'deepseek/deepseek-chat': 0.00014, 'deepseek/deepseek-coder': 0.00014,
  'mistralai/mistral-large': 0.002, 'mistralai/codestral-mamba': 0.00025,
  'meta-llama/llama-3.1-70b-instruct': 0.0004,
};

function resolveModel(name: string) {
  return MODEL_MAP[name] || name;
}

function getProvider(modelId: string) {
  if (OPENAI_MODELS.has(modelId)) return 'openai';
  return 'openrouter';
}

async function callModel(modelId: string, messages: any[], provider: string, apiKeys: { openai: string; openrouter: string }) {
  const start = Date.now();
  if (provider === 'openai') {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKeys.openai}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: modelId, messages, max_tokens: 2000 }),
      signal: AbortSignal.timeout(30000),
    });
    const data: any = await res.json();
    if (data.error) throw new Error(data.error.message);
    return {
      text: data.choices[0].message.content,
      speed_ms: Date.now() - start,
      tokens: data.usage?.total_tokens || 0,
    };
  } else {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKeys.openrouter}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: modelId, messages, max_tokens: 2000 }),
      signal: AbortSignal.timeout(30000),
    });
    const data: any = await res.json();
    if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
    return {
      text: data.choices[0].message.content,
      speed_ms: Date.now() - start,
      tokens: data.usage?.total_tokens || 0,
    };
  }
}

async function logCredit(base44: any, { function_name, provider, model, estimated_cost, notes }: any) {
  try {
    await base44.asServiceRole.entities.CreditLedger.create({
      function_name, provider, model, estimated_cost,
      credit_type: 'external_api',
      timestamp: new Date().toISOString(),
      notes,
    });
  } catch (_) {}
}

registerFunction('rileyMultiMind', async (req, res, base44) => {
  try {
    const user = await base44.auth.me();
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { prompt, task_type = 'general', models = ['gpt-4o-mini', 'deepseek-chat'], synthesise = true, project_id } = req.body || {};
    if (!prompt) {
      res.status(400).json({ error: 'prompt is required' });
      return;
    }

    const apiKeys = {
      openai: process.env.OPENAI_API_KEY || '',
      openrouter: process.env.OPENROUTER_API_KEY || '',
    };

    const messages = [{ role: 'user', content: prompt }];
    const sessionStart = Date.now();

    // Fire all model requests in parallel
    const modelTasks = models.map(async (name: string) => {
      const modelId = resolveModel(name);
      const provider = getProvider(modelId);
      try {
        const result = await callModel(modelId, messages, provider, apiKeys);
        await logCredit(base44, {
          function_name: 'rileyMultiMind',
          provider,
          model: modelId,
          estimated_cost: MODEL_COSTS[modelId] || 0.001,
          notes: `MultiMind query — task: ${task_type}, tokens: ${result.tokens}`,
        });
        return { model: name, model_id: modelId, provider, ...result, error: null };
      } catch (err: any) {
        return { model: name, model_id: modelId, provider, text: null, speed_ms: 0, tokens: 0, error: err.message };
      }
    });

    const rawResponses = await Promise.all(modelTasks);
    const successResponses = rawResponses.filter((r: any) => !r.error);

    // Synthesise if requested and we have successful responses
    let synthesis: string | null = null;
    let winning_model: string | null = null;

    if (synthesise && successResponses.length > 1) {
      const combined = successResponses.map((r: any) => `### ${r.model}\n${r.text}`).join('\n\n');
      const synthPrompt = `You received these responses to the same question from different AI models:\n\n${combined}\n\nOriginal question: ${prompt}\n\nSynthesise the best possible answer, taking the strongest insights from each model. At the end, note which model contributed the most valuable perspective and why. Format: first give the synthesised answer, then on a new line write "Most valuable: [model name] — [reason]"`;

      try {
        const synthRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${apiKeys.openrouter}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: 'anthropic/claude-3.5-sonnet', messages: [{ role: 'user', content: synthPrompt }], max_tokens: 3000 }),
          signal: AbortSignal.timeout(45000),
        });
        const synthData: any = await synthRes.json();
        synthesis = synthData.choices?.[0]?.message?.content || null;

        // Extract winning model from synthesis text
        const winMatch = synthesis?.match(/Most valuable:\s*([^\n—–-]+)/i);
        winning_model = winMatch ? winMatch[1].trim() : successResponses.sort((a: any, b: any) => a.speed_ms - b.speed_ms)[0]?.model;

        await logCredit(base44, {
          function_name: 'rileyMultiMind',
          provider: 'openrouter',
          model: 'anthropic/claude-3.5-sonnet',
          estimated_cost: 0.005,
          notes: 'Synthesis pass',
        });
      } catch (err: any) {
        synthesis = `Synthesis failed: ${err.message}`;
      }
    } else if (successResponses.length === 1) {
      synthesis = successResponses[0].text;
      winning_model = successResponses[0].model;
    }

    const totalDuration = Date.now() - sessionStart;
    const totalCost = rawResponses.reduce((s: number, r: any) => s + (MODEL_COSTS[r.model_id] || 0.001), 0);

    // Save ConsensusSession
    const session: any = await base44.asServiceRole.entities.ConsensusSession.create({
      session_name: `MultiMind — ${task_type} — ${new Date().toISOString().split('T')[0]}`,
      prompt,
      task_type,
      models_queried: models,
      responses: JSON.stringify(rawResponses.map((r: any) => ({ model: r.model, text: r.text, speed_ms: r.speed_ms, tokens: r.tokens, error: r.error }))),
      synthesis,
      winning_model,
      confidence: successResponses.length === models.length ? 90 : Math.round((successResponses.length / models.length) * 80),
      duration_ms: totalDuration,
      project_id: project_id || '',
      status: successResponses.length > 0 ? 'complete' : 'failed',
    });

    res.json({
      session_id: session.id,
      responses: rawResponses.map((r: any) => ({ model: r.model, text: r.text, speed_ms: r.speed_ms, tokens: r.tokens, error: r.error })),
      synthesis,
      winning_model,
      total_duration_ms: totalDuration,
      total_estimated_cost: parseFloat(totalCost.toFixed(6)),
      models_succeeded: successResponses.length,
      models_failed: rawResponses.filter((r: any) => r.error).length,
    });
    return;
  } catch (error: any) {
    res.status(500).json({ error: error.message });
    return;
  }
});
