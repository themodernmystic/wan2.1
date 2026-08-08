import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Image, Film, Globe, FileText, Bot, Megaphone, ShieldCheck, BarChart2, RefreshCw, CheckCircle, AlertCircle, Clock, Zap, Plus } from 'lucide-react';
import ForgeLayout from '@/components/forge/ForgeLayout';

const GOLD = '#C9A84C';
const BG_CARD = '#0E0E1C';
const BORDER = '#1E1E35';

const STATUS_COLOR = {
  completed: '#10B981', failed: '#EF4444', processing: '#3B82F6',
  queued: '#F59E0B', ready: '#10B981', approved: '#10B981',
  mock_placeholder: '#F59E0B', draft: '#6B7280', rejected: '#EF4444'
};

function MetricCard({ label, value, sub, color }) {
  return (
    <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '14px 18px' }}>
      <div style={{ fontSize: 24, fontWeight: 700, color: color || GOLD, fontFamily: 'sans-serif' }}>{value}</div>
      <div style={{ fontSize: 11, color: '#E2E8F0', fontFamily: 'sans-serif', marginTop: 2 }}>{label}</div>
      {sub && <div style={{ fontSize: 10, color: '#4B5563', fontFamily: 'sans-serif', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function QuickAction({ icon: IconComp, label, to, color, onClick }) {
  const Icon = IconComp;
  const inner = (
    <div style={{ background: BG_CARD, border: `1px solid ${color}33`, borderRadius: 10, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', transition: 'border-color 0.2s', textDecoration: 'none' }}
      onMouseEnter={e => e.currentTarget.style.borderColor = color}
      onMouseLeave={e => e.currentTarget.style.borderColor = `${color}33`}
    >
      <Icon size={15} style={{ color, flexShrink: 0 }} />
      <span style={{ fontSize: 12, fontWeight: 600, color: '#CBD5E1', fontFamily: 'sans-serif' }}>{label}</span>
    </div>
  );
  if (to) return <Link to={to} style={{ textDecoration: 'none' }}>{inner}</Link>;
  return <div onClick={onClick}>{inner}</div>;
}

export default function CreationDashboard() {
  const qc = useQueryClient();
  const [retrying, setRetrying] = useState(null);

  const { data: assets = [] } = useQuery({ queryKey: ['creation-assets'], queryFn: () => base44.entities.GeneratedAsset.list('-created_date', 50) });
  const { data: jobs = [] } = useQuery({ queryKey: ['creation-jobs'], queryFn: () => base44.entities.RenderJob.list('-created_date', 30) });
  const { data: pages = [] } = useQuery({ queryKey: ['creation-pages'], queryFn: () => base44.entities.LandingPage.list('-created_date', 10) });
  const { data: audits = [] } = useQuery({ queryKey: ['creation-audits'], queryFn: () => base44.entities.QualityAudit.list('-created_date', 5) });
  const { data: reports = [] } = useQuery({ queryKey: ['creation-reports'], queryFn: () => base44.entities.BuildReport.list('-created_date', 1) });

  const totalAssets = assets.length;
  const approvedAssets = assets.filter(a => ['approved', 'ready'].includes(a.status)).length;
  const failedJobs = jobs.filter(j => j.status === 'failed');
  const activeJobs = jobs.filter(j => ['queued', 'processing'].includes(j.status));
  const lastAudit = audits[0];
  const lastReport = reports[0];

  const recentJobs = jobs.slice(0, 12);

  const retryJob = async (job) => {
    setRetrying(job.id);
    try {
      let payload;
      try { payload = JSON.parse(job.request_payload || '{}'); } catch { payload = {}; }
      const fnMap = {
        image_generation: 'generateImage',
        video_generation: 'generateVideo',
        landing_page_generation: 'generateLandingPage',
        pdf_generation: 'generatePDF',
        agent_generation: 'generateAgent',
        campaign_generation: 'generateCampaignKit'
      };
      const fn = fnMap[job.job_type];
      if (fn) {
        await base44.entities.RenderJob.update(job.id, { status: 'retrying', retry_count: (job.retry_count || 0) + 1 });
        await base44.functions.invoke(fn, payload);
        qc.invalidateQueries(['creation-jobs']);
        qc.invalidateQueries(['creation-assets']);
      }
    } catch (e) {
      console.error('Retry failed:', e);
    } finally {
      setRetrying(null);
    }
  };

  return (
    <ForgeLayout title="Creation Dashboard" subtitle="Riley Creation Engine · Asset Production Centre">
      {/* Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 24 }}>
        <MetricCard label="Total Assets" value={totalAssets} color={GOLD} />
        <MetricCard label="Ready / Approved" value={approvedAssets} sub={`${totalAssets - approvedAssets} pending`} color="#10B981" />
        <MetricCard label="Active Jobs" value={activeJobs.length} color="#3B82F6" />
        <MetricCard label="Failed Jobs" value={failedJobs.length} color={failedJobs.length > 0 ? '#EF4444' : '#10B981'} />
        <MetricCard label="Last Audit" value={lastAudit ? lastAudit.status : 'None'} sub={lastAudit ? `${lastAudit.audit_type}` : ''} color={lastAudit?.status === 'passed' ? '#10B981' : '#F59E0B'} />
        <MetricCard label="Market Ready" value={lastReport?.market_ready_status || 'Not run'} color={lastReport?.market_ready_status === 'market_ready' ? '#10B981' : '#F59E0B'} />
      </div>

      {/* Quick Actions */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, color: GOLD, letterSpacing: 3, textTransform: 'uppercase', fontFamily: 'sans-serif', fontWeight: 600, marginBottom: 12 }}>Quick Actions</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8 }}>
          <QuickAction icon={Image} label="Generate Image" to="/forge/image-gen" color="#3B82F6" />
          <QuickAction icon={Film} label="Generate Video" to="/forge/video-gen" color="#8B5CF6" />
          <QuickAction icon={Globe} label="Landing Page" to="/forge/landing-builder" color="#10B981" />
          <QuickAction icon={FileText} label="PDF / Ebook" to="/forge/pdf-gen" color="#F59E0B" />
          <QuickAction icon={Bot} label="Build Agent" to="/forge/agent-builder" color="#EC4899" />
          <QuickAction icon={Megaphone} label="Campaign Kit" to="/forge/campaign-kit" color="#06B6D4" />
          <QuickAction icon={ShieldCheck} label="QA Audit" to="/forge/audit-centre" color="#10B981" />
          <QuickAction icon={BarChart2} label="Build Report" to="/forge/build-reports" color={GOLD} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 20 }}>
        {/* Recent Jobs */}
        <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 11, color: GOLD, letterSpacing: 3, textTransform: 'uppercase', fontFamily: 'sans-serif', fontWeight: 600, marginBottom: 14 }}>Recent Render Jobs</div>
          {recentJobs.length === 0 ? (
            <p style={{ color: '#374151', fontSize: 12, fontFamily: 'sans-serif' }}>No jobs yet. Use Quick Actions to generate assets.</p>
          ) : recentJobs.map(job => (
            <div key={job.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${BORDER}` }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, color: '#E2E8F0', fontFamily: 'sans-serif', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{job.job_name}</div>
                <div style={{ fontSize: 10, color: '#4B5563', fontFamily: 'sans-serif' }}>{job.job_type?.replace(/_/g, ' ')} · {job.provider}</div>
                {job.status === 'failed' && job.error_message && (
                  <div style={{ fontSize: 10, color: '#EF4444', fontFamily: 'sans-serif', marginTop: 2 }} title={job.error_message}>
                    {job.error_message.substring(0, 60)}...
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, marginLeft: 12 }}>
                <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: `${STATUS_COLOR[job.status] || '#6B7280'}22`, color: STATUS_COLOR[job.status] || '#6B7280', border: `1px solid ${STATUS_COLOR[job.status] || '#6B7280'}44`, fontFamily: 'sans-serif', whiteSpace: 'nowrap' }}>
                  {job.status}
                </span>
                {job.status === 'failed' && (
                  <button onClick={() => retryJob(job)} disabled={retrying === job.id}
                    style={{ background: 'transparent', border: '1px solid #374151', borderRadius: 6, padding: '3px 8px', cursor: 'pointer', color: '#9CA3AF', fontSize: 10, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <RefreshCw size={9} style={{ animation: retrying === job.id ? 'spin 1s linear infinite' : 'none' }} />
                    Retry
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Recent Assets + Pages */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 20 }}>
            <div style={{ fontSize: 11, color: '#10B981', letterSpacing: 3, textTransform: 'uppercase', fontFamily: 'sans-serif', fontWeight: 600, marginBottom: 14 }}>Recent Assets</div>
            {assets.slice(0, 6).length === 0 ? (
              <p style={{ color: '#374151', fontSize: 12, fontFamily: 'sans-serif' }}>No assets generated yet.</p>
            ) : assets.slice(0, 6).map(a => (
              <div key={a.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${BORDER}` }}>
                <div style={{ fontSize: 11, color: '#CBD5E1', fontFamily: 'sans-serif', flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.name}</div>
                <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 20, background: `${STATUS_COLOR[a.status] || '#6B7280'}22`, color: STATUS_COLOR[a.status] || '#6B7280', border: `1px solid ${STATUS_COLOR[a.status] || '#6B7280'}44`, fontFamily: 'sans-serif', whiteSpace: 'nowrap', marginLeft: 8 }}>
                  {a.status}
                </span>
              </div>
            ))}
          </div>

          <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 20 }}>
            <div style={{ fontSize: 11, color: '#8B5CF6', letterSpacing: 3, textTransform: 'uppercase', fontFamily: 'sans-serif', fontWeight: 600, marginBottom: 14 }}>Landing Pages</div>
            {pages.slice(0, 4).length === 0 ? (
              <p style={{ color: '#374151', fontSize: 12, fontFamily: 'sans-serif' }}>No pages yet.</p>
            ) : pages.slice(0, 4).map(p => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${BORDER}` }}>
                <div style={{ fontSize: 11, color: '#CBD5E1', fontFamily: 'sans-serif', flex: 1, minWidth: 0 }}>{p.title}</div>
                <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 20, background: `${STATUS_COLOR[p.status] || '#6B7280'}22`, color: STATUS_COLOR[p.status] || '#6B7280', border: `1px solid ${STATUS_COLOR[p.status] || '#6B7280'}44`, fontFamily: 'sans-serif', marginLeft: 8 }}>
                  {p.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Failed Jobs Panel */}
      {failedJobs.length > 0 && (
        <div style={{ background: '#1A0A0A', border: '1px solid #7F1D1D', borderRadius: 12, padding: 20, marginTop: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <AlertCircle size={14} style={{ color: '#EF4444' }} />
            <span style={{ fontSize: 11, color: '#EF4444', letterSpacing: 3, textTransform: 'uppercase', fontFamily: 'sans-serif', fontWeight: 600 }}>Failed Jobs Requiring Attention</span>
          </div>
          {failedJobs.map(job => (
            <div key={job.id} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid #7F1D1D33` }}>
              <div>
                <div style={{ fontSize: 12, color: '#FCA5A5', fontFamily: 'sans-serif', fontWeight: 500 }}>{job.job_name}</div>
                <div style={{ fontSize: 11, color: '#EF4444', fontFamily: 'sans-serif', marginTop: 2 }}>{job.error_message}</div>
                {job.debug_notes && <div style={{ fontSize: 10, color: '#9CA3AF', fontFamily: 'sans-serif', marginTop: 2 }}>{job.debug_notes}</div>}
              </div>
              <button onClick={() => retryJob(job)} disabled={retrying === job.id}
                style={{ background: '#7F1D1D', border: '1px solid #EF4444', borderRadius: 6, padding: '5px 12px', cursor: 'pointer', color: '#FCA5A5', fontSize: 11, fontFamily: 'sans-serif', flexShrink: 0, marginLeft: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                <RefreshCw size={10} style={{ animation: retrying === job.id ? 'spin 1s linear infinite' : 'none' }} />
                Retry
              </button>
            </div>
          ))}
        </div>
      )}
    </ForgeLayout>
  );
}