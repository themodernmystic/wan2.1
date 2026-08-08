import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Search, ExternalLink } from 'lucide-react';
import ForgeLayout from '@/components/forge/ForgeLayout';
import ForgeCard from '@/components/forge/ForgeCard';
import ForgeBadge from '@/components/forge/ForgeBadge';

const CATEGORIES = ['All', 'App Framework', 'UI Components', 'Icons', 'Charts', 'Auth', 'Database', 'Backend', 'Hosting', 'Testing', 'Accessibility', 'Security', 'AI / LLM', 'Vector Database', 'Automation', 'Other'];
const GOLD = '#C9A84C';

const COST_COLORS = {
  Free: '#10B981', 'Open Source': '#3B82F6', Freemium: '#F59E0B', 'Paid Optional': '#8B5CF6', Paid: '#EF4444',
};

export default function OpenSourceLibrary() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');

  const { data: resources = [], isLoading } = useQuery({ queryKey: ['oss-resources'], queryFn: () => base44.entities.OpenSourceResource.filter({ status: 'Active' }, 'name', 100) });

  const filtered = resources.filter(r => {
    const matchCat = category === 'All' || r.category === category;
    const matchSearch = !search || r.name.toLowerCase().includes(search.toLowerCase()) || (r.description || '').toLowerCase().includes(search.toLowerCase()) || (r.use_case || '').toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const grouped = {};
  filtered.forEach(r => { const k = r.category || 'Other'; if (!grouped[k]) grouped[k] = []; grouped[k].push(r); });

  return (
    <ForgeLayout title="Open-Source Library" subtitle="Free-first · Privacy-first · Credit-saving resources">
      {/* Search + Filter */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 240 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#4B5563' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search resources..."
            style={{ width: '100%', paddingLeft: 36, paddingRight: 16, paddingTop: 10, paddingBottom: 10, background: '#0B0B18', border: '1px solid #1E293B', borderRadius: 8, color: '#CBD5E1', fontSize: 12, fontFamily: 'sans-serif', outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {CATEGORIES.map(c => (
            <button key={c} onClick={() => setCategory(c)}
              style={{ padding: '6px 14px', borderRadius: 20, fontSize: 11, fontFamily: 'sans-serif', fontWeight: 600, cursor: 'pointer', border: `1px solid ${category === c ? GOLD : '#1E293B'}`, background: category === c ? '#C9A84C15' : 'transparent', color: category === c ? GOLD : '#4B5563', transition: 'all 0.15s' }}>
              {c}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <p style={{ color: '#4B5563', fontSize: 13, fontFamily: 'sans-serif' }}>Loading library...</p>
      ) : filtered.length === 0 ? (
        <p style={{ color: '#374151', fontSize: 13, fontFamily: 'sans-serif' }}>No resources found.</p>
      ) : (
        Object.entries(grouped).sort((a, b) => a[0].localeCompare(b[0])).map(([cat, items]) => (
          <div key={cat} style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 11, color: GOLD, letterSpacing: 3, textTransform: 'uppercase', fontFamily: 'sans-serif', fontWeight: 600, marginBottom: 12 }}>{cat}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
              {items.map(r => (
                <div key={r.id} style={{ background: '#0B0B18', border: '1px solid #1E1E35', borderRadius: 10, padding: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#E2E8F0', fontFamily: 'sans-serif' }}>{r.name}</span>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      {r.website_url && (
                        <a href={r.website_url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink size={12} style={{ color: '#4B5563' }} />
                        </a>
                      )}
                    </div>
                  </div>
                  {r.description && <p style={{ fontSize: 11, color: '#64748B', lineHeight: 1.6, margin: '0 0 10px', fontFamily: 'sans-serif' }}>{r.description}</p>}
                  {r.use_case && <p style={{ fontSize: 11, color: '#94A3B8', lineHeight: 1.6, margin: '0 0 10px', fontFamily: 'sans-serif' }}><strong style={{ color: '#4B5563' }}>Use:</strong> {r.use_case}</p>}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                    {r.cost_level && (
                      <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 12, background: `${COST_COLORS[r.cost_level] || '#4B5563'}22`, color: COST_COLORS[r.cost_level] || '#9CA3AF', border: `1px solid ${COST_COLORS[r.cost_level] || '#4B5563'}44`, fontFamily: 'sans-serif', fontWeight: 600 }}>
                        {r.cost_level}
                      </span>
                    )}
                    {r.integration_type && (
                      <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 12, background: '#1E293B', color: '#64748B', fontFamily: 'sans-serif' }}>
                        {r.integration_type}
                      </span>
                    )}
                    {r.license && <span style={{ fontSize: 10, color: '#374151', fontFamily: 'sans-serif' }}>{r.license}</span>}
                  </div>
                  {r.risk_notes && <p style={{ fontSize: 10, color: '#7F1D1D', marginTop: 8, lineHeight: 1.5, fontFamily: 'sans-serif' }}>⚠ {r.risk_notes}</p>}
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </ForgeLayout>
  );
}