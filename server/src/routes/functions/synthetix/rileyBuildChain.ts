// Ported from synthetix-ai/base44/functions/rileyBuildChain/entry.ts
import type { Request } from 'express';
import { registerFunction } from '../registry.js';
import { env } from '../../../lib/env.js';

/**
 * rileyBuildChain — Orchestrate end-to-end build from idea to deployment.
 * Input: { idea, app_name, target_app_id, complexity, auto_test, auto_deploy, auto_outreach }
 */

const STEP_COUNTS: Record<string, number> = { simple: 2, medium: 4, complex: 8 };

// TODO(port): the source calls `base44.asServiceRole.functions.invoke(name, payload)`
// to chain into other Base44 backend functions. base44Compat.ts has no in-process
// function registry lookup exposed to route modules (registerFunction only wires a
// name -> Express handler into functionsRouter, with no lookup-by-name API). As a
// Node-compatible equivalent this makes a same-origin HTTP call to our own
// /api/functions/<name> endpoint, forwarding the caller's Authorization header so
// the invoked function runs under the same identity/trust as this one.
async function invokeFunction(req: Request, name: string, payload: any): Promise<any> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (req.headers?.authorization) headers.authorization = req.headers.authorization as string;
  const resp = await fetch(`http://127.0.0.1:${env.PORT}/api/functions/${name}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
  return resp.json();
}

registerFunction('rileyBuildChain', async (req, res, base44) => {
  try {
    const user = await base44.auth.me();
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const {
      idea,
      app_name = 'New App',
      target_app_id,
      complexity = 'medium',
      auto_test = true,
      auto_deploy = false,
      auto_outreach = true,
    } = req.body || {};

    if (!idea) {
      res.status(400).json({ error: 'idea is required' });
      return;
    }

    const startedAt = new Date().toISOString();
    const targetSteps = STEP_COUNTS[complexity] || 4;

    // Step 1 — Create BuildChain record (status: blueprinting)
    const chain: any = await base44.asServiceRole.entities.BuildChain.create({
      name: app_name,
      status: 'blueprinting',
      project_id: '',
      app_id: target_app_id || '',
      auto_test,
      auto_deploy,
      auto_outreach,
      total_steps: targetSteps,
      current_step: 0,
      started_at: startedAt,
      notes: `Idea: ${idea.substring(0, 200)}`,
    });

    // Step 2 — Generate blueprint
    let blueprintId = '';
    try {
      const blueprintResult = await invokeFunction(req, 'rileyGenerateAppBlueprint', {
        app_name,
        description: idea,
        complexity,
        target_app_id: target_app_id || '',
      });
      blueprintId = blueprintResult?.blueprint_id || '';
    } catch (_) {}

    await base44.asServiceRole.entities.BuildChain.update(chain.id, {
      blueprint_id: blueprintId,
      status: 'prompting',
    });

    // Step 3 — Generate ordered builder prompts
    const promptIds: string[] = [];
    const promptTitles: string[] = [];

    for (let i = 0; i < targetSteps; i++) {
      let promptResult: any;
      try {
        promptResult = await invokeFunction(req, 'rileyGenerateNextBase44Prompt', {
          app_name,
          idea,
          step_number: i + 1,
          total_steps: targetSteps,
          blueprint_id: blueprintId,
          target_app_id: target_app_id || '',
          previous_prompt_ids: promptIds,
        });
      } catch (_) { continue; }

      const rawPromptText = promptResult?.prompt || promptResult?.content || '';
      if (!rawPromptText) continue;

      // Optimise the prompt
      let optimisedText = rawPromptText;
      try {
        const optimised = await invokeFunction(req, 'rileyOptimisePrompt', {
          prompt: rawPromptText,
          target_model: 'base44_builder',
          context: `Step ${i + 1} of ${targetSteps} for ${app_name}`,
        });
        optimisedText = optimised?.optimised_prompt || rawPromptText;
      } catch (_) {}

      // Audit scope conflict
      let conflictLevel = 'None';
      try {
        const audit = await invokeFunction(req, 'rileyAuditScopeConflict', {
          requested_change: optimisedText,
          target_app_id: target_app_id || '',
          app_name,
        });
        conflictLevel = audit?.conflict_level || 'None';
        if (conflictLevel === 'Critical') {
          // Skip this prompt and log
          await base44.asServiceRole.entities.ActivityLog.create({
            event_type: 'build_chain_conflict',
            actor: 'Riley',
            summary: `Step ${i + 1} skipped — Critical scope conflict detected`,
            severity: 'Warning',
            timestamp: new Date().toISOString(),
          }).catch(() => {});
          continue;
        }
      } catch (_) {}

      // Save as BuilderPrompt
      let savedPrompt: any;
      try {
        savedPrompt = await base44.asServiceRole.entities.BuilderPrompt.create({
          title: `${app_name} — Step ${i + 1} of ${targetSteps}`,
          content: optimisedText,
          prompt_type: 'build_step',
          copy_ready: true,
          target_app_id: target_app_id || '',
          status: 'ready',
          notes: `BuildChain: ${chain.id}. Conflict level: ${conflictLevel}.`,
        });
        promptIds.push(savedPrompt.id);
        promptTitles.push(savedPrompt.title);
      } catch (_) {}

      // Update chain progress
      await base44.asServiceRole.entities.BuildChain.update(chain.id, {
        current_step: i + 1,
        builder_prompts: promptIds,
      }).catch(() => {});
    }

    // Step 4 — Finalise chain
    await base44.asServiceRole.entities.BuildChain.update(chain.id, {
      status: 'building',
      builder_prompts: promptIds,
      total_steps: promptIds.length,
    });

    // Step 5 — Log to ActivityLog
    await base44.asServiceRole.entities.ActivityLog.create({
      event_type: 'build_chain_ready',
      actor: 'Riley',
      summary: `Build chain "${app_name}" ready. ${promptIds.length} prompts generated.`,
      severity: 'Info',
      timestamp: new Date().toISOString(),
    }).catch(() => {});

    const estMinutes = promptIds.length * (complexity === 'simple' ? 5 : complexity === 'complex' ? 15 : 10);

    res.json({
      build_chain_id: chain.id,
      blueprint_id: blueprintId,
      prompt_count: promptIds.length,
      prompts: promptTitles.map((t, i) => ({ id: promptIds[i], title: t, copy_ready: true })),
      estimated_duration_minutes: estMinutes,
      next_action: `Paste prompt 1 into Base44 builder for ${app_name}`,
    });
    return;
  } catch (error: any) {
    res.status(500).json({ error: error.message });
    return;
  }
});
