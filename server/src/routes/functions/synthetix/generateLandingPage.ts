// Ported from synthetix-ai/base44/functions/generateLandingPage/entry.ts
import { registerFunction } from '../registry.js';

registerFunction('generateLandingPage', async (req, res, base44) => {
  const user = await base44.auth.me();
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const body = req.body || {};
  const { project_id, title, slug, page_type = 'custom', offer, audience, brand_voice, sections = [], hero_headline, hero_subheadline, primary_cta_label, primary_cta_url, secondary_cta_label, secondary_cta_url, seo_title, seo_description, form_enabled = false, download_asset_id, include_disclaimer = false } = body;

  if (!title || !slug) {
    res.status(400).json({ error: 'Missing required fields: title, slug' });
    return;
  }

  const OPENAI_KEY = process.env.OPENAI_API_KEY;
  const requestPayload = { project_id, title, slug, page_type, offer, audience };

  const job = await base44.asServiceRole.entities.RenderJob.create({
    job_name: `Landing Page: ${title}`,
    job_type: 'landing_page_generation',
    status: 'queued',
    project_id,
    provider: 'openai',
    model: 'gpt-4o',
    normalized_prompt: `Generate landing page: ${title}`,
    request_payload: JSON.stringify(requestPayload),
    started_at: new Date().toISOString(),
    progress_percent: 0
  });

  if (!OPENAI_KEY) {
    await base44.asServiceRole.entities.RenderJob.update(job.id, {
      status: 'failed',
      error_message: 'OPENAI_API_KEY not configured.',
      completed_at: new Date().toISOString()
    });
    res.status(422).json({
      success: false, render_job_id: job.id,
      error: 'OPENAI_API_KEY not configured.',
      missing_provider_key: 'OPENAI_API_KEY',
      retry_possible: true
    });
    return;
  }

  await base44.asServiceRole.entities.RenderJob.update(job.id, { status: 'processing', progress_percent: 20 });

  const isFundraiser = page_type === 'fundraiser';
  const disclaimer = `This fundraiser is independently organised by James Hatcher / Hermetica Holdings and is not officially affiliated with, endorsed by, or sponsored by OzHarvest or Foodbank Australia unless otherwise stated. Donations should be made directly to the charity.`;

  const systemPrompt = `You are a world-class landing page developer for Hermetica Holdings. Create fully responsive, semantic, accessible, production-ready HTML pages with inline styles. Brand colours: #0B0B0D background, #D4AF37 gold, #F5E8C7 parchment. Return ONLY valid JSON: { "html": "...", "css": "...", "js": "..." }. The HTML must include semantic sections, mobile layout, SEO meta, CTA buttons, accessible labels. No external CSS frameworks. Use Google Fonts via CDN link in HTML head.`;

  const userPrompt = `Create a complete ${page_type} landing page:
Title: ${title}
Offer: ${offer || 'Premium content'}
Audience: ${audience || 'General'}
Brand Voice: ${brand_voice || 'Premium, warm, direct, mystical but grounded'}
Hero Headline: ${hero_headline || title}
Hero Subheadline: ${hero_subheadline || ''}
Primary CTA: ${primary_cta_label || 'Get Started'} → ${primary_cta_url || '#claim'}
${secondary_cta_label ? `Secondary CTA: ${secondary_cta_label} → ${secondary_cta_url || '#'}` : ''}
Sections: ${sections.length ? sections.join(', ') : 'hero, features, how-it-works, testimonials, final-cta'}
${isFundraiser ? `
FUNDRAISER PAGE REQUIREMENTS:
- Include donate button to OzHarvest: https://www.ozharvest.org
- Include donate button to Foodbank Australia: https://www.foodbank.org.au
- Include a claim form with fields: Full Name, Email, Charity Donated To, Donation Amount (AUD), Upload Screenshot (file input), Consent Checkbox
- Form action: #claim (submit handled by JS)
- REQUIRED DISCLAIMER (verbatim): "${disclaimer}"
- Do not display charity logos
` : ''}
${form_enabled && !isFundraiser ? 'Include lead capture form: name, email, message' : ''}
SEO Title: ${seo_title || title}
SEO Description: ${seo_description || offer || ''}
Return ONLY JSON: { "html": "...", "css": "...", "js": "..." }`;

  const t0 = Date.now();
  let aiResp: any, aiData: any;
  try {
    aiResp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${OPENAI_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
        response_format: { type: 'json_object' },
        temperature: 0.7,
        max_tokens: 4096
      })
    });
    aiData = await aiResp.json();
  } catch (e: any) {
    await base44.asServiceRole.entities.RenderJob.update(job.id, { status: 'failed', error_message: e.message });
    res.status(500).json({ success: false, render_job_id: job.id, error: e.message });
    return;
  }

  const duration = Date.now() - t0;

  if (!aiResp.ok || aiData.error) {
    const errMsg = aiData.error?.message || `OpenAI error: ${aiResp.status}`;
    await base44.asServiceRole.entities.RenderJob.update(job.id, { status: 'failed', error_message: errMsg, completed_at: new Date().toISOString() });
    res.status(422).json({ success: false, render_job_id: job.id, error: errMsg });
    return;
  }

  let pageData: any;
  try { pageData = JSON.parse(aiData.choices[0].message.content); } catch (e) { pageData = { html: aiData.choices[0].message.content, css: '', js: '' }; }

  const landingPage = await base44.asServiceRole.entities.LandingPage.create({
    title,
    slug,
    project_id,
    status: 'preview_ready',
    page_type,
    hero_headline: hero_headline || title,
    hero_subheadline: hero_subheadline || '',
    primary_cta_label: primary_cta_label || 'Get Started',
    primary_cta_url: primary_cta_url || '#claim',
    secondary_cta_label: secondary_cta_label || '',
    secondary_cta_url: secondary_cta_url || '',
    seo_title: seo_title || title,
    seo_description: seo_description || offer || '',
    generated_html: pageData.html || '',
    generated_css: pageData.css || '',
    generated_js: pageData.js || '',
    form_enabled: isFundraiser ? true : form_enabled,
    download_asset_id: download_asset_id || '',
    analytics_enabled: false
  });

  const asset = await base44.asServiceRole.entities.GeneratedAsset.create({
    name: `Landing Page: ${title}`,
    asset_type: 'landing_page',
    status: 'ready',
    project_id,
    prompt: userPrompt.substring(0, 500),
    provider: 'openai',
    model: 'gpt-4o',
    render_metadata: JSON.stringify({ landing_page_id: landingPage.id })
  });

  await base44.asServiceRole.entities.RenderJob.update(job.id, {
    status: 'completed',
    generated_asset_id: asset.id,
    response_payload: JSON.stringify({ landing_page_id: landingPage.id }),
    completed_at: new Date().toISOString(),
    duration_ms: duration,
    progress_percent: 100
  });

  res.json({
    success: true,
    render_job_id: job.id,
    landing_page_id: landingPage.id,
    asset_id: asset.id,
    status: 'preview_ready',
    has_html: !!(pageData.html),
    duration_ms: duration
  });
});
