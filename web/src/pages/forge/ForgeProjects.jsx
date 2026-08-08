import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Trash2, FolderOpen } from 'lucide-react';
import ForgeLayout from '@/components/forge/ForgeLayout';
import ForgeCard from '@/components/forge/ForgeCard';
import ForgeButton from '@/components/forge/ForgeButton';
import ForgeBadge from '@/components/forge/ForgeBadge';
import { toast } from 'sonner';

const PROJECT_TYPES = ['App', 'Landing Page', 'SaaS', 'Content Engine', 'AI Agent', 'Internal Tool', 'Spiritual Platform', 'Security Platform', 'Ecommerce', 'Education', 'Other'];
const STAGES = ['Idea', 'Planning', 'Building', 'QA', 'Launch Ready', 'Live', 'Paused', 'Archived'];
const PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'];
const GOLD = '#C9A84C';

const STAGE_COLORS = { Idea: '#6B7280', Planning: '#3B82F6', Building: GOLD, QA: '#8B5CF6', 'Launch Ready': '#10B981', Live: '#10B981', Paused: '#F59E0B', Archived: '#374151' };

export default function ForgeProjects() {
  const [showNew, setShowNew] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', brand: '', description: '', project_type: 'App', stage: 'Idea', priority: 'Medium', target_audience: '', core_offer: '', brand_voice: '', status: 'Active' });
  const qc = useQueryClient();

  const { data: projects = [], isLoading } = useQuery({ queryKey: ['riley-projects-all'], queryFn: () => base44.entities.RileyProject.list('-updated_date', 50) });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.RileyProject.create(data),
    onSuccess: () => { qc.invalidateQueries(['riley-projects-all', 'riley-projects']); setShowNew(false); setForm({ name: '', brand: '', description: '', project_type: 'App', stage: 'Idea', priority: 'Medium', target_audience: '', core_offer: '', brand_voice: '', status: 'Active' }); toast.success('Project created'); }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.RileyProject.update(id, data),
    onSuccess: () => { qc.invalidateQueries(['riley-projects-all', 'riley-projects']); setEditing(null); toast.success('Updated'); }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.RileyProject.delete(id),
    onSuccess: () => { qc.invalidateQueries(['riley-projects-all', 'riley-projects']); toast.success('Deleted'); }
  });

  const formFields = [
    { key: 'name', label: 'Project Name *', type: 'input' },
    { key: 'brand', label: 'Brand Name', type: 'input' },
    { key: 'project_type', label: 'Type', type: 'select', options: PROJECT_TYPES },
    { key: 'stage', label: 'Stage', type: 'select', options: STAGES },
    { key: 'priority', label: 'Priority', type: 'select', options: PRIORITIES },
    { key: 'description', label: 'Description', type: 'textarea', rows: 3 },
    { key: 'target_audience', label: 'Target Audience', type: 'textarea', rows: 2 },
    { key: 'core_offer', label: 'Core Offer', type: 'textarea', rows: 2 },
    { key: 'brand_voice', label: 'Brand Voice Notes', type: 'textarea', rows: 2 },
  ];

  const inputStyle = { width: '100%', background: '#080812', border: '1px solid #1E293B', borderRadius: 6, padding: '8px 12px', color: '#CBD5E1', fontSize: 12, fontFamily: 'sans-serif', outline: 'none', boxSizing: 'border-box' };

  const renderField = (f, values, setValues) => (
    <div key={f.key} style={{ gridColumn: f.type === 'input' ? 'span 1' : 'span 2' }}>
      <label style={{ fontSize: 10, color: '#4B5563', display: 'block', marginBottom: 4, fontFamily: 'sans-serif' }}>{f.label}</label>
      {f.type === 'input' ? (
        <input value={values[f.key] || ''} onChange={e => setValues(v => ({ ...v, [f.key]: e.target.value }))} style={inputStyle} />
      ) : f.type === 'select' ? (
        <select value={values[f.key] || ''} onChange={e => setValues(v => ({ ...v, [f.key]: e.target.value }))} style={inputStyle}>
          {f.options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <textarea value={values[f.key] || ''} onChange={e => setValues(v => ({ ...v, [f.key]: e.target.value }))} rows={f.rows}
          style={{ ...inputStyle, resize: 'vertical', minHeight: f.rows * 28 }} />
      )}
    </div>
  );

  return (
    <ForgeLayout
      title="Projects"
      subtitle="All Riley Forge projects"
      actions={<ForgeButton icon={Plus} onClick={() => setShowNew(true)}>New Project</ForgeButton>}
    >
      {showNew && (
        <ForgeCard title="New Project" className="mb-5">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {formFields.map(f => renderField(f, form, setForm))}
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
            <ForgeButton icon={FolderOpen} loading={createMutation.isPending} onClick={() => createMutation.mutate(form)} disabled={!form.name}>Create Project</ForgeButton>
            <ForgeButton variant="ghost" onClick={() => setShowNew(false)}>Cancel</ForgeButton>
          </div>
        </ForgeCard>
      )}

      {isLoading ? <p style={{ color: '#4B5563', fontSize: 13, fontFamily: 'sans-serif' }}>Loading projects...</p>
        : projects.length === 0 ? <p style={{ color: '#374151', fontSize: 13, fontFamily: 'sans-serif' }}>No projects yet. Add your first project.</p>
        : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
            {projects.map(p => (
              <div key={p.id} style={{ background: '#0B0B18', border: `1px solid ${STAGE_COLORS[p.stage] || '#1E1E35'}33`, borderRadius: 12, padding: 20, borderLeft: `3px solid ${STAGE_COLORS[p.stage] || '#1E1E35'}` }}>
                {editing?.id === p.id ? (
                  <div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                      {formFields.map(f => renderField(f, editing, setEditing))}
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <ForgeButton size="sm" loading={updateMutation.isPending} onClick={() => updateMutation.mutate({ id: p.id, data: editing })}>Save</ForgeButton>
                      <ForgeButton variant="ghost" size="sm" onClick={() => setEditing(null)}>Cancel</ForgeButton>
                    </div>
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#E2E8F0', fontFamily: 'sans-serif' }}>{p.name}</div>
                        {p.brand && <div style={{ fontSize: 11, color: GOLD, fontFamily: 'sans-serif', marginTop: 2 }}>{p.brand}</div>}
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <ForgeButton variant="ghost" size="sm" icon={Edit2} onClick={() => setEditing({ ...p })} />
                        <ForgeButton variant="danger" size="sm" icon={Trash2} onClick={() => { if (confirm(`Delete "${p.name}"?`)) deleteMutation.mutate(p.id); }} />
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                      <ForgeBadge label={p.stage} />
                      <ForgeBadge label={p.priority} />
                      {p.project_type && <span style={{ fontSize: 10, color: '#4B5563', fontFamily: 'sans-serif', alignSelf: 'center' }}>{p.project_type}</span>}
                    </div>
                    {p.description && <p style={{ fontSize: 12, color: '#64748B', lineHeight: 1.6, margin: 0, fontFamily: 'sans-serif' }}>{p.description}</p>}
                    {p.core_offer && <p style={{ fontSize: 11, color: '#4B5563', margin: '8px 0 0', fontFamily: 'sans-serif' }}>Offer: {p.core_offer}</p>}
                    {p.next_actions && <div style={{ marginTop: 10, background: '#080812', borderRadius: 6, padding: '8px 12px', fontSize: 11, color: '#3B82F6', fontFamily: 'sans-serif', lineHeight: 1.6 }}>{p.next_actions}</div>}
                  </>
                )}
              </div>
            ))}
          </div>
        )
      }
    </ForgeLayout>
  );
}