import React from 'react';

export default function SystemHealth({ messages, gold, parchment, surface }) {
  const total = messages.length;
  const drafted = messages.filter(m => m.status === 'drafted').length;
  const sentDryRun = messages.filter(m => m.status === 'sent_dry_run').length;
  const qualityFailed = messages.filter(m => m.status === 'quality_failed').length;
  const held = messages.filter(m => m.status === 'quiet_hours_held').length;
  const sentReal = messages.filter(m => m.status === 'sent_real').length;

  const last24h = messages.filter(m => {
    const created = new Date(m.created_date || 0);
    return Date.now() - created.getTime() < 24 * 60 * 60 * 1000;
  });
  const drafted24h = last24h.filter(m => m.status !== 'drafted').length;

  const stats = [
    { label: 'Total drafted', value: total, color: gold },
    { label: 'Sent (dry run)', value: sentDryRun, color: '#86efac' },
    { label: 'Sent (live)', value: sentReal, color: sentReal > 0 ? '#f87171' : parchment },
    { label: 'Quality failed', value: qualityFailed, color: '#f87171' },
    { label: 'Quiet hours held', value: held, color: '#c084fc' },
    { label: 'Active (24h)', value: drafted24h, color: '#67e8f9' },
  ];

  return (
    <div style={{ background: surface, border: '1px solid rgba(212,175,55,0.15)', borderRadius: 12, padding: 20 }}>
      <div style={{ color: gold, fontWeight: 700, fontSize: '0.9rem', marginBottom: 14, letterSpacing: '0.05em' }}>
        ⚡ System Health
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {stats.map(({ label, value, color }) => (
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: parchment, opacity: 0.55, fontSize: '0.77rem' }}>{label}</span>
            <span style={{ color, fontWeight: 700, fontSize: '0.9rem' }}>{value}</span>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ color: gold, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>
          Phase
        </div>
        <div style={{ color: parchment, opacity: 0.5, fontSize: '0.75rem' }}>
          1A — Conscience stub active
        </div>
        <div style={{ color: parchment, opacity: 0.3, fontSize: '0.7rem', marginTop: 2 }}>
          Flip ContinuityConfig.conscience_dry_run for 1B
        </div>
      </div>
    </div>
  );
}