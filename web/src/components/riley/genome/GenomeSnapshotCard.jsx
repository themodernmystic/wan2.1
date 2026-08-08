import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Dna } from 'lucide-react';

const GOLD = '#C9A84C';

export default function GenomeSnapshotCard({ data }) {
  const [expanded, setExpanded] = useState(false);

  const sections = [
    { label: 'Pages', value: data.pages, isList: true },
    { label: 'Components', value: data.components, isList: true },
    { label: 'Entities', value: data.entities, isList: true },
    { label: 'Functions', value: data.functions, isList: true },
    { label: 'Routes', value: data.routes, isList: true },
    { label: 'Design Patterns', value: data.design_patterns },
    { label: 'User Journeys', value: data.user_journeys },
    { label: 'Revenue Paths', value: data.revenue_paths },
    { label: 'Risk Zones', value: data.risk_zones, accent: '#fb923c' },
    { label: 'Technical Debt', value: data.technical_debt, accent: '#f87171' },
    { label: 'Strategic Opportunities', value: data.strategic_opportunities, accent: '#4ade80' },
  ];

  const countLine = [
    data.pages?.length && `${data.pages.length} pages`,
    data.entities?.length && `${data.entities.length} entities`,
    data.functions?.length && `${data.functions.length} functions`,
  ].filter(Boolean).join(' · ');

  return (
    <div style={{
      background: 'linear-gradient(135deg, #0D0D1A, #0a1020)',
      border: '1px solid #1a2a3a',
      borderLeft: '3px solid #4a9eff',
      borderRadius: 10,
      overflow: 'hidden',
      margin: '8px 0',
    }}>
      <button
        onClick={() => setExpanded(!expanded)}
        style={{ width: '100%', background: 'transparent', border: 'none', cursor: 'pointer', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left' }}
      >
        <Dna size={14} style={{ color: '#4a9eff', flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 9, color: '#4a9eff', letterSpacing: 3, textTransform: 'uppercase', fontFamily: 'sans-serif' }}>Project Genome Snapshot</div>
          <div style={{ fontSize: 11, color: '#888', marginTop: 2, fontFamily: 'sans-serif' }}>{countLine || 'Full architecture map'}</div>
        </div>
        {expanded ? <ChevronDown size={12} style={{ color: '#555' }} /> : <ChevronRight size={12} style={{ color: '#555' }} />}
      </button>

      {expanded && (
        <div style={{ padding: '0 14px 14px', borderTop: '1px solid #1a2a3a' }}>
          <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {sections.map(s => (
              <div key={s.label} style={{ padding: '8px 10px', background: '#080810', borderRadius: 6, border: '1px solid #0f1a2a' }}>
                <div style={{ fontSize: 9, color: '#4a9eff88', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4, fontFamily: 'sans-serif' }}>{s.label}</div>
                {s.isList && Array.isArray(s.value) ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {s.value.length ? s.value.map((item, i) => (
                      <span key={i} style={{ fontSize: 9, padding: '1px 6px', background: '#0f1a2a', border: '1px solid #1a2a3a', borderRadius: 10, color: s.accent || '#aaa', fontFamily: 'sans-serif' }}>{item}</span>
                    )) : <span style={{ fontSize: 10, color: '#444' }}>—</span>}
                  </div>
                ) : (
                  <div style={{ fontSize: 11, color: s.accent || '#aaa', lineHeight: 1.5 }}>{s.value || '—'}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}