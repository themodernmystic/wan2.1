import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';

const SEV_COLOR = { info: '#6b7280', low: '#60a5fa', medium: '#facc15', high: '#f97316', critical: '#ef4444' };

function timeAgo(ts) {
  if (!ts) return '—';
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function IncidentFeed({ appId }) {
  const [incidents, setIncidents] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await base44.entities.IncidentLog.filter({ app_id: appId }, '-created_date', 20);
        setIncidents(data);
      } catch (_) {}
    };
    load();
    const unsub = base44.entities.IncidentLog.subscribe(evt => {
      if (evt.data?.app_id === appId) {
        setIncidents(prev => {
          if (evt.type === 'create') return [evt.data, ...prev].slice(0, 20);
          if (evt.type === 'update') return prev.map(i => i.id === evt.id ? evt.data : i);
          if (evt.type === 'delete') return prev.filter(i => i.id !== evt.id);
          return prev;
        });
      }
    });
    return unsub;
  }, [appId]);

  if (!incidents.length) return (
    <div style={{ color: '#6b7280', textAlign: 'center', padding: '24px', fontSize: '13px' }}>
      No incidents recorded. Fortress is quiet.
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '320px', overflowY: 'auto' }}>
      {incidents.map(inc => (
        <div key={inc.id} style={{
          display: 'flex', alignItems: 'flex-start', gap: '12px',
          padding: '10px 12px', background: '#0a0a14',
          border: `1px solid ${SEV_COLOR[inc.severity] || '#333'}33`,
          borderLeft: `3px solid ${SEV_COLOR[inc.severity] || '#333'}`,
          borderRadius: '6px'
        }}>
          <div style={{ minWidth: '60px' }}>
            <span style={{
              fontSize: '9px', fontWeight: '700', letterSpacing: '0.06em', textTransform: 'uppercase',
              color: SEV_COLOR[inc.severity] || '#6b7280'
            }}>{inc.severity}</span>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '12px', color: '#F5E8C7', fontWeight: '500' }}>
              {(inc.incident_type || '').replace(/_/g, ' ')}
              {inc.source_ip && <span style={{ color: '#9ca3af', marginLeft: '8px', fontSize: '11px' }}>{inc.source_ip}</span>}
            </div>
            {inc.target_resource && (
              <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>{inc.target_resource}</div>
            )}
          </div>
          <div style={{ fontSize: '10px', color: '#6b7280', whiteSpace: 'nowrap' }}>
            {timeAgo(inc.timestamp || inc.created_date)}
          </div>
          {inc.auto_blocked && (
            <span style={{ fontSize: '9px', color: '#4ade80', background: '#0a1a0a', padding: '2px 5px', borderRadius: '4px', border: '1px solid #4ade8033' }}>BLOCKED</span>
          )}
        </div>
      ))}
    </div>
  );
}