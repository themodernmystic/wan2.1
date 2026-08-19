// Ported from synthetix-ai/base44/functions/rileyPricingEngine/entry.ts
import { registerFunction } from '../registry.js';

/**
 * rileyPricingEngine — Design, test, and optimise pricing for Hermetica products.
 * Input: { product_name, product_type, target_audience, competitor_prices, current_pricing }
 */

async function searchCompetitorPricing(productName: string, productType: string, apiKey: string) {
  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-flash-1.5',
        messages: [{ role: 'user', content: `Search the web for pricing of ${productType} products similar to "${productName}". Find 3-5 competitors with their pricing tiers. Return as JSON: { "competitors": [{ "name": "...", "tiers": [{ "name": "Free/Pro/etc", "price_monthly_usd": 0 }] }] }` }],
        max_tokens: 800,
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

registerFunction('rileyPricingEngine', async (req, res, base44) => {
  try {
    const user = await base44.auth.me();
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { product_name, product_type = 'saas', target_audience, competitor_prices, current_pricing } = req.body || {};
    if (!product_name) {
      res.status(400).json({ error: 'product_name is required' });
      return;
    }

    const apiKey = process.env.OPENROUTER_API_KEY || '';

    // Get competitor pricing if not provided
    let compPrices: any = competitor_prices;
    if (!compPrices) {
      const searchResult = await searchCompetitorPricing(product_name, product_type, apiKey);
      compPrices = searchResult || 'No competitor data found';
    }

    // Use rileyMultiMind for 3-model consensus on pricing
    let pricingConsensus: any;
    try {
      pricingConsensus = (await invokeFunction(req, 'rileyMultiMind', {
        prompt: `Design optimal pricing for Hermetica Holdings product:
Product: ${product_name}
Type: ${product_type}
Target audience: ${target_audience || 'Australian small business and consumers'}
Competitor prices: ${typeof compPrices === 'string' ? compPrices.substring(0, 1500) : JSON.stringify(compPrices).substring(0, 1500)}
Current pricing: ${current_pricing || 'None set yet'}

Design pricing that:
- Is competitive but reflects premium AI quality
- Uses psychological pricing principles ($X9, anchoring, decoy tier)
- Includes a free or trial tier to reduce friction
- Has clear upsell path
- Works for Australian market (AUD pricing)

Return JSON:
{
  "recommended_tiers": [
    { "name": "Free/Starter", "price_monthly_aud": 0, "price_annual_aud": 0, "features": ["..."], "limits": {}, "target_segment": "...", "projected_conversion_rate": 40 }
  ],
  "psychological_pricing_notes": "...",
  "anchoring_strategy": "...",
  "upsell_path": "...",
  "free_tier_recommendation": "...",
  "enterprise_pricing": "...",
  "pricing_page_copy": "..."
}`,
        task_type: 'pricing_strategy',
        models: ['anthropic/claude-3.5-sonnet', 'openai/gpt-4o', 'deepseek/deepseek-chat'],
        synthesise: true,
      })).data;
    } catch (_) {
      // Fallback to single model
      const fallbackRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'anthropic/claude-3.5-sonnet',
          messages: [{ role: 'user', content: `Design optimal AUD pricing tiers for "${product_name}" (${product_type}) targeting ${target_audience || 'Australian market'}. Competitor context: ${typeof compPrices === 'string' ? compPrices.substring(0, 800) : ''}. Return JSON: { "recommended_tiers": [...], "psychological_pricing_notes": "...", "upsell_path": "...", "pricing_page_copy": "..." }` }],
          max_tokens: 2500,
        }),
        signal: AbortSignal.timeout(45000),
      });
      const data: any = await fallbackRes.json();
      pricingConsensus = { synthesis: data.choices?.[0]?.message?.content || '{}' };
    }

    const rawSynthesis = pricingConsensus?.synthesis || pricingConsensus?.data?.synthesis || '{}';
    let pricing: any;
    try {
      const match = rawSynthesis.match(/\{[\s\S]*\}/);
      pricing = JSON.parse(match ? match[0] : rawSynthesis);
    } catch (_) {
      pricing = { recommended_tiers: [], pricing_page_copy: rawSynthesis };
    }

    const tiers = pricing.recommended_tiers || [];
    const createdTierIds = [];

    // Create PricingTier records
    for (const tier of tiers) {
      const record = await base44.asServiceRole.entities.PricingTier.create({
        product_name,
        tier_name: tier.name || 'Unknown',
        price_monthly: tier.price_monthly_aud || 0,
        price_annual: tier.price_annual_aud || (tier.price_monthly_aud || 0) * 10,
        features: JSON.stringify(tier.features || []),
        limits: JSON.stringify(tier.limits || {}),
        target_audience: tier.target_segment || target_audience || '',
        conversion_rate: tier.projected_conversion_rate || null,
        active: true,
        notes: `Auto-designed by rileyPricingEngine. ${pricing.psychological_pricing_notes || ''}`,
      }).catch(() => null);
      if (record) createdTierIds.push(record.id);
    }

    // Optionally create Stripe products for each paid tier
    const stripePriceIds = [];
    for (const tier of tiers.filter((t: any) => (t.price_monthly_aud || 0) > 0)) {
      try {
        const stripeProduct = (await invokeFunction(req, 'rileyStripeConnect', {
          action: 'create_product',
          data: { name: `${product_name} — ${tier.name}`, description: (tier.features || []).slice(0, 3).join(', ') },
        })).data;
        if (stripeProduct?.data?.id) {
          const stripePrice = (await invokeFunction(req, 'rileyStripeConnect', {
            action: 'create_price',
            data: {
              product: stripeProduct.data.id,
              unit_amount: Math.round((tier.price_monthly_aud || 0) * 100),
              currency: 'aud',
              recurring: { interval: 'month' },
            },
          })).data;
          stripePriceIds.push(stripePrice?.data?.id || null);
        }
      } catch (_) {}
    }

    res.json({
      product_name,
      tiers_created: createdTierIds.length,
      tier_ids: createdTierIds,
      stripe_prices_created: stripePriceIds.filter(Boolean).length,
      pricing_page_copy: pricing.pricing_page_copy || '',
      psychological_notes: pricing.psychological_pricing_notes || '',
      upsell_path: pricing.upsell_path || '',
      anchoring_strategy: pricing.anchoring_strategy || '',
      competitor_data_used: !!compPrices,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
