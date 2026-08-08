// Ported from synthetix-ai/base44/functions/rileyReasoningChain/entry.ts
import type { Request } from 'express';
import { registerFunction } from '../registry.js';

/**
 * rileyReasoningChain — Break complex problems into step-by-step reasoning.
 * Input: { question, depth, model, project_id }
 * depth: "quick" | "standard" | "deep" | "exhaustive"
 */

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

async function llmCall(prompt: string, model: string | undefined, apiKey: string, maxTokens = 2000) {
  const res = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: model || 'anthropic/claude-3.5-sonnet',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: maxTokens,
    }),
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
  } catch (_) {
    return fallback;
  }
}

// TODO(port): original called `base44.asServiceRole.functions.invoke('rileyMultiMind', ...)`.
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

registerFunction('rileyReasoningChain', async (req, res, base44) => {
  try {
    const user = await base44.auth.me();
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { question, depth = 'standard', model, project_id } = req.body || {};
    if (!question) {
      res.status(400).json({ error: 'question is required' });
      return;
    }

    const apiKey = process.env.OPENROUTER_API_KEY || '';
    const resolvedModel = model || 'anthropic/claude-3.5-sonnet';
    const start = Date.now();
    const stepsRecord: any[] = [];

    // STEP 1 — DECOMPOSE
    const decomposePrompt = `Break this question into 3-7 logical reasoning steps. Each step should build on the previous. Be specific and analytical.\n\nQuestion: ${question}\n\nReturn JSON only: { "steps": [{ "step_number": 1, "question": "...", "depends_on": [] }] }`;
    const decomposeRaw = await llmCall(decomposePrompt, resolvedModel, apiKey, 1000);
    const decomposed = parseJSON(decomposeRaw, { steps: [{ step_number: 1, question: question, depends_on: [] }] });
    const steps = decomposed.steps || [{ step_number: 1, question: question, depends_on: [] }];

    // STEP 2 — SOLVE EACH STEP SEQUENTIALLY
    const accumulatedAnswers: string[] = [];
    for (const step of steps) {
      const prevContext = accumulatedAnswers.length > 0
        ? `Previous step answers:\n${accumulatedAnswers.map((a, i) => `Step ${i + 1}: ${a}`).join('\n')}\n\n`
        : '';
      const solvePrompt = `${prevContext}Original question: ${question}\n\nCurrent step to answer: ${step.question}\n\nProvide a clear, evidence-based answer for this specific step only. Be precise.`;
      const answer = await llmCall(solvePrompt, resolvedModel, apiKey, 1500);
      accumulatedAnswers.push(answer);
      stepsRecord.push({ ...step, answer });
    }

    // STEP 3 — SYNTHESISE
    const stepSummary = stepsRecord.map((s, i) => `Step ${i + 1} (${s.question}):\n${s.answer}`).join('\n\n');
    const synthPrompt = `Given these step-by-step answers to the question "${question}":\n\n${stepSummary}\n\nSynthesise into a final comprehensive answer. Then on a new line write:\nCONFIDENCE: [0-100]\nASSUMPTIONS: [any key assumptions made]\nUNCERTAINTIES: [anything uncertain]`;
    const synthesis = await llmCall(synthPrompt, resolvedModel, apiKey, 2000);

    // Extract confidence from synthesis text
    const confMatch = synthesis.match(/CONFIDENCE:\s*(\d+)/i);
    let confidence = confMatch ? parseInt(confMatch[1]) : 75;

    let finalAnswer = synthesis;
    let critiques = null;
    let revisedConfidence = confidence;

    // STEP 4 — CRITIQUE (deep + exhaustive)
    if (depth === 'deep' || depth === 'exhaustive') {
      const critiquePrompt = `Critically review this reasoning chain and its conclusion.\n\nQuestion: ${question}\n\nReasoning: ${stepSummary}\n\nConclusion: ${synthesis}\n\nFind: logical gaps, unsupported assumptions, missing perspectives, potential errors.\n\nReturn JSON: { "critiques": ["..."], "revised_answer": "...", "revised_confidence": 0-100 }`;
      const critiqueRaw = await llmCall(critiquePrompt, resolvedModel, apiKey, 2000);
      const critiqueData = parseJSON(critiqueRaw, { critiques: [], revised_answer: finalAnswer, revised_confidence: confidence });
      critiques = critiqueData.critiques;
      finalAnswer = critiqueData.revised_answer || finalAnswer;
      revisedConfidence = critiqueData.revised_confidence || confidence;
    }

    // STEP 5 — MULTI-MIND (exhaustive only)
    let multiMindResult: any = null;
    if (depth === 'exhaustive') {
      try {
        multiMindResult = await invokeFunction(req, 'rileyMultiMind', {
          prompt: `${question}\n\nBest reasoning so far:\n${finalAnswer}`,
          task_type: 'analysis',
          models: ['anthropic/claude-3.5-sonnet', 'deepseek/deepseek-chat', 'mistralai/mistral-large'],
          synthesise: true,
          project_id,
        });
        if (multiMindResult?.synthesis) {
          finalAnswer = multiMindResult.synthesis;
          revisedConfidence = Math.min(99, revisedConfidence + 5);
        }
      } catch (_) {}
    }

    const duration = Date.now() - start;

    // Save ReasoningChain record
    const chain: any = await base44.asServiceRole.entities.ReasoningChain.create({
      title: `${depth.toUpperCase()} — ${question.substring(0, 80)}`,
      original_question: question,
      steps: JSON.stringify(stepsRecord),
      final_answer: finalAnswer,
      confidence: revisedConfidence,
      model_used: resolvedModel,
      total_steps: stepsRecord.length,
      duration_ms: duration,
      project_id: project_id || '',
      quality_score: revisedConfidence,
      notes: `Depth: ${depth}. Critique: ${critiques ? 'yes' : 'no'}. MultiMind: ${multiMindResult ? 'yes' : 'no'}.`,
    });

    res.json({
      chain_id: chain.id,
      final_answer: finalAnswer,
      confidence: revisedConfidence,
      total_steps: stepsRecord.length,
      duration_ms: duration,
      critiques: critiques || [],
      depth_used: depth,
    });
    return;
  } catch (error: any) {
    res.status(500).json({ error: error.message });
    return;
  }
});
