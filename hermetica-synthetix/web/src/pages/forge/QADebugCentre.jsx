import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bug, CheckSquare, Copy, Plus, Zap } from 'lucide-react';
import ForgeLayout from '@/components/forge/ForgeLayout';
import ForgeCard from '@/components/forge/ForgeCard';
import ForgeButton from '@/components/forge/ForgeButton';
import ForgeBadge from '@/components/forge/ForgeBadge';
import { toast } from 'sonner';

const TABS = ['Debug Issues', 'QA Reviews'];
const GOLD = '#C9A84C';

export default function QADebugCentre() {
  const [tab, setTab] = useState('Debug Issues');
  const [debugForm, setDebugForm] = useState({ error_message: '', affected_page: '', affected_component: '', affected_function: '', last_prompt: '', app_context: '' });
  const [qaForm, setQaForm] = useState({ current_known_state: '' });
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [generatingDebug, setGeneratingDebug] = useState(false);
  const [generatingQA, setGeneratingQA] = useState(false);
  const qc = useQueryClient();

  const { data: issues = [], isLoading: issuesLoading } = useQuery({ queryKey: ['debug-issues'], queryFn: () => base44.entities.DebugIssue.list('-created_date', 30) });
  const { data: qaReviews = [], isLoading: qaLoading } = useQuery({ queryKey: ['qa-reviews'], queryFn: () => base44.entities.QAReview.list('-created_date', 20) });

  const updateIssueMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.DebugIssue.update(id, data),
    onSuccess: () => {qc.invalidateQueries(['debug-issues']);toast.success('Updated');}
  });

  const debugMutation = useMutation({
    mutationFn: async (data) => {setGeneratingDebug(true);const res = await base44.functions.invoke('rileyDebugBuilderError', data);return res;},
    onSuccess: (res) => {qc.invalidateQueries(['debug-issues']);setSelectedIssue(res.data?.issue);setGeneratingDebug(false);toast.success('Debug issue created');},
    onError: () => setGeneratingDebug(false)
  });

  const qaMutation = useMutation({
    mutationFn: async (data) => {setGeneratingQA(true);const res = await base44.functions.invoke('rileyRunQAReview', data);return res;},
    onSuccess: () => {qc.invalidateQueries(['qa-reviews']);setGeneratingQA(false);toast.success('QA review complete');},
    onError: () => setGeneratingQA(false)
  });

  const copyText = (text) => {navigator.clipboard.writeText(text);toast.success('Copied');};

  const statusColors = { New: '#EF4444', Diagnosing: '#F59E0B', 'Fix Prompt Ready': '#3B82F6', Testing: '#8B5CF6', Fixed: '#10B981', "Won't Fix": '#4B5563', Archived: '#374151' };

  const qaScoreColor = (score) => score >= 80 ? '#10B981' : score >= 60 ? '#F59E0B' : '#EF4444';

  return (
    <ForgeLayout title="QA / Debug Centre" subtitle="Debug issues · QA reviews · Fix prompts">
      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: '#0B0B18', borderRadius: 10, padding: 4, width: 'fit-content', border: '1px solid #1E1E35' }}>
        {TABS.map((t) =>
        <button key={t} onClick={() => setTab(t)}
        style={{ padding: '8px 20px', borderRadius: 7, fontSize: 12, fontFamily: 'sans-serif', fontWeight: 600, cursor: 'pointer', border: 'none', background: tab === t ? '#1E293B' : 'transparent', color: tab === t ? '#CBD5E1' : '#4B5563', transition: 'all 0.15s' }}>
            {t}
          </button>
        )}
      </div>

      {tab === 'Debug Issues' &&
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {/* Debug intake */}
          <ForgeCard title="Debug Error Intake" accent="#EF4444">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }} className="bg-[#47f1fa] text-[#ffdbdb]">
              {[
            { key: 'error_message', label: 'Error message / Console output *', rows: 4 },
            { key: 'affected_page', label: 'Affected page', rows: 1 },
            { key: 'affected_component', label: 'Affected component', rows: 1 },
            { key: 'affected_function', label: 'Affected function', rows: 1 },
            { key: 'last_prompt', label: 'Last prompt used', rows: 2 },
            { key: 'app_context', label: 'App context', rows: 2 }].
            map(({ key, label, rows }) =>
            <div key={key}>
                  <label style={{ fontSize: 10, color: '#4B5563', display: 'block', marginBottom: 4, fontFamily: 'sans-serif' }}>{label}</label>
                  {rows === 1 ?
              <input value={debugForm[key]} onChange={(e) => setDebugForm((f) => ({ ...f, [key]: e.target.value }))}
              style={{ width: '100%', background: '#080812', border: '1px solid #1E293B', borderRadius: 6, padding: '8px 12px', color: '#CBD5E1', fontSize: 12, fontFamily: 'sans-serif', outline: 'none', boxSizing: 'border-box' }} /> :

              <textarea value={debugForm[key]} onChange={(e) => setDebugForm((f) => ({ ...f, [key]: e.target.value }))} rows={rows}
              style={{ width: '100%', background: '#080812', border: '1px solid #1E293B', borderRadius: 6, padding: '8px 12px', color: '#CBD5E1', fontSize: 12, resize: 'vertical', fontFamily: 'sans-serif', outline: 'none', boxSizing: 'border-box' }} />
              }
                </div>
            )}
              <ForgeButton variant="red" icon={Bug} loading={generatingDebug}
            onClick={() => debugMutation.mutate(debugForm)} disabled={!debugForm.error_message}>
                Diagnose Error
              </ForgeButton>
            </div>

            {selectedIssue &&
          <div style={{ marginTop: 16, background: '#080812', border: '1px solid #7F1D1D', borderRadius: 8, padding: 16 }}>
                <div style={{ fontSize: 11, color: '#EF4444', marginBottom: 10, fontFamily: 'sans-serif', fontWeight: 600 }}>DIAGNOSIS RESULT</div>
                {[
            { label: 'Suspected Cause', value: selectedIssue.suspected_cause },
            { label: 'Regression Risk', value: selectedIssue.regression_risk }].
            map(({ label, value }) => value &&
            <div key={label} style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 10, color: '#4B5563', marginBottom: 3, fontFamily: 'sans-serif' }}>{label.toUpperCase()}</div>
                    <div style={{ fontSize: 12, color: '#94A3B8', lineHeight: 1.7, fontFamily: 'sans-serif' }}>{value}</div>
                  </div>
            )}
                {selectedIssue.fix_prompt &&
            <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <div style={{ fontSize: 10, color: '#4B5563', fontFamily: 'sans-serif' }}>FIX PROMPT</div>
                      <ForgeButton variant="ghost" size="sm" icon={Copy} onClick={() => copyText(selectedIssue.fix_prompt)}>Copy</ForgeButton>
                    </div>
                    <pre style={{ fontSize: 11, color: '#CBD5E1', whiteSpace: 'pre-wrap', background: '#0B0B18', padding: 12, borderRadius: 6, lineHeight: 1.7, margin: 0, fontFamily: 'monospace' }}>{selectedIssue.fix_prompt}</pre>
                  </div>
            }
              </div>
          }
          </ForgeCard>

          {/* Issue list */}
          <ForgeCard title="All Issues" accent="#4B5563">
            {issuesLoading ? <p style={{ color: '#4B5563', fontSize: 12 }}>Loading...</p> : issues.length === 0 ?
          <p style={{ color: '#374151', fontSize: 12 }}>No issues. Clean build.</p> :
          issues.map((i) =>
          <div key={i.id} style={{ padding: '10px 0', borderBottom: '1px solid #111827' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                  <div style={{ fontSize: 12, color: '#CBD5E1', fontFamily: 'sans-serif', fontWeight: 500, flex: 1, paddingRight: 10 }}>{i.title}</div>
                  <ForgeBadge label={i.status} />
                </div>
                {i.affected_page && <div style={{ fontSize: 10, color: '#4B5563', fontFamily: 'sans-serif' }}>Page: {i.affected_page}</div>}
                <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                  {i.fix_prompt && <ForgeButton variant="ghost" size="sm" icon={Copy} onClick={() => copyText(i.fix_prompt)}>Fix Prompt</ForgeButton>}
                  {i.status !== 'Fixed' &&
              <ForgeButton variant="ghost" size="sm" onClick={() => updateIssueMutation.mutate({ id: i.id, data: { status: 'Fixed' } })}>Mark Fixed</ForgeButton>
              }
                </div>
              </div>
          )}
          </ForgeCard>
        </div>
      }

      {tab === 'QA Reviews' &&
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <ForgeCard title="Run QA Review" accent="#10B981">
            <label style={{ fontSize: 10, color: '#4B5563', display: 'block', marginBottom: 4, fontFamily: 'sans-serif' }}>Current app state / known context</label>
            <textarea value={qaForm.current_known_state} onChange={(e) => setQaForm({ current_known_state: e.target.value })} rows={6} placeholder="Describe what pages, entities, and functions exist in the app right now..."
          style={{ width: '100%', background: '#080812', border: '1px solid #1E293B', borderRadius: 6, padding: '8px 12px', color: '#CBD5E1', fontSize: 12, resize: 'vertical', fontFamily: 'sans-serif', outline: 'none', boxSizing: 'border-box', marginBottom: 12 }} />
            <ForgeButton icon={CheckSquare} variant="green" loading={generatingQA}
          onClick={() => qaMutation.mutate(qaForm)} disabled={!qaForm.current_known_state}>
              Run QA Review
            </ForgeButton>
          </ForgeCard>

          <ForgeCard title="QA Review History" accent="#10B981">
            {qaLoading ? <p style={{ color: '#4B5563', fontSize: 12 }}>Loading...</p> : qaReviews.length === 0 ?
          <p style={{ color: '#374151', fontSize: 12 }}>No QA reviews yet.</p> :
          qaReviews.map((r) =>
          <div key={r.id} style={{ padding: '12px 0', borderBottom: '1px solid #111827' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ fontSize: 12, color: '#CBD5E1', fontFamily: 'sans-serif', fontWeight: 500 }}>{r.title}</div>
                  {r.final_score != null &&
              <span style={{ fontSize: 14, fontWeight: 700, color: qaScoreColor(r.final_score), fontFamily: 'sans-serif' }}>{r.final_score}/100</span>
              }
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
                  {[
              { label: 'Frontend', value: r.frontend_status },
              { label: 'Backend', value: r.backend_status },
              { label: 'Entities', value: r.entity_status },
              { label: 'Navigation', value: r.navigation_status },
              { label: 'Forms', value: r.form_validation_status },
              { label: 'Security', value: r.security_status }].
              map(({ label, value }) =>
              <div key={label} style={{ fontSize: 10, fontFamily: 'sans-serif', color: '#4B5563' }}>
                      {label}: <ForgeBadge label={value || 'Not Tested'} size="xs" />
                    </div>
              )}
                </div>
                {r.recommendations && <div style={{ marginTop: 8, fontSize: 11, color: '#64748B', fontFamily: 'sans-serif', lineHeight: 1.6 }}>{r.recommendations}</div>}
              </div>
          )}
          </ForgeCard>
        </div>
      }
    </ForgeLayout>);

}