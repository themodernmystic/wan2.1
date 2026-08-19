// Ported from synthetix-ai/base44/functions/rileySocialPublish/entry.ts
import { registerFunction } from '../registry.js';

/**
 * rileySocialPublish — Publish approved social posts to platforms.
 * CRITICAL: NEVER posts without approved_by_james = true.
 * Input: { social_post_id, platform, content, media_urls, schedule_for }
 */

async function postToTwitter(content: string, token: string) {
  const res = await fetch('https://api.twitter.com/2/tweets', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: content.substring(0, 280) }),
    signal: AbortSignal.timeout(20000),
  });
  const json: any = await res.json();
  return { success: res.status < 300, post_id: json.data?.id || null, raw: json };
}

async function postToLinkedIn(content: string, token: string, authorUrn?: string) {
  const body = {
    author: authorUrn || 'urn:li:person:me',
    lifecycleState: 'PUBLISHED',
    specificContent: {
      'com.linkedin.ugc.ShareContent': {
        shareCommentary: { text: content },
        shareMediaCategory: 'NONE',
      },
    },
    visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
  };
  const res = await fetch('https://api.linkedin.com/v2/ugcPosts', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', 'X-Restli-Protocol-Version': '2.0.0' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20000),
  });
  const json: any = await res.json().catch(() => ({}));
  return { success: res.status < 300, post_id: json.id || null, raw: json };
}

registerFunction('rileySocialPublish', async (req, res, base44) => {
  try {
    const user = await base44.auth.me();
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { social_post_id, platform: inputPlatform, content: inputContent, media_urls, schedule_for } = req.body || {};

    // Resolve post record or use inline data
    let postRecord: any = null;
    let platform = inputPlatform;
    let content = inputContent;
    let approvedByJames = false;

    if (social_post_id) {
      const records: any = await base44.asServiceRole.entities.SocialPost.filter({ id: social_post_id }, '-created_date', 1).catch(() => []);
      if (records.length === 0) {
        res.status(404).json({ error: 'SocialPost not found' });
        return;
      }
      postRecord = records[0];
      platform = postRecord.platform;
      content = postRecord.content;
      approvedByJames = postRecord.approved_by_james;
    } else {
      // Inline post — must still pass approval check via explicit flag
      approvedByJames = false; // Inline posts without a record are never auto-approved
    }

    // HARD GATE
    if (!approvedByJames) {
      // Save as draft if not already a record
      if (!postRecord && platform && content) {
        const draft: any = await base44.asServiceRole.entities.SocialPost.create({
          platform,
          content,
          media_urls: media_urls || [],
          scheduled_for: schedule_for || '',
          status: 'draft',
          auto_generated: true,
          approved_by_james: false,
          notes: 'Saved as draft — awaiting James approval',
        });
        res.json({ posted: false, status: 'draft_saved', draft_id: draft.id, message: 'Post saved as draft. Set approved_by_james = true on the SocialPost record to publish.' });
        return;
      }
      res.status(403).json({ error: 'BLOCKED: Riley will not post without approved_by_james = true on the SocialPost record.', posted: false });
      return;
    }

    if (!platform || !content) {
      res.status(400).json({ error: 'platform and content are required' });
      return;
    }

    const start = Date.now();
    let postResult: any = { success: false, post_id: null, fallback_to_manual: false };

    if (platform === 'twitter') {
      const twitterToken = process.env.TWITTER_BEARER_TOKEN || '';
      if (!twitterToken) {
        postResult = { success: false, post_id: null, fallback_to_manual: true };
      } else {
        postResult = { ...await postToTwitter(content, twitterToken), fallback_to_manual: false };
      }
    } else if (platform === 'linkedin') {
      const linkedinToken = process.env.LINKEDIN_ACCESS_TOKEN || '';
      if (!linkedinToken) {
        postResult = { success: false, post_id: null, fallback_to_manual: true };
      } else {
        postResult = { ...await postToLinkedIn(content, linkedinToken), fallback_to_manual: false };
      }
    } else {
      // Other platforms — fallback to manual
      postResult = { success: false, post_id: null, fallback_to_manual: true };
    }

    const duration = Date.now() - start;
    const newStatus = postResult.fallback_to_manual ? 'approved' : postResult.success ? 'posted' : 'failed';

    // Update SocialPost record
    if (postRecord) {
      await base44.asServiceRole.entities.SocialPost.update(postRecord.id, {
        status: newStatus,
        posted_at: postResult.success ? new Date().toISOString() : null,
        notes: postResult.fallback_to_manual ? 'Ready for manual post — API not configured' : postRecord.notes,
      }).catch(() => {});
    }

    // Log to IntegrationJob
    await base44.asServiceRole.entities.IntegrationJob.create({
      integration_name: `Social:${platform}`,
      action: 'publish',
      request_payload: content.substring(0, 500),
      response_payload: JSON.stringify(postResult).substring(0, 500),
      status: postResult.success ? 'success' : postResult.fallback_to_manual ? 'queued' : 'failed',
      duration_ms: duration,
      timestamp: new Date().toISOString(),
    }).catch(() => {});

    await base44.asServiceRole.entities.CreditLedger.create({
      function_name: 'rileySocialPublish',
      provider: 'free',
      model: `${platform}_api`,
      estimated_cost: 0,
      credit_type: 'external_api',
      tokens_used: 0,
      duration_ms: duration,
      timestamp: new Date().toISOString(),
    }).catch(() => {});

    if (postResult.fallback_to_manual) {
      res.json({ posted: false, platform, status: 'ready_for_manual_post', content, fallback_to_manual: true, message: `No ${platform} API key configured. Post content is approved and ready to copy-paste.` });
      return;
    }

    res.json({ posted: postResult.success, platform, post_id_from_platform: postResult.post_id, fallback_to_manual: false, status: newStatus });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
