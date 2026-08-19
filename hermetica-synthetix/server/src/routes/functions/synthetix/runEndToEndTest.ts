// Ported from synthetix-ai/base44/functions/runEndToEndTest/entry.ts
import { registerFunction } from '../registry.js';

registerFunction('runEndToEndTest', async (req, res, base44) => {
  const user = await base44.auth.me();
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const { project_id, landing_page_id } = req.body || {};
  if (!project_id) {
    res.status(400).json({ error: 'Missing project_id' });
    return;
  }

  const checks: any[] = [];
  let pass = 0;
  let fail = 0;

  const check = (name: string, passed: boolean, notes: any) => {
    checks.push({ name, passed, notes });
    if (passed) pass++; else fail++;
  };

  // 1. Assets exist
  const assets: any = await base44.asServiceRole.entities.GeneratedAsset.filter({ project_id });
  check('Assets Created', assets.length > 0, `${assets.length} asset(s) found`);

  const fakeAssets = assets.filter((a: any) => a.status === 'mock_placeholder');
  check('No Mock Assets', fakeAssets.length === 0, fakeAssets.length > 0 ? `${fakeAssets.length} mock placeholder(s) found: ${fakeAssets.map((a: any) => a.name).join(', ')}` : 'All assets are real');

  const readyAssets = assets.filter((a: any) => ['ready', 'approved'].includes(a.status));
  check('Assets Ready', readyAssets.length > 0, `${readyAssets.length}/${assets.length} assets ready`);

  // 2. Landing Page
  const pages: any = await base44.asServiceRole.entities.LandingPage.filter({ project_id });
  check('Landing Page Exists', pages.length > 0, `${pages.length} landing page(s)`);

  if (pages.length > 0) {
    const targetPage = landing_page_id ? pages.find((p: any) => p.id === landing_page_id) : pages[0];
    if (targetPage) {
      check('Landing Page Has HTML', !!targetPage.generated_html, targetPage.generated_html ? 'HTML present' : 'NO HTML — run generateLandingPage');
      check('Landing Page Has CTA', !!targetPage.primary_cta_label, targetPage.primary_cta_label || 'No CTA defined');
      check('Landing Page Has SEO', !!(targetPage.seo_title && targetPage.seo_description), `Title: ${!!targetPage.seo_title}, Desc: ${!!targetPage.seo_description}`);

      if (targetPage.page_type === 'fundraiser') {
        check('Fundraiser Has Form', targetPage.form_enabled, targetPage.form_enabled ? 'Form enabled' : 'Form not enabled — required for fundraiser');
        const disclaimer = targetPage.generated_html?.includes('not officially affiliated') || targetPage.generated_html?.includes('Hermetica Holdings');
        check('Fundraiser Has Disclaimer', !!disclaimer, disclaimer ? 'Disclaimer found in HTML' : 'MISSING DISCLAIMER — legally required');
      }
    }
  }

  // 3. RenderJobs
  const jobs: any = await base44.asServiceRole.entities.RenderJob.filter({ project_id });
  const failedJobs = jobs.filter((j: any) => j.status === 'failed');
  check('No Critical Failed Jobs', failedJobs.length === 0, failedJobs.length > 0 ? `${failedJobs.length} failed job(s): ${failedJobs.map((j: any) => j.job_name).join(', ')}` : 'All jobs passed');

  // 4. Agents
  const agents: any = await base44.asServiceRole.entities.AgentBuild.filter({ project_id });
  if (agents.length > 0) {
    const badAgents = agents.filter((a: any) => !['ready', 'deployed'].includes(a.status));
    check('Agents Ready', badAgents.length === 0, badAgents.length > 0 ? `${badAgents.length} agent(s) not ready` : 'All agents ready');
    const agentsWithTests = agents.filter((a: any) => a.test_results);
    check('Agents Tested', agentsWithTests.length === agents.length, `${agentsWithTests.length}/${agents.length} agents have test results`);
  }

  // 5. Form Submissions flow
  const submissions: any = await base44.asServiceRole.entities.FormSubmission.filter({ project_id });
  if (submissions.length > 0) {
    const pendingFulfil = submissions.filter((s: any) => s.status === 'approved' && !s.download_sent);
    check('Download Fulfilment', pendingFulfil.length === 0, pendingFulfil.length > 0 ? `${pendingFulfil.length} approved submission(s) not yet fulfilled` : 'All approved submissions fulfilled');
  }

  // 6. Audits
  const audits: any = await base44.asServiceRole.entities.QualityAudit.filter({ project_id });
  check('QA Audits Run', audits.length > 0, `${audits.length} audit(s) run`);
  const criticalFails = audits.filter((a: any) => a.status === 'failed');
  check('No Critical Audit Failures', criticalFails.length === 0, criticalFails.length > 0 ? `${criticalFails.length} critical audit failure(s)` : 'All audits passed');

  const overallPassed = fail === 0;
  const overallStatus = fail === 0 ? 'passed' : pass > fail ? 'passed_with_warnings' : 'failed';

  // Create audit record
  const audit = await base44.asServiceRole.entities.QualityAudit.create({
    name: `End-to-End Test — ${new Date().toLocaleDateString('en-AU')}`,
    project_id,
    audit_type: 'end_to_end',
    status: overallPassed ? 'passed' : criticalFails.length > 0 ? 'failed' : 'warning',
    score: Math.round((pass / (pass + fail)) * 100),
    findings: JSON.stringify({ summary: `${pass} passed, ${fail} failed`, checks }),
    bugs_found: JSON.stringify(checks.filter((c) => !c.passed).map((c) => ({ severity: 'medium', description: c.name + ': ' + c.notes })))
  });

  res.json({
    success: true,
    audit_id: audit.id,
    overall_status: overallStatus,
    passed: pass,
    failed: fail,
    total_checks: pass + fail,
    checks,
    score: Math.round((pass / (pass + fail)) * 100),
    summary: overallPassed
      ? `All ${pass} end-to-end checks passed.`
      : `${fail}/${pass + fail} checks failed. Review failed items and fix before launch.`
  });
  return;
});
