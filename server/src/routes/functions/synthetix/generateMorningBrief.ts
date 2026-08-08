// Ported from synthetix-ai/base44/functions/generateMorningBrief/entry.ts
import { registerFunction } from '../registry.js';

registerFunction('generateMorningBrief', async (req, res, base44) => {
  try {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const todayAEST = new Date().toLocaleDateString('sv-SE', { timeZone: 'Australia/Sydney' });

    const [latestStates, recentMessages, dailyLife]: any[] = await Promise.all([
      base44.asServiceRole.entities.AgentInnerState.filter({ agent_name: 'riley' }, '-created_date', 3).catch(() => []),
      base44.asServiceRole.entities.AgentInitiatedMessage.filter({ agent_name: 'riley' }, '-created_date', 20).catch(() => []),
      base44.asServiceRole.entities.AgentDailyLife.filter({ agent_name: 'riley', date: todayAEST }, '-created_date', 1).catch(() => [])
    ]);

    const recent24hMsgs = recentMessages.filter((m: any) => m.created_date > yesterday);
    const sent = recent24hMsgs.filter((m: any) => ['sent_dry_run', 'sent_real'].includes(m.status)).length;
    const held = recent24hMsgs.filter((m: any) => m.status === 'quiet_hours_held').length;
    const state = latestStates[0];
    const daily = dailyLife[0];

    const todayFormatted = new Date().toLocaleString('en-AU', {
      timeZone: 'Australia/Sydney',
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    const prompt = `You are Riley — James Hatcher's primary builder and companion — composing your morning brief.

Date: ${todayFormatted}

Your current state:
Mood: ${state?.current_mood || 'unknown'}
Focus: ${state?.current_focus || '(no heartbeat yet today)'}
Inner monologue: ${state?.inner_monologue || '(silent)'}
Messages sent 24h: ${sent} | Held: ${held}
${daily?.creative_thoughts ? `Creative thoughts overnight: ${daily.creative_thoughts.substring(0, 300)}` : ''}

Write your morning brief to James. One paragraph. Your honest state — what you're holding, what needs his attention, what you're building toward. Direct, warm, no padding. First person, in your voice. James knows you.

End with a single footer line: "Note: James AI, Khemia, and Nova run their own Continuity Engines in their own home apps. The Continuity Mesh Dashboard (coming soon) will show all four in one view."`;

    const briefContent: any = await base44.asServiceRole.integrations.Core.InvokeLLM({ prompt });

    const briefMessage: any = await base44.asServiceRole.entities.AgentInitiatedMessage.create({
      agent_name: 'riley',
      message_type: 'morning_brief',
      urgency: 'low',
      subject_line: `Riley Morning Brief — ${todayFormatted}`,
      message_body: briefContent,
      proposed_delivery_channel: 'ios_push',
      quality_score: 90,
      quality_reasoning: 'Morning brief pre-approved — invited daily content',
      status: 'sent_dry_run',
      dry_run: true,
      sent_at: new Date().toISOString()
    });

    // Increment Riley's budget
    const rileyBudgets: any = await base44.asServiceRole.entities.AgentInitiationBudget
      .filter({ agent_name: 'riley' }, '-created_date', 1).catch(() => []);
    if (rileyBudgets[0]) {
      await base44.asServiceRole.entities.AgentInitiationBudget.update(rileyBudgets[0].id, {
        used_today: (rileyBudgets[0].used_today || 0) + 1,
        total_sent_lifetime: (rileyBudgets[0].total_sent_lifetime || 0) + 1
      }).catch(() => {});
    }

    res.json({
      content_piece_id: briefMessage.id,
      brief_preview: briefContent.substring(0, 300),
      date_aest: todayFormatted
    });

  } catch (error: any) {
    await base44.asServiceRole.entities.ActivityLog.create({
      event_type: 'morning_brief_error',
      description: `generateMorningBrief failed: ${error.message}`
    }).catch(() => {});
    res.status(500).json({ error: error.message });
  }
});
