// Ported from synthetix-ai/base44/functions/rileyTechRadar/entry.ts
import { registerFunction } from '../registry.js';

/**
 * rileyTechRadar — Scan for new technologies relevant to Hermetica.
 * Input: { scan_type, specific_search }
 */

const SEARCH_QUERIES: Record<string, string[]> = {
  ai_models: ['new AI models released 2026', 'best open source LLM benchmarks', 'AI model releases this month'],
  frameworks: ['trending GitHub repositories this week', 'new JavaScript React libraries 2026', 'developer tools trending'],
  apis: ['new free APIs for developers 2026', 'new AI APIs launched', 'developer API releases'],
  open_source: ['trending open source projects 2026', 'best free developer tools', 'open source AI tools'],
  regulations: ['AI regulation updates Australia 2026', 'EU AI Act implementation', 'data privacy law changes 2026'],
  all: ['new AI technology 2026', 'emerging tech tools developers', 'AI breakthroughs this month'],
};

async function searchTech(query: string, apiKey: string) {
  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-flash-1.5',
        messages: [{ role: 'user', content: `Search the web and report the latest about: "${query}". List specific tools, models, frameworks, or APIs with their names, what they do, and any relevant URLs. Be specific and current as of ${new Date().toISOString().split('T')[0]}.` }],
        max_tokens: 800,
      }),
      signal: AbortSignal.timeout(20000),
    });
    const data: any = await res.json();
    return data.choices?.[0]?.message?.content || '';
  } catch (_) { return ''; }
}

registerFunction('rileyTechRadar', async (req, res, base44) => {
  try {
    const user = await base44.auth.me();
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { scan_type = 'all', specific_search } = req.body || {};
    const apiKey = process.env.OPENROUTER_API_KEY || '';

    const queries: string[] = specific_search ? [specific_search] : (SEARCH_QUERIES[scan_type] || SEARCH_QUERIES.all);

    // Run all searches in parallel
    const searchResults = await Promise.all(queries.map(q => searchTech(q, apiKey)));
    const combinedFindings = searchResults.filter(Boolean).join('\n\n');

    if (!combinedFindings) {
      res.json({ items_scanned: 0, new_discoveries: 0, adopt_recommendations: 0 });
      return;
    }

    // Assess each discovery
    const assessPrompt = `You are Riley — Hermetica Holdings tech intelligence analyst.

New technology discoveries (${scan_type}):
${combinedFindings.substring(0, 6000)}

Hermetica portfolio: AI consciousness, construction safety AI, privacy detection, executive AI coaching, spiritual tech, AI ethics, crystal ecommerce, AI education. Based in Australia.

Assess each distinct technology/tool/API/model/regulation found:
- Relevance to Hermetica products
- Ring recommendation: adopt (use now), trial (experiment soon), assess (watch), hold (wait), avoid
- Maturity: bleeding_edge/early/growing/mature/declining
- Integration effort: trivial/easy/moderate/hard/massive
- Potential impact: low/medium/high/transformative

Return JSON only:
{
  "items": [
    {
      "name": "...",
      "category": "ai_model",
      "ring": "trial",
      "description": "...",
      "relevance_to_hermetica": "...",
      "relevance_score": 75,
      "maturity": "early",
      "integration_effort": "easy",
      "potential_impact": "high",
      "url": "",
      "reasoning": "..."
    }
  ]
}`;

    const assessRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'anthropic/claude-3.5-sonnet', messages: [{ role: 'user', content: assessPrompt }], max_tokens: 3000 }),
      signal: AbortSignal.timeout(60000),
    });
    const assessData: any = await assessRes.json();
    const raw = assessData.choices?.[0]?.message?.content || '{}';

    let parsed: any;
    try {
      const match = raw.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(match ? match[0] : raw);
    } catch (_) {
      parsed = { items: [] };
    }

    const items = parsed.items || [];
    let newDiscoveries = 0;
    let adoptCount = 0;

    for (const item of items.slice(0, 15)) {
      // Check if already exists
      const existing: any = await base44.asServiceRole.entities.TechRadarItem.filter({ name: item.name }, '-created_date', 1).catch(() => []);

      if (existing.length === 0) {
        await base44.asServiceRole.entities.TechRadarItem.create({
          name: item.name,
          category: item.category || 'platform',
          ring: item.ring || 'assess',
          description: item.description || '',
          relevance_to_hermetica: item.relevance_to_hermetica || '',
          url: item.url || '',
          discovered_at: new Date().toISOString(),
          maturity: item.maturity || 'early',
          integration_effort: item.integration_effort || 'moderate',
          potential_impact: item.potential_impact || 'medium',
          notes: item.reasoning || '',
        }).catch(() => {});
        newDiscoveries++;
      }

      // Create OpportunityRegister for "adopt" items with high relevance
      if (item.ring === 'adopt' && (item.relevance_score || 0) >= 70) {
        await base44.asServiceRole.entities.OpportunityRegister.create({
          title: `Adopt: ${item.name}`,
          type: 'technology',
          description: `${item.description} — ${item.relevance_to_hermetica}`,
          effort_required: item.integration_effort || 'medium',
          probability: item.relevance_score || 70,
          status: 'discovered',
          action_required: `Evaluate and integrate ${item.name} — ring: ADOPT`,
          discovered_by: 'riley_auto',
          notes: item.reasoning || '',
        }).catch(() => {});
        adoptCount++;
      }
    }

    // Create IntelligenceReport
    await base44.asServiceRole.entities.IntelligenceReport.create({
      title: `Tech Radar — ${scan_type} — ${new Date().toISOString().split('T')[0]}`,
      report_type: 'tech_radar',
      summary: `Scanned ${items.length} technologies. ${newDiscoveries} new discoveries. ${adoptCount} ADOPT recommendations.`,
      full_report: JSON.stringify(parsed),
      relevance_score: 70,
      urgency: adoptCount > 0 ? 'act_soon' : 'monitor',
      action_items: JSON.stringify(items.filter((i: any) => i.ring === 'adopt').map((i: any) => `Adopt ${i.name}: ${i.reasoning}`)),
      auto_generated: true,
      james_read: false,
      tags: ['tech_radar', scan_type],
    }).catch(() => {});

    res.json({
      items_scanned: items.length,
      new_discoveries: newDiscoveries,
      adopt_recommendations: adoptCount,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
