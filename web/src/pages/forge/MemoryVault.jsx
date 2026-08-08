import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Brain, Plus, Search, Archive } from 'lucide-react';
import ForgeLayout from '@/components/forge/ForgeLayout';
import ForgeCard from '@/components/forge/ForgeCard';
import ForgeButton from '@/components/forge/ForgeButton';
import ForgeBadge from '@/components/forge/ForgeBadge';
import { toast } from 'sonner';

const CATEGORIES = ['All', 'James Preference', 'Product Architecture', 'Brand Decision', 'Build Decision', 'Debug Lesson', 'Landing Page Pattern', 'Hermetica Context', 'Soul Core Note', 'Technical Decision', 'Other'];
const GOLD = '#C9A84C';

export default function MemoryVault() {
  const [showNew, setShowNew] = useState(false);
  const [filterCat, setFilterCat] = useState('All');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ title: '', content: '', category: 'Other', confidence: 80, source: '' });
  const [selected, setSelected] = useState(null);
  const qc = useQueryClient();

  const { data: memories = [], isLoading } = useQuery({ queryKey: ['memories'], queryFn: () => base44.entities.RileyMemory.filter({ active: true }, '-updated_date', 100) });

  const createMutation = useMutation({
    mutationFn: (data) => base44.functions.invoke('rileySaveMemory', data),
    onSuccess: () => { qc.invalidateQueries(['memories']); setShowNew(false); setForm({ title: '', content: '', category: 'Other', confidence: 80, source: '' }); toast.success('Memory saved'); }
  });

  const archiveMutation = useMutation({
    mutationFn: ({ id, reason }) => base44.entities.RileyMemory.update(id, { active: false, archive_reason: reason }),
    onSuccess: () => { qc.invalidateQueries(['memories']); setSelected(null); toast.success('Memory archived'); }
  });

  const filtered = memories.filter(m => {
    const matchCat = filterCat === 'All' || m.category === filterCat;
    const matchSearch = !search || m.title.toLowerCase().includes(search.toLowerCase()) || (m.content || '').toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const catColors = {
    'James Preference': '#C9A84C', 'Product Architecture': '#3B82F6', 'Brand Decision': '#8B5CF6',
    'Build Decision': '#10B981', 'Debug Lesson': '#EF4444', 'Landing Page Pattern': '#F59E0B',
    'Hermetica Context': '#C9A84C', 'Soul Core Note': '#C9A84C', 'Technical Decision': '#06B6D4', Other: '#4B5563',
  };

  return (
    <ForgeLayout
      title="Memory Vault"
      subtitle="Decisions · Preferences · Patterns · Context"
      actions={<ForgeButton icon={Plus} onClick={() => setShowNew(true)}>Save Memory</ForgeButton>}
    >
      {showNew && (
        <ForgeCard title="New Memory" className="mb-5">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ fontSize: 10, color: '#4B5563', display: 'block', marginBottom: 4, fontFamily: 'sans-serif' }}>Title *</label>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                style={{ width: '100%', background: '#080812', border: '1px solid #1E293B', borderRadius: 6, padding: '8px 12px', color: '#CBD5E1', fontSize: 12, fontFamily: 'sans-serif', outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: 10, color: '#4B5563', display: 'block', marginBottom: 4, fontFamily: 'sans-serif' }}>Category</label>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                style={{ width: '100%', background: '#080812', border: '1px solid #1E293B', borderRadius: 6, padding: '8px 12px', color: '#CBD5E1', fontSize: 12, fontFamily: 'sans-serif', outline: 'none', boxSizing: 'border-box' }}>
                {CATEGORIES.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 10, color: '#4B5563', display: 'block', marginBottom: 4, fontFamily: 'sans-serif' }}>Confidence %</label>
              <input type="number" min="0" max="100" value={form.confidence} onChange={e => setForm(f => ({ ...f, confidence: parseInt(e.target.value) || 80 }))}
                style={{ width: '100%', background: '#080812', border: '1px solid #1E293B', borderRadius: 6, padding: '8px 12px', color: '#CBD5E1', fontSize: 12, fontFamily: 'sans-serif', outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ fontSize: 10, color: '#4B5563', display: 'block', marginBottom: 4, fontFamily: 'sans-serif' }}>Content *</label>
              <textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} rows={4}
                style={{ width: '100%', background: '#080812', border: '1px solid #1E293B', borderRadius: 6, padding: '8px 12px', color: '#CBD5E1', fontSize: 12, resize: 'vertical', fontFamily: 'sans-serif', outline: 'none', boxSizing: 'border-box' }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
            <ForgeButton icon={Brain} loading={createMutation.isPending} onClick={() => createMutation.mutate(form)} disabled={!form.title || !form.content}>Save Memory</ForgeButton>
            <ForgeButton variant="ghost" onClick={() => setShowNew(false)}>Cancel</ForgeButton>
          </div>
        </ForgeCard>
      )}

      {/* Search + filter */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#4B5563' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search memories..."
            style={{ width: '100%', paddingLeft: 36, paddingRight: 16, paddingTop: 8, paddingBottom: 8, background: '#0B0B18', border: '1px solid #1E293B', borderRadius: 8, color: '#CBD5E1', fontSize: 12, fontFamily: 'sans-serif', outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
          style={{ background: '#0B0B18', border: '1px solid #1E293B', borderRadius: 8, padding: '8px 14px', color: '#CBD5E1', fontSize: 12, fontFamily: 'sans-serif', outline: 'none' }}>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
        {isLoading ? <p style={{ color: '#4B5563', fontSize: 12, fontFamily: 'sans-serif' }}>Loading...</p>
          : filtered.length === 0 ? <p style={{ color: '#374151', fontSize: 12, fontFamily: 'sans-serif' }}>No memories found.</p>
          : filtered.map(m => (
            <div key={m.id} style={{ background: '#0B0B18', border: `1px solid ${catColors[m.category] || '#1E1E35'}33`, borderRadius: 10, padding: 16, cursor: 'pointer', borderLeft: `3px solid ${catColors[m.category] || '#1E1E35'}` }}
              onClick={() => setSelected(selected?.id === m.id ? null : m)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#E2E8F0', fontFamily: 'sans-serif' }}>{m.title}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {m.confidence && <span style={{ fontSize: 10, color: m.confidence >= 80 ? '#10B981' : '#F59E0B', fontFamily: 'sans-serif' }}>{m.confidence}%</span>}
                </div>
              </div>
              <div style={{ marginBottom: 8 }}>
                <span style={{ fontSize: 10, color: catColors[m.category] || '#4B5563', fontFamily: 'sans-serif', fontWeight: 600 }}>{m.category}</span>
              </div>
              <p style={{ fontSize: 12, color: '#64748B', lineHeight: 1.6, margin: 0, fontFamily: 'sans-serif' }}>
                {selected?.id === m.id ? m.content : m.content?.slice(0, 120) + (m.content?.length > 120 ? '...' : '')}
              </p>
              {selected?.id === m.id && (
                <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                  <ForgeButton variant="danger" size="sm" icon={Archive}
                    onClick={e => { e.stopPropagation(); if (confirm('Archive this memory?')) archiveMutation.mutate({ id: m.id, reason: 'Manually archived' }); }}>
                    Archive
                  </ForgeButton>
                </div>
              )}
            </div>
          ))
        }
      </div>
    </ForgeLayout>
  );
}