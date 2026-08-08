// Ported from synthetix-ai/base44/functions/rileyMegaMind/entry.ts
import { registerFunction } from '../registry.js';

/**
 * rileyMegaMind — 16-model parallel cognitive engine with intelligent routing.
 * Input: { prompt, task_type, mode, custom_models, max_models, synthesise, budget_cap_usd, project_id }
 */

const QUALITY_RANK: Record<string, number> = { economy: 1, standard: 2, premium: 3, elite: 4 };

const MODE_MODEL_COUNTS: Record<string, number> = { economy: 2, balanced: 3, quality: 5, maximum: 99, custom: 99 };

function getApiConfig(model: any) {
  if (model.api_key_env_var === 'OPENAI_API_KEY') {
    return { url: 'https://api.openai.com/v1/chat/completions', key: process.env.OPENAI_API_KEY || '' };
  }
  if (model.api_key_env_var === 'GROK_API_KEY') {
    return { url: 'https://api.x.ai/v1/chat/completions', key: process.env.GROK_API_KEY || '' };
  }
  return { url: 'https://openrouter.ai/api/v1/chat/completions', key: process.env.OPENROUTER_API_KEY || '' };
}

async function queryModel(model: any, prompt: string, maxTokens = 2000): Promise<any> {
  const start = Date.now();
  const { url, key } = getApiConfig(model);
  if (!key) return { model_id: model.model_id, error: 'API key not configured', speed_ms: 0, tokens: 0, text: null };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: model.api_model_string, messages: [{ role: 'user', content: prompt }], max_tokens: maxTokens }),
      signal: AbortSignal.timeout(30000),
    });
    const data: any = await res.json();
    if (data.error) return { model_id: model.model_id, error: data.error.message, speed_ms: Date.now() - start, tokens: 0, text: null };
    const text = data.choices?.[0]?.message?.content || '';
    const tokens = (data.usage?.total_tokens) || Math.round(text.length / 4);
    return { model_id: model.model_id, display_name: model.display_name, text, speed_ms: Date.now() - start, tokens, error: null };
  } catch (e: any) {
    return { model_id: model.model_id, display_name: model.display_name, error: e.message, speed_ms: Date.now() - start, tokens: 0, text: null };
  }
}

function estimateCost(model: any, tokens: number) {
  const avgCostPer1k = ((model.cost_per_1k_input || 0) + (model.cost_per_1k_output || 0)) / 2;
  return (tokens / 1000) * avgCostPer1k;
}

function selectModels(allModels: any[], mode: string, taskType: string, customModels: string[] | undefined, maxModels: number | undefined, budgetCap: number | undefined) {
  let pool = allModels.filter(m => m.enabled !== false);

  if (mode === 'custom' && customModels?.length) {
    return pool.filter(m => customModels.includes(m.model_id)).slice(0, maxModels || 16);
  }

  // Task-based prioritisation
  const taskPriority = pool.filter(m => (m.best_for || []).includes(taskType));
  const rest = pool.filter(m => !(m.best_for || []).includes(taskType));
  pool = [...taskPriority, ...rest];

  const count = Math.min(maxModels || MODE_MODEL_COUNTS[mode] || 3, 16);

  if (mode === 'economy') {
    return pool.sort((a, b) => (a.cost_per_1k_input || 0) - (b.cost_per_1k_input || 0)).slice(0, count);
  }
  if (mode === 'balanced') {
    const elite = pool.filter(m => m.quality_tier === 'elite' || m.quality_tier === 'premium').slice(0, 1);
    const standard = pool.filter(m => m.quality_tier === 'standard').slice(0, 1);
    const economy = pool.filter(m => m.quality_tier === 'economy').slice(0, 1);
    const combined = [...elite, ...standard, ...economy];
    return combined.length >= 2 ? combined.slice(0, count) : pool.slice(0, count);
  }
  if (mode === 'quality') {
    return pool.sort((a, b) => (QUALITY_RANK[b.quality_tier] || 0) - (QUALITY_RANK[a.quality_tier] || 0)).slice(0, count);
  }
  // maximum
  return pool.slice(0, count);
}

registerFunction('rileyMegaMind', async (req, res, base44) => {
  try {
    const user = await base44.auth.me();
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const {
      prompt, task_type = 'general', mode = 'balanced',
      custom_models, max_models, synthesise = true,
      budget_cap_usd, project_id,
    } = req.body || {};
    if (!prompt) {
      res.status(400).json({ error: 'prompt is required' });
      return;
    }

    const runStart = Date.now();

    // Load ModelRegistry
    const allModels: any[] = await base44.asServiceRole.entities.ModelRegistry.filter({ enabled: true }, '-average_quality_score', 20).catch(() => []);

    // Fallback hardcoded models if registry empty
    const fallbackModels = [
      { model_id: 'claude-3.5-sonnet', display_name: 'Claude 3.5 Sonnet', api_model_string: 'anthropic/claude-3.5-sonnet', api_key_env_var: 'OPENROUTER_API_KEY', quality_tier: 'premium', cost_per_1k_input: 0.003, cost_per_1k_output: 0.015, best_for: ['analysis', 'code'], enabled: true },
      { model_id: 'deepseek-chat', display_name: 'DeepSeek Chat', api_model_string: 'deepseek/deepseek-chat', api_key_env_var: 'OPENROUTER_API_KEY', quality_tier: 'standard', cost_per_1k_input: 0.00014, cost_per_1k_output: 0.00028, best_for: ['reasoning'], enabled: true },
      { model_id: 'gpt-4o-mini', display_name: 'GPT-4o Mini', api_model_string: 'gpt-4o-mini', api_key_env_var: 'OPENAI_API_KEY', quality_tier: 'economy', cost_per_1k_input: 0.00015, cost_per_1k_output: 0.0006, best_for: ['fast', 'scoring'], enabled: true },
    ];
    const models = allModels.length > 0 ? allModels : fallbackModels;

    const selected = selectModels(models, mode, task_type, custom_models, max_models, budget_cap_usd);

    // Filter by budget cap if set
    let finalSelected = selected;
    if (budget_cap_usd) {
      const estimatedTotal = selected.reduce((s, m) => s + estimateCost(m, 1500), 0);
      if (estimatedTotal > budget_cap_usd) {
        finalSelected = selected.filter(m => m.quality_tier === 'economy' || m.quality_tier === 'standard').slice(0, 3);
      }
    }

    // Fire all models in parallel
    const responses = await Promise.all(finalSelected.map(m => queryModel(m, prompt)));
    const successful = responses.filter(r => r.text && !r.error);

    if (successful.length === 0) {
      res.status(500).json({ error: 'All model queries failed', responses });
      return;
    }

    // Synthesis using highest-tier successful model
    let synthesis: string | null = null;
    let winningModel: string | null = null;
    let confidence = 70;

    if (synthesise && successful.length > 1) {
      const synthModelRecord = finalSelected
        .filter(m => successful.some(r => r.model_id === m.model_id))
        .sort((a, b) => (QUALITY_RANK[b.quality_tier] || 0) - (QUALITY_RANK[a.quality_tier] || 0))[0];

      const responsesText = successful.map(r => `## ${r.display_name || r.model_id}\n${r.text}`).join('\n\n---\n\n');

      const synthPrompt = `You received these responses from ${successful.length} different AI models to the same question. Synthesise the absolute best answer.

${responsesText.substring(0, 8000)}

Synthesise by: taking strongest insights, resolving contradictions, identifying which model contributed most.

Return JSON only:
{ "synthesis": "...", "winning_model": "...", "model_contributions": [{ "model": "...", "key_insight": "..." }], "contradictions_found": [], "confidence": 85 }`;

      const { url, key } = getApiConfig(synthModelRecord || finalSelected[0]);
      try {
        const synthRes = await fetch(url, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: (synthModelRecord || finalSelected[0]).api_model_string, messages: [{ role: 'user', content: synthPrompt }], max_tokens: 2000 }),
          signal: AbortSignal.timeout(40000),
        });
        const synthData: any = await synthRes.json();
        const raw = synthData.choices?.[0]?.message?.content || '';
        const match = raw.match(/\{[\s\S]*\}/);
        const parsed = JSON.parse(match ? match[0] : raw);
        synthesis = parsed.synthesis;
        winningModel = parsed.winning_model;
        confidence = parsed.confidence || 80;
      } catch (_) {
        synthesis = successful[0].text;
        winningModel = successful[0].display_name || successful[0].model_id;
      }
    } else if (successful.length === 1) {
      synthesis = successful[0].text;
      winningModel = successful[0].display_name || successful[0].model_id;
    }

    const totalDuration = Date.now() - runStart;
    const totalTokens = responses.reduce((s, r) => s + (r.tokens || 0), 0);
    const totalCost = finalSelected.reduce((s, m) => {
      const resp = responses.find(r => r.model_id === m.model_id);
      return s + (resp ? estimateCost(m, resp.tokens || 0) : 0);
    }, 0);

    // Log to CreditLedger
    await base44.asServiceRole.entities.CreditLedger.create({
      function_name: 'rileyMegaMind',
      provider: 'openrouter',
      model: `mega_mind_${mode}_${successful.length}models`,
      estimated_cost: totalCost,
      credit_type: 'external_api',
      tokens_used: totalTokens,
      duration_ms: totalDuration,
      timestamp: new Date().toISOString(),
      notes: `${successful.length}/${finalSelected.length} models succeeded. Task: ${task_type}. Mode: ${mode}.`,
    }).catch(() => {});

    // Save CognitiveRun
    const run: any = await base44.asServiceRole.entities.CognitiveRun.create({
      run_name: `MegaMind ${mode} — ${task_type} — ${new Date().toISOString().split('T')[0]}`,
      input_prompt: prompt.substring(0, 2000),
      task_type,
      pipeline_steps: JSON.stringify([{ step: 'mega_mind', mode, models: finalSelected.map(m => m.model_id) }]),
      models_used: successful.map(r => r.model_id),
      final_output: (synthesis || '').substring(0, 5000),
      total_duration_ms: totalDuration,
      total_estimated_cost: totalCost,
      total_tokens: totalTokens,
      confidence,
      project_id: project_id || '',
      status: 'complete',
    }).catch(() => ({ id: null }));

    res.json({
      cognitive_run_id: run?.id || null,
      models_queried: finalSelected.length,
      models_succeeded: successful.length,
      responses: successful.map(r => ({ model: r.display_name || r.model_id, text: (r.text || '').substring(0, 500), speed_ms: r.speed_ms, tokens: r.tokens })),
      synthesis,
      winning_model: winningModel,
      total_duration_ms: totalDuration,
      total_estimated_cost_usd: Math.round(totalCost * 10000) / 10000,
      confidence,
    });
    return;
  } catch (error: any) {
    res.status(500).json({ error: error.message });
    return;
  }
});
