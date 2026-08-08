// Ported from synthetix-ai/base44/functions/generateImage/entry.ts
import { registerFunction } from '../registry.js';

registerFunction('generateImage', async (req, res, base44) => {
  const user = await base44.auth.me();
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const body = req.body || {};
  const { project_id, asset_name, prompt, negative_prompt, provider = 'openai', model = 'dall-e-3', dimensions = '1024x1024', style, variation_count = 1 } = body;

  if (!prompt || !asset_name) {
    res.status(400).json({ error: 'Missing required fields: prompt, asset_name' });
    return;
  }

  const startedAt = new Date().toISOString();
  const requestPayload = { project_id, asset_name, prompt, negative_prompt, provider, model, dimensions, style, variation_count };

  const job = await base44.asServiceRole.entities.RenderJob.create({
    job_name: `Image: ${asset_name}`,
    job_type: 'image_generation',
    status: 'queued',
    project_id,
    provider,
    model,
    normalized_prompt: prompt,
    request_payload: JSON.stringify(requestPayload),
    retry_count: 0,
    max_retries: 3,
    started_at: startedAt,
    progress_percent: 0
  });

  const OPENAI_KEY = process.env.OPENAI_API_KEY;

  if (provider === 'openai' && !OPENAI_KEY) {
    await base44.asServiceRole.entities.RenderJob.update(job.id, {
      status: 'failed',
      error_message: 'OPENAI_API_KEY is not configured.',
      debug_notes: 'Add OPENAI_API_KEY to Base44 dashboard → Settings → Environment Variables.',
      completed_at: new Date().toISOString(),
      progress_percent: 0
    });
    res.status(422).json({
      success: false,
      render_job_id: job.id,
      status: 'failed',
      error: 'OPENAI_API_KEY is not configured.',
      missing_provider_key: 'OPENAI_API_KEY',
      configuration_required: 'Add OPENAI_API_KEY to Base44 dashboard → Settings → Environment Variables',
      provider_used: 'openai',
      retry_possible: true
    });
    return;
  }

  await base44.asServiceRole.entities.RenderJob.update(job.id, { status: 'processing', progress_percent: 10 });

  const size = dimensions || '1024x1024';
  const apiBody = {
    model: model || 'dall-e-3',
    prompt: style ? `${prompt}. Style: ${style}` : prompt,
    n: Math.min(Number(variation_count) || 1, model === 'dall-e-3' ? 1 : 10),
    size,
    response_format: 'url'
  };

  const t0 = Date.now();
  let aiResponse: any, aiData: any;
  try {
    aiResponse = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${OPENAI_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(apiBody)
    });
    aiData = await aiResponse.json();
  } catch (fetchErr: any) {
    await base44.asServiceRole.entities.RenderJob.update(job.id, {
      status: 'failed',
      error_message: `Network error: ${fetchErr.message}`,
      completed_at: new Date().toISOString()
    });
    res.status(500).json({ success: false, render_job_id: job.id, error: fetchErr.message });
    return;
  }

  const duration = Date.now() - t0;

  if (!aiResponse.ok || aiData.error) {
    const errMsg = aiData.error?.message || `OpenAI API error: ${aiResponse.status}`;
    await base44.asServiceRole.entities.RenderJob.update(job.id, {
      status: 'failed',
      error_message: errMsg,
      response_payload: JSON.stringify(aiData),
      completed_at: new Date().toISOString(),
      duration_ms: duration
    });
    res.status(422).json({ success: false, render_job_id: job.id, error: errMsg, retry_possible: true });
    return;
  }

  const assets: any[] = [];
  for (const img of aiData.data) {
    const asset = await base44.asServiceRole.entities.GeneratedAsset.create({
      name: asset_name + (aiData.data.length > 1 ? ` v${assets.length + 1}` : ''),
      asset_type: 'image',
      status: 'ready',
      project_id,
      prompt,
      negative_prompt,
      provider,
      model,
      file_url: img.url,
      preview_url: img.url,
      dimensions: size,
      format: 'PNG',
      brand_applied: false,
      version: 1,
      render_metadata: JSON.stringify({ revised_prompt: img.revised_prompt, openai_model: model })
    });
    assets.push(asset);
  }

  const firstAsset = assets[0];
  await base44.asServiceRole.entities.RenderJob.update(job.id, {
    status: 'completed',
    generated_asset_id: firstAsset.id,
    response_payload: JSON.stringify(aiData),
    completed_at: new Date().toISOString(),
    duration_ms: duration,
    progress_percent: 100
  });

  res.json({
    success: true,
    render_job_id: job.id,
    asset_ids: assets.map(a => a.id),
    file_urls: assets.map(a => a.file_url),
    assets,
    provider_used: provider,
    model_used: model,
    duration_ms: duration
  });
});
