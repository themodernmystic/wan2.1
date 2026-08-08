// Ported from synthetix-ai/base44/functions/syncThreatIntel/entry.ts
import { registerFunction } from '../registry.js';

// Simulated IOC data for feeds that aren't live-connected yet
function getMockIOCs(feedSource: string) {
  const mock: Record<string, any[]> = {
    'AbuseIPDB': [
      { ioc_type: 'ip', ioc_value: '185.220.101.47', confidence: 92 },
      { ioc_type: 'ip', ioc_value: '45.142.212.100', confidence: 88 },
    ],
    'AlienVault OTX': [
      { ioc_type: 'domain', ioc_value: 'malware-c2.example.net', confidence: 78 },
      { ioc_type: 'hash', ioc_value: 'a1b2c3d4e5f6789012345678901234567890abcd', confidence: 95 },
    ],
    'MISP': [
      { ioc_type: 'ip', ioc_value: '198.51.100.23', confidence: 85 },
      { ioc_type: 'url', ioc_value: 'http://phish.evil.example.com/login', confidence: 91 },
    ]
  };
  return mock[feedSource] || [];
}

registerFunction('syncThreatIntel', async (req, res, base44) => {
  try {
    // TODO(port): base44.auth.isAuthenticated() has no base44Compat equivalent (only
    // auth.me() is shimmed). Derived from me() instead — same semantics, since the
    // compat shim's me() already returns null for unauthenticated requests.
    const user = await base44.auth.me();
    const isAuthenticated = !!user;
    if (isAuthenticated) {
      if (user?.role !== 'admin') {
        res.status(403).json({ error: 'Admin only' });
        return;
      }
    }

    const { feed_source, force_refresh } = req.body || {};
    const sources = feed_source ? [feed_source] : ['AbuseIPDB', 'AlienVault OTX', 'MISP'];

    const now = new Date().toISOString();
    let totalNew = 0;
    let totalUpdated = 0;

    for (const source of sources) {
      const iocs = getMockIOCs(source);

      for (const ioc of iocs) {
        const existing = await base44.asServiceRole.entities.ThreatIntelFeed.filter(
          { ioc_value: ioc.ioc_value, ioc_type: ioc.ioc_type }, '-created_date', 1
        );

        if (existing[0] && !force_refresh) {
          // Update last_seen only
          await base44.asServiceRole.entities.ThreatIntelFeed.update((existing[0] as any).id, { last_seen: now });
          totalUpdated++;
        } else if (existing[0] && force_refresh) {
          await base44.asServiceRole.entities.ThreatIntelFeed.update((existing[0] as any).id, {
            last_seen: now,
            confidence: ioc.confidence,
            auto_block_status: ioc.confidence >= 80 ? 'active' : 'paused'
          });
          totalUpdated++;
        } else {
          await base44.asServiceRole.entities.ThreatIntelFeed.create({
            feed_source: source,
            ioc_type: ioc.ioc_type,
            ioc_value: ioc.ioc_value,
            confidence: ioc.confidence,
            first_seen: now,
            last_seen: now,
            applied_to_apps: [],
            auto_block_status: ioc.confidence >= 80 ? 'active' : 'paused'
          });
          totalNew++;
        }
      }
    }

    // Log sync
    await base44.asServiceRole.entities.ActivityLog.create({
      event_type: 'threat_intel_sync',
      actor: 'syncThreatIntel',
      summary: `Threat intel sync complete: ${totalNew} new IOCs, ${totalUpdated} updated across ${sources.join(', ')}`,
      severity: 'Info',
      timestamp: now
    }).catch(() => {});

    res.json({
      sources_synced: sources,
      new_iocs: totalNew,
      updated_iocs: totalUpdated,
      total_distributed: totalNew + totalUpdated,
      synced_at: now
    });

  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
