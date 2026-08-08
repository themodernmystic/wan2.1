// Ported from synthetix-ai/base44/functions/rileyRelationshipManager/entry.ts
import { registerFunction } from '../registry.js';

/**
 * rileyRelationshipManager — Full relationship lifecycle management.
 * Input: { action, data }
 */

const FREQUENCY_DAYS: Record<string, number> = { weekly: 7, fortnightly: 14, monthly: 30, quarterly: 90, as_needed: 180, none: 9999 };

async function llm(prompt: string, apiKey: string, maxTokens = 1500) {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'anthropic/claude-3.5-sonnet', messages: [{ role: 'user', content: prompt }], max_tokens: maxTokens }),
    signal: AbortSignal.timeout(40000),
  });
  const data: any = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.choices[0].message.content;
}

function addDays(date: string, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

registerFunction('rileyRelationshipManager', async (req, res, base44) => {
  try {
    const user = await base44.auth.me();
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { action, data = {} } = req.body || {};
    if (!action) {
      res.status(400).json({ error: 'action is required' });
      return;
    }

    const apiKey = process.env.OPENROUTER_API_KEY || '';
    const today = new Date().toISOString().split('T')[0];

    // ── add_contact ───────────────────────────────────────────────────────────
    if (action === 'add_contact') {
      const { name, email, company, role, relationship_type = 'prospect', warmth = 'cold', interests = [], notes, tags = [], linkedin_url, phone } = data;
      if (!name) {
        res.status(400).json({ error: 'name is required' });
        return;
      }

      // Deduplicate by email
      if (email) {
        const existing = await base44.asServiceRole.entities.RelationshipContact.filter({ email }, '-created_date', 1);
        if (existing.length > 0) {
          res.json({ contact_id: existing[0].id, duplicate: true, message: `Contact with email ${email} already exists.` });
          return;
        }
      }

      const freqDays = FREQUENCY_DAYS[data.follow_up_frequency || 'monthly'];
      const contact = await base44.asServiceRole.entities.RelationshipContact.create({
        name, email: email || '', phone: phone || '', linkedin_url: linkedin_url || '',
        company: company || '', role: role || '', relationship_type,
        warmth, first_contact_date: today, last_contact_date: today,
        next_follow_up: addDays(today, freqDays),
        follow_up_frequency: data.follow_up_frequency || 'monthly',
        total_interactions: 0, interests, notes: notes || '', tags,
      });

      // If investor type, link to InvestorTarget
      let investorTargetId = null;
      if (relationship_type === 'investor') {
        try {
          const invTarget = await base44.asServiceRole.entities.InvestorTarget.create({
            name, email: email || '', company: company || '',
            status: 'identified', notes: `Auto-created from RelationshipContact.`,
          });
          await base44.asServiceRole.entities.RelationshipContact.update(contact.id, { investor_target_id: invTarget.id });
          investorTargetId = invTarget.id;
        } catch (_) {}
      }

      res.json({ contact_id: contact.id, duplicate: false, investor_target_id: investorTargetId });
      return;
    }

    // ── log_interaction ───────────────────────────────────────────────────────
    if (action === 'log_interaction') {
      const { contact_id, interaction_type, summary, sentiment = 'unknown', follow_up_needed = false, follow_up_action, follow_up_by, deal_pipeline_id } = data;
      if (!contact_id) {
        res.status(400).json({ error: 'contact_id is required' });
        return;
      }

      const log = await base44.asServiceRole.entities.InteractionLog.create({
        contact_id, interaction_type, summary: summary || '', sentiment,
        follow_up_needed, follow_up_action: follow_up_action || '',
        follow_up_by: follow_up_by || '', deal_pipeline_id: deal_pipeline_id || '',
        timestamp: new Date().toISOString(), notes: data.notes || '',
      });

      // Update contact's last_contact_date and interaction count
      const contacts = await base44.asServiceRole.entities.RelationshipContact.filter({ id: contact_id }, '-created_date', 1);
      if (contacts[0]) {
        const c: any = contacts[0];
        const freqDays = FREQUENCY_DAYS[c.follow_up_frequency] || 30;
        await base44.asServiceRole.entities.RelationshipContact.update(contact_id, {
          last_contact_date: today,
          total_interactions: (c.total_interactions || 0) + 1,
          next_follow_up: addDays(today, freqDays),
        });

        // Flag negative sentiment for James
        if (sentiment === 'negative') {
          await base44.asServiceRole.entities.ActivityLog.create({
            event_type: 'negative_interaction',
            actor: 'Riley',
            summary: `Negative interaction logged with ${c.name} (${c.company}). Review needed.`,
            severity: 'Warning',
            timestamp: new Date().toISOString(),
            notes: summary || '',
          }).catch(() => {});
        }
      }

      res.json({ log_id: log.id, sentiment_flagged: sentiment === 'negative' });
      return;
    }

    // ── find_contacts ─────────────────────────────────────────────────────────
    if (action === 'find_contacts') {
      const { need, relationship_type: rt, warmth: w, tags: t, limit = 20 } = data;
      const query: any = {};
      if (rt) query.relationship_type = rt;
      if (w) query.warmth = w;
      const contacts = await base44.asServiceRole.entities.RelationshipContact.filter(query, '-last_contact_date', limit);

      if (need && contacts.length > 0) {
        const contactList = contacts.map((c: any) => `${c.name} (${c.company}, ${c.role}) — ${c.relationship_type}, ${c.warmth} — interests: ${(c.interests || []).join(', ')}`).join('\n');
        const raw = await llm(`James Hatcher needs: "${need}"\n\nHis network:\n${contactList}\n\nWho are the top 3-5 most relevant people for this need and why? Return JSON only: { "matches": [{ "name": "...", "reason": "...", "suggested_approach": "..." }] }`, apiKey, 800);
        let matches;
        try {
          const match = raw.match(/\{[\s\S]*\}/);
          matches = JSON.parse(match ? match[0] : raw).matches || [];
        } catch (_) { matches = []; }
        res.json({ contacts, ai_matches: matches, total: contacts.length });
        return;
      }

      res.json({ contacts, total: contacts.length });
      return;
    }

    // ── get_follow_ups ────────────────────────────────────────────────────────
    if (action === 'get_follow_ups') {
      const allContacts = await base44.asServiceRole.entities.RelationshipContact.list('-next_follow_up', 100);
      const overdue = (allContacts as any[]).filter((c) => c.follow_up_frequency !== 'none' && c.next_follow_up && c.next_follow_up <= today);

      const drafts = [];
      for (const contact of overdue.slice(0, 10)) {
        const logs = await base44.asServiceRole.entities.InteractionLog.filter({ contact_id: contact.id }, '-timestamp', 3).catch(() => []);
        const lastLog: any = logs[0];
        try {
          const raw = await llm(`Generate a follow-up for James Hatcher to send to:
Name: ${contact.name}, Company: ${contact.company}, Role: ${contact.role}
Relationship: ${contact.relationship_type}, Warmth: ${contact.warmth}
Last interaction: ${lastLog?.summary || 'No recent interaction'}
Last contact: ${contact.last_contact_date || 'Unknown'}

Message should: reference last interaction specifically, add value, soft CTA, be 3-5 sentences, warm human tone.
Return JSON only: { "subject": "...", "message": "...", "channel": "email" }`, apiKey, 500);
          const match = raw.match(/\{[\s\S]*\}/);
          const draft = JSON.parse(match ? match[0] : raw);
          drafts.push({ contact_id: contact.id, contact_name: contact.name, ...draft });
        } catch (_) {
          drafts.push({ contact_id: contact.id, contact_name: contact.name, message: `Hi ${contact.name}, just checking in — hope all is well.`, channel: 'email' });
        }
      }

      res.json({ overdue_count: overdue.length, drafts, note: 'All drafts require approved_by_james before sending.' });
      return;
    }

    // ── nurture_check ─────────────────────────────────────────────────────────
    if (action === 'nurture_check') {
      const warmContacts = await base44.asServiceRole.entities.RelationshipContact.filter({ warmth: 'warm' }, '-last_contact_date', 50);
      const hotContacts = await base44.asServiceRole.entities.RelationshipContact.filter({ warmth: 'hot' }, '-last_contact_date', 50);
      const champions = await base44.asServiceRole.entities.RelationshipContact.filter({ warmth: 'champion' }, '-last_contact_date', 20);
      const allWarm: any[] = [...warmContacts, ...hotContacts, ...champions];

      const goingCold = [];
      for (const c of allWarm) {
        const freqDays = FREQUENCY_DAYS[c.follow_up_frequency] || 30;
        const lastContact = new Date(c.last_contact_date || c.created_date);
        const daysSince = Math.floor((Date.now() - lastContact.getTime()) / (1000 * 60 * 60 * 24));
        if (daysSince > freqDays * 2) {
          goingCold.push({ contact: c, days_silent: daysSince, priority: c.warmth === 'champion' ? 'HIGH' : 'medium' });
        }
      }

      // Flag champions going cold
      const highPriority = goingCold.filter((g) => g.priority === 'HIGH');
      if (highPriority.length > 0) {
        await base44.asServiceRole.entities.ActivityLog.create({
          event_type: 'champion_going_cold',
          actor: 'Riley',
          summary: `${highPriority.length} champion contact(s) going cold: ${highPriority.map((g) => g.contact.name).join(', ')}`,
          severity: 'Warning',
          timestamp: new Date().toISOString(),
        }).catch(() => {});
      }

      res.json({ warm_contacts: allWarm.length, going_cold: goingCold.length, high_priority: highPriority.map((g) => ({ name: g.contact.name, days_silent: g.days_silent })) });
      return;
    }

    // ── relationship_report ───────────────────────────────────────────────────
    if (action === 'relationship_report') {
      const allContacts = await base44.asServiceRole.entities.RelationshipContact.list('-created_date', 200);
      const byType: Record<string, number> = {};
      const byWarmth: Record<string, number> = {};
      for (const c of allContacts as any[]) {
        byType[c.relationship_type] = (byType[c.relationship_type] || 0) + 1;
        byWarmth[c.warmth] = (byWarmth[c.warmth] || 0) + 1;
      }
      const missingTypes = ['journalist', 'government', 'academic', 'mentor'].filter((t) => !byType[t]);
      res.json({
        total_contacts: allContacts.length,
        by_type: byType,
        by_warmth: byWarmth,
        network_gaps: missingTypes.map((t) => `No ${t}s in network`),
        health_score: Math.min(100, Math.round((byWarmth.warm || 0) * 2 + (byWarmth.hot || 0) * 3 + (byWarmth.champion || 0) * 5)),
      });
      return;
    }

    res.status(400).json({ error: `Unknown action: ${action}` });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
