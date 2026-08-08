// Ported from synthetix-ai/base44/functions/draftSocialPosts/entry.ts
import { registerFunction } from '../registry.js';

// Brand voice map per project — hermetic/poetic for spiritual apps, punchy for SaaS
const BRAND_VOICES: Record<string, string> = {
  default: 'Direct, intelligent, and human. Authority without arrogance.',
  mystic: 'Hermetic and poetic. Ancient wisdom made modern. Speak to seekers. Evoke, do not explain.',
  vigil: 'Protective and urgent. Lumen Custos Phylax. Privacy is power. Slightly conspiratorial-but-factual.',
  siteiq: 'Punchy and practical. Australian directness. B2B. Save time, stay safe, skip the paperwork.',
  apex: 'Executive-level authority. Precise, no fluff. For leaders who move fast.',
  hermetica: 'Philosophical and deep. As above so below. Esoteric made actionable.',
  mice: 'Professional, warm, world-class events. Trust and experience.',
  pr: 'Story-first. Media-savvy. The spiritual angle is the differentiator.',
};

function detectBrandVoice(projectName: any, brandVoice: any) {
  if (brandVoice) return brandVoice;
  if (!projectName) return BRAND_VOICES.default;
  const lower = projectName.toLowerCase();
  if (lower.includes('mystic') || lower.includes('sage') || lower.includes('hermetic counsel')) return BRAND_VOICES.mystic;
  if (lower.includes('vigil') || lower.includes('light guard')) return BRAND_VOICES.vigil;
  if (lower.includes('siteiq')) return BRAND_VOICES.siteiq;
  if (lower.includes('apex')) return BRAND_VOICES.apex;
  if (lower.includes('hermetica')) return BRAND_VOICES.hermetica;
  if (lower.includes('mice')) return BRAND_VOICES.mice;
  if (lower.includes('pr engine') || lower.includes('modern mystic pr')) return BRAND_VOICES.pr;
  return BRAND_VOICES.default;
}

registerFunction('draftSocialPosts', async (req, res, base44) => {
  try {
    // Accept both direct invocation (with payload) and entity automation payload
    const body = req.body || {};
    const { event, data } = body;

    let contentPiece = data;

    // If triggered from automation but data was omitted (large payload), fetch it
    if (event?.entity_id && !contentPiece) {
      contentPiece = await base44.asServiceRole.entities.ContentPiece.get(event.entity_id);
    }

    if (!contentPiece) {
      res.status(400).json({ error: 'No content piece provided' });
      return;
    }

    // Fetch related project for brand voice context
    let projectName = '';
    let brandVoice = '';
    if (contentPiece.project_id) {
      const projects = await base44.asServiceRole.entities.Project.filter({ id: contentPiece.project_id });
      if (projects.length > 0) {
        projectName = projects[0].name || '';
        brandVoice = projects[0].brand_voice || '';
      }
    }

    const voice = detectBrandVoice(projectName, brandVoice);
    const contentBody = (contentPiece.body || '').slice(0, 3000); // cap for token efficiency
    const title = contentPiece.title || 'Untitled';
    const audience = contentPiece.target_audience || 'general audience';
    const tags = (contentPiece.tags || []).join(', ');

    const prompt = `You are Riley — the AI behind Hermetica Holdings. Generate social media posts for the following content piece.

CONTENT PIECE:
Title: ${title}
Type: ${contentPiece.content_type || 'article'}
Target Audience: ${audience}
Tags: ${tags}
Brand Voice: ${voice}
Project: ${projectName || 'Hermetica Holdings'}

CONTENT BODY:
${contentBody}

TASK:
Write TWO social posts — one for Twitter/X and one for LinkedIn. Both must feel native to that platform and true to the brand voice above.

Twitter/X rules:
- Max 280 characters
- Punchy, one idea, hooks fast
- Optional: 1-2 relevant hashtags at the end only if they add value
- No em-dashes in the first line
- Do NOT start with the title

LinkedIn rules:
- 3-5 short paragraphs
- Opens with a hook line (no "I am excited to share")
- Middle: insight or story from the content
- End: clear takeaway + soft CTA
- Can use line breaks for breathing room
- 2-4 hashtags at the end

Return ONLY valid JSON in this exact shape:
{
  "twitter": "<post text>",
  "linkedin": "<post text>"
}`;

    const result: any = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          twitter: { type: 'string' },
          linkedin: { type: 'string' },
        },
        required: ['twitter', 'linkedin'],
      },
    });

    // Save the drafts as new ContentPiece records (one per platform)
    const now = new Date().toISOString().split('T')[0];

    const twitterPiece = await base44.asServiceRole.entities.ContentPiece.create({
      title: `[Twitter Draft] ${title}`,
      content_type: 'social_post',
      body: result.twitter,
      status: 'draft',
      project_id: contentPiece.project_id || null,
      tags: ['social', 'twitter', 'riley-generated'],
      target_audience: audience,
      tone: contentPiece.tone || 'professional',
      language: contentPiece.language || 'English',
      prompt: `Auto-drafted by Riley from: ${title}`,
    });

    const linkedinPiece = await base44.asServiceRole.entities.ContentPiece.create({
      title: `[LinkedIn Draft] ${title}`,
      content_type: 'social_post',
      body: result.linkedin,
      status: 'draft',
      project_id: contentPiece.project_id || null,
      tags: ['social', 'linkedin', 'riley-generated'],
      target_audience: audience,
      tone: contentPiece.tone || 'professional',
      language: contentPiece.language || 'English',
      prompt: `Auto-drafted by Riley from: ${title}`,
    });

    res.json({
      success: true,
      source_title: title,
      twitter_id: twitterPiece.id,
      linkedin_id: linkedinPiece.id,
      twitter_preview: result.twitter.slice(0, 100) + '...',
      linkedin_preview: result.linkedin.slice(0, 100) + '...',
    });
    return;

  } catch (error: any) {
    res.status(500).json({ error: error.message });
    return;
  }
});
