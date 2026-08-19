// Ported from synthetix-ai/base44/functions/debugAgent/entry.ts
import { registerFunction } from '../registry.js';

registerFunction('debugAgent', async (req, res, base44) => {
  const user = await base44.auth.me();
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  if (user.role !== 'admin') {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }

  const { agent_build_id, specific_issue } = req.body || {};
  if (!agent_build_id) {
    res.status(400).json({ error: 'Missing agent_build_id' });
    return;
  }

  const OPENAI_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_KEY) {
    res.status(422).json({ success: false, error: 'OPENAI_API_KEY not configured.', missing_provider_key: 'OPENAI_API_KEY' });
    return;
  }

  const builds = await base44.asServiceRole.entities.AgentBuild.filter({ id: agent_build_id });
  const build: any = builds[0];
  if (!build) {
    res.status(404).json({ error: 'AgentBuild not found' });
    return;
  }

  let testResults: any = [];
  try { testResults = JSON.parse(build.test_results || '{}'); } catch (e) { testResults = {}; }

  const failedTests = (testResults.results || []).filter((r: any) => !r.result?.passed || r.result?.critical_failure);

  const debugPrompt = `You are a senior AI agent safety engineer for Hermetica Holdings.

The agent "${build.name}" has failed testing or needs debugging.

System Prompt:
${build.system_prompt || 'MISSING - No system prompt defined'}

Failed Tests:
${JSON.stringify(failedTests, null, 2)}

${specific_issue ? `Specific Issue Reported: ${specific_issue}` : ''}

Current Status: ${build.status}
Agent Type: ${build.agent_type}
Purpose: ${build.purpose}
Boundaries: ${build.boundaries || 'Not defined'}

Analyse the failures and provide:
1. Root causes for each failure
2. Specific system prompt improvements
3. New/updated boundary statements
4. Refined personality guidance
5. An improved system prompt (full, production-ready)

Return ONLY valid JSON:
{
  "root_causes": ["..."],
  "improved_system_prompt": "...",
  "improved_boundaries": "...",
  "refined_personality": "...",
  "safety_recommendations": ["..."],
  "debug_summary": "..."
}`;

  const t0 = Date.now();
  let aiResp, aiData: any;
  try {
    aiResp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${OPENAI_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: debugPrompt }],
        response_format: { type: 'json_object' },
        temperature: 0.3
      })
    });
    aiData = await aiResp.json();
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
    return;
  }

  if (!aiResp.ok || aiData.error) {
    res.status(422).json({ success: false, error: aiData.error?.message || 'OpenAI error' });
    return;
  }

  let debugData: any;
  try { debugData = JSON.parse(aiData.choices[0].message.content); } catch (e) { debugData = { debug_summary: aiData.choices[0].message.content }; }

  // Apply improvements to the agent build
  const updates = {
    status: 'generated', // Reset to generated so it can be re-tested
    system_prompt: debugData.improved_system_prompt || build.system_prompt,
    boundaries: debugData.improved_boundaries || build.boundaries,
    personality: debugData.refined_personality || build.personality
  };

  await base44.asServiceRole.entities.AgentBuild.update(agent_build_id, updates);

  res.json({
    success: true,
    agent_build_id,
    debug_summary: debugData.debug_summary,
    root_causes: debugData.root_causes || [],
    safety_recommendations: debugData.safety_recommendations || [],
    improvements_applied: {
      system_prompt_updated: !!debugData.improved_system_prompt,
      boundaries_updated: !!debugData.improved_boundaries,
      personality_updated: !!debugData.refined_personality
    },
    status: 'generated',
    next_step: 'Run runAgentTests to retest the improved agent.',
    duration_ms: Date.now() - t0
  });
  return;
});
