// Ported from synthetix-ai/base44/functions/heartbeatTest/entry.ts
import { registerFunction } from '../registry.js';

registerFunction('heartbeatTest', async (req, res, base44) => {
  try {
    const user = await base44.auth.me();
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    console.log(`[test] User: ${user.email}, role: ${(user as any).role}`);

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: 'Say exactly: "heartbeat test ok"'
    } as any);

    res.json({ ok: true, result, user_email: user.email });
  } catch (error: any) {
    console.log(`[test] Error: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});
