// Concentric rings SVG hero
export default function FortressRings({ layers }) {
  const RINGS = ['outer', 'middle', 'inner', 'foundation', 'command'];
  const RADII = [160, 120, 85, 55, 28];
  const RING_LABELS = { outer: 'OUTER', middle: 'MIDDLE', inner: 'INNER', foundation: 'FOUNDATION', command: 'COMMAND' };

  function ringColor(ring) {
    const ringLayers = layers.filter(l => l.ring === ring);
    if (!ringLayers.length) return '#333';
    const live = ringLayers.filter(l => l.status === 'live').length;
    const total = ringLayers.length;
    const ratio = live / total;
    if (ratio >= 0.8) return '#4ade80'; // green
    if (ratio >= 0.5) return '#facc15'; // amber
    if (ratio > 0) return '#f97316'; // orange
    return '#374151'; // dark gray — all planned
  }

  function ringGlow(ring) {
    const color = ringColor(ring);
    if (color === '#374151') return 'none';
    return `drop-shadow(0 0 8px ${color}88)`;
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '8px 0 16px' }}>
      <svg width="340" height="340" viewBox="0 0 340 340" style={{ overflow: 'visible' }}>
        {RINGS.map((ring, i) => {
          const r = RADII[i];
          const color = ringColor(ring);
          return (
            <g key={ring} style={{ filter: ringGlow(ring) }}>
              <circle
                cx="170" cy="170" r={r}
                fill="none"
                stroke={color}
                strokeWidth={i === 4 ? 14 : 10}
                opacity={0.85}
              />
              <text
                x={170 + r + 8}
                y={i % 2 === 0 ? 168 : 174}
                fill={color}
                fontSize="9"
                fontFamily="monospace"
                letterSpacing="0.08em"
                opacity={0.7}
              >
                {RING_LABELS[ring]}
              </text>
            </g>
          );
        })}
        {/* Centre dot */}
        <circle cx="170" cy="170" r="6" fill="#D4AF37" opacity="0.9" />
        <text x="170" y="174" textAnchor="middle" fill="#D4AF37" fontSize="7" fontFamily="monospace" opacity="0.6">HQ</text>
      </svg>
    </div>
  );
}