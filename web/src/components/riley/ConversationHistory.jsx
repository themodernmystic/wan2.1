import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { X, MessageSquare, Plus, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const GOLD = '#C9A84C';

export default function ConversationHistory({ open, onClose, onSelect, currentConversationId }) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) loadConversations();
  }, [open]);

  const loadConversations = async () => {
    setLoading(true);
    try {
      const convs = await base44.agents.listConversations({ agent_name: 'riley' });
      // Sort newest first
      const sorted = (convs || []).sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
      setConversations(sorted);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(0,0,0,0.7)' }}
        onClick={onClose}
      />

      {/* Drawer */}
      <aside
        className="relative flex flex-col h-full"
        style={{
          width: '17rem',
          background: '#0a0a15',
          borderRight: '1px solid #C9A84C22',
          zIndex: 1,
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: '1px solid #1a1a2e', flexShrink: 0 }}
        >
          <div>
            <div style={{ fontSize: 11, color: GOLD, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 600 }}>
              Conversations
            </div>
            <div style={{ fontSize: 9, color: '#444', letterSpacing: 1, marginTop: 1 }}>
              {conversations.length} session{conversations.length !== 1 ? 's' : ''}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: '1px solid #1a1a2e', color: '#666', borderRadius: 6, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            <X size={12} />
          </button>
        </div>

        {/* New Chat button */}
        <div className="px-3 py-2" style={{ borderBottom: '1px solid #1a1a2e', flexShrink: 0 }}>
          <button
            onClick={() => { onSelect(null); onClose(); }}
            className="w-full flex items-center gap-2"
            style={{
              background: `${GOLD}12`,
              border: `1px solid ${GOLD}44`,
              borderRadius: 7,
              padding: '8px 12px',
              cursor: 'pointer',
              color: GOLD,
              fontSize: 11,
              letterSpacing: 1,
              textTransform: 'uppercase',
              fontFamily: 'sans-serif',
            }}
          >
            <Plus size={12} />
            New Conversation
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto" style={{ padding: '6px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 24, fontSize: 11, color: '#444' }}>Loading...</div>
          ) : conversations.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 24, fontSize: 11, color: '#444', fontStyle: 'italic' }}>No past conversations.</div>
          ) : (
            conversations.map(conv => {
              const isActive = conv.id === currentConversationId;
              const name = conv.metadata?.name || `Session ${conv.id.slice(-6)}`;
              const preview = conv.messages?.filter(m => m.role === 'user').slice(-1)[0]?.content?.replace(/\[.*?Mode.*?\]\n\n/, '')?.slice(0, 80) || '';
              const date = conv.created_date ? formatDistanceToNow(new Date(conv.created_date), { addSuffix: true }) : '';

              return (
                <button
                  key={conv.id}
                  onClick={() => { onSelect(conv); onClose(); }}
                  className="w-full text-left"
                  style={{
                    background: isActive ? `${GOLD}15` : 'transparent',
                    border: `1px solid ${isActive ? GOLD + '55' : 'transparent'}`,
                    borderRadius: 8,
                    padding: '10px 12px',
                    marginBottom: 2,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    display: 'block',
                  }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = '#ffffff08'; }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                >
                  <div className="flex items-start gap-2">
                    <MessageSquare size={11} style={{ color: isActive ? GOLD : '#444', flexShrink: 0, marginTop: 2 }} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 11, color: isActive ? GOLD : '#aaa', fontWeight: 600, fontFamily: 'sans-serif', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {name}
                      </div>
                      {preview && (
                        <div style={{ fontSize: 10, color: '#555', marginTop: 2, lineHeight: 1.4, fontFamily: 'Georgia, serif', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                          {preview}
                        </div>
                      )}
                      <div className="flex items-center gap-1 mt-1">
                        <Clock size={8} style={{ color: '#333' }} />
                        <span style={{ fontSize: 9, color: '#333', letterSpacing: 0.5 }}>{date}</span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </aside>
    </div>
  );
}