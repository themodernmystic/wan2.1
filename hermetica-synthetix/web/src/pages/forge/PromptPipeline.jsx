import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Copy, Check, X, Plus, Filter } from 'lucide-react';
import ForgeLayout from '@/components/forge/ForgeLayout';
import ForgeCard from '@/components/forge/ForgeCard';
import ForgeButton from '@/components/forge/ForgeButton';
import ForgeBadge from '@/components/forge/ForgeBadge';
import { toast } from 'sonner';

const STATUSES = ['All', 'Draft', 'Ready', 'Pasted', 'Succeeded', 'Failed', 'Superseded', 'Archived'];
const GOLD = '#C9A84C';

export default function PromptPipeline() {
  const [filterStatus, setFilterStatus] = useState('All');
  const [selected, setSelected] = useState(null);
  const [builderResponse, setBuilderResponse] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newPrompt, setNewPrompt] = useState({ prompt_title: '', prompt_body: '', phase: '', purpose: '' });
  const qc = useQueryClient();

  const { data: prompts = [], isLoading } = useQuery({ queryKey: ['all-prompts'], queryFn: () => base44.entities.BuilderPrompt.list('-created_date', 50) });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.BuilderPrompt.update(id, data),
    onSuccess: () => {qc.invalidateQueries(['all-prompts']);toast.success('Updated');setBuilderResponse('');}
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.BuilderPrompt.create({ ...data, status: 'Draft', copy_ready: false }),
    onSuccess: () => {qc.invalidateQueries(['all-prompts']);setShowCreate(false);setNewPrompt({ prompt_title: '', prompt_body: '', phase: '', purpose: '' });toast.success('Prompt created');}
  });

  const copyPrompt = (text) => {navigator.clipboard.writeText(text);toast.success('Prompt copied');};

  const filtered = filterStatus === 'All' ? prompts : prompts.filter((p) => p.status === filterStatus);

  return (
    <ForgeLayout
      title="Prompt Pipeline"
      subtitle="Track all Base44 builder prompts · Copy · Save responses"
      actions={<ForgeButton icon={Plus} onClick={() => setShowCreate(true)}>New Prompt</ForgeButton>}>
      
      {showCreate &&
      <ForgeCard title="Create Prompt" className="mb-5">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
          { key: 'prompt_title', label: 'Title *', rows: 1 },
          { key: 'phase', label: 'Phase (e.g. Phase 1)', rows: 1 },
          { key: 'purpose', label: 'Purpose', rows: 2 },
          { key: 'prompt_body', label: 'Prompt Body *', rows: 8 }].
          map(({ key, label, rows }) =>
          <div key={key}>
                
                {rows === 1 ?
            <input value={newPrompt[key]} onChange={(e) => setNewPrompt((p) => ({ ...p, [key]: e.target.value }))}
            style={{ width: '100%', background: '#d9e5fd', border: '1px solid #d9e5fd', borderRadius: 6, padding: '8px 12px', color: '#8cc0ff', fontSize: 12, fontFamily: 'sans-serif', outline: 'none', boxSizing: 'border-box' }} /> :

            <textarea value={newPrompt[key]} onChange={(e) => setNewPrompt((p) => ({ ...p, [key]: e.target.value }))} rows={rows}
            style={{ width: '100%', background: '#d9e5fd', border: '1px solid #d9e5fd', borderRadius: 6, padding: '8px 12px', color: '#8cc0ff', fontSize: 12, resize: 'vertical', fontFamily: 'sans-serif', outline: 'none', boxSizing: 'border-box' }} />
            }
              </div>
          )}
            <div style={{ display: 'flex', gap: 10 }}>
              <ForgeButton onClick={() => createMutation.mutate(newPrompt)} disabled={!newPrompt.prompt_title || !newPrompt.prompt_body} loading={createMutation.isPending}>Create</ForgeButton>
              <ForgeButton variant="ghost" onClick={() => setShowCreate(false)}>Cancel</ForgeButton>
            </div>
          </div>
        </ForgeCard>
      }

      {/* Status filters */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
        {STATUSES.map((s) =>
        <button key={s} onClick={() => setFilterStatus(s)}
        style={{ padding: '5px 14px', borderRadius: 20, fontSize: 11, fontFamily: 'sans-serif', fontWeight: 600, cursor: 'pointer', border: `1px solid ${filterStatus === s ? GOLD : '#1E293B'}`, background: filterStatus === s ? '#C9A84C15' : 'transparent', color: filterStatus === s ? GOLD : '#4B5563', transition: 'all 0.15s' }}>
            {s}
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 20 }}>
        <ForgeCard title={`Prompts (${filtered.length})`}>
          {isLoading ? <p style={{ color: '#4B5563', fontSize: 12 }}>Loading...</p> : filtered.length === 0 ?
          <p style={{ color: '#374151', fontSize: 12 }}>No prompts in this status.</p> :
          filtered.map((p) =>
          <div key={p.id} onClick={() => {setSelected(p);setBuilderResponse(p.builder_response || '');}}
          style={{ padding: '10px 12px', borderRadius: 8, cursor: 'pointer', marginBottom: 4, background: selected?.id === p.id ? '#1E293B' : 'transparent', border: `1px solid ${selected?.id === p.id ? '#334155' : 'transparent'}`, transition: 'all 0.15s' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#CBD5E1', fontFamily: 'sans-serif', marginBottom: 4 }}>{p.prompt_title}</div>
              <div style={{ display: 'flex', gap: 6 }}>
                <ForgeBadge label={p.status} />
                {p.phase && <span style={{ fontSize: 10, color: '#4B5563', fontFamily: 'sans-serif' }}>{p.phase}</span>}
              </div>
            </div>
          )}
        </ForgeCard>

        <div>
          {!selected ?
          <ForgeCard><p style={{ color: '#4B5563', fontSize: 13, textAlign: 'center', padding: '40px 0' }}>Select a prompt</p></ForgeCard> :

          <ForgeCard title={selected.prompt_title}
          actions={
          <div style={{ display: 'flex', gap: 8 }}>
                  <ForgeBadge label={selected.status} />
                  <ForgeButton variant="ghost" size="sm" icon={Copy} onClick={() => {copyPrompt(selected.prompt_body);updateMutation.mutate({ id: selected.id, data: { status: 'Pasted' } });}}>Copy & Mark Pasted</ForgeButton>
                </div>
          }>
            
              {selected.purpose && <p style={{ fontSize: 11, color: '#4B5563', marginBottom: 12, fontFamily: 'sans-serif' }}>{selected.purpose}</p>}
              <div style={{ background: '#080812', border: '1px solid #1E293B', borderRadius: 8, padding: 16, marginBottom: 16 }}>
                <pre style={{ fontSize: 12, color: '#CBD5E1', whiteSpace: 'pre-wrap', lineHeight: 1.8, margin: 0, fontFamily: 'monospace' }}>{selected.prompt_body}</pre>
              </div>

              {selected.expected_result &&
            <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 10, color: '#4B5563', marginBottom: 4, fontFamily: 'sans-serif', letterSpacing: 2 }}>EXPECTED RESULT</div>
                  <div style={{ fontSize: 12, color: '#64748B', lineHeight: 1.7, fontFamily: 'sans-serif' }}>{selected.expected_result}</div>
                </div>
            }

              <div>
                <label style={{ fontSize: 10, color: '#4B5563', display: 'block', marginBottom: 6, fontFamily: 'sans-serif' }}>BUILDER RESPONSE</label>
                <textarea value={builderResponse} onChange={(e) => setBuilderResponse(e.target.value)} rows={4} placeholder="Paste the builder's response here..."
              style={{ width: '100%', background: '#080812', border: '1px solid #1E293B', borderRadius: 6, padding: '8px 12px', color: '#CBD5E1', fontSize: 12, resize: 'vertical', fontFamily: 'sans-serif', outline: 'none', boxSizing: 'border-box' }} />
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <ForgeButton variant="green" size="sm" icon={Check}
                onClick={() => updateMutation.mutate({ id: selected.id, data: { builder_response: builderResponse, status: 'Succeeded' } })}
                disabled={!builderResponse.trim()} loading={updateMutation.isPending}>
                    Mark Succeeded
                  </ForgeButton>
                  <ForgeButton variant="danger" size="sm" icon={X}
                onClick={() => updateMutation.mutate({ id: selected.id, data: { builder_response: builderResponse, status: 'Failed' } })}
                disabled={!builderResponse.trim()}>
                    Mark Failed
                  </ForgeButton>
                </div>
              </div>
            </ForgeCard>
          }
        </div>
      </div>
    </ForgeLayout>);

}