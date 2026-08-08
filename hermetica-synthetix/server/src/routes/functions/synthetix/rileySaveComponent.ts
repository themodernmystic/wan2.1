// Ported from synthetix-ai/base44/functions/rileySaveComponent/entry.ts
import { registerFunction } from '../registry.js';

/**
 * rileySaveComponent — Save reusable UI component to the library.
 * Input: { name, category, description, code_snippet, props, tags, used_in_app }
 */

registerFunction('rileySaveComponent', async (req, res, base44) => {
  try {
    const user = await base44.auth.me();
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { name, category = 'custom', description = '', code_snippet, props, tags = [], used_in_app } = req.body || {};
    if (!name || !code_snippet) {
      res.status(400).json({ error: 'name and code_snippet are required' });
      return;
    }

    const apiKey = process.env.OPENROUTER_API_KEY || '';

    // Auto-check brand compliance + accessibility
    let brand_compliant = false;
    let accessibilityScore = 70;
    try {
      const checkPrompt = `Analyse this React/Tailwind component code:\n\n${code_snippet.substring(0, 3000)}\n\nCheck:\n1. Does it use Hermetica brand colours (#0B0B0D, #D4AF37, #F5E8C7) or CSS variables that could map to them?\n2. Does it use Tailwind CSS?\n3. Is it accessible (aria labels, keyboard navigation, semantic HTML)?\n\nReturn JSON only: { "brand_compliant": true, "uses_tailwind": true, "accessibility_score": 80, "suggestions": ["..."] }`;

      const fetchRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'anthropic/claude-3-haiku', messages: [{ role: 'user', content: checkPrompt }], max_tokens: 400 }),
        signal: AbortSignal.timeout(20000),
      });
      const data: any = await fetchRes.json();
      const raw = data.choices?.[0]?.message?.content || '';
      const match = raw.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(match ? match[0] : raw);
      brand_compliant = parsed.brand_compliant || false;
      accessibilityScore = parsed.accessibility_score || 70;
    } catch (_) {}

    // Check if component with same name exists
    const existing: any = await base44.asServiceRole.entities.ComponentLibrary.filter({ name }, '-created_date', 1);

    let component: any;
    if (existing.length > 0) {
      const prev = existing[0];
      component = await base44.asServiceRole.entities.ComponentLibrary.update(prev.id, {
        category,
        description,
        code_snippet,
        props: typeof props === 'object' ? JSON.stringify(props) : props || '',
        tags: [...new Set([...(prev.tags || []), ...tags])],
        used_in_apps: used_in_app ? [...new Set([...(prev.used_in_apps || []), used_in_app])] : prev.used_in_apps,
        version: (prev.version || 1) + 1,
        brand_compliant,
        notes: `Updated v${(prev.version || 1) + 1}. Accessibility score: ${accessibilityScore}`,
      });
    } else {
      component = await base44.asServiceRole.entities.ComponentLibrary.create({
        name, category, description, code_snippet,
        props: typeof props === 'object' ? JSON.stringify(props) : props || '',
        tags,
        used_in_apps: used_in_app ? [used_in_app] : [],
        version: 1,
        brand_compliant,
        notes: `Created. Accessibility score: ${accessibilityScore}`,
      });
    }

    res.json({
      component_id: component.id,
      version: component.version,
      brand_compliant,
      accessibility_score: accessibilityScore,
      is_update: existing.length > 0,
    });
    return;
  } catch (error: any) {
    res.status(500).json({ error: error.message });
    return;
  }
});
