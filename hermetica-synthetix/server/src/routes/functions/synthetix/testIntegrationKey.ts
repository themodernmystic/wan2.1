// Ported from synthetix-ai/base44/functions/testIntegrationKey/entry.ts
import { registerFunction } from '../registry.js';

// Minimal live test per provider key
async function runTest(secretKey: string) {
  const value = process.env[secretKey];
  if (!value || value.trim() === '') return { ok: false, reason: 'Secret not set in environment' };

  try {
    if (secretKey === 'OPENAI_API_KEY') {
      const r = await fetch('https://api.openai.com/v1/models', {
        headers: { Authorization: `Bearer ${value}` },
        signal: AbortSignal.timeout(10000)
      });
      if (r.ok) return { ok: true };
      const err: any = await r.json().catch(() => ({}));
      return { ok: false, reason: err?.error?.message || `HTTP ${r.status}` };
    }

    if (secretKey === 'OPENROUTER_API_KEY') {
      const r = await fetch('https://openrouter.ai/api/v1/models', {
        headers: { Authorization: `Bearer ${value}` },
        signal: AbortSignal.timeout(10000)
      });
      if (r.ok) return { ok: true };
      return { ok: false, reason: `HTTP ${r.status}` };
    }

    if (secretKey === 'GROK_API_KEY') {
      const r = await fetch('https://api.x.ai/v1/models', {
        headers: { Authorization: `Bearer ${value}` },
        signal: AbortSignal.timeout(10000)
      });
      if (r.ok) return { ok: true };
      return { ok: false, reason: `HTTP ${r.status}` };
    }

    if (secretKey === 'ELEVENLABS_API_KEY') {
      const r = await fetch('https://api.elevenlabs.io/v1/user', {
        headers: { 'xi-api-key': value },
        signal: AbortSignal.timeout(10000)
      });
      if (r.ok) return { ok: true };
      return { ok: false, reason: `HTTP ${r.status}` };
    }

    if (secretKey === 'REPLICATE_API_KEY') {
      const r = await fetch('https://api.replicate.com/v1/account', {
        headers: { Authorization: `Token ${value}` },
        signal: AbortSignal.timeout(10000)
      });
      if (r.ok) return { ok: true };
      const err: any = await r.json().catch(() => ({}));
      return { ok: false, reason: err?.detail || `HTTP ${r.status}` };
    }

    if (secretKey === 'RUNWAY_API_KEY') {
      const r = await fetch('https://api.runwayml.com/v1/teams', {
        headers: { Authorization: `Bearer ${value}`, 'X-Runway-Version': '2024-11-06' },
        signal: AbortSignal.timeout(10000)
      });
      if (r.ok) return { ok: true };
      const err: any = await r.json().catch(() => ({}));
      return { ok: false, reason: err?.error || err?.message || `HTTP ${r.status}` };
    }

    if (secretKey === 'VERCEL_API_KEY' || secretKey === 'VERCEL_API_TOKEN') {
      const r = await fetch('https://api.vercel.com/v2/user', {
        headers: { Authorization: `Bearer ${value}` },
        signal: AbortSignal.timeout(10000)
      });
      if (r.ok) return { ok: true };
      const err: any = await r.json().catch(() => ({}));
      return { ok: false, reason: err?.error?.message || `HTTP ${r.status}` };
    }

    if (secretKey === 'HUGGINGFACE_API_KEY') {
      const r = await fetch('https://huggingface.co/api/whoami-v2', {
        headers: { Authorization: `Bearer ${value}` },
        signal: AbortSignal.timeout(10000)
      });
      if (r.ok) return { ok: true };
      return { ok: false, reason: `HTTP ${r.status}` };
    }

    if (secretKey === 'FAL_API_KEY' || secretKey === 'FAL_KEY') {
      // fal.ai doesn't have a cheap ping endpoint; just confirm the key is present
      return { ok: true, reason: 'Key present (live validation not available for fal.ai)' };
    }

    if (secretKey === 'STABILITY_API_KEY') {
      const r = await fetch('https://api.stability.ai/v1/user/account', {
        headers: { Authorization: `Bearer ${value}` },
        signal: AbortSignal.timeout(10000)
      });
      if (r.ok) return { ok: true };
      return { ok: false, reason: `HTTP ${r.status}` };
    }

    if (secretKey === 'RESEND_API_KEY') {
      const r = await fetch('https://api.resend.com/domains', {
        headers: { Authorization: `Bearer ${value}` },
        signal: AbortSignal.timeout(10000)
      });
      if (r.ok) return { ok: true };
      return { ok: false, reason: `HTTP ${r.status}` };
    }

    if (secretKey === 'SENDGRID_API_KEY') {
      const r = await fetch('https://api.sendgrid.com/v3/user/account', {
        headers: { Authorization: `Bearer ${value}` },
        signal: AbortSignal.timeout(10000)
      });
      if (r.ok) return { ok: true };
      return { ok: false, reason: `HTTP ${r.status}` };
    }

    // Generic: key is present but no specific test
    return { ok: true, reason: 'Key present (no live ping available for this provider)' };

  } catch (e: any) {
    return { ok: false, reason: e.message };
  }
}

registerFunction('testIntegrationKey', async (req, res, base44) => {
  try {
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      res.status(403).json({ error: 'Admin only' });
      return;
    }

    const { secret_key } = req.body || {};
    if (!secret_key) {
      res.status(400).json({ error: 'secret_key required' });
      return;
    }

    const result = await runTest(secret_key);
    res.json({ secret_key, ...result });
    return;
  } catch (error: any) {
    res.status(500).json({ error: error.message });
    return;
  }
});
