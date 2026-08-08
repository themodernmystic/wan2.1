// Ported from synthetix-ai/base44/functions/generateVideo/entry.ts
import { registerFunction } from '../registry.js';

registerFunction('generateVideo', async (req, res, base44) => {
  const user = await base44.auth.me();
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const body = req.body || {};
  const { project_id, video_name, prompt, duration = 6, aspect_ratio = '16:9', style, provider = 'base44', model } = body;

  if (!video_name || !prompt) {
    res.status(400).json({ error: 'Missing required fields: video_name, prompt' });
    return;
  }

  const job = await base44.asServiceRole.entities.RenderJob.create({
    job_name: `Video: ${video_name}`,
    job_type: 'video_generation',
    status: 'queued',
    project_id,
    provider,
    model: model || 'veo-3',
    normalized_prompt: prompt,
    request_payload: JSON.stringify({ project_id, video_name, prompt, duration, aspect_ratio, style, provider }),
    started_at: new Date().toISOString(),
    progress_percent: 0,
    retry_count: 0,
    max_retries: 3
  });

  // Only base44 built-in video generation is supported
  if (provider !== 'base44') {
    await base44.asServiceRole.entities.RenderJob.update(job.id, {
      status: 'failed',
      error_message: `Provider "${provider}" is not yet configured. Only "base44" (Veo) is currently supported.`,
      debug_notes: 'Runway, Luma, and Pika integrations require API keys and are not yet configured. Set RUNWAY_API_KEY, LUMA_API_KEY, or PIKA_API_KEY in environment variables.',
      completed_at: new Date().toISOString()
    });
    res.status(422).json({
      success: false,
      render_job_id: job.id,
      error: `Provider "${provider}" is not configured.`,
      configured_providers: ['base44'],
      missing_providers: { runway: 'RUNWAY_API_KEY', luma: 'LUMA_API_KEY', pika: 'PIKA_API_KEY' },
      retry_possible: true
    });
    return;
  }

  await base44.asServiceRole.entities.RenderJob.update(job.id, { status: 'processing', progress_percent: 20 });

  const t0 = Date.now();
  let videoUrl: string | null = null;
  try {
    // TODO(port): base44Compat.ts's integrations.Core only implements InvokeLLM,
    // GenerateImage, UploadFile, ExtractDataFromUploadedFile, and SendEmail — there
    // is no GenerateVideo (Veo) equivalent yet. The call below is kept verbatim from
    // the source and cast through `any` so the file typechecks, but it will throw
    // "GenerateVideo is not a function" at runtime until a video-generation
    // integration is added to server/src/integrations/ and wired into base44Compat.ts.
    const result: any = await (base44.asServiceRole.integrations.Core as any).GenerateVideo({
      prompt: style ? `${prompt}. Visual style: ${style}` : prompt,
      duration: [4, 6, 8].includes(duration) ? duration : 6,
      aspect_ratio: aspect_ratio === '9:16' ? '9:16' : '16:9'
    });
    videoUrl = result?.url || null;
  } catch (e: any) {
    await base44.asServiceRole.entities.RenderJob.update(job.id, {
      status: 'failed',
      error_message: `Video generation failed: ${e.message}`,
      completed_at: new Date().toISOString(),
      duration_ms: Date.now() - t0
    });
    res.status(500).json({ success: false, render_job_id: job.id, error: e.message });
    return;
  }

  const duration_ms = Date.now() - t0;

  if (!videoUrl) {
    await base44.asServiceRole.entities.RenderJob.update(job.id, { status: 'failed', error_message: 'No video URL returned from provider.', completed_at: new Date().toISOString() });
    res.status(422).json({ success: false, render_job_id: job.id, error: 'No video URL returned.' });
    return;
  }

  const asset = await base44.asServiceRole.entities.GeneratedAsset.create({
    name: video_name,
    asset_type: 'video',
    status: 'ready',
    project_id,
    prompt,
    provider,
    model: model || 'veo-3',
    file_url: videoUrl,
    preview_url: videoUrl,
    format: 'MP4',
    duration_seconds: duration,
    render_metadata: JSON.stringify({ aspect_ratio, style, duration })
  });

  await base44.asServiceRole.entities.RenderJob.update(job.id, {
    status: 'completed',
    generated_asset_id: asset.id,
    response_payload: JSON.stringify({ video_url: videoUrl }),
    completed_at: new Date().toISOString(),
    duration_ms,
    progress_percent: 100
  });

  res.json({
    success: true,
    render_job_id: job.id,
    asset_id: asset.id,
    video_url: videoUrl,
    duration_ms
  });
});
