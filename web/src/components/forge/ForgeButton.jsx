import React from 'react';
import { Loader2 } from 'lucide-react';

const VARIANTS = {
  gold: { bg: 'linear-gradient(135deg, #C9A84C, #8B6914)', color: '#080812', border: 'none' },
  blue: { bg: 'linear-gradient(135deg, #2563EB, #1D4ED8)', color: '#fff', border: 'none' },
  green: { bg: 'linear-gradient(135deg, #059669, #047857)', color: '#fff', border: 'none' },
  red: { bg: 'linear-gradient(135deg, #DC2626, #B91C1C)', color: '#fff', border: 'none' },
  ghost: { bg: 'transparent', color: '#9CA3AF', border: '1px solid #1E293B' },
  danger: { bg: 'transparent', color: '#EF4444', border: '1px solid #7F1D1D' },
};

export default function ForgeButton({ children, onClick, variant = 'gold', loading, disabled, icon: IconComponent, size = 'md' }) {
  const Icon = IconComponent;
  const v = VARIANTS[variant] || VARIANTS.ghost;
  const pad = size === 'sm' ? '6px 14px' : '9px 20px';
  const fs = size === 'sm' ? 11 : 13;

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        background: v.bg, color: v.color, border: v.border,
        padding: pad, borderRadius: 8, fontSize: fs, fontWeight: 600,
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        opacity: disabled || loading ? 0.5 : 1,
        display: 'inline-flex', alignItems: 'center', gap: 7,
        fontFamily: 'sans-serif', transition: 'opacity 0.15s',
      }}
    >
      {loading ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : Icon && <Icon size={13} />}
      {children}
    </button>
  );
}