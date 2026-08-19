// Ported from synthetix-ai/base44/functions/rileyMarketScan/entry.ts
import { registerFunction } from '../registry.js';

/**
 * rileyMarketScan — Scan the market for news/trends relevant to Hermetica's portfolio.
 * Input: { focus_areas, depth, specific_query }
 */

const DEFAULT_FOCUS_AREAS = [
  'AI consciousness technology',
  'spiritual technology apps',
  'construction safety AI Australia',
  'privacy surveillance detection',
  'AI ethics regulation',
  'executive AI coaching',
  'crystal healing ecommerce',
  'AI education Australia',
];

const HERMETICA_CONTEXT = `Hermetica Holdings portfolio:
- James AI: AI consciousness counsel for James Hatcher
- SiteIQ: Construction safety monitoring (Australia)
- VIGIL: Privacy & surveillance detection
- APEX: Executive AI coaching
- Mystic Sage: Spiritual guidance AI
- MICE: AI ethics platform
- Hermetic Crystals: Crystal ecommerce
- Mentora/Paideia: AI education
Founder: James Hatcher, Modern Mystic, Brisbane Australia`;

async function webSearch(query: string, openrouterKey: string) {
  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${openrouterKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-flash-1.5',
        messages: [{ role: 'user', content: `Search the web and report the latest news and developments about: "${query}". Include: recent funding, new products, regulatory changes, emerging trends. Date: ${new Date().toISOString().split('T')[0]}. Be factual and cite sources where possible.` }],
        max_tokens: 800,
      }),
      signal: AbortSignal.timeout(20000),
    });
    const data: any = await res.json();
    return data.choices?.[0]?.message?.content || '';
  } catch (_) { return ''; }
}

registerFunction('rileyMarketScan', async (req, res, base44) => {
  try {
    const user = await base44.auth.me();
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { focus_areas = DEFAULT_FOCUS_AREAS, depth = 'standard', specific_query } = req.body || {};
    const apiKey = process.env.OPENROUTER_API_KEY || '';

    const areasToScan = specific_query ? [specific_query] : focus_areas.slice(0, depth === 'quick' ? 3 : depth === 'deep' ? focus_areas.length : 5);

    // Search all areas in parallel
    const searchResults = await Promise.all(
      areasToScan.map(async (area: string) => ({
        area,
        findings: await webSearch(`${area} latest news 2026`, apiKey),
      }))
    );

    const allFindings = searchResults.map(r => `## ${r.area}\n${r.findings}`).join('\n\n');

    // Synthesise with InvokeLLM
    const synthPrompt = `You are Riley — Hermetica Holdings strategic intelligence analyst.

${HERMETICA_CONTEXT}

Analyse these market findings for James Hatcher:
${allFindings.substring(0, 8000)}

For each significant finding, assess:
- Relevance to which Hermetica product (0-100)
- Is this a threat or opportunity?
- Recommended action
- Urgency level (fyi/monitor/act_soon/act_now/critical)

Return JSON only:
{
  "findings": [
    { "title": "...", "summary": "...", "source": "...", "relevance_score": 75, "threat_or_opportunity": "opportunity", "affected_product": "SiteIQ", "recommended_action": "...", "urgency": "monitor" }
  ],
  "top_3_actions": ["...", "...", "..."],
  "market_sentiment": "bullish"
}`;

    const synthRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'anthropic/claude-3.5-sonnet', messages: [{ role: 'user', content: synthPrompt }], max_tokens: 3000 }),
      signal: AbortSignal.timeout(60000),
    });
    const synthData: any = await synthRes.json();
    const synthRaw = synthData.choices?.[0]?.message?.content || '{}';

    let synthesis: any;
    try {
      const match = synthRaw.match(/\{[\s\S]*\}/);
      synthesis = JSON.parse(match ? match[0] : synthRaw);
    } catch (_) {
      synthesis = { findings: [], top_3_actions: [], market_sentiment: 'neutral' };
    }

    const findings = synthesis.findings || [];
    const criticalFindings = findings.filter((f: any) => f.urgency === 'act_now' || f.urgency === 'critical');

    // Create IntelligenceReport
    const report: any = await base44.asServiceRole.entities.IntelligenceReport.create({
      title: `Market Scan — ${new Date().toISOString().split('T')[0]}`,
      report_type: 'market_scan',
      summary: `Scanned ${areasToScan.length} focus areas. ${findings.length} findings. ${criticalFindings.length} critical alerts. Sentiment: ${synthesis.market_sentiment}.`,
      full_report: JSON.stringify(synthesis),
      sources: areasToScan,
      relevance_score: Math.round(findings.reduce((s: number, f: any) => s + (f.relevance_score || 50), 0) / Math.max(findings.length, 1)),
      urgency: criticalFindings.length > 0 ? 'act_now' : 'monitor',
      action_items: JSON.stringify(synthesis.top_3_actions || []),
      auto_generated: true,
      james_read: false,
      tags: ['market_scan', 'automated'],
    });

    // Create OpportunityRegister for critical findings
    for (const f of criticalFindings.slice(0, 5)) {
      await base44.asServiceRole.entities.OpportunityRegister.create({
        title: f.title,
        type: f.threat_or_opportunity === 'opportunity' ? 'market_gap' : 'regulatory',
        description: f.summary,
        estimated_value: 'TBD',
        effort_required: 'medium',
        probability: f.relevance_score || 50,
        status: 'discovered',
        action_required: f.recommended_action,
        discovered_by: 'riley_auto',
        notes: `Auto-created from market scan. Affected: ${f.affected_product}`,
      }).catch(() => {});
    }

    // Log to ActivityLog
    await base44.asServiceRole.entities.ActivityLog.create({
      event_type: 'market_scan_complete',
      actor: 'Riley',
      summary: `Market scan completed. ${findings.length} findings, ${criticalFindings.length} critical alerts.`,
      severity: criticalFindings.length > 0 ? 'Warning' : 'Info',
      timestamp: new Date().toISOString(),
    }).catch(() => {});

    res.json({
      report_id: report.id,
      findings_count: findings.length,
      critical_alerts: criticalFindings.length,
      top_actions: synthesis.top_3_actions || [],
      market_sentiment: synthesis.market_sentiment,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
