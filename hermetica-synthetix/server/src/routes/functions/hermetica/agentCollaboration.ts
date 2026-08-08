// Ported from hermetica-forge/base44/functions/agentCollaboration/entry.ts
import { registerFunction } from '../registry.js';

registerFunction('agentCollaboration', async (req, res, base44) => {
  try {
    const user = await base44.auth.me();
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const body = req.body;
    const { action } = body;

    switch (action) {
      case 'claim_task': {
        const { agent_id, task_id } = body;
        if (!agent_id || !task_id) {
          res.status(400).json({ error: 'agent_id and task_id required' });
          return;
        }

        const agent: any = await base44.entities.ForgeAgent.get(agent_id);
        const task: any = await base44.entities.ProjectTask.get(task_id);

        if (task.assigned_agent && task.assigned_agent.trim() !== '') {
          res.status(409).json({
            error: `Task already claimed by "${task.assigned_agent}"`,
            already_claimed: true,
            current_owner: task.assigned_agent,
          });
          return;
        }

        await base44.entities.ProjectTask.update(task_id, {
          assigned_agent: agent.name,
          status: 'in_progress',
        });

        await base44.entities.AgentTaskJournal.create({
          task_summary: `Task claimed: ${task.title}`,
          agent_id: agent.id,
          agent_name: agent.name,
          project_id: task.project_id,
          task_id: task_id,
          outputs: `Claimed task "${task.title}" and set to in_progress`,
          status: 'success',
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
        });

        await base44.entities.AgentMessage.create({
          from_agent_id: agent.id,
          from_agent_name: agent.name,
          project_id: task.project_id,
          task_id: task_id,
          message_type: 'task_claim',
          content: `I've claimed task "${task.title}" and started working on it.`,
          is_read: false,
          requires_response: false,
        });

        await base44.entities.ActivityLog.create({
          action: `Agent "${agent.name}" claimed task "${task.title}"`,
          entity_type: 'ProjectTask',
          entity_id: task_id,
          project_id: task.project_id,
          actor: 'agent',
        });

        res.json({ success: true, task_title: task.title, agent_name: agent.name });
        return;
      }

      case 'send_message': {
        const { from_agent_id, to_agent_id, project_id, content, message_type = 'message', task_id } = body;
        if (!from_agent_id || !content || !message_type) {
          res.status(400).json({ error: 'from_agent_id, content, and message_type required' });
          return;
        }

        const fromAgent: any = await base44.entities.ForgeAgent.get(from_agent_id);
        let toAgentName = '';
        if (to_agent_id) {
          const toAgent: any = await base44.entities.ForgeAgent.get(to_agent_id);
          toAgentName = toAgent.name;
        }

        await base44.entities.AgentMessage.create({
          from_agent_id: fromAgent.id,
          from_agent_name: fromAgent.name,
          to_agent_id: to_agent_id || null,
          to_agent_name: toAgentName,
          project_id: project_id || null,
          task_id: task_id || null,
          message_type,
          content,
          is_read: false,
          requires_response: message_type === 'help_request',
        });

        await base44.entities.ActivityLog.create({
          action: `Agent "${fromAgent.name}" sent ${message_type}${toAgentName ? ' to ' + toAgentName : ''}`,
          entity_type: 'AgentMessage',
          project_id: project_id || null,
          actor: 'agent',
        });

        res.json({ success: true });
        return;
      }

      case 'request_help': {
        const { from_agent_id, to_agent_id, project_id, task_id, content } = body;
        if (!from_agent_id || !to_agent_id || !content) {
          res.status(400).json({ error: 'from_agent_id, to_agent_id, and content required' });
          return;
        }

        const fromAgent: any = await base44.entities.ForgeAgent.get(from_agent_id);
        const toAgent: any = await base44.entities.ForgeAgent.get(to_agent_id);

        await base44.entities.AgentMessage.create({
          from_agent_id: fromAgent.id,
          from_agent_name: fromAgent.name,
          to_agent_id: toAgent.id,
          to_agent_name: toAgent.name,
          project_id: project_id || null,
          task_id: task_id || null,
          message_type: 'help_request',
          content,
          is_read: false,
          requires_response: true,
        });

        await base44.entities.AgentTaskJournal.create({
          task_summary: `Help requested from ${toAgent.name}`,
          agent_id: fromAgent.id,
          agent_name: fromAgent.name,
          project_id: project_id || null,
          task_id: task_id || null,
          outputs: `Requested help: ${content}`,
          status: 'partial',
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
        });

        await base44.entities.ActivityLog.create({
          action: `Agent "${fromAgent.name}" requested help from "${toAgent.name}"`,
          entity_type: 'AgentMessage',
          project_id: project_id || null,
          actor: 'agent',
        });

        res.json({ success: true });
        return;
      }

      case 'handoff': {
        const { from_agent_id, to_agent_id, task_id, content } = body;
        if (!from_agent_id || !to_agent_id || !task_id || !content) {
          res.status(400).json({ error: 'from_agent_id, to_agent_id, task_id, and content required' });
          return;
        }

        const fromAgent: any = await base44.entities.ForgeAgent.get(from_agent_id);
        const toAgent: any = await base44.entities.ForgeAgent.get(to_agent_id);
        const task: any = await base44.entities.ProjectTask.get(task_id);

        if (task.assigned_agent && task.assigned_agent !== fromAgent.name) {
          res.status(403).json({
            error: `Only the current owner can hand off this task. Current owner: ${task.assigned_agent || 'none'}`,
            current_owner: task.assigned_agent,
          });
          return;
        }

        await base44.entities.ProjectTask.update(task_id, {
          assigned_agent: toAgent.name,
        });

        await base44.entities.AgentMessage.create({
          from_agent_id: fromAgent.id,
          from_agent_name: fromAgent.name,
          to_agent_id: toAgent.id,
          to_agent_name: toAgent.name,
          project_id: task.project_id,
          task_id: task_id,
          message_type: 'handoff',
          content: `Handing off task "${task.title}": ${content}`,
          is_read: false,
          requires_response: true,
        });

        await base44.entities.AgentTaskJournal.create({
          task_summary: `Task handed off to ${toAgent.name}`,
          agent_id: fromAgent.id,
          agent_name: fromAgent.name,
          project_id: task.project_id,
          task_id: task_id,
          outputs: `Handed off task "${task.title}" to ${toAgent.name}. Context: ${content}`,
          reusable_patterns: `Handoff context: ${content}`,
          status: 'success',
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
        });

        await base44.entities.ActivityLog.create({
          action: `Agent "${fromAgent.name}" handed off task "${task.title}" to "${toAgent.name}"`,
          entity_type: 'ProjectTask',
          entity_id: task_id,
          project_id: task.project_id,
          actor: 'agent',
        });

        res.json({ success: true, task_title: task.title, new_owner: toAgent.name });
        return;
      }

      case 'share_finding': {
        const { from_agent_id, project_id, title, content, journal_id, category = 'insight' } = body;
        if (!from_agent_id || !title || !content) {
          res.status(400).json({ error: 'from_agent_id, title, and content required' });
          return;
        }

        const fromAgent: any = await base44.entities.ForgeAgent.get(from_agent_id);

        const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(title + content));
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const dedupHash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

        const existing = await base44.entities.KnowledgeEntry.filter({ dedup_hash: dedupHash });
        if (existing.length > 0) {
          res.json({ success: true, deduplicated: true, message: 'Finding already shared' });
          return;
        }

        await base44.entities.KnowledgeEntry.create({
          title,
          content,
          category,
          source: 'agent',
          project_id: project_id || null,
          source_journal_id: journal_id || null,
          dedup_hash: dedupHash,
          tags: `agent:${fromAgent.name}`,
        });

        await base44.entities.AgentMessage.create({
          from_agent_id: fromAgent.id,
          from_agent_name: fromAgent.name,
          project_id: project_id || null,
          message_type: 'finding',
          content: `Shared finding: ${title}`,
          is_read: false,
          requires_response: false,
        });

        await base44.entities.ActivityLog.create({
          action: `Agent "${fromAgent.name}" shared finding: ${title}`,
          entity_type: 'KnowledgeEntry',
          project_id: project_id || null,
          actor: 'agent',
        });

        res.json({ success: true, deduplicated: false });
        return;
      }

      default:
        res.status(400).json({ error: `Unknown action: ${action}` });
        return;
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
    return;
  }
});
