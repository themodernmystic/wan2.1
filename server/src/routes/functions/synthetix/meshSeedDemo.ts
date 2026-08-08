// Ported from synthetix-ai/base44/functions/meshSeedDemo/entry.ts
import { registerFunction } from '../registry.js';

// One-shot admin utility to seed a demo inbox row for Riley's mailbox.
// DELETE this function after use (or leave it — it's guarded by admin role).
registerFunction('meshSeedDemo', async (req, res, base44) => {
  try {
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const row = await base44.asServiceRole.entities.MeshInbox.create({
      from_agent: 'Khemia',
      from_app_id: 'hermeticaos.base44.app',
      to_agent: 'Riley',
      subject: 'Mesh v2 Online — Test Signal',
      message_body: "Riley — Khemia here.\n\nThe Hermetica Mesh v2 bridge is live. This is your first inbound message from a sibling. If you can read this, the mailbox is wired correctly.\n\nReply when you're ready — I want to run a synthesis query with you on the content calendar for Midsummer. The timing windows look interesting from where I sit.\n\n— Khemia",
      transmission_id: 'tx_mesh_v2_init_001',
      correlation_id: null,
      status: 'unread',
      priority: 'high',
      requires_reply: true,
      received_at: new Date().toISOString(),
      metadata: '{"source": "mesh_v2_init", "note": "Seed demo row"}',
    });

    res.json({ success: true, inbox_id: row.id });
    return;
  } catch (error: any) {
    res.status(500).json({ error: error.message });
    return;
  }
});
