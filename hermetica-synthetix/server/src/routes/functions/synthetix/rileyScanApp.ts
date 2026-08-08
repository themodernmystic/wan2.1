// Ported from synthetix-ai/base44/functions/rileyScanApp/entry.ts
import type { Request } from 'express';
import { registerFunction } from '../registry.js';
import { env } from '../../../lib/env.js';

/**
 * rileyScanApp — Deep-scan any Hermetica app via workspaceBridge.
 * Builds/updates ProjectGenome and AppRegistry for the target app.
 * Input: { app_id, app_name }
 */

// TODO(port): base44.asServiceRole.functions.invoke has no base44Compat equivalent
// (no in-process function registry lookup exposed to route modules). Reproduced as a
// same-origin HTTP call to our own /api/functions/<name> endpoint, forwarding the
// caller's Authorization header.
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

registerFunction('rileyScanApp', async (req, res, base44) => {
  try {
    const user = await base44.auth.me();
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { app_id, app_name } = req.body || {};
    if (!app_id) {
      res.status(400).json({ error: 'app_id is required' });
      return;
    }

    // 1. Load AppRegistry entry for known entities
    const registryEntries: any = await base44.asServiceRole.entities.AppRegistry.filter({ app_id }, '-created_date', 1);
    const registry = registryEntries[0];
    const knownEntities = registry?.known_entities || [];

    if (knownEntities.length === 0) {
      res.status(400).json({ error: 'No known_entities in AppRegistry for this app_id. Add them first.' });
      return;
    }

    const entityResults: any[] = [];
    const healthyEntities: string[] = [];
    const errorEntities: string[] = [];

    // 2. Probe each known entity via workspaceBridge
    for (const entityName of knownEntities) {
      try {
        const result: any = await invokeFunction(req, 'workspaceBridge', {
          operation: 'list',
          app_id,
          entity: entityName,
          limit: 1,
        });

        const records = Array.isArray(result) ? result : (result?.data || []);
        const sampleRecord = records[0];
        const discoveredFields = sampleRecord ? Object.keys(sampleRecord).filter((k) => !['id', 'created_date', 'updated_date', 'created_by_id'].includes(k)) : [];

        // Try to count total records
        let totalCount = null;
        try {
          const countResult: any = await invokeFunction(req, 'workspaceBridge', {
            operation: 'list',
            app_id,
            entity: entityName,
            limit: 500,
          });
          totalCount = Array.isArray(countResult) ? countResult.length : (countResult?.data?.length || null);
        } catch (_) {}

        entityResults.push({
          entity: entityName,
          status: 'found',
          record_count: totalCount,
          discovered_fields: discoveredFields,
          has_data: records.length > 0,
        });
        healthyEntities.push(entityName);
      } catch (err: any) {
        entityResults.push({ entity: entityName, status: 'error', error: err.message });
        errorEntities.push(entityName);
      }
    }

    // 3. Build/update ProjectGenome
    const genomeData = {
      project_id: app_id,
      entities: healthyEntities,
      design_patterns: `Scanned via workspaceBridge. ${healthyEntities.length}/${knownEntities.length} entities accessible.`,
      risk_zones: errorEntities.length > 0 ? `Inaccessible entities: ${errorEntities.join(', ')}` : 'None detected',
      technical_debt: entityResults.filter((e) => e.has_data === false).map((e) => e.entity).join(', ') || 'None',
      strategic_opportunities: `${entityResults.filter((e) => e.record_count > 0).length} entities have data. ${entityResults.filter((e) => e.has_data === false).length} entities are empty.`,
      last_scanned_at: new Date().toISOString(),
    };

    const existingGenomes: any = await base44.asServiceRole.entities.ProjectGenome.filter({ project_id: app_id }, '-created_date', 1);
    let genome: any;
    if (existingGenomes.length > 0) {
      genome = await base44.asServiceRole.entities.ProjectGenome.update(existingGenomes[0].id, genomeData);
    } else {
      genome = await base44.asServiceRole.entities.ProjectGenome.create(genomeData);
    }

    // 4. Update AppRegistry
    if (registry) {
      await base44.asServiceRole.entities.AppRegistry.update(registry.id, {
        health_status: errorEntities.length === 0 ? 'healthy' : errorEntities.length < knownEntities.length / 2 ? 'warning' : 'critical',
        last_scanned_at: new Date().toISOString(),
      });
    }

    res.json({
      success: true,
      app_id,
      app_name: app_name || registry?.app_name || app_id,
      entities_scanned: knownEntities.length,
      entities_healthy: healthyEntities.length,
      entities_errored: errorEntities.length,
      entity_results: entityResults,
      genome_id: genome?.id,
    });
    return;
  } catch (error: any) {
    res.status(500).json({ error: error.message });
    return;
  }
});
