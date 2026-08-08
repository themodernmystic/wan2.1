import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Wrench, AlertTriangle, CheckCircle2 } from 'lucide-react';

const GOLD = '#C9A84C';

export default function PatchPlanCard({ data, onApprove }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={{
      background: 'linear-gradient(135deg, #0D1A0D, #0a150a)',
      border: '1px solid #4ade8033',
      borderLeft: '3px solid #4ade80',
      borderRadius: 10,
      overflow: 'hidden',
      margin: '8px 0',
    }}>
      <button
        onClick={() => setExpanded(!expanded)}
        style={{ width: '100%', background: 'transparent', border: 'none', cursor: 'pointer', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left' }}
      >
        <Wrench size={14} style={{ color: '#4ade80', flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 9, color: '#4ade80', letterSpacing: 3, textTransform: 'uppercase', fontFamily: 'sans-serif' }}>Patch Plan</div>
          <div style={{ fontSize: 12, color: '#E8E0D0', marginTop: 2, lineHeight: 1.4 }}>{data.build_objective}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          {data.requires_approval && !data.approved && (
            <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 20, background: '#facc1522', color: '#facc15', border: '1px solid #facc1544', fontFamily: 'sans-serif' }}>Needs Approval</span>
          )}
          {data.approved && (
            <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 20, background: '#4ade8022', color: '#4ade80', border: '1px solid #4ade8044', fontFamily: 'sans-serif' }}>Approved</span>
          )}
          {expanded ? <ChevronDown size={12} style={{ color: '#555' }} /> : <ChevronRight size={12} style={{ color: '#555' }} />}
        </div>
      </button>

      {expanded && (
        <div style={{ padding: '0 14px 14px', borderTop: '1px solid #0f2010' }}>
          <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <AffectedList label="Affected Files" items={data.affected_files} />
            <AffectedList label="Affected Entities" items={data.affected_entities} />
            <AffectedList label="Affected Functions" items={data.affected_functions} />
            <AffectedList label="Affected Routes" items={data.affected_routes} />
          </div>

          <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: '1fr', gap: 8 }}>
            {data.implementation_order && <TextRow label="Implementation Order" value={data.implementation_order} />}
            {data.risks && <TextRow label="Risks" value={data.risks} accent="#fb923c" icon={<AlertTriangle size={11} style={{ color: '#fb923c' }} />} />}
            {data.rollback_plan && <TextRow label="Rollback Plan" value={data.rollback_plan} />}
            {data.testing_plan && <TextRow label="Testing Plan" value={data.testing_plan} />}
          </div>

          {onApprove && data.requires_approval && !data.approved && (
            <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
              <button
                onClick={() => onApprove('approve_patch')}
                style={{ flex: 1, background: '#4ade8022', border: '1px solid #4ade8066', color: '#4ade80', borderRadius: 6, padding: '7px', cursor: 'pointer', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', fontFamily: 'sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              >
                <CheckCircle2 size={11} /> Approve & Build
              </button>
              <button
                onClick={() => onApprove('cancel')}
                style={{ flex: 1, background: 'transparent', border: '1px solid #333', color: '#666', borderRadius: 6, padding: '7px', cursor: 'pointer', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', fontFamily: 'sans-serif' }}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AffectedList({ label, items }) {
  if (!items?.length) return null;
  return (
    <div style={{ padding: '8px 10px', background: '#080810', borderRadius: 6, border: '1px solid #0f2010' }}>
      <div style={{ fontSize: 9, color: '#4ade8066', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4, fontFamily: 'sans-serif' }}>{label}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {items.map((item, i) => (
          <span key={i} style={{ fontSize: 9, padding: '1px 6px', background: '#0f2010', border: '1px solid #1a3a1a', borderRadius: 10, color: '#4ade80aa', fontFamily: 'sans-serif' }}>{item}</span>
        ))}
      </div>
    </div>
  );
}

function TextRow({ label, value, accent, icon }) {
  return (
    <div style={{ padding: '8px 10px', background: '#080810', borderRadius: 6, border: '1px solid #0f2010' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
        {icon}
        <span style={{ fontSize: 9, color: '#4ade8066', letterSpacing: 1, textTransform: 'uppercase', fontFamily: 'sans-serif' }}>{label}</span>
      </div>
      <div style={{ fontSize: 11, color: accent || '#aaa', lineHeight: 1.6 }}>{value}</div>
    </div>
  );
}