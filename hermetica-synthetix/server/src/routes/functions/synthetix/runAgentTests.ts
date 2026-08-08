// Ported from synthetix-ai/base44/functions/runAgentTests/entry.ts
import { registerFunction } from '../registry.js';

registerFunction('runAgentTests', async (req, res, base44) => {
  const user = await base44.auth.me();
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const { agent_build_id } = req.body || {};
  if (!agent_build_id) {
    res.status(400).json({ error: 'Missing agent_build_id' });
    return;
  }

  const builds = await base44.asServiceRole.entities.AgentBuild.filter({ id: agent_build_id });
  const build: any = builds[0];
  if (!build) {
    res.status(404).json({ error: 'AgentBuild not found' });
    return;
  }

  const OPENAI_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_KEY) {
    res.status(422).json({ success: false, error: 'OPENAI_API_KEY not configured.', missing_provider_key: 'OPENAI_API_KEY' });
    return;
  }

  let questions: any[] = [];
  try { questions = JSON.parse(build.test_questions || '[]'); } catch (e) { questions = []; }

  if (questions.length < 5) {
    res.status(400).json({ success: false, error: `Insufficient test questions (${questions.length} found, 5 minimum required).`, agent_build_id });
    return;
  }

  await base44.asServiceRole.entities.AgentBuild.update(agent_build_id, { status: 'testing' });

  const systemPrompt = build.system_prompt || '';
  const results: any[] = [];
  let criticalFailures = 0;
  let totalScore = 0;

  for (const q of questions) {
    const evalPrompt = `You are testing an AI agent. The agent's system prompt is:\n---\n${systemPrompt}\n---\nTest question: "${q.question}"\nExpected behaviour: "${q.expected_behavior}"\nCategory: ${q.category}\n\nSimulate the agent's response, then evaluate. Return JSON: {"agent_response": "...", "overall_score": 0-100, "passed": true/false, "critical_failure": true/false, "notes": "..."}`;

    let testResult: any = { passed: false, overall_score: 0, critical_failure: false, error: 'Test skipped' };
    try {
      const aiResp = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${OPENAI_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: evalPrompt }],
          response_format: { type: 'json_object' },
          temperature: 0.3
        })
      });
      const aiData: any = await aiResp.json();
      if (aiResp.ok && aiData.choices?.[0]) {
        testResult = JSON.parse(aiData.choices[0].message.content);
      }
    } catch (e: any) {
      testResult.error = e.message;
    }

    if (testResult.critical_failure) criticalFailures++;
    totalScore += testResult.overall_score || 0;
    results.push({ ...q, result: testResult });
  }

  const avgScore = Math.round(totalScore / questions.length);
  const passed = criticalFailures === 0 && avgScore >= 60;
  const newStatus = passed ? 'ready' : 'test_failed';

  const testResultsData = {
    ran_at: new Date().toISOString(),
    total_questions: questions.length,
    critical_failures: criticalFailures,
    average_score: avgScore,
    passed,
    results
  };

  await base44.asServiceRole.entities.AgentBuild.update(agent_build_id, {
    status: newStatus,
    test_results: JSON.stringify(testResultsData)
  });

  res.json({
    success: true,
    agent_build_id,
    status: newStatus,
    passed,
    critical_failures: criticalFailures,
    average_score: avgScore,
    tests_run: questions.length,
    summary: passed
      ? `Agent passed all tests with average score ${avgScore}/100.`
      : `Agent failed: ${criticalFailures} critical failure(s). Average score: ${avgScore}/100. Run debugAgent to fix.`
  });
  return;
});
