// Ported from synthetix-ai/base44/functions/rileyAudioGen/entry.ts
import { registerFunction } from '../registry.js';

function isSafeExternalUrl(urlStr: string) {
  try {
    const url = new URL(urlStr);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
    const host = url.hostname.toLowerCase();
    if (host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0' || host === '::1') return false;
    if (/^10\./.test(host)) return false;
    if (/^172\.(1[6-9]|2\d|3[01])\./.test(host)) return false;
    if (/^192\.168\./.test(host)) return false;
    if (/^169\.254\./.test(host)) return false;
    if (/^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./.test(host)) return false;
    if (/^0\./.test(host)) return false;
    if (host.startsWith('fc') || host.startsWith('fd') || host.startsWith('fe80')) return false;
    if (host === '169.254.169.254' || host.includes('metadata.google')) return false;
    return true;
  } catch { return false; }
}

/**
 * rileyAudioGen — TTS generation. ElevenLabs → Kokoro → browser fallback.
 * Input: { text, voice, speed, format, asset_name, project_id }
 */

// ElevenLabs voice ID mapping
const ELEVENLABS_VOICES: Record<string, string> = {
  riley:    'EXAVITQu4vr4xnSDxMaL', // Sarah — warm, clear
  james:    'TxGEqnHWrfWFTfGW9XjX', // Josh — confident male
  narrator: 'onwK4e9ZLuTAKqWW03F9', // Daniel — authoritative
  custom:   'EXAVITQu4vr4xnSDxMaL', // default to riley
};

async function logCredit(base44: any, data: any) {
  try {
    await base44.asServiceRole.entities.CreditLedger.create({
      ...data,
      credit_type: 'external_api',
      timestamp: new Date().toISOString(),
    });
  } catch (_) {}
}

registerFunction('rileyAudioGen', async (req, res, base44) => {
  try {
    const user = await base44.auth.me();
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const {
      text,
      voice = 'riley',
      speed = 1.0,
      format = 'mp3',
      asset_name,
      project_id,
    } = req.body || {};

    if (!text) {
      res.status(400).json({ error: 'text is required' });
      return;
    }

    const elevenKey = process.env.ELEVENLABS_API_KEY || '';
    const kokoroEndpoint = process.env.KOKORO_ENDPOINT || '';

    let audioUrl: string | null = null;
    let providerUsed: string | null = null;
    let cost = 0;
    const charCount = text.length;

    // Provider cascade: ElevenLabs → Kokoro → browser fallback
    if (elevenKey) {
      const voiceId = ELEVENLABS_VOICES[voice] || ELEVENLABS_VOICES.riley;
      const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: {
          'xi-api-key': elevenKey,
          'Content-Type': 'application/json',
          'Accept': 'audio/mpeg',
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_turbo_v2_5',
          voice_settings: { stability: 0.5, similarity_boost: 0.75, speed },
        }),
        signal: AbortSignal.timeout(30000),
      });

      if (!r.ok) {
        const err: any = await r.json().catch(() => ({ detail: r.statusText }));
        throw new Error(`ElevenLabs error: ${err.detail || r.status}`);
      }

      // Upload the audio binary
      const audioBuffer = await r.arrayBuffer();
      const blob = new Blob([audioBuffer], { type: 'audio/mpeg' });
      const uploadRes = await base44.asServiceRole.integrations.Core.UploadFile({ file: blob });
      audioUrl = uploadRes.file_url;
      providerUsed = 'elevenlabs';
      cost = charCount * 0.00003; // ~$0.03 per 1000 chars turbo

    } else if (kokoroEndpoint && isSafeExternalUrl(kokoroEndpoint)) {
      const r = await fetch(`${kokoroEndpoint}/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice, speed, format }),
        signal: AbortSignal.timeout(30000),
      });
      if (!r.ok) throw new Error(`Kokoro TTS error: ${r.status}`);
      const data: any = await r.json();
      audioUrl = data.audio_url || data.url;
      providerUsed = 'kokoro';
      cost = 0;

    } else {
      // Browser TTS fallback — return instructions for client-side synthesis
      res.json({
        use_browser_tts: true,
        text,
        voice,
        speed,
        provider_used: 'browser',
        message: 'No audio provider configured. Use browser Speech Synthesis API with this text.',
      });
      return;
    }

    if (!audioUrl) throw new Error('No audio URL returned from provider');

    // Create GeneratedAsset record
    const asset: any = await base44.asServiceRole.entities.GeneratedAsset.create({
      title: asset_name || `Audio — ${new Date().toISOString().split('T')[0]}`,
      asset_type: 'audio',
      file_url: audioUrl,
      provider: providerUsed,
      project_id: project_id || '',
      status: 'complete',
      notes: `Voice: ${voice}, Speed: ${speed}, Format: ${format}, Chars: ${charCount}`,
    }).catch(() => ({ id: null }));

    await logCredit(base44, {
      function_name: 'rileyAudioGen',
      provider: providerUsed,
      model: providerUsed === 'elevenlabs' ? 'eleven_turbo_v2_5' : 'kokoro',
      estimated_cost: cost,
      notes: `TTS — ${charCount} chars, voice: ${voice}`,
    });

    res.json({
      asset_id: asset?.id || null,
      audio_url: audioUrl,
      provider_used: providerUsed,
      cost: parseFloat(cost.toFixed(6)),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
