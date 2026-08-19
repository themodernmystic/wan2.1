import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Brain, AlertTriangle, CheckCircle2 } from 'lucide-react';

const GOLD = '#C9A84C';

const riskColor = { Low: '#4ade80', Medium: '#facc15', High: '#fb923c', Critical: '#ef4444' };
const modeColor = { 'Fast Patch': '#60a5fa', 'Strategic Upgrade': GOLD, 'Breakthrough Architecture': '#c084fc' };

export default function FounderIntentCard({ data, onApprove }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={{
      background: 'linear-gradient(135deg, #0D0D1A, #12102A)',
      border: `1px solid ${GOLD}33`,
      borderLeft: `3px solid ${GOLD}`,
      borderRadius: 10,
      overflow: 'hidden',
      margin: '8px 0',
    }}>
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        style={{ width: '100%', background: 'transparent', border: 'none', cursor: 'pointer', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left' }}
      >
        <Brain size={14} style={{ color: GOLD, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 9, color: GOLD, letterSpacing: 3, textTransform: 'uppercase', fontFamily: 'sans-serif' }}>Founder Intent Analysis</div>
          <div style={{ fontSize: 12, color: '#E8E0D0', marginTop: 2, lineHeight: 1.4 }}>{data.interpreted_request}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 20, background: riskColor[data.risk_level] + '22', color: riskColor[data.risk_level], border: `1px solid ${riskColor[data.risk_level]}44`, fontFamily: 'sans-serif' }}>
            {data.risk_level} Risk
          </span>
          {expanded ? <ChevronDown size={12} style={{ color: '#555' }} /> : <ChevronRight size={12} style={{ color: '#555' }} />}
        </div>
      </button>

      {/* Expanded body */}
      {expanded && (
        <div style={{ padding: '0 14px 14px', borderTop: '1px solid #1a1a2e' }}>
          <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <IntentRow label="What you said" value={data.raw_request} />
            <IntentRow label="What Riley thinks you want" value={data.real_want} accent={GOLD} />
            <IntentRow label="Business goal" value={data.business_goal} />
            <IntentRow label="UX goal" value={data.ux_goal} />
            <IntentRow label="Technical goal" value={data.technical_goal} />
            <div style={{ padding: '8px 10px', background: '#0a0a15', borderRadius: 6, border: '1px solid #1a1a2e' }}>
              <div style={{ fontSize: 9, color: '#555', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4, fontFamily: 'sans-serif' }}>Recommended Mode</div>
              <div style={{ fontSize: 12, color: modeColor[data.recommended_build_mode] || '#E8E0D0', fontWeight: 600, fontFamily: 'sans-serif' }}>
                {data.recommended_build_mode}
              </div>
            </div>
          </div>

          {onApprove && (
            <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
              <button
                onClick={() => onApprove('approve')}
                style={{ flex: 1, background: `${GOLD}22`, border: `1px solid ${GOLD}66`, color: GOLD, borderRadius: 6, padding: '7px 12px', cursor: 'pointer', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', fontFamily: 'sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              >
                <CheckCircle2 size={11} /> Approve Intent
              </button>
              <button
                onClick={() => onApprove('revise')}
                style={{ flex: 1, background: 'transparent', border: '1px solid #333', color: '#666', borderRadius: 6, padding: '7px 12px', cursor: 'pointer', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', fontFamily: 'sans-serif' }}
              >
                Revise
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function IntentRow({ label, value, accent }) {
  return (
    <div style={{ padding: '8px 10px', background: '#0a0a15', borderRadius: 6, border: '1px solid #1a1a2e' }}>
      <div style={{ fontSize: 9, color: '#555', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 3, fontFamily: 'sans-serif' }}>{label}</div>
      <div style={{ fontSize: 11, color: accent || '#aaa', lineHeight: 1.5 }}>{value || '—'}</div>
    </div>
  );
}