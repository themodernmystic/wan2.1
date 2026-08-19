// Ported from synthetix-ai/base44/functions/learnFromResponse/entry.ts
import { registerFunction } from '../registry.js';

registerFunction('learnFromResponse', async (req, res, base44) => {
  const user: any = await base44.auth.me();
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  if (user.role !== 'admin') {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }
  try {
    const { message_id, feedback, james_comment } = req.body || {};

    if (!message_id || !['glad', 'got_it', 'not_now'].includes(feedback)) {
      res.status(400).json({ error: 'message_id and valid feedback (glad|got_it|not_now) required' });
      return;
    }

    const msgs: any[] = await base44.asServiceRole.entities.AgentInitiatedMessage.filter({ id: message_id }, '-created_date', 1);
    const message = msgs[0];
    if (!message) {
      res.status(404).json({ error: 'Message not found' });
      return;
    }

    // Riley only
    if (message.agent_name !== 'riley') {
      res.status(400).json({ error: "Prime Gen Suite learnFromResponse is for Riley only." });
      return;
    }

    const feedbackRecord: any = await base44.asServiceRole.entities.AgentFeedback.create({
      message_id,
      agent_name: 'riley',
      feedback,
      james_comment: james_comment || '',
      created_at: new Date().toISOString()
    });

    await base44.asServiceRole.entities.AgentInitiatedMessage.update(message_id, {
      feedback_received: feedback,
      feedback_at: new Date().toISOString(),
      status: feedback === 'not_now' ? 'james_dismissed' : 'james_responded'
    });

    const budgets: any[] = await base44.asServiceRole.entities.AgentInitiationBudget.filter({ agent_name: 'riley' }, '-created_date', 1);
    const budget = budgets[0];
    let budgetAdjusted = false;

    if (budget) {
      const updates: Record<string, any> = {};
      if (feedback === 'glad') {
        updates.total_positive_feedback = (budget.total_positive_feedback || 0) + 1;
      } else if (feedback === 'not_now') {
        updates.total_negative_feedback = (budget.total_negative_feedback || 0) + 1;
        const newNeg = (budget.total_negative_feedback || 0) + 1;
        const total = (budget.total_positive_feedback || 0) + newNeg;
        const positiveRatio = (budget.total_positive_feedback || 0) / total;
        if (total >= 10 && positiveRatio < 0.3 && budget.daily_budget > 1) {
          updates.daily_budget = budget.daily_budget - 1;
          budgetAdjusted = true;
        }
      }
      if (Object.keys(updates).length > 0) {
        await base44.asServiceRole.entities.AgentInitiationBudget.update(budget.id, updates);
      }
    }

    const FEEDBACK_MEANINGS: Record<string, string> = {
      glad: "James was genuinely happy to receive this — it was timely and valuable",
      got_it: "James acknowledged it neutrally — useful but not particularly welcome",
      not_now: "James didn't want this message — it was unwelcome, poorly timed, or not valuable enough"
    };

    const learningPrompt = `James Hatcher just responded "${feedback}" (meaning: ${FEEDBACK_MEANINGS[feedback]}) to a message from Riley.

Original message subject: "${message.subject_line}"
Original message body (first 300 chars): "${(message.message_body || '').substring(0, 300)}"
${james_comment ? `James's own comment: "${james_comment}"` : ''}

In 2-4 sentences, what specific thing should Riley adjust or remember about future initiations?
Be concrete — reference the actual content, timing, or tone.`;

    const learning = await base44.asServiceRole.integrations.Core.InvokeLLM({ prompt: learningPrompt });

    await base44.asServiceRole.entities.AgentFeedback.update(feedbackRecord.id, { learning_extracted: learning });

    await base44.asServiceRole.entities.RileyMemory.create({
      title: `Riley initiation learning — "${feedback}" response`,
      content: learning,
      category: feedback === 'glad' ? 'James Preference' : 'Build Decision'
    }).catch(() => {});

    res.json({ feedback_id: feedbackRecord.id, learning_extracted: learning, budget_adjusted: budgetAdjusted });
    return;

  } catch (error: any) {
    res.status(500).json({ error: error.message });
    return;
  }
});
