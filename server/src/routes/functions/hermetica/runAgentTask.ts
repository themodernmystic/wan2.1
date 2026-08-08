// Ported from hermetica-forge/base44/functions/runAgentTask/entry.ts
import { registerFunction } from '../registry.js';

registerFunction('runAgentTask', async (req, res, base44) => {
  try {
    const user = await base44.auth.me();
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const body = req.body;
    const { agent_id, prompt, project_id, task_id } = body;
    if (!agent_id || !prompt) {
      res.status(400).json({ error: 'agent_id and prompt required' });
      return;
    }

    const agent: any = await base44.entities.ForgeAgent.get(agent_id);
    if (!agent) {
      res.status(404).json({ error: 'Agent not found' });
      return;
    }

    const startTime = Date.now();

    // Run the agent's LLM
    const fullPrompt = `${agent.system_prompt || 'You are a helpful AI assistant.'}\n\nCapabilities: ${agent.capabilities || 'General'}\n\nUser Request: ${prompt}\n\nAfter answering, add a section titled "LESSONS LEARNED:" with 2-3 key takeaways, and "REUSABLE PATTERNS:" with 1-2 patterns applicable to future tasks.`;
    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: fullPrompt,
    });

    const elapsed = Date.now() - startTime;
    const resultStr = typeof result === 'string' ? result : JSON.stringify(result);

    // Parse lessons and patterns from result
    const { answer, lessons, patterns } = parseAgentResult(resultStr);

    // Update agent stats
    await base44.entities.ForgeAgent.update(agent.id, {
      execution_count: (agent.execution_count || 0) + 1,
      last_execution: new Date().toISOString(),
    });

    // Create task journal
    const journal: any = await base44.entities.AgentTaskJournal.create({
      task_summary: `Agent "${agent.name}" executed: ${prompt.slice(0, 120)}`,
      agent_id: agent.id,
      agent_name: agent.name,
      project_id: project_id || null,
      task_id: task_id || null,
      sources_used: 'LLM (InvokeLLM)',
      assumptions: `Agent type: ${agent.agent_type}. Capabilities: ${agent.capabilities || 'general'}.`,
      outputs: answer.slice(0, 5000),
      errors: null,
      confidence: 80,
      lessons_learned: lessons,
      reusable_patterns: patterns,
      follow_up_actions: null,
      status: 'success',
      execution_time_ms: elapsed,
      started_at: new Date(startTime).toISOString(),
      completed_at: new Date().toISOString(),
    });

    // Capture deduplicated knowledge from lessons
    if (lessons && lessons.length > 10) {
      const hash = await simpleHash('agent_lesson_' + agent.id + lessons.slice(0, 100));
      const existing: any = await base44.asServiceRole.entities.KnowledgeEntry.filter({ dedup_hash: hash });
      if (existing && existing.length > 0) {
        await base44.entities.KnowledgeEntry.update(existing[0].id, {
          content: lessons,
          source_journal_id: journal.id,
          source_project_id: project_id || null,
        });
      } else {
        await base44.entities.KnowledgeEntry.create({
          title: `Lesson from ${agent.name}`,
          content: lessons,
          category: 'lesson_learned',
          source: 'agent',
          project_id: project_id || null,
          source_project_id: project_id || null,
          source_journal_id: journal.id,
          dedup_hash: hash,
          tags: `agent, ${agent.agent_type}`,
        });
      }
    }

    // Capture patterns
    if (patterns && patterns.length > 10) {
      const hash = await simpleHash('agent_pattern_' + agent.id + patterns.slice(0, 100));
      const existing: any = await base44.asServiceRole.entities.KnowledgeEntry.filter({ dedup_hash: hash });
      if (existing && existing.length > 0) {
        await base44.entities.KnowledgeEntry.update(existing[0].id, {
          content: patterns,
          source_journal_id: journal.id,
        });
      } else {
        await base44.entities.KnowledgeEntry.create({
          title: `Pattern from ${agent.name}`,
          content: patterns,
          category: 'pattern',
          source: 'agent',
          project_id: project_id || null,
          source_project_id: project_id || null,
          source_journal_id: journal.id,
          dedup_hash: hash,
          tags: `agent, ${agent.agent_type}, pattern`,
        });
      }
    }

    await base44.entities.ActivityLog.create({
      action: `Agent "${agent.name}" executed task`,
      entity_type: 'ForgeAgent',
      entity_id: agent.id,
      project_id: project_id || null,
      actor: 'agent',
    });

    res.json({
      result: resultStr,
      journal_id: journal.id,
      lessons,
      patterns,
    });
    return;
  } catch (error: any) {
    res.status(500).json({ error: error.message });
    return;
  }
});

function parseAgentResult(text: string) {
  let answer = text;
  let lessons: string | null = null;
  let patterns: string | null = null;

  const lessonsMatch = text.match(/LESSONS\s+LEARNED\s*:?\s*([\s\S]*?)(?=REUSABLE\s+PATTERNS|$)/i);
  if (lessonsMatch) {
    lessons = lessonsMatch[1].trim();
    answer = answer.replace(lessonsMatch[0], '').trim();
  }

  const patternsMatch = text.match(/REUSABLE\s+PATTERNS\s*:?\s*([\s\S]*?)$/i);
  if (patternsMatch) {
    patterns = patternsMatch[1].trim();
    answer = answer.replace(patternsMatch[0], '').trim();
  }

  return { answer, lessons, patterns };
}

async function simpleHash(text: string) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
}
