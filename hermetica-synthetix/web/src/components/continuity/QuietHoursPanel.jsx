import React from 'react';

function isInQuietHours(config) {
  if (!config || !config.active) return false;
  const now = new Date();
  const aestStr = now.toLocaleString('en-AU', { timeZone: 'Australia/Sydney', hour: '2-digit', minute: '2-digit', hour12: false });
  const [h, m] = aestStr.split(':').map(Number);
  const cur = h * 60 + m;
  const [sh, sm] = config.start_time_aest.split(':').map(Number);
  const [eh, em] = config.end_time_aest.split(':').map(Number);
  const start = sh * 60 + sm;
  const end = eh * 60 + em;
  return start > end ? (cur >= start || cur < end) : (cur >= start && cur < end);
}

export default function QuietHoursPanel({ config, gold, parchment, surface }) {
  const inQuietHours = isInQuietHours(config);

  return (
    <div style={{ background: surface, border: '1px solid rgba(212,175,55,0.15)', borderRadius: 12, padding: 20 }}>
      <div style={{ color: gold, fontWeight: 700, fontSize: '0.9rem', marginBottom: 14, letterSpacing: '0.05em' }}>
        🌙 Quiet Hours
      </div>

      {config ? (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{
              width: 10, height: 10, borderRadius: '50%',
              background: inQuietHours ? '#f87171' : '#86efac',
              boxShadow: `0 0 8px ${inQuietHours ? '#f87171' : '#86efac'}`
            }} />
            <span style={{ color: parchment, fontSize: '0.85rem', fontWeight: 600 }}>
              {inQuietHours ? 'Currently in quiet hours' : 'Agents can speak'}
            </span>
          </div>

          <div style={{ color: parchment, opacity: 0.6, fontSize: '0.78rem', marginBottom: 12 }}>
            {config.start_time_aest} – {config.end_time_aest} AEST
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {[
              { label: 'Override: urgent', val: config.overridable_for_urgent },
              { label: 'Override: emergencies', val: config.overridable_for_emergencies },
              { label: 'Override: big opportunities', val: config.overridable_for_big_opportunities },
              { label: "Bypass if James online", val: config.respect_if_james_online },
            ].map(({ label, val }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                <span style={{ color: parchment, opacity: 0.5 }}>{label}</span>
                <span style={{ color: val ? '#86efac' : '#f87171' }}>{val ? '✓' : '✗'}</span>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 10, color: parchment, opacity: 0.35, fontSize: '0.7rem', fontStyle: 'italic' }}>
            Quiet hours = soft gate. Messages queue and dispatch when James is back.
          </div>
        </>
      ) : (
        <div style={{ color: parchment, opacity: 0.3, fontSize: '0.82rem', fontStyle: 'italic' }}>
          Loading config...
        </div>
      )}
    </div>
  );
}