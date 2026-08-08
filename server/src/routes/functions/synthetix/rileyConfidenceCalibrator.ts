// Ported from synthetix-ai/base44/functions/rileyConfidenceCalibrator/entry.ts
import { registerFunction } from '../registry.js';

/**
 * rileyConfidenceCalibrator — Score confidence on any claim across 5 dimensions.
 * Input: { claim_or_answer, context, evidence_available }
 */

registerFunction('rileyConfidenceCalibrator', async (req, res, base44) => {
  try {
    const user = await base44.auth.me();
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { claim_or_answer, context = '', evidence_available = '' } = req.body || {};
    if (!claim_or_answer) {
      res.status(400).json({ error: 'claim_or_answer is required' });
      return;
    }

    const apiKey = process.env.OPENROUTER_API_KEY || '';

    const evalPrompt = `You are an expert epistemologist and critical analyst. Assess the confidence level of this claim or answer across five dimensions.

CLAIM/ANSWER:
${claim_or_answer}

CONTEXT:
${context || 'No additional context provided.'}

EVIDENCE AVAILABLE:
${evidence_available || 'No specific evidence cited.'}

Score each dimension 0-100:
- factual_accuracy: Is this verifiably true based on known facts? (100 = definitely true, 0 = demonstrably false)
- completeness: Does this cover all relevant aspects? (100 = exhaustive, 0 = critically incomplete)
- certainty: How sure can we be, given available information? (100 = certain, 0 = pure speculation)
- source_quality: How reliable is the evidence base? (100 = peer-reviewed/authoritative, 0 = no evidence)
- bias_risk: Risk of bias affecting the claim? (0 = no detectable bias, 100 = heavily biased)

Then:
- overall_confidence: weighted average (factual_accuracy 30%, completeness 20%, certainty 30%, source_quality 15%, bias_risk inverted 5%)
- red_flags: specific concerns that should make us cautious
- caveats: important qualifications or limitations
- recommendation: "proceed" (confidence ≥ 75, no critical flags) | "verify" (confidence 50-74 or minor flags) | "do_not_trust" (confidence < 50 or critical flags)

Return JSON only:
{
  "overall_confidence": 0,
  "dimensions": {
    "factual_accuracy": 0,
    "completeness": 0,
    "certainty": 0,
    "source_quality": 0,
    "bias_risk": 0
  },
  "red_flags": [],
  "caveats": [],
  "recommendation": "verify"
}`;

    const llmRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'anthropic/claude-3.5-sonnet',
        messages: [{ role: 'user', content: evalPrompt }],
        max_tokens: 1500,
      }),
      signal: AbortSignal.timeout(30000),
    });
    const data: any = await llmRes.json();
    if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));

    const raw = data.choices[0].message.content;
    let assessment: any;
    try {
      const match = raw.match(/\{[\s\S]*\}/);
      assessment = JSON.parse(match ? match[0] : raw);
    } catch (_) {
      assessment = {
        overall_confidence: 70,
        dimensions: { factual_accuracy: 70, completeness: 70, certainty: 70, source_quality: 70, bias_risk: 30 },
        red_flags: ['Could not parse assessment'],
        caveats: ['Manual review recommended'],
        recommendation: 'verify',
      };
    }

    // Flag low-confidence results
    const flagged = assessment.overall_confidence < 60 || assessment.recommendation === 'do_not_trust';

    res.json({
      ...assessment,
      flagged,
      flag_reason: flagged
        ? assessment.recommendation === 'do_not_trust'
          ? 'Recommendation is do_not_trust'
          : `Overall confidence (${assessment.overall_confidence}) is below threshold of 60`
        : null,
    });
    return;
  } catch (error: any) {
    res.status(500).json({ error: error.message });
    return;
  }
});
