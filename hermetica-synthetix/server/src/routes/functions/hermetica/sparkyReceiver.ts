// Ported from hermetica-forge/base44/functions/sparkyReceiver/entry.ts
//
// TODO(port): the original Deno.serve handler branched on `req.method` (GET vs
// POST/other) and derived the `action` either from a URL path segment
// (e.g. POST /sparkyReceiver/handoff) or from the JSON body's `action` field,
// and read the bearer token via the Fetch API's `req.headers.get('authorization')`.
// registerFunction() here only mounts a single `POST /sparkyReceiver` route (see
// ../registry.ts, which this port must not modify), so:
//   - GET support is unreachable in this deployment; the original `req.method === 'GET'`
//     branch (which skipped body parsing) is kept for fidelity but never actually
//     takes the GET path here — the only way to invoke this function is a POST with a
//     JSON body, so `action` will in practice always come from `body.action`.
//   - Path-segment action resolution is kept (using Express's `req.path` in place of
//     the Fetch API's `new URL(req.url).pathname`) but is effectively dead code for the
//     same reason: there is no route registered for `/sparkyReceiver/<action>` sub-paths.
//   - `req.headers.get('authorization')` (Fetch API) is translated to Express's
//     `req.headers['authorization']` (a plain header object, not a Headers instance).
import type { Request } from 'express';
import { registerFunction } from '../registry.js';

const CONTINUUM_APP_ID = '6a575dae759409e5770c0c94';
const SPARKY_AGENT_ID = 'agent_sparky';

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value.normalize('NFC'));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function actionFrom(req: Request, body: Record<string, unknown>) {
  const segments = String(req.path || '').split('/').filter(Boolean);
  const receiverIndex = segments.lastIndexOf('sparkyReceiver');
  return String(body.action || (receiverIndex >= 0 ? segments[receiverIndex + 1] : '') || '').toLowerCase();
}

function bearerToken(req: Request) {
  const header = (req.headers['authorization'] as string) || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || '';
}

function canonicalDelivery(input: {
  correlation_id: string;
  source_event_id: string;
  source_content_hash: string;
  content: string;
}) {
  return JSON.stringify({
    correlation_id: input.correlation_id,
    source_event_id: input.source_event_id,
    source_content_hash: input.source_content_hash,
    content: input.content.normalize('NFC'),
  });
}

type GatewayError = { status: number; body: any };

async function authenticateGateway(base44: any, req: Request, requiredAction: string): Promise<{ error: GatewayError } | { credential: any }> {
  const token = bearerToken(req);
  if (!token) return { error: { status: 401, body: { error: 'Missing bearer token' } } };

  const credentials = await base44.asServiceRole.entities.AgentGatewayCredential.list('-issued_at', 100);
  const latest = (credentials || [])
    .filter((item: any) => item.agent_identity_id === SPARKY_AGENT_ID && item.active !== false)
    .sort((a: any, b: any) => String(b.issued_at || '').localeCompare(String(a.issued_at || '')))[0];

  if (!latest) return { error: { status: 503, body: { error: 'Sparky receiver is not configured' } } };
  if (latest.expires_at && new Date(latest.expires_at).getTime() <= Date.now()) {
    return { error: { status: 401, body: { error: 'Bearer token expired' } } };
  }

  const presentedHash = await sha256(token);
  if (presentedHash !== latest.token_hash) {
    return { error: { status: 401, body: { error: 'Invalid bearer token' } } };
  }
  if (!(latest.allowed_actions || []).includes(requiredAction)) {
    return { error: { status: 403, body: { error: 'Action outside receiver policy', action: requiredAction } } };
  }
  return { credential: latest };
}

registerFunction('sparkyReceiver', async (req, res, base44) => {
  try {
    const body: Record<string, any> = req.method === 'GET' ? {} : req.body || {};
    const action = actionFrom(req, body);

    if (action === 'configure') {
      const user: any = await base44.auth.me();
      if (!user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      if (user.role !== 'admin') {
        res.status(403).json({ error: 'Admin only' });
        return;
      }

      const tokenHash = String(body.token_hash || '');
      const gatewayPolicyId = String(body.gateway_policy_id || '');
      const issuedAt = String(body.issued_at || new Date().toISOString());
      const expiresAt = String(body.expires_at || '');
      const allowedActions = Array.isArray(body.allowed_actions) ? body.allowed_actions.map(String) : [];

      if (!/^[a-f0-9]{64}$/.test(tokenHash) || !gatewayPolicyId || !expiresAt) {
        res.status(400).json({ error: 'token_hash, gateway_policy_id, and expires_at are required' });
        return;
      }
      if (new Date(expiresAt).getTime() <= Date.now()) {
        res.status(400).json({ error: 'expires_at must be in the future' });
        return;
      }

      const existing: any = await base44.asServiceRole.entities.AgentGatewayCredential.filter({ gateway_policy_id: gatewayPolicyId });
      if (existing?.length) {
        res.json({
          status: 'configured',
          idempotent: true,
          receiver_policy_id: existing[0].gateway_policy_id,
          receiver_record_id: existing[0].id,
        });
        return;
      }

      const receiver: any = await base44.asServiceRole.entities.AgentGatewayCredential.create({
        gateway_policy_id: gatewayPolicyId,
        agent_identity_id: SPARKY_AGENT_ID,
        source_app_id: CONTINUUM_APP_ID,
        token_hash: tokenHash,
        allowed_actions: allowedActions,
        issued_at: issuedAt,
        expires_at: expiresAt,
        active: true,
        immutable: true,
      });

      res.json({
        status: 'configured',
        receiver_policy_id: gatewayPolicyId,
        receiver_record_id: receiver.id,
        raw_token_stored: false,
      });
      return;
    }

    if (action === 'handoff') {
      const auth = await authenticateGateway(base44, req, 'handoff_to_forge');
      if ('error' in auth) {
        res.status(auth.error.status).json(auth.error.body);
        return;
      }

      const correlationId = String(body.correlation_id || '');
      const sourceEventId = String(body.source_event_id || '');
      const sourceContentHash = String(body.source_content_hash || '');
      const content = String(body.content || '');
      const toAgentId = String(body.to_agent_id || 'forge_master');
      const toAgentName = String(body.to_agent_name || 'Forge Master');

      if (!correlationId || !sourceEventId || !/^[a-f0-9]{64}$/.test(sourceContentHash) || !content) {
        res.status(400).json({ error: 'correlation_id, source_event_id, source_content_hash, and content are required' });
        return;
      }
      if (new TextEncoder().encode(content).byteLength > 12000) {
        res.status(413).json({ error: 'Handoff content exceeds 12000 bytes' });
        return;
      }

      const deliveryHash = await sha256(canonicalDelivery({
        correlation_id: correlationId,
        source_event_id: sourceEventId,
        source_content_hash: sourceContentHash,
        content,
      }));

      const existing: any = await base44.asServiceRole.entities.AgentMessage.filter({
        correlation_id: correlationId,
        source_event_id: sourceEventId,
      });
      if (existing?.length) {
        const message = existing[0];
        const recomputed = await sha256(canonicalDelivery({
          correlation_id: message.correlation_id,
          source_event_id: message.source_event_id,
          source_content_hash: message.source_content_hash,
          content: message.content,
        }));
        res.json({
          status: message.delivery_status || 'delivered',
          idempotent: true,
          forge_message_id: message.id,
          delivery_hash: message.delivery_hash,
          computed_delivery_hash: recomputed,
          hash_match: message.delivery_hash === recomputed,
        });
        return;
      }

      const message: any = await base44.asServiceRole.entities.AgentMessage.create({
        from_agent_id: SPARKY_AGENT_ID,
        from_agent_name: 'Sparky GPT',
        to_agent_id: toAgentId,
        to_agent_name: toAgentName,
        project_id: body.project_id || null,
        task_id: body.task_id || null,
        message_type: 'handoff',
        content: content.normalize('NFC'),
        metadata: JSON.stringify({
          source: 'Hermetica Continuum Sparky Gateway',
          gateway_policy_id: auth.credential.gateway_policy_id,
        }),
        correlation_id: correlationId,
        source_app_id: CONTINUUM_APP_ID,
        source_event_id: sourceEventId,
        source_content_hash: sourceContentHash,
        delivery_hash: deliveryHash,
        delivery_status: 'delivered',
        verified_at: '',
        creation_channel: 'backend_verified',
        is_read: false,
        requires_response: true,
      });

      res.json({
        status: 'delivered',
        forge_message_id: message.id,
        correlation_id: correlationId,
        source_event_id: sourceEventId,
        source_content_hash: sourceContentHash,
        delivery_hash: deliveryHash,
        hash_match: true,
      });
      return;
    }

    if (action === 'inbox') {
      const auth = await authenticateGateway(base44, req, 'verify_forge_inbox');
      if ('error' in auth) {
        res.status(auth.error.status).json(auth.error.body);
        return;
      }

      const correlationId = String(body.correlation_id || req.query.correlation_id || '');
      const sourceEventId = String(body.source_event_id || req.query.source_event_id || '');
      if (!correlationId || !sourceEventId) {
        res.status(400).json({ error: 'correlation_id and source_event_id are required' });
        return;
      }

      const messages: any = await base44.asServiceRole.entities.AgentMessage.filter({
        correlation_id: correlationId,
        source_event_id: sourceEventId,
      }, '-created_date', 10);
      if (!messages?.length) {
        res.status(404).json({ status: 'not_found', inbox_verified: false });
        return;
      }

      const message = messages[0];
      const computedDeliveryHash = await sha256(canonicalDelivery({
        correlation_id: message.correlation_id,
        source_event_id: message.source_event_id,
        source_content_hash: message.source_content_hash,
        content: message.content,
      }));
      const hashMatch = message.delivery_hash === computedDeliveryHash;
      if (hashMatch && message.delivery_status !== 'verified') {
        await base44.asServiceRole.entities.AgentMessage.update(message.id, {
          delivery_status: 'verified',
          verified_at: new Date().toISOString(),
        });
      }

      res.status(hashMatch ? 200 : 409).json({
        status: hashMatch ? 'verified' : 'hash_mismatch',
        inbox_verified: hashMatch,
        forge_message_id: message.id,
        correlation_id: message.correlation_id,
        source_event_id: message.source_event_id,
        source_content_hash: message.source_content_hash,
        stored_delivery_hash: message.delivery_hash,
        computed_delivery_hash: computedDeliveryHash,
        hash_match: hashMatch,
        is_read: message.is_read,
        requires_response: message.requires_response,
      });
      return;
    }

    res.status(404).json({ error: 'Unknown receiver action', action });
    return;
  } catch (error: any) {
    res.status(500).json({ error: error.message });
    return;
  }
});
