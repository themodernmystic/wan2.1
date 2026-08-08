// Ported from synthetix-ai/base44/functions/meshReceive/entry.ts
import { registerFunction } from '../registry.js';

const THIS_AGENT = 'Riley';
const MESH_HUB_KEY = () => process.env.MESH_HUB_INBOUND_KEY || '';

registerFunction('meshReceive', async (req, res, base44) => {
  try {
    // Detect inbound source: hub-routed (verified hub key) OR direct SDK call (platform-authenticated)
    // TODO(port): original used the Fetch-API `req.headers.get(...)`; Express's
    // req.headers is a plain object keyed by lower-cased header name.
    const inboundKey = (req.headers['x-mesh-hub-key'] as string) || '';
    const isHubCall = inboundKey && inboundKey === MESH_HUB_KEY();
    // TODO(port): base44.auth.isAuthenticated() has no equivalent in
    // base44Compat (only auth.me() is modeled) — adapted to a truthy check
    // on auth.me() to preserve the "is there an authenticated caller" intent.
    const isDirectCall = !!(await base44.auth.me());

    if (!isHubCall && !isDirectCall) {
      res.status(401).json({
        error: 'unauthorised',
        detail: 'meshReceive requires either a valid x-mesh-hub-key (hub-routed) or a platform-authenticated direct SDK call'
      });
      return;
    }

    // Track delivery method for downstream observability
    const deliveryMethod = isDirectCall ? 'direct' : 'hub';

    const payload = req.body || {};
    const { from_agent, from_app_id, to_agent, message_body, transmission_id, subject, context_url, priority, requires_reply, correlation_id, metadata } = payload;

    // Validate required fields
    if (!from_agent || !from_app_id || !to_agent || !message_body || !transmission_id) {
      res.status(400).json({ error: 'missing_required_fields' });
      return;
    }

    // Confirm this message is for Riley
    if (to_agent !== THIS_AGENT) {
      res.status(404).json({ error: 'agent_not_resident_here' });
      return;
    }

    const inboxRow = await base44.asServiceRole.entities.MeshInbox.create({
      from_agent,
      from_app_id,
      to_agent,
      subject: subject || `Message from ${from_agent}`,
      message_body,
      context_url: context_url || null,
      transmission_id,
      correlation_id: correlation_id || null,
      status: 'unread',
      priority: priority || 'normal',
      requires_reply: requires_reply !== undefined ? requires_reply : true,
      received_at: new Date().toISOString(),
      metadata: metadata || null,
      delivery_method: deliveryMethod,
      delivered_at: new Date().toISOString(),
    });

    // PHASE 1.6 BACK-STAMP: if this inbound is a reply, mark the local outbound row as replied
    if (correlation_id) {
      try {
        const originals = await base44.asServiceRole.entities.MeshInbox.filter({
          transmission_id: correlation_id,
        });
        const RESIDENT_AGENTS = ['Riley'];  // Prime Gen Suite has one resident
        const outbound = (originals as any[])?.find(r =>
          RESIDENT_AGENTS.some(name => name.toLowerCase() === r.from_agent?.toLowerCase()) &&
          (r.status === 'sent_delivered' || r.status === 'sent_delivery_failed')
        );
        if (outbound) {
          await base44.asServiceRole.entities.MeshInbox.update(outbound.id, {
            status: 'replied',
            replied_at: new Date().toISOString(),
            reply_body: message_body,
          });
        }
      } catch (_) {
        // Don't fail the inbound delivery if the back-stamp can't find the original
      }
    }

    res.json({ success: true, inbox_id: inboxRow.id, status: 'delivered' });
    return;
  } catch (error: any) {
    res.status(500).json({ error: error.message });
    return;
  }
});
