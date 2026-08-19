import React from 'react';

const GOLD = '#C9A84C';

export default function ForgeCard({ title, accent, children, actions, className }) {
  return (
    <div style={{ background: '#14142A', border: '1px solid #2A2A4A', borderRadius: 12, padding: 20 }} className={className}>
      {(title || actions) && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          {title && (
            <span style={{ fontSize: 11, color: accent || GOLD, letterSpacing: 3, textTransform: 'uppercase', fontFamily: 'sans-serif', fontWeight: 600 }}>
              {title}
            </span>
          )}
          {actions && <div style={{ display: 'flex', gap: 8 }}>{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
}