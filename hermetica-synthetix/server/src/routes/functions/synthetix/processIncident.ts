// Ported from synthetix-ai/base44/functions/processIncident/entry.ts
import { registerFunction } from '../registry.js';

registerFunction('processIncident', async (req, res, base44) => {
  try {
    // Require authentication and admin role for all calls
    const user = await base44.auth.me();
    if (!user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    if (user.role !== 'admin') {
      res.status(403).json({ error: 'Admin only' });
      return;
    }

    const { app_id, incident_type, severity, source_ip, target_resource, layer_detected, raw_event, notes } = req.body || {};
    if (!app_id || !incident_type || !severity) {
      res.status(400).json({ error: 'app_id, incident_type, severity required' });
      return;
    }

    const now = new Date().toISOString();
    const shouldBlock = (severity === 'high' || severity === 'critical') && !!source_ip;
    const escalate = severity === 'critical' ? 'james' : (severity === 'high' ? 'james_ai' : 'none');

    // Create incident
    const incident: any = await base44.asServiceRole.entities.IncidentLog.create({
      app_id,
      incident_type,
      severity,
      layer_detected: layer_detected || 0,
      source_ip: source_ip || '',
      target_resource: target_resource || '',
      auto_blocked: shouldBlock,
      escalated_to: escalate,
      status: 'new',
      timestamp: now,
      notes: notes || (raw_event ? JSON.stringify(raw_event).slice(0, 500) : '')
    });

    // Update SecurityPosture last_incident_at
    const postures: any = await base44.asServiceRole.entities.SecurityPosture.filter({ app_id }, '-created_date', 1);
    if (postures[0]) {
      await base44.asServiceRole.entities.SecurityPosture.update(postures[0].id, {
        last_incident_at: now
      });
    }

    // Add to ThreatIntelFeed if blocking
    if (shouldBlock) {
      const existing: any = await base44.asServiceRole.entities.ThreatIntelFeed.filter({ ioc_value: source_ip, ioc_type: 'ip' }, '-created_date', 1);
      if (existing[0]) {
        await base44.asServiceRole.entities.ThreatIntelFeed.update(existing[0].id, {
          last_seen: now,
          auto_block_status: 'active',
          confidence: Math.min(100, (existing[0].confidence || 50) + 10)
        });
      } else {
        await base44.asServiceRole.entities.ThreatIntelFeed.create({
          feed_source: 'fortress_auto',
          ioc_type: 'ip',
          ioc_value: source_ip,
          confidence: severity === 'critical' ? 90 : 70,
          first_seen: now,
          last_seen: now,
          applied_to_apps: [app_id],
          auto_block_status: 'active'
        });
      }
    }

    // Log to ActivityLog
    const activitySeverity = severity === 'critical' ? 'Critical' : severity === 'high' ? 'Error' : severity === 'medium' ? 'Warning' : 'Info';
    await base44.asServiceRole.entities.ActivityLog.create({
      event_type: 'fortress_incident',
      actor: 'processIncident',
      summary: `[${severity.toUpperCase()}] ${incident_type} detected in ${app_id} — layer ${layer_detected || '?'}${source_ip ? ` from ${source_ip}` : ''}`,
      severity: activitySeverity,
      timestamp: now
    }).catch(() => {});

    const nextAction = escalate !== 'none'
      ? `Escalated to ${escalate}. ${shouldBlock ? 'IP added to ThreatIntelFeed.' : ''}`
      : shouldBlock ? 'IP added to ThreatIntelFeed.' : 'Logged. Monitor for recurrence.';

    res.json({
      incident_id: incident.id,
      severity,
      auto_blocked: shouldBlock,
      escalated_to: escalate,
      next_action: nextAction
    });
    return;
  } catch (error: any) {
    res.status(500).json({ error: error.message });
    return;
  }
});
