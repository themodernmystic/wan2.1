import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Bot, Play, Bug, CheckCircle, AlertCircle, Code, Copy, Download } from 'lucide-react';
import ForgeLayout from '@/components/forge/ForgeLayout';
import ForgeCard from '@/components/forge/ForgeCard';
import ForgeButton from '@/components/forge/ForgeButton';

const AGENT_TYPES = ['custom', 'customer_service', 'sales', 'content', 'coach', 'tutor', 'operations', 'safety', 'privacy', 'mystic'];
const AVAILABLE_TOOLS = ['web_search', 'calendar_access', 'email_send', 'database_read', 'file_upload', 'payment_process', 'crm_lookup'];

export default function AgentBuilder() {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    project_id: '', name: '', agent_type: 'custom', purpose: '',
    audience: '', personality: 'Professional, warm, helpful, clear',
    boundaries: 'No harmful content. Escalate legal, medical, or crisis topics immediately.',
    tools_enabled: [], memory_enabled: false, knowledge_base_urls: []
  });
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [debugging, setDebugging] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [activeTab, setActiveTab] = useState('builder');
  const [specificIssue, setSpecificIssue] = useState('');

  const { data: projects = [] } = useQuery({ queryKey: ['riley-projects-list'], queryFn: () => base44.entities.RileyProject.list() });
  const { data: agents = [] } = useQuery({ queryKey: ['agent-builds-list'], queryFn: () => base44.entities.AgentBuild.list('-created_date', 20) });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const toggleTool = (t) => set('tools_enabled', form.tools_enabled.includes(t) ? form.tools_enabled.filter(x => x !== t) : [...form.tools_enabled, t]);

  const generate = async () => {
    if (!form.name || !form.purpose) { setError('Name and purpose required.'); return; }
    setLoading(true); setError(null); setResult(null);
    try {
      const r = await base44.functions.invoke('generateAgent', form);
      if (r.data.success) { setResult(r.data); qc.invalidateQueries(['agent-builds-list']); }
      else setError(r.data.error || 'Generation failed.');
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  };

  const runTests = async (agentBuildId) => {
    setTesting(true);
    try {
      const r = await base44.functions.invoke('runAgentTests', { agent_build_id: agentBuildId });
      alert(`Test result: ${r.data.passed ? '✓ PASSED' : '✗ FAILED'} — Score: ${r.data.average_score}/100 — Critical failures: ${r.data.critical_failures}`);
      qc.invalidateQueries(['agent-builds-list']);
    } catch (e) { alert('Test error: ' + e.message); } finally { setTesting(false); }
  };

  const debugAgent = async (agentBuildId) => {
    setDebugging(true);
    try {
      const r = await base44.functions.invoke('debugAgent', { agent_build_id: agentBuildId, specific_issue: specificIssue });
      if (r.data.success) {
        alert(`Debug complete. ${r.data.debug_summary}. Run tests again to verify fixes.`);
        qc.invalidateQueries(['agent-builds-list']);
      } else alert('Debug error: ' + r.data.error);
    } catch (e) { alert('Debug error: ' + e.message); } finally { setDebugging(false); }
  };

  const markReady = async (agentId) => {
    const agentList = await base44.entities.AgentBuild.filter({ id: agentId });
    const agent = agentList[0];
    if (!agent) return;
    if (!agent.system_prompt) { alert('Cannot mark ready: no system prompt.'); return; }
    if (!agent.test_results) { alert('Cannot mark ready: no test results. Run tests first.'); return; }
    const tr = JSON.parse(agent.test_results || '{}');
    if (tr.critical_failures > 0) { alert(`Cannot mark ready: ${tr.critical_failures} critical failure(s). Debug and retest.`); return; }
    await base44.entities.AgentBuild.update(agentId, { status: 'ready' });
    qc.invalidateQueries(['agent-builds-list']);
  };

  const copyEmbed = (code) => { navigator.clipboard.writeText(code); alert('Embed code copied!'); };

  const inputStyle = { width: '100%', background: '#080812', border: '1px solid #2A2A4A', borderRadius: 8, padding: '8px 12px', color: '#E2E8F0', fontSize: 12, fontFamily: 'sans-serif', boxSizing: 'border-box' };
  const labelStyle = { fontSize: 10, color: '#9CA3AF', fontFamily: 'sans-serif', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4, display: 'block' };
  const TAB = { padding: '8px 16px', fontSize: 11, fontFamily: 'sans-serif', cursor: 'pointer', fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', border: 'none', background: 'transparent' };

  const statusColor = { draft: '#6B7280', generated: '#3B82F6', testing: '#F59E0B', test_failed: '#EF4444', ready: '#10B981', deployed: '#10B981', failed: '#EF4444' };

  return (
    <ForgeLayout title="Agent Builder" subtitle="AI agent design, testing, and deployment">
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, borderBottom: '1px solid #1E1E35' }}>
        {['builder', 'agents'].map(t => (
          <button key={t} style={{ ...TAB, color: activeTab === t ? '#C9A84C' : '#6B7280', borderBottom: activeTab === t ? '2px solid #C9A84C' : '2px solid transparent' }}
            onClick={() => setActiveTab(t)}>{t === 'builder' ? 'Build New Agent' : 'All Agents'}</button>
        ))}
      </div>

      {activeTab === 'builder' && (
        <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 20 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <ForgeCard title="Agent Configuration">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                <div><label style={labelStyle}>Project</label>
                  <select style={inputStyle} value={form.project_id} onChange={e => set('project_id', e.target.value)}>
                    <option value="">No Project</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div><label style={labelStyle}>Agent Name *</label><input style={inputStyle} value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Hermetica Support Agent" /></div>
                <div><label style={labelStyle}>Agent Type</label>
                  <select style={inputStyle} value={form.agent_type} onChange={e => set('agent_type', e.target.value)}>
                    {AGENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div><label style={labelStyle}>Purpose *</label><textarea style={{ ...inputStyle, height: 80, resize: 'vertical' }} value={form.purpose} onChange={e => set('purpose', e.target.value)} placeholder="What does this agent do? Be specific." /></div>
                <div><label style={labelStyle}>Audience</label><input style={inputStyle} value={form.audience} onChange={e => set('audience', e.target.value)} placeholder="Who uses this agent?" /></div>
                <div><label style={labelStyle}>Personality</label><textarea style={{ ...inputStyle, height: 60, resize: 'vertical' }} value={form.personality} onChange={e => set('personality', e.target.value)} /></div>
                <div><label style={labelStyle}>Boundaries</label><textarea style={{ ...inputStyle, height: 70, resize: 'vertical' }} value={form.boundaries} onChange={e => set('boundaries', e.target.value)} /></div>
                <div>
                  <label style={labelStyle}>Enabled Tools</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {AVAILABLE_TOOLS.map(t => (
                      <button key={t} onClick={() => toggleTool(t)}
                        style={{ padding: '3px 10px', borderRadius: 20, fontSize: 10, fontFamily: 'sans-serif', cursor: 'pointer', background: form.tools_enabled.includes(t) ? '#3B82F622' : 'transparent', border: `1px solid ${form.tools_enabled.includes(t) ? '#3B82F6' : '#2A2A4A'}`, color: form.tools_enabled.includes(t) ? '#93C5FD' : '#6B7280' }}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.memory_enabled} onChange={e => set('memory_enabled', e.target.checked)} />
                  <span style={{ fontSize: 11, color: '#9CA3AF', fontFamily: 'sans-serif' }}>Enable Memory</span>
                </label>
              </div>
            </ForgeCard>
            <ForgeButton onClick={generate} loading={loading} icon={Bot} variant="gold">
              {loading ? 'Generating...' : 'Generate Agent'}
            </ForgeButton>
            {error && <div style={{ background: '#1A0A0A', border: '1px solid #7F1D1D', borderRadius: 8, padding: 12, fontSize: 11, color: '#EF4444', fontFamily: 'sans-serif' }}>{error}</div>}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {result?.success && (
              <ForgeCard title="Agent Generated" accent="#10B981">
                <div style={{ fontSize: 12, color: '#6EE7B7', fontFamily: 'sans-serif', marginBottom: 10 }}>Agent created successfully.</div>
                <div style={{ fontSize: 11, color: '#9CA3AF', fontFamily: 'sans-serif', marginBottom: 14 }}>
                  Agent Build ID: {result.agent_build_id} · Tests: {result.test_questions_count} questions generated
                </div>
                {result.system_prompt_preview && (
                  <div style={{ background: '#080812', borderRadius: 8, padding: 12, marginBottom: 12 }}>
                    <div style={{ fontSize: 10, color: '#9CA3AF', fontFamily: 'sans-serif', marginBottom: 6 }}>SYSTEM PROMPT PREVIEW</div>
                    <div style={{ fontSize: 11, color: '#CBD5E1', fontFamily: 'sans-serif', whiteSpace: 'pre-wrap' }}>{result.system_prompt_preview}</div>
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <ForgeButton variant="blue" size="sm" icon={Play} onClick={() => runTests(result.agent_build_id)} loading={testing}>Run Tests</ForgeButton>
                  <ForgeButton variant="ghost" size="sm" icon={CheckCircle} onClick={() => markReady(result.agent_build_id)}>Mark Ready</ForgeButton>
                </div>
              </ForgeCard>
            )}
          </div>
        </div>
      )}

      {activeTab === 'agents' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {agents.length === 0 ? (
            <div style={{ color: '#4B5563', fontSize: 13, fontFamily: 'sans-serif', padding: 20 }}>No agents built yet.</div>
          ) : agents.map(a => {
            let testData = null;
            try { testData = JSON.parse(a.test_results || 'null'); } catch { }
            return (
              <div key={a.id} style={{ background: '#0E0E1C', border: '1px solid #1E1E35', borderRadius: 12, padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                      <span style={{ fontSize: 13, color: '#E2E8F0', fontFamily: 'sans-serif', fontWeight: 600 }}>{a.name}</span>
                      <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: `${statusColor[a.status] || '#6B7280'}22`, color: statusColor[a.status] || '#6B7280', border: `1px solid ${statusColor[a.status] || '#6B7280'}44`, fontFamily: 'sans-serif' }}>{a.status}</span>
                    </div>
                    <div style={{ fontSize: 11, color: '#4B5563', fontFamily: 'sans-serif' }}>{a.agent_type} · {a.purpose?.substring(0, 80)}</div>
                    {testData && (
                      <div style={{ fontSize: 10, color: testData.passed ? '#6EE7B7' : '#FCA5A5', fontFamily: 'sans-serif', marginTop: 4 }}>
                        Tests: {testData.passed ? '✓ PASSED' : '✗ FAILED'} · Score: {testData.average_score}/100 · Critical: {testData.critical_failures}
                      </div>
                    )}
                    {!a.system_prompt && <div style={{ fontSize: 10, color: '#F59E0B', fontFamily: 'sans-serif', marginTop: 4 }}>⚠ No system prompt</div>}
                    {!a.test_results && <div style={{ fontSize: 10, color: '#F59E0B', fontFamily: 'sans-serif', marginTop: 4 }}>⚠ Not tested</div>}
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', flexShrink: 0 }}>
                    <ForgeButton variant="blue" size="sm" icon={Play} onClick={() => runTests(a.id)} loading={testing}>Test</ForgeButton>
                    <ForgeButton variant="ghost" size="sm" icon={Bug} onClick={() => debugAgent(a.id)} loading={debugging}>Debug</ForgeButton>
                    <ForgeButton variant="ghost" size="sm" icon={CheckCircle} onClick={() => markReady(a.id)}>Mark Ready</ForgeButton>
                    {a.embed_code && <ForgeButton variant="ghost" size="sm" icon={Copy} onClick={() => copyEmbed(a.embed_code)}>Embed</ForgeButton>}
                  </div>
                </div>
                {a.status === 'test_failed' && testData && (
                  <div style={{ marginTop: 12, background: '#1A0A0A', border: '1px solid #7F1D1D', borderRadius: 8, padding: 10 }}>
                    <div style={{ fontSize: 10, color: '#EF4444', fontFamily: 'sans-serif', fontWeight: 600, marginBottom: 6 }}>TEST FAILURES — Debug required before marking ready</div>
                    <input style={{ ...({ width: '100%', background: '#080812', border: '1px solid #2A2A4A', borderRadius: 6, padding: '6px 10px', color: '#E2E8F0', fontSize: 11, fontFamily: 'sans-serif', boxSizing: 'border-box' }) }}
                      value={specificIssue} onChange={e => setSpecificIssue(e.target.value)} placeholder="Describe specific issue to fix (optional)..." />
                    <div style={{ marginTop: 8 }}>
                      <ForgeButton variant="red" size="sm" icon={Bug} onClick={() => debugAgent(a.id)} loading={debugging}>Run Debug & Fix</ForgeButton>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </ForgeLayout>
  );
}