import React from 'react';

const GOLD = '#C9A84C';

export default function ForgeLayout({ title, subtitle, children, actions }) {
  return (
    <div style={{ minHeight: '100vh', background: '#0E0E22', color: '#E2E8F0', padding: '28px 32px', fontFamily: 'sans-serif' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        {/* Page Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: GOLD, margin: 0, letterSpacing: 0.5 }}>{title}</h1>
            {subtitle && <p style={{ fontSize: 12, color: '#4B5563', margin: '4px 0 0', letterSpacing: 1 }} className="text-xl font-bold capitalize bg-[#c4dcfd] text-[#4985fd]">{subtitle}</p>}
          </div>
          {actions && <div style={{ display: 'flex', gap: 10 }}>{actions}</div>}
        </div>
        {children}
      </div>
    </div>);

}