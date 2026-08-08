// Ported from synthetix-ai/base44/functions/rileyAuditScopeConflict/entry.ts
import { registerFunction } from '../registry.js';

registerFunction('rileyAuditScopeConflict', async (req, res, base44) => {
  try {
    const user: any = await base44.auth.me();
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { requested_change, current_app_context, project_id, app_build_id } = req.body || {};

    const prompt = `You are Riley Forge — scope conflict auditor for James Hatcher's Base44 apps.

Analyse whether the requested change may conflict with or overwrite existing app functionality.

REQUESTED CHANGE:
${requested_change}

CURRENT APP CONTEXT:
${current_app_context || 'Not provided'}

Check for conflicts with:
- Existing landing page or hero section
- Dashboard layout or navigation
- Branding, colour scheme, or design system
- Entities and data models
- Product positioning or core offer
- User flows or permissions
- App purpose or audience
- Backend functions

Return JSON:
{
  "conflict_level": "None|Low|Medium|High|Critical",
  "conflict_summary": "what conflicts exist",
  "overwrite_risk": "what might get overwritten",
  "recommendation": "what to do",
  "safe_build_path": "safest way to implement the change without breaking existing work"
}`;

    const result: any = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          conflict_level: { type: "string" },
          conflict_summary: { type: "string" },
          overwrite_risk: { type: "string" },
          recommendation: { type: "string" },
          safe_build_path: { type: "string" }
        }
      }
    });

    const review = await base44.entities.ScopeConflictReview.create({
      project_id,
      app_build_id,
      requested_change,
      current_app_context,
      conflict_level: result.conflict_level,
      conflict_summary: result.conflict_summary,
      overwrite_risk: result.overwrite_risk,
      recommendation: result.recommendation,
      safe_build_path: result.safe_build_path
    });

    await base44.entities.ActivityLog.create({
      event_type: 'scope_audit',
      actor: user.email,
      project_id,
      app_build_id,
      summary: `Scope conflict audit — level: ${result.conflict_level}`,
      severity: result.conflict_level === 'Critical' ? 'Critical' : result.conflict_level === 'High' ? 'Error' : 'Warning',
      timestamp: new Date().toISOString()
    });

    res.json({ review, result });
    return;
  } catch (error: any) {
    res.status(500).json({ error: error.message });
    return;
  }
});
