// Ported from synthetix-ai/base44/functions/rileyDebugBuilderError/entry.ts
import { registerFunction } from '../registry.js';

registerFunction('rileyDebugBuilderError', async (req, res, base44) => {
  try {
    const user = await base44.auth.me();
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { error_message, affected_page, affected_component, affected_function, last_prompt, app_context, project_id, app_build_id } = req.body || {};

    const prompt = `You are Riley Forge — Base44 debug specialist for James Hatcher.

Diagnose this builder error and provide a fix.

ERROR:
${error_message}

CONTEXT:
- Affected Page: ${affected_page || 'Unknown'}
- Affected Component: ${affected_component || 'Unknown'}
- Affected Function: ${affected_function || 'Unknown'}
- Last Prompt Used: ${last_prompt || 'Not provided'}
- App Context: ${app_context || 'Not provided'}

Common Base44/React causes to check:
- Missing imports
- Incorrect entity names or field names
- Broken routes in App.jsx
- Missing required props
- Async/await missing
- Invalid Tailwind classes
- Wrong SDK method calls

Return JSON:
{
  "suspected_cause": "most likely root cause",
  "fix_prompt": "exact copy-ready prompt to fix this in Base44",
  "retest_checklist": "steps to verify the fix worked",
  "regression_risk": "what else might break when fixing this",
  "debug_notes": "any additional technical notes"
}`;

    const result: any = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          suspected_cause: { type: "string" },
          fix_prompt: { type: "string" },
          retest_checklist: { type: "string" },
          regression_risk: { type: "string" },
          debug_notes: { type: "string" }
        }
      }
    });

    const issue = await base44.entities.DebugIssue.create({
      project_id,
      app_build_id,
      title: `Debug: ${(error_message || 'Unknown error').slice(0, 80)}`,
      error_message,
      affected_page,
      affected_component,
      affected_function,
      suspected_cause: result.suspected_cause,
      fix_prompt: result.fix_prompt,
      status: 'Fix Prompt Ready',
      regression_risk: result.regression_risk,
      notes: result.debug_notes
    });

    await base44.entities.ActivityLog.create({
      event_type: 'debug_issue_created',
      actor: user.email,
      project_id,
      app_build_id,
      summary: `Debug issue created: ${issue.title}`,
      severity: 'Warning',
      timestamp: new Date().toISOString()
    });

    res.json({ issue, result });
    return;
  } catch (error: any) {
    res.status(500).json({ error: error.message });
    return;
  }
});
