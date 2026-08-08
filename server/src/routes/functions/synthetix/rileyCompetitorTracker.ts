// Ported from synthetix-ai/base44/functions/rileyCompetitorTracker/entry.ts
import { registerFunction } from '../registry.js';

/**
 * rileyCompetitorTracker — Monitor competitors and update intelligence profiles.
 * Input: { competitor_name, deep_scan }
 */

const THREAT_RANK: Record<string, number> = { low: 1, medium: 2, high: 3, critical: 4 };

async function searchCompetitor(name: string, apiKey: string) {
  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-flash-1.5',
        messages: [{ role: 'user', content: `Search the web for the latest news about "${name}" company. Report: new product launches, pricing changes, funding announcements, key hires, partnerships, or strategic pivots in 2026. Be specific and factual.` }],
        max_tokens: 600,
      }),
      signal: AbortSignal.timeout(20000),
    });
    const data: any = await res.json();
    return data.choices?.[0]?.message?.content || '';
  } catch (_) { return ''; }
}

registerFunction('rileyCompetitorTracker', async (req, res, base44) => {
  try {
    const user = await base44.auth.me();
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { competitor_name, deep_scan = false } = req.body || {};
    const apiKey = process.env.OPENROUTER_API_KEY || '';

    // Get competitors to scan
    let competitors: any;
    if (competitor_name) {
      competitors = await base44.asServiceRole.entities.CompetitorProfile.filter({ name: competitor_name }, '-created_date', 1);
      if (competitors.length === 0) {
        // Create a new profile for this competitor
        const newComp = await base44.asServiceRole.entities.CompetitorProfile.create({
          name: competitor_name, status: 'watching', threat_level: 'medium',
          last_scanned_at: new Date().toISOString(),
        });
        competitors = [newComp];
      }
    } else {
      competitors = await base44.asServiceRole.entities.CompetitorProfile.filter({ status: 'active' }, '-last_scanned_at', 20);
    }

    let totalChanges = 0;
    let alertsGenerated = 0;

    for (const comp of competitors) {
      const newFindings = await searchCompetitor(comp.name, apiKey);
      if (!newFindings) continue;

      // Assess changes with LLM
      const assessPrompt = `Competitor intelligence update for ${comp.name}.

Previous intel:
- Products: ${comp.products || 'Unknown'}
- Pricing: ${comp.pricing || 'Unknown'}
- Strengths: ${comp.strengths || 'Unknown'}
- Threat level: ${comp.threat_level || 'medium'}

New findings from today:
${newFindings}

Assess for Hermetica Holdings (AI consciousness, construction safety, privacy, executive AI, spiritual tech, ethics):
- What changed?
- Did threat level increase or decrease?
- Any opportunities to exploit their weaknesses?
- Recommended Hermetica response?

Return JSON only:
{
  "changes_detected": ["change1", "change2"],
  "threat_level_change": "same",
  "new_threat_level": "medium",
  "opportunities": ["opp1"],
  "recommended_response": "...",
  "updated_strengths": "...",
  "updated_weaknesses": "..."
}`;

      let assessment: any;
      try {
        const assessRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: 'anthropic/claude-3.5-sonnet', messages: [{ role: 'user', content: assessPrompt }], max_tokens: 1000 }),
          signal: AbortSignal.timeout(30000),
        });
        const assessData: any = await assessRes.json();
        const raw = assessData.choices?.[0]?.message?.content || '{}';
        const match = raw.match(/\{[\s\S]*\}/);
        assessment = JSON.parse(match ? match[0] : raw);
      } catch (_) {
        assessment = { changes_detected: [], threat_level_change: 'same', new_threat_level: comp.threat_level };
      }

      const changes = assessment.changes_detected || [];
      totalChanges += changes.length;

      // Update CompetitorProfile
      await base44.asServiceRole.entities.CompetitorProfile.update(comp.id, {
        threat_level: assessment.new_threat_level || comp.threat_level,
        strengths: assessment.updated_strengths || comp.strengths,
        weaknesses: assessment.updated_weaknesses || comp.weaknesses,
        last_scanned_at: new Date().toISOString(),
        notes: `[${new Date().toISOString().split('T')[0]}] ${changes.join('; ')}. ${comp.notes || ''}`.substring(0, 2000),
      }).catch(() => {});

      // Escalate if threat increased to high/critical
      const prevRank = THREAT_RANK[comp.threat_level] || 2;
      const newRank = THREAT_RANK[assessment.new_threat_level] || 2;
      if (assessment.threat_level_change === 'increased' && newRank >= 3) {
        await base44.asServiceRole.entities.IntelligenceReport.create({
          title: `⚠️ Threat Escalation: ${comp.name}`,
          report_type: 'threat_alert',
          summary: `${comp.name} threat level increased to ${assessment.new_threat_level}. Changes: ${changes.join(', ')}`,
          full_report: JSON.stringify(assessment),
          relevance_score: 85,
          urgency: assessment.new_threat_level === 'critical' ? 'critical' : 'act_now',
          action_items: JSON.stringify([assessment.recommended_response]),
          related_competitor: comp.name,
          auto_generated: true,
          james_read: false,
          tags: ['competitor', 'threat', comp.name.toLowerCase()],
        }).catch(() => {});
        alertsGenerated++;
      }
    }

    res.json({
      competitors_scanned: competitors.length,
      changes_detected: totalChanges,
      alerts_generated: alertsGenerated,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
