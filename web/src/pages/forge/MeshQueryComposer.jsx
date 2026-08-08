import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, Zap, ChevronDown, ChevronUp, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';

const GOLD = '#C9A84C';
const BG = '#0E0E22';
const CARD = '#14142A';
const BORDER = '#2A2A4A';

const DEPTHS = [
  { id: 'focused', label: 'Focused', desc: 'Riley only — 16-model brain', available: true, models: 16, color: '#4ade80' },
  { id: 'council', label: 'Council', desc: 'Riley + 3 specialist agents', available: true, models: 64, color: GOLD },
  { id: 'full_mesh', label: 'Full Mesh', desc: 'All active agents', available: false, models: '∞', color: '#6B7280' },
  { id: 'maximum', label: 'Maximum', desc: 'All agents × all models', available: false, models: '∞', color: '#6B7280' },
];

function ConfidenceMeter({ value }) {
  const color = value >= 80 ? '#4ade80' : value >= 60 ? '#fbbf24' : '#f87171';
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#9CA3AF', marginBottom: 4 }}>
        <span>CONFIDENCE</span><span style={{ color, fontWeight: 700 }}>{value}%</span>
      </div>
      <div style={{ height: 6, background: '#1E293B', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${value}%`, height: '100%', background: color, borderRadius: 3, transition: 'width 0.5s ease' }} />
      </div>
    </div>
  );
}

export default function MeshQueryComposer() {
  const [question, setQuestion] = useState('');
  const [depth, setDepth] = useState('focused');
  const [selectedAgents, setSelectedAgents] = useState([]);
  const [maxCost, setMaxCost] = useState(1);
  const [projectId, setProjectId] = useState('');
  const [nodes, setNodes] = useState([]);
  const [projects, setProjects] = useState([]);
  const [firing, setFiring] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [pollingQueryId, setPollingQueryId] = useState(null);
  const [expandedAgent, setExpandedAgent] = useState(null);
  const pollRef = useRef(null);

  useEffect(() => {
    Promise.all([
      base44.entities.MeshNode.filter({ status: 'active' }, '-priority_weight', 20),
      base44.entities.RileyProject?.list('-created_date', 20).catch(() => []),
    ]).then(([n, p]) => { setNodes(n || []); setProjects(p || []); });
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  // Poll MeshQuery record while in-flight
  useEffect(() => {
    if (!pollingQueryId) return;
    pollRef.current = setInterval(async () => {
      try {
        const records = await base44.entities.MeshQuery.filter({ id: pollingQueryId });
        const q = records?.[0];
        if (q && (q.status === 'complete' || q.status === 'failed')) {
          clearInterval(pollRef.current);
          setPollingQueryId(null);
          setFiring(false);
          if (q.status === 'complete') {
            const agentResponses = JSON.parse(q.agent_responses || '{}');
            const contradictions = JSON.parse(q.contradictions_detected || '[]');
            setResult({ ...q, agentResponses, contradictions });
          } else {
            setError(q.error_message || 'Query failed');
          }
        }
      } catch (_) {}
    }, 1500);
    return () => clearInterval(pollRef.current);
  }, [pollingQueryId]);

  async function handleFire() {
    if (!question.trim()) return;
    setFiring(true);
    setError(null);
    setResult(null);
    try {
      const res = await base44.functions.invoke('rileyMeshQuery', {
        question,
        depth,
        specific_agents: selectedAgents.length > 0 ? selectedAgents : undefined,
        project_id: projectId || undefined,
        max_cost_usd: maxCost,
      });
      const data = res.data || res;
      if (data.error) { setError(data.error); setFiring(false); return; }
      if (data.query_id) {
        setPollingQueryId(data.query_id);
        // If already complete (focused is fast)
        if (data.synthesis) {
          clearInterval(pollRef.current);
          setPollingQueryId(null);
          setFiring(false);
          const agentResponses = typeof data.agent_responses === 'string' ? JSON.parse(data.agent_responses || '{}') : (data.agent_responses || {});
          setResult({ ...data, agentResponses, contradictions: data.contradictions || [] });
        }
      }
    } catch (e) {
      setError(e.message);
      setFiring(false);
    }
  }

  function toggleAgent(name) {
    setSelectedAgents(prev => prev.includes(name) ? prev.filter(a => a !== name) : [...prev, name]);
  }

  return (
    <div style={{ minHeight: '100vh', background: BG, color: '#E2E8F0', padding: '28px 32px', fontFamily: 'sans-serif' }}>
      <div style={{ maxWidth: 860, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
          <Link to="/forge/mesh" style={{ color: '#4B5563', display: 'flex', alignItems: 'center' }}>
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: GOLD, margin: 0 }}>Query Composer</h1>
            <p style={{ fontSize: 11, color: '#4B5563', margin: '2px 0 0' }}>Ask the mesh anything</p>
          </div>
        </div>

        {/* Composer */}
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 24, marginBottom: 20 }}>
          <textarea
            value={question}
            onChange={e => setQuestion(e.target.value)}
            placeholder="What should I do about [situation]? What's the best approach to [problem]? Should I [decision]?"
            rows={5}
            style={{ width: '100%', background: '#0E0E22', border: `1px solid ${BORDER}`, borderRadius: 8, color: '#E2E8F0', padding: '12px 14px', fontSize: 14, fontFamily: 'sans-serif', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
          />

          {/* Depth selector */}
          <div style={{ marginTop: 20, marginBottom: 16 }}>
            <div style={{ fontSize: 10, color: '#4B5563', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10 }}>Depth</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              {DEPTHS.map(d => (
                <button key={d.id} onClick={() => d.available && setDepth(d.id)} disabled={!d.available}
                  style={{
                    padding: '10px 8px', borderRadius: 8, border: `1px solid ${depth === d.id ? d.color : BORDER}`,
                    background: depth === d.id ? `${d.color}18` : 'transparent',
                    color: d.available ? (depth === d.id ? d.color : '#9CA3AF') : '#374151',
                    cursor: d.available ? 'pointer' : 'not-allowed', textAlign: 'left',
                  }}>
                  <div style={{ fontSize: 12, fontWeight: 700 }}>{d.label}</div>
                  <div style={{ fontSize: 9, opacity: 0.7, marginTop: 2 }}>{d.desc}</div>
                  <div style={{ fontSize: 9, marginTop: 4, color: d.available ? d.color : '#374151' }}>
                    {d.available ? `~${d.models} models` : '🔒 Coming soon'}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Agent selector (council only) */}
          {depth === 'council' && nodes.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 10, color: '#4B5563', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>Agent Filter (optional — leave empty for auto-select)</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {nodes.filter(n => n.agent_name !== 'Riley').map(n => (
                  <button key={n.id} onClick={() => toggleAgent(n.agent_name)}
                    style={{
                      padding: '5px 12px', borderRadius: 20, fontSize: 11, cursor: 'pointer',
                      border: `1px solid ${selectedAgents.includes(n.agent_name) ? GOLD : BORDER}`,
                      background: selectedAgents.includes(n.agent_name) ? `${GOLD}22` : 'transparent',
                      color: selectedAgents.includes(n.agent_name) ? GOLD : '#9CA3AF',
                    }}>{n.agent_name}</button>
                ))}
              </div>
            </div>
          )}

          {/* Cost + Project */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 10, color: '#4B5563', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>Max Cost: ${maxCost.toFixed(2)}</div>
              <input type="range" min={0.1} max={10} step={0.1} value={maxCost} onChange={e => setMaxCost(parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: GOLD }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#4B5563', marginTop: 2 }}>
                <span>$0.10</span><span>$10.00</span>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: '#4B5563', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>Project (optional)</div>
              <select value={projectId} onChange={e => setProjectId(e.target.value)}
                style={{ width: '100%', background: '#0E0E22', border: `1px solid ${BORDER}`, borderRadius: 8, color: '#E2E8F0', padding: '8px 10px', fontSize: 12 }}>
                <option value="">None</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name || p.title || p.id}</option>)}
              </select>
            </div>
          </div>

          <button onClick={handleFire} disabled={firing || !question.trim()}
            style={{ width: '100%', padding: '12px', background: firing || !question.trim() ? '#1E293B' : `linear-gradient(135deg, ${GOLD}, #8B6914)`, border: 'none', borderRadius: 8, color: firing || !question.trim() ? '#374151' : '#080812', cursor: firing || !question.trim() ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            {firing ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Consulting the mesh...</> : <><Zap size={16} /> Fire</>}
          </button>
        </div>

        {/* Loading state */}
        {firing && !result && (
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 24, marginBottom: 20 }}>
            <div style={{ fontSize: 10, color: GOLD, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 16, fontWeight: 600 }}>Consulting Agents</div>
            {(['Riley', ...nodes.slice(0, 3).map(n => n.agent_name)]).map(name => (
              <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <Loader2 size={12} color={GOLD} style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: '#9CA3AF' }}>{name} is thinking...</span>
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ background: '#450a0a', border: '1px solid #7f1d1d', borderRadius: 12, padding: 16, marginBottom: 20, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <AlertTriangle size={16} color="#fca5a5" style={{ flexShrink: 0, marginTop: 1 }} />
            <span style={{ fontSize: 13, color: '#fca5a5' }}>{error}</span>
          </div>
        )}

        {/* Result */}
        {result && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Synthesis */}
            <div style={{ background: CARD, border: `1px solid ${GOLD}44`, borderRadius: 12, padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <CheckCircle2 size={16} color="#4ade80" />
                <span style={{ fontSize: 10, color: GOLD, letterSpacing: 3, textTransform: 'uppercase', fontWeight: 600 }}>Synthesis</span>
                {result.degraded && <span style={{ fontSize: 9, background: '#1c1108', color: '#fbbf24', border: '1px solid #92400e', padding: '1px 8px', borderRadius: 20 }}>DEGRADED TO FOCUSED</span>}
              </div>
              <div style={{ fontSize: 14, color: '#E2E8F0', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{result.synthesis}</div>
              <ConfidenceMeter value={result.confidence || 70} />
              <div style={{ display: 'flex', gap: 16, marginTop: 12, fontSize: 10, color: '#4B5563' }}>
                <span>Agents: {(result.agents_consulted || []).join(', ')}</span>
                <span>Models: ~{result.total_models_fired || 0}</span>
                <span>Cost: ~${(result.estimated_cost_usd || 0).toFixed(4)}</span>
                <span>Time: {((result.duration_ms || 0) / 1000).toFixed(1)}s</span>
              </div>
            </div>

            {/* Per-agent responses */}
            {result.agentResponses && Object.keys(result.agentResponses).length > 1 && (
              <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div style={{ fontSize: 10, color: GOLD, letterSpacing: 3, textTransform: 'uppercase', fontWeight: 600 }}>Agent Responses</div>
                  {result.memory_count > 0 && (
                    <span style={{ fontSize: 10, color: '#c084fc', background: '#3b0764', border: '1px solid #7c3aed', padding: '2px 10px', borderRadius: 20 }}>
                      🧠 Memory context: {result.memory_count} relevant records loaded
                    </span>
                  )}
                </div>
                {Object.entries(result.agentResponses).map(([agent, text]) => {
                  const dispatchMode = result.dispatch_modes?.[agent];
                  const DISPATCH_LABELS = { persona: '🎭 persona', bridge: '🌉 bridge', function: '⚡ function', manual: '🔌 manual', cognitive_pipeline: '🧠 cognitive pipeline' };
                  return (
                    <div key={agent} style={{ marginBottom: 10, border: `1px solid ${BORDER}`, borderRadius: 8, overflow: 'hidden' }}>
                      <button onClick={() => setExpandedAgent(expandedAgent === agent ? null : agent)}
                        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#0E0E22', border: 'none', color: '#E2E8F0', cursor: 'pointer' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
                          <span style={{ fontSize: 12, fontWeight: 600 }}>{agent}</span>
                          {dispatchMode && <span style={{ fontSize: 9, color: '#4B5563' }}>Responding via {DISPATCH_LABELS[dispatchMode] || dispatchMode}</span>}
                        </div>
                        {expandedAgent === agent ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                      </button>
                      {expandedAgent === agent && (
                        <div style={{ padding: '12px 14px', fontSize: 12, color: '#9CA3AF', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                          {(text || 'No response').substring(0, 1500)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Contradictions */}
            {result.contradictions?.length > 0 && (
              <div style={{ background: '#1c110822', border: '1px solid #92400e', borderRadius: 12, padding: 20 }}>
                <div style={{ fontSize: 10, color: '#fbbf24', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 12, fontWeight: 600 }}>Contradictions Detected</div>
                {result.contradictions.map((c, i) => (
                  <div key={i} style={{ marginBottom: 8, fontSize: 12, color: '#fbbf24' }}>
                    <strong>{(c.agents || []).join(' vs ')}</strong>: {c.conflict}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}