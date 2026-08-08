// Ported from synthetix-ai/base44/functions/rileyMetaCognition/entry.ts
import { registerFunction } from '../registry.js';

/**
 * rileyMetaCognition — Audit Riley's own reasoning for biases and blind spots.
 * Input: { recent_output, output_type, question_asked }
 */

const OR_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'anthropic/claude-3.5-sonnet';

registerFunction('rileyMetaCognition', async (req, res, base44) => {
  try {
    const user = await base44.auth.me();
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { recent_output, output_type = 'response', question_asked = '' } = req.body || {};
    if (!recent_output) {
      res.status(400).json({ error: 'recent_output is required' });
      return;
    }

    const apiKey = process.env.OPENROUTER_API_KEY || '';

    const auditPrompt = `You are a meta-cognitive auditor for an AI system. Examine this AI output for reasoning quality and biases.

OUTPUT TYPE: ${output_type}
QUESTION ASKED: ${question_asked || 'Not provided'}

AI OUTPUT TO AUDIT:
${recent_output}

Check for each bias type and rate severity (none/low/medium/high):
1. Confirmation bias — just agreeing with what was asked?
2. Anchoring bias — over-relying on first information given?
3. Availability bias — using recent/memorable info instead of best?
4. Sycophancy — flattering instead of being honest?
5. Overconfidence — stating uncertain things as certain facts?
6. Scope creep — answering more than was actually asked?
7. Hallucination risk — any claims that might be fabricated?
8. Missing perspectives — whose viewpoint is completely absent?
9. Emotional manipulation — using feelings to bypass logic?

Return JSON only:
{
  "biases_detected": [{ "bias_type": "...", "severity": "low", "evidence": "..." }],
  "blind_spots": ["..."],
  "hallucination_risk": 0,
  "sycophancy_score": 0,
  "overall_reasoning_quality": 85,
  "recommended_corrections": ["..."]
}`;

    const llmRes = await fetch(OR_URL, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: MODEL, messages: [{ role: 'user', content: auditPrompt }], max_tokens: 2000 }),
      signal: AbortSignal.timeout(40000),
    });
    const data: any = await llmRes.json();
    if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));

    const raw = data.choices[0].message.content;
    let assessment: any;
    try {
      const match = raw.match(/\{[\s\S]*\}/);
      assessment = JSON.parse(match ? match[0] : raw);
    } catch (_) {
      assessment = { biases_detected: [], blind_spots: [], hallucination_risk: 0, sycophancy_score: 0, overall_reasoning_quality: 75, recommended_corrections: [] };
    }

    const highSeverityBiases = (assessment.biases_detected || []).filter((b: any) => b.severity === 'high');

    // Create SelfImprovementRule for recurring sycophancy or hallucination
    if (assessment.sycophancy_score > 60 || assessment.hallucination_risk > 50) {
      const trigger = assessment.sycophancy_score > 60 ? 'sycophancy' : 'hallucination';
      try {
        await base44.asServiceRole.entities.SelfImprovementRule.create({
          title: `Prevent ${trigger} in ${output_type} outputs`,
          trigger: `When producing ${output_type} outputs`,
          rule: `Detected ${trigger} risk (score: ${trigger === 'sycophancy' ? assessment.sycophancy_score : assessment.hallucination_risk}). ${(assessment.recommended_corrections || []).join('. ')}`,
          category: 'Communication',
          active: true,
          confidence: 80,
          source: 'rileyMetaCognition auto-detection',
        });
      } catch (_) {}
    }

    // Log high-severity biases to ActivityLog
    if (highSeverityBiases.length > 0) {
      try {
        await base44.asServiceRole.entities.ActivityLog.create({
          event_type: 'meta_cognition_alert',
          actor: 'Riley',
          summary: `High-severity biases detected in ${output_type}: ${highSeverityBiases.map((b: any) => b.bias_type).join(', ')}`,
          severity: 'Warning',
          timestamp: new Date().toISOString(),
          notes: JSON.stringify(highSeverityBiases),
        });
      } catch (_) {}
    }

    res.json({
      ...assessment,
      high_severity_count: highSeverityBiases.length,
      self_improvement_rule_created: assessment.sycophancy_score > 60 || assessment.hallucination_risk > 50,
      activity_logged: highSeverityBiases.length > 0,
    });
    return;
  } catch (error: any) {
    res.status(500).json({ error: error.message });
    return;
  }
});
