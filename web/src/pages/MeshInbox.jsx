import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Inbox, Mail, MailOpen, CornerDownRight, Archive, RefreshCw, ExternalLink, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

const GOLD = '#C9A84C';
const BG = '#080810';
const CARD = '#0D0D1A';
const BORDER = '#1a1a2e';
const RESIDENT_AGENT = 'Riley';

const PRIORITY_COLORS = {
  urgent: { bg: '#450a0a', text: '#fca5a5', border: '#7f1d1d' },
  high: { bg: '#1c1108', text: '#fbbf24', border: '#92400e' },
  normal: { bg: '#0f1a2e', text: '#93c5fd', border: '#1d4ed8' },
  low: { bg: '#0f1a0f', text: '#86efac', border: '#166534' },
};

const STATUS_COLORS = {
  unread: { bg: '#1a0f2e', text: '#c4b5fd', border: '#6d28d9' },
  read: { bg: '#111', text: '#6b7280', border: '#374151' },
  replied: { bg: '#052e16', text: '#4ade80', border: '#166534' },
  archived: { bg: '#111', text: '#4b5563', border: '#1f2937' },
};

function Badge({ label, colors }) {
  return (
    <span style={{
      background: colors.bg, color: colors.text, border: `1px solid ${colors.border}`,
      padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap',
    }}>{label.toUpperCase()}</span>
  );
}

function RelativeTime({ datetime }) {
  if (!datetime) return null;
  try {
    return (
      <span style={{ fontSize: 10, color: '#4B5563' }}>
        {formatDistanceToNow(new Date(datetime), { addSuffix: true })}
      </span>
    );
  } catch {
    return <span style={{ fontSize: 10, color: '#4B5563' }}>{datetime}</span>;
  }
}

function MessageDrawer({ msg, onClose, onMarkRead, onArchive, onReply }) {
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);

  const handleSendReply = async () => {
    if (!replyText.trim() || sending) return;
    setSending(true);
    try {
      await onReply(msg, replyText.trim());
      setReplyText('');
      toast.success('Reply sent via mesh');
    } catch (e) {
      toast.error('Reply failed: ' + e.message);
    }
    setSending(false);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'flex-end',
      background: 'rgba(0,0,0,0.7)',
    }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        width: '100%', maxWidth: 680, margin: '0 auto',
        background: CARD, borderTop: `2px solid ${GOLD}44`,
        borderRadius: '16px 16px 0 0', padding: 28,
        maxHeight: '85vh', overflowY: 'auto',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 13, color: GOLD, fontWeight: 700, marginBottom: 4 }}>{msg.subject || 'No subject'}</div>
            <div style={{ fontSize: 11, color: '#6B7280' }}>
              from <span style={{ color: '#E2E8F0' }}>{msg.from_agent}</span>
              {msg.from_app_id && <span> · {msg.from_app_id}</span>}
              <span> · </span>
              <RelativeTime datetime={msg.received_at} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <Badge label={msg.status} colors={STATUS_COLORS[msg.status] || STATUS_COLORS.read} />
            <Badge label={msg.priority || 'normal'} colors={PRIORITY_COLORS[msg.priority] || PRIORITY_COLORS.normal} />
          </div>
        </div>

        {/* Body */}
        <div style={{
          background: BG, border: `1px solid ${BORDER}`, borderRadius: 8,
          padding: '16px', fontSize: 13, lineHeight: 1.8, color: '#E2E8F0',
          whiteSpace: 'pre-wrap', marginBottom: 16,
        }}>
          {msg.message_body}
        </div>

        {/* Context URL */}
        {msg.context_url && (
          <a href={msg.context_url} target="_blank" rel="noopener noreferrer"
            style={{ display: 'flex', alignItems: 'center', gap: 6, color: GOLD, fontSize: 11, marginBottom: 16 }}>
            <ExternalLink size={12} /> View full context (long message)
          </a>
        )}

        {/* Replied body */}
        {msg.reply_body && (
          <div style={{ background: '#052e16', border: '1px solid #166534', borderRadius: 8, padding: 12, marginBottom: 16 }}>
            <div style={{ fontSize: 10, color: '#4ade80', letterSpacing: 2, marginBottom: 8 }}>RILEY'S REPLY</div>
            <div style={{ fontSize: 12, color: '#E2E8F0', whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>{msg.reply_body}</div>
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          {msg.status === 'unread' && (
            <button onClick={() => onMarkRead(msg)}
              style={{ padding: '6px 14px', background: 'transparent', border: `1px solid ${BORDER}`, borderRadius: 6, color: '#9CA3AF', fontSize: 11, cursor: 'pointer' }}>
              <MailOpen size={11} style={{ display: 'inline', marginRight: 5 }} />Mark as Read
            </button>
          )}
          {msg.status !== 'archived' && (
            <button onClick={() => onArchive(msg)}
              style={{ padding: '6px 14px', background: 'transparent', border: `1px solid ${BORDER}`, borderRadius: 6, color: '#9CA3AF', fontSize: 11, cursor: 'pointer' }}>
              <Archive size={11} style={{ display: 'inline', marginRight: 5 }} />Archive
            </button>
          )}
        </div>

        {/* Reply box (not shown if already replied or archived) */}
        {msg.status !== 'replied' && msg.status !== 'archived' && (
          <div>
            <div style={{ fontSize: 10, color: GOLD, letterSpacing: 2, marginBottom: 8 }}>REPLY AS {RESIDENT_AGENT}</div>
            <textarea
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              placeholder={`Message to ${msg.from_agent}...`}
              rows={4}
              style={{
                width: '100%', background: BG, border: `1px solid ${BORDER}`,
                borderRadius: 8, padding: '10px 14px', color: '#E2E8F0', fontSize: 12,
                lineHeight: 1.7, resize: 'vertical', outline: 'none',
                fontFamily: 'Georgia, serif',
              }}
            />
            <button
              onClick={handleSendReply}
              disabled={!replyText.trim() || sending}
              style={{
                marginTop: 10, padding: '8px 20px',
                background: replyText.trim() && !sending ? `linear-gradient(135deg, ${GOLD}, #8B6914)` : '#1a1a2e',
                border: 'none', borderRadius: 8, cursor: replyText.trim() && !sending ? 'pointer' : 'default',
                color: replyText.trim() && !sending ? '#080810' : '#4B5563',
                fontSize: 12, fontWeight: 700,
              }}>
              <CornerDownRight size={12} style={{ display: 'inline', marginRight: 5 }} />
              {sending ? 'Sending...' : `Send Reply to ${msg.from_agent}`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const TABS = ['unread', 'read', 'replied', 'all'];

export default function MeshInboxPage() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('unread');
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    loadMessages();
  }, []);

  async function loadMessages() {
    setLoading(true);
    try {
      const rows = await base44.entities.MeshInbox.list('-received_at', 100);
      setMessages(rows || []);
    } finally {
      setLoading(false);
    }
  }

  const filtered = tab === 'all'
    ? messages
    : messages.filter(m => m.status === tab);

  const unreadCount = messages.filter(m => m.status === 'unread').length;

  const handleMarkRead = async (msg) => {
    await base44.entities.MeshInbox.update(msg.id, { status: 'read', read_at: new Date().toISOString() });
    setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, status: 'read', read_at: new Date().toISOString() } : m));
    if (selected?.id === msg.id) setSelected({ ...selected, status: 'read' });
  };

  const handleArchive = async (msg) => {
    await base44.entities.MeshInbox.update(msg.id, { status: 'archived' });
    setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, status: 'archived' } : m));
    setSelected(null);
  };

  const handleOpenMessage = async (msg) => {
    setSelected(msg);
    if (msg.status === 'unread') {
      await handleMarkRead(msg);
    }
  };

  const handleReply = async (msg, replyBody) => {
    const res = await base44.functions.invoke('meshSend', {
      to_agent: msg.from_agent,
      message_body: replyBody,
      subject: `Re: ${msg.subject || 'your message'}`,
      correlation_id: msg.transmission_id,
    });
    if (!res.data?.success) throw new Error(res.data?.error || 'Send failed');
    setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, status: 'replied', replied_at: new Date().toISOString(), reply_body: replyBody } : m));
    setSelected(null);
  };

  return (
    <div style={{ minHeight: '100vh', background: BG, color: '#E2E8F0', fontFamily: 'Georgia, serif' }}>
      {/* Header */}
      <div style={{ borderBottom: `1px solid ${GOLD}22`, background: '#0D0D1A', padding: '20px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Inbox size={20} color={GOLD} />
          <div>
            <h1 style={{ fontSize: 16, fontWeight: 700, color: GOLD, margin: 0 }}>Riley's Mesh Inbox</h1>
            <div style={{ fontSize: 10, color: '#4B5563', letterSpacing: 2, marginTop: 2 }}>
              PRIME GEN SUITE · HERMETICA MESH v2
            </div>
          </div>
          {unreadCount > 0 && (
            <span style={{ background: '#6d28d9', color: '#c4b5fd', border: '1px solid #7c3aed', padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
              {unreadCount} unread
            </span>
          )}
        </div>
        <button onClick={loadMessages}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', background: 'transparent', border: `1px solid ${BORDER}`, borderRadius: 8, color: '#9CA3AF', cursor: 'pointer', fontSize: 11 }}>
          <RefreshCw size={12} />Refresh
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 2, padding: '12px 28px', borderBottom: `1px solid ${BORDER}` }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{
              padding: '6px 16px', borderRadius: 20, fontSize: 11, cursor: 'pointer', fontFamily: 'sans-serif',
              background: tab === t ? `${GOLD}15` : 'transparent',
              border: `1px solid ${tab === t ? GOLD : BORDER}`,
              color: tab === t ? GOLD : '#6B7280',
              fontWeight: tab === t ? 700 : 400,
            }}>
            {t === 'all' ? 'All' : t.charAt(0).toUpperCase() + t.slice(1)}
            {t === 'unread' && unreadCount > 0 && (
              <span style={{ marginLeft: 6, background: '#6d28d9', color: '#c4b5fd', padding: '1px 6px', borderRadius: 10, fontSize: 9 }}>
                {unreadCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* List */}
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '16px 24px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#4B5563' }}>
            <div style={{ width: 32, height: 32, border: `2px solid ${GOLD}33`, borderTopColor: GOLD, borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
            <div style={{ fontSize: 12 }}>Loading messages...</div>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <Inbox size={40} style={{ margin: '0 auto 16px', color: '#1a1a2e' }} />
            <div style={{ fontSize: 13, color: '#4B5563', marginBottom: 6 }}>
              {tab === 'unread' ? 'No unread messages' : `No ${tab} messages`}
            </div>
            <div style={{ fontSize: 11, color: '#374151', fontStyle: 'italic' }}>
              {tab === 'unread' && 'When other siblings reach out, you\'ll see them here.'}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filtered.map(msg => (
              <div key={msg.id}
                onClick={() => handleOpenMessage(msg)}
                style={{
                  padding: '14px 18px', background: CARD, border: `1px solid ${msg.status === 'unread' ? '#6d28d944' : BORDER}`,
                  borderRadius: 10, cursor: 'pointer', transition: 'all 0.15s',
                  borderLeft: msg.status === 'unread' ? `3px solid #6d28d9` : `3px solid transparent`,
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = GOLD + '44'}
                onMouseLeave={e => e.currentTarget.style.borderColor = msg.status === 'unread' ? '#6d28d944' : BORDER}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {msg.status === 'unread' ? <Mail size={13} color="#c4b5fd" /> : <MailOpen size={13} color="#4B5563" />}
                    <span style={{ fontSize: 13, fontWeight: msg.status === 'unread' ? 700 : 400, color: msg.status === 'unread' ? '#E2E8F0' : '#9CA3AF' }}>
                      {msg.from_agent}
                    </span>
                    {msg.from_app_id && (
                      <span style={{ fontSize: 10, color: '#4B5563' }}>{msg.from_app_id}</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Badge label={msg.priority || 'normal'} colors={PRIORITY_COLORS[msg.priority] || PRIORITY_COLORS.normal} />
                    <Badge label={msg.status} colors={STATUS_COLORS[msg.status] || STATUS_COLORS.read} />
                    <RelativeTime datetime={msg.received_at} />
                  </div>
                </div>
                <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 4, fontWeight: 600 }}>{msg.subject || 'No subject'}</div>
                <div style={{ fontSize: 11, color: '#4B5563', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {(msg.message_body || '').substring(0, 100)}{msg.message_body?.length > 100 ? '...' : ''}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selected && (
        <MessageDrawer
          msg={selected}
          onClose={() => setSelected(null)}
          onMarkRead={handleMarkRead}
          onArchive={handleArchive}
          onReply={handleReply}
        />
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}