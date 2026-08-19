// Ported from synthetix-ai/base44/functions/dispatchToApple/entry.ts
import { registerFunction } from '../registry.js';

function isJamesOnline(recentActivity: any[]) {
  if (!recentActivity || recentActivity.length === 0) return false;
  const lastActivity = new Date(recentActivity[0].created_date);
  return lastActivity > new Date(Date.now() - 15 * 60 * 1000);
}

function isInQuietHours(config: any) {
  if (!config || !config.active) return false;
  const now = new Date();
  const aestTime = now.toLocaleString('en-AU', { timeZone: 'Australia/Sydney', hour: '2-digit', minute: '2-digit', hour12: false });
  const [hours, minutes] = aestTime.split(':').map(Number);
  const currentMinutes = hours * 60 + minutes;
  const [startH, startM] = config.start_time_aest.split(':').map(Number);
  const [endH, endM] = config.end_time_aest.split(':').map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;
  if (startMinutes > endMinutes) return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  return currentMinutes >= startMinutes && currentMinutes < endMinutes;
}

registerFunction('dispatchToApple', async (req, res, base44) => {
  try {
    const { message_id } = req.body || {};
    if (!message_id) {
      res.status(400).json({ error: 'message_id required' });
      return;
    }

    const messages = await base44.asServiceRole.entities.AgentInitiatedMessage.filter({ id: message_id }, '-created_date', 1);
    const message: any = messages[0];
    if (!message) {
      res.status(404).json({ error: 'Message not found' });
      return;
    }

    // Riley only
    if (message.agent_name !== 'riley') {
      res.status(400).json({ error: "Prime Gen Suite dispatches Riley's messages only." });
      return;
    }

    const [recentActivity, quietConfigs] = await Promise.all([
      base44.asServiceRole.entities.ActivityLog.list('-created_date', 1).catch(() => []),
      base44.asServiceRole.entities.QuietHoursConfig.filter({ active: true }, '-created_date', 1).catch(() => [])
    ]);

    const jamesOnline = isJamesOnline(recentActivity as any[]);
    const quietConfig: any = (quietConfigs as any[])[0] || null;

    // Quiet hours gate
    if (!jamesOnline && quietConfig && isInQuietHours(quietConfig)) {
      const canOverride = (
        (message.quiet_hours_override_requested && quietConfig.overridable_for_urgent && message.urgency === 'urgent') ||
        (message.urgency === 'drop_everything' && quietConfig.overridable_for_emergencies) ||
        (message.message_type === 'opportunity' && quietConfig.overridable_for_big_opportunities)
      );
      if (!canOverride) {
        await base44.asServiceRole.entities.AgentInitiatedMessage.update(message_id, { status: 'quiet_hours_held' });
        res.json({ message_id, status: 'quiet_hours_held', dispatched_dry_run: false });
        return;
      }
    }

    // Budget check
    const budgets = await base44.asServiceRole.entities.AgentInitiationBudget.filter({ agent_name: 'riley' }, '-created_date', 1);
    const budget: any = budgets[0];
    if (!budget) {
      await base44.asServiceRole.entities.AgentInitiatedMessage.update(message_id, { status: 'quality_failed', notes: 'No budget record' });
      res.json({ message_id, status: 'failed', reason: 'No budget record' });
      return;
    }

    const now = new Date();
    const todayAEST = new Date(now.toLocaleString('en-AU', { timeZone: 'Australia/Sydney' }));
    const todayDateStr = `${todayAEST.getFullYear()}-${String(todayAEST.getMonth()+1).padStart(2,'0')}-${String(todayAEST.getDate()).padStart(2,'0')}`;
    let usedToday = budget.used_today || 0;
    if (budget.last_reset_at !== todayDateStr) {
      usedToday = 0;
      await base44.asServiceRole.entities.AgentInitiationBudget.update(budget.id, { used_today: 0, last_reset_at: todayDateStr });
    }

    if (usedToday >= budget.daily_budget) {
      await base44.asServiceRole.entities.AgentInitiatedMessage.update(message_id, { status: 'quality_failed', notes: 'Daily budget exhausted' });
      res.json({ message_id, status: 'budget_exhausted', dispatched_dry_run: false });
      return;
    }

    const sentAt = new Date().toISOString();
    const isDryRun = budget.dry_run_mode !== false;

    const wouldHaveSentPayload = {
      agent: 'riley',
      channel: message.proposed_delivery_channel,
      subject: message.subject_line,
      body: message.message_body,
      urgency: message.urgency,
      message_type: message.message_type,
      quality_score: message.quality_score,
      timestamp: sentAt
    };

    if (isDryRun) {
      // DRY RUN — log, update status, increment budget. DO NOT send.
      try {
        await base44.asServiceRole.entities.ActivityLog.create({
          action: 'continuity_dry_run_dispatch',
          description: `[DRY RUN] Riley → James | ${message.message_type} | "${message.subject_line || message.message_body?.slice(0, 60)}"`,
          metadata: JSON.stringify(wouldHaveSentPayload)
        } as any);
      } catch (_) {}

      await base44.asServiceRole.entities.AgentInitiatedMessage.update(message_id, { status: 'sent_dry_run', sent_at: sentAt, dry_run: true });
      await base44.asServiceRole.entities.AgentInitiationBudget.update(budget.id, {
        used_today: usedToday + 1,
        total_sent_lifetime: (budget.total_sent_lifetime || 0) + 1
      });

      // Log to AgentDailyLife
      const said = `[DRY RUN ${sentAt}] "${message.subject_line || ''}" — ${message.message_body?.slice(0, 150)}`;
      const existingLife = await base44.asServiceRole.entities.AgentDailyLife.filter({ agent_name: 'riley', date: todayDateStr }, '-created_date', 1);
      if (existingLife[0]) {
        const prev = (existingLife[0] as any).things_actually_said || '';
        await base44.asServiceRole.entities.AgentDailyLife.update((existingLife[0] as any).id, { things_actually_said: prev ? prev + '\n\n' + said : said });
      } else {
        await base44.asServiceRole.entities.AgentDailyLife.create({ agent_name: 'riley', date: todayDateStr, things_actually_said: said });
      }

      res.json({ message_id, status: 'sent_dry_run', dispatched_dry_run: true, would_have_sent_payload: wouldHaveSentPayload });
      return;

    } else {
      // LIVE MODE — TODO Phase 1B: APNs integration
      // POST https://api.push.apple.com/3/device/{device_token}
      // Headers: { authorization: `bearer ${apns_jwt}`, 'apns-topic': 'com.hermetica.james', 'apns-priority': urgency === 'drop_everything' ? '10' : '5' }
      // Body: { aps: { alert: { title: message.subject_line, body: message.message_body }, badge: 1 }, agent: 'riley', message_id }
      await base44.asServiceRole.entities.AgentInitiatedMessage.update(message_id, { status: 'sent_dry_run', sent_at: sentAt, notes: 'Live APNs dispatch not yet implemented — treated as dry run' });
      res.json({ message_id, status: 'sent_dry_run', dispatched_dry_run: true, note: 'Live APNs dispatch TODO — Phase 1B' });
      return;
    }

  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
