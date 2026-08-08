import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Megaphone, Copy, Download, ShieldCheck } from 'lucide-react';
import ForgeLayout from '@/components/forge/ForgeLayout';
import ForgeCard from '@/components/forge/ForgeCard';
import ForgeButton from '@/components/forge/ForgeButton';

const PLATFORMS = ['facebook', 'instagram', 'twitter', 'linkedin', 'tiktok', 'email', 'press'];
const TONES = ['Premium, warm, direct', 'Professional, formal', 'Casual, friendly', 'Urgent, action-driven', 'Mystical, philosophical', 'Humorous, playful', 'Inspirational, motivational'];

export default function CampaignKit() {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    project_id: '', campaign_name: '', campaign_goal: '',
    offer: '', audience: '', tone: 'Premium, warm, direct',
    platforms: ['facebook', 'instagram', 'email'], cta: 'Donate & Claim Your Ebook',
    launch_date: new Date().toISOString().split('T')[0]
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [auditLoading, setAuditLoading] = useState(false);

  const { data: projects = [] } = useQuery({ queryKey: ['riley-projects-list'], queryFn: () => base44.entities.RileyProject.list() });
  const { data: campaigns = [] } = useQuery({ queryKey: ['campaigns-list'], queryFn: () => base44.entities.Campaign.list('-created_date', 10) });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const togglePlatform = (p) => set('platforms', form.platforms.includes(p) ? form.platforms.filter(x => x !== p) : [...form.platforms, p]);

  const generate = async () => {
    if (!form.campaign_name || !form.campaign_goal) { setError('Campaign name and goal are required.'); return; }
    setLoading(true); setError(null); setResult(null);
    try {
      const r = await base44.functions.invoke('generateCampaignKit', form);
      if (r.data.success) { setResult(r.data); qc.invalidateQueries(['campaigns-list']); }
      else setError(r.data.error || 'Generation failed.');
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  };

  const runAudit = async (type) => {
    if (!result?.campaign_id) { alert('Generate a campaign kit first.'); return; }
    setAuditLoading(true);
    try {
      const r = await base44.functions.invoke('runQualityAudit', {
        project_id: form.project_id || 'none', audit_type: type
      });
      alert(`${type} audit: ${r.data.status} — Score: ${r.data.score}/100`);
    } catch (e) { alert('Audit error: ' + e.message); } finally { setAuditLoading(false); }
  };

  const copy = (text) => { navigator.clipboard.writeText(text); };

  const exportKit = () => {
    if (!result?.kit) return;
    const k = result.kit;
    const md = `# Campaign Kit: ${form.campaign_name}\n\n## Facebook Post\n${k.facebook_post}\n\n## Instagram Caption\n${k.instagram_caption}\n\n## Email Subject\n${k.email_subject}\n\n## Email Body\n${k.email_body}\n\n## Press Release\n${k.press_release}\n\n## Ad Copy (Long)\n${k.ad_copy_long}\n\n## CTA Variations\n${(k.cta_variations || []).join('\n')}\n\n## Hashtags\n${(k.hashtags || []).join(' ')}\n`;
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${form.campaign_name.replace(/\s+/g, '_')}_kit.md`; a.click();
  };

  const inputStyle = { width: '100%', background: '#080812', border: '1px solid #2A2A4A', borderRadius: 8, padding: '8px 12px', color: '#E2E8F0', fontSize: 12, fontFamily: 'sans-serif', boxSizing: 'border-box' };
  const labelStyle = { fontSize: 10, color: '#9CA3AF', fontFamily: 'sans-serif', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4, display: 'block' };

  const KitSection = ({ title, content, accent }) => content ? (
    <div style={{ background: '#080812', borderRadius: 8, padding: 14, marginBottom: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 10, color: accent || '#C9A84C', letterSpacing: 2, textTransform: 'uppercase', fontFamily: 'sans-serif', fontWeight: 600 }}>{title}</span>
        <button onClick={() => copy(content)} style={{ background: 'transparent', border: '1px solid #2A2A4A', borderRadius: 6, padding: '3px 8px', cursor: 'pointer', color: '#9CA3AF', fontSize: 10, display: 'flex', alignItems: 'center', gap: 4 }}>
          <Copy size={9} /> Copy
        </button>
      </div>
      <div style={{ fontSize: 12, color: '#CBD5E1', fontFamily: 'sans-serif', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{content}</div>
    </div>
  ) : null;

  return (
    <ForgeLayout title="Campaign Kit Generator" subtitle="Full multichannel campaign copy from a single brief">
      <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 20 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <ForgeCard title="Campaign Brief">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
              <div><label style={labelStyle}>Project</label>
                <select style={inputStyle} value={form.project_id} onChange={e => set('project_id', e.target.value)}>
                  <option value="">No Project</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div><label style={labelStyle}>Campaign Name *</label><input style={inputStyle} value={form.campaign_name} onChange={e => set('campaign_name', e.target.value)} placeholder="e.g. Clever Computelligence Launch" /></div>
              <div><label style={labelStyle}>Campaign Goal *</label><textarea style={{ ...inputStyle, height: 70, resize: 'vertical' }} value={form.campaign_goal} onChange={e => set('campaign_goal', e.target.value)} placeholder="What is this campaign trying to achieve?" /></div>
              <div><label style={labelStyle}>Offer</label><textarea style={{ ...inputStyle, height: 55, resize: 'vertical' }} value={form.offer} onChange={e => set('offer', e.target.value)} placeholder="What are you offering?" /></div>
              <div><label style={labelStyle}>Target Audience</label><input style={inputStyle} value={form.audience} onChange={e => set('audience', e.target.value)} placeholder="e.g. Australian professionals interested in AI" /></div>
              <div><label style={labelStyle}>Tone</label>
                <select style={inputStyle} value={form.tone} onChange={e => set('tone', e.target.value)}>
                  {TONES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div><label style={labelStyle}>CTA</label><input style={inputStyle} value={form.cta} onChange={e => set('cta', e.target.value)} /></div>
              <div><label style={labelStyle}>Launch Date</label><input style={inputStyle} type="date" value={form.launch_date} onChange={e => set('launch_date', e.target.value)} /></div>
              <div>
                <label style={labelStyle}>Platforms</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {PLATFORMS.map(p => (
                    <button key={p} onClick={() => togglePlatform(p)}
                      style={{ padding: '3px 10px', borderRadius: 20, fontSize: 10, fontFamily: 'sans-serif', cursor: 'pointer', background: form.platforms.includes(p) ? '#06B6D422' : 'transparent', border: `1px solid ${form.platforms.includes(p) ? '#06B6D4' : '#2A2A4A'}`, color: form.platforms.includes(p) ? '#67E8F9' : '#6B7280' }}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </ForgeCard>
          <ForgeButton onClick={generate} loading={loading} icon={Megaphone} variant="gold">
            {loading ? 'Generating Kit...' : 'Generate Campaign Kit'}
          </ForgeButton>
          {error && <div style={{ background: '#1A0A0A', border: '1px solid #7F1D1D', borderRadius: 8, padding: 12, fontSize: 11, color: '#EF4444', fontFamily: 'sans-serif' }}>{error}</div>}
          {result?.success && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <ForgeButton variant="ghost" size="sm" icon={Download} onClick={exportKit}>Export Kit (MD)</ForgeButton>
              <ForgeButton variant="ghost" size="sm" icon={ShieldCheck} onClick={() => runAudit('brand_compliance')} loading={auditLoading}>Brand Audit</ForgeButton>
            </div>
          )}
        </div>

        <div>
          {result?.success && result.kit ? (
            <div>
              <div style={{ fontSize: 11, color: '#6EE7B7', fontFamily: 'sans-serif', marginBottom: 14 }}>
                ✓ Campaign kit generated — {result.assets_created} assets saved · Campaign ID: {result.campaign_id}
              </div>
              <KitSection title="Facebook Post" content={result.kit.facebook_post} accent="#3B82F6" />
              <KitSection title="Instagram Caption" content={result.kit.instagram_caption} accent="#EC4899" />
              <KitSection title="Instagram Story" content={result.kit.instagram_story_copy} accent="#EC4899" />
              <KitSection title="Email Subject Line" content={result.kit.email_subject} accent="#10B981" />
              <KitSection title="Email Body" content={result.kit.email_body} accent="#10B981" />
              <KitSection title="Ad Copy (Short)" content={result.kit.ad_copy_short} accent="#F59E0B" />
              <KitSection title="Ad Copy (Long)" content={result.kit.ad_copy_long} accent="#F59E0B" />
              <KitSection title="Press Release" content={result.kit.press_release} accent="#8B5CF6" />
              <KitSection title="Short Video Script" content={result.kit.short_video_script} accent="#06B6D4" />
              {result.kit.cta_variations && (
                <div style={{ background: '#080812', borderRadius: 8, padding: 14, marginBottom: 10 }}>
                  <span style={{ fontSize: 10, color: '#C9A84C', letterSpacing: 2, textTransform: 'uppercase', fontFamily: 'sans-serif', fontWeight: 600 }}>CTA Variations</span>
                  <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {result.kit.cta_variations.map((cta, i) => (
                      <span key={i} onClick={() => copy(cta)} style={{ padding: '4px 12px', background: '#C9A84C22', border: '1px solid #C9A84C44', borderRadius: 20, fontSize: 11, color: '#C9A84C', fontFamily: 'sans-serif', cursor: 'pointer' }}>{cta}</span>
                    ))}
                  </div>
                </div>
              )}
              {result.kit.image_generation_prompts && (
                <div style={{ background: '#080812', borderRadius: 8, padding: 14, marginBottom: 10 }}>
                  <span style={{ fontSize: 10, color: '#8B5CF6', letterSpacing: 2, textTransform: 'uppercase', fontFamily: 'sans-serif', fontWeight: 600 }}>Image Prompts</span>
                  {result.kit.image_generation_prompts.map((p, i) => (
                    <div key={i} style={{ marginTop: 6, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                      <span style={{ fontSize: 10, color: '#8B5CF6', fontFamily: 'sans-serif', flexShrink: 0 }}>{i + 1}.</span>
                      <span style={{ fontSize: 11, color: '#CBD5E1', fontFamily: 'sans-serif' }}>{p}</span>
                      <button onClick={() => copy(p)} style={{ background: 'transparent', border: '1px solid #2A2A4A', borderRadius: 4, padding: '2px 6px', cursor: 'pointer', color: '#9CA3AF', fontSize: 9, flexShrink: 0 }}>Copy</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <ForgeCard title="Previous Campaigns">
              {campaigns.length === 0 ? (
                <p style={{ color: '#374151', fontSize: 12, fontFamily: 'sans-serif' }}>No campaigns yet. Generate your first campaign kit.</p>
              ) : campaigns.map(c => (
                <div key={c.id} style={{ padding: '10px 0', borderBottom: '1px solid #1E1E35' }}>
                  <div style={{ fontSize: 12, color: '#E2E8F0', fontFamily: 'sans-serif', fontWeight: 500 }}>{c.name}</div>
                  <div style={{ fontSize: 10, color: '#4B5563', fontFamily: 'sans-serif' }}>{c.campaign_type} · {c.status} · {c.channels?.join(', ')}</div>
                </div>
              ))}
            </ForgeCard>
          )}
        </div>
      </div>
    </ForgeLayout>
  );
}