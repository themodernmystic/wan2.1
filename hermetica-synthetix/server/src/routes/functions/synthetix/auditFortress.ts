// Ported from synthetix-ai/base44/functions/auditFortress/entry.ts
import { registerFunction } from '../registry.js';

const LAYER_RING_MAP: Record<number, string> = {
  1: 'outer', 2: 'outer', 3: 'inner', 4: 'middle', 5: 'middle',
  6: 'middle', 7: 'inner', 8: 'foundation', 9: 'inner', 10: 'foundation',
  11: 'middle', 12: 'outer', 13: 'inner', 14: 'outer', 15: 'foundation',
  16: 'inner', 17: 'foundation', 18: 'middle', 19: 'outer', 20: 'command', 21: 'command'
};

const RING_WEIGHT: Record<string, number> = { outer: 1, middle: 1.5, inner: 2, foundation: 2.5, command: 3 };

function gradeFromScore(score: number) {
  if (score >= 90) return 'A';
  if (score >= 75) return 'B';
  if (score >= 60) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}

function weakestRing(layers: any[]) {
  const failed = layers.filter((l) => l.status === 'failed' || l.status === 'degraded');
  if (!failed.length) {
    const planned = layers.filter((l) => l.status === 'planned');
    if (!planned.length) return 'command';
    // Return ring of first planned layer by ring priority
    const priority = ['command', 'foundation', 'inner', 'middle', 'outer'];
    for (const ring of priority) {
      if (planned.some((l) => l.ring === ring)) return ring;
    }
    return 'outer';
  }
  const priority = ['command', 'foundation', 'inner', 'middle', 'outer'];
  for (const ring of priority) {
    if (failed.some((l) => l.ring === ring)) return ring;
  }
  return 'outer';
}

registerFunction('auditFortress', async (req, res, base44) => {
  try {
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      res.status(403).json({ error: 'Admin only' });
      return;
    }

    const { app_id, deep_scan } = req.body || {};
    if (!app_id) {
      res.status(400).json({ error: 'app_id required' });
      return;
    }

    // Fetch all 21 layers for this app
    const layers: any = await base44.asServiceRole.entities.FortressLayerStatus.filter({ app_id }, 'layer_number', 21);

    if (!layers.length) {
      res.status(404).json({ error: 'No layers found for app. Seed FortressLayerStatus first.' });
      return;
    }

    const now = new Date().toISOString();
    const criticalGaps: string[] = [];
    let totalWeightedScore = 0;
    let totalWeight = 0;
    let layersActive = 0;

    for (const layer of layers) {
      const ring = layer.ring || LAYER_RING_MAP[layer.layer_number] || 'outer';
      const weight = RING_WEIGHT[ring] || 1;
      const coverage = layer.coverage_percent ?? 0;

      // Deep scan: update last_health_check
      if (deep_scan) {
        await base44.asServiceRole.entities.FortressLayerStatus.update(layer.id, {
          last_health_check: now
        });
      }

      totalWeightedScore += coverage * weight;
      totalWeight += weight * 100;

      if (layer.status === 'live') layersActive++;
      if (layer.status === 'failed' || (layer.coverage_percent || 0) < 20) {
        criticalGaps.push(String(layer.layer_number));
        // Create incident for failed layers
        await base44.asServiceRole.entities.IncidentLog.create({
          app_id,
          incident_type: 'compliance_drift',
          severity: layer.ring === 'command' || layer.ring === 'foundation' ? 'high' : 'medium',
          layer_detected: layer.layer_number,
          target_resource: layer.layer_name,
          status: 'new',
          timestamp: now,
          notes: `Audit flagged layer ${layer.layer_number} (${layer.layer_name}) as ${layer.status} with ${layer.coverage_percent ?? 0}% coverage`
        });
      }
    }

    const overallScore = totalWeight > 0 ? Math.round((totalWeightedScore / totalWeight) * 100) : 0;
    const ring = weakestRing(layers);
    const grade = gradeFromScore(overallScore);

    // Upsert SecurityPosture
    const existing: any = await base44.asServiceRole.entities.SecurityPosture.filter({ app_id }, '-created_date', 1);
    const postureData = {
      ring,
      overall_score: overallScore,
      layers_active: layersActive,
      layers_total: 21,
      layers_critical_gap: criticalGaps,
      last_audit_at: now,
      compliance_grade: grade,
      threat_intel_status: 'disconnected'
    };

    let posture: any;
    if (existing[0]) {
      posture = await base44.asServiceRole.entities.SecurityPosture.update(existing[0].id, postureData);
    } else {
      posture = await base44.asServiceRole.entities.SecurityPosture.create({ app_id, app_name: app_id, ...postureData });
    }

    // Log to ActivityLog
    await base44.asServiceRole.entities.ActivityLog.create({
      event_type: 'fortress_audit',
      actor: 'auditFortress',
      summary: `Fortress audit complete: score=${overallScore}, grade=${grade}, gaps=${criticalGaps.length}`,
      severity: criticalGaps.length > 5 ? 'Warning' : 'Info',
      timestamp: now
    }).catch(() => {});

    res.json({
      app_id,
      overall_score: overallScore,
      compliance_grade: grade,
      ring,
      layers_active: layersActive,
      critical_gaps: criticalGaps,
      posture
    });
    return;
  } catch (error: any) {
    res.status(500).json({ error: error.message });
    return;
  }
});
