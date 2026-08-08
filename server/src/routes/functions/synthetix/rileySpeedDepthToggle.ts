// Ported from synthetix-ai/base44/functions/rileySpeedDepthToggle/entry.ts
import { registerFunction } from '../registry.js';

/**
 * rileySpeedDepthToggle — Detect fast vs deep intent from message signals.
 * Input: { message, context, override }
 */

const FAST_SIGNALS = ['quick', 'just', 'real quick', 'yes', 'no', 'go', 'do it', 'ok', 'sure', 'yep', 'k ', 'done', 'now', 'asap'];
const DEEP_SIGNALS = ['explain', 'why', 'how does', 'walk me through', 'what do you think', 'strategy', 'plan', 'analyse', 'analyze', 'compare', 'pros and cons', 'should i', 'recommend', 'which is better', 'help me understand'];

const FAST_MODEL = 'deepseek/deepseek-chat';
const DEEP_MODEL = 'anthropic/claude-3.5-sonnet';

registerFunction('rileySpeedDepthToggle', async (req, res, base44) => {
  try {
    const user = await base44.auth.me();
    if (!user) { res.status(401).json({ error: 'Unauthorized' }); return; }

    const body = req.body || {};
    const { message, context = '', override = 'auto' } = body;
    if (!message) { res.status(400).json({ error: 'message is required' }); return; }

    // If override specified, return immediately
    if (override === 'fast') {
      res.json({ mode: 'fast', confidence: 100, recommended_model: FAST_MODEL, max_words: 100, signals_detected: ['override:fast'] });
      return;
    }
    if (override === 'deep') {
      res.json({ mode: 'deep', confidence: 100, recommended_model: DEEP_MODEL, max_words: null, signals_detected: ['override:deep'] });
      return;
    }

    const lower = message.toLowerCase();
    const signalsDetected: string[] = [];
    let fastScore = 0;
    let deepScore = 0;

    // Heuristic checks (no API call needed for clear cases)
    if (message.length < 30) fastScore += 20;
    if (message.length > 150) deepScore += 20;
    if (/^[^a-z]*[?!]$/i.test(message.trim())) fastScore += 15; // single punctuation
    if ((message.match(/\?/g) || []).length > 1) deepScore += 15; // multiple questions

    for (const sig of FAST_SIGNALS) {
      if (lower.includes(sig)) { fastScore += 10; signalsDetected.push(`fast:${sig}`); }
    }
    for (const sig of DEEP_SIGNALS) {
      if (lower.includes(sig)) { deepScore += 15; signalsDetected.push(`deep:${sig}`); }
    }

    // Only call LLM if heuristics are ambiguous
    if (Math.abs(fastScore - deepScore) < 20) {
      const apiKey = process.env.OPENROUTER_API_KEY || '';
      try {
        const llmRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'deepseek/deepseek-chat',
            messages: [{ role: 'user', content: `Classify this message by desired response depth. FAST = quick answer needed. DEEP = thorough analysis needed.\n\nMessage: "${message}"\n\nReturn JSON only: { "mode": "fast", "confidence": 75, "signals": ["..."] }` }],
            max_tokens: 150,
          }),
          signal: AbortSignal.timeout(10000),
        });
        const data: any = await llmRes.json();
        const raw = data.choices?.[0]?.message?.content || '';
        try {
          const match = raw.match(/\{[\s\S]*\}/);
          const parsed = JSON.parse(match ? match[0] : raw);
          const mode = parsed.mode === 'deep' ? 'deep' : 'fast';
          res.json({
            mode,
            confidence: parsed.confidence || 70,
            recommended_model: mode === 'fast' ? FAST_MODEL : DEEP_MODEL,
            max_words: mode === 'fast' ? 100 : null,
            signals_detected: parsed.signals || signalsDetected,
          });
          return;
        } catch (_) {}
      } catch (_) {}
    }

    const mode = deepScore > fastScore ? 'deep' : 'fast';
    const confidence = Math.min(95, 50 + Math.abs(deepScore - fastScore));

    res.json({
      mode,
      confidence,
      recommended_model: mode === 'fast' ? FAST_MODEL : DEEP_MODEL,
      max_words: mode === 'fast' ? 100 : null,
      signals_detected: signalsDetected,
    });
    return;
  } catch (error: any) {
    res.status(500).json({ error: error.message });
    return;
  }
});
