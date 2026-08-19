import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Megaphone } from 'lucide-react';

const GOLD = '#C9A84C';

export default function PitchPlanCard({ data }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={{
      background: 'linear-gradient(135deg, #1A0D1A, #150a20)',
      border: '1px solid #c084fc33',
      borderLeft: '3px solid #c084fc',
      borderRadius: 10,
      overflow: 'hidden',
      margin: '8px 0',
    }}>
      <button
        onClick={() => setExpanded(!expanded)}
        style={{ width: '100%', background: 'transparent', border: 'none', cursor: 'pointer', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left' }}
      >
        <Megaphone size={14} style={{ color: '#c084fc', flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 9, color: '#c084fc', letterSpacing: 3, textTransform: 'uppercase', fontFamily: 'sans-serif' }}>Pitch Plan</div>
          <div style={{ fontSize: 13, color: '#E8E0D0', marginTop: 2, fontStyle: 'italic', lineHeight: 1.4 }}>"{data.one_liner}"</div>
        </div>
        {expanded ? <ChevronDown size={12} style={{ color: '#555' }} /> : <ChevronRight size={12} style={{ color: '#555' }} />}
      </button>

      {expanded && (
        <div style={{ padding: '0 14px 14px', borderTop: '1px solid #1a0f2a' }}>
          <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <PitchRow label="User Benefit" value={data.user_benefit} />
            <PitchRow label="Founder Benefit" value={data.founder_benefit} accent={GOLD} />
            <PitchRow label="Market Relevance" value={data.market_relevance} />
            <PitchRow label="Why This Matters" value={data.why_this_matters} accent="#c084fc" />
          </div>
          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 9, color: '#555', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8, fontFamily: 'sans-serif' }}>Pitch by Audience</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 6 }}>
              {data.customer_pitch && <AudiencePitch label="To Customers" value={data.customer_pitch} color="#60a5fa" />}
              {data.partner_pitch && <AudiencePitch label="To Partners" value={data.partner_pitch} color={GOLD} />}
              {data.investor_pitch && <AudiencePitch label="To Investors" value={data.investor_pitch} color="#4ade80" />}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PitchRow({ label, value, accent }) {
  return (
    <div style={{ padding: '8px 10px', background: '#0a0815', borderRadius: 6, border: '1px solid #1a0f2a' }}>
      <div style={{ fontSize: 9, color: '#c084fc44', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 3, fontFamily: 'sans-serif' }}>{label}</div>
      <div style={{ fontSize: 11, color: accent || '#aaa', lineHeight: 1.5 }}>{value || '—'}</div>
    </div>
  );
}

function AudiencePitch({ label, value, color }) {
  return (
    <div style={{ padding: '10px 12px', background: '#0a0815', borderRadius: 8, border: `1px solid ${color}22`, borderLeft: `2px solid ${color}66` }}>
      <div style={{ fontSize: 9, color: color, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4, fontFamily: 'sans-serif' }}>{label}</div>
      <div style={{ fontSize: 12, color: '#ccc', lineHeight: 1.6, fontStyle: 'italic' }}>"{value}"</div>
    </div>
  );
}