// Ported from synthetix-ai/base44/functions/rileyOpportunityHunter/entry.ts
import { registerFunction } from '../registry.js';

/**
 * rileyOpportunityHunter — Search for grants, competitions, speaking, media, partnerships.
 * Input: { hunt_type, region }
 */

const HUNT_QUERIES: Record<string, string[]> = {
  grants: ['AI grants Australia 2026', 'technology grants NSW QLD 2026', 'startup grants Australia innovation', 'social impact AI grants', 'digital technology grants Australian government'],
  competitions: ['AI competitions 2026', 'XPRIZE 2026', 'startup competitions Australia', 'innovation challenge prizes', 'AI hackathon prize money'],
  accelerators: ['AI accelerators Australia 2026', 'startup accelerators accepting applications', 'consciousness technology accelerator', 'deep tech accelerator Australia'],
  speaking: ['AI conferences Australia 2026 speakers', 'technology summit speaking opportunities', 'AI ethics conference keynote', 'spirituality technology conference'],
  media: ['AI consciousness media coverage opportunities', 'podcast guests AI spirituality', 'journalists covering AI ethics Australia', 'technology media opportunities'],
  partnerships: ['companies seeking AI partnerships Australia', 'enterprise AI consulting RFP', 'white label AI solutions demand', 'AI integration partnerships'],
  all: ['AI opportunities Australia 2026', 'startup opportunities funding', 'AI grants competitions speaking 2026'],
};

const HERMETICA_FIT = `Hermetica Holdings fit profile:
- Founder: James Hatcher, Modern Mystic, Brisbane Australia
- Products: James AI (consciousness), SiteIQ (construction safety), VIGIL (privacy), APEX (executive AI), Mystic Sage (spiritual), MICE (ethics), Hermetic Crystals, Mentora (education)
- Strengths: AI consciousness, spiritual tech, privacy, ethics, Australian market
- Looking for: funding, partnerships, speaking, media exposure, enterprise clients`;

async function searchOpportunity(query: string, apiKey: string) {
  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-flash-1.5',
        messages: [{ role: 'user', content: `Search the web for: "${query}". List specific opportunities with: name, description, deadline if known, value/prize if known, application URL if available. Date: ${new Date().toISOString().split('T')[0]}.` }],
        max_tokens: 700,
      }),
      signal: AbortSignal.timeout(20000),
    });
    const data: any = await res.json();
    return data.choices?.[0]?.message?.content || '';
  } catch (_) { return ''; }
}

// TODO(port): base44.asServiceRole.functions.invoke has no base44Compat equivalent (only
// entities/integrations/connectors are shimmed) — it originally called another Base44
// backend function server-side. Ported as a same-process HTTP call to this server's own
// /api/functions/<name> route, forwarding the original request's auth headers, so it keeps
// working once the target function is itself ported and registered.
async function invokeFunction(req: any, name: string, payload: any): Promise<{ data: any; status: number }> {
  const port = process.env.PORT || 3000;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (req.headers?.cookie) headers.cookie = req.headers.cookie;
  if (req.headers?.authorization) headers.authorization = req.headers.authorization;
  const resp = await fetch(`http://127.0.0.1:${port}/api/functions/${name}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
  const data = await resp.json().catch(() => ({}));
  return { data, status: resp.status };
}

registerFunction('rileyOpportunityHunter', async (req, res, base44) => {
  try {
    const user = await base44.auth.me();
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { hunt_type = 'all', region = 'australia' } = req.body || {};
    const apiKey = process.env.OPENROUTER_API_KEY || '';

    const queries = HUNT_QUERIES[hunt_type] || HUNT_QUERIES.all;
    const regionSuffix = region === 'global' ? '' : region === 'asia_pacific' ? ' Asia Pacific' : ' Australia';

    // Run all searches in parallel
    const searchResults = await Promise.all(
      queries.map((q) => searchOpportunity(q + regionSuffix, apiKey))
    );
    const allFindings = searchResults.filter(Boolean).join('\n\n');

    if (!allFindings) {
      res.json({ opportunities_found: 0, registered: 0, auto_outreach_generated: 0 });
      return;
    }

    // Score each opportunity for Hermetica fit
    const scorePrompt = `You are Riley — Hermetica Holdings opportunity analyst.

${HERMETICA_FIT}

Opportunities discovered (${hunt_type}, ${region}):
${allFindings.substring(0, 7000)}

Score each distinct opportunity for Hermetica fit. Include only those with relevance >= 40.

Return JSON only:
{
  "opportunities": [
    {
      "title": "...",
      "type": "grant",
      "description": "...",
      "relevance": 80,
      "probability": 60,
      "effort": "medium",
      "estimated_value": "$50,000",
      "deadline": "2026-08-01",
      "source_url": "...",
      "recommended_action": "Apply immediately — strong fit",
      "best_fit_product": "SiteIQ"
    }
  ]
}`;

    const scoreRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'anthropic/claude-3.5-sonnet', messages: [{ role: 'user', content: scorePrompt }], max_tokens: 3000 }),
      signal: AbortSignal.timeout(60000),
    });
    const scoreData: any = await scoreRes.json();
    const raw = scoreData.choices?.[0]?.message?.content || '{}';

    let scored: any;
    try {
      const match = raw.match(/\{[\s\S]*\}/);
      scored = JSON.parse(match ? match[0] : raw);
    } catch (_) {
      scored = { opportunities: [] };
    }

    const opps = scored.opportunities || [];
    let registered = 0;
    let autoOutreach = 0;

    for (const opp of opps.slice(0, 20)) {
      if ((opp.relevance || 0) < 50) continue;

      await base44.asServiceRole.entities.OpportunityRegister.create({
        title: opp.title,
        type: opp.type || hunt_type,
        description: `${opp.description}${opp.best_fit_product ? ` — Best fit: ${opp.best_fit_product}` : ''}`,
        source_url: opp.source_url || '',
        deadline: opp.deadline || '',
        estimated_value: opp.estimated_value || 'TBD',
        effort_required: opp.effort || 'medium',
        probability: opp.probability || opp.relevance,
        status: 'discovered',
        action_required: opp.recommended_action || 'Evaluate',
        discovered_by: 'riley_auto',
        notes: `Relevance: ${opp.relevance}/100. Region: ${region}.`,
      }).catch(() => {});
      registered++;

      // Auto-trigger outreach for high-value opportunities
      if ((opp.relevance || 0) >= 80) {
        try {
          await invokeFunction(req, 'rileyGenerateOutreach', {
            target_name: opp.title,
            opportunity_type: opp.type,
            context: opp.description,
            value: opp.estimated_value,
          });
          autoOutreach++;
        } catch (_) {}
      }
    }

    // Create IntelligenceReport
    await base44.asServiceRole.entities.IntelligenceReport.create({
      title: `Opportunity Hunt — ${hunt_type} — ${new Date().toISOString().split('T')[0]}`,
      report_type: 'opportunity_alert',
      summary: `Found ${opps.length} opportunities. Registered ${registered}. Auto-outreach triggered for ${autoOutreach}.`,
      full_report: JSON.stringify(scored),
      relevance_score: 75,
      urgency: registered > 0 ? 'act_soon' : 'fyi',
      action_items: JSON.stringify(opps.filter((o: any) => o.relevance >= 80).map((o: any) => o.recommended_action)),
      auto_generated: true,
      james_read: false,
      tags: ['opportunity_hunt', hunt_type, region],
    }).catch(() => {});

    res.json({
      opportunities_found: opps.length,
      registered,
      auto_outreach_generated: autoOutreach,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
