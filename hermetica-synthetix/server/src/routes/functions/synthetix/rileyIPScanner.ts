// Ported from synthetix-ai/base44/functions/rileyIPScanner/entry.ts
import { registerFunction } from '../registry.js';

/**
 * rileyIPScanner — Scan all assets to identify and catalogue intellectual property.
 * Input: { scan_scope, project_id, days_back }
 */

registerFunction('rileyIPScanner', async (req, res, base44) => {
  try {
    const user = await base44.auth.me();
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { scan_scope = 'all', project_id, days_back = 90 } = req.body || {};
    const apiKey = process.env.OPENROUTER_API_KEY || '';
    const since = new Date(Date.now() - days_back * 24 * 60 * 60 * 1000).toISOString();

    // Read all asset types in parallel
    const [memories, blueprints, agentBuilds, contentPieces, components, promptTemplates, soulCore, consensusSessions]: any[] = await Promise.all([
      base44.asServiceRole.entities.RileyMemory.filter({ category: 'Technical Decision' }, '-created_date', 30).catch(() => []),
      base44.asServiceRole.entities.AppBlueprint.list('-created_date', 20).catch(() => []),
      base44.asServiceRole.entities.AgentBuild.list('-created_date', 20).catch(() => []),
      base44.asServiceRole.entities.ContentPiece.list('-created_date', 30).catch(() => []),
      base44.asServiceRole.entities.ComponentLibrary.list('-created_date', 20).catch(() => []),
      base44.asServiceRole.entities.PromptTemplate.list('-created_date', 20).catch(() => []),
      base44.asServiceRole.entities.SoulCoreEntry.filter({ active: true }, '-created_date', 20).catch(() => []),
      base44.asServiceRole.entities.ConsensusSession.list('-created_date', 10).catch(() => []),
    ]);

    // Summarise for LLM (keep tokens manageable)
    const assetSummary = {
      memories: memories.slice(0, 15).map((m: any) => ({ title: m.title, category: m.category, content: (m.content || '').substring(0, 200) })),
      blueprints: blueprints.slice(0, 10).map((b: any) => ({ name: b.app_name || b.name, description: (b.description || '').substring(0, 150) })),
      agents: agentBuilds.slice(0, 10).map((a: any) => ({ name: a.name, purpose: (a.purpose || '').substring(0, 100) })),
      content: contentPieces.slice(0, 10).map((c: any) => ({ title: c.title, type: c.content_type })),
      components: components.slice(0, 10).map((c: any) => ({ name: c.name, category: c.category })),
      prompts: promptTemplates.slice(0, 10).map((p: any) => ({ name: p.name, task_type: p.task_type })),
      soul_core: soulCore.slice(0, 5).map((s: any) => ({ title: s.title, category: s.category })),
      methodologies: consensusSessions.slice(0, 5).map((s: any) => ({ name: s.session_name, task_type: s.task_type })),
    };

    const prompt = `Review these Hermetica Holdings digital assets and identify intellectual property worth protecting or licensing.

Assets inventory:
${JSON.stringify(assetSummary, null, 2).substring(0, 5000)}

For each significant IP asset found, classify:
- Type: architecture/algorithm/prompt_pattern/brand/trademark/content/methodology/dataset/agent_personality/mythology/design_system/course/book/software
- Commercial value: low/medium/high/premium/priceless
- Licensable: could another company pay to use this?
- Protection recommendation: trademark/copyright/patent/trade_secret/document
- Estimated annual licensing price (AUD) if licensable
- Origin: which source record

Return JSON only:
{
  "ip_assets": [
    { "name": "...", "type": "prompt_pattern", "description": "...", "commercial_value": "high", "licensable": true, "license_price_estimate": 5000, "protection_recommendation": "trade_secret", "origin": "..." }
  ],
  "total_estimated_ip_value": 50000,
  "top_licensable_assets": ["...", "..."],
  "urgent_protection_needed": ["..."]
}`;

    const fetchRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'anthropic/claude-3.5-sonnet', messages: [{ role: 'user', content: prompt }], max_tokens: 3000 }),
      signal: AbortSignal.timeout(60000),
    });
    const llmData: any = await fetchRes.json();
    if (llmData.error) throw new Error(llmData.error.message);

    const raw = llmData.choices[0].message.content;
    let analysis: any;
    try {
      const match = raw.match(/\{[\s\S]*\}/);
      analysis = JSON.parse(match ? match[0] : raw);
    } catch (_) {
      analysis = { ip_assets: [], total_estimated_ip_value: 0, top_licensable_assets: [], urgent_protection_needed: [] };
    }

    const assets = analysis.ip_assets || [];
    const createdIds: string[] = [];

    for (const asset of assets) {
      const record: any = await base44.asServiceRole.entities.IPAsset.create({
        name: asset.name,
        type: asset.type || 'methodology',
        description: asset.description || '',
        origin: asset.origin || 'rileyIPScanner auto-discovery',
        protection_status: 'documented',
        commercial_value: asset.commercial_value || 'medium',
        licensable: asset.licensable || false,
        license_price: asset.license_price_estimate || null,
        created_date_actual: new Date().toISOString().split('T')[0],
        notes: `Protection rec: ${asset.protection_recommendation}. Scanned ${new Date().toISOString().split('T')[0]}.`,
      }).catch(() => null);
      if (record) createdIds.push(record.id);
    }

    const licensableAssets = assets.filter((a: any) => a.licensable);

    // Create IntelligenceReport
    const report: any = await base44.asServiceRole.entities.IntelligenceReport.create({
      title: `IP Portfolio Scan — ${new Date().toISOString().split('T')[0]}`,
      report_type: 'trend_analysis',
      summary: `Identified ${assets.length} IP assets. ${licensableAssets.length} licensable. Estimated total value: $${analysis.total_estimated_ip_value?.toLocaleString() || 0} AUD.`,
      full_report: JSON.stringify(analysis),
      relevance_score: 90,
      urgency: (analysis.urgent_protection_needed || []).length > 0 ? 'act_soon' : 'monitor',
      action_items: JSON.stringify(analysis.urgent_protection_needed || []),
      auto_generated: true,
      james_read: false,
      tags: ['ip_scan', 'vault', 'passive_revenue'],
    });

    res.json({
      assets_identified: createdIds.length,
      total_value: analysis.total_estimated_ip_value,
      licensable_count: licensableAssets.length,
      report_id: report.id,
      urgent_protection: analysis.urgent_protection_needed || [],
    });
    return;
  } catch (error: any) {
    res.status(500).json({ error: error.message });
    return;
  }
});
