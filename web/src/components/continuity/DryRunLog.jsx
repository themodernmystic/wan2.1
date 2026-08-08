import React, { useState } from 'react';

const AGENT_EMOJIS = { james_ai: '💛', riley: '🦺', khemia: '🛡️', nova: '✨' };

function timeStr(isoStr) {
  if (!isoStr) return '';
  return new Date(isoStr).toLocaleString('en-AU', { timeZone: 'Australia/Sydney', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function DryRunLog({ messages, gold, parchment, surface }) {
  const [expandedId, setExpandedId] = useState(null);

  return (
    <div style={{ background: surface, border: '1px solid rgba(212,175,55,0.15)', borderRadius: 12, padding: 20 }}>
      <div style={{ color: gold, fontWeight: 700, fontSize: '0.9rem', marginBottom: 16, letterSpacing: '0.05em' }}>
        🔒 Dry-Run Log
        <span style={{ color: parchment, opacity: 0.4, fontWeight: 400, fontSize: '0.75rem', marginLeft: 8 }}>
          ({messages.length} messages — not sent)
        </span>
      </div>

      {messages.length === 0 ? (
        <div style={{ color: parchment, opacity: 0.3, fontSize: '0.82rem', fontStyle: 'italic', textAlign: 'center', padding: '20px 0' }}>
          No dry-run messages yet. Trigger a heartbeat to see what the minds would say.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 460, overflowY: 'auto' }}>
          {messages.map(msg => (
            <div
              key={msg.id}
              style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(212,175,55,0.1)',
                borderRadius: 8,
                padding: '10px 14px',
                cursor: 'pointer',
              }}
              onClick={() => setExpandedId(expandedId === msg.id ? null : msg.id)}
            >
              <div className="flex items-center justify-between gap-3" style={{ flexWrap: 'wrap' }}>
                <div className="flex items-center gap-2">
                  <span style={{ fontSize: '1rem' }}>{AGENT_EMOJIS[msg.agent_name] || '🤖'}</span>
                  <span style={{ color: gold, fontSize: '0.8rem', fontWeight: 600 }}>
                    {msg.agent_name?.replace('_', ' ')}
                  </span>
                  <span style={{ color: parchment, opacity: 0.4, fontSize: '0.7rem' }}>
                    {msg.message_type}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  {msg.quality_score && (
                    <span style={{
                      background: 'rgba(212,175,55,0.1)',
                      color: gold, fontSize: '0.7rem', borderRadius: 4, padding: '2px 6px'
                    }}>
                      Q: {msg.quality_score}
                    </span>
                  )}
                  <span style={{ color: parchment, opacity: 0.35, fontSize: '0.7rem' }}>
                    {timeStr(msg.sent_at || msg.created_date)}
                  </span>
                  <span style={{ color: parchment, opacity: 0.3, fontSize: '0.65rem' }}>
                    via {msg.proposed_delivery_channel?.replace('_', ' ')}
                  </span>
                  <span style={{ color: parchment, opacity: 0.3 }}>{expandedId === msg.id ? '▾' : '▸'}</span>
                </div>
              </div>

              {msg.subject_line && (
                <div style={{ color: parchment, opacity: 0.7, fontSize: '0.8rem', marginTop: 6, fontWeight: 600 }}>
                  {msg.subject_line}
                </div>
              )}

              <div style={{ color: parchment, opacity: 0.5, fontSize: '0.78rem', marginTop: 4, lineHeight: 1.5 }}>
                {expandedId === msg.id
                  ? msg.message_body
                  : (msg.message_body || '').slice(0, 200) + (msg.message_body?.length > 200 ? '…' : '')}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}