const STATUS_COLOR = {
  live: '#4ade80',
  deploying: '#facc15',
  degraded: '#f97316',
  failed: '#ef4444',
  planned: '#6b7280',
  not_applicable: '#374151'
};

const RING_BADGE = {
  outer: { bg: '#1a2433', text: '#60a5fa' },
  middle: { bg: '#1a2233', text: '#a78bfa' },
  inner: { bg: '#1a1e2e', text: '#34d399' },
  foundation: { bg: '#1c1a1a', text: '#fbbf24' },
  command: { bg: '#1c1218', text: '#D4AF37' }
};

export default function LayerGrid({ layers }) {
  if (!layers.length) return (
    <div style={{ color: '#6b7280', textAlign: 'center', padding: '32px', fontSize: '13px' }}>
      No layer data. Run an audit to seed layers.
    </div>
  );

  const sorted = [...layers].sort((a, b) => a.layer_number - b.layer_number);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '10px' }}>
      {sorted.map(layer => {
        const statusColor = STATUS_COLOR[layer.status] || '#6b7280';
        const ringStyle = RING_BADGE[layer.ring] || { bg: '#1a1a2e', text: '#D4AF37' };
        return (
          <div key={layer.id || layer.layer_number} style={{
            background: '#0f0f1a',
            border: `1px solid ${statusColor}44`,
            borderRadius: '8px',
            padding: '12px',
            position: 'relative'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
              <span style={{ fontSize: '10px', color: '#6b7280', fontFamily: 'monospace' }}>#{layer.layer_number}</span>
              <span style={{ fontSize: '9px', background: ringStyle.bg, color: ringStyle.text, padding: '2px 6px', borderRadius: '4px', letterSpacing: '0.06em' }}>
                {(layer.ring || '').toUpperCase()}
              </span>
            </div>
            <div style={{ fontSize: '12px', fontWeight: '600', color: '#F5E8C7', marginBottom: '4px', lineHeight: '1.3' }}>
              {layer.layer_name}
            </div>
            <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '8px' }}>
              {layer.tool_deployed || '—'}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '10px', color: statusColor, fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {layer.status || 'planned'}
              </span>
              <span style={{ fontSize: '11px', color: '#D4AF37', fontWeight: '700' }}>
                {layer.coverage_percent ?? 0}%
              </span>
            </div>
            {/* Coverage bar */}
            <div style={{ marginTop: '6px', height: '3px', background: '#1f1f2e', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{ width: `${layer.coverage_percent ?? 0}%`, height: '100%', background: statusColor, transition: 'width 0.5s' }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}