import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, Plus, RefreshCw, X, Save, ChevronRight } from 'lucide-react';

const GOLD = '#C9A84C';
const BG = '#0E0E22';
const CARD = '#14142A';
const BORDER = '#2A2A4A';

const STATUS_COLORS = {
  active:        { bg: '#052e16', text: '#4ade80', border: '#166534' },
  degraded:      { bg: '#1c1108', text: '#fbbf24', border: '#92400e' },
  offline:       { bg: '#450a0a', text: '#fca5a5', border: '#7f1d1d' },
  pending_setup: { bg: '#172554', text: '#93c5fd', border: '#1d4ed8' },
};

const STATUS_TABS = ['all', 'active', 'degraded', 'offline', 'pending_setup'];

const EMPTY_FORM = {
  agent_name: '', agent_role: '', app_id: '', app_url: '',
  endpoint_type: 'workspace_bridge', dispatch_mode: 'persona', model_count: 16,
  specialties: '', personality_prompt: '', system_context: '',
  priority_weight: 50, notes: '',
};

const DISPATCH_MODE_BADGES = {
  persona:  { icon: '🎭', label: 'Persona', color: '#c084fc', border: '#7c3aed' },
  bridge:   { icon: '🌉', label: 'Bridge',  color: '#60a5fa', border: '#1d4ed8' },
  function: { icon: '⚡', label: 'Function', color: '#fbbf24', border: '#92400e' },
  manual:   { icon: '🔌', label: 'Manual',  color: '#6b7280', border: '#374151' },
};

function StatusBadge({ status }) {
  const c = STATUS_COLORS[status] || STATUS_COLORS.pending_setup;
  return (
    <span style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}`, padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700 }}>
      {status?.replace('_', ' ').toUpperCase()}
    </span>
  );
}

function NodeDrawer({ node, onClose, onSave }) {
  const [form, setForm] = useState({
    ...EMPTY_FORM,
    ...node,
    dispatch_mode: node?.dispatch_mode || 'persona',
    specialties: Array.isArray(node?.specialties) ? node.specialties.join(', ') : (node?.specialties || ''),
  });
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const payload = {
        ...form,
        specialties: form.specialties.split(',').map(s => s.trim()).filter(Boolean),
        model_count: parseInt(form.model_count) || 16,
        priority_weight: parseInt(form.priority_weight) || 50,
      };
      const res = await base44.functions.invoke('rileyMeshRegister', payload);
      onSave(res?.data || res);
    } finally {
      setSaving(false);
    }
  }

  const field = (label, key, type = 'text', rows) => (
    <div style={{ marginBottom: 14 }}>
      <label style={{ fontSize: 10, color: '#4B5563', letterSpacing: 1.5, textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>{label}</label>
      {rows ? (
        <textarea rows={rows} value={form[key] || ''} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
          style={{ width: '100%', background: '#0E0E22', border: `1px solid ${BORDER}`, borderRadius: 6, color: '#E2E8F0', padding: '8px 10px', fontSize: 12, resize: 'vertical', outline: 'none', boxSizing: 'border-box' }} />
      ) : (
        <input type={type} value={form[key] || ''} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
          style={{ width: '100%', background: '#0E0E22', border: `1px solid ${BORDER}`, borderRadius: 6, color: '#E2E8F0', padding: '8px 10px', fontSize: 12, outline: 'none', boxSizing: 'border-box' }} />
      )}
    </div>
  );

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex' }}>
      <div style={{ flex: 1, background: 'rgba(0,0,0,0.7)' }} onClick={onClose} />
      <div style={{ width: 480, background: '#0E0E22', borderLeft: `1px solid ${BORDER}`, overflowY: 'auto', padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: GOLD }}>{node?.id ? 'Edit Node' : 'Register Agent'}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer' }}><X size={16} /></button>
        </div>

        {field('Agent Name *', 'agent_name')}
        {field('Agent Role', 'agent_role')}
        {field('App ID *', 'app_id')}
        {field('App URL', 'app_url')}
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 10, color: '#4B5563', letterSpacing: 1.5, textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Endpoint Type</label>
          <select value={form.endpoint_type} onChange={e => setForm(f => ({ ...f, endpoint_type: e.target.value }))}
            style={{ width: '100%', background: '#0E0E22', border: `1px solid ${BORDER}`, borderRadius: 6, color: '#E2E8F0', padding: '8px 10px', fontSize: 12 }}>
            <option value="workspace_bridge">workspace_bridge</option>
            <option value="direct_function">direct_function</option>
            <option value="manual">manual</option>
          </select>
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 10, color: '#4B5563', letterSpacing: 1.5, textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Dispatch Mode</label>
          <select value={form.dispatch_mode || 'persona'} onChange={e => setForm(f => ({ ...f, dispatch_mode: e.target.value }))}
            style={{ width: '100%', background: '#0E0E22', border: `1px solid ${BORDER}`, borderRadius: 6, color: '#E2E8F0', padding: '8px 10px', fontSize: 12 }}>
            <option value="persona">🎭 persona — Riley's substrate, shaped by personality_prompt</option>
            <option value="bridge">🌉 bridge — workspaceBridge to remote app</option>
            <option value="function">⚡ function — direct backend function call</option>
            <option value="manual">🔌 manual — offline, skip dispatch</option>
          </select>
        </div>
        {field('Model Count', 'model_count', 'number')}
        {field('Specialties (comma-separated)', 'specialties')}
        {field('Priority Weight (0-100)', 'priority_weight', 'number')}
        {field('Personality Prompt', 'personality_prompt', 'text', 4)}
        {field('System Context', 'system_context', 'text', 3)}
        {field('Notes', 'notes', 'text', 2)}

        <button onClick={handleSave} disabled={saving || !form.agent_name || !form.app_id}
          style={{ width: '100%', padding: '11px', background: saving ? '#1E293B' : `linear-gradient(135deg, ${GOLD}, #8B6914)`, border: 'none', borderRadius: 8, color: '#080812', cursor: 'pointer', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 8 }}>
          <Save size={13} /> {saving ? 'Saving...' : 'Save Node'}
        </button>
      </div>
    </div>
  );
}

export default function MeshNodeRegistry() {
  const [nodes, setNodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [drawerNode, setDrawerNode] = useState(null);
  const [showDrawer, setShowDrawer] = useState(false);
  const [heartbeating, setHeartbeating] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => { loadNodes(); }, []);

  async function loadNodes() {
    setLoading(true);
    try {
      const n = await base44.entities.MeshNode.list('-priority_weight', 50);
      setNodes(n || []);
    } finally {
      setLoading(false);
    }
  }

  async function runHeartbeat() {
    setHeartbeating(true);
    try {
      const res = await base44.functions.invoke('rileyMeshHeartbeat', { force_test: true });
      const d = res?.data || res;
      showToast(`Heartbeat: ${d.active || 0} active, ${d.degraded || 0} degraded, ${d.offline || 0} offline`);
      await loadNodes();
    } finally {
      setHeartbeating(false);
    }
  }

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  function handleSave() {
    setShowDrawer(false);
    setDrawerNode(null);
    loadNodes();
    showToast('Node saved successfully');
  }

  const filtered = activeTab === 'all' ? nodes : nodes.filter(n => n.status === activeTab);

  return (
    <div style={{ minHeight: '100vh', background: BG, color: '#E2E8F0', padding: '28px 32px', fontFamily: 'sans-serif' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Link to="/forge/mesh" style={{ color: '#4B5563', display: 'flex', alignItems: 'center' }}><ArrowLeft size={16} /></Link>
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 700, color: GOLD, margin: 0 }}>Node Registry</h1>
              <p style={{ fontSize: 11, color: '#4B5563', margin: '2px 0 0' }}>{nodes.length} registered agents</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={runHeartbeat} disabled={heartbeating}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: 'transparent', border: `1px solid ${BORDER}`, borderRadius: 8, color: '#9CA3AF', cursor: 'pointer', fontSize: 12 }}>
              <RefreshCw size={13} style={{ animation: heartbeating ? 'spin 1s linear infinite' : 'none' }} />
              Run Heartbeat
            </button>
            <button onClick={() => { setDrawerNode({}); setShowDrawer(true); }}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', background: `linear-gradient(135deg, ${GOLD}, #8B6914)`, border: 'none', borderRadius: 8, color: '#080812', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
              <Plus size={13} /> Add Node
            </button>
          </div>
        </div>

        {/* Status tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
          {STATUS_TABS.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              style={{ padding: '6px 14px', borderRadius: 8, border: `1px solid ${activeTab === tab ? GOLD : BORDER}`, background: activeTab === tab ? `${GOLD}18` : 'transparent', color: activeTab === tab ? GOLD : '#4B5563', cursor: 'pointer', fontSize: 11, fontWeight: 600, textTransform: 'capitalize' }}>
              {tab.replace('_', ' ')} {tab === 'all' ? `(${nodes.length})` : `(${nodes.filter(n => n.status === tab).length})`}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[1, 2, 3].map(i => <div key={i} style={{ height: 64, background: CARD, borderRadius: 10, opacity: 0.5 }} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#4B5563' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🌌</div>
            <div style={{ fontSize: 14, marginBottom: 8 }}>No nodes {activeTab !== 'all' ? `with status: ${activeTab}` : 'registered yet'}</div>
            {activeTab === 'all' && (
              <button onClick={() => { setDrawerNode({}); setShowDrawer(true); }}
                style={{ marginTop: 12, padding: '8px 20px', background: `${GOLD}22`, border: `1px solid ${GOLD}55`, borderRadius: 8, color: GOLD, cursor: 'pointer', fontSize: 12 }}>
                Register your first agent
              </button>
            )}
          </div>
        ) : (
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  {['Agent', 'Role', 'Dispatch', 'Status', 'Last Heartbeat', 'Queries', 'Avg Quality', ''].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 9, color: '#4B5563', letterSpacing: 2, textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((node, i) => (
                  <tr key={node.id} style={{ borderBottom: i < filtered.length - 1 ? `1px solid ${BORDER}` : 'none', cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#0E0E22'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    onClick={() => { setDrawerNode(node); setShowDrawer(true); }}>
                    <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 600, color: GOLD }}>{node.agent_name}</td>
                    <td style={{ padding: '12px 14px', fontSize: 11, color: '#9CA3AF' }}>{node.agent_role?.substring(0, 30) || '—'}</td>
                    <td style={{ padding: '12px 14px' }}>
                      {(() => {
                        const dm = DISPATCH_MODE_BADGES[node.dispatch_mode || 'persona'];
                        return (
                          <span style={{ fontSize: 10, color: dm.color, border: `1px solid ${dm.border}`, background: `${dm.border}22`, padding: '2px 7px', borderRadius: 20, fontWeight: 600 }}>
                            {dm.icon} {dm.label}
                          </span>
                        );
                      })()}
                    </td>
                    <td style={{ padding: '12px 14px' }}><StatusBadge status={node.status} /></td>
                    <td style={{ padding: '12px 14px', fontSize: 10, color: '#4B5563' }}>
                      {node.last_heartbeat ? new Date(node.last_heartbeat).toLocaleString() : '—'}
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 12, color: '#E2E8F0' }}>{node.total_mesh_queries || 0}</td>
                    <td style={{ padding: '12px 14px', fontSize: 12, color: '#9CA3AF' }}>{node.average_quality_score ? `${node.average_quality_score}%` : '—'}</td>
                    <td style={{ padding: '12px 14px' }}><ChevronRight size={14} color="#4B5563" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showDrawer && (
        <NodeDrawer node={drawerNode} onClose={() => { setShowDrawer(false); setDrawerNode(null); }} onSave={handleSave} />
      )}

      {toast && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, background: '#052e16', border: '1px solid #166534', borderRadius: 10, padding: '12px 20px', color: '#4ade80', fontSize: 13, zIndex: 200 }}>
          ✓ {toast}
        </div>
      )}
    </div>
  );
}