// Ported from synthetix-ai/base44/functions/rileyRecursiveImprove/entry.ts
import { registerFunction } from '../registry.js';

/**
 * rileyRecursiveImprove — Apply James Hatcher Paradigm recursive improvement loop.
 * Input: { output_to_improve, output_type, improvement_passes, competitor_review, project_id }
 */

const OR_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODEL = 'anthropic/claude-3.5-sonnet';

async function llmCall(prompt: string, apiKey: string, maxTokens = 3000) {
  const res = await fetch(OR_URL, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: maxTokens,
    }),
    signal: AbortSignal.timeout(60000),
  });
  const data: any = await res.json();
  if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
  return data.choices[0].message.content;
}

function extractScore(text: string) {
  const match = text.match(/score[:\s]+(\d+)/i) || text.match(/(\d+)\s*\/\s*100/) || text.match(/\b([6-9]\d|100)\b/);
  return match ? Math.min(100, parseInt(match[1])) : 65;
}

registerFunction('rileyRecursiveImprove', async (req, res, base44) => {
  try {
    const user = await base44.auth.me();
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const {
      output_to_improve,
      output_type = 'any',
      improvement_passes = 3,
      competitor_review = true,
      project_id,
    } = req.body || {};

    if (!output_to_improve) {
      res.status(400).json({ error: 'output_to_improve is required' });
      return;
    }

    const apiKey = process.env.OPENROUTER_API_KEY || '';
    const passes = Math.min(5, Math.max(3, improvement_passes));
    const passLog: any[] = [];

    // PASS 1 — SELF-CRITIQUE
    const critiquePrompt = `You are a ruthless quality reviewer. Critically review this ${output_type}. Find every weakness, gap, error, and missed opportunity. Be specific and unsparing.

${output_type.toUpperCase()}:
${output_to_improve}

Return:
1. List every weakness (be exhaustive)
2. Score the current quality 0-100
3. Top 3 most critical issues to fix

Format: WEAKNESSES:\n- ...\n\nSCORE: [number]\n\nTOP 3 CRITICAL ISSUES:\n1. ...\n2. ...\n3. ...`;

    const critiqueResult = await llmCall(critiquePrompt, apiKey);
    const originalScore = extractScore(critiqueResult);
    passLog.push({ pass: 1, type: 'self_critique', output: critiqueResult, score: originalScore });

    // PASS 2 — UPGRADE
    const upgradePrompt = `You reviewed a ${output_type} and found these weaknesses:

${critiqueResult}

Now rewrite/improve the original ${output_type} to address EVERY identified weakness. Make it significantly better — not just marginally improved.

ORIGINAL:
${output_to_improve}

Produce the improved version now. Do not explain — just output the improved ${output_type}.`;

    const upgradedOutput = await llmCall(upgradePrompt, apiKey);
    passLog.push({ pass: 2, type: 'upgrade', output: upgradedOutput });

    let currentOutput = upgradedOutput;
    let competitorInsights: string | null = null;

    // PASS 3 — COMPETITOR REVIEW (if enabled)
    if (competitor_review) {
      const competitorPrompt = `You are a fierce competitor trying to beat this ${output_type}. Analyse it from a competitive standpoint.

${output_type.toUpperCase()} TO BEAT:
${currentOutput}

Answer:
1. What would you do differently to make yours superior?
2. What is this missing that would make it world-class?
3. Where is this vulnerable to competitive attack?
4. What competitive advantages are they not leveraging?

Be specific and strategic.`;

      competitorInsights = await llmCall(competitorPrompt, apiKey, 2000);
      passLog.push({ pass: 3, type: 'competitor_review', output: competitorInsights });
    }

    // PASS 4 — SUPREME VERSION
    const supremePrompt = `You now have:

1. ORIGINAL ${output_type.toUpperCase()}:
${output_to_improve}

2. IMPROVED VERSION:
${currentOutput}

${competitorInsights ? `3. COMPETITIVE ANALYSIS:\n${competitorInsights}\n` : ''}

Create the SUPREME version — the absolute best possible ${output_type}. Incorporate the best of the improved version and the competitive insights. This should be genuinely world-class. Output the supreme ${output_type} directly, no preamble.`;

    const supremeOutput = await llmCall(supremePrompt, apiKey);
    currentOutput = supremeOutput;
    passLog.push({ pass: 4, type: 'supreme_version', output: supremeOutput });

    // PASS 5 — FINAL POLISH (if passes >= 5)
    if (passes >= 5) {
      const polishPrompt = `Apply final polish to this ${output_type}. Focus on: clarity, flow, impact, and removing anything that doesn't serve the core goal. Every word must earn its place.

${output_type.toUpperCase()} TO POLISH:
${currentOutput}

Output the polished version directly.`;

      const polishedOutput = await llmCall(polishPrompt, apiKey, 3000);
      currentOutput = polishedOutput;
      passLog.push({ pass: 5, type: 'final_polish', output: polishedOutput });
    }

    // Score the final output
    const finalScorePrompt = `Score this ${output_type} for quality, completeness, and effectiveness. Return just a number 0-100. No explanation.\n\n${currentOutput}`;
    const finalScoreRaw = await llmCall(finalScorePrompt, apiKey, 50);
    const finalScore = extractScore(finalScoreRaw);

    const improvementPct = originalScore > 0
      ? Math.round(((finalScore - originalScore) / originalScore) * 100)
      : 0;

    // Log to CreditLedger
    try {
      await base44.asServiceRole.entities.CreditLedger.create({
        function_name: 'rileyRecursiveImprove',
        provider: 'openrouter',
        model: DEFAULT_MODEL,
        estimated_cost: passes * 0.003,
        credit_type: 'external_api',
        timestamp: new Date().toISOString(),
        notes: `Recursive improvement — ${passes} passes, type: ${output_type}, score: ${originalScore}→${finalScore}`,
      });
    } catch (_) {}

    res.json({
      original_score: originalScore,
      final_score: finalScore,
      improvement_percentage: improvementPct,
      passes_completed: passLog.length,
      final_output: currentOutput,
      critique_summary: passLog[0]?.output || '',
      competitor_insights: competitorInsights,
      pass_log: passLog.map(p => ({ pass: p.pass, type: p.type, score: p.score })),
    });
    return;
  } catch (error: any) {
    res.status(500).json({ error: error.message });
    return;
  }
});
