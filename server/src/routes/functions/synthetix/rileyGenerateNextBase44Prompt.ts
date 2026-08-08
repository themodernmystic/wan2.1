// Ported from synthetix-ai/base44/functions/rileyGenerateNextBase44Prompt/entry.ts
import { registerFunction } from '../registry.js';

registerFunction('rileyGenerateNextBase44Prompt', async (req, res, base44) => {
  try {
    const user: any = await base44.auth.me();
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { app_build_id, last_builder_response, known_errors, next_desired_module, existing_app_context } = req.body || {};

    const prompt = `You are Riley Forge — prompt engineer and Base44 builder companion for James Hatcher.

Generate the next safe, scoped Base44 builder prompt.

CONTEXT:
- App Build ID: ${app_build_id || 'Not specified'}
- Last Builder Response: ${last_builder_response || 'None'}
- Known Errors: ${known_errors || 'None'}
- Next Module Desired: ${next_desired_module || 'Not specified'}
- Existing App Context: ${existing_app_context || 'Not provided'}

RULES FOR PROMPT GENERATION:
1. Keep the prompt scoped — one module or phase at a time
2. Include "do not overwrite working features" where relevant
3. Warn if the prompt may affect existing navigation, branding, entities, or pages
4. Prefer phased prompts over one-shot prompts for complex work
5. Include demo data instructions
6. Include loading, empty, and error states

Return JSON with:
{
  "prompt_title": "short title",
  "prompt_body": "exact copy-ready prompt for Base44 builder",
  "expected_result": "what should happen when this prompt succeeds",
  "risk_warnings": "any overwrite or conflict risks",
  "scope_notes": "what this prompt touches",
  "next_action": "what to do after this prompt succeeds",
  "copy_ready": true
}`;

    const result: any = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          prompt_title: { type: "string" },
          prompt_body: { type: "string" },
          expected_result: { type: "string" },
          risk_warnings: { type: "string" },
          scope_notes: { type: "string" },
          next_action: { type: "string" },
          copy_ready: { type: "boolean" }
        }
      }
    });

    const builderPrompt = await base44.entities.BuilderPrompt.create({
      app_build_id,
      prompt_title: result.prompt_title,
      prompt_body: result.prompt_body,
      purpose: result.scope_notes,
      expected_result: result.expected_result,
      status: 'Ready',
      copy_ready: true,
      notes: `Risk warnings: ${result.risk_warnings}\n\nNext action: ${result.next_action}`
    });

    await base44.entities.ActivityLog.create({
      event_type: 'prompt_generated',
      actor: user.email,
      app_build_id,
      summary: `Generated prompt: ${result.prompt_title}`,
      severity: 'Info',
      timestamp: new Date().toISOString()
    });

    res.json({ builderPrompt, result });
    return;
  } catch (error: any) {
    res.status(500).json({ error: error.message });
    return;
  }
});
