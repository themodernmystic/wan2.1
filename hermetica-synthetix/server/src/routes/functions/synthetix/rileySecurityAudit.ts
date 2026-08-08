// Ported from synthetix-ai/base44/functions/rileySecurityAudit/entry.ts
import type { Request } from 'express';
import { registerFunction } from '../registry.js';
import { env } from '../../../lib/env.js';

/**
 * rileySecurityAudit — Audit any Hermetica app for OWASP Top 10 vulnerabilities.
 * Input: { app_id, app_name, deep_scan }
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

registerFunction('rileySecurityAudit', async (req, res, base44) => {
  try {
    const user = await base44.auth.me();
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    if (user.role !== 'admin') {
      res.status(403).json({ error: 'Forbidden: Admin only' });
      return;
    }

    const { app_id, app_name: inputAppName, deep_scan = false } = req.body || {};
    if (!app_id && !inputAppName) {
      res.status(400).json({ error: 'app_id or app_name is required' });
      return;
    }

    const apiKey = process.env.OPENROUTER_API_KEY || '';

    // Read AppRegistry for context
    let appRecord: any = null;
    let genomRecord: any = null;
    const query = app_id ? { app_id } : {};
    const apps: any = await base44.asServiceRole.entities.AppRegistry.filter(query, '-created_date', 1);
    if (apps.length > 0) appRecord = apps[0];

    const app_name = inputAppName || appRecord?.app_name || app_id || 'Unknown App';
    const entities = appRecord?.known_entities || [];
    const functions = appRecord?.known_functions || [];

    // Read ProjectGenome if available
    if (appRecord?.app_id) {
      const genomes: any = await base44.asServiceRole.entities.ProjectGenome.filter({ project_id: appRecord.app_id }, '-created_date', 1).catch(() => []);
      if (genomes.length > 0) genomRecord = genomes[0];
    }

    const entitiesText = entities.length > 0 ? entities.join(', ') : 'Unknown (no scan data)';
    const functionsText = functions.length > 0 ? functions.join(', ') : 'Unknown (no scan data)';

    const auditPrompt = `Perform an OWASP Top 10 security audit for this web application.

App Name: ${app_name}
Known Entities (database tables): ${entitiesText}
Known Backend Functions: ${functionsText}
${genomRecord ? `Pages: ${(genomRecord.pages || []).join(', ')}` : ''}

Check each OWASP category:
A01 Broken Access Control — are RLS rules likely on all entities? Any public data that should be private?
A02 Cryptographic Failures — any sensitive data (passwords, keys, PII) stored in plain text fields?
A03 Injection — any user input going directly to queries without sanitisation?
A04 Insecure Design — any architectural security anti-patterns?
A05 Security Misconfiguration — default configs, debug mode, exposed error details?
A06 Vulnerable Components — outdated dependencies or known vulnerable packages?
A07 Identification/Authentication Failures — proper auth on all backend functions?
A08 Software/Data Integrity — CSRF protection, signed updates?
A09 Security Logging Failures — are security events (login, delete, admin) being logged?
A10 SSRF — any server-side request forgery risks in functions that make outbound calls?

For each check, provide: status (pass/fail/warning/unknown), specific details, and fix recommendation.

Return JSON only:
{
  "checks": [
    { "owasp_id": "A01", "name": "Broken Access Control", "status": "warning", "details": "...", "fix_recommendation": "..." }
  ],
  "overall_score": 75,
  "severity_summary": "0 critical, 2 high, 3 medium, 2 low",
  "critical_fixes": ["..."]
}`;

    const fetchRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'anthropic/claude-3.5-sonnet', messages: [{ role: 'user', content: auditPrompt }], max_tokens: 3000 }),
      signal: AbortSignal.timeout(60000),
    });
    const auditData: any = await fetchRes.json();
    if (auditData.error) throw new Error(auditData.error.message || JSON.stringify(auditData.error));

    const raw = auditData.choices[0].message.content;
    let auditResult: any;
    try {
      const match = raw.match(/\{[\s\S]*\}/);
      auditResult = JSON.parse(match ? match[0] : raw);
    } catch (_) {
      auditResult = { checks: [], overall_score: 50, severity_summary: 'Parse error', critical_fixes: [] };
    }

    // Deep scan via workspaceBridge
    let deepScanResults: any = null;
    if (deep_scan && appRecord?.app_url) {
      try {
        deepScanResults = await invokeFunction(req, 'workspaceBridge', {
          target_app_url: appRecord.app_url,
          action: 'health_check',
        });
      } catch (_) {}
    }

    // Generate fix prompts for critical findings
    const fixPromptIds: string[] = [];
    const criticalChecks = (auditResult.checks || []).filter((c: any) => c.status === 'fail');
    for (const check of criticalChecks.slice(0, 3)) {
      try {
        const fp: any = await invokeFunction(req, 'rileyUniversalFix', {
          app_id: app_id || '',
          issue_description: `OWASP ${check.owasp_id} — ${check.name}: ${check.details}`,
          fix_recommendation: check.fix_recommendation,
        });
        if (fp?.prompt_id) fixPromptIds.push(fp.prompt_id);
      } catch (_) {}
    }

    const failCount = (auditResult.checks || []).filter((c: any) => c.status === 'fail').length;
    const warnCount = (auditResult.checks || []).filter((c: any) => c.status === 'warning').length;

    // Save SecurityAuditResult
    const auditRecord: any = await base44.asServiceRole.entities.SecurityAuditResult.create({
      app_id: app_id || '',
      app_name,
      audit_date: new Date().toISOString(),
      owasp_checks: JSON.stringify(auditResult.checks || []),
      vulnerabilities_found: JSON.stringify((auditResult.checks || []).filter((c: any) => c.status !== 'pass')),
      severity_summary: auditResult.severity_summary || `${failCount} fail, ${warnCount} warning`,
      recommendations: (auditResult.critical_fixes || []).join('\n'),
      fix_prompts_generated: fixPromptIds,
      overall_score: auditResult.overall_score || 50,
      status: failCount > 0 ? 'failed' : warnCount > 0 ? 'pending' : 'passed',
    });

    res.json({
      audit_id: auditRecord.id,
      overall_score: auditResult.overall_score,
      severity_summary: auditResult.severity_summary,
      critical_count: failCount,
      warning_count: warnCount,
      fix_prompts_generated: fixPromptIds.length,
      checks: auditResult.checks,
      deep_scan_used: !!deepScanResults,
    });
    return;
  } catch (error: any) {
    res.status(500).json({ error: error.message });
    return;
  }
});
