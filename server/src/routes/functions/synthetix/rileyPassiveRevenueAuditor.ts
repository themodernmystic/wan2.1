// Ported from synthetix-ai/base44/functions/rileyPassiveRevenueAuditor/entry.ts
import { registerFunction } from '../registry.js';

/**
 * rileyPassiveRevenueAuditor — Audit all products for passive revenue opportunities.
 * Input: { scan_type, product_name }
 */

registerFunction('rileyPassiveRevenueAuditor', async (req, res, base44) => {
  try {
    const user = await base44.auth.me();
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { scan_type = 'all', product_name } = req.body || {};
    const apiKey = process.env.OPENROUTER_API_KEY || '';

    // Gather all data in parallel
    const projectQuery: any = product_name ? { name: product_name } : {};
    const [projects, appRegistry, streams, pricingTiers] = await Promise.all([
      base44.asServiceRole.entities.RileyProject.filter(projectQuery, '-updated_date', 30).catch(() => []),
      base44.asServiceRole.entities.AppRegistry.list('-created_date', 20).catch(() => []),
      base44.asServiceRole.entities.RevenueStream.list('-updated_date', 50).catch(() => []),
      base44.asServiceRole.entities.PricingTier.filter({ active: true }, '-created_date', 50).catch(() => []),
    ]);

    const productSummary = projects.map((p: any) => ({
      name: p.name, type: p.project_type, stage: p.stage,
      core_offer: p.core_offer || '', business_model: p.business_model || '',
    }));

    const streamsByProduct: Record<string, any[]> = {};
    for (const s of streams as any[]) {
      if (!streamsByProduct[s.product]) streamsByProduct[s.product] = [];
      streamsByProduct[s.product].push({ type: s.type, monthly: s.monthly_actual, status: s.status });
    }

    const prompt = `You are a passive revenue architect for Hermetica Holdings, Brisbane Australia.

Products:
${JSON.stringify(productSummary, null, 2).substring(0, 2000)}

Existing revenue streams per product:
${JSON.stringify(streamsByProduct, null, 2).substring(0, 1500)}

For EACH product, identify ALL missing passive revenue layers from this checklist:
1. Subscription (monthly/annual SaaS)
2. Affiliate integration (referral commissions)
3. Data licensing (anonymised insights)
4. White-label/franchise licensing
5. Course/education upsell
6. Premium tier unlock
7. API access for developers
8. Certification/badge programs
9. Community/membership fees
10. Merchandise/physical products

For each missing opportunity, estimate:
- Monthly revenue potential (AUD, be realistic)
- Setup effort: minimal/low/medium/high
- Time to first revenue: days/weeks/months

Return JSON only:
{
  "products": [
    {
      "name": "SiteIQ",
      "current_monthly_revenue": 0,
      "missing_layers": [
        { "type": "subscription", "potential_monthly": 5000, "effort": "medium", "time_to_revenue": "3 months", "implementation_notes": "..." }
      ],
      "total_untapped_potential": 15000
    }
  ],
  "total_untapped_revenue": 50000,
  "quick_wins": ["..."],
  "highest_potential": ["..."]
}`;

    const res2 = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'anthropic/claude-3.5-sonnet', messages: [{ role: 'user', content: prompt }], max_tokens: 4000 }),
      signal: AbortSignal.timeout(60000),
    });
    const llmData: any = await res2.json();
    if (llmData.error) throw new Error(llmData.error.message);

    const raw = llmData.choices[0].message.content;
    let analysis: any;
    try {
      const match = raw.match(/\{[\s\S]*\}/);
      analysis = JSON.parse(match ? match[0] : raw);
    } catch (_) {
      analysis = { products: [], total_untapped_revenue: 0, quick_wins: [], highest_potential: [] };
    }

    // Create RevenueStream records for identified opportunities
    let opportunitiesCreated = 0;
    for (const product of (analysis.products || [])) {
      for (const layer of (product.missing_layers || []).slice(0, 5)) {
        const existing = await base44.asServiceRole.entities.RevenueStream.filter({
          product: product.name, type: layer.type,
        }, '-created_date', 1).catch(() => []);

        if (existing.length === 0) {
          await base44.asServiceRole.entities.RevenueStream.create({
            name: `${product.name} — ${layer.type}`,
            type: layer.type,
            product: product.name,
            monthly_target: layer.potential_monthly || 0,
            monthly_actual: 0,
            annual_projection: (layer.potential_monthly || 0) * 12,
            margin_percent: 80,
            status: 'idea',
            pricing_model: layer.implementation_notes || '',
            notes: `Identified by rileyPassiveRevenueAuditor. Effort: ${layer.effort}. Time to revenue: ${layer.time_to_revenue}.`,
          }).catch(() => {});
          opportunitiesCreated++;
        }
      }
    }

    // Save as IntelligenceReport
    const report = await base44.asServiceRole.entities.IntelligenceReport.create({
      title: `Passive Revenue Audit — ${new Date().toISOString().split('T')[0]}`,
      report_type: 'trend_analysis',
      summary: `Audited ${(analysis.products || []).length} products. Total untapped revenue: $${(analysis.total_untapped_revenue || 0).toLocaleString()} AUD/month. ${opportunitiesCreated} new streams identified.`,
      full_report: JSON.stringify(analysis),
      relevance_score: 95,
      urgency: (analysis.total_untapped_revenue || 0) > 10000 ? 'act_now' : 'act_soon',
      action_items: JSON.stringify(analysis.quick_wins || []),
      auto_generated: true,
      james_read: false,
      tags: ['passive_revenue', 'monetisation', 'audit'],
    });

    res.json({
      products_audited: (analysis.products || []).length,
      opportunities_found: opportunitiesCreated,
      total_untapped_revenue: analysis.total_untapped_revenue || 0,
      quick_wins: analysis.quick_wins || [],
      highest_potential: analysis.highest_potential || [],
      report_id: report.id,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
