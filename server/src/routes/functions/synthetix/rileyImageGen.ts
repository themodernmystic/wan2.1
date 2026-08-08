// Ported from synthetix-ai/base44/functions/rileyImageGen/entry.ts
import { registerFunction } from '../registry.js';

/**
 * rileyImageGen — Smart image generation routing between fal.ai Flux tiers and DALL-E.
 * Input: { prompt, asset_name, quality, style, dimensions, project_id, provider_override }
 */

const FAL_MODELS: Record<string, { endpoint: string; cost: number }> = {
  draft:     { endpoint: 'fal-ai/flux/schnell', cost: 0.003 },
  good:      { endpoint: 'fal-ai/flux/dev',     cost: 0.005 },
  excellent: { endpoint: 'fal-ai/flux-pro',     cost: 0.05  },
};

const DIMENSIONS: { fal: Record<string, { width: number; height: number }>; dalle: Record<string, string> } = {
  fal: {
    square:    { width: 1024, height: 1024 },
    landscape: { width: 1344, height: 768 },
    portrait:  { width: 768,  height: 1344 },
  },
  dalle: {
    square:    '1024x1024',
    landscape: '1792x1024',
    portrait:  '1024x1792',
  },
};

async function logCredit(base44: any, data: any) {
  try {
    await base44.asServiceRole.entities.CreditLedger.create({
      ...data,
      credit_type: 'external_api',
      timestamp: new Date().toISOString(),
    });
  } catch (_) {}
}

registerFunction('rileyImageGen', async (req, res, base44) => {
  try {
    const user = await base44.auth.me();
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const {
      prompt,
      asset_name,
      quality = 'good',
      style,
      dimensions = 'square',
      project_id,
      provider_override,
    } = req.body || {};

    if (!prompt) {
      res.status(400).json({ error: 'prompt is required' });
      return;
    }

    const falKey = process.env.FAL_API_KEY || process.env.FAL_KEY || '';
    const openaiKey = process.env.OPENAI_API_KEY || '';

    const fullPrompt = style ? `${prompt}. Style: ${style}` : prompt;
    let imageUrl: string | undefined | null = null;
    let providerUsed: string | null = null;
    let modelUsed: string | null = null;
    let cost = 0;

    // Route: premium → DALL-E, others → fal.ai
    const useDalle = provider_override === 'dalle' || quality === 'premium';
    const useFal = provider_override === 'fal' || !useDalle;

    if (useFal && falKey) {
      const route = FAL_MODELS[quality] || FAL_MODELS.good;
      const imgSize = DIMENSIONS.fal[dimensions] || DIMENSIONS.fal.square;

      const r = await fetch(`https://fal.run/${route.endpoint}`, {
        method: 'POST',
        headers: { 'Authorization': `Key ${falKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: fullPrompt, image_size: imgSize }),
        signal: AbortSignal.timeout(60000),
      });
      const data: any = await r.json();
      if (!r.ok || data.error) throw new Error(data.error || `fal.ai error: ${r.status}`);
      imageUrl = data.images?.[0]?.url;
      providerUsed = 'fal';
      modelUsed = route.endpoint;
      cost = route.cost;
    } else if (useDalle && openaiKey) {
      const imgSize = DIMENSIONS.dalle[dimensions] || DIMENSIONS.dalle.square;
      const r = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${openaiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'dall-e-3', prompt: fullPrompt, size: imgSize, n: 1 }),
        signal: AbortSignal.timeout(60000),
      });
      const data: any = await r.json();
      if (data.error) throw new Error(data.error.message);
      imageUrl = data.data?.[0]?.url;
      providerUsed = 'openai';
      modelUsed = 'dall-e-3';
      cost = 0.04;
    } else {
      res.status(400).json({ error: 'No valid API key available. Set FAL_API_KEY or OPENAI_API_KEY.' });
      return;
    }

    if (!imageUrl) throw new Error('No image URL returned from provider');

    // Create GeneratedAsset record
    const asset: any = await base44.asServiceRole.entities.GeneratedAsset.create({
      title: asset_name || `Generated Image — ${new Date().toISOString().split('T')[0]}`,
      asset_type: 'image',
      file_url: imageUrl,
      prompt,
      provider: providerUsed,
      model: modelUsed,
      project_id: project_id || '',
      status: 'complete',
      notes: `Quality: ${quality}, Dimensions: ${dimensions}, Style: ${style || 'none'}`,
    }).catch(() => ({ id: null }));

    // Create RenderJob record
    const renderJob: any = await base44.asServiceRole.entities.RenderJob.create({
      title: asset_name || 'Image Generation',
      status: 'complete',
      asset_id: asset?.id || '',
      provider: providerUsed,
      model: modelUsed,
      duration_ms: 0,
      project_id: project_id || '',
    }).catch(() => ({ id: null }));

    await logCredit(base44, {
      function_name: 'rileyImageGen',
      provider: providerUsed,
      model: modelUsed,
      estimated_cost: cost,
      notes: `Image gen — quality: ${quality}, dimensions: ${dimensions}`,
    });

    res.json({
      asset_id: asset?.id || null,
      render_job_id: renderJob?.id || null,
      image_url: imageUrl,
      provider_used: providerUsed,
      model_used: modelUsed,
      cost,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
