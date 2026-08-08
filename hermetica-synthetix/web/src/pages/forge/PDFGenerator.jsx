import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText, Download, ShieldCheck, RefreshCw } from 'lucide-react';
import ForgeLayout from '@/components/forge/ForgeLayout';
import ForgeCard from '@/components/forge/ForgeCard';
import ForgeButton from '@/components/forge/ForgeButton';

const PAGE_SIZES = ['a4', 'letter'];
const CHAPTER_STYLES = ['standard', 'ornate', 'minimal', 'academic'];

export default function PDFGenerator() {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    project_id: '', title: '', subtitle: '', author: 'James Hatcher',
    imprint: 'Hermetica Holdings', manuscript: '',
    back_page_content: 'Learn more at hermetica.ai', page_size: 'a4'
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [auditLoading, setAuditLoading] = useState(false);

  const { data: projects = [] } = useQuery({ queryKey: ['riley-projects-list'], queryFn: () => base44.entities.RileyProject.list() });
  const { data: pdfAssets = [] } = useQuery({ queryKey: ['pdf-assets'], queryFn: () => base44.entities.GeneratedAsset.filter({ asset_type: 'pdf' }, '-created_date', 10) });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const generate = async () => {
    if (!form.title) { setError('Title is required.'); return; }
    if (!form.manuscript || form.manuscript.length < 50) { setError('Manuscript body is required (minimum 50 characters). Cannot generate PDF without content.'); return; }
    setLoading(true); setError(null); setResult(null);
    try {
      const r = await base44.functions.invoke('generatePDF', form);
      if (r.data.success) {
        setResult(r.data);
        qc.invalidateQueries(['pdf-assets']);
      } else if (r.data.error) {
        setError(r.data.error);
      } else if (r.headers?.['content-type']?.includes('application/pdf')) {
        // Direct PDF download
        setResult({ success: true, direct_download: true });
      } else {
        setError('PDF generation returned unexpected response.');
      }
    } catch (e) {
      // Try to detect direct PDF binary response
      setError(e.message);
    } finally { setLoading(false); }
  };

  const runAudit = async (assetId) => {
    setAuditLoading(true);
    try {
      const r = await base44.functions.invoke('runQualityAudit', {
        project_id: form.project_id || 'none', asset_id: assetId, audit_type: 'render_quality'
      });
      alert(`PDF Audit: ${r.data.status} — Score: ${r.data.score}/100. Check QA Audit Centre for details.`);
    } catch (e) { alert('Audit error: ' + e.message); } finally { setAuditLoading(false); }
  };

  const CHAPTER_TEMPLATE = `# Chapter 1: Introduction

This is the opening of the first chapter. Write your content here.

# Chapter 2: The Core Concepts

This chapter explores the fundamental ideas behind the work.

# Chapter 3: Practical Application

How to apply these principles in the real world.

# Conclusion

Closing thoughts and next steps.`;

  const inputStyle = { width: '100%', background: '#080812', border: '1px solid #2A2A4A', borderRadius: 8, padding: '8px 12px', color: '#E2E8F0', fontSize: 12, fontFamily: 'sans-serif', boxSizing: 'border-box' };
  const labelStyle = { fontSize: 10, color: '#9CA3AF', fontFamily: 'sans-serif', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4, display: 'block' };

  return (
    <ForgeLayout title="PDF / Ebook Generator" subtitle="Hermetica-branded book generation with real PDF output">
      <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 20 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <ForgeCard title="Book Configuration">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
              <div><label style={labelStyle}>Project</label>
                <select style={inputStyle} value={form.project_id} onChange={e => set('project_id', e.target.value)}>
                  <option value="">No Project</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div><label style={labelStyle}>Book Title *</label><input style={inputStyle} value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Clever Computelligence" /></div>
              <div><label style={labelStyle}>Subtitle</label><input style={inputStyle} value={form.subtitle} onChange={e => set('subtitle', e.target.value)} placeholder="e.g. A Guide to Conscious Technology" /></div>
              <div><label style={labelStyle}>Author</label><input style={inputStyle} value={form.author} onChange={e => set('author', e.target.value)} /></div>
              <div><label style={labelStyle}>Imprint / Publisher</label><input style={inputStyle} value={form.imprint} onChange={e => set('imprint', e.target.value)} /></div>
              <div><label style={labelStyle}>Back Page Content</label><textarea style={{ ...inputStyle, height: 60, resize: 'vertical' }} value={form.back_page_content} onChange={e => set('back_page_content', e.target.value)} /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div><label style={labelStyle}>Page Size</label>
                  <select style={inputStyle} value={form.page_size} onChange={e => set('page_size', e.target.value)}>
                    {PAGE_SIZES.map(s => <option key={s} value={s}>{s.toUpperCase()}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </ForgeCard>

          <ForgeCard title="Manuscript Content">
            <div style={{ fontSize: 10, color: '#9CA3AF', fontFamily: 'sans-serif', marginBottom: 8 }}>
              Use # for chapter headings. Each # line starts a new chapter page.
            </div>
            <textarea style={{ ...inputStyle, height: 280, resize: 'vertical', lineHeight: 1.6 }}
              value={form.manuscript}
              onChange={e => set('manuscript', e.target.value)}
              placeholder="Paste your manuscript here or use chapters with # headings..." />
            <button onClick={() => set('manuscript', CHAPTER_TEMPLATE)}
              style={{ marginTop: 8, background: 'transparent', border: '1px solid #2A2A4A', borderRadius: 6, padding: '5px 12px', cursor: 'pointer', color: '#9CA3AF', fontSize: 10, fontFamily: 'sans-serif' }}>
              Use Template
            </button>
          </ForgeCard>

          <ForgeButton onClick={generate} loading={loading} icon={FileText} variant="gold">
            {loading ? 'Generating PDF...' : 'Generate PDF'}
          </ForgeButton>

          {error && <div style={{ background: '#1A0A0A', border: '1px solid #7F1D1D', borderRadius: 8, padding: 12, fontSize: 11, color: '#EF4444', fontFamily: 'sans-serif' }}>{error}</div>}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {result?.success && (
            <ForgeCard title="PDF Generated" accent="#10B981">
              <div style={{ fontSize: 12, color: '#6EE7B7', fontFamily: 'sans-serif', marginBottom: 10 }}>PDF created successfully.</div>
              {result.file_url && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 11, color: '#9CA3AF', fontFamily: 'sans-serif' }}>
                    Pages: {result.page_count} · Size: {result.size_bytes ? Math.round(result.size_bytes / 1024) + 'KB' : 'N/A'}
                  </div>
                  <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                    <a href={result.file_url} download target="_blank" rel="noreferrer"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#C9A84C', color: '#080812', padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700, textDecoration: 'none', fontFamily: 'sans-serif' }}>
                      <Download size={13} /> Download PDF
                    </a>
                    {result.asset_id && (
                      <ForgeButton variant="ghost" size="sm" icon={ShieldCheck} onClick={() => runAudit(result.asset_id)} loading={auditLoading}>
                        QA Audit
                      </ForgeButton>
                    )}
                  </div>
                </div>
              )}
              {!result.file_url && result.direct_download && (
                <div style={{ fontSize: 11, color: '#9CA3AF', fontFamily: 'sans-serif' }}>PDF downloaded directly. Asset record created.</div>
              )}
              {result.asset_id && (
                <div style={{ fontSize: 10, color: '#4B5563', fontFamily: 'sans-serif', marginTop: 8 }}>Asset ID: {result.asset_id} · Job: {result.render_job_id}</div>
              )}
            </ForgeCard>
          )}

          <ForgeCard title="Previous PDF Assets">
            {pdfAssets.length === 0 ? (
              <p style={{ color: '#374151', fontSize: 12, fontFamily: 'sans-serif' }}>No PDFs generated yet.</p>
            ) : pdfAssets.map(a => (
              <div key={a.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #1E1E35' }}>
                <div>
                  <div style={{ fontSize: 12, color: '#E2E8F0', fontFamily: 'sans-serif', fontWeight: 500 }}>{a.name}</div>
                  <div style={{ fontSize: 10, color: '#4B5563', fontFamily: 'sans-serif' }}>
                    {a.status} · {a.format} · {a.file_url ? '✓ URL' : '✗ No URL'}
                  </div>
                  {a.status === 'mock_placeholder' && (
                    <div style={{ fontSize: 10, color: '#F59E0B', fontFamily: 'sans-serif' }}>⚠ Mock placeholder — regenerate with real content</div>
                  )}
                  {a.failure_reason && <div style={{ fontSize: 10, color: '#EF4444', fontFamily: 'sans-serif' }}>{a.failure_reason}</div>}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {a.file_url && (
                    <a href={a.file_url} download target="_blank" rel="noreferrer"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#0E1525', border: '1px solid #3B82F6', borderRadius: 6, padding: '5px 10px', color: '#93C5FD', fontSize: 10, textDecoration: 'none', fontFamily: 'sans-serif' }}>
                      <Download size={10} /> Download
                    </a>
                  )}
                  <ForgeButton variant="ghost" size="sm" onClick={() => runAudit(a.id)} loading={auditLoading}>Audit</ForgeButton>
                </div>
              </div>
            ))}
          </ForgeCard>
        </div>
      </div>
    </ForgeLayout>
  );
}