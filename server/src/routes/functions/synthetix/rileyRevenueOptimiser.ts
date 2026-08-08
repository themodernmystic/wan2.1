// Ported from synthetix-ai/base44/functions/rileyRevenueOptimiser/entry.ts
import { registerFunction } from '../registry.js';

/**
 * rileyRevenueOptimiser — Analyse all revenue streams and recommend optimisations.
 * Input: { focus, product_name }
 */

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

registerFunction('rileyRevenueOptimiser', async (req, res, base44) => {
  try {
    const user = await base44.auth.me();
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { focus = 'all', product_name } = req.body || {};
    const apiKey = process.env.OPENROUTER_API_KEY || '';

    // Gather data in parallel
    const streamQuery: any = product_name ? { product: product_name } : {};
    const [streams, gigs, recentActivities] = await Promise.all([
      base44.asServiceRole.entities.RevenueStream.filter(streamQuery, '-updated_date', 50).catch(() => []),
      base44.asServiceRole.entities.FreelanceGig.filter({ status: 'in_progress' }, '-updated_date', 20).catch(() => []),
      base44.asServiceRole.entities.ActivityLog.filter({ event_type: 'deal_pipeline' }, '-created_date', 20).catch(() => []),
    ]);

    // Try to get deal pipeline data
    let deals: any[] = [];
    try {
      deals = await base44.asServiceRole.entities.DealPipeline.list('-updated_date', 20);
    } catch (_) {}

    // Try Stripe balance if connected
    let stripeBalance: any = null;
    try {
      const stripeResult = (await invokeFunction(req, 'rileyStripeConnect', { action: 'get_balance', data: {} })).data;
      stripeBalance = stripeResult?.data;
    } catch (_) {}

    const totalMonthlyTarget = (streams as any[]).reduce((s, r) => s + (r.monthly_target || 0), 0);
    const totalMonthlyActual = (streams as any[]).reduce((s, r) => s + (r.monthly_actual || 0), 0);
    const totalGigValue = (gigs as any[]).reduce((s, g) => s + (g.price || 0), 0);

    const streamsSummary = (streams as any[]).map((s) => ({
      name: s.name, type: s.type, product: s.product,
      monthly_target: s.monthly_target, monthly_actual: s.monthly_actual,
      status: s.status, margin: s.margin_percent, customers: s.customer_count,
    }));

    const prompt = `You are a revenue optimisation strategist for Hermetica Holdings (Brisbane, Australia).

Hermetica portfolio: James AI (consciousness), SiteIQ (construction safety), VIGIL (privacy), APEX (executive AI), Mystic Sage (spiritual), MICE (ethics), Hermetic Crystals (ecommerce), Mentora/Paideia (education).

Current revenue streams (${streams.length}):
${JSON.stringify(streamsSummary, null, 2).substring(0, 3000)}

Active deals: ${deals.length}
Active freelance value: $${totalGigValue} AUD
Total monthly target: $${totalMonthlyTarget} AUD
Total monthly actual: $${totalMonthlyActual} AUD
Stripe balance available: ${stripeBalance ? JSON.stringify(stripeBalance) : 'Not connected'}

Analyse and return:
- Which streams have highest growth potential?
- Where is revenue being left on the table?
- What pricing changes would increase revenue?
- What new revenue streams should be added?
- Fastest path to $10k/month, $50k/month, $100k/month?

Return JSON only:
{
  "total_monthly_revenue": ${totalMonthlyActual},
  "total_annual_projection": ${totalMonthlyActual * 12},
  "top_3_growth_opportunities": ["...", "...", "..."],
  "pricing_recommendations": [{ "product": "...", "recommendation": "..." }],
  "new_stream_ideas": [{ "idea": "...", "type": "...", "estimated_monthly": 0 }],
  "fastest_path_to_10k": "...",
  "fastest_path_to_50k": "...",
  "fastest_path_to_100k": "...",
  "underperforming_streams": ["..."],
  "action_items": ["..."]
}`;

    const llmRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'anthropic/claude-3.5-sonnet', messages: [{ role: 'user', content: prompt }], max_tokens: 3000 }),
      signal: AbortSignal.timeout(60000),
    });
    const llmData: any = await llmRes.json();
    if (llmData.error) throw new Error(llmData.error.message);

    const raw = llmData.choices[0].message.content;
    let analysis: any;
    try {
      const match = raw.match(/\{[\s\S]*\}/);
      analysis = JSON.parse(match ? match[0] : raw);
    } catch (_) {
      analysis = { total_monthly_revenue: totalMonthlyActual, action_items: [], top_3_growth_opportunities: [] };
    }

    // Save as IntelligenceReport
    const report = await base44.asServiceRole.entities.IntelligenceReport.create({
      title: `Revenue Optimisation — ${focus} — ${new Date().toISOString().split('T')[0]}`,
      report_type: 'trend_analysis',
      summary: `Monthly actual: $${totalMonthlyActual} AUD. Target: $${totalMonthlyTarget} AUD. Top opportunity: ${(analysis.top_3_growth_opportunities || [])[0] || 'See report'}.`,
      full_report: JSON.stringify(analysis),
      relevance_score: 95,
      urgency: totalMonthlyActual < totalMonthlyTarget * 0.5 ? 'act_now' : 'act_soon',
      action_items: JSON.stringify(analysis.action_items || []),
      auto_generated: true,
      james_read: false,
      tags: ['revenue', 'optimisation', focus],
    });

    res.json({
      report_id: report.id,
      ...analysis,
      streams_analysed: streams.length,
      stripe_connected: !!stripeBalance,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
