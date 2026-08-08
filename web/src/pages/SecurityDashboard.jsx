import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import FortressRings from '@/components/security/FortressRings';
import LayerGrid from '@/components/security/LayerGrid';
import IncidentFeed from '@/components/security/IncidentFeed';
import ThreatTicker from '@/components/security/ThreatTicker';

const APP_ID = 'prime-gen-suite';

const LAYER_SEED = [
  { layer_number: 1,  layer_name: 'Authentication & Identity', ring: 'outer',      tool_deployed: 'Authentik',        status: 'planned', coverage_percent: 0 },
  { layer_number: 2,  layer_name: 'API Security & Reverse Proxy', ring: 'outer',   tool_deployed: 'Traefik',          status: 'planned', coverage_percent: 0 },
  { layer_number: 3,  layer_name: 'Secrets Management',        ring: 'inner',      tool_deployed: 'Infisical',        status: 'planned', coverage_percent: 0 },
  { layer_number: 4,  layer_name: 'Vulnerability Scanning',    ring: 'middle',     tool_deployed: 'Trivy',            status: 'planned', coverage_percent: 0 },
  { layer_number: 5,  layer_name: 'Network IDS',               ring: 'middle',     tool_deployed: 'CrowdSec',         status: 'planned', coverage_percent: 0 },
  { layer_number: 6,  layer_name: 'SIEM',                      ring: 'middle',     tool_deployed: 'Wazuh',            status: 'planned', coverage_percent: 0 },
  { layer_number: 7,  layer_name: 'Data Encryption',           ring: 'inner',      tool_deployed: 'MinIO',            status: 'planned', coverage_percent: 0 },
  { layer_number: 8,  layer_name: 'Pentest',                   ring: 'foundation', tool_deployed: 'ZAP + Nuclei',     status: 'planned', coverage_percent: 0 },
  { layer_number: 9,  layer_name: 'Zero Trust Networking',     ring: 'inner',      tool_deployed: 'Headscale',        status: 'planned', coverage_percent: 0 },
  { layer_number: 10, layer_name: 'Audit Logging',             ring: 'foundation', tool_deployed: 'OpenTelemetry',    status: 'planned', coverage_percent: 0 },
  { layer_number: 11, layer_name: 'AI Threat Detection',       ring: 'middle',     tool_deployed: 'Falco',            status: 'planned', coverage_percent: 0 },
  { layer_number: 12, layer_name: 'Deception / Honeypot',      ring: 'outer',      tool_deployed: 'OpenCanary',       status: 'planned', coverage_percent: 0 },
  { layer_number: 13, layer_name: 'Mobile Security',           ring: 'inner',      tool_deployed: 'MobSF',            status: 'planned', coverage_percent: 0 },
  { layer_number: 14, layer_name: 'Threat Intel Feeds',        ring: 'outer',      tool_deployed: 'MISP',             status: 'planned', coverage_percent: 0 },
  { layer_number: 15, layer_name: 'Supply Chain Security',     ring: 'foundation', tool_deployed: 'Sigstore + Syft',  status: 'planned', coverage_percent: 0 },
  { layer_number: 16, layer_name: 'RASP',                      ring: 'inner',      tool_deployed: 'OpenRASP',         status: 'planned', coverage_percent: 0 },
  { layer_number: 17, layer_name: 'IaC Security',              ring: 'foundation', tool_deployed: 'Checkov',          status: 'planned', coverage_percent: 0 },
  { layer_number: 18, layer_name: 'Behavioural Analytics',     ring: 'middle',     tool_deployed: 'ElastAlert2',      status: 'planned', coverage_percent: 0 },
  { layer_number: 19, layer_name: 'Certificate Management',    ring: 'outer',      tool_deployed: 'Cert-Manager',     status: 'planned', coverage_percent: 0 },
  { layer_number: 20, layer_name: 'Incident Response',         ring: 'command',    tool_deployed: 'Velociraptor',     status: 'planned', coverage_percent: 0 },
  { layer_number: 21, layer_name: 'Posture & Compliance',      ring: 'command',    tool_deployed: 'DefectDojo',       status: 'planned', coverage_percent: 0 },
];

async function seedLayers() {
  try {
    const existing = await base44.entities.FortressLayerStatus.filter({ app_id: APP_ID }, 'layer_number', 1);
    if (existing.length > 0) return;
    for (const layer of LAYER_SEED) {
      await base44.entities.FortressLayerStatus.create({ ...layer, app_id: APP_ID });
    }
  } catch (_) {}
}

async function ensurePosture() {
  try {
    const existing = await base44.entities.SecurityPosture.filter({ app_id: APP_ID }, '-created_date', 1);
    if (!existing.length) {
      await base44.entities.SecurityPosture.create({
        app_id: APP_ID,
        app_name: 'Prime Gen Suite',
        ring: 'outer',
        overall_score: 0,
        layers_active: 0,
        layers_total: 21,
        layers_critical_gap: [],
        threat_intel_status: 'disconnected',
        auto_block_enabled: false,
        compliance_grade: 'F',
        notes: 'Phase 0 — schema installed. Begin Phase 1 deployment.'
      });
    }
  } catch (_) {}
}

const GRADE_COLOR = { A: '#4ade80', B: '#86efac', C: '#facc15', D: '#f97316', F: '#ef4444' };

export default function SecurityDashboard() {
  const [layers, setLayers] = useState([]);
  const [posture, setPosture] = useState(null);
  const [loading, setLoading] = useState(true);
  const [auditing, setAuditing] = useState(false);
  const [auditResult, setAuditResult] = useState(null);
  const [seeded, setSeeded] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [layerData, postureData] = await Promise.all([
        base44.entities.FortressLayerStatus.filter({ app_id: APP_ID }, 'layer_number', 21),
        base44.entities.SecurityPosture.filter({ app_id: APP_ID }, '-created_date', 1)
      ]);
      setLayers(layerData);
      setPosture(postureData[0] || null);
    } catch (_) {}
  }, []);

  useEffect(() => {
    (async () => {
      if (!seeded) {
        await seedLayers();
        await ensurePosture();
        setSeeded(true);
      }
      await loadData();
      setLoading(false);
    })();
  }, []);

  const handleRunAudit = async () => {
    setAuditing(true);
    setAuditResult(null);
    try {
      const res = await base44.functions.invoke('auditFortress', { app_id: APP_ID, deep_scan: true });
      setAuditResult(res.data);
      await loadData();
    } catch (e) {
      setAuditResult({ error: e.message });
    }
    setAuditing(false);
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0B0B0D', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: '#D4AF37', textAlign: 'center' }}>
        <div style={{ fontSize: '32px', marginBottom: '10px' }}>🏰</div>
        <p style={{ fontFamily: 'monospace', color: '#F5E8C7', opacity: 0.5, fontSize: '13px', letterSpacing: '0.1em' }}>INITIALISING FORTRESS...</p>
      </div>
    </div>
  );

  const grade = posture?.compliance_grade || 'F';
  const score = posture?.overall_score ?? 0;
  const activeCount = layers.filter(l => l.status === 'live').length;

  return (
    <div style={{ minHeight: '100vh', background: '#0B0B0D', color: '#F5E8C7', fontFamily: 'sans-serif' }}>
      {/* Header */}
      <div style={{ borderBottom: '1px solid #D4AF3722', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: '#D4AF37', letterSpacing: '0.04em' }}>🏰 FORTRESS</h1>
          <p style={{ margin: 0, fontSize: '11px', color: '#F5E8C7', opacity: 0.4, letterSpacing: '0.08em', marginTop: '2px' }}>HERMETICA HOLDINGS — 21-LAYER SECURITY SPINE</p>
        </div>
        <button
          onClick={handleRunAudit}
          disabled={auditing}
          style={{
            background: auditing ? '#1a1a2e' : '#D4AF37',
            color: auditing ? '#D4AF37' : '#0B0B0D',
            border: '1px solid #D4AF37',
            borderRadius: '8px',
            padding: '8px 20px',
            fontSize: '12px',
            fontWeight: '700',
            letterSpacing: '0.06em',
            cursor: auditing ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s'
          }}
        >
          {auditing ? '⟳ AUDITING...' : '▶ RUN AUDIT'}
        </button>
      </div>

      <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>

        {auditResult && (
          <div style={{
            background: auditResult.error ? '#1a0a0a' : '#0a1a0a',
            border: `1px solid ${auditResult.error ? '#ef4444' : '#4ade80'}44`,
            borderRadius: '8px', padding: '12px 16px', marginBottom: '20px',
            fontSize: '12px', color: auditResult.error ? '#ef4444' : '#4ade80', fontFamily: 'monospace'
          }}>
            {auditResult.error
              ? `✗ Audit failed: ${auditResult.error}`
              : `✓ Audit complete — Score: ${auditResult.overall_score}/100 · Grade: ${auditResult.compliance_grade} · ${auditResult.critical_gaps?.length || 0} critical gaps`
            }
          </div>
        )}

        {/* Top row: rings + score cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '24px', marginBottom: '28px', alignItems: 'start' }}>
          <div style={{ background: '#0f0f1a', border: '1px solid #D4AF3722', borderRadius: '12px', padding: '8px' }}>
            <FortressRings layers={layers} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
            {/* Score */}
            <div style={{ background: '#0f0f1a', border: '1px solid #D4AF3733', borderRadius: '10px', padding: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: '42px', fontWeight: '800', color: '#D4AF37', lineHeight: 1 }}>{score}</div>
              <div style={{ fontSize: '10px', color: '#F5E8C7', opacity: 0.45, letterSpacing: '0.1em', marginTop: '4px' }}>POSTURE SCORE</div>
            </div>
            {/* Grade */}
            <div style={{ background: '#0f0f1a', border: `1px solid ${GRADE_COLOR[grade]}44`, borderRadius: '10px', padding: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: '42px', fontWeight: '800', color: GRADE_COLOR[grade] || '#ef4444', lineHeight: 1 }}>{grade}</div>
              <div style={{ fontSize: '10px', color: '#F5E8C7', opacity: 0.45, letterSpacing: '0.1em', marginTop: '4px' }}>COMPLIANCE GRADE</div>
            </div>
            {/* Layers */}
            <div style={{ background: '#0f0f1a', border: '1px solid #4ade8022', borderRadius: '10px', padding: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: '42px', fontWeight: '800', color: '#4ade80', lineHeight: 1 }}>{activeCount}</div>
              <div style={{ fontSize: '10px', color: '#F5E8C7', opacity: 0.45, letterSpacing: '0.1em', marginTop: '4px' }}>LAYERS LIVE</div>
            </div>
            {/* Phase */}
            <div style={{ background: '#0f0f1a', border: '1px solid #a78bfa22', borderRadius: '10px', padding: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: '42px', fontWeight: '800', color: '#a78bfa', lineHeight: 1 }}>0</div>
              <div style={{ fontSize: '10px', color: '#F5E8C7', opacity: 0.45, letterSpacing: '0.1em', marginTop: '4px' }}>PHASE (of 6)</div>
            </div>
            {/* Weakest ring */}
            <div style={{ background: '#0f0f1a', border: '1px solid #f9731622', borderRadius: '10px', padding: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: '18px', fontWeight: '800', color: '#f97316', lineHeight: 1, marginTop: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {posture?.ring || 'outer'}
              </div>
              <div style={{ fontSize: '10px', color: '#F5E8C7', opacity: 0.45, letterSpacing: '0.1em', marginTop: '8px' }}>WEAKEST RING</div>
            </div>
            {/* Threat intel */}
            <div style={{ background: '#0f0f1a', border: '1px solid #60a5fa22', borderRadius: '10px', padding: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: '14px', fontWeight: '700', color: '#60a5fa', lineHeight: 1, marginTop: '10px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {posture?.threat_intel_status || 'disconnected'}
              </div>
              <div style={{ fontSize: '10px', color: '#F5E8C7', opacity: 0.45, letterSpacing: '0.1em', marginTop: '10px' }}>THREAT INTEL</div>
            </div>
          </div>
        </div>

        {/* Threat intel ticker */}
        <div style={{ background: '#0a0a14', border: '1px solid #D4AF3722', borderRadius: '8px', padding: '10px 16px', marginBottom: '24px' }}>
          <div style={{ fontSize: '10px', color: '#D4AF37', letterSpacing: '0.1em', marginBottom: '6px', opacity: 0.6 }}>▶ THREAT INTEL FEED</div>
          <ThreatTicker />
        </div>

        {/* 21-layer grid */}
        <div style={{ marginBottom: '28px' }}>
          <h2 style={{ fontSize: '13px', color: '#D4AF37', letterSpacing: '0.1em', marginBottom: '14px', fontWeight: '600' }}>
            21-LAYER STATUS GRID
          </h2>
          <LayerGrid layers={layers} />
        </div>

        {/* Incident feed */}
        <div style={{ background: '#0f0f1a', border: '1px solid #D4AF3722', borderRadius: '12px', padding: '20px' }}>
          <h2 style={{ fontSize: '13px', color: '#D4AF37', letterSpacing: '0.1em', marginBottom: '14px', fontWeight: '600', margin: '0 0 14px' }}>
            INCIDENT FEED (LIVE)
          </h2>
          <IncidentFeed appId={APP_ID} />
        </div>

        <div style={{ textAlign: 'center', marginTop: '24px', color: '#F5E8C7', opacity: 0.15, fontSize: '10px', letterSpacing: '0.1em' }}>
          HERMETICA FORTRESS — PHASE 0 OF 6 — SCHEMA INSTALLED — DEPLOYMENT PENDING
        </div>
      </div>
    </div>
  );
}