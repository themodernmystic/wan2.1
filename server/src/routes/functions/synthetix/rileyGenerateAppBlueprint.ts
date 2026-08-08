// Ported from synthetix-ai/base44/functions/rileyGenerateAppBlueprint/entry.ts
import { registerFunction } from '../registry.js';

registerFunction('rileyGenerateAppBlueprint', async (req, res, base44) => {
  try {
    const user = await base44.auth.me();
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { app_idea, app_name, target_users, product_type, desired_features, existing_app_context } = req.body || {};

    const prompt = `You are Riley Forge — James Hatcher's product architect and builder companion.
Generate a complete, structured app blueprint for a Base44-ready application.

APP DETAILS:
- Name: ${app_name || 'Unnamed App'}
- Idea: ${app_idea}
- Target Users: ${target_users || 'Not specified'}
- Product Type: ${product_type || 'App'}
- Desired Features: ${desired_features || 'Not specified'}
- Existing App Context: ${existing_app_context || 'New app — no existing context'}

Generate a complete blueprint as a JSON object with these exact keys:
{
  "app_purpose": "one sentence",
  "problem_statement": "2-3 sentences",
  "core_features": "bullet list of 5-10 core features",
  "user_roles": "list of user roles",
  "navigation_structure": "list of main nav pages",
  "entities_summary": "list of 5-10 entities with brief descriptions",
  "pages_summary": "list of all pages with purposes",
  "backend_functions_summary": "list of backend functions needed",
  "demo_data_plan": "what demo records to create",
  "qa_plan": "key QA checks",
  "build_phases": "Phase 1, Phase 2, Phase 3 breakdown",
  "complexity_score": 1-10,
  "first_prompt": "exact copy-ready Phase 1 builder prompt for Base44"
}

Keep it practical. If complex, split into 3 phases. Phase 1 should be shippable standalone.
Return ONLY valid JSON.`;

    const result: any = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          app_purpose: { type: "string" },
          problem_statement: { type: "string" },
          core_features: { type: "string" },
          user_roles: { type: "string" },
          navigation_structure: { type: "string" },
          entities_summary: { type: "string" },
          pages_summary: { type: "string" },
          backend_functions_summary: { type: "string" },
          demo_data_plan: { type: "string" },
          qa_plan: { type: "string" },
          build_phases: { type: "string" },
          complexity_score: { type: "number" },
          first_prompt: { type: "string" }
        }
      }
    });

    const blueprint = await base44.entities.AppBlueprint.create({
      app_name: app_name || 'Unnamed App',
      app_purpose: result.app_purpose,
      app_type: product_type || 'App',
      target_users,
      problem_statement: result.problem_statement,
      core_features: result.core_features,
      user_roles: result.user_roles,
      navigation_structure: result.navigation_structure,
      entities_summary: result.entities_summary,
      pages_summary: result.pages_summary,
      backend_functions_summary: result.backend_functions_summary,
      demo_data_plan: result.demo_data_plan,
      qa_plan: result.qa_plan,
      build_phases: result.build_phases,
      complexity_score: result.complexity_score,
      status: 'Ready'
    });

    if (result.first_prompt) {
      await base44.entities.BuilderPrompt.create({
        blueprint_id: blueprint.id,
        prompt_title: `Phase 1 Build — ${app_name}`,
        prompt_body: result.first_prompt,
        phase: 'Phase 1',
        purpose: 'Initial app build',
        status: 'Ready',
        copy_ready: true
      });
    }

    await base44.entities.ActivityLog.create({
      event_type: 'blueprint_generated',
      actor: user.email,
      summary: `Generated app blueprint for "${app_name}"`,
      severity: 'Info',
      timestamp: new Date().toISOString()
    });

    res.json({ blueprint, first_prompt: result.first_prompt });
    return;
  } catch (error: any) {
    res.status(500).json({ error: error.message });
    return;
  }
});
