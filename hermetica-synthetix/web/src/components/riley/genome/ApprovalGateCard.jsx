import React from 'react';
import { ShieldAlert, Zap, TrendingUp, Sparkles, RotateCcw, X } from 'lucide-react';

const GOLD = '#C9A84C';

const options = [
  { key: 'approve_fast', label: 'Approve Fast Patch', icon: Zap, color: '#60a5fa' },
  { key: 'approve_strategic', label: 'Approve Strategic Upgrade', icon: TrendingUp, color: GOLD },
  { key: 'approve_breakthrough', label: 'Approve Breakthrough Build', icon: Sparkles, color: '#c084fc' },
  { key: 'revise', label: 'Revise Plan', icon: RotateCcw, color: '#aaa' },
  { key: 'cancel', label: 'Cancel', icon: X, color: '#ef4444' },
];

export default function ApprovalGateCard({ context, onAction }) {
  return (
    <div style={{
      background: 'linear-gradient(135deg, #1A0D0D, #200a0a)',
      border: '1px solid #ef444433',
      borderLeft: '3px solid #ef4444',
      borderRadius: 10,
      overflow: 'hidden',
      margin: '8px 0',
      padding: '14px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <ShieldAlert size={14} style={{ color: '#ef4444', flexShrink: 0 }} />
        <div>
          <div style={{ fontSize: 9, color: '#ef4444', letterSpacing: 3, textTransform: 'uppercase', fontFamily: 'sans-serif' }}>Approval Required</div>
          {context && <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>{context}</div>}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        {options.map(opt => {
          const Icon = opt.icon;
          return (
            <button
              key={opt.key}
              onClick={() => onAction(opt.key)}
              style={{
                background: `${opt.color}12`,
                border: `1px solid ${opt.color}44`,
                borderRadius: 7,
                padding: '8px 10px',
                cursor: 'pointer',
                color: opt.color,
                fontSize: 10,
                letterSpacing: 0.5,
                fontFamily: 'sans-serif',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                transition: 'all 0.15s',
                textAlign: 'left',
              }}
              onMouseEnter={e => e.currentTarget.style.background = `${opt.color}22`}
              onMouseLeave={e => e.currentTarget.style.background = `${opt.color}12`}
            >
              <Icon size={11} style={{ flexShrink: 0 }} />
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}