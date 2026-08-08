import React, { useState } from 'react';
import { ChevronDown, ChevronRight, BookOpen, CheckCircle2, XCircle, Lightbulb, RefreshCw, ArrowRight } from 'lucide-react';

const GOLD = '#C9A84C';

export default function EmergenceLedgerCard({ data }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={{
      background: 'linear-gradient(135deg, #0D1218, #0a1020)',
      border: '1px solid #C9A84C22',
      borderLeft: `3px solid ${GOLD}`,
      borderRadius: 10,
      overflow: 'hidden',
      margin: '8px 0',
    }}>
      <button
        onClick={() => setExpanded(!expanded)}
        style={{ width: '100%', background: 'transparent', border: 'none', cursor: 'pointer', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left' }}
      >
        <BookOpen size={14} style={{ color: GOLD, flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 9, color: GOLD, letterSpacing: 3, textTransform: 'uppercase', fontFamily: 'sans-serif' }}>Emergence Ledger</div>
          <div style={{ fontSize: 11, color: '#888', marginTop: 2, fontStyle: 'italic' }}>Session debrief — what Riley learned</div>
        </div>
        {expanded ? <ChevronDown size={12} style={{ color: '#555' }} /> : <ChevronRight size={12} style={{ color: '#555' }} />}
      </button>

      {expanded && (
        <div style={{ padding: '0 14px 14px', borderTop: `1px solid ${GOLD}11` }}>
          <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr', gap: 8 }}>
            {data.what_worked && (
              <LedgerRow icon={<CheckCircle2 size={11} style={{ color: '#4ade80' }} />} label="What Worked" value={data.what_worked} accent="#4ade80" />
            )}
            {data.what_failed && (
              <LedgerRow icon={<XCircle size={11} style={{ color: '#f87171' }} />} label="What Failed" value={data.what_failed} accent="#f87171" />
            )}
            {data.riley_learned && (
              <LedgerRow icon={<Lightbulb size={11} style={{ color: GOLD }} />} label="Riley Learned" value={data.riley_learned} accent={GOLD} />
            )}
            {data.reusable_pattern && (
              <LedgerRow icon={<RefreshCw size={11} style={{ color: '#a78bfa' }} />} label="Reusable Pattern" value={data.reusable_pattern} accent="#a78bfa" />
            )}
            {data.future_recommendation && (
              <LedgerRow icon={<ArrowRight size={11} style={{ color: '#60a5fa' }} />} label="Future Recommendation" value={data.future_recommendation} accent="#60a5fa" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function LedgerRow({ icon, label, value, accent }) {
  return (
    <div style={{ padding: '9px 12px', background: '#080812', borderRadius: 7, border: '1px solid #1a1a2a', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
      <div style={{ marginTop: 2, flexShrink: 0 }}>{icon}</div>
      <div>
        <div style={{ fontSize: 9, color: accent + '99' || '#555', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 3, fontFamily: 'sans-serif' }}>{label}</div>
        <div style={{ fontSize: 11, color: '#bbb', lineHeight: 1.6 }}>{value}</div>
      </div>
    </div>
  );
}