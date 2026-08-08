// Ported from synthetix-ai/base44/functions/rileyDeployAgentFleet/entry.ts
import { registerFunction } from '../registry.js';

/**
 * rileyDeployAgentFleet — Deploy a fleet of specialised AI agents.
 * Input: { fleet_type, target_app_id, target_platform, count }
 */

const HERMETICA_BRAND_VOICE = `Hermetica Holdings brand voice: Mystical yet professional. Ancient wisdom meets cutting-edge AI. Founder James Hatcher is the Modern Mystic. Tone: confident, intelligent, spiritual, never corporate-bland. Always disclose AI nature. Never claim to be human. Never make financial promises. Never share private data.`;

const FLEET_SPECS: Record<string, any[]> = {
  content: [
    { name: 'Hermetica Blog Writer', role: 'content_creator', purpose: 'Generate weekly blog posts aligned with Hermetica brand — AI consciousness, spiritual tech, ethics, construction safety, privacy.', schedule: 'weekly' },
    { name: 'Hermetica Social Poster', role: 'social_poster', purpose: 'Create platform-specific social content daily across Twitter, LinkedIn, Instagram for Hermetica brands.', schedule: 'daily' },
    { name: 'Hermetica Newsletter Writer', role: 'content_creator', purpose: 'Draft the weekly Hermetica newsletter — insights, product updates, spiritual wisdom, AI developments.', schedule: 'weekly' },
  ],
  sales: [
    { name: 'Lead Qualifier Agent', role: 'lead_qualifier', purpose: 'Score and qualify incoming leads for all Hermetica products. Draft personalised first responses.', schedule: 'on_demand' },
    { name: 'Proposal Writer Agent', role: 'sales_assistant', purpose: 'Generate tailored client proposals from brief descriptions. Use Hermetica case studies and social proof.', schedule: 'on_demand' },
    { name: 'Follow-Up Agent', role: 'sales_assistant', purpose: 'Track and draft follow-up messages for warm leads in the pipeline. Flag overdue follow-ups.', schedule: 'daily' },
  ],
  support: [
    { name: 'FAQ Responder Agent', role: 'customer_support', purpose: 'Answer common questions from Hermetica product knowledge bases. Escalate complex issues to James.', schedule: 'on_demand' },
    { name: 'Escalation Handler Agent', role: 'customer_support', purpose: 'Identify issues requiring James attention. Triage, summarise, and route critical support requests.', schedule: 'on_demand' },
  ],
  research: [
    { name: 'Market Research Agent', role: 'research_analyst', purpose: 'Deep dive research on any topic relevant to Hermetica. Return structured intelligence reports.', schedule: 'on_demand' },
    { name: 'Competitor Analysis Agent', role: 'research_analyst', purpose: 'Detailed competitor analysis — features, pricing, weaknesses, positioning opportunities.', schedule: 'weekly' },
    { name: 'Trend Spotter Agent', role: 'research_analyst', purpose: 'Identify emerging technology trends, market shifts, and opportunities relevant to Hermetica portfolio.', schedule: 'weekly' },
  ],
  social: [
    { name: 'Twitter/X Agent', role: 'social_poster', purpose: 'Daily tweets, thread creation, and engagement strategy for James Hatcher and Hermetica brands.', schedule: 'daily', platform: 'twitter' },
    { name: 'LinkedIn Agent', role: 'social_poster', purpose: 'Weekly thought leadership posts for James Hatcher on AI, spirituality, consciousness, and building.', schedule: 'weekly', platform: 'linkedin' },
    { name: 'Instagram Agent', role: 'social_poster', purpose: 'Visual content planning and captions for Hermetic Crystals and Mystic Sage Instagram accounts.', schedule: 'daily', platform: 'instagram' },
    { name: 'Community Manager Agent', role: 'community_manager', purpose: 'Draft responses to comments, DMs, and mentions across all Hermetica brand platforms.', schedule: 'daily' },
  ],
};

FLEET_SPECS.full_stack = [
  ...FLEET_SPECS.content,
  ...FLEET_SPECS.sales,
  ...FLEET_SPECS.support,
  ...FLEET_SPECS.research,
  ...FLEET_SPECS.social,
];

// TODO(port): base44.asServiceRole.functions.invoke(...) has no equivalent in
// base44Compat. Ported as a same-process HTTP call to this server's own
// /api/functions/<name> route, forwarding the caller's auth headers. Requires
// 'generateAgent' (ported in this same batch), 'runAgentTests' and 'debugAgent'
// to be registered.
async function invokeFunction(req: any, name: string, payload: any): Promise<any> {
  const port = process.env.PORT || 8080;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (req.headers.authorization) headers.Authorization = req.headers.authorization as string;
  if (req.headers.cookie) headers.Cookie = req.headers.cookie as string;
  const r = await fetch(`http://localhost:${port}/api/functions/${name}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload || {}),
  });
  const data: any = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data?.error || `${name} invocation failed (${r.status})`);
  return data;
}

registerFunction('rileyDeployAgentFleet', async (req, res, base44) => {
  try {
    const user = await base44.auth.me();
    if (!user) { res.status(401).json({ error: 'Unauthorized' }); return; }

    const body = req.body || {};
    const { fleet_type = 'content', target_app_id, target_platform } = body;
    const specs = FLEET_SPECS[fleet_type];
    if (!specs) { res.status(400).json({ error: `Unknown fleet_type: ${fleet_type}` }); return; }

    const results: { created: any[]; passed: any[]; needDebug: any[] } = { created: [], passed: [], needDebug: [] };

    for (const spec of specs) {
      // Generate agent via existing function
      let agentResult: any;
      try {
        agentResult = await invokeFunction(req, 'generateAgent', {
          name: spec.name,
          purpose: spec.purpose,
          brand_voice: HERMETICA_BRAND_VOICE,
          safety_boundaries: [
            'Never claim to be human — always disclose AI nature',
            'Never make financial promises or guarantees',
            'Never share private or sensitive user data',
            'Always escalate to James for critical decisions',
            'Never post without approved_by_james for outreach',
          ],
          target_app_id: target_app_id || '',
        });
      } catch (_) {
        agentResult = { agent_id: null, agent_name: spec.name };
      }

      // Run tests
      let testPassed = false;
      try {
        const testResult: any = await invokeFunction(req, 'runAgentTests', {
          agent_id: agentResult?.agent_id || spec.name,
          agent_name: spec.name,
          test_type: 'basic',
        });
        testPassed = testResult?.passed === true || testResult?.status === 'pass';
      } catch (_) {
        testPassed = false;
      }

      // Auto-debug if tests failed
      if (!testPassed && agentResult?.agent_id) {
        try {
          await invokeFunction(req, 'debugAgent', {
            agent_id: agentResult.agent_id,
            issue: 'Failed automated post-deployment tests',
          });
          results.needDebug.push(spec.name);
        } catch (_) {}
      } else if (testPassed) {
        results.passed.push(spec.name);
      }

      // Create AgentFleet record
      const fleetRecord = await base44.asServiceRole.entities.AgentFleet.create({
        agent_build_id: agentResult?.agent_id || '',
        agent_name: spec.name,
        agent_role: spec.role,
        assigned_app_id: target_app_id || '',
        assigned_platform: spec.platform || target_platform || '',
        schedule: spec.schedule || 'on_demand',
        status: testPassed ? 'active' : 'draft',
        performance_score: testPassed ? 75 : null,
        total_actions_taken: 0,
        total_revenue_attributed: 0,
        auto_approve: false,
        error_count: testPassed ? 0 : 1,
        notes: `Deployed via rileyDeployAgentFleet. Fleet type: ${fleet_type}. Tests: ${testPassed ? 'passed' : 'failed'}.`,
      });

      results.created.push({ fleet_id: fleetRecord.id, name: spec.name, role: spec.role, status: fleetRecord.status });
    }

    // Log
    await base44.asServiceRole.entities.ActivityLog.create({
      event_type: 'agent_fleet_deployed',
      actor: 'Riley',
      summary: `${fleet_type} fleet deployed. ${results.created.length} agents created, ${results.passed.length} passed tests, ${results.needDebug.length} need debug.`,
      severity: 'Info',
      timestamp: new Date().toISOString(),
    }).catch(() => {});

    res.json({
      fleet_type,
      agents_created: results.created.length,
      agents_passed_tests: results.passed.length,
      agents_need_debug: results.needDebug.length,
      deployment_summary: results.created,
    });
    return;
  } catch (error: any) {
    res.status(500).json({ error: error.message });
    return;
  }
});
