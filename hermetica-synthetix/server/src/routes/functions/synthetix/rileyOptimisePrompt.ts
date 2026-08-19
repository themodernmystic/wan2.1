// Ported from synthetix-ai/base44/functions/rileyOptimisePrompt/entry.ts
import { registerFunction } from '../registry.js';

/**
 * rileyOptimisePrompt — Rewrite any prompt for maximum output quality.
 * Input: { original_prompt, target_model, task_type, save_as_template }
 */

const MODEL_TIPS: Record<string, string> = {
  'gpt-4o': 'GPT-4o benefits from structured JSON output requests, numbered steps, and explicit output format definitions.',
  'gpt-4o-mini': 'GPT-4o-mini benefits from concise instructions and clear single-task focus.',
  'claude-3.5-sonnet': 'Claude benefits from XML tags (<instructions>, <context>, <output_format>), constitutional framing, and explicit values.',
  'claude-3-haiku': 'Claude Haiku benefits from brevity and single focused tasks.',
  'deepseek-chat': 'DeepSeek benefits from code-first instructions, technical precision, and explicit step numbering.',
  'deepseek-coder': 'DeepSeek Coder benefits from exact function signatures, language specification, and test case expectations.',
  'mistral-large': 'Mistral benefits from direct imperative language and clear role assignment.',
  'gemma-3': 'Gemma benefits from concise, direct instructions without excessive framing.',
  'llama-3.1-70b': 'Llama benefits from clear system/user separation and explicit task boundaries.',
};

registerFunction('rileyOptimisePrompt', async (req, res, base44) => {
  try {
    const user = await base44.auth.me();
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { original_prompt, target_model, task_type = 'general', save_as_template = false } = req.body || {};
    if (!original_prompt) {
      res.status(400).json({ error: 'original_prompt is required' });
      return;
    }

    const apiKey = process.env.OPENROUTER_API_KEY || '';
    const modelTip = MODEL_TIPS[target_model] || 'Optimise for clarity, specificity, and structured output.';

    const analysisPrompt = `You are a world-class prompt engineer. Analyse and rewrite this prompt for maximum quality output.

ORIGINAL PROMPT:
${original_prompt}

TASK TYPE: ${task_type}
TARGET MODEL: ${target_model || 'general'}
MODEL-SPECIFIC GUIDANCE: ${modelTip}

Identify every weakness:
- Vague or ambiguous instructions
- Missing context or background
- Unclear output format
- Missing constraints or guardrails
- Missing examples (few-shot)
- Unclear tone or persona
- Missing chain-of-thought cues

Then rewrite it to be: specific, constrained, example-rich if needed, with a clear output format, appropriate persona, and chain-of-thought where beneficial.

Return JSON only:
{
  "analysis": {
    "issues": ["issue 1", "issue 2"],
    "strengths": ["strength 1"]
  },
  "optimised_prompt": "the full rewritten prompt here",
  "expected_quality_improvement": 0,
  "model_specific_notes": "why these changes help for this model",
  "variables_detected": ["{{variable_name}}"]
}`;

    const llmRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'anthropic/claude-3.5-sonnet',
        messages: [{ role: 'user', content: analysisPrompt }],
        max_tokens: 3000,
      }),
      signal: AbortSignal.timeout(45000),
    });
    const data: any = await llmRes.json();
    if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));

    const raw = data.choices[0].message.content;
    let parsed: any;
    try {
      const match = raw.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(match ? match[0] : raw);
    } catch (_) {
      parsed = { optimised_prompt: raw, analysis: { issues: [], strengths: [] }, expected_quality_improvement: 20, model_specific_notes: '', variables_detected: [] };
    }

    let template_id = null;

    if (save_as_template && parsed.optimised_prompt) {
      // Check if a template with this name already exists
      const existingTemplates: any[] = await base44.asServiceRole.entities.PromptTemplate.filter(
        { name: `${task_type} — Optimised${target_model ? ' for ' + target_model : ''}` },
        '-created_date', 1
      );

      if (existingTemplates.length > 0) {
        const existing = existingTemplates[0];
        const updated: any = await base44.asServiceRole.entities.PromptTemplate.update(existing.id, {
          prompt_text: parsed.optimised_prompt,
          version: (existing.version || 1) + 1,
          average_quality_score: parsed.expected_quality_improvement,
          last_used_at: new Date().toISOString(),
          notes: `Updated by rileyOptimisePrompt. Issues fixed: ${(parsed.analysis?.issues || []).join(', ')}`,
        });
        template_id = updated.id;
      } else {
        const tmpl: any = await base44.asServiceRole.entities.PromptTemplate.create({
          name: `${task_type} — Optimised${target_model ? ' for ' + target_model : ''}`,
          task_type,
          prompt_text: parsed.optimised_prompt,
          variables: parsed.variables_detected || [],
          model_target: target_model || 'general',
          average_quality_score: parsed.expected_quality_improvement || 0,
          times_used: 0,
          last_used_at: new Date().toISOString(),
          version: 1,
          active: true,
          notes: `Created by rileyOptimisePrompt. Issues fixed: ${(parsed.analysis?.issues || []).join(', ')}`,
        });
        template_id = tmpl.id;
      }
    }

    // Log to CreditLedger
    try {
      await base44.asServiceRole.entities.CreditLedger.create({
        function_name: 'rileyOptimisePrompt',
        provider: 'openrouter',
        model: 'anthropic/claude-3.5-sonnet',
        estimated_cost: 0.003,
        credit_type: 'external_api',
        timestamp: new Date().toISOString(),
        notes: `Prompt optimisation — task: ${task_type}, improvement: ${parsed.expected_quality_improvement}%`,
      });
    } catch (_) {}

    res.json({
      original: original_prompt,
      optimised: parsed.optimised_prompt,
      analysis: parsed.analysis,
      improvement_estimate: parsed.expected_quality_improvement,
      model_specific_notes: parsed.model_specific_notes,
      template_id,
      saved_as_template: save_as_template && !!template_id,
    });
    return;
  } catch (error: any) {
    res.status(500).json({ error: error.message });
    return;
  }
});
