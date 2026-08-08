// Ported from synthetix-ai/base44/functions/rileyLicensingEngine/entry.ts
import { registerFunction } from '../registry.js';

/**
 * rileyLicensingEngine — Package any IP asset for licensing and generate sales materials.
 * Input: { ip_asset_id, target_market, license_type }
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

registerFunction('rileyLicensingEngine', async (req, res, base44) => {
  try {
    const user = await base44.auth.me();
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { ip_asset_id, target_market = 'smb', license_type = 'saas' } = req.body || {};
    if (!ip_asset_id) {
      res.status(400).json({ error: 'ip_asset_id is required' });
      return;
    }

    const apiKey = process.env.OPENROUTER_API_KEY || '';

    // Read IPAsset
    const assets = await base44.asServiceRole.entities.IPAsset.filter({ id: ip_asset_id }, '-created_date', 1);
    if (assets.length === 0) {
      res.status(404).json({ error: 'IPAsset not found' });
      return;
    }
    const asset: any = assets[0];

    const prompt = `Create a complete licensing package for Hermetica Holdings.

IP Asset: ${asset.name}
Type: ${asset.type}
Description: ${asset.description}
Commercial value: ${asset.commercial_value}
License type: ${license_type}
Target market: ${target_market}
Estimated price: $${asset.license_price || 'TBD'} AUD/year

Generate a complete licensing package:

1. ONE-PAGE OVERVIEW: What this IP is, what the licensee gets, why it's valuable
2. PRICING TIERS: 3 tiers appropriate for ${target_market} market with justification
3. LICENSE TERMS OUTLINE: Key terms (usage rights, exclusivity, support, IP ownership, termination)
4. SALES EMAIL TEMPLATE: Cold outreach email for a ${target_market} prospect
5. LANDING PAGE COPY: Headline, 3 benefits, pricing overview, testimonial placeholder, CTA
6. ROI CALCULATOR POINTS: 3-5 specific ROI arguments for the prospect
7. FAQ: 5 common objections and responses

Return JSON only:
{
  "overview": "...",
  "pricing_tiers": [
    { "name": "Starter", "price_monthly_aud": 299, "price_annual_aud": 2990, "features": ["..."], "target_segment": "..." }
  ],
  "license_terms_outline": "...",
  "sales_email": { "subject": "...", "body": "..." },
  "landing_page_copy": { "headline": "...", "benefits": ["..."], "pricing_blurb": "...", "cta": "..." },
  "roi_points": ["..."],
  "faqs": [{ "question": "...", "answer": "..." }]
}`;

    const llmRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'anthropic/claude-3.5-sonnet', messages: [{ role: 'user', content: prompt }], max_tokens: 4000 }),
      signal: AbortSignal.timeout(60000),
    });
    const llmData: any = await llmRes.json();
    if (llmData.error) throw new Error(llmData.error.message);

    const raw = llmData.choices[0].message.content;
    let pkg: any;
    try {
      const match = raw.match(/\{[\s\S]*\}/);
      pkg = JSON.parse(match ? match[0] : raw);
    } catch (_) {
      pkg = { overview: raw, pricing_tiers: [], sales_email: {}, landing_page_copy: {}, roi_points: [], faqs: [] };
    }

    // Create PricingTier records
    const tierIds = [];
    for (const tier of (pkg.pricing_tiers || [])) {
      const record = await base44.asServiceRole.entities.PricingTier.create({
        product_name: asset.name,
        tier_name: tier.name,
        price_monthly: tier.price_monthly_aud || 0,
        price_annual: tier.price_annual_aud || 0,
        features: JSON.stringify(tier.features || []),
        target_audience: tier.target_segment || target_market,
        active: true,
        notes: `License tier for ${license_type} — ${target_market}. Auto-generated.`,
      }).catch(() => null);
      if (record) tierIds.push(record.id);
    }

    // Save sales materials as ContentPiece
    const salesContent = await base44.asServiceRole.entities.ContentPiece.create({
      title: `Licensing Package: ${asset.name} — ${target_market}`,
      content: JSON.stringify(pkg, null, 2),
      content_type: 'article',
      status: 'draft',
      tags: ['licensing', 'sales', asset.type, target_market],
      notes: `Auto-generated by rileyLicensingEngine. License type: ${license_type}.`,
    });

    // Create OutreachDraft for the sales email (never auto-sends)
    let outreachId = null;
    if (pkg.sales_email?.body) {
      const outreach = await base44.asServiceRole.entities.ContentPiece.create({
        title: `Sales Email Draft: ${asset.name}`,
        content: `Subject: ${pkg.sales_email.subject || ''}\n\n${pkg.sales_email.body}`,
        content_type: 'email',
        status: 'draft',
        tags: ['outreach', 'licensing', 'draft'],
        notes: 'Draft only — approved_by_james required before sending.',
      }).catch(() => null);
      outreachId = outreach?.id || null;
    }

    // Update IPAsset as licensable with type
    await base44.asServiceRole.entities.IPAsset.update(asset.id, {
      licensable: true,
      license_type,
      license_price: (pkg.pricing_tiers?.[0]?.price_annual_aud || asset.license_price || 0),
    }).catch(() => {});

    // Optionally generate landing page
    let landingPageId = null;
    if (pkg.landing_page_copy?.headline) {
      try {
        const lpResult = (await invokeFunction(req, 'generateLandingPage', {
          product_name: asset.name,
          headline: pkg.landing_page_copy.headline,
          benefits: pkg.landing_page_copy.benefits || [],
          cta: pkg.landing_page_copy.cta || 'Get Started',
          pricing: pkg.pricing_tiers,
        })).data;
        landingPageId = lpResult?.page_id || null;
      } catch (_) {}
    }

    res.json({
      ip_asset_id,
      asset_name: asset.name,
      license_package: pkg,
      pricing_tiers_created: tierIds.length,
      sales_materials_id: salesContent.id,
      outreach_draft_id: outreachId,
      landing_page_id: landingPageId,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
