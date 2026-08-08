// Ported from synthetix-ai/base44/functions/rileyRecommendOpenSourceStack/entry.ts
import { registerFunction } from '../registry.js';

registerFunction('rileyRecommendOpenSourceStack', async (req, res, base44) => {
  try {
    const user = await base44.auth.me();
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { app_type, requirements, budget_preference } = req.body || {};

    const prompt = `You are Riley Forge — open-source-first stack advisor for James Hatcher.

Recommend the best free/open-source tools for this app.

APP TYPE: ${app_type || 'Web App'}
REQUIREMENTS: ${requirements || 'Not specified'}
BUDGET: ${budget_preference || 'Free/Open Source first'}

Prioritise:
1. Free and open-source tools
2. Tools that work with Base44 (React, Tailwind, Vite, shadcn/ui already included)
3. Tools James can use without API credits
4. Local-first options where appropriate

Return JSON:
{
  "recommended_stack": "primary stack recommendation with reasoning",
  "tool_list": [
    {
      "name": "tool name",
      "category": "category",
      "use_case": "why to use it",
      "cost_level": "Free|Open Source|Freemium|Paid Optional",
      "integration_type": "Manual Reference|Copy/Paste|Local Install|API Optional",
      "notes": "setup or usage notes"
    }
  ],
  "implementation_notes": "how to implement this stack",
  "credit_saving_tips": "how to avoid burning API/integration credits",
  "risks": "any risks to be aware of"
}`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          recommended_stack: { type: "string" },
          tool_list: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                category: { type: "string" },
                use_case: { type: "string" },
                cost_level: { type: "string" },
                integration_type: { type: "string" },
                notes: { type: "string" }
              }
            }
          },
          implementation_notes: { type: "string" },
          credit_saving_tips: { type: "string" },
          risks: { type: "string" }
        }
      }
    });

    res.json({ result });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
