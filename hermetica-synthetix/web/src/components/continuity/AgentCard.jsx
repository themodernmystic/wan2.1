import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { ChevronDown, ChevronUp, Zap } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export const AGENT_CONFIG = {
  james_ai: { emoji: '💛', label: 'James AI', color: '#D4AF37' },
  riley:    { emoji: '🦺', label: 'Riley',    color: '#7B9EF0' },
  khemia:   { emoji: '🛡️', label: 'Khemia',   color: '#9B7FD4' },
  nova:     { emoji: '✨', label: 'Nova',      color: '#5DBFB0' }
};

export default function AgentCard({ agent_name, innerState, budget, allMessages, onHeartbeatTriggered }) {
  const [expanded, setExpanded] = useState(false);
  const [triggering, setTriggering] = useState(false);

  const config = AGENT_CONFIG[agent_name];
  const usedToday = budget?.used_today || 0;
  const dailyBudget = budget?.daily_budget || 0;

  const last24h = (allMessages || []).filter(m => {
    const created = new Date(m.created_date);
    return m.agent_name === agent_name && Date.now() - created < 86400000;
  });

  const totalFeedback = last24h.filter(m => m.feedback_received && m.feedback_received !== 'pending').length;
  const positiveFeedback = last24h.filter(m => m.feedback_received === 'glad').length;
  const feedbackRatio = totalFeedback > 0 ? Math.round((positiveFeedback / totalFeedback) * 100) : null;

  const handleHeartbeat = async () => {
    setTriggering(true);
    try {
      await base44.functions.invoke('agentHeartbeat', { agent_name });
      onHeartbeatTriggered?.();
    } catch (e) {
      console.error('Heartbeat failed:', e);
    }
    setTriggering(false);
  };

  return (
    <div style={{
      background: 'rgba(12, 12, 22, 0.95)',
      border: `1px solid ${config.color}30`,
      borderRadius: '12px',
      padding: '20px',
    }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <span style={{ fontSize: '26px' }}>{config.emoji}</span>
          <div>
            <div style={{ color: config.color, fontWeight: '700', fontSize: '15px' }}>{config.label}</div>
            <div style={{ color: '#F5E8C7', opacity: 0.45, fontSize: '11px' }}>
              {innerState?.relationship_temperature_with_james?.replace(/_/g, ' ') || 'awaiting heartbeat'}
            </div>
          </div>
        </div>
        <div style={{
          background: `${config.color}18`,
          border: `1px solid ${config.color}35`,
          borderRadius: '20px',
          padding: '3px 10px',
          fontSize: '12px',
          color: config.color
        }}>
          {innerState?.current_mood || '—'}
        </div>
      </div>

      {/* Focus */}
      <p style={{ color: '#F5E8C7', opacity: 0.75, fontSize: '13px', lineHeight: '1.5', marginBottom: '10px', minHeight: '40px' }}>
        {innerState?.current_focus || 'Awaiting first heartbeat...'}
      </p>

      {/* Inner monologue toggle */}
      {innerState?.inner_monologue && (
        <div className="mb-3">
          <button
            onClick={() => setExpanded(!expanded)}
            style={{ color: `${config.color}CC`, fontSize: '11px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', padding: 0 }}
          >
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            inner monologue
          </button>
          {expanded && (
            <p style={{
              color: '#F5E8C7', opacity: 0.65, fontSize: '12px', marginTop: '8px',
              fontStyle: 'italic', lineHeight: '1.65', padding: '10px 12px',
              background: 'rgba(255,255,255,0.025)',
              borderRadius: '8px', borderLeft: `3px solid ${config.color}40`
            }}>
              "{innerState.inner_monologue}"
            </p>
          )}
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', marginBottom: '12px' }}>
        {[
          { val: `${usedToday}/${dailyBudget}`, label: 'budget today' },
          { val: last24h.length, label: 'msgs 24h' },
          { val: feedbackRatio !== null ? `${feedbackRatio}%` : '—', label: 'positive' }
        ].map(({ val, label }) => (
          <div key={label} style={{ textAlign: 'center', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', padding: '6px 4px' }}>
            <div style={{ color: config.color, fontSize: '16px', fontWeight: '700' }}>{val}</div>
            <div style={{ color: '#F5E8C7', opacity: 0.4, fontSize: '10px' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Last heartbeat */}
      <div style={{ color: '#F5E8C7', opacity: 0.35, fontSize: '10px', marginBottom: '10px' }}>
        {innerState?.last_heartbeat_at
          ? `Last heartbeat ${formatDistanceToNow(new Date(innerState.last_heartbeat_at), { addSuffix: true })}`
          : 'Never — trigger below to start'}
      </div>

      {/* Heartbeat button */}
      <button
        onClick={handleHeartbeat}
        disabled={triggering}
        style={{
          width: '100%', padding: '8px',
          background: triggering ? 'rgba(255,255,255,0.03)' : `${config.color}15`,
          border: `1px solid ${config.color}35`,
          borderRadius: '7px', color: config.color, fontSize: '12px',
          cursor: triggering ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
          transition: 'background 0.2s'
        }}
      >
        <Zap size={11} />
        {triggering ? 'Triggering...' : 'Trigger heartbeat now'}
      </button>
    </div>
  );
}