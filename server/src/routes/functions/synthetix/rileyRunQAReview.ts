// Ported from synthetix-ai/base44/functions/rileyRunQAReview/entry.ts
import { registerFunction } from '../registry.js';

registerFunction('rileyRunQAReview', async (req, res, base44) => {
  try {
    const user = await base44.auth.me();
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { app_build_id, project_id, current_known_state } = req.body || {};

    const prompt = `You are Riley Forge — QA lead for James Hatcher's Base44 apps.

Run a comprehensive QA review based on the known app state.

APP STATE:
${current_known_state || 'Not provided'}

Assess each area:
- Frontend: Do all pages exist? Are components rendering? Are there loading/empty/error states?
- Backend: Do backend functions run? Are they handling errors?
- Entities: Are all entities saving correctly? Are required fields validated?
- Navigation: Does nav work? Are all routes registered in App.jsx?
- Form Validation: Are required fields validated? Are error messages shown?
- Accessibility: Are labels present? Is keyboard navigation considered?
- Performance: Any obvious performance issues?
- Security: Any unsafe claims, exposed secrets, or security language issues?
- Demo Data: Does demo data appear for new users?

Return JSON:
{
  "frontend_status": "Pass|Partial|Fail|Not Tested",
  "backend_status": "Pass|Partial|Fail|Not Tested",
  "entity_status": "Pass|Partial|Fail|Not Tested",
  "navigation_status": "Pass|Partial|Fail|Not Tested",
  "form_validation_status": "Pass|Partial|Fail|Not Tested",
  "accessibility_status": "Pass|Partial|Fail|Not Tested",
  "performance_status": "Pass|Partial|Fail|Not Tested",
  "security_status": "Pass|Partial|Fail|Not Tested",
  "demo_data_status": "Pass|Partial|Fail|Not Tested",
  "unresolved_issues": "list of issues found",
  "recommendations": "list of recommended fixes",
  "final_score": 0-100
}`;

    const result: any = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          frontend_status: { type: "string" },
          backend_status: { type: "string" },
          entity_status: { type: "string" },
          navigation_status: { type: "string" },
          form_validation_status: { type: "string" },
          accessibility_status: { type: "string" },
          performance_status: { type: "string" },
          security_status: { type: "string" },
          demo_data_status: { type: "string" },
          unresolved_issues: { type: "string" },
          recommendations: { type: "string" },
          final_score: { type: "number" }
        }
      }
    });

    const review = await base44.entities.QAReview.create({
      app_build_id,
      project_id,
      title: `QA Review — ${new Date().toLocaleDateString()}`,
      ...result
    });

    await base44.entities.ActivityLog.create({
      event_type: 'qa_review_completed',
      actor: user.email,
      project_id,
      app_build_id,
      summary: `QA review completed — score: ${result.final_score}/100`,
      severity: result.final_score >= 80 ? 'Info' : result.final_score >= 60 ? 'Warning' : 'Error',
      timestamp: new Date().toISOString()
    });

    res.json({ review, result });
    return;
  } catch (error: any) {
    res.status(500).json({ error: error.message });
    return;
  }
});
