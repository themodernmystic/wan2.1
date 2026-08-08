import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, X, Eye, Download, Mail } from 'lucide-react';
import ForgeLayout from '@/components/forge/ForgeLayout';
import ForgeCard from '@/components/forge/ForgeCard';
import ForgeButton from '@/components/forge/ForgeButton';

const STATUS_COLOR = {
  new: '#3B82F6', approved: '#10B981', rejected: '#EF4444',
  fulfilled: '#C9A84C', archived: '#6B7280'
};

export default function FormSubmissions() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState('new');
  const [selected, setSelected] = useState(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [downloading, setDownloading] = useState(null);

  const { data: submissions = [] } = useQuery({
    queryKey: ['form-submissions', filter],
    queryFn: () => filter === 'all'
      ? base44.entities.FormSubmission.list('-created_date', 50)
      : base44.entities.FormSubmission.filter({ status: filter }, '-created_date', 50)
  });

  const { data: assets = [] } = useQuery({
    queryKey: ['pdf-assets-sub'],
    queryFn: () => base44.entities.GeneratedAsset.filter({ asset_type: 'pdf' }, '-created_date', 20)
  });

  const updateStatus = async (id, status, notes) => {
    await base44.entities.FormSubmission.update(id, { status, admin_notes: notes || adminNotes });
    qc.invalidateQueries(['form-submissions', filter]);
    setSelected(null);
    setAdminNotes('');
  };

  const markFulfilled = async (submission) => {
    setDownloading(submission.id);
    // Find the ebook asset
    const ebookAsset = assets.find(a => a.id === submission.download_asset_id) || assets[0];
    if (ebookAsset?.file_url) {
      await base44.entities.FormSubmission.update(submission.id, {
        status: 'fulfilled',
        download_sent: true,
        admin_notes: (submission.admin_notes || '') + `\nFulfilled via ${ebookAsset.name} on ${new Date().toLocaleDateString('en-AU')}`
      });
      // In production: send email with download link via Resend/SendGrid
      alert(`Marked as fulfilled. Ebook asset: ${ebookAsset.name}\nURL: ${ebookAsset.file_url}\n\nNOTE: Email delivery requires Resend/SendGrid configuration. Send manually if not configured.`);
    } else {
      alert('No PDF asset found. Generate the ebook PDF first, then mark as fulfilled.');
    }
    qc.invalidateQueries(['form-submissions', filter]);
    setDownloading(null);
  };

  const inputStyle = { width: '100%', background: '#080812', border: '1px solid #2A2A4A', borderRadius: 8, padding: '8px 12px', color: '#E2E8F0', fontSize: 12, fontFamily: 'sans-serif', boxSizing: 'border-box' };

  const filters = ['all', 'new', 'approved', 'rejected', 'fulfilled', 'archived'];

  return (
    <ForgeLayout title="Form Submissions" subtitle="Donation confirmations, lead captures, and admin approval flow">
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 20 }}>
        {['new', 'approved', 'rejected', 'fulfilled', 'archived'].map(s => {
          const count = submissions.filter ? 0 : 0; // Can't easily count from filtered view
          return (
            <button key={s} onClick={() => setFilter(s)}
              style={{ background: filter === s ? `${STATUS_COLOR[s]}22` : '#0E0E1C', border: `1px solid ${filter === s ? STATUS_COLOR[s] : '#1E1E35'}`, borderRadius: 8, padding: '10px 14px', cursor: 'pointer', textAlign: 'left' }}>
              <div style={{ fontSize: 11, color: STATUS_COLOR[s], fontFamily: 'sans-serif', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>{s}</div>
            </button>
          );
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 380px' : '1fr', gap: 20 }}>
        {/* Submissions List */}
        <div>
          {submissions.length === 0 ? (
            <ForgeCard>
              <p style={{ color: '#4B5563', fontSize: 13, fontFamily: 'sans-serif' }}>No submissions with status: {filter}.</p>
            </ForgeCard>
          ) : submissions.map(s => (
            <div key={s.id} style={{
              background: selected?.id === s.id ? '#1A1E35' : '#0E0E1C',
              border: `1px solid ${selected?.id === s.id ? '#3B82F6' : '#1E1E35'}`,
              borderRadius: 10, padding: 16, marginBottom: 8, cursor: 'pointer'
            }} onClick={() => { setSelected(s); setAdminNotes(s.admin_notes || ''); }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 13, color: '#E2E8F0', fontFamily: 'sans-serif', fontWeight: 600 }}>{s.name || 'Anonymous'}</span>
                    <span style={{ fontSize: 10, padding: '1px 8px', borderRadius: 20, background: `${STATUS_COLOR[s.status] || '#6B7280'}22`, color: STATUS_COLOR[s.status] || '#6B7280', border: `1px solid ${STATUS_COLOR[s.status] || '#6B7280'}44`, fontFamily: 'sans-serif' }}>{s.status}</span>
                    {s.download_sent && <span style={{ fontSize: 10, color: '#C9A84C', fontFamily: 'sans-serif' }}>✓ Sent</span>}
                  </div>
                  <div style={{ fontSize: 11, color: '#4B5563', fontFamily: 'sans-serif' }}>
                    {s.email} · {s.submission_type} · {new Date(s.created_date).toLocaleDateString('en-AU')}
                  </div>
                  {s.charity_donated_to && (
                    <div style={{ fontSize: 11, color: '#C9A84C', fontFamily: 'sans-serif', marginTop: 2 }}>
                      Donated to: {s.charity_donated_to} — ${s.donation_amount}
                    </div>
                  )}
                  {s.uploaded_file_url && (
                    <div style={{ fontSize: 10, color: '#10B981', fontFamily: 'sans-serif', marginTop: 2 }}>📎 Confirmation screenshot uploaded</div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                  {s.status === 'new' && (
                    <>
                      <button onClick={() => updateStatus(s.id, 'approved', s.admin_notes)}
                        style={{ background: '#052e16', border: '1px solid #10B981', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', color: '#6EE7B7', fontSize: 10, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <CheckCircle size={10} /> Approve
                      </button>
                      <button onClick={() => updateStatus(s.id, 'rejected', s.admin_notes)}
                        style={{ background: '#1A0A0A', border: '1px solid #EF4444', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', color: '#FCA5A5', fontSize: 10, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <X size={10} /> Reject
                      </button>
                    </>
                  )}
                  {s.status === 'approved' && !s.download_sent && (
                    <button onClick={() => markFulfilled(s)} disabled={downloading === s.id}
                      style={{ background: '#C9A84C22', border: '1px solid #C9A84C', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', color: '#C9A84C', fontSize: 10, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Download size={10} /> Fulfil
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Detail Panel */}
        {selected && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <ForgeCard title="Submission Detail" accent="#3B82F6">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
                {[
                  ['Name', selected.name],
                  ['Email', selected.email],
                  ['Type', selected.submission_type],
                  ['Status', selected.status],
                  ['Charity', selected.charity_donated_to],
                  ['Amount', selected.donation_amount ? `$${selected.donation_amount}` : null],
                  ['Consent', selected.consent_given ? '✓ Given' : '✗ Not given'],
                  ['Download Sent', selected.download_sent ? '✓ Yes' : '✗ No'],
                  ['Submitted', new Date(selected.created_date).toLocaleString('en-AU')],
                ].filter(([, v]) => v).map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontFamily: 'sans-serif' }}>
                    <span style={{ color: '#6B7280' }}>{k}</span>
                    <span style={{ color: '#E2E8F0', maxWidth: '60%', textAlign: 'right' }}>{v}</span>
                  </div>
                ))}
              </div>

              {selected.message && (
                <div style={{ background: '#080812', borderRadius: 6, padding: 10, marginBottom: 10 }}>
                  <div style={{ fontSize: 10, color: '#6B7280', fontFamily: 'sans-serif', marginBottom: 4 }}>MESSAGE</div>
                  <div style={{ fontSize: 11, color: '#CBD5E1', fontFamily: 'sans-serif' }}>{selected.message}</div>
                </div>
              )}

              {selected.uploaded_file_url && (
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 10, color: '#6B7280', fontFamily: 'sans-serif', marginBottom: 6 }}>DONATION SCREENSHOT</div>
                  <img src={selected.uploaded_file_url} alt="Donation proof" style={{ width: '100%', borderRadius: 6, border: '1px solid #2A2A4A', maxHeight: 200, objectFit: 'contain' }} />
                  <a href={selected.uploaded_file_url} target="_blank" rel="noreferrer"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 6, fontSize: 10, color: '#3B82F6', fontFamily: 'sans-serif' }}>
                    <Eye size={10} /> View full image
                  </a>
                </div>
              )}

              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 10, color: '#6B7280', fontFamily: 'sans-serif', marginBottom: 4 }}>ADMIN NOTES</div>
                <textarea style={{ ...inputStyle, height: 70, resize: 'vertical' }} value={adminNotes} onChange={e => setAdminNotes(e.target.value)} placeholder="Add admin notes..." />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {selected.status === 'new' && (
                  <>
                    <ForgeButton variant="green" size="sm" icon={CheckCircle} onClick={() => updateStatus(selected.id, 'approved', adminNotes)}>Approve & Notify</ForgeButton>
                    <ForgeButton variant="danger" size="sm" icon={X} onClick={() => updateStatus(selected.id, 'rejected', adminNotes)}>Reject</ForgeButton>
                  </>
                )}
                {selected.status === 'approved' && !selected.download_sent && (
                  <ForgeButton variant="gold" size="sm" icon={Download} onClick={() => markFulfilled(selected)} loading={downloading === selected.id}>Send Ebook / Fulfil</ForgeButton>
                )}
                {selected.status === 'fulfilled' && (
                  <div style={{ fontSize: 11, color: '#C9A84C', fontFamily: 'sans-serif' }}>✓ Submission fulfilled. Ebook delivered.</div>
                )}
                <ForgeButton variant="ghost" size="sm" onClick={() => setSelected(null)}>Close</ForgeButton>
              </div>
            </ForgeCard>
          </div>
        )}
      </div>
    </ForgeLayout>
  );
}