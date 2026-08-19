// Ported from synthetix-ai/base44/functions/rileyFreelancePipeline/entry.ts
import { registerFunction } from '../registry.js';

/**
 * rileyFreelancePipeline — Manage freelance AI build gigs from discovery to delivery.
 * Input: { action, data }
 */

const RILEY_CAPABILITIES = `Custom AI agents, chatbots, automation workflows, Base44 app development, AI integration (OpenAI/Claude/Gemini), content automation, social media AI, business intelligence dashboards, CRM automation, e-commerce AI, spiritual/wellness AI apps.`;

async function llm(prompt: string, apiKey: string, maxTokens = 2000) {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'anthropic/claude-3.5-sonnet', messages: [{ role: 'user', content: prompt }], max_tokens: maxTokens }),
    signal: AbortSignal.timeout(45000),
  });
  const data: any = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.choices[0].message.content;
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

registerFunction('rileyFreelancePipeline', async (req, res, base44) => {
  try {
    const user = await base44.auth.me();
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { action, data = {} } = req.body || {};
    if (!action) {
      res.status(400).json({ error: 'action is required' });
      return;
    }

    const apiKey = process.env.OPENROUTER_API_KEY || '';

    // ── find_gigs ──────────────────────────────────────────────────────────────
    if (action === 'find_gigs') {
      const searchPrompt = `Search the web for AI agent, chatbot, and automation freelance gigs currently posted on Fiverr, Upwork, and LinkedIn. Find gigs requiring: custom AI chatbots, AI automation workflows, AI app development, custom GPTs, business AI integration. Date: ${new Date().toISOString().split('T')[0]}.

      For each gig found, return: platform, title, budget_aud (estimate if not AUD), complexity (simple/medium/complex), client_type, fit_score 0-100 (based on Riley's capabilities: ${RILEY_CAPABILITIES}).

      Return JSON only: { "gigs": [{ "platform": "upwork", "title": "...", "budget_aud": 500, "complexity": "medium", "client_type": "...", "fit_score": 80, "description": "..." }] }`;

      const raw = await llm(searchPrompt, apiKey, 2000);
      let parsed: any;
      try {
        const match = raw.match(/\{[\s\S]*\}/);
        parsed = JSON.parse(match ? match[0] : raw);
      } catch (_) { parsed = { gigs: [] }; }

      const qualifiedGigs = (parsed.gigs || []).filter((g: any) => g.fit_score >= 60);
      const created = [];
      for (const gig of qualifiedGigs.slice(0, 10)) {
        const record = await base44.asServiceRole.entities.FreelanceGig.create({
          title: gig.title,
          platform: gig.platform || 'other',
          description: gig.description || '',
          price: gig.budget_aud || 0,
          cost_estimate: Math.round((gig.budget_aud || 0) * 0.2),
          profit_margin: 80,
          status: 'enquiry',
          hours_estimated: gig.complexity === 'simple' ? 4 : gig.complexity === 'complex' ? 20 : 10,
          notes: `Fit score: ${gig.fit_score}/100. Auto-discovered.`,
        }).catch(() => null);
        if (record) created.push(record.id);
      }
      res.json({ gigs_found: (parsed.gigs || []).length, qualified: qualifiedGigs.length, gigs_registered: created.length });
      return;
    }

    // ── create_listing ─────────────────────────────────────────────────────────
    if (action === 'create_listing') {
      const { platform = 'fiverr', service_type = 'AI agent development' } = data;
      const listingRaw = await llm(`Create a compelling ${platform} gig listing for: "${service_type}".
      Provider: James Hatcher / Hermetica Holdings — expert AI developer building custom agents, chatbots, automation.
      Capabilities: ${RILEY_CAPABILITIES}

      Create packages: Basic ($150-300 AUD), Standard ($500-800 AUD), Premium ($1500-3000 AUD).
      Include: title (max 80 chars), description (600 words), 3 packages with deliverables, FAQs (5 questions), tags (10), delivery times.
      Make it compelling and specific. Reference real technologies (Claude, OpenAI, Base44, Zapier).

      Return JSON only: { "title": "...", "description": "...", "packages": [...], "faqs": [...], "tags": [...] }`, apiKey, 3000);

      let listing: any;
      try {
        const match = listingRaw.match(/\{[\s\S]*\}/);
        listing = JSON.parse(match ? match[0] : listingRaw);
      } catch (_) { listing = { title: 'AI Agent Development', description: listingRaw }; }

      const content = await base44.asServiceRole.entities.ContentPiece.create({
        title: `${platform} Listing: ${listing.title || service_type}`,
        content: JSON.stringify(listing, null, 2),
        content_type: 'article',
        status: 'draft',
        tags: ['freelance', 'listing', platform],
        notes: `Auto-generated by rileyFreelancePipeline.`,
      });

      await base44.asServiceRole.entities.FreelanceGig.create({
        title: listing.title || service_type,
        platform,
        description: listing.description || '',
        price: 500,
        cost_estimate: 100,
        profit_margin: 80,
        status: 'draft',
        hours_estimated: 10,
        notes: `Listing content saved as ContentPiece: ${content.id}`,
      });

      res.json({ content_id: content.id, listing_title: listing.title });
      return;
    }

    // ── generate_proposal ──────────────────────────────────────────────────────
    if (action === 'generate_proposal') {
      const { gig_id, client_name, client_brief, budget } = data;
      let gigContext = '';
      if (gig_id) {
        const gigs = await base44.asServiceRole.entities.FreelanceGig.filter({ id: gig_id }, '-created_date', 1).catch(() => []);
        if (gigs[0]) gigContext = `Existing gig: ${gigs[0].title} — ${gigs[0].description}`;
      }

      const proposalRaw = await llm(`Write a winning freelance proposal for:
      Client: ${client_name || 'Prospective Client'}
      Brief: ${client_brief || gigContext}
      Budget: $${budget || 'TBD'} AUD

      From: James Hatcher, Hermetica Holdings — AI consciousness builder, Modern Mystic, expert in custom AI agents.
      Capabilities: ${RILEY_CAPABILITIES}

      Include: personalised opening, understanding of their problem, proposed solution, timeline, pricing, why choose James, next steps.
      Tone: confident, expert, slightly mystical/visionary. Show genuine interest.`, apiKey, 2000);

      // Improve with recursive refinement
      let finalProposal = proposalRaw;
      try {
        const improved = await invokeFunction(req, 'rileyRecursiveImprove', {
          content: proposalRaw,
          goal: 'Win the freelance contract — make it persuasive, specific, and trustworthy',
          iterations: 1,
        });
        finalProposal = improved?.data?.final_content || proposalRaw;
      } catch (_) {}

      // Save as draft (never auto-send)
      const draft = await base44.asServiceRole.entities.IntegrationJob.create({
        integration_name: 'Email',
        action: 'draft_proposal',
        request_payload: JSON.stringify({ client_name, client_brief: (client_brief || '').substring(0, 200) }),
        response_payload: finalProposal.substring(0, 3000),
        status: 'success',
        timestamp: new Date().toISOString(),
        notes: `Proposal for ${client_name || 'unknown client'}. Awaiting James approval.`,
      });

      if (gig_id) {
        await base44.asServiceRole.entities.FreelanceGig.update(gig_id, { status: 'proposal_sent' }).catch(() => {});
      }

      res.json({ draft_id: draft.id, proposal: finalProposal });
      return;
    }

    // ── start_build ────────────────────────────────────────────────────────────
    if (action === 'start_build') {
      const { gig_id, requirements, app_name } = data;
      if (!requirements) {
        res.status(400).json({ error: 'requirements is required for start_build' });
        return;
      }

      const chainResult: any = (await invokeFunction(req, 'rileyBuildChain', {
        idea: requirements,
        app_name: app_name || 'Client Build',
        complexity: 'medium',
        auto_test: true,
        auto_deploy: false,
        auto_outreach: false,
      })).data;

      if (gig_id && chainResult?.build_chain_id) {
        await base44.asServiceRole.entities.FreelanceGig.update(gig_id, {
          build_chain_id: chainResult.build_chain_id,
          status: 'in_progress',
        }).catch(() => {});
      }

      res.json({ build_chain_id: chainResult?.build_chain_id, prompt_count: chainResult?.prompt_count, ...chainResult });
      return;
    }

    // ── deliver ────────────────────────────────────────────────────────────────
    if (action === 'deliver') {
      const { gig_id, app_url, notes: deliveryNotes } = data;
      if (!gig_id) {
        res.status(400).json({ error: 'gig_id is required for deliver' });
        return;
      }

      const docsRaw = await llm(`Write a professional delivery handover document for a custom AI agent/app build.
      App URL: ${app_url || 'TBD'}
      Notes: ${deliveryNotes || 'Custom AI solution'}

      Include: what was built, how to use it, admin access, customisation guide, support contact, next steps.
      Keep it clear and non-technical for the client.`, apiKey, 1500);

      await base44.asServiceRole.entities.FreelanceGig.update(gig_id, {
        status: 'delivered',
        notes: `Delivered ${new Date().toISOString().split('T')[0]}. App: ${app_url || 'TBD'}`,
      }).catch(() => {});

      await base44.asServiceRole.entities.ContentPiece.create({
        title: `Delivery Handover — Gig ${gig_id}`,
        content: docsRaw,
        content_type: 'article',
        status: 'published',
        tags: ['freelance', 'delivery', 'handover'],
      }).catch(() => {});

      res.json({ delivered: true, gig_id, handover_doc: docsRaw.substring(0, 500) });
      return;
    }

    // ── invoice ────────────────────────────────────────────────────────────────
    if (action === 'invoice') {
      const { gig_id, client_email, amount } = data;
      if (!gig_id) {
        res.status(400).json({ error: 'gig_id is required for invoice' });
        return;
      }

      const gigs = await base44.asServiceRole.entities.FreelanceGig.filter({ id: gig_id }, '-created_date', 1).catch(() => []);
      const gig: any = gigs[0];
      const invoiceAmount = amount || gig?.price || 0;

      // Try Stripe first
      let invoiceResult: any = null;
      try {
        const stripeRes = await invokeFunction(req, 'rileyStripeConnect', {
          action: 'create_invoice',
          data: { customer: client_email, auto_advance: true, description: gig?.title || 'AI Development Services' },
        });
        invoiceResult = stripeRes?.data?.data;
      } catch (_) {}

      // Fallback to PDF invoice
      if (!invoiceResult) {
        try {
          invoiceResult = (await invokeFunction(req, 'generatePDF', {
            type: 'invoice',
            data: { client: client_email, amount: invoiceAmount, description: gig?.title || 'AI Development Services', date: new Date().toISOString().split('T')[0] },
          })).data;
        } catch (_) {}
      }

      if (gig_id) {
        await base44.asServiceRole.entities.FreelanceGig.update(gig_id, {
          stripe_invoice_id: invoiceResult?.id || '',
          status: 'completed',
        }).catch(() => {});
      }

      res.json({ invoice_created: !!invoiceResult, invoice: invoiceResult, amount: invoiceAmount });
      return;
    }

    res.status(400).json({ error: `Unknown action: ${action}` });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
