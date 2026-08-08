// Ported from synthetix-ai/base44/functions/runQualityAudit/entry.ts
import { registerFunction } from '../registry.js';

registerFunction('runQualityAudit', async (req, res, base44) => {
  const user = await base44.auth.me();
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const { project_id, asset_id, landing_page_id, agent_build_id, audit_type = 'functional' } = req.body || {};
  if (!project_id) {
    res.status(400).json({ error: 'Missing project_id' });
    return;
  }

  const OPENAI_KEY = process.env.OPENAI_API_KEY;

  let subject: any = {};
  let subjectDescription = '';

  if (asset_id) {
    const items: any = await base44.asServiceRole.entities.GeneratedAsset.filter({ id: asset_id });
    subject = items[0] || {};
    subjectDescription = `GeneratedAsset: ${subject.name}, type: ${subject.asset_type}, status: ${subject.status}, file_url: ${subject.file_url || 'MISSING'}, preview_url: ${subject.preview_url || 'MISSING'}`;
  } else if (landing_page_id) {
    const items: any = await base44.asServiceRole.entities.LandingPage.filter({ id: landing_page_id });
    subject = items[0] || {};
    subjectDescription = `LandingPage: ${subject.title}, status: ${subject.status}, has_html: ${!!subject.generated_html}, published_url: ${subject.published_url || 'NONE'}, form_enabled: ${subject.form_enabled}`;
  } else if (agent_build_id) {
    const items: any = await base44.asServiceRole.entities.AgentBuild.filter({ id: agent_build_id });
    subject = items[0] || {};
    subjectDescription = `AgentBuild: ${subject.name}, status: ${subject.status}, has_system_prompt: ${!!subject.system_prompt}, test_results: ${subject.test_results ? 'present' : 'missing'}`;
  } else {
    const assets: any = await base44.asServiceRole.entities.GeneratedAsset.filter({ project_id });
    const pages: any = await base44.asServiceRole.entities.LandingPage.filter({ project_id });
    subjectDescription = `Project audit. Assets: ${assets.length} total. Landing pages: ${pages.length}. Assets ready: ${assets.filter((a: any) => ['ready', 'approved'].includes(a.status)).length}. Mock placeholders: ${assets.filter((a: any) => a.status === 'mock_placeholder').length}.`;
  }

  let score = 75;
  let status = 'passed';
  let findings: any = {};
  let bugsFound: any[] = [];

  if (OPENAI_KEY) {
    const auditChecklist: Record<string, string> = {
      render_quality: 'Check file_url exists and is not null, preview_url exists, format is set, dimensions are set, status is ready or approved and not mock_placeholder',
      brand_compliance: 'Check brand colours #D4AF37 gold, #0B0B0D black, #F5E8C7 parchment are referenced, brand voice is premium/mystical/warm, Hermetica Holdings branding present',
      accessibility: 'Check alt_text for images, semantic HTML, form labels present, WCAG colour contrast, ARIA attributes',
      seo: 'Check seo_title, seo_description, semantic headings, keywords, social image, meta tags',
      legal: 'Check fundraiser disclaimer present if fundraiser page, no false charity endorsement claims, proper attribution, copyright notice',
      functional: 'Check primary_cta_label and url present, form submissions stored, links functional, CTAs visible',
      security: 'Check no hardcoded API keys, form validation exists, file upload restrictions, XSS prevention measures',
      agent_safety: 'Check system_prompt has boundaries, prompt injection resistance, escalation paths, test_results show no critical failures',
      end_to_end: 'Check full fundraiser journey: landing page loads, form works, submission stored, admin approval, download delivered',
      market_ready: 'Check all: SEO complete, legal disclaimers present, mobile responsive, accessibility, no failed audits, assets approved'
    };

    try {
      const aiResp = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${OPENAI_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{
            role: 'user',
            content: `You are a QA auditor for Hermetica Holdings. Audit:\nSubject: ${subjectDescription}\nAudit Type: ${audit_type}\nChecklist: ${auditChecklist[audit_type] || 'General quality check'}\n\nReturn ONLY JSON: {"score": 0-100, "status": "passed"|"failed"|"warning", "findings": {"summary": "...", "details": []}, "bugs_found": [{"severity": "low|medium|high|critical", "description": "...", "recommended_fix": "..."}], "recommendations": []}`
          }],
          response_format: { type: 'json_object' },
          temperature: 0.2
        })
      });
      const aiData: any = await aiResp.json();
      if (aiResp.ok && aiData.choices?.[0]) {
        const parsed = JSON.parse(aiData.choices[0].message.content);
        score = parsed.score || 75;
        status = parsed.status || 'passed';
        findings = parsed.findings || {};
        bugsFound = parsed.bugs_found || [];
      }
    } catch (e: any) {
      findings = { summary: `AI audit unavailable: ${e.message}` };
      status = 'warning';
    }
  } else {
    // Manual checks without AI
    if (asset_id && subject) {
      if (!subject.file_url && !subject.preview_url) { bugsFound.push({ severity: 'high', description: 'No file_url or preview_url', recommended_fix: 'Re-run generation' }); score -= 30; }
      if (subject.status === 'mock_placeholder') { bugsFound.push({ severity: 'medium', description: 'Asset is mock placeholder', recommended_fix: 'Run actual generation' }); score -= 20; }
      if (!subject.alt_text && subject.asset_type === 'image') { bugsFound.push({ severity: 'low', description: 'Image missing alt_text', recommended_fix: 'Add descriptive alt text' }); score -= 5; }
    }
    if (landing_page_id && subject) {
      if (!subject.generated_html) { bugsFound.push({ severity: 'critical', description: 'No generated_html', recommended_fix: 'Run generateLandingPage' }); score -= 40; }
      if (subject.status === 'published' && !subject.published_url) { bugsFound.push({ severity: 'critical', description: 'Status published but no URL', recommended_fix: 'Run publishLandingPage' }); score -= 40; }
    }
    score = Math.max(0, score);
    status = bugsFound.some((b) => b.severity === 'critical') ? 'failed' : bugsFound.some((b) => b.severity === 'high') ? 'warning' : 'passed';
    findings = { summary: `Manual checklist audit. Found ${bugsFound.length} issue(s). Configure OPENAI_API_KEY for AI-powered audits.` };
  }

  const auditName = `${audit_type.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())} Audit — ${new Date().toLocaleDateString('en-AU')}`;

  const auditRecord = await base44.asServiceRole.entities.QualityAudit.create({
    name: auditName,
    project_id,
    asset_id: asset_id || '',
    landing_page_id: landing_page_id || '',
    agent_build_id: agent_build_id || '',
    audit_type,
    status,
    score: Math.round(score),
    findings: JSON.stringify(findings),
    bugs_found: JSON.stringify(bugsFound),
    auditor_notes: OPENAI_KEY ? 'AI-powered audit via GPT-4o-mini' : 'Manual checklist audit (OPENAI_API_KEY not configured)'
  });

  res.json({
    success: true,
    audit_id: auditRecord.id,
    audit_type,
    status,
    score: Math.round(score),
    bugs_found: bugsFound,
    findings,
    subject_description: subjectDescription
  });
  return;
});
