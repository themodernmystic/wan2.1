import { AGENT_CONFIG } from './AgentCard';

export default function SystemHealthPanel({ allMessages, innerStates, budgets }) {
  const last24h = (allMessages || []).filter(m => {
    const created = new Date(m.created_date);
    return !isNaN(created) && Date.now() - created < 86400000;
  });

  const counts = {
    drafted: last24h.filter(m => m.status === 'drafted').length,
    sent: last24h.filter(m => ['sent_dry_run', 'sent_real'].includes(m.status)).length,
    failed: last24h.filter(m => m.status === 'quality_failed').length,
    held: last24h.filter(m => m.status === 'quiet_hours_held').length,
  };

  const hearbeat24h = (innerStates || []).filter(s => {
    if (!s.last_heartbeat_at) return false;
    return Date.now() - new Date(s.last_heartbeat_at) < 86400000;
  }).length;

  const budgetRows = Object.entries(AGENT_CONFIG).map(([name, cfg]) => {
    const b = (budgets || []).find(bgt => bgt.agent_name === name);
    return { name, cfg, b };
  });

  return (
    <div>
      <h3 style={{ color: '#D4AF37', fontSize: '13px', fontWeight: '600', marginBottom: '12px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
        System Health — 24h
      </h3>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '12px' }}>
        {[
          { label: 'Sent', value: counts.sent, color: '#70C080' },
          { label: 'Drafted', value: counts.drafted, color: '#7B9EF0' },
          { label: 'QA failed', value: counts.failed, color: '#E07070' },
          { label: 'QH held', value: counts.held, color: '#D4AF37' },
        ].map(s => (
          <div key={s.label} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '6px', padding: '8px', textAlign: 'center' }}>
            <div style={{ color: s.color, fontSize: '20px', fontWeight: '700' }}>{s.value}</div>
            <div style={{ color: '#F5E8C7', opacity: 0.4, fontSize: '10px' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Per-agent budget row */}
      <div className="flex flex-col gap-1.5">
        {budgetRows.map(({ name, cfg, b }) => (
          <div key={name} className="flex items-center justify-between">
            <span style={{ fontSize: '13px' }}>{cfg.emoji} <span style={{ color: cfg.color, fontSize: '11px' }}>{cfg.label}</span></span>
            <span style={{ color: '#F5E8C7', opacity: 0.5, fontSize: '11px' }}>
              {b ? `${b.used_today}/${b.daily_budget} used` : 'no budget'}
              {b?.dry_run_mode ? <span style={{ color: '#D4AF37', marginLeft: '4px', opacity: 0.7 }}>dry</span> : <span style={{ color: '#E07070', marginLeft: '4px' }}>LIVE</span>}
            </span>
          </div>
        ))}
      </div>

      <div style={{ marginTop: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', padding: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: '#F5E8C7', opacity: 0.5, fontSize: '11px' }}>Heartbeats today</span>
        <span style={{ color: '#D4AF37', fontWeight: '600', fontSize: '12px' }}>{hearbeat24h} / 4</span>
      </div>
    </div>
  );
}