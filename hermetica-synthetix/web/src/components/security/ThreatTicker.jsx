import { useEffect, useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';

export default function ThreatTicker() {
  const [iocs, setIocs] = useState([]);
  const tickerRef = useRef(null);

  useEffect(() => {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    base44.entities.ThreatIntelFeed.list('-created_date', 30)
      .then(data => setIocs(data))
      .catch(() => {});
  }, []);

  if (!iocs.length) return (
    <div style={{ fontSize: '11px', color: '#6b7280', padding: '8px 0' }}>
      No threat intel received in last 24h. Run sync to pull feeds.
    </div>
  );

  const items = [...iocs, ...iocs]; // duplicate for seamless loop

  return (
    <div style={{ overflow: 'hidden', position: 'relative', height: '28px' }}>
      <div
        ref={tickerRef}
        style={{
          display: 'flex', gap: '40px', alignItems: 'center',
          animation: 'ticker-scroll 30s linear infinite',
          whiteSpace: 'nowrap'
        }}
      >
        {items.map((ioc, i) => (
          <span key={i} style={{ fontSize: '11px', color: '#D4AF37', opacity: 0.7, fontFamily: 'monospace' }}>
            <span style={{ color: '#6b7280', marginRight: '6px' }}>[{ioc.ioc_type?.toUpperCase()}]</span>
            {ioc.ioc_value}
            <span style={{ color: '#9ca3af', marginLeft: '8px', fontSize: '10px' }}>
              {ioc.confidence}% · {ioc.feed_source}
            </span>
          </span>
        ))}
      </div>
      <style>{`
        @keyframes ticker-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}