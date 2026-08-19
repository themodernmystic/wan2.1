// Ported from synthetix-ai/base44/functions/rileyDesignEntity/entry.ts
import { registerFunction } from '../registry.js';

/**
 * rileyDesignEntity — Design optimal Base44 entity schema for any use case.
 * Input: { entity_name, purpose, relationships, app_id }
 */

registerFunction('rileyDesignEntity', async (req, res, base44) => {
  try {
    const user = await base44.auth.me();
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { entity_name, purpose, relationships = [], app_id } = req.body || {};
    if (!entity_name || !purpose) {
      res.status(400).json({ error: 'entity_name and purpose are required' });
      return;
    }

    const apiKey = process.env.OPENROUTER_API_KEY || '';

    const designPrompt = `Design an optimal Base44 entity schema.

Entity Name: ${entity_name}
Purpose: ${purpose}
Relationships: ${relationships.length > 0 ? relationships.join(', ') : 'None specified'}

Base44 supported field types: string, number, boolean, date, datetime, enum (with values list), array of strings, long text (use "description" for this), email, url.

Best practices to follow:
- Include status enum for workflow tracking where relevant
- Add soft-delete via "active: boolean" instead of hard delete
- Always include a "notes" field for flexibility
- Use enums for any field with finite valid values
- Design for query efficiency (filter-friendly field names)
- Include relationship fields as string IDs (e.g. "project_id")
- Add RLS rules for security

Return JSON only:
{
  "entity_name": "${entity_name}",
  "fields": [
    { "name": "...", "type": "string|number|boolean|enum|array", "required": false, "default": null, "description": "...", "enum_values": [] }
  ],
  "rls_rules": {
    "create": "admin_only | creator | public",
    "read": "admin_only | creator | public",
    "update": "admin_only | creator | public",
    "delete": "admin_only | creator | public"
  },
  "indexes_recommended": ["field_name"],
  "sample_records": [{ "field": "value" }],
  "relationships_map": [{ "field": "...", "relates_to": "...", "type": "belongs_to|has_many" }],
  "base44_json_schema": { "name": "${entity_name}", "type": "object", "properties": {}, "required": [] }
}`;

    const fetchRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'anthropic/claude-3.5-sonnet', messages: [{ role: 'user', content: designPrompt }], max_tokens: 3000 }),
      signal: AbortSignal.timeout(45000),
    });
    const data: any = await fetchRes.json();
    if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));

    const raw = data.choices[0].message.content;
    let schema: any;
    try {
      const match = raw.match(/\{[\s\S]*\}/);
      schema = JSON.parse(match ? match[0] : raw);
    } catch (_) {
      schema = { entity_name, fields: [], base44_json_schema: {} };
    }

    // Save as copy-ready BuilderPrompt
    const builderPrompt = `Create this Base44 entity (paste into entities/${entity_name}.json):\n\n\`\`\`json\n${JSON.stringify(schema.base44_json_schema || schema, null, 2)}\n\`\`\`\n\nRelationships: ${(schema.relationships_map || []).map((r: any) => `${r.field} → ${r.relates_to} (${r.type})`).join(', ')}\n\nSample records:\n${JSON.stringify(schema.sample_records || [], null, 2)}`;

    const promptRecord: any = await base44.asServiceRole.entities.BuilderPrompt.create({
      title: `Entity Schema: ${entity_name}`,
      content: builderPrompt,
      prompt_type: 'entity',
      copy_ready: true,
      target_app_id: app_id || '',
      status: 'ready',
      notes: `Auto-designed by rileyDesignEntity. Purpose: ${purpose}`,
    }).catch(() => ({ id: null }));

    res.json({
      schema,
      builder_prompt_id: promptRecord?.id || null,
      entity_name,
      field_count: (schema.fields || []).length,
    });
    return;
  } catch (error: any) {
    res.status(500).json({ error: error.message });
    return;
  }
});
