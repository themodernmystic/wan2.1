// Ported from synthetix-ai/base44/functions/rileyModelSelector/entry.ts
import { registerFunction } from '../registry.js';

/**
 * rileyModelSelector — Recommend optimal model(s) for any task.
 * Input: { task_description, priority, budget_cap_usd }
 */

registerFunction('rileyModelSelector', async (req, res, base44) => {
  try {
    const user = await base44.auth.me();
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { task_description, priority = 'balanced', budget_cap_usd } = req.body || {};
    if (!task_description) {
      res.status(400).json({ error: 'task_description is required' });
      return;
    }

    const apiKey = process.env.OPENROUTER_API_KEY || '';

    // Read ModelRegistry + recent benchmarks in parallel
    const [models, benchmarks] = await Promise.all([
      base44.asServiceRole.entities.ModelRegistry.filter({ enabled: true }, '-average_quality_score', 20).catch(() => []),
      base44.asServiceRole.entities.ModelBenchmark.list('-tested_at', 20).catch(() => []),
    ]);

    // Build model summary
    const modelSummary = models.map((m: any) => ({
      model_id: m.model_id,
      display_name: m.display_name,
      provider: m.provider,
      quality_tier: m.quality_tier,
      speed_tier: m.speed_tier,
      cost_input_per_1k: m.cost_per_1k_input,
      best_for: m.best_for || [],
      strengths: m.strengths || [],
      avg_quality: m.average_quality_score,
    }));

    const benchSummary = benchmarks.slice(0, 10).map((b: any) => ({
      model: b.model_name, task: b.task_type, quality: b.quality_score, speed_ms: b.speed_ms,
    }));

    const budgetNote = budget_cap_usd ? `Budget cap: $${budget_cap_usd} USD per query.` : '';

    const prompt = `You are an AI model selection expert for Hermetica Holdings.

Task to complete: "${task_description}"
Priority: ${priority} (speed=fastest, quality=best output, cost=cheapest, balanced=optimal)
${budgetNote}

Available models:
${JSON.stringify(modelSummary, null, 2).substring(0, 3000)}

Recent benchmark performance:
${JSON.stringify(benchSummary, null, 2).substring(0, 1000)}

Recommend 1-3 models. Consider: task requirements, priority, cost, speed, quality tier.

Return JSON only:
{
  "primary_recommendation": { "model_id": "...", "display_name": "...", "reasoning": "...", "estimated_cost_per_query": 0.002 },
  "alternatives": [{ "model_id": "...", "display_name": "...", "reasoning": "...", "tradeoff": "..." }],
  "avoid": [{ "model_id": "...", "why": "..." }],
  "selection_rationale": "..."
}`;

    const llmRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'anthropic/claude-3.5-sonnet', messages: [{ role: 'user', content: prompt }], max_tokens: 1000 }),
      signal: AbortSignal.timeout(30000),
    });
    const data: any = await llmRes.json();
    if (data.error) throw new Error(data.error.message);

    const raw = data.choices[0].message.content;
    let recommendation: any;
    try {
      const match = raw.match(/\{[\s\S]*\}/);
      recommendation = JSON.parse(match ? match[0] : raw);
    } catch (_) {
      recommendation = { primary_recommendation: { model_id: 'claude-3.5-sonnet', reasoning: 'Default fallback' }, alternatives: [], avoid: [] };
    }

    // Budget filter — remove recommendations that exceed cap
    if (budget_cap_usd && recommendation.primary_recommendation) {
      const primaryModel = models.find((m: any) => m.model_id === recommendation.primary_recommendation.model_id);
      if (primaryModel) {
        const estCost = ((primaryModel.cost_per_1k_input || 0) + (primaryModel.cost_per_1k_output || 0)) / 2 * 1.5; // ~1500 tokens avg
        if (estCost > budget_cap_usd) {
          recommendation.primary_recommendation.budget_warning = `Estimated cost $${estCost.toFixed(4)} may exceed budget cap of $${budget_cap_usd}`;
        }
      }
    }

    res.json({
      task_description,
      priority,
      models_evaluated: models.length,
      ...recommendation,
    });
    return;
  } catch (error: any) {
    res.status(500).json({ error: error.message });
    return;
  }
});
