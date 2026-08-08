import React, { useState } from 'react';
import { Zap, TrendingUp, Sparkles, ChevronDown, ChevronRight, Star } from 'lucide-react';

const GOLD = '#C9A84C';

const MODES = {
  'Fast Patch': { icon: Zap, color: '#60a5fa', bg: '#60a5fa' },
  'Strategic Upgrade': { icon: TrendingUp, color: GOLD, bg: GOLD },
  'Breakthrough Architecture': { icon: Sparkles, color: '#c084fc', bg: '#c084fc' },
};

function ScoreBar({ label, score, color }) {
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
        <span style={{ fontSize: 9, color: '#555', fontFamily: 'sans-serif', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</span>
        <span style={{ fontSize: 9, color: color || '#888', fontFamily: 'sans-serif' }}>{score}/10</span>
      </div>
      <div style={{ height: 3, background: '#1a1a2e', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${(score / 10) * 100}%`, background: color || '#444', borderRadius: 2, transition: 'width 0.6s ease' }} />
      </div>
    </div>
  );
}

function SimCard({ sim, onApprove }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = MODES[sim.mode] || MODES['Fast Patch'];
  const Icon = cfg.icon;

  return (
    <div style={{
      background: '#0D0D1A',
      border: `1px solid ${cfg.color}33`,
      borderLeft: `3px solid ${cfg.color}`,
      borderRadius: 10,
      overflow: 'hidden',
      flex: 1,
    }}>
      <button
        onClick={() => setExpanded(!expanded)}
        style={{ width: '100%', background: 'transparent', border: 'none', cursor: 'pointer', padding: '12px', textAlign: 'left', display: 'flex', alignItems: 'flex-start', gap: 8 }}
      >
        <Icon size={13} style={{ color: cfg.color, flexShrink: 0, marginTop: 1 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            <span style={{ fontSize: 9, color: cfg.color, letterSpacing: 2, textTransform: 'uppercase', fontFamily: 'sans-serif', fontWeight: 700 }}>{sim.mode}</span>
            {sim.riley_pick && <Star size={9} style={{ color: GOLD, fill: GOLD }} />}
          </div>
          <div style={{ fontSize: 11, color: '#ccc', lineHeight: 1.5 }}>{sim.summary}</div>
        </div>
        {expanded ? <ChevronDown size={11} style={{ color: '#555', flexShrink: 0 }} /> : <ChevronRight size={11} style={{ color: '#555', flexShrink: 0 }} />}
      </button>

      {expanded && (
        <div style={{ padding: '0 12px 12px', borderTop: `1px solid ${cfg.color}22` }}>
          <div style={{ marginTop: 10 }}>
            <ScoreBar label="Speed" score={sim.speed_score} color="#60a5fa" />
            <ScoreBar label="Risk" score={sim.risk_score} color="#ef4444" />
            <ScoreBar label="Commercial Value" score={sim.commercial_value_score} color="#4ade80" />
            <ScoreBar label="User Value" score={sim.user_value_score} color={GOLD} />
            <ScoreBar label="Tech Debt Added" score={sim.technical_debt_score} color="#fb923c" />
            <ScoreBar label="Base44 Compat" score={sim.base44_compatibility_score} color="#a78bfa" />
          </div>
          {sim.riley_recommendation && (
            <div style={{ marginTop: 8, padding: '8px 10px', background: `${cfg.color}10`, borderRadius: 6, border: `1px solid ${cfg.color}22` }}>
              <div style={{ fontSize: 9, color: cfg.color, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 3, fontFamily: 'sans-serif' }}>Riley's Take</div>
              <div style={{ fontSize: 11, color: '#aaa', lineHeight: 1.5, fontStyle: 'italic' }}>{sim.riley_recommendation}</div>
            </div>
          )}
          {onApprove && (
            <button
              onClick={() => onApprove(sim.mode)}
              style={{ marginTop: 10, width: '100%', background: `${cfg.color}22`, border: `1px solid ${cfg.color}66`, color: cfg.color, borderRadius: 6, padding: '7px', cursor: 'pointer', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', fontFamily: 'sans-serif' }}
            >
              Approve {sim.mode}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function BuildSimulationCards({ simulations, onApprove }) {
  return (
    <div style={{ margin: '8px 0' }}>
      <div style={{ fontSize: 9, color: '#555', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 8, fontFamily: 'sans-serif' }}>Multi-Future Simulation</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {simulations.map((sim, i) => (
          <SimCard key={i} sim={sim} onApprove={onApprove} />
        ))}
      </div>
    </div>
  );
}