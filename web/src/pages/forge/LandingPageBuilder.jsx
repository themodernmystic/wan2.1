import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Globe, Eye, Download, CheckCircle, AlertCircle, ShieldCheck, Loader2, Upload } from 'lucide-react';
import ForgeLayout from '@/components/forge/ForgeLayout';
import ForgeCard from '@/components/forge/ForgeCard';
import ForgeButton from '@/components/forge/ForgeButton';

const PAGE_TYPES = ['custom', 'fundraiser', 'product', 'waitlist', 'lead_capture', 'download', 'campaign'];
const SECTION_OPTIONS = ['hero', 'features', 'how-it-works', 'testimonials', 'pricing', 'faq', 'social-proof', 'gallery', 'team', 'final-cta', 'disclaimer'];

const FUNDRAISER_DISCLAIMER = `This fundraiser is independently organised by James Hatcher / Hermetica Holdings and is not officially affiliated with, endorsed by, or sponsored by OzHarvest or Foodbank Australia unless otherwise stated. Donations should be made directly to the charity.`;

export default function LandingPageBuilder() {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    project_id: '', title: '', slug: '', page_type: 'custom',
    offer: '', audience: '', brand_voice: 'Premium, warm, direct, mystical but grounded',
    hero_headline: '', hero_subheadline: '',
    primary_cta_label: 'Get Started', primary_cta_url: '#claim',
    secondary_cta_label: '', secondary_cta_url: '',
    seo_title: '', seo_description: '',
    sections: ['hero', 'features', 'how-it-works', 'final-cta'],
    form_enabled: false, include_disclaimer: false
  });
  const [loading, setLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [selectedPage, setSelectedPage] = useState(null);
  const [auditLoading, setAuditLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('builder');

  const { data: projects = [] } = useQuery({ queryKey: ['riley-projects-list'], queryFn: () => base44.entities.RileyProject.list() });
  const { data: pages = [] } = useQuery({ queryKey: ['landing-pages-list'], queryFn: () => base44.entities.LandingPage.list('-created_date', 20) });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const toggleSection = (s) => set('sections', form.sections.includes(s) ? form.sections.filter(x => x !== s) : [...form.sections, s]);

  const isFundraiser = form.page_type === 'fundraiser';

  const generate = async () => {
    if (!form.title || !form.slug) { setError('Title and slug are required.'); return; }
    setLoading(true); setError(null); setResult(null);
    try {
      const r = await base44.functions.invoke('generateLandingPage', {
        ...form,
        include_disclaimer: isFundraiser ? true : form.include_disclaimer
      });
      if (r.data.success) {
        setResult(r.data);
        qc.invalidateQueries(['landing-pages-list']);
      } else {
        setError(r.data.error || 'Generation failed.');
      }
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  };

  const publish = async (lpId) => {
    setPublishing(true);
    try {
      const r = await base44.functions.invoke('publishLandingPage', { landing_page_id: lpId });
      if (r.data.success) { alert(`Published: ${r.data.published_url}`); }
      else { alert(`Publish result: ${r.data.error || r.data.note || 'Check page HTML'}`); }
      qc.invalidateQueries(['landing-pages-list']);
    } catch (e) { alert('Publish error: ' + e.message); } finally { setPublishing(false); }
  };

  const unpublish = async (lpId) => {
    await base44.functions.invoke('publishLandingPage', { landing_page_id: lpId, action: 'unpublish' });
    qc.invalidateQueries(['landing-pages-list']);
  };

  const exportHtml = (page) => {
    if (!page.generated_html) { alert('No HTML generated yet.'); return; }
    const full = `<!DOCTYPE html><html><head><title>${page.seo_title || page.title}</title><style>${page.generated_css || ''}</style></head><body>${page.generated_html}<script>${page.generated_js || ''}<\/script></body></html>`;
    const blob = new Blob([full], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${page.slug}.html`; a.click();
  };

  const runAudit = async (lpId, auditType) => {
    setAuditLoading(true);
    try {
      const r = await base44.functions.invoke('runQualityAudit', {
        project_id: form.project_id || 'global', landing_page_id: lpId, audit_type: auditType
      });
      alert(`Audit (${auditType}): ${r.data.status} — Score: ${r.data.score}/100. Check QA Audit Centre.`);
    } catch (e) { alert('Audit error: ' + e.message); } finally { setAuditLoading(false); }
  };

  const inputStyle = { width: '100%', background: '#080812', border: '1px solid #2A2A4A', borderRadius: 8, padding: '8px 12px', color: '#E2E8F0', fontSize: 12, fontFamily: 'sans-serif', boxSizing: 'border-box' };
  const labelStyle = { fontSize: 10, color: '#9CA3AF', fontFamily: 'sans-serif', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4, display: 'block' };

  const TAB = { borderBottom: 'none', padding: '8px 16px', fontSize: 11, fontFamily: 'sans-serif', cursor: 'pointer', fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', border: 'none', background: 'transparent' };

  return (
    <ForgeLayout title="Landing Page Builder" subtitle="AI-generated, SEO-optimised, fundraiser-ready">
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, borderBottom: '1px solid #1E1E35' }}>
        {['builder', 'pages', 'fundraiser'].map(t => (
          <button key={t} style={{ ...TAB, color: activeTab === t ? '#C9A84C' : '#6B7280', borderBottom: activeTab === t ? '2px solid #C9A84C' : '2px solid transparent' }}
            onClick={() => setActiveTab(t)}>{t === 'builder' ? 'Page Builder' : t === 'pages' ? 'All Pages' : 'Fundraiser Info'}</button>
        ))}
      </div>

      {activeTab === 'builder' && (
        <div style={{ display: 'grid', gridTemplateColumns: '400px 1fr', gap: 20 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <ForgeCard title="Page Configuration">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                <div><label style={labelStyle}>Project</label>
                  <select style={inputStyle} value={form.project_id} onChange={e => set('project_id', e.target.value)}>
                    <option value="">No Project</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div><label style={labelStyle}>Page Title *</label><input style={inputStyle} value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Clever Computelligence Fundraiser" /></div>
                <div><label style={labelStyle}>Slug * (URL path)</label><input style={inputStyle} value={form.slug} onChange={e => set('slug', e.target.value.toLowerCase().replace(/\s+/g, '-'))} placeholder="clever-computelligence" /></div>
                <div><label style={labelStyle}>Page Type</label>
                  <select style={inputStyle} value={form.page_type} onChange={e => set('page_type', e.target.value)}>
                    {PAGE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                {isFundraiser && (
                  <div style={{ background: '#0E1A0E', border: '1px solid #10B981', borderRadius: 8, padding: 10 }}>
                    <div style={{ fontSize: 10, color: '#6EE7B7', fontFamily: 'sans-serif', fontWeight: 600, marginBottom: 4 }}>FUNDRAISER MODE ACTIVE</div>
                    <div style={{ fontSize: 10, color: '#9CA3AF', fontFamily: 'sans-serif' }}>Will include: OzHarvest + Foodbank donation buttons, donation confirmation upload, legal disclaimer, admin approval flow.</div>
                  </div>
                )}
                <div><label style={labelStyle}>Offer / Value Prop</label><textarea style={{ ...inputStyle, height: 60, resize: 'vertical' }} value={form.offer} onChange={e => set('offer', e.target.value)} placeholder="What are you offering?" /></div>
                <div><label style={labelStyle}>Target Audience</label><input style={inputStyle} value={form.audience} onChange={e => set('audience', e.target.value)} placeholder="e.g. Australian tech professionals" /></div>
                <div><label style={labelStyle}>Brand Voice</label><input style={inputStyle} value={form.brand_voice} onChange={e => set('brand_voice', e.target.value)} /></div>
                <div><label style={labelStyle}>Hero Headline</label><input style={inputStyle} value={form.hero_headline} onChange={e => set('hero_headline', e.target.value)} /></div>
                <div><label style={labelStyle}>Hero Subheadline</label><input style={inputStyle} value={form.hero_subheadline} onChange={e => set('hero_subheadline', e.target.value)} /></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div><label style={labelStyle}>CTA Label</label><input style={inputStyle} value={form.primary_cta_label} onChange={e => set('primary_cta_label', e.target.value)} /></div>
                  <div><label style={labelStyle}>CTA URL</label><input style={inputStyle} value={form.primary_cta_url} onChange={e => set('primary_cta_url', e.target.value)} /></div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div><label style={labelStyle}>Secondary CTA Label</label><input style={inputStyle} value={form.secondary_cta_label} onChange={e => set('secondary_cta_label', e.target.value)} /></div>
                  <div><label style={labelStyle}>Secondary CTA URL</label><input style={inputStyle} value={form.secondary_cta_url} onChange={e => set('secondary_cta_url', e.target.value)} /></div>
                </div>
                <div><label style={labelStyle}>SEO Title</label><input style={inputStyle} value={form.seo_title} onChange={e => set('seo_title', e.target.value)} /></div>
                <div><label style={labelStyle}>SEO Description</label><textarea style={{ ...inputStyle, height: 55, resize: 'vertical' }} value={form.seo_description} onChange={e => set('seo_description', e.target.value)} /></div>
                <div>
                  <label style={labelStyle}>Sections</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {SECTION_OPTIONS.map(s => (
                      <button key={s} onClick={() => toggleSection(s)}
                        style={{ padding: '3px 10px', borderRadius: 20, fontSize: 10, fontFamily: 'sans-serif', cursor: 'pointer', background: form.sections.includes(s) ? '#C9A84C22' : 'transparent', border: `1px solid ${form.sections.includes(s) ? '#C9A84C' : '#2A2A4A'}`, color: form.sections.includes(s) ? '#C9A84C' : '#6B7280' }}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 16 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input type="checkbox" checked={form.form_enabled} onChange={e => set('form_enabled', e.target.checked)} />
                    <span style={{ fontSize: 11, color: '#9CA3AF', fontFamily: 'sans-serif' }}>Enable Form</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input type="checkbox" checked={form.include_disclaimer} onChange={e => set('include_disclaimer', e.target.checked)} />
                    <span style={{ fontSize: 11, color: '#9CA3AF', fontFamily: 'sans-serif' }}>Include Disclaimer</span>
                  </label>
                </div>
              </div>
            </ForgeCard>
            <ForgeButton onClick={generate} loading={loading} icon={Globe} variant="gold">
              {loading ? 'Generating...' : 'Generate Landing Page'}
            </ForgeButton>
            {error && <div style={{ background: '#1A0A0A', border: '1px solid #7F1D1D', borderRadius: 8, padding: 12, fontSize: 11, color: '#EF4444', fontFamily: 'sans-serif' }}>{error}</div>}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {result?.success && (
              <ForgeCard title="Generation Result" accent="#10B981">
                <div style={{ fontSize: 12, color: '#6EE7B7', fontFamily: 'sans-serif', marginBottom: 10 }}>Landing page generated successfully.</div>
                <div style={{ fontSize: 11, color: '#9CA3AF', fontFamily: 'sans-serif', marginBottom: 14 }}>
                  Page ID: {result.landing_page_id} · Status: preview_ready · HTML: {result.has_html ? '✓' : '✗'} · Job: {result.render_job_id}
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <ForgeButton variant="green" size="sm" onClick={() => publish(result.landing_page_id)} loading={publishing} icon={Globe}>
                    Publish
                  </ForgeButton>
                  <ForgeButton variant="ghost" size="sm" onClick={() => runAudit(result.landing_page_id, 'seo')} loading={auditLoading} icon={ShieldCheck}>
                    SEO Audit
                  </ForgeButton>
                  <ForgeButton variant="ghost" size="sm" onClick={() => runAudit(result.landing_page_id, 'accessibility')} loading={auditLoading}>
                    Accessibility
                  </ForgeButton>
                  <ForgeButton variant="ghost" size="sm" onClick={() => runAudit(result.landing_page_id, 'legal')} loading={auditLoading}>
                    Legal Audit
                  </ForgeButton>
                </div>
              </ForgeCard>
            )}

            {/* Preview iframe */}
            {result?.landing_page_id && (() => {
              const p = pages.find(pg => pg.id === result.landing_page_id);
              if (p?.generated_html) {
                const full = `<!DOCTYPE html><html><head><style>${p.generated_css || ''}</style></head><body>${p.generated_html}<script>${p.generated_js || ''}<\/script></body></html>`;
                return (
                  <ForgeCard title="Live Preview" accent="#3B82F6">
                    <iframe srcDoc={full} sandbox="allow-scripts" style={{ width: '100%', height: 500, border: 'none', borderRadius: 8, background: '#fff' }} title="Page Preview" />
                    <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                      <ForgeButton variant="blue" size="sm" icon={Download} onClick={() => exportHtml(p)}>Export HTML</ForgeButton>
                    </div>
                  </ForgeCard>
                );
              }
              return null;
            })()}
          </div>
        </div>
      )}

      {activeTab === 'pages' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {pages.length === 0 ? (
            <div style={{ color: '#4B5563', fontSize: 13, fontFamily: 'sans-serif', padding: 20 }}>No landing pages yet.</div>
          ) : pages.map(p => (
            <div key={p.id} style={{ background: '#0E0E1C', border: '1px solid #1E1E35', borderRadius: 12, padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 13, color: '#E2E8F0', fontFamily: 'sans-serif', fontWeight: 600 }}>{p.title}</div>
                  <div style={{ fontSize: 11, color: '#4B5563', fontFamily: 'sans-serif' }}>/{p.slug} · {p.page_type} · {p.status}</div>
                  {p.published_url && <a href={p.published_url} target="_blank" rel="noreferrer" style={{ fontSize: 10, color: '#3B82F6', fontFamily: 'sans-serif' }}>{p.published_url}</a>}
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', flexShrink: 0 }}>
                  {p.status !== 'published' && <ForgeButton variant="green" size="sm" icon={Globe} onClick={() => publish(p.id)} loading={publishing}>Publish</ForgeButton>}
                  {p.status === 'published' && <ForgeButton variant="ghost" size="sm" onClick={() => unpublish(p.id)}>Unpublish</ForgeButton>}
                  <ForgeButton variant="ghost" size="sm" icon={Download} onClick={() => exportHtml(p)}>Export HTML</ForgeButton>
                  <ForgeButton variant="ghost" size="sm" onClick={() => runAudit(p.id, 'end_to_end')} loading={auditLoading}>E2E Test</ForgeButton>
                </div>
              </div>
              {p.generated_html && (
                <div style={{ marginTop: 12 }}>
                  <iframe srcDoc={`<!DOCTYPE html><html><head><style>${p.generated_css || ''}</style></head><body>${p.generated_html}</body></html>`}
                    style={{ width: '100%', height: 250, border: 'none', borderRadius: 6, background: '#fff' }} title={p.title} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {activeTab === 'fundraiser' && (
        <ForgeCard title="Fundraiser Guidelines">
          <div style={{ fontSize: 12, color: '#E2E8F0', fontFamily: 'sans-serif', lineHeight: 1.8 }}>
            <div style={{ marginBottom: 12, padding: 12, background: '#0E1A0E', border: '1px solid #10B981', borderRadius: 8 }}>
              <div style={{ fontSize: 11, color: '#6EE7B7', fontWeight: 600, marginBottom: 6 }}>REQUIRED DISCLAIMER</div>
              <div style={{ fontSize: 11, color: '#9CA3AF' }}>{FUNDRAISER_DISCLAIMER}</div>
            </div>
            <ul style={{ paddingLeft: 16, color: '#9CA3AF', fontSize: 11 }}>
              <li style={{ marginBottom: 6 }}>Donation buttons must link to official charity sites only (ozharvest.org, foodbank.org.au)</li>
              <li style={{ marginBottom: 6 }}>Do not use charity logos unless explicitly uploaded and approved</li>
              <li style={{ marginBottom: 6 }}>Donation confirmation form must include: name, email, charity, amount, screenshot upload, consent checkbox</li>
              <li style={{ marginBottom: 6 }}>All form submissions stored as FormSubmission records with status: new → approved → fulfilled</li>
              <li style={{ marginBottom: 6 }}>Admin must approve before ebook download is delivered</li>
              <li>Run Legal/Disclaimer audit before publishing</li>
            </ul>
          </div>
        </ForgeCard>
      )}
    </ForgeLayout>
  );
}