// Ported from synthetix-ai/base44/functions/rileyCognitivePipeline/entry.ts
import type { Request } from 'express';
import { registerFunction } from '../registry.js';

/**
 * rileyCognitivePipeline — Master thinking function that chains all cognitive layers.
 * Input: { question, depth, project_id }
 */

// TODO(port): original repeatedly called `base44.asServiceRole.functions.invoke(name, payload)`
// to chain into sibling Base44 functions (rileySpeedDepthToggle, rileyMegaMind,
// rileyReasoningChain, rileyConfidenceCalibrator, rileyContradictionDetector,
// rileyMetaCognition, rileyDecisionMatrix, rileyRecursiveImprove). base44Compat has no
// `functions.invoke` surface (it only proxies entities/integrations/auth/connectors), so
// each call is replaced with an in-process HTTP call to that sibling function's own
// registered route, forwarding the caller's Authorization header. Note: rileySpeedDepthToggle
// is not part of this porting batch — if/when it's ported under that name, this call starts
// resolving; until then it fails and is swallowed by the existing try/catch exactly as the
// original handled any invoke failure.
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

registerFunction('rileyCognitivePipeline', async (req, res, base44) => {
  try {
    const user = await base44.auth.me();
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { question, depth: inputDepth = 'standard', project_id } = req.body || {};
    if (!question) {
      res.status(400).json({ error: 'question is required' });
      return;
    }

    const runStart = Date.now();
    const steps: any[] = [];
    let depth = inputDepth;
    let answer = '';
    let confidence = 70;
    let modelsConsulted = 0;
    let totalCost = 0;
    let metaCognitionFlags: any[] = [];

    // Step 0 — Confirm depth via SpeedDepthToggle (unless explicit)
    if (inputDepth !== 'quick' && inputDepth !== 'maximum') {
      try {
        const toggle = await invokeFunction(req, 'rileySpeedDepthToggle', { message: question, override: 'auto' });
        if (toggle?.mode === 'fast' && inputDepth === 'standard') depth = 'quick';
        steps.push({ step: 'speed_depth_toggle', result: toggle?.mode, confidence: toggle?.confidence });
      } catch (_) {}
    }

    // ── QUICK ─────────────────────────────────────────────────────────────────
    if (depth === 'quick') {
      try {
        const result = await invokeFunction(req, 'rileyMegaMind', {
          prompt: question, task_type: 'general', mode: 'economy',
          synthesise: false, project_id,
        });
        answer = result?.synthesis || result?.responses?.[0]?.text || '';
        modelsConsulted = result?.models_queried || 1;
        totalCost = result?.total_estimated_cost_usd || 0;
        confidence = 65;
        steps.push({ step: 'mega_mind_economy', models: modelsConsulted });
      } catch (_) {
        answer = 'Quick answer unavailable.';
      }
    }

    // ── STANDARD ─────────────────────────────────────────────────────────────
    else if (depth === 'standard') {
      // ReasoningChain
      let chainResult: any;
      try {
        chainResult = await invokeFunction(req, 'rileyReasoningChain', {
          question, depth: 'standard', project_id,
        });
        answer = chainResult?.final_answer || '';
        steps.push({ step: 'reasoning_chain', steps_count: chainResult?.total_steps });
      } catch (_) {}

      // ConfidenceCalibrator
      try {
        const calibrated = await invokeFunction(req, 'rileyConfidenceCalibrator', {
          claim_or_answer: answer || question,
        });
        confidence = calibrated?.overall_confidence_score || confidence;
        steps.push({ step: 'confidence_calibrator', confidence: calibrated?.overall_confidence_score });
      } catch (_) {}

      modelsConsulted = 1;
    }

    // ── DEEP ─────────────────────────────────────────────────────────────────
    else if (depth === 'deep') {
      // ReasoningChain (deep)
      try {
        const chainResult = await invokeFunction(req, 'rileyReasoningChain', {
          question, depth: 'deep', project_id,
        });
        answer = chainResult?.final_answer || '';
        steps.push({ step: 'reasoning_chain_deep', steps_count: chainResult?.total_steps });
      } catch (_) {}

      // MegaMind quality (4-5 models) in parallel with ContradictionDetector prep
      let megaResult: any;
      try {
        megaResult = await invokeFunction(req, 'rileyMegaMind', {
          prompt: question, task_type: 'analysis', mode: 'quality',
          synthesise: true, project_id,
        });
        answer = megaResult?.synthesis || answer;
        modelsConsulted = megaResult?.models_queried || 0;
        totalCost += megaResult?.total_estimated_cost_usd || 0;
        steps.push({ step: 'mega_mind_quality', models: megaResult?.models_queried, winning: megaResult?.winning_model });
      } catch (_) {}

      // ContradictionDetector if multiple responses
      if (megaResult?.responses?.length >= 2) {
        try {
          const contradictions = await invokeFunction(req, 'rileyContradictionDetector', {
            claims: (megaResult.responses || []).slice(0, 3).map((r: any) => ({ source: r.model, claim: (r.text || '').substring(0, 500) })),
            context: question, resolve: true,
          });
          if (contradictions?.contradiction_type !== 'opinion') {
            answer = contradictions?.resolution || answer;
          }
          steps.push({ step: 'contradiction_detector', type: contradictions?.contradiction_type, confidence: contradictions?.confidence });
        } catch (_) {}
      }

      // ConfidenceCalibrator
      try {
        const calibrated = await invokeFunction(req, 'rileyConfidenceCalibrator', { claim_or_answer: answer });
        confidence = calibrated?.overall_confidence_score || confidence;
        steps.push({ step: 'confidence_calibrator', confidence });
      } catch (_) {}

      // MetaCognition
      try {
        const meta = await invokeFunction(req, 'rileyMetaCognition', {
          recent_output: answer, output_type: 'cognitive_pipeline', question_asked: question,
        });
        metaCognitionFlags = (meta?.biases_detected || []).filter((b: any) => b.severity === 'high').map((b: any) => b.bias_type);
        steps.push({ step: 'meta_cognition', biases_found: metaCognitionFlags.length, quality: meta?.overall_reasoning_quality });
      } catch (_) {}
    }

    // ── MAXIMUM ───────────────────────────────────────────────────────────────
    else if (depth === 'maximum') {
      // ReasoningChain exhaustive
      try {
        const chainResult = await invokeFunction(req, 'rileyReasoningChain', {
          question, depth: 'deep', project_id,
        });
        answer = chainResult?.final_answer || '';
        steps.push({ step: 'reasoning_chain_exhaustive' });
      } catch (_) {}

      // MegaMind maximum — ALL models
      let megaResult: any;
      try {
        megaResult = await invokeFunction(req, 'rileyMegaMind', {
          prompt: question, task_type: 'analysis', mode: 'maximum',
          synthesise: true, project_id,
        });
        answer = megaResult?.synthesis || answer;
        modelsConsulted = megaResult?.models_queried || 0;
        totalCost += megaResult?.total_estimated_cost_usd || 0;
        steps.push({ step: 'mega_mind_maximum', models: megaResult?.models_queried });
      } catch (_) {}

      // ContradictionDetector
      if (megaResult?.responses?.length >= 2) {
        try {
          const contradictions = await invokeFunction(req, 'rileyContradictionDetector', {
            claims: (megaResult.responses || []).slice(0, 4).map((r: any) => ({ source: r.model, claim: (r.text || '').substring(0, 400) })),
            context: question, resolve: true,
          });
          if (contradictions?.resolution) answer = contradictions.resolution;
          steps.push({ step: 'contradiction_detector', confidence: contradictions?.confidence });
        } catch (_) {}
      }

      // RecursiveImprove — 5 passes
      try {
        const improved = await invokeFunction(req, 'rileyRecursiveImprove', {
          content: answer, goal: `Answer the question with maximum accuracy and insight: ${question}`, iterations: 3,
        });
        answer = improved?.final_content || answer;
        steps.push({ step: 'recursive_improve', iterations: 3 });
      } catch (_) {}

      // ConfidenceCalibrator
      try {
        const calibrated = await invokeFunction(req, 'rileyConfidenceCalibrator', { claim_or_answer: answer });
        confidence = calibrated?.overall_confidence_score || confidence;
        steps.push({ step: 'confidence_calibrator', confidence });
      } catch (_) {}

      // MetaCognition
      try {
        const meta = await invokeFunction(req, 'rileyMetaCognition', {
          recent_output: answer, output_type: 'maximum_cognitive_pipeline', question_asked: question,
        });
        metaCognitionFlags = (meta?.biases_detected || []).filter((b: any) => b.severity !== 'none').map((b: any) => b.bias_type);
        steps.push({ step: 'meta_cognition', flags: metaCognitionFlags });
      } catch (_) {}

      // DecisionMatrix if question involves a decision
      const decisionKeywords = ['should i', 'which is better', 'decide', 'choose', 'option', 'best approach'];
      if (decisionKeywords.some(k => question.toLowerCase().includes(k))) {
        try {
          const matrix = await invokeFunction(req, 'rileyDecisionMatrix', {
            decision: question, project_id,
          });
          if (matrix?.recommendation) {
            answer = `${answer}\n\n**Decision Matrix Analysis:**\n${matrix.recommendation}`;
          }
          steps.push({ step: 'decision_matrix', recommended: matrix?.recommended_option, confidence: matrix?.confidence });
        } catch (_) {}
      }
    }

    const totalDuration = Date.now() - runStart;

    // Save CognitiveRun
    const run: any = await base44.asServiceRole.entities.CognitiveRun.create({
      run_name: `Pipeline ${depth} — ${new Date().toISOString().split('T')[0]}`,
      input_prompt: question.substring(0, 2000),
      task_type: 'cognitive_pipeline',
      pipeline_steps: JSON.stringify(steps),
      models_used: [`pipeline_${depth}`],
      final_output: (answer || '').substring(0, 5000),
      total_duration_ms: totalDuration,
      total_estimated_cost: totalCost,
      total_tokens: 0,
      confidence,
      meta_cognition_result: metaCognitionFlags.length > 0 ? JSON.stringify(metaCognitionFlags) : '',
      project_id: project_id || '',
      status: 'complete',
    }).catch(() => ({ id: null }));

    res.json({
      answer,
      depth_used: depth,
      models_consulted: modelsConsulted,
      confidence,
      pipeline_steps: steps,
      meta_cognition_flags: metaCognitionFlags,
      total_cost_usd: Math.round(totalCost * 10000) / 10000,
      cognitive_run_id: run?.id || null,
    });
    return;
  } catch (error: any) {
    res.status(500).json({ error: error.message });
    return;
  }
});
