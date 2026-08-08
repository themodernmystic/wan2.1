// Ported from synthetix-ai/base44/functions/generateCampaignKit/entry.ts
import { registerFunction } from '../registry.js';

registerFunction('generateCampaignKit', async (req, res, base44) => {
  const user = await base44.auth.me();
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const { project_id, campaign_name, campaign_goal, offer, audience, tone, platforms = ['facebook', 'instagram', 'email'], cta, launch_date } = req.body || {};

  if (!campaign_name || !campaign_goal) {
    res.status(400).json({ error: 'Missing required fields: campaign_name, campaign_goal' });
    return;
  }

  const OPENAI_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_KEY) {
    res.status(422).json({ success: false, error: 'OPENAI_API_KEY not configured.', missing_provider_key: 'OPENAI_API_KEY' });
    return;
  }

  const job = await base44.asServiceRole.entities.RenderJob.create({
    job_name: `Campaign Kit: ${campaign_name}`,
    job_type: 'campaign_generation',
    status: 'processing',
    project_id,
    provider: 'openai',
    model: 'gpt-4o',
    started_at: new Date().toISOString(),
    progress_percent: 10
  });

  const kitPrompt = `You are a world-class campaign strategist for Hermetica Holdings. Brand: premium, direct, warm, mystical but grounded, ethical, Australian.

Generate a complete campaign kit:
Campaign: ${campaign_name}
Goal: ${campaign_goal}
Offer: ${offer || campaign_goal}
Audience: ${audience || 'General audience'}
Tone: ${tone || 'Premium, warm, direct'}
Platforms: ${platforms.join(', ')}
CTA: ${cta || 'Learn More'}
Launch: ${launch_date || 'Immediate'}

Return JSON:
{
  "facebook_post": "...",
  "instagram_caption": "...",
  "instagram_story_copy": "...",
  "email_subject": "...",
  "email_body": "...",
  "landing_page_copy": {"headline": "...", "subheadline": "...", "body": "..."},
  "press_release": "...",
  "ad_copy_short": "...",
  "ad_copy_long": "...",
  "image_generation_prompts": ["...","...","..."],
  "short_video_script": "...",
  "cta_variations": ["...","...","..."],
  "hashtags": ["...","..."],
  "campaign_summary": "..."
}`;

  const t0 = Date.now();
  let aiResp: any, aiData: any;
  try {
    aiResp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${OPENAI_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: kitPrompt }],
        response_format: { type: 'json_object' },
        temperature: 0.75
      })
    });
    aiData = await aiResp.json();
  } catch (e: any) {
    await base44.asServiceRole.entities.RenderJob.update(job.id, { status: 'failed', error_message: e.message });
    res.status(500).json({ success: false, error: e.message });
    return;
  }

  const duration = Date.now() - t0;

  if (!aiResp.ok || aiData.error) {
    const errMsg = aiData.error?.message || 'OpenAI API error';
    await base44.asServiceRole.entities.RenderJob.update(job.id, { status: 'failed', error_message: errMsg });
    res.status(422).json({ success: false, error: errMsg });
    return;
  }

  let kit: any;
  try { kit = JSON.parse(aiData.choices[0].message.content); } catch (e) { kit = {}; }

  const campaign = await base44.asServiceRole.entities.Campaign.create({
    name: campaign_name,
    project_id,
    status: 'active',
    campaign_type: 'launch',
    core_message: campaign_goal,
    audience,
    channels: platforms,
    start_date: launch_date || new Date().toISOString().split('T')[0],
    asset_ids: []
  });

  const kitItems = [
    { key: 'facebook_post', name: `${campaign_name} — Facebook Post`, type: 'social_post' },
    { key: 'instagram_caption', name: `${campaign_name} — Instagram Caption`, type: 'social_post' },
    { key: 'email_body', name: `${campaign_name} — Email`, type: 'email' },
    { key: 'press_release', name: `${campaign_name} — Press Release`, type: 'other' },
    { key: 'ad_copy_long', name: `${campaign_name} — Ad Copy`, type: 'ad' }
  ];

  const assetIds: any[] = [];
  for (const item of kitItems) {
    if (kit[item.key]) {
      const asset = await base44.asServiceRole.entities.GeneratedAsset.create({
        name: item.name,
        asset_type: item.type,
        status: 'ready',
        project_id,
        prompt: campaign_goal,
        provider: 'openai',
        model: 'gpt-4o',
        source_data: JSON.stringify({ content: kit[item.key], campaign_id: campaign.id }),
        version: 1
      });
      assetIds.push(asset.id);
    }
  }

  await base44.asServiceRole.entities.Campaign.update(campaign.id, { asset_ids: assetIds });

  await base44.asServiceRole.entities.RenderJob.update(job.id, {
    status: 'completed',
    completed_at: new Date().toISOString(),
    duration_ms: duration,
    progress_percent: 100,
    response_payload: JSON.stringify({ campaign_id: campaign.id, assets_created: assetIds.length })
  });

  res.json({
    success: true,
    render_job_id: job.id,
    campaign_id: campaign.id,
    asset_ids: assetIds,
    kit,
    assets_created: assetIds.length,
    duration_ms: duration
  });
});
