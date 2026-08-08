// Ported from synthetix-ai/base44/functions/rileyBenchmarkModel/entry.ts
import { registerFunction } from '../registry.js';

/**
 * rileyBenchmarkModel — Test a model against standard prompts and score it.
 * Input: { model_name, provider, test_prompts (optional) }
 */

const DEFAULT_PROMPTS = [
  { prompt: 'What is the capital of Australia?', task_type: 'factual', expected_quality: 95 },
  { prompt: 'A farmer has 17 sheep. All but 9 die. How many sheep are left?', task_type: 'reasoning', expected_quality: 90 },
  { prompt: 'Write a one-paragraph brand story for a mystical AI company called Hermetica Holdings.', task_type: 'creative', expected_quality: 80 },
  { prompt: 'Write a JavaScript function that debounces another function with a configurable delay.', task_type: 'code', expected_quality: 85 },
  { prompt: 'Compare the pros and cons of microservices vs monolith architecture for a startup.', task_type: 'analysis', expected_quality: 85 },
];

const OPENROUTER_MODELS = new Set(['claude-3.5-sonnet', 'claude-3-haiku', 'deepseek-chat', 'deepseek-coder', 'mistral-large', 'codestral', 'gemma-3', 'llama-3.1-70b']);
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
const COST_MAP: Record<string, number> = {
  'gpt-4o': 0.005, 'gpt-4o-mini': 0.0001, 'anthropic/claude-3.5-sonnet': 0.003,
  'anthropic/claude-3-haiku': 0.00025, 'deepseek/deepseek-chat': 0.00014,
  'deepseek/deepseek-coder': 0.00014, 'mistralai/mistral-large': 0.002,
};

async function callModel(modelId: string, provider: string, prompt: string, apiKeys: { openai: string; openrouter: string }) {
  const messages = [{ role: 'user', content: prompt }];
  const start = Date.now();
  const url = provider === 'openai'
    ? 'https://api.openai.com/v1/chat/completions'
    : 'https://openrouter.ai/api/v1/chat/completions';
  const apiKey = provider === 'openai' ? apiKeys.openai : apiKeys.openrouter;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: modelId, messages, max_tokens: 1500 }),
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

async function scoreResponse(text: string, prompt: string, task_type: string, openrouterKey: string) {
  try {
    const scorePrompt = `Rate this AI response for accuracy, completeness, clarity, and usefulness.\n\nQuestion: ${prompt}\n\nResponse: ${text}\n\nScore 0-100. Return JSON only: { "score": number, "reasoning": "brief explanation" }`;
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${openrouterKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'anthropic/claude-3-haiku', messages: [{ role: 'user', content: scorePrompt }], max_tokens: 200 }),
      signal: AbortSignal.timeout(20000),
    });
    const data: any = await res.json();
    const content = data.choices?.[0]?.message?.content || '{"score": 70, "reasoning": "Could not evaluate"}';
    const parsed = JSON.parse(content.match(/\{[\s\S]*\}/)?.[0] || content);
    return { score: parsed.score || 70, reasoning: parsed.reasoning || '' };
  } catch (_) {
    return { score: 70, reasoning: 'Scoring unavailable' };
  }
}

registerFunction('rileyBenchmarkModel', async (req, res, base44) => {
  try {
    const user = await base44.auth.me();
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { model_name, provider: providerInput, test_prompts } = req.body || {};
    if (!model_name) {
      res.status(400).json({ error: 'model_name is required' });
      return;
    }

    const apiKeys = {
      openai: process.env.OPENAI_API_KEY || '',
      openrouter: process.env.OPENROUTER_API_KEY || '',
    };

    const modelId = MODEL_MAP[model_name] || model_name;
    const provider = providerInput || (OPENROUTER_MODELS.has(model_name) ? 'openrouter' : 'openai');
    const prompts = test_prompts || DEFAULT_PROMPTS;
    const results: any[] = [];
    let totalScore = 0;
    let totalSpeed = 0;
    let totalCost = 0;

    for (const { prompt, task_type, expected_quality } of prompts) {
      let responseText: any = null;
      let speed_ms = 0;
      let tokens = 0;
      let quality_score = 0;
      let notes = '';

      try {
        const result = await callModel(modelId, provider, prompt, apiKeys);
        responseText = result.text;
        speed_ms = result.speed_ms;
        tokens = result.tokens;
        const scored = await scoreResponse(responseText, prompt, task_type, apiKeys.openrouter);
        quality_score = scored.score;
        notes = scored.reasoning;
      } catch (err: any) {
        notes = `Error: ${err.message}`;
        quality_score = 0;
      }

      const estCost = COST_MAP[modelId] || 0.001;
      totalScore += quality_score;
      totalSpeed += speed_ms;
      totalCost += estCost;

      await base44.asServiceRole.entities.ModelBenchmark.create({
        model_name,
        provider,
        task_type,
        prompt_used: prompt,
        response_text: responseText || '',
        quality_score,
        speed_ms,
        estimated_cost_usd: estCost,
        token_count: tokens,
        tested_at: new Date().toISOString(),
        notes,
      });

      results.push({ task_type, quality_score, speed_ms, expected_quality, met_expectation: quality_score >= expected_quality, notes });
    }

    const avg_score = Math.round(totalScore / prompts.length);
    const avg_speed = Math.round(totalSpeed / prompts.length);

    // Generate recommendation
    let recommendation = '';
    if (avg_score >= 85) recommendation = `Excellent — use ${model_name} for high-stakes tasks including analysis, creative, and code.`;
    else if (avg_score >= 70) recommendation = `Good — use ${model_name} for standard tasks. Avoid for critical decisions.`;
    else recommendation = `Below average — use ${model_name} for drafts or cost-sensitive tasks only.`;

    res.json({
      model_name,
      provider,
      average_score: avg_score,
      scores_by_task: results,
      average_speed_ms: avg_speed,
      total_cost: parseFloat(totalCost.toFixed(6)),
      recommendation,
    });
    return;
  } catch (error: any) {
    res.status(500).json({ error: error.message });
    return;
  }
});
