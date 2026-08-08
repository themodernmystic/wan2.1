import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Hammer, Copy, Download, Trash2 } from 'lucide-react';
import ForgeLayout from '@/components/forge/ForgeLayout';
import ForgeCard from '@/components/forge/ForgeCard';
import ForgeButton from '@/components/forge/ForgeButton';
import ForgeBadge from '@/components/forge/ForgeBadge';
import { toast } from 'sonner';

const GOLD = '#C9A84C';

export default function AppBlueprints() {
  const [showNew, setShowNew] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ app_idea: '', app_name: '', target_users: '', product_type: 'App', desired_features: '', existing_app_context: '' });
  const [generating, setGenerating] = useState(false);
  const qc = useQueryClient();

  const { data: blueprints = [], isLoading } = useQuery({ queryKey: ['blueprints'], queryFn: () => base44.entities.AppBlueprint.list('-created_date', 30) });

  const generateMutation = useMutation({
    mutationFn: async (data) => { setGenerating(true); const res = await base44.functions.invoke('rileyGenerateAppBlueprint', data); return res; },
    onSuccess: (res) => {
      qc.invalidateQueries(['blueprints']);
      setSelected(res.data?.blueprint);
      setShowNew(false);
      setGenerating(false);
      toast.success('Blueprint generated');
    },
    onError: () => setGenerating(false),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.AppBlueprint.delete(id),
    onSuccess: () => { qc.invalidateQueries(['blueprints']); setSelected(null); toast.success('Deleted'); }
  });

  const exportMarkdown = (bp) => {
    const md = `# ${bp.app_name} — App Blueprint\n\n## Purpose\n${bp.app_purpose}\n\n## Problem\n${bp.problem_statement}\n\n## Core Features\n${bp.core_features}\n\n## Entities\n${bp.entities_summary}\n\n## Pages\n${bp.pages_summary}\n\n## Backend Functions\n${bp.backend_functions_summary}\n\n## Build Phases\n${bp.build_phases}\n\n## QA Plan\n${bp.qa_plan}`;
    navigator.clipboard.writeText(md);
    toast.success('Blueprint copied as Markdown');
  };

  const copyText = (text) => { navigator.clipboard.writeText(text); toast.success('Copied'); };

  return (
    <ForgeLayout
      title="App Blueprints"
      subtitle="Generate · Plan · Export"
      actions={<ForgeButton icon={Plus} onClick={() => setShowNew(true)}>New Blueprint</ForgeButton>}
    >
      {showNew && (
        <ForgeCard title="Generate App Blueprint" accent={GOLD} className="mb-5">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[
              { key: 'app_name', label: 'App Name *', rows: 1 },
              { key: 'product_type', label: 'Product Type', rows: 1 },
              { key: 'app_idea', label: 'App Idea / Description *', rows: 3 },
              { key: 'target_users', label: 'Target Users', rows: 2 },
              { key: 'desired_features', label: 'Desired Features', rows: 3 },
              { key: 'existing_app_context', label: 'Existing App Context (if adding to existing app)', rows: 3 },
            ].map(({ key, label, rows }) => (
              <div key={key} style={{ gridColumn: rows > 1 ? 'span 2' : 'span 1' }}>
                <label style={{ fontSize: 10, color: '#4B5563', display: 'block', marginBottom: 4, fontFamily: 'sans-serif' }}>{label}</label>
                {rows === 1 ? (
                  <input value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    style={{ width: '100%', background: '#080812', border: '1px solid #1E293B', borderRadius: 6, padding: '8px 12px', color: '#CBD5E1', fontSize: 12, fontFamily: 'sans-serif', outline: 'none', boxSizing: 'border-box' }} />
                ) : (
                  <textarea value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} rows={rows}
                    style={{ width: '100%', background: '#080812', border: '1px solid #1E293B', borderRadius: 6, padding: '8px 12px', color: '#CBD5E1', fontSize: 12, resize: 'vertical', fontFamily: 'sans-serif', outline: 'none', boxSizing: 'border-box' }} />
                )}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
            <ForgeButton icon={Hammer} loading={generating} onClick={() => generateMutation.mutate(form)} disabled={!form.app_name || !form.app_idea}>Generate Blueprint</ForgeButton>
            <ForgeButton variant="ghost" onClick={() => setShowNew(false)}>Cancel</ForgeButton>
          </div>
        </ForgeCard>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 20 }}>
        <ForgeCard title="Blueprints">
          {isLoading ? <p style={{ color: '#4B5563', fontSize: 12 }}>Loading...</p> : blueprints.length === 0 ? (
            <p style={{ color: '#374151', fontSize: 12 }}>No blueprints yet.</p>
          ) : blueprints.map(b => (
            <div key={b.id} onClick={() => setSelected(b)}
              style={{ padding: '10px 12px', borderRadius: 8, cursor: 'pointer', marginBottom: 4, background: selected?.id === b.id ? '#C9A84C11' : 'transparent', border: `1px solid ${selected?.id === b.id ? GOLD + '44' : 'transparent'}`, transition: 'all 0.15s' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: selected?.id === b.id ? GOLD : '#CBD5E1', fontFamily: 'sans-serif' }}>{b.app_name}</div>
              <div style={{ marginTop: 4, display: 'flex', gap: 6 }}>
                <ForgeBadge label={b.status} />
                {b.complexity_score && <span style={{ fontSize: 10, color: '#4B5563', fontFamily: 'sans-serif' }}>Complexity: {b.complexity_score}/10</span>}
              </div>
            </div>
          ))}
        </ForgeCard>

        <div>
          {!selected ? (
            <ForgeCard><p style={{ color: '#4B5563', fontSize: 13, textAlign: 'center', padding: '40px 0' }}>Select a blueprint</p></ForgeCard>
          ) : (
            <ForgeCard
              title={selected.app_name}
              actions={
                <div style={{ display: 'flex', gap: 8 }}>
                  <ForgeButton variant="ghost" size="sm" icon={Download} onClick={() => exportMarkdown(selected)}>Export MD</ForgeButton>
                  <ForgeButton variant="danger" size="sm" icon={Trash2} onClick={() => { if (confirm('Delete blueprint?')) deleteMutation.mutate(selected.id); }}>Delete</ForgeButton>
                </div>
              }
            >
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <ForgeBadge label={selected.status} />
                {selected.current_phase && <ForgeBadge label={selected.current_phase} />}
              </div>
              {[
                { label: 'Purpose', value: selected.app_purpose },
                { label: 'Problem Statement', value: selected.problem_statement },
                { label: 'Core Features', value: selected.core_features },
                { label: 'User Roles', value: selected.user_roles },
                { label: 'Navigation', value: selected.navigation_structure },
                { label: 'Entities', value: selected.entities_summary },
                { label: 'Pages', value: selected.pages_summary },
                { label: 'Backend Functions', value: selected.backend_functions_summary },
                { label: 'Build Phases', value: selected.build_phases },
                { label: 'Demo Data Plan', value: selected.demo_data_plan },
                { label: 'QA Plan', value: selected.qa_plan },
              ].map(({ label, value }) => value && (
                <div key={label} style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 10, color: '#4B5563', marginBottom: 4, fontFamily: 'sans-serif', letterSpacing: 2, textTransform: 'uppercase' }}>{label}</div>
                  <div style={{ fontSize: 12, color: '#94A3B8', lineHeight: 1.8, whiteSpace: 'pre-wrap', fontFamily: 'sans-serif' }}>{value}</div>
                </div>
              ))}
            </ForgeCard>
          )}
        </div>
      </div>
    </ForgeLayout>
  );
}