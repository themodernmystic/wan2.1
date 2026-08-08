import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Network, Plus, Zap, Activity, AlertTriangle, WifiOff, RefreshCw, ChevronRight, Sparkles } from 'lucide-react';

const GOLD = '#C9A84C';
const BG = '#0E0E22';
const CARD = '#14142A';
const BORDER = '#2A2A4A';

const STATUS_COLORS = {
  active: { bg: '#052e16', text: '#4ade80', border: '#166534' },
  degraded: { bg: '#1c1108', text: '#fbbf24', border: '#92400e' },
  offline: { bg: '#450a0a', text: '#fca5a5', border: '#7f1d1d' },
  pending_setup: { bg: '#172554', text: '#93c5fd', border: '#1d4ed8' },
};

function StatusBadge({ status }) {
  const c = STATUS_COLORS[status] || STATUS_COLORS.pending_setup;
  return (
    <span style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}`, padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700 }}>
      {status?.replace('_', ' ').toUpperCase()}
    </span>
  );
}

function StatCard({ label, value, icon: IconComp, color }) {
  const Icon = IconComp;
  return (
    <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{ width: 40, height: 40, borderRadius: 10, background: `${color}18`, border: `1px solid ${color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={18} color={color} />
      </div>
      <div>
        <div style={{ fontSize: 22, fontWeight: 700, color: '#E2E8F0', lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 10, color: '#4B5563', letterSpacing: 1, marginTop: 3, textTransform: 'uppercase' }}>{label}</div>
      </div>
    </div>
  );
}

function NodeDiagram({ nodes }) {
  const active = nodes.filter(n => n.status === 'active');
  const center = { x: 220, y: 220 };
  const radius = 160;

  return (
    <svg width="100%" viewBox="0 0 440 440" style={{ maxHeight: 380 }}>
      {/* Center — Riley */}
      <circle cx={center.x} cy={center.y} r={36} fill="#C9A84C22" stroke={GOLD} strokeWidth={2} />
      <text x={center.x} y={center.y - 4} textAnchor="middle" fill={GOLD} fontSize={11} fontWeight="700">✦</text>
      <text x={center.x} y={center.y + 12} textAnchor="middle" fill={GOLD} fontSize={9} fontWeight="600">RILEY</text>

      {nodes.map((node, i) => {
        const angle = (i / nodes.length) * 2 * Math.PI - Math.PI / 2;
        const x = center.x + radius * Math.cos(angle);
        const y = center.y + radius * Math.sin(angle);
        const c = STATUS_COLORS[node.status] || STATUS_COLORS.pending_setup;

        return (
          <g key={node.id || i}>
            <line x1={center.x} y1={center.y} x2={x} y2={y}
              stroke={node.status === 'active' ? '#C9A84C44' : '#2A2A4A'}
              strokeWidth={node.status === 'active' ? 1.5 : 1}
              strokeDasharray={node.status === 'active' ? 'none' : '4 4'}
            />
            <circle cx={x} cy={y} r={24} fill={c.bg} stroke={c.border} strokeWidth={1.5} />
            <text x={x} y={y + 4} textAnchor="middle" fill={c.text} fontSize={8} fontWeight="600">
              {(node.agent_name || '?').substring(0, 6)}
            </text>
            <text x={x} y={y + 38} textAnchor="middle" fill="#4B5563" fontSize={7}>
              {node.status === 'active' ? '●' : node.status === 'degraded' ? '◐' : '○'}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export default function MeshCommandCenter() {
  const [nodes, setNodes] = useState([]);
  const [queries, setQueries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [heartbeating, setHeartbeating] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [n, q] = await Promise.all([
        base44.entities.MeshNode.list('-priority_weight', 20),
        base44.entities.MeshQuery.list('-created_date', 10),
      ]);
      setNodes(n || []);
      setQueries(q || []);
    } finally {
      setLoading(false);
    }
  }

  async function runHeartbeat() {
    setHeartbeating(true);
    try {
      await base44.functions.invoke('rileyMeshHeartbeat', { force_test: true });
      await loadData();
    } finally {
      setHeartbeating(false);
    }
  }

  const soulSeeded = nodes.filter(n => n.personality_prompt && n.personality_prompt.length > 200).length;
  const stats = {
    active: nodes.filter(n => n.status === 'active').length,
    degraded: nodes.filter(n => n.status === 'degraded').length,
    offline: nodes.filter(n => n.status === 'offline').length,
    queries_week: queries.length,
    souls_seeded: soulSeeded,
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, border: `3px solid ${GOLD}33`, borderTopColor: GOLD, borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
          <div style={{ color: '#4B5563', fontSize: 12 }}>Initialising mesh...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: BG, color: '#E2E8F0', padding: '28px 32px', fontFamily: 'sans-serif' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: GOLD, margin: 0 }}>🌌 The Hermetic Mesh</h1>
            <p style={{ fontSize: 12, color: '#4B5563', margin: '4px 0 0', letterSpacing: 1 }}>
              {nodes.filter(n => n.status === 'active').length} AGENTS · ONE MIND
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={runHeartbeat} disabled={heartbeating}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: 'transparent', border: `1px solid ${BORDER}`, borderRadius: 8, color: '#9CA3AF', cursor: 'pointer', fontSize: 12 }}>
              <RefreshCw size={13} style={{ animation: heartbeating ? 'spin 1s linear infinite' : 'none' }} />
              Heartbeat
            </button>
            <Link to="/forge/mesh/nodes" style={{ textDecoration: 'none' }}>
              <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: 'transparent', border: `1px solid ${BORDER}`, borderRadius: 8, color: '#9CA3AF', cursor: 'pointer', fontSize: 12 }}>
                <Plus size={13} /> Register Agent
              </button>
            </Link>
            <Link to="/forge/mesh/query" style={{ textDecoration: 'none' }}>
              <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 20px', background: `linear-gradient(135deg, ${GOLD}, #8B6914)`, border: 'none', borderRadius: 8, color: '#080812', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
                <Zap size={13} /> New Query
              </button>
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16, marginBottom: 28 }}>
          <StatCard label="Active Nodes" value={stats.active} icon={Activity} color="#4ade80" />
          <StatCard label="Degraded" value={stats.degraded} icon={AlertTriangle} color="#fbbf24" />
          <StatCard label="Offline" value={stats.offline} icon={WifiOff} color="#f87171" />
          <StatCard label="Queries (total)" value={stats.queries_week} icon={Network} color={GOLD} />
          <StatCard label={`Souls Seeded / 29`} value={stats.souls_seeded} icon={Sparkles} color="#c084fc" />
        </div>

        {/* Network + Recent queries */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {/* Network diagram */}
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 20 }}>
            <div style={{ fontSize: 10, color: GOLD, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 16, fontWeight: 600 }}>Network Topology</div>
            {nodes.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: '#4B5563' }}>
                <Network size={32} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                <div style={{ fontSize: 12 }}>No nodes registered yet</div>
                <Link to="/forge/mesh/nodes" style={{ color: GOLD, fontSize: 11, marginTop: 8, display: 'block' }}>Register your first agent →</Link>
              </div>
            ) : (
              <NodeDiagram nodes={nodes} />
            )}
          </div>

          {/* Recent queries */}
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ fontSize: 10, color: GOLD, letterSpacing: 3, textTransform: 'uppercase', fontWeight: 600 }}>Recent Queries</div>
              <Link to="/forge/mesh/query" style={{ fontSize: 10, color: GOLD, textDecoration: 'none' }}>+ New</Link>
            </div>
            {queries.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#4B5563', fontSize: 12 }}>
                No queries yet — <Link to="/forge/mesh/query" style={{ color: GOLD }}>fire your first one</Link>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {queries.map(q => (
                  <div key={q.id} style={{ padding: '10px 12px', background: '#0E0E22', borderRadius: 8, border: `1px solid ${BORDER}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 11, color: '#E2E8F0', fontWeight: 500 }}>{q.query_name?.substring(0, 40) || 'Unnamed query'}</span>
                      <StatusBadge status={q.status} />
                    </div>
                    <div style={{ display: 'flex', gap: 12, fontSize: 10, color: '#4B5563' }}>
                      <span>depth: {q.depth}</span>
                      {q.confidence && <span>confidence: {q.confidence}%</span>}
                      {q.total_agents_consulted && <span>{q.total_agents_consulted} agents</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}