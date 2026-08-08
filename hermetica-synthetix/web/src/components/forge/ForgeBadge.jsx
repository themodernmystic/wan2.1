import React from 'react';

const COLORS = {
  // Conflict levels
  None: { bg: '#052e16', text: '#4ade80', border: '#166534' },
  Low: { bg: '#172554', text: '#93c5fd', border: '#1d4ed8' },
  Medium: { bg: '#1c1917', text: '#fbbf24', border: '#92400e' },
  High: { bg: '#450a0a', text: '#fca5a5', border: '#7f1d1d' },
  Critical: { bg: '#450a0a', text: '#ef4444', border: '#dc2626' },
  // Statuses
  Active: { bg: '#052e16', text: '#4ade80', border: '#166534' },
  Live: { bg: '#052e16', text: '#4ade80', border: '#166534' },
  Pass: { bg: '#052e16', text: '#4ade80', border: '#166534' },
  Fixed: { bg: '#052e16', text: '#4ade80', border: '#166534' },
  Planning: { bg: '#172554', text: '#93c5fd', border: '#1d4ed8' },
  Building: { bg: '#1c1108', text: '#fbbf24', border: '#92400e' },
  Ready: { bg: '#172554', text: '#93c5fd', border: '#1d4ed8' },
  Blocked: { bg: '#450a0a', text: '#fca5a5', border: '#7f1d1d' },
  QA: { bg: '#2e1065', text: '#c4b5fd', border: '#6d28d9' },
  Draft: { bg: '#111827', text: '#6b7280', border: '#374151' },
  New: { bg: '#450a0a', text: '#fca5a5', border: '#7f1d1d' },
  Fail: { bg: '#450a0a', text: '#ef4444', border: '#dc2626' },
  Partial: { bg: '#1c1108', text: '#fbbf24', border: '#92400e' },
  'Not Tested': { bg: '#111827', text: '#6b7280', border: '#374151' },
  Paused: { bg: '#1c1917', text: '#fbbf24', border: '#92400e' },
  Archived: { bg: '#111827', text: '#4b5563', border: '#1f2937' },
  default: { bg: '#111827', text: '#9ca3af', border: '#374151' },
};

export default function ForgeBadge({ label, size = 'sm' }) {
  const c = COLORS[label] || COLORS.default;
  return (
    <span style={{
      background: c.bg,
      color: c.text,
      border: `1px solid ${c.border}`,
      padding: size === 'sm' ? '2px 8px' : '4px 12px',
      borderRadius: 20,
      fontSize: size === 'sm' ? 10 : 12,
      fontWeight: 600,
      letterSpacing: 0.5,
      fontFamily: 'sans-serif',
      display: 'inline-flex',
      alignItems: 'center',
    }}>
      {label}
    </span>
  );
}