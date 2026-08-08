import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { BarChart2, Download, FileText, Play } from 'lucide-react';
import ForgeLayout from '@/components/forge/ForgeLayout';
import ForgeCard from '@/components/forge/ForgeCard';
import ForgeButton from '@/components/forge/ForgeButton';

export default function BuildReports() {
  const qc = useQueryClient();
  const [projectId, setProjectId] = useState('');
  const [reportTitle, setReportTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [e2eLoading, setE2eLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [selected, setSelected] = useState(null);

  const { data: projects = [] } = useQuery({ queryKey: ['riley-projects-list'], queryFn: () => base44.entities.RileyProject.list() });
  const { data: reports = [] } = useQuery({ queryKey: ['build-reports-list'], queryFn: () => base44.entities.BuildReport.list('-created_date', 20) });

  const generateReport = async () => {
    if (!projectId) { alert('Select a project.'); return; }
    setLoading(true); setResult(null);
    try {
      const r = await base44.functions.invoke('generateBuildReport', {
        project_id: projectId,
        report_title: reportTitle || undefined
      });
      setResult(r.data);
      qc.invalidateQueries(['build-reports-list']);
    } catch (e) { alert('Report error: ' + e.message); } finally { setLoading(false); }
  };

  const runE2E = async () => {
    if (!projectId) { alert('Select a project.'); return; }
    setE2eLoading(true);
    try {
      const r = await base44.functions.invoke('runEndToEndTest', { project_id: projectId });
      alert(`E2E Test: ${r.data.overall_status} — ${r.data.passed}/${r.data.total_checks} checks passed. Score: ${r.data.score}/100`);
    } catch (e) { alert('E2E error: ' + e.message); } finally { setE2eLoading(false); }
  };

  const exportMarkdown = (r) => {
    const summary = r.summary || {};
    const md = `# ${r.report_title}

## Build Summary
${r.build_summary}

## Market Ready Status
${r.market_ready_status}

## Assets Generated
${r.assets_generated || '{}'}

## Tests Run
${r.tests_run || '{}'}

## Bugs Found
${r.bugs_found || '[]'}

## Known Limitations
${r.known_limitations || 'None'}

## Provider Status
${r.provider_status || '{}'}

## Recommended Next Steps
${r.recommended_next_steps || 'N/A'}

---
Generated: ${new Date(r.created_date).toLocaleString('en-AU')}
`;
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${r.report_title.replace(/\s+/g, '_')}.md`; a.click();
  };

  const exportJson = (r) => {
    const blob = new Blob([JSON.stringify(r, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${r.report_title.replace(/\s+/g, '_')}.json`; a.click();
  };

  const marketReadyColor = { market_ready: '#10B981', ready_with_limitations: '#F59E0B', not_ready: '#EF4444' };
  const marketReadyLabel = { market_ready: '✓ MARKET READY', ready_with_limitations: '⚠ READY WITH LIMITATIONS', not_ready: '✗ NOT READY' };
  const e2eColor = { passed: '#10B981', passed_with_warnings: '#F59E0B', failed: '#EF4444', not_run: '#6B7280' };

  const inputStyle = { width: '100%', background: '#080812', border: '1px solid #2A2A4A', borderRadius: 8, padding: '8px 12px', color: '#E2E8F0', fontSize: 12, fontFamily: 'sans-serif', boxSizing: 'border-box' };
  const labelStyle = { fontSize: 10, color: '#9CA3AF', fontFamily: 'sans-serif', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4, display: 'block' };

  return (
    <ForgeLayout title="Build Report Centre" subtitle="End-to-end project assessment and market readiness verification">
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 20 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <ForgeCard title="Generate Report">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
              <div><label style={labelStyle}>Project *</label>
                <select style={inputStyle} value={projectId} onChange={e => setProjectId(e.target.value)}>
                  <option value="">Select Project</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div><label style={labelStyle}>Report Title (optional)</label>
                <input style={inputStyle} value={reportTitle} onChange={e => setReportTitle(e.target.value)} placeholder="e.g. Pre-Launch Verification Report" />
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 14 }}>
              <ForgeButton onClick={generateReport} loading={loading} icon={BarChart2} variant="gold">
                {loading ? 'Generating...' : 'Generate Build Report'}
              </ForgeButton>
              <ForgeButton onClick={runE2E} loading={e2eLoading} icon={Play} variant="blue">
                {e2eLoading ? 'Running...' : 'Run E2E Test First'}
              </ForgeButton>
            </div>
          </ForgeCard>

          {result && (
            <ForgeCard title="Latest Report" accent="#10B981">
              <div style={{ fontSize: 12, color: marketReadyColor[result.market_ready_status] || '#9CA3AF', fontFamily: 'sans-serif', fontWeight: 700, marginBottom: 12 }}>
                {marketReadyLabel[result.market_ready_status] || result.market_ready_status}
              </div>
              {result.summary && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                  {Object.entries(result.summary).filter(([k]) => k !== 'known_limitations').map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontFamily: 'sans-serif' }}>
                      <span style={{ color: '#6B7280' }}>{k.replace(/_/g, ' ')}</span>
                      <span style={{ color: '#E2E8F0', fontWeight: 600 }}>{String(v)}</span>
                    </div>
                  ))}
                </div>
              )}
              {result.summary?.known_limitations?.length > 0 && (
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 10, color: '#F59E0B', fontFamily: 'sans-serif', fontWeight: 600, marginBottom: 6 }}>KNOWN LIMITATIONS</div>
                  {result.summary.known_limitations.map((l, i) => (
                    <div key={i} style={{ fontSize: 10, color: '#FCD34D', fontFamily: 'sans-serif', paddingLeft: 8 }}>⚠ {l}</div>
                  ))}
                </div>
              )}
              <div style={{ fontSize: 10, color: '#4B5563', fontFamily: 'sans-serif' }}>Report ID: {result.report_id}</div>
            </ForgeCard>
          )}
        </div>

        <div>
          {selected ? (
            <div style={{ background: '#0E0E1C', border: '1px solid #1E1E35', borderRadius: 12, padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 14, color: '#E2E8F0', fontFamily: 'sans-serif', fontWeight: 700 }}>{selected.report_title}</div>
                  <div style={{ fontSize: 11, color: '#4B5563', fontFamily: 'sans-serif' }}>{new Date(selected.created_date).toLocaleString('en-AU')}</div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <ForgeButton variant="ghost" size="sm" icon={Download} onClick={() => exportMarkdown(selected)}>Export MD</ForgeButton>
                  <ForgeButton variant="ghost" size="sm" icon={FileText} onClick={() => exportJson(selected)}>Export JSON</ForgeButton>
                  <ForgeButton variant="ghost" size="sm" onClick={() => setSelected(null)}>Close</ForgeButton>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
                <div style={{ background: `${marketReadyColor[selected.market_ready_status] || '#6B7280'}11`, border: `1px solid ${marketReadyColor[selected.market_ready_status] || '#6B7280'}44`, borderRadius: 8, padding: '12px 14px', textAlign: 'center' }}>
                  <div style={{ fontSize: 12, color: marketReadyColor[selected.market_ready_status] || '#9CA3AF', fontFamily: 'sans-serif', fontWeight: 700 }}>
                    {marketReadyLabel[selected.market_ready_status] || selected.market_ready_status}
                  </div>
                </div>
                <div style={{ background: `${e2eColor[selected.final_e2e_result] || '#6B7280'}11`, border: `1px solid ${e2eColor[selected.final_e2e_result] || '#6B7280'}44`, borderRadius: 8, padding: '12px 14px', textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#9CA3AF', fontFamily: 'sans-serif' }}>E2E Test</div>
                  <div style={{ fontSize: 12, color: e2eColor[selected.final_e2e_result] || '#9CA3AF', fontFamily: 'sans-serif', fontWeight: 700 }}>
                    {selected.final_e2e_result || 'not_run'}
                  </div>
                </div>
                <div style={{ background: '#0E0E1C', border: '1px solid #2A2A4A', borderRadius: 8, padding: '12px 14px', textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#9CA3AF', fontFamily: 'sans-serif' }}>Created</div>
                  <div style={{ fontSize: 11, color: '#E2E8F0', fontFamily: 'sans-serif' }}>{new Date(selected.created_date).toLocaleDateString('en-AU')}</div>
                </div>
              </div>

              <div style={{ fontSize: 12, color: '#CBD5E1', fontFamily: 'sans-serif', lineHeight: 1.8, marginBottom: 12 }}>{selected.build_summary}</div>

              {selected.known_limitations && selected.known_limitations !== 'None identified' && (
                <div style={{ background: '#1A1000', border: '1px solid #F59E0B', borderRadius: 8, padding: 12, marginBottom: 12 }}>
                  <div style={{ fontSize: 10, color: '#F59E0B', fontFamily: 'sans-serif', fontWeight: 600, marginBottom: 6 }}>KNOWN LIMITATIONS</div>
                  <div style={{ fontSize: 11, color: '#FCD34D', fontFamily: 'sans-serif' }}>{selected.known_limitations}</div>
                </div>
              )}

              {selected.recommended_next_steps && (
                <div style={{ background: '#0E1A0E', border: '1px solid #10B981', borderRadius: 8, padding: 12 }}>
                  <div style={{ fontSize: 10, color: '#10B981', fontFamily: 'sans-serif', fontWeight: 600, marginBottom: 6 }}>RECOMMENDED NEXT STEPS</div>
                  <div style={{ fontSize: 11, color: '#6EE7B7', fontFamily: 'sans-serif' }}>{selected.recommended_next_steps}</div>
                </div>
              )}
            </div>
          ) : (
            <ForgeCard title="All Build Reports">
              {reports.length === 0 ? (
                <p style={{ color: '#374151', fontSize: 12, fontFamily: 'sans-serif' }}>No reports generated yet. Select a project and click Generate.</p>
              ) : reports.map(r => (
                <div key={r.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #1E1E35', cursor: 'pointer' }}
                  onClick={() => setSelected(r)}>
                  <div>
                    <div style={{ fontSize: 12, color: '#E2E8F0', fontFamily: 'sans-serif', fontWeight: 500 }}>{r.report_title}</div>
                    <div style={{ fontSize: 10, color: '#4B5563', fontFamily: 'sans-serif' }}>
                      {new Date(r.created_date).toLocaleDateString('en-AU')} · E2E: {r.final_e2e_result}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 10, padding: '2px 10px', borderRadius: 20, background: `${marketReadyColor[r.market_ready_status] || '#6B7280'}22`, color: marketReadyColor[r.market_ready_status] || '#6B7280', border: `1px solid ${marketReadyColor[r.market_ready_status] || '#6B7280'}44`, fontFamily: 'sans-serif', whiteSpace: 'nowrap' }}>
                      {r.market_ready_status}
                    </span>
                    <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
                      <button onClick={() => exportMarkdown(r)} style={{ background: 'transparent', border: '1px solid #2A2A4A', borderRadius: 6, padding: '3px 8px', cursor: 'pointer', color: '#9CA3AF', fontSize: 9 }}>MD</button>
                      <button onClick={() => exportJson(r)} style={{ background: 'transparent', border: '1px solid #2A2A4A', borderRadius: 6, padding: '3px 8px', cursor: 'pointer', color: '#9CA3AF', fontSize: 9 }}>JSON</button>
                    </div>
                  </div>
                </div>
              ))}
            </ForgeCard>
          )}
        </div>
      </div>
    </ForgeLayout>
  );
}