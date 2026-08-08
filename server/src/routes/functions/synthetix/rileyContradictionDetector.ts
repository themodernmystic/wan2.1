// Ported from synthetix-ai/base44/functions/rileyContradictionDetector/entry.ts
import type { Request } from 'express';
import { registerFunction } from '../registry.js';

/**
 * rileyContradictionDetector — Identify and resolve contradictions between claims.
 * Input: { claims: [{ source, claim }], context, resolve }
 */

const OR_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'anthropic/claude-3.5-sonnet';

async function llm(prompt: string, apiKey: string, maxTokens = 2000) {
  const res = await fetch(OR_URL, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: MODEL, messages: [{ role: 'user', content: prompt }], max_tokens: maxTokens }),
    signal: AbortSignal.timeout(40000),
  });
  const data: any = await res.json();
  if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
  return data.choices[0].message.content;
}

function parseJSON(text: string, fallback: any) {
  try {
    const match = text.match(/\{[\s\S]*\}/);
    return JSON.parse(match ? match[0] : text);
  } catch (_) { return fallback; }
}

// TODO(port): original called `base44.asServiceRole.functions.invoke('rileyMultiMind', ...)`.
// base44Compat has no `functions.invoke` surface (it only proxies entities/integrations/auth/
// connectors), so this is replaced with an in-process HTTP call to the sibling function's own
// registered route, forwarding the caller's Authorization header.
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

registerFunction('rileyContradictionDetector', async (req, res, base44) => {
  try {
    const user = await base44.auth.me();
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { claims, context = '', resolve = true } = req.body || {};
    if (!claims || claims.length < 2) {
      res.status(400).json({ error: 'At least 2 claims required' });
      return;
    }

    const apiKey = process.env.OPENROUTER_API_KEY || '';
    const claimsText = claims.map((c: any, i: number) => `Source ${i + 1} (${c.source || 'Unknown'}): ${c.claim}`).join('\n\n');

    // Step 1 — classify contradiction
    const classifyPrompt = `Compare these claims and classify the contradiction type:\n\n${claimsText}\n\nContext: ${context || 'None'}\n\nTypes:\n- factual: one is objectively wrong\n- strategic: different valid approaches to same goal\n- opinion: subjective difference in perspective\n- incomplete: both partially right, neither complete\n- context_dependent: both right in different contexts\n\nReturn JSON only: { "contradiction_type": "...", "explanation": "..." }`;

    const classifyRaw = await llm(classifyPrompt, apiKey, 500);
    const classified = parseJSON(classifyRaw, { contradiction_type: 'incomplete', explanation: 'Classification unavailable' });

    let resolution: string | null = null;
    let confidence = 70;
    let resolvedBy = MODEL;

    // Step 2 — resolve if requested
    if (resolve) {
      const resolvePrompt = `Resolve this contradiction between claims:\n\n${claimsText}\n\nContradiction type: ${classified.contradiction_type}\nContext: ${context || 'None'}\n\nWhich claim is more accurate? Can they be reconciled? Provide the most reliable answer with evidence.\n\nReturn JSON only: { "resolution": "...", "confidence": 80, "evidence": "...", "caveats": "..." }`;

      const resolveRaw = await llm(resolvePrompt, apiKey, 1500);
      const resolved = parseJSON(resolveRaw, { resolution: 'Could not resolve', confidence: 50 });
      resolution = resolved.resolution;
      confidence = resolved.confidence || 70;

      // Step 3 — escalate to MultiMind if factual contradiction with low confidence
      if (classified.contradiction_type === 'factual' && confidence < 70) {
        try {
          const mmResult = await invokeFunction(req, 'rileyMultiMind', {
            prompt: `Resolve this factual contradiction:\n\n${claimsText}\n\nWhich claim is correct? Provide evidence.`,
            task_type: 'factual',
            models: ['anthropic/claude-3.5-sonnet', 'deepseek/deepseek-chat', 'mistralai/mistral-large'],
            synthesise: true,
          });
          if (mmResult?.synthesis) {
            resolution = mmResult.synthesis;
            confidence = Math.min(90, confidence + 15);
            resolvedBy = `MultiMind (${mmResult.winning_model || 'consensus'})`;
          }
        } catch (_) {}
      }
    }

    // Step 4 — save ContradictionLog
    const log: any = await base44.asServiceRole.entities.ContradictionLog.create({
      source_a: claims[0]?.source || 'Source A',
      source_b: claims[1]?.source || 'Source B',
      claim_a: claims[0]?.claim || '',
      claim_b: claims[1]?.claim || '',
      contradiction_type: classified.contradiction_type,
      resolution: resolution || 'No resolution attempted',
      resolved_by: resolvedBy,
      confidence_in_resolution: confidence,
      project_id: '',
      timestamp: new Date().toISOString(),
    });

    res.json({
      log_id: log.id,
      contradiction_type: classified.contradiction_type,
      explanation: classified.explanation,
      resolution,
      confidence,
      resolved_by: resolvedBy,
    });
    return;
  } catch (error: any) {
    res.status(500).json({ error: error.message });
    return;
  }
});
