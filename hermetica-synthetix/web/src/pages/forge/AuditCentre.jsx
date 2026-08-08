import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ShieldCheck, CheckCircle, AlertCircle, AlertTriangle, Play } from 'lucide-react';
import ForgeLayout from '@/components/forge/ForgeLayout';
import ForgeCard from '@/components/forge/ForgeCard';
import ForgeButton from '@/components/forge/ForgeButton';

const AUDIT_TYPES = [
  { key: 'render_quality', label: 'Render Quality', color: '#3B82F6', desc: 'File URL, format, dimensions, no corruption' },
  { key: 'brand_compliance', label: 'Brand Compliance', color: '#C9A84C', desc: 'Colours, voice, Hermetica branding' },
  { key: 'accessibility', label: 'Accessibility', color: '#10B981', desc: 'WCAG, alt text, semantic HTML, contrast' },
  { key: 'seo', label: 'SEO', color: '#8B5CF6', desc: 'Titles, descriptions, headings, keywords' },
  { key: 'legal', label: 'Legal / Disclaimer', color: '#EF4444', desc: 'Fundraiser disclaimers, no false claims' },
  { key: 'functional', label: 'Functional', color: '#06B6D4', desc: 'Links, forms, CTAs, downloads' },
  { key: 'security', label: 'Security', color: '#F59E0B', desc: 'No exposed keys, XSS prevention, file restrictions' },
  { key: 'agent_safety', label: 'Agent Safety', color: '#EC4899', desc: 'Prompt injection, boundaries, escalation' },
  { key: 'end_to_end', label: 'End-to-End Test', color: '#10B981', desc: 'Full user journey from page to download' },
  { key: 'market_ready', label: 'Market Ready', color: '#C9A84C', desc: 'All checks: SEO, legal, functional, brand' },
];

const STATUS_CONFIG = {
  passed: { color: '#10B981', icon: '✓', bg: '#0E1A0E', border: '#10B981' },
  failed: { color: '#EF4444', icon: '✗', bg: '#1A0A0A', border: '#7F1D1D' },
  warning: { color: '#F59E0B', icon: '⚠', bg: '#1A1000', border: '#F59E0B' },
  pending: { color: '#6B7280', icon: '○', bg: '#0E0E1C', border: '#2A2A4A' },
};

export default function AuditCentre() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ project_id: '', asset_id: '', landing_page_id: '', agent_build_id: '', audit_type: 'functional' });
  const [loading, setLoading] = useState(null);
  const [result, setResult] = useState(null);
  const [e2eLoading, setE2eLoading] = useState(false);

  const { data: projects = [] } = useQuery({ queryKey: ['riley-projects-list'], queryFn: () => base44.entities.RileyProject.list() });
  const { data: assets = [] } = useQuery({ queryKey: ['all-assets'], queryFn: () => base44.entities.GeneratedAsset.list('-created_date', 30) });
  const { data: pages = [] } = useQuery({ queryKey: ['all-pages'], queryFn: () => base44.entities.LandingPage.list('-created_date', 20) });
  const { data: agents = [] } = useQuery({ queryKey: ['all-agents'], queryFn: () => base44.entities.AgentBuild.list('-created_date', 20) });
  const { data: audits = [] } = useQuery({ queryKey: ['all-audits'], queryFn: () => base44.entities.QualityAudit.list('-created_date', 30) });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const runAudit = async (auditType) => {
    setLoading(auditType); setResult(null);
    try {
      const r = await base44.functions.invoke('runQualityAudit', {
        project_id: form.project_id || 'global',
        asset_id: form.asset_id || undefined,
        landing_page_id: form.landing_page_id || undefined,
        agent_build_id: form.agent_build_id || undefined,
        audit_type: auditType
      });
      setResult({ ...r.data, audit_type: auditType });
      qc.invalidateQueries(['all-audits']);
    } catch (e) { setResult({ success: false, error: e.message }); } finally { setLoading(null); }
  };

  const runE2E = async () => {
    if (!form.project_id) { alert('Select a project for E2E test.'); return; }
    setE2eLoading(true); setResult(null);
    try {
      const r = await base44.functions.invoke('runEndToEndTest', {
        project_id: form.project_id,
        landing_page_id: form.landing_page_id || undefined
      });
      setResult({ ...r.data, audit_type: 'end_to_end' });
      qc.invalidateQueries(['all-audits']);
    } catch (e) { setResult({ success: false, error: e.message }); } finally { setE2eLoading(false); }
  };

  const inputStyle = { width: '100%', background: '#080812', border: '1px solid #2A2A4A', borderRadius: 8, padding: '8px 12px', color: '#E2E8F0', fontSize: 12, fontFamily: 'sans-serif', boxSizing: 'border-box' };
  const labelStyle = { fontSize: 10, color: '#9CA3AF', fontFamily: 'sans-serif', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4, display: 'block' };

  return (
    <ForgeLayout title="QA Audit Centre" subtitle="Quality, brand, legal, security, and market readiness checks">
      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 20 }}>
        {/* Config Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <ForgeCard title="Audit Target">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
              <div><label style={labelStyle}>Project</label>
                <select style={inputStyle} value={form.project_id} onChange={e => set('project_id', e.target.value)}>
                  <option value="">No Project (Global)</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div><label style={labelStyle}>Asset (optional)</label>
                <select style={inputStyle} value={form.asset_id} onChange={e => set('asset_id', e.target.value)}>
                  <option value="">None (project-level)</option>
                  {assets.map(a => <option key={a.id} value={a.id}>{a.name} ({a.asset_type})</option>)}
                </select>
              </div>
              <div><label style={labelStyle}>Landing Page (optional)</label>
                <select style={inputStyle} value={form.landing_page_id} onChange={e => set('landing_page_id', e.target.value)}>
                  <option value="">None</option>
                  {pages.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                </select>
              </div>
              <div><label style={labelStyle}>Agent (optional)</label>
                <select style={inputStyle} value={form.agent_build_id} onChange={e => set('agent_build_id', e.target.value)}>
                  <option value="">None</option>
                  {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
            </div>
          </ForgeCard>

          <ForgeCard title="Run Audit">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {AUDIT_TYPES.map(at => (
                <button key={at.key} onClick={() => runAudit(at.key)} disabled={!!loading}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: '#080812', border: `1px solid ${at.color}33`, borderRadius: 8, cursor: loading ? 'not-allowed' : 'pointer', transition: 'border-color 0.15s', textAlign: 'left', opacity: loading && loading !== at.key ? 0.5 : 1 }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = at.color}
                  onMouseLeave={e => e.currentTarget.style.borderColor = `${at.color}33`}>
                  {loading === at.key ? (
                    <span style={{ width: 14, height: 14, border: `2px solid ${at.color}`, borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
                  ) : (
                    <ShieldCheck size={13} style={{ color: at.color, flexShrink: 0 }} />
                  )}
                  <div>
                    <div style={{ fontSize: 11, color: at.color, fontFamily: 'sans-serif', fontWeight: 600 }}>{at.label}</div>
                    <div style={{ fontSize: 9, color: '#4B5563', fontFamily: 'sans-serif' }}>{at.desc}</div>
                  </div>
                </button>
              ))}
            </div>
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #1E1E35' }}>
              <ForgeButton onClick={runE2E} loading={e2eLoading} variant="green" icon={Play}>
                Run Full E2E Test
              </ForgeButton>
            </div>
          </ForgeCard>
        </div>

        {/* Results */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {result && (
            <div style={{
              background: STATUS_CONFIG[result.status]?.bg || STATUS_CONFIG.pending.bg,
              border: `1px solid ${STATUS_CONFIG[result.status]?.border || '#2A2A4A'}`,
              borderRadius: 12, padding: 20
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <div style={{ fontSize: 24, color: STATUS_CONFIG[result.status]?.color || '#6B7280' }}>
                  {STATUS_CONFIG[result.status]?.icon || '○'}
                </div>
                <div>
                  <div style={{ fontSize: 14, color: '#E2E8F0', fontFamily: 'sans-serif', fontWeight: 700 }}>
                    {result.audit_type?.replace(/_/g, ' ').toUpperCase()} — {result.status?.toUpperCase()}
                  </div>
                  <div style={{ fontSize: 12, color: '#9CA3AF', fontFamily: 'sans-serif' }}>
                    Score: {result.score}/100
                  </div>
                </div>
              </div>

              {result.error && <div style={{ fontSize: 12, color: '#EF4444', fontFamily: 'sans-serif', marginBottom: 10 }}>Error: {result.error}</div>}

              {result.checks && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
                  {result.checks.map((c, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                      <span style={{ color: c.passed ? '#10B981' : '#EF4444', fontSize: 12, flexShrink: 0, marginTop: 1 }}>{c.passed ? '✓' : '✗'}</span>
                      <div>
                        <span style={{ fontSize: 11, color: '#E2E8F0', fontFamily: 'sans-serif', fontWeight: c.passed ? 400 : 600 }}>{c.name}</span>
                        <span style={{ fontSize: 10, color: '#6B7280', fontFamily: 'sans-serif', marginLeft: 8 }}>{c.notes}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {result.bugs_found?.length > 0 && (
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 11, color: '#EF4444', fontFamily: 'sans-serif', fontWeight: 600, marginBottom: 6 }}>BUGS FOUND</div>
                  {result.bugs_found.map((b, i) => (
                    <div key={i} style={{ fontSize: 11, color: '#FCA5A5', fontFamily: 'sans-serif', marginBottom: 4, paddingLeft: 12 }}>
                      [{b.severity?.toUpperCase() || 'MEDIUM'}] {b.description}
                      {b.recommended_fix && <div style={{ fontSize: 10, color: '#9CA3AF', marginTop: 2 }}>Fix: {b.recommended_fix}</div>}
                    </div>
                  ))}
                </div>
              )}

              {result.findings?.summary && (
                <div style={{ fontSize: 11, color: '#9CA3AF', fontFamily: 'sans-serif', fontStyle: 'italic' }}>
                  {typeof result.findings === 'string' ? result.findings : result.findings.summary}
                </div>
              )}
            </div>
          )}

          {/* Audit History */}
          <ForgeCard title="Audit History">
            {audits.length === 0 ? (
              <p style={{ color: '#374151', fontSize: 12, fontFamily: 'sans-serif' }}>No audits run yet.</p>
            ) : audits.map(a => {
              const cfg = STATUS_CONFIG[a.status] || STATUS_CONFIG.pending;
              let bugsArr = [];
              try { bugsArr = JSON.parse(a.bugs_found || '[]'); } catch { }
              return (
                <div key={a.id} style={{ padding: '10px 0', borderBottom: '1px solid #1E1E35', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <span style={{ color: cfg.color, fontSize: 14, flexShrink: 0 }}>{cfg.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, color: '#E2E8F0', fontFamily: 'sans-serif', fontWeight: 500 }}>{a.name}</div>
                    <div style={{ fontSize: 10, color: '#4B5563', fontFamily: 'sans-serif' }}>
                      {a.audit_type} · Score: {a.score || 0}/100 · {bugsArr.length} bug(s)
                    </div>
                  </div>
                  <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: `${cfg.color}22`, color: cfg.color, border: `1px solid ${cfg.color}44`, fontFamily: 'sans-serif' }}>
                    {a.status}
                  </span>
                </div>
              );
            })}
          </ForgeCard>
        </div>
      </div>
    </ForgeLayout>
  );
}