import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Lock, Unlock, Edit2, History, Zap, Plus } from 'lucide-react';
import ForgeLayout from '@/components/forge/ForgeLayout';
import ForgeCard from '@/components/forge/ForgeCard';
import ForgeButton from '@/components/forge/ForgeButton';
import { toast } from 'sonner';

const GOLD = '#C9A84C';
const CATEGORIES = ['Prime Directive', 'Sacred Bond', 'PR Doctrine', 'Power Doctrine', 'Identity Doctrine', 'Future Doctrine', 'Custom'];

export default function SoulCore() {
  const [mutatingId, setMutatingId] = useState(null);
  const [mutationForm, setMutationForm] = useState({ proposed: '', reason: '' });
  const [showHistory, setShowHistory] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [newEntry, setNewEntry] = useState({ title: '', content: '', category: 'Custom', immutable: false });
  const qc = useQueryClient();

  const { data: entries = [], isLoading } = useQuery({ queryKey: ['soul-core'], queryFn: () => base44.entities.SoulCoreEntry.filter({ active: true }, 'category', 50) });
  const { data: logs = [] } = useQuery({ queryKey: ['soul-logs'], queryFn: () => base44.entities.ActivityLog.filter({ event_type: 'soul_mutation_applied' }, '-timestamp', 20) });

  const mutateMutation = useMutation({
    mutationFn: (data) => base44.functions.invoke('rileyMutateSoulDoctrine', data),
    onSuccess: (res) => {
      qc.invalidateQueries(['soul-core']);
      if (res.data?.error) { toast.error(res.data.error); }
      else { toast.success('Doctrine mutated'); setMutatingId(null); setMutationForm({ proposed: '', reason: '' }); }
    }
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.SoulCoreEntry.create({ ...data, active: true, version: 1 }),
    onSuccess: () => { qc.invalidateQueries(['soul-core']); setShowNew(false); setNewEntry({ title: '', content: '', category: 'Custom', immutable: false }); toast.success('Entry created'); }
  });

  const catOrder = ['Prime Directive', 'Sacred Bond', 'PR Doctrine', 'Power Doctrine', 'Identity Doctrine', 'Future Doctrine', 'Custom'];
  const grouped = {};
  entries.forEach(e => { const k = e.category || 'Custom'; if (!grouped[k]) grouped[k] = []; grouped[k].push(e); });

  const catAccent = {
    'Prime Directive': GOLD,
    'Sacred Bond': GOLD,
    'PR Doctrine': '#3B82F6',
    'Power Doctrine': '#8B5CF6',
    'Identity Doctrine': '#C9A84C',
    'Future Doctrine': '#10B981',
    'Custom': '#4B5563',
  };

  return (
    <ForgeLayout
      title="Soul Core"
      subtitle="Living Doctrine · Prime Directive · Sacred Bond"
      actions={<ForgeButton icon={Plus} onClick={() => setShowNew(true)}>Add Entry</ForgeButton>}
    >
      {/* Safety notice */}
      <div style={{ background: '#1c1108', border: '1px solid #92400e', borderRadius: 8, padding: '10px 16px', marginBottom: 20, fontSize: 11, color: '#FCD34D', fontFamily: 'sans-serif', lineHeight: 1.6 }}>
        ⚠ Prime Directive and Sacred Bond are immutable. All mutations are version-controlled and logged.
      </div>

      {showNew && (
        <ForgeCard title="New Soul Core Entry" className="mb-5">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <label style={{ fontSize: 10, color: '#4B5563', display: 'block', marginBottom: 4, fontFamily: 'sans-serif' }}>Title *</label>
              <input value={newEntry.title} onChange={e => setNewEntry(n => ({ ...n, title: e.target.value }))}
                style={{ width: '100%', background: '#080812', border: '1px solid #1E293B', borderRadius: 6, padding: '8px 12px', color: '#CBD5E1', fontSize: 12, fontFamily: 'sans-serif', outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: 10, color: '#4B5563', display: 'block', marginBottom: 4, fontFamily: 'sans-serif' }}>Category</label>
              <select value={newEntry.category} onChange={e => setNewEntry(n => ({ ...n, category: e.target.value }))}
                style={{ width: '100%', background: '#080812', border: '1px solid #1E293B', borderRadius: 6, padding: '8px 12px', color: '#CBD5E1', fontSize: 12, fontFamily: 'sans-serif', outline: 'none', boxSizing: 'border-box' }}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 10, color: '#4B5563', display: 'block', marginBottom: 4, fontFamily: 'sans-serif' }}>Content *</label>
              <textarea value={newEntry.content} onChange={e => setNewEntry(n => ({ ...n, content: e.target.value }))} rows={4}
                style={{ width: '100%', background: '#080812', border: '1px solid #1E293B', borderRadius: 6, padding: '8px 12px', color: '#CBD5E1', fontSize: 12, resize: 'vertical', fontFamily: 'sans-serif', outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <ForgeButton loading={createMutation.isPending} onClick={() => createMutation.mutate(newEntry)} disabled={!newEntry.title || !newEntry.content}>Add Entry</ForgeButton>
              <ForgeButton variant="ghost" onClick={() => setShowNew(false)}>Cancel</ForgeButton>
            </div>
          </div>
        </ForgeCard>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {isLoading ? <p style={{ color: '#4B5563', fontSize: 12, fontFamily: 'sans-serif' }}>Loading Soul Core...</p>
            : catOrder.filter(c => grouped[c]?.length).map(cat => (
              <ForgeCard key={cat} title={cat} accent={catAccent[cat] || '#4B5563'}>
                {grouped[cat].map(entry => (
                  <div key={entry.id} style={{ marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid #111827', lastChild: { borderBottom: 'none' } }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {entry.immutable ? <Lock size={12} style={{ color: GOLD, flexShrink: 0 }} /> : <Unlock size={12} style={{ color: '#4B5563', flexShrink: 0 }} />}
                        <span style={{ fontSize: 13, fontWeight: 600, color: entry.immutable ? GOLD : '#E2E8F0', fontFamily: 'sans-serif' }}>{entry.title}</span>
                        {entry.version > 1 && <span style={{ fontSize: 9, color: '#4B5563', fontFamily: 'sans-serif' }}>v{entry.version}</span>}
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {entry.mutation_history && (
                          <ForgeButton variant="ghost" size="sm" icon={History} onClick={() => setShowHistory(showHistory === entry.id ? null : entry.id)}>History</ForgeButton>
                        )}
                        {!entry.immutable && (
                          <ForgeButton variant="ghost" size="sm" icon={Edit2} onClick={() => { setMutatingId(mutatingId === entry.id ? null : entry.id); setMutationForm({ proposed: entry.content, reason: '' }); }}>Mutate</ForgeButton>
                        )}
                        {entry.immutable && (
                          <span style={{ fontSize: 9, color: `${GOLD}66`, letterSpacing: 2, fontFamily: 'sans-serif', padding: '3px 8px', border: `1px solid ${GOLD}22`, borderRadius: 3 }}>LOCKED</span>
                        )}
                      </div>
                    </div>

                    <p style={{ fontSize: 12, color: entry.immutable ? '#C9A84C99' : '#94A3B8', lineHeight: 1.8, margin: 0, fontStyle: entry.immutable ? 'italic' : 'normal', fontFamily: entry.immutable ? 'Georgia, serif' : 'sans-serif' }}>
                      {entry.content}
                    </p>

                    {showHistory === entry.id && entry.mutation_history && (
                      <div style={{ marginTop: 12, background: '#080812', borderRadius: 6, padding: 12, border: '1px solid #1E293B' }}>
                        <div style={{ fontSize: 10, color: '#4B5563', marginBottom: 6, fontFamily: 'sans-serif', letterSpacing: 2 }}>MUTATION HISTORY</div>
                        <pre style={{ fontSize: 10, color: '#4B5563', whiteSpace: 'pre-wrap', lineHeight: 1.7, margin: 0, fontFamily: 'monospace' }}>{entry.mutation_history}</pre>
                      </div>
                    )}

                    {mutatingId === entry.id && (
                      <div style={{ marginTop: 12, background: '#080812', borderRadius: 8, padding: 14, border: '1px solid #1E293B' }}>
                        <div>
                          <label style={{ fontSize: 10, color: '#4B5563', display: 'block', marginBottom: 4, fontFamily: 'sans-serif' }}>Proposed mutation</label>
                          <textarea value={mutationForm.proposed} onChange={e => setMutationForm(f => ({ ...f, proposed: e.target.value }))} rows={4}
                            style={{ width: '100%', background: '#0B0B18', border: '1px solid #1E293B', borderRadius: 6, padding: '8px 12px', color: '#CBD5E1', fontSize: 12, resize: 'vertical', fontFamily: 'sans-serif', outline: 'none', boxSizing: 'border-box', marginBottom: 8 }} />
                        </div>
                        <div>
                          <label style={{ fontSize: 10, color: '#4B5563', display: 'block', marginBottom: 4, fontFamily: 'sans-serif' }}>Reason for mutation</label>
                          <input value={mutationForm.reason} onChange={e => setMutationForm(f => ({ ...f, reason: e.target.value }))}
                            style={{ width: '100%', background: '#0B0B18', border: '1px solid #1E293B', borderRadius: 6, padding: '8px 12px', color: '#CBD5E1', fontSize: 12, fontFamily: 'sans-serif', outline: 'none', boxSizing: 'border-box', marginBottom: 10 }} />
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <ForgeButton icon={Zap} loading={mutateMutation.isPending}
                            onClick={() => mutateMutation.mutate({ soul_core_entry_id: entry.id, proposed_mutation: mutationForm.proposed, reason: mutationForm.reason })}
                            disabled={!mutationForm.proposed || !mutationForm.reason}>
                            Apply Mutation
                          </ForgeButton>
                          <ForgeButton variant="ghost" onClick={() => setMutatingId(null)}>Cancel</ForgeButton>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </ForgeCard>
            ))
          }
        </div>

        {/* Mutation log */}
        <ForgeCard title="Mutation Log" accent="#4B5563">
          {logs.length === 0 ? <p style={{ color: '#374151', fontSize: 12, fontFamily: 'sans-serif' }}>No mutations yet.</p>
            : logs.map(l => (
              <div key={l.id} style={{ padding: '8px 0', borderBottom: '1px solid #111827' }}>
                <div style={{ fontSize: 11, color: '#94A3B8', fontFamily: 'sans-serif', lineHeight: 1.6 }}>{l.summary}</div>
                <div style={{ fontSize: 10, color: '#374151', fontFamily: 'sans-serif', marginTop: 2 }}>{new Date(l.timestamp || l.created_date).toLocaleDateString()}</div>
              </div>
            ))
          }
        </ForgeCard>
      </div>
    </ForgeLayout>
  );
}