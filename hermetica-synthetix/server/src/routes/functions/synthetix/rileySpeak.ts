// Ported from synthetix-ai/base44/functions/rileySpeak/entry.ts
import { registerFunction } from '../registry.js';

registerFunction('rileySpeak', async (req, res, base44) => {
  try {
    const user = await base44.auth.me();
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { text, voice = 'default', speed = 1.0, provider = 'kokoro' } = req.body || {};
    if (!text) {
      res.status(400).json({ error: 'text is required' });
      return;
    }

    if (provider === 'browser') {
      res.json({ use_browser_tts: true });
      return;
    }

    if (provider === 'kokoro') {
      const endpoint = process.env.KOKORO_ENDPOINT;
      if (!endpoint) {
        res.json({ use_browser_tts: true, fallback_reason: 'KOKORO_ENDPOINT not set' });
        return;
      }

      const r = await fetch(`${endpoint}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice, speed }),
      });

      if (!r.ok) {
        res.json({ use_browser_tts: true, fallback_reason: `Kokoro error: ${r.status}` });
        return;
      }

      const audioBuffer = await r.arrayBuffer();
      const contentType = r.headers.get('content-type') || 'audio/wav';

      res
        .status(200)
        .set({
          'Content-Type': contentType,
          'Cache-Control': 'no-cache',
        })
        .send(Buffer.from(audioBuffer));
      return;
    }

    res.status(400).json({ error: `Unknown provider: ${provider}` });
    return;

  } catch (error: any) {
    res.json({ use_browser_tts: true, fallback_reason: error.message });
  }
});
