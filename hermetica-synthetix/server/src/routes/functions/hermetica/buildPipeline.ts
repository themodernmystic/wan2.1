// Ported from hermetica-forge/base44/functions/buildPipeline/entry.ts
import { registerFunction } from '../registry.js';

registerFunction('buildPipeline', async (req, res, base44) => {
  try {
    const user = await base44.auth.me();
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const body = req.body;
    const { action } = body;

    switch (action) {
      case 'generate_blueprint': {
        const { project_id } = body;
        if (!project_id) {
          res.status(400).json({ error: 'project_id required' });
          return;
        }

        const project: any = await base44.entities.Project.get(project_id);
        const reports: any = await base44.entities.ValidationReport.filter({ project_id, status: 'completed' });
        if (reports.length === 0) {
          res.status(400).json({ error: 'Project must complete validation before generating a build plan' });
          return;
        }
        const latestReport = reports[0];

        const existing: any = await base44.entities.BuildPlan.filter({ project_id });
        if (existing.length > 0 && existing[0].approval_status === 'pending') {
          res.status(409).json({ error: 'A build plan is already pending approval', build_plan_id: existing[0].id });
          return;
        }

        const llmResult: any = await base44.integrations.Core.InvokeLLM({
          prompt: `You are a senior software architect. Generate a detailed build plan and blueprint for this project:

Project: ${project.name}
Description: ${project.description || 'N/A'}
Category: ${project.category}
Target Audience: ${project.target_audience || 'N/A'}
Revenue Model: ${project.revenue_model || 'N/A'}
Problem: ${project.problem_statement || 'N/A'}
Solution: ${project.solution_summary || 'N/A'}
Tech Stack: ${project.tech_stack || 'N/A'}

Validation Summary: ${latestReport.summary || 'N/A'}

Generate a comprehensive blueprint including:
1. Recommended tech stack (frontend, backend, database, hosting)
2. Key features and components to build
3. Build phases (ordered, with estimated effort)
4. File/directory structure
5. Key architectural decisions
6. Risk areas and mitigations`,
          response_json_schema: {
            type: 'object',
            properties: {
              tech_stack: { type: 'string', description: 'Recommended technology stack' },
              key_features: { type: 'string', description: 'Key features and components' },
              build_phases: { type: 'string', description: 'Ordered build phases with effort estimates' },
              file_structure: { type: 'string', description: 'File/directory structure' },
              architecture_decisions: { type: 'string', description: 'Key architectural decisions' },
              risks: { type: 'string', description: 'Risk areas and mitigations' },
              blueprint_summary: { type: 'string', description: 'Overall blueprint summary' },
            },
          },
        });

        const plan: any = await base44.entities.BuildPlan.create({
          project_id,
          status: 'pending_approval',
          approval_status: 'pending',
          blueprint: llmResult.blueprint_summary,
          tech_stack: llmResult.tech_stack,
          build_phases: llmResult.build_phases,
          build_artifacts: JSON.stringify({
            key_features: llmResult.key_features,
            file_structure: llmResult.file_structure,
            architecture_decisions: llmResult.architecture_decisions,
            risks: llmResult.risks,
          }),
        });

        await base44.entities.AgentTaskJournal.create({
          task_summary: `Generated build blueprint for ${project.name}`,
          project_id,
          outputs: `Blueprint created with tech stack: ${llmResult.tech_stack}`,
          status: 'success',
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
        });

        await base44.entities.ActivityLog.create({
          action: `Build blueprint generated for "${project.name}"`,
          entity_type: 'BuildPlan',
          entity_id: plan.id,
          project_id,
          actor: 'system',
        });

        res.json({ success: true, build_plan_id: plan.id, blueprint: llmResult });
        return;
      }

      case 'approve_blueprint': {
        const { build_plan_id, approved } = body;
        if (!build_plan_id) {
          res.status(400).json({ error: 'build_plan_id required' });
          return;
        }

        const plan: any = await base44.entities.BuildPlan.get(build_plan_id);
        await base44.entities.BuildPlan.update(build_plan_id, {
          approval_status: approved ? 'approved' : 'rejected',
          approved_by: user.email,
          approved_at: new Date().toISOString(),
          status: approved ? 'approved' : 'failed',
        });

        await base44.entities.ActivityLog.create({
          action: `Build plan ${approved ? 'approved' : 'rejected'} by ${user.email}`,
          entity_type: 'BuildPlan',
          entity_id: build_plan_id,
          project_id: plan.project_id,
          actor: 'user',
        });

        res.json({ success: true, approved });
        return;
      }

      case 'execute_build': {
        const { build_plan_id } = body;
        if (!build_plan_id) {
          res.status(400).json({ error: 'build_plan_id required' });
          return;
        }

        const plan: any = await base44.entities.BuildPlan.get(build_plan_id);
        if (plan.approval_status !== 'approved') {
          res.status(403).json({ error: 'Build plan must be approved before execution' });
          return;
        }

        const project: any = await base44.entities.Project.get(plan.project_id);
        await base44.entities.BuildPlan.update(build_plan_id, { status: 'generating' });

        const llmResult: any = await base44.integrations.Core.InvokeLLM({
          prompt: `You are a senior full-stack developer. Generate the core code artifacts for this project:

Project: ${project.name}
Description: ${project.description || 'N/A'}
Tech Stack: ${plan.tech_stack}
Build Phases: ${plan.build_phases}
Blueprint: ${plan.blueprint}

Generate the key code files and implementation artifacts. For each artifact, provide:
1. File path
2. Complete code content
3. Purpose/description

Focus on the most critical files: main entry point, core components, API routes, database schema, and configuration.`,
          response_json_schema: {
            type: 'object',
            properties: {
              artifacts: { type: 'string', description: 'JSON array of {file_path, code, description}' },
              build_summary: { type: 'string', description: 'Summary of what was built' },
              next_steps: { type: 'string', description: 'Recommended next steps' },
            },
          },
        });

        await base44.entities.BuildPlan.update(build_plan_id, {
          status: 'built',
          build_artifacts: plan.build_artifacts + '\n---BUILD_OUTPUT---\n' + llmResult.artifacts,
        });

        await base44.entities.AgentTaskJournal.create({
          task_summary: `Build executed for ${project.name}`,
          project_id: plan.project_id,
          outputs: llmResult.build_summary,
          follow_up_actions: llmResult.next_steps,
          status: 'success',
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
        });

        await base44.entities.ActivityLog.create({
          action: `Build executed for "${project.name}"`,
          entity_type: 'BuildPlan',
          entity_id: build_plan_id,
          project_id: plan.project_id,
          actor: 'system',
        });

        res.json({ success: true, build_summary: llmResult.build_summary, next_steps: llmResult.next_steps });
        return;
      }

      case 'run_qa': {
        const { build_plan_id } = body;
        if (!build_plan_id) {
          res.status(400).json({ error: 'build_plan_id required' });
          return;
        }

        const plan: any = await base44.entities.BuildPlan.get(build_plan_id);
        if (plan.status !== 'built') {
          res.status(400).json({ error: 'Build must be completed before QA' });
          return;
        }

        const project: any = await base44.entities.Project.get(plan.project_id);
        await base44.entities.BuildPlan.update(build_plan_id, { status: 'qa_in_progress' });

        const llmResult: any = await base44.integrations.Core.InvokeLLM({
          prompt: `You are a QA engineer. Review the build artifacts for this project and run a quality check:

Project: ${project.name}
Tech Stack: ${plan.tech_stack}
Build Artifacts: ${plan.build_artifacts}

Review the code for:
1. Bugs and potential errors
2. Security vulnerabilities
3. Performance issues
4. Missing error handling
5. Code quality and maintainability

Provide a QA report with a score (0-100) and specific findings.`,
          response_json_schema: {
            type: 'object',
            properties: {
              qa_score: { type: 'number', description: 'Quality score 0-100' },
              qa_report: { type: 'string', description: 'Detailed QA report' },
              bugs_found: { type: 'string', description: 'List of bugs found' },
              security_issues: { type: 'string', description: 'Security issues found' },
              recommendations: { type: 'string', description: 'Fix recommendations' },
            },
          },
        });

        const qaPassed = llmResult.qa_score >= 70;

        await base44.entities.BuildPlan.update(build_plan_id, {
          status: qaPassed ? 'qa_passed' : 'qa_failed',
          qa_report: JSON.stringify({
            report: llmResult.qa_report,
            bugs: llmResult.bugs_found,
            security: llmResult.security_issues,
            recommendations: llmResult.recommendations,
          }),
          qa_score: llmResult.qa_score,
        });

        await base44.entities.AgentTaskJournal.create({
          task_summary: `QA check completed for ${project.name}`,
          project_id: plan.project_id,
          outputs: `QA score: ${llmResult.qa_score}/100. ${qaPassed ? 'PASSED' : 'FAILED'}`,
          errors: qaPassed ? null : llmResult.bugs_found,
          status: qaPassed ? 'success' : 'partial',
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
        });

        await base44.entities.ActivityLog.create({
          action: `QA check for "${project.name}": score ${llmResult.qa_score}/100 (${qaPassed ? 'PASSED' : 'FAILED'})`,
          entity_type: 'BuildPlan',
          entity_id: build_plan_id,
          project_id: plan.project_id,
          actor: 'system',
        });

        res.json({ success: true, qa_score: llmResult.qa_score, passed: qaPassed, report: llmResult.qa_report });
        return;
      }

      case 'approve_deployment': {
        const { build_plan_id, approved } = body;
        if (!build_plan_id) {
          res.status(400).json({ error: 'build_plan_id required' });
          return;
        }

        const plan: any = await base44.entities.BuildPlan.get(build_plan_id);
        if (plan.status !== 'qa_passed' && plan.status !== 'ready_deploy') {
          res.status(400).json({ error: 'Build must pass QA before deployment approval' });
          return;
        }

        await base44.entities.BuildPlan.update(build_plan_id, {
          deployment_status: approved ? 'approved' : 'not_started',
          deployment_approved_by: approved ? user.email : null,
          deployment_approved_at: approved ? new Date().toISOString() : null,
          status: approved ? 'ready_deploy' : plan.status,
        });

        await base44.entities.ActivityLog.create({
          action: `Deployment ${approved ? 'approved' : 'not approved'} by ${user.email}`,
          entity_type: 'BuildPlan',
          entity_id: build_plan_id,
          project_id: plan.project_id,
          actor: 'user',
        });

        res.json({ success: true, approved });
        return;
      }

      default:
        res.status(400).json({ error: `Unknown action: ${action}` });
        return;
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
    return;
  }
});
