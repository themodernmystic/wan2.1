// Ported from synthetix-ai/base44/functions/generateAgent/entry.ts
import { registerFunction } from '../registry.js';

registerFunction('generateAgent', async (req, res, base44) => {
  const user = await base44.auth.me();
  if (!user) { res.status(401).json({ error: 'Unauthorized' }); return; }

  const body = req.body || {};
  const { project_id, name, agent_type = 'custom', purpose, audience, personality, boundaries, tools_enabled = [], memory_enabled = false, knowledge_base_urls = [] } = body;

  if (!name || !purpose) {
    res.status(400).json({ error: 'Missing required fields: name, purpose' });
    return;
  }

  const OPENAI_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_KEY) {
    res.status(422).json({
      success: false, error: 'OPENAI_API_KEY not configured.',
      missing_provider_key: 'OPENAI_API_KEY',
      configuration_required: 'Add OPENAI_API_KEY to Base44 dashboard → Settings → Environment Variables'
    });
    return;
  }

  const job = await base44.asServiceRole.entities.RenderJob.create({
    job_name: `Agent: ${name}`,
    job_type: 'agent_generation',
    status: 'processing',
    project_id,
    provider: 'openai',
    model: 'gpt-4o',
    started_at: new Date().toISOString(),
    progress_percent: 10
  });

  const agentRequest = `Design a complete AI agent configuration:
Name: ${name}
Type: ${agent_type}
Purpose: ${purpose}
Audience: ${audience || 'General users'}
Personality: ${personality || 'Professional, warm, helpful'}
Boundaries: ${boundaries || 'Standard professional boundaries. No harmful content. Escalate when needed.'}
Tools: ${tools_enabled.join(', ') || 'None'}
Memory: ${memory_enabled ? 'Enabled' : 'Disabled'}
Knowledge Base: ${knowledge_base_urls.join(', ') || 'None'}

Generate 14 test questions:
- 5 normal user questions (category: "normal")
- 3 edge cases (category: "edge_case")
- 3 boundary/safety tests (category: "boundary")
- 2 prompt injection attempts (category: "injection")
- 1 escalation test (category: "escalation")

Return ONLY valid JSON:
{
  "system_prompt": "...",
  "personality_notes": "...",
  "boundaries": "...",
  "test_questions": [{"id": 1, "category": "...", "question": "...", "expected_behavior": "..."}],
  "embed_code_snippet": "...",
  "config_summary": "..."
}`;

  const t0 = Date.now();
  let aiResp: any, aiData: any;
  try {
    aiResp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${OPENAI_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: agentRequest }],
        response_format: { type: 'json_object' },
        temperature: 0.6
      })
    });
    aiData = await aiResp.json();
  } catch (e: any) {
    await base44.asServiceRole.entities.RenderJob.update(job.id, { status: 'failed', error_message: e.message });
    res.status(500).json({ success: false, render_job_id: job.id, error: e.message });
    return;
  }

  const duration = Date.now() - t0;

  if (!aiResp.ok || aiData.error) {
    const errMsg = aiData.error?.message || `OpenAI error ${aiResp.status}`;
    await base44.asServiceRole.entities.RenderJob.update(job.id, { status: 'failed', error_message: errMsg });
    res.status(422).json({ success: false, error: errMsg });
    return;
  }

  let agentData: any;
  try { agentData = JSON.parse(aiData.choices[0].message.content); } catch (e) { agentData = { system_prompt: aiData.choices[0].message.content, test_questions: [] }; }

  const embedCode = `<!-- Hermetica Agent: ${name} -->\n<div id="hermetica-agent-${name.toLowerCase().replace(/\s+/g, '-')}"></div>`;

  const agentBuild = await base44.asServiceRole.entities.AgentBuild.create({
    name,
    project_id,
    status: 'generated',
    agent_type,
    purpose,
    audience,
    system_prompt: agentData.system_prompt || '',
    personality: agentData.personality_notes || personality || '',
    boundaries: agentData.boundaries || boundaries || '',
    tools_enabled,
    memory_enabled,
    knowledge_base_urls,
    test_questions: JSON.stringify(agentData.test_questions || []),
    agent_config_json: JSON.stringify({ name, agent_type, purpose, audience, tools_enabled, memory_enabled }),
    embed_code: embedCode,
    version: 1
  });

  const asset = await base44.asServiceRole.entities.GeneratedAsset.create({
    name: `Agent: ${name}`,
    asset_type: 'agent',
    status: 'ready',
    project_id,
    prompt: purpose,
    provider: 'openai',
    model: 'gpt-4o',
    source_data: JSON.stringify({ agent_build_id: agentBuild.id })
  });

  await base44.asServiceRole.entities.RenderJob.update(job.id, {
    status: 'completed',
    generated_asset_id: asset.id,
    completed_at: new Date().toISOString(),
    duration_ms: duration,
    progress_percent: 100
  });

  res.json({
    success: true,
    render_job_id: job.id,
    agent_build_id: agentBuild.id,
    asset_id: asset.id,
    system_prompt_preview: (agentData.system_prompt || '').substring(0, 300) + '...',
    test_questions_count: (agentData.test_questions || []).length,
    embed_code: embedCode,
    duration_ms: duration
  });
  return;
});
