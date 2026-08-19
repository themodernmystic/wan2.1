import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Copy, Zap, AlertTriangle, ChevronDown, ChevronUp, Check } from 'lucide-react';
import ForgeLayout from '@/components/forge/ForgeLayout';
import ForgeCard from '@/components/forge/ForgeCard';
import ForgeButton from '@/components/forge/ForgeButton';
import ForgeBadge from '@/components/forge/ForgeBadge';
import { toast } from 'sonner';

const GOLD = '#C9A84C';

export default function BuilderConsole() {
  const [selectedBuild, setSelectedBuild] = useState(null);
  const [showPromptGen, setShowPromptGen] = useState(false);
  const [showScopeAudit, setShowScopeAudit] = useState(false);
  const [promptForm, setPromptForm] = useState({ next_desired_module: '', last_builder_response: '', known_errors: '', existing_app_context: '' });
  const [scopeForm, setScopeForm] = useState({ requested_change: '', current_app_context: '' });
  const [generatedPrompt, setGeneratedPrompt] = useState(null);
  const [scopeResult, setScopeResult] = useState(null);
  const [builderResponse, setBuilderResponse] = useState('');
  const qc = useQueryClient();

  const { data: builds = [], isLoading } = useQuery({ queryKey: ['app-builds-all'], queryFn: () => base44.entities.AppBuild.list('-updated_date', 20) });
  const { data: projects = [] } = useQuery({ queryKey: ['riley-projects-all'], queryFn: () => base44.entities.RileyProject.list('-updated_date', 30) });
  const { data: readyPrompts = [] } = useQuery({
    queryKey: ['prompts-for-build', selectedBuild?.id],
    queryFn: () => selectedBuild ? base44.entities.BuilderPrompt.filter({ app_build_id: selectedBuild.id }, '-created_date', 10) : Promise.resolve([]),
    enabled: !!selectedBuild
  });

  const genPromptMutation = useMutation({
    mutationFn: (data) => base44.functions.invoke('rileyGenerateNextBase44Prompt', data),
    onSuccess: (res) => { setGeneratedPrompt(res.data?.builderPrompt); qc.invalidateQueries(['prompts-for-build']); toast.success('Prompt generated'); },
  });

  const auditMutation = useMutation({
    mutationFn: (data) => base44.functions.invoke('rileyAuditScopeConflict', data),
    onSuccess: (res) => { setScopeResult(res.data?.result); toast.success('Scope audit complete'); },
  });

  const saveResponseMutation = useMutation({
    mutationFn: ({ id, response }) => base44.entities.BuilderPrompt.update(id, { builder_response: response, status: 'Succeeded' }),
    onSuccess: () => { qc.invalidateQueries(['prompts-for-build']); toast.success('Response saved'); setBuilderResponse(''); },
  });

  const copyText = (text) => { navigator.clipboard.writeText(text); toast.success('Copied to clipboard'); };

  const build = selectedBuild;
  const project = build ? projects.find(p => p.id === build.project_id) : null;

  return (
    <ForgeLayout title="Builder Console" subtitle="Manage app builds · Generate prompts · Track progress">
      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 20 }}>
        {/* Build list */}
        <ForgeCard title="App Builds">
          {isLoading ? <p style={{ color: '#4B5563', fontSize: 12 }}>Loading...</p> : builds.length === 0 ? (
            <p style={{ color: '#374151', fontSize: 12 }}>No builds yet. Create a blueprint first.</p>
          ) : builds.map(b => (
            <div key={b.id}
              onClick={() => setSelectedBuild(b)}
              style={{ padding: '10px 12px', borderRadius: 8, cursor: 'pointer', marginBottom: 4, background: selectedBuild?.id === b.id ? '#C9A84C11' : 'transparent', border: `1px solid ${selectedBuild?.id === b.id ? GOLD + '44' : 'transparent'}`, transition: 'all 0.15s' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: selectedBuild?.id === b.id ? GOLD : '#CBD5E1' }}>{b.app_name}</div>
              <div style={{ marginTop: 4 }}><ForgeBadge label={b.status} /></div>
            </div>
          ))}
        </ForgeCard>

        {/* Build detail */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {!build ? (
            <ForgeCard>
              <p style={{ color: '#4B5563', fontSize: 13, textAlign: 'center', padding: '40px 0' }}>Select a build to view details</p>
            </ForgeCard>
          ) : (
            <>
              <ForgeCard
                title={build.app_name}
                actions={
                  <div style={{ display: 'flex', gap: 8 }}>
                    <ForgeBadge label={build.status} />
                    {build.build_phase && <ForgeBadge label={build.build_phase} />}
                  </div>
                }
              >
                {project && <p style={{ fontSize: 11, color: '#C9A84C77', marginBottom: 12, fontFamily: 'sans-serif' }}>Project: {project.name}</p>}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {[
                    { label: 'Pages Planned', value: build.pages_planned },
                    { label: 'Pages Created', value: build.pages_created },
                    { label: 'Entities Planned', value: build.entities_planned },
                    { label: 'Entities Created', value: build.entities_created },
                  ].map(({ label, value }) => (
                    <div key={label} style={{ background: '#080812', borderRadius: 8, padding: '10px 14px' }}>
                      <div style={{ fontSize: 10, color: '#4B5563', marginBottom: 4, fontFamily: 'sans-serif' }}>{label}</div>
                      <div style={{ fontSize: 12, color: '#94A3B8', fontFamily: 'sans-serif' }}>{value || '—'}</div>
                    </div>
                  ))}
                </div>
                {build.current_scope && (
                  <div style={{ marginTop: 14, background: '#080812', borderRadius: 8, padding: '12px 14px' }}>
                    <div style={{ fontSize: 10, color: '#4B5563', marginBottom: 6, fontFamily: 'sans-serif' }}>CURRENT SCOPE</div>
                    <div style={{ fontSize: 12, color: '#94A3B8', fontFamily: 'sans-serif', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{build.current_scope}</div>
                  </div>
                )}
              </ForgeCard>

              {/* Generate Next Prompt */}
              <ForgeCard title="Generate Next Prompt" accent="#3B82F6">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[
                    { key: 'next_desired_module', label: 'Next module or feature to build', rows: 2 },
                    { key: 'known_errors', label: 'Known errors (optional)', rows: 2 },
                    { key: 'last_builder_response', label: 'Last builder response (optional)', rows: 3 },
                    { key: 'existing_app_context', label: 'Existing app context (optional)', rows: 3 },
                  ].map(({ key, label, rows }) => (
                    <div key={key}>
                      <label style={{ fontSize: 10, color: '#4B5563', display: 'block', marginBottom: 4, fontFamily: 'sans-serif' }}>{label}</label>
                      <textarea
                        value={promptForm[key]}
                        onChange={e => setPromptForm(f => ({ ...f, [key]: e.target.value }))}
                        rows={rows}
                        style={{ width: '100%', background: '#080812', border: '1px solid #1E293B', borderRadius: 6, padding: '8px 12px', color: '#CBD5E1', fontSize: 12, resize: 'vertical', fontFamily: 'sans-serif', outline: 'none', boxSizing: 'border-box' }}
                      />
                    </div>
                  ))}
                  <ForgeButton variant="blue" icon={Zap} loading={genPromptMutation.isPending}
                    onClick={() => genPromptMutation.mutate({ app_build_id: build.id, ...promptForm })}>
                    Generate Prompt
                  </ForgeButton>
                </div>

                {generatedPrompt && (
                  <div style={{ marginTop: 16, background: '#080812', border: '1px solid #1E293B', borderRadius: 8, padding: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <span style={{ fontSize: 11, color: '#3B82F6', fontFamily: 'sans-serif', fontWeight: 600 }}>{generatedPrompt.prompt_title}</span>
                      <ForgeButton variant="ghost" size="sm" icon={Copy} onClick={() => copyText(generatedPrompt.prompt_body)}>Copy</ForgeButton>
                    </div>
                    <pre style={{ fontSize: 11, color: '#94A3B8', whiteSpace: 'pre-wrap', lineHeight: 1.8, margin: 0, fontFamily: 'monospace' }}>{generatedPrompt.prompt_body}</pre>

                    <div style={{ marginTop: 14 }}>
                      <label style={{ fontSize: 10, color: '#4B5563', display: 'block', marginBottom: 4, fontFamily: 'sans-serif' }}>Paste builder response after running this prompt</label>
                      <textarea value={builderResponse} onChange={e => setBuilderResponse(e.target.value)} rows={3}
                        style={{ width: '100%', background: '#0B0B18', border: '1px solid #1E293B', borderRadius: 6, padding: '8px 12px', color: '#CBD5E1', fontSize: 12, resize: 'vertical', fontFamily: 'sans-serif', outline: 'none', boxSizing: 'border-box' }}
                      />
                      <ForgeButton variant="green" size="sm" icon={Check}
                        onClick={() => saveResponseMutation.mutate({ id: generatedPrompt.id, response: builderResponse })}
                        disabled={!builderResponse.trim()}>
                        Mark Succeeded
                      </ForgeButton>
                    </div>
                  </div>
                )}
              </ForgeCard>

              {/* Scope Audit */}
              <ForgeCard title="Scope Conflict Audit" accent="#F59E0B">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 10, color: '#4B5563', display: 'block', marginBottom: 4, fontFamily: 'sans-serif' }}>Requested change</label>
                    <textarea value={scopeForm.requested_change} onChange={e => setScopeForm(f => ({ ...f, requested_change: e.target.value }))} rows={3}
                      style={{ width: '100%', background: '#080812', border: '1px solid #1E293B', borderRadius: 6, padding: '8px 12px', color: '#CBD5E1', fontSize: 12, resize: 'vertical', fontFamily: 'sans-serif', outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 10, color: '#4B5563', display: 'block', marginBottom: 4, fontFamily: 'sans-serif' }}>Current app context</label>
                    <textarea value={scopeForm.current_app_context} onChange={e => setScopeForm(f => ({ ...f, current_app_context: e.target.value }))} rows={3}
                      style={{ width: '100%', background: '#080812', border: '1px solid #1E293B', borderRadius: 6, padding: '8px 12px', color: '#CBD5E1', fontSize: 12, resize: 'vertical', fontFamily: 'sans-serif', outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>
                  <ForgeButton variant="gold" icon={AlertTriangle} loading={auditMutation.isPending}
                    onClick={() => auditMutation.mutate({ ...scopeForm, project_id: build.project_id, app_build_id: build.id })}>
                    Audit Scope
                  </ForgeButton>
                </div>
                {scopeResult && (
                  <div style={{ marginTop: 16, background: '#080812', borderRadius: 8, padding: 16, border: '1px solid #1E293B' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                      <span style={{ fontSize: 11, color: '#4B5563', fontFamily: 'sans-serif' }}>Conflict Level:</span>
                      <ForgeBadge label={scopeResult.conflict_level} />
                    </div>
                    {[
                      { label: 'Summary', value: scopeResult.conflict_summary },
                      { label: 'Overwrite Risk', value: scopeResult.overwrite_risk },
                      { label: 'Recommendation', value: scopeResult.recommendation },
                      { label: 'Safe Build Path', value: scopeResult.safe_build_path },
                    ].map(({ label, value }) => value && (
                      <div key={label} style={{ marginBottom: 10 }}>
                        <div style={{ fontSize: 10, color: '#4B5563', marginBottom: 3, fontFamily: 'sans-serif' }}>{label.toUpperCase()}</div>
                        <div style={{ fontSize: 12, color: '#94A3B8', lineHeight: 1.7, fontFamily: 'sans-serif' }}>{value}</div>
                      </div>
                    ))}
                  </div>
                )}
              </ForgeCard>

              {/* Past Prompts */}
              {readyPrompts.length > 0 && (
                <ForgeCard title="Prompt History" accent="#6B7280">
                  {readyPrompts.map(p => (
                    <div key={p.id} style={{ padding: '10px 0', borderBottom: '1px solid #111827', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                      <div>
                        <div style={{ fontSize: 12, color: '#CBD5E1', fontFamily: 'sans-serif', fontWeight: 500 }}>{p.prompt_title}</div>
                        <div style={{ marginTop: 4 }}><ForgeBadge label={p.status} /></div>
                      </div>
                      <ForgeButton variant="ghost" size="sm" icon={Copy} onClick={() => copyText(p.prompt_body)}>Copy</ForgeButton>
                    </div>
                  ))}
                </ForgeCard>
              )}
            </>
          )}
        </div>
      </div>
    </ForgeLayout>
  );
}