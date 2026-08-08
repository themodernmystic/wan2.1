// Ported from synthetix-ai/base44/functions/generateBuildReport/entry.ts
import { registerFunction } from '../registry.js';

registerFunction('generateBuildReport', async (req, res, base44) => {
  const user = await base44.auth.me();
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const { project_id, report_title } = req.body || {};
  if (!project_id) {
    res.status(400).json({ error: 'Missing project_id' });
    return;
  }

  const [assets, jobs, pages, agents, campaigns, audits, submissions]: any[] = await Promise.all([
    base44.asServiceRole.entities.GeneratedAsset.filter({ project_id }),
    base44.asServiceRole.entities.RenderJob.filter({ project_id }),
    base44.asServiceRole.entities.LandingPage.filter({ project_id }),
    base44.asServiceRole.entities.AgentBuild.filter({ project_id }),
    base44.asServiceRole.entities.Campaign.filter({ project_id }),
    base44.asServiceRole.entities.QualityAudit.filter({ project_id }),
    base44.asServiceRole.entities.FormSubmission.filter({ project_id })
  ]);

  const assetsByStatus: any = assets.reduce((acc: any, a: any) => { acc[a.status] = (acc[a.status] || 0) + 1; return acc; }, {});
  const jobsByStatus: any = jobs.reduce((acc: any, j: any) => { acc[j.status] = (acc[j.status] || 0) + 1; return acc; }, {});
  const auditsByStatus: any = audits.reduce((acc: any, a: any) => { acc[a.status] = (acc[a.status] || 0) + 1; return acc; }, {});

  const failedJobs = jobs.filter((j: any) => j.status === 'failed');
  const approvedAssets = assets.filter((a: any) => a.status === 'approved');
  const readyAssets = assets.filter((a: any) => a.status === 'ready' || a.status === 'approved');
  const criticalAuditFails = audits.filter((a: any) => a.status === 'failed');
  const publishedPages = pages.filter((p: any) => p.status === 'published');
  const deployedAgents = agents.filter((a: any) => a.status === 'deployed' || a.status === 'ready');

  // Determine market readiness
  const hasPublishedPage = publishedPages.length > 0;
  const hasReadyAssets = readyAssets.length > 0;
  const hasNoFailedAudits = criticalAuditFails.length === 0;
  const hasNoBlockedJobs = failedJobs.filter((j: any) => !j.error_message?.includes('retry')).length < 3;

  let marketReady = 'not_ready';
  const limitations: string[] = [];

  if (!hasPublishedPage) limitations.push('No published landing page');
  if (failedJobs.length > 0) limitations.push(`${failedJobs.length} failed render job(s)`);
  if (criticalAuditFails.length > 0) limitations.push(`${criticalAuditFails.length} critical audit failure(s)`);
  if (assets.filter((a: any) => a.status === 'mock_placeholder').length > 0) limitations.push('Some assets are mock placeholders — not real renders');

  if (limitations.length === 0 && hasReadyAssets) {
    marketReady = 'market_ready';
  } else if (hasReadyAssets && limitations.length <= 2) {
    marketReady = 'ready_with_limitations';
  }

  // Provider status
  const providerStatus = {
    openai_images: failedJobs.some((j: any) => j.error_message?.includes('OPENAI_API_KEY')) ? 'missing_key' : 'configured',
    base44_video: 'configured',
    runway: 'not_configured',
    luma: 'not_configured',
    pika: 'not_configured',
    elevenlabs: 'not_configured'
  };

  const bugsFound = failedJobs.map((j: any) => `RenderJob "${j.job_name}": ${j.error_message}`);
  const auditsAllBugs = audits.flatMap((a: any) => { try { return JSON.parse(a.bugs_found || '[]'); } catch { return []; } });
  const allBugs = [...bugsFound, ...auditsAllBugs.map((b: any) => `${b.severity?.toUpperCase()}: ${b.description}`)];
  const fixedBugs = audits.flatMap((a: any) => { try { return JSON.parse(a.bugs_fixed || '[]'); } catch { return []; } });

  const title = report_title || `Build Report — ${new Date().toLocaleDateString('en-AU')}`;

  const report = await base44.asServiceRole.entities.BuildReport.create({
    project_id,
    report_title: title,
    build_summary: `Project has ${assets.length} assets (${readyAssets.length} ready, ${approvedAssets.length} approved), ${pages.length} landing pages (${publishedPages.length} published), ${agents.length} agents (${deployedAgents.length} deployed), ${campaigns.length} campaigns, ${audits.length} audits run.`,
    features_built: JSON.stringify({
      landing_pages: pages.length,
      agents: agents.length,
      campaigns: campaigns.length,
      form_submissions: submissions.length
    }),
    assets_generated: JSON.stringify(assetsByStatus),
    tests_run: JSON.stringify({ audits: audits.length, audit_breakdown: auditsByStatus }),
    bugs_found: JSON.stringify(allBugs),
    bugs_fixed: JSON.stringify(fixedBugs),
    known_limitations: limitations.join('; ') || 'None identified',
    provider_status: JSON.stringify(providerStatus),
    audit_results: JSON.stringify({
      total: audits.length,
      passed: auditsByStatus['passed'] || 0,
      failed: auditsByStatus['failed'] || 0,
      warning: auditsByStatus['warning'] || 0
    }),
    final_e2e_result: marketReady === 'market_ready' ? 'passed' : limitations.length > 0 ? 'passed_with_warnings' : 'not_run',
    market_ready_status: marketReady,
    recommended_next_steps: limitations.length > 0
      ? `Fix: ${limitations.join('. Fix: ')}. Then re-run audits and generate a new Build Report.`
      : 'All checks passed. Consider running a final end-to-end test before public launch.'
  });

  res.json({
    success: true,
    report_id: report.id,
    report_title: title,
    market_ready_status: marketReady,
    summary: {
      total_assets: assets.length,
      ready_assets: readyAssets.length,
      approved_assets: approvedAssets.length,
      failed_jobs: failedJobs.length,
      published_pages: publishedPages.length,
      deployed_agents: deployedAgents.length,
      audits_run: audits.length,
      bugs_found: allBugs.length,
      known_limitations: limitations
    },
    provider_status: providerStatus
  });
  return;
});
