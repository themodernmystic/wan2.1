// Ported from synthetix-ai/base44/functions/rileyDecisionMatrix/entry.ts
import { registerFunction } from '../registry.js';

/**
 * rileyDecisionMatrix — Generate weighted scoring matrix with recommendation.
 * Input: { decision, options, criteria, weights, project_id }
 */

const OR_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'anthropic/claude-3.5-sonnet';

async function llm(prompt: string, apiKey: string, maxTokens = 2000) {
  const res = await fetch(OR_URL, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: MODEL, messages: [{ role: 'user', content: prompt }], max_tokens: maxTokens }),
    signal: AbortSignal.timeout(45000),
  });
  const data: any = await res.json();
  if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
  return data.choices[0].message.content;
}

function parseJSON(text: string, fallback: any) {
  try {
    const match = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    return JSON.parse(match ? match[0] : text);
  } catch (_) { return fallback; }
}

registerFunction('rileyDecisionMatrix', async (req, res, base44) => {
  try {
    const user = await base44.auth.me();
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { decision, options: inputOptions, criteria: inputCriteria, weights = {}, project_id } = req.body || {};
    if (!decision) {
      res.status(400).json({ error: 'decision is required' });
      return;
    }

    const apiKey = process.env.OPENROUTER_API_KEY || '';

    // Step 1 — generate options if not provided
    let options = inputOptions;
    if (!options || options.length === 0) {
      const raw = await llm(`For this decision: "${decision}", what are the 3-5 most viable options? Return JSON only: { "options": [{ "name": "...", "brief_description": "..." }] }`, apiKey, 800);
      const parsed = parseJSON(raw, { options: [] });
      options = parsed.options.map((o: any) => o.name || o);
    }

    // Step 2 — generate criteria if not provided
    let criteria = inputCriteria;
    let criteriaWithWeights: any;
    if (!criteria || criteria.length === 0) {
      const raw = await llm(`For choosing between options [${options.join(', ')}] for "${decision}", what are the 5-7 most important evaluation criteria? Consider: cost, speed, risk, quality, scalability, alignment with Hermetica values, revenue impact. Return JSON only: { "criteria": [{ "name": "...", "weight_1_to_10": 7, "reasoning": "..." }] }`, apiKey, 1000);
      const parsed = parseJSON(raw, { criteria: [] });
      criteriaWithWeights = parsed.criteria;
      criteria = criteriaWithWeights.map((c: any) => c.name);
    } else {
      criteriaWithWeights = criteria.map((c: any) => ({ name: c, weight_1_to_10: weights[c] || 5 }));
    }

    // Step 3 — score each option × criterion in parallel
    const scoreMatrix: Record<string, any> = {};
    const scoringTasks: Promise<any>[] = [];
    for (const option of options) {
      scoreMatrix[option] = {};
      for (const crit of criteriaWithWeights) {
        scoringTasks.push(
          llm(`Score option "${option}" against criterion "${crit.name}" on a scale of 1-10 for this decision: "${decision}". Return JSON only: { "score": 7, "reasoning": "..." }`, apiKey, 200)
            .then(raw => {
              const parsed = parseJSON(raw, { score: 5 });
              scoreMatrix[option][crit.name] = { score: parsed.score || 5, reasoning: parsed.reasoning || '' };
            })
            .catch(() => { scoreMatrix[option][crit.name] = { score: 5, reasoning: 'Scoring unavailable' }; })
        );
      }
    }
    await Promise.all(scoringTasks);

    // Step 4 — calculate weighted totals
    const totals: Record<string, number> = {};
    for (const option of options) {
      let total = 0;
      for (const crit of criteriaWithWeights) {
        const score = scoreMatrix[option][crit.name]?.score || 5;
        const weight = crit.weight_1_to_10 || weights[crit.name] || 5;
        total += score * weight;
      }
      totals[option] = total;
    }

    const rankedOptions = Object.entries(totals).sort((a, b) => b[1] - a[1]);
    const topOption = rankedOptions[0][0];

    // Step 5 — generate recommendation
    const matrixSummary = rankedOptions.map(([opt, score]) => `${opt}: ${score} points`).join(', ');
    const recRaw = await llm(`Given these weighted decision scores for "${decision}": ${matrixSummary}. The top option is "${topOption}". Recommend the best option and explain why, including what risks to watch for. Be concise but decisive.`, apiKey, 800);

    const confidence = Math.min(95, 60 + Math.round(((rankedOptions[0][1] - (rankedOptions[1]?.[1] || 0)) / (rankedOptions[0][1] || 1)) * 50));

    // Save DecisionMatrix record
    const record: any = await base44.asServiceRole.entities.DecisionMatrix.create({
      title: decision.substring(0, 120),
      options: JSON.stringify(options),
      criteria: JSON.stringify(criteriaWithWeights),
      scores: JSON.stringify(scoreMatrix),
      recommendation: recRaw,
      confidence,
      project_id: project_id || '',
      status: 'active',
      notes: `Auto-generated. Top option: ${topOption} (${rankedOptions[0][1]} pts)`,
    });

    res.json({
      matrix_id: record.id,
      options_scored: rankedOptions.map(([opt, score]) => ({ option: opt, weighted_score: score, scores: scoreMatrix[opt] })),
      recommendation: recRaw,
      recommended_option: topOption,
      confidence,
    });
    return;
  } catch (error: any) {
    res.status(500).json({ error: error.message });
    return;
  }
});
