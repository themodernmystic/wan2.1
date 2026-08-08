import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Image, RefreshCw, Download, CheckCircle, X, ShieldCheck, Loader2, Eye } from 'lucide-react';
import ForgeLayout from '@/components/forge/ForgeLayout';
import ForgeCard from '@/components/forge/ForgeCard';
import ForgeButton from '@/components/forge/ForgeButton';

const STYLE_PRESETS = ['None', 'Cinematic', 'Digital Art', 'Photorealistic', 'Oil Painting', 'Watercolour', 'Noir', 'Mystical / Hermetic', 'Minimalist', 'Sacred Geometry'];
const DIMENSIONS = ['1024x1024', '1792x1024', '1024x1792', '512x512'];
const PROVIDERS = ['openai'];
const MODELS = ['dall-e-3', 'dall-e-2'];

export default function ImageGenerator() {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    project_id: '', asset_name: '', prompt: '', negative_prompt: '',
    style: 'None', dimensions: '1024x1024', provider: 'openai',
    model: 'dall-e-3', variation_count: 1
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [preview, setPreview] = useState(null);
  const [auditLoading, setAuditLoading] = useState(false);

  const { data: projects = [] } = useQuery({ queryKey: ['riley-projects-list'], queryFn: () => base44.entities.RileyProject.list() });
  const { data: recentAssets = [] } = useQuery({ queryKey: ['image-assets'], queryFn: () => base44.entities.GeneratedAsset.filter({ asset_type: 'image' }, '-created_date', 20) });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const generate = async () => {
    if (!form.asset_name || !form.prompt) { setError('Asset name and prompt are required.'); return; }
    setLoading(true); setError(null); setResult(null);
    try {
      const r = await base44.functions.invoke('generateImage', {
        ...form,
        style: form.style === 'None' ? null : form.style,
        variation_count: Number(form.variation_count)
      });
      if (r.data.success) {
        setResult(r.data);
        qc.invalidateQueries(['image-assets']);
      } else {
        setError(r.data.error || 'Generation failed.');
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const approve = async (assetId) => {
    await base44.entities.GeneratedAsset.update(assetId, { status: 'approved' });
    qc.invalidateQueries(['image-assets']);
  };
  const reject = async (assetId) => {
    await base44.entities.GeneratedAsset.update(assetId, { status: 'rejected' });
    qc.invalidateQueries(['image-assets']);
  };

  const runAudit = async (assetId, auditType) => {
    setAuditLoading(true);
    try {
      await base44.functions.invoke('runQualityAudit', { project_id: form.project_id || 'none', asset_id: assetId, audit_type: auditType });
      alert(`${auditType} audit complete. Check QA Audit Centre.`);
    } catch (e) { alert('Audit error: ' + e.message); } finally { setAuditLoading(false); }
  };

  const inputStyle = { width: '100%', background: '#080812', border: '1px solid #2A2A4A', borderRadius: 8, padding: '9px 12px', color: '#E2E8F0', fontSize: 12, fontFamily: 'sans-serif', boxSizing: 'border-box' };
  const labelStyle = { fontSize: 10, color: '#9CA3AF', fontFamily: 'sans-serif', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 5, display: 'block' };

  return (
    <ForgeLayout title="Image Generator" subtitle="AI-powered image creation with real render validation">
      <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 20 }}>
        {/* Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <ForgeCard title="Configuration">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={labelStyle}>Project</label>
                <select style={inputStyle} value={form.project_id} onChange={e => set('project_id', e.target.value)}>
                  <option value="">No Project</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Asset Name *</label>
                <input style={inputStyle} value={form.asset_name} onChange={e => set('asset_name', e.target.value)} placeholder="e.g. Ebook Cover v1" />
              </div>
              <div>
                <label style={labelStyle}>Prompt *</label>
                <textarea style={{ ...inputStyle, height: 90, resize: 'vertical' }} value={form.prompt} onChange={e => set('prompt', e.target.value)} placeholder="Describe the image in detail..." />
              </div>
              <div>
                <label style={labelStyle}>Negative Prompt</label>
                <textarea style={{ ...inputStyle, height: 60, resize: 'vertical' }} value={form.negative_prompt} onChange={e => set('negative_prompt', e.target.value)} placeholder="What to exclude..." />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={labelStyle}>Style Preset</label>
                  <select style={inputStyle} value={form.style} onChange={e => set('style', e.target.value)}>
                    {STYLE_PRESETS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Dimensions</label>
                  <select style={inputStyle} value={form.dimensions} onChange={e => set('dimensions', e.target.value)}>
                    {DIMENSIONS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Provider</label>
                  <select style={inputStyle} value={form.provider} onChange={e => set('provider', e.target.value)}>
                    {PROVIDERS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Model</label>
                  <select style={inputStyle} value={form.model} onChange={e => set('model', e.target.value)}>
                    {MODELS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={labelStyle}>Variations (DALL-E 2 only)</label>
                <input style={inputStyle} type="number" min={1} max={4} value={form.variation_count} onChange={e => set('variation_count', e.target.value)} />
              </div>
            </div>
          </ForgeCard>

          <ForgeButton onClick={generate} loading={loading} icon={Image} variant="gold">
            {loading ? 'Generating...' : 'Generate Image'}
          </ForgeButton>

          {error && (
            <div style={{ background: '#1A0A0A', border: '1px solid #7F1D1D', borderRadius: 8, padding: 14 }}>
              <div style={{ fontSize: 11, color: '#EF4444', fontFamily: 'sans-serif', fontWeight: 600, marginBottom: 4 }}>Generation Failed</div>
              <div style={{ fontSize: 11, color: '#FCA5A5', fontFamily: 'sans-serif' }}>{error}</div>
              {result?.configuration_required && (
                <div style={{ fontSize: 10, color: '#9CA3AF', fontFamily: 'sans-serif', marginTop: 6 }}>
                  Fix: {result.configuration_required}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Results */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {result?.success && result.file_urls?.length > 0 && (
            <ForgeCard title="Generated Images" accent="#10B981">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                {result.file_urls.map((url, i) => {
                  const asset = result.assets?.[i];
                  return (
                    <div key={i} style={{ background: '#080812', borderRadius: 8, overflow: 'hidden', border: '1px solid #2A2A4A' }}>
                      <div style={{ position: 'relative' }}>
                        <img src={url} alt={`Generated ${i + 1}`} style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }} />
                        <button onClick={() => setPreview(url)} style={{ position: 'absolute', top: 6, right: 6, background: '#00000080', border: 'none', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', color: '#fff', fontSize: 10 }}>
                          <Eye size={12} />
                        </button>
                      </div>
                      {asset && (
                        <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <div style={{ fontSize: 10, color: '#9CA3AF', fontFamily: 'sans-serif' }}>ID: {asset.id?.substring(0, 8)}... · {result.model_used}</div>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            <button onClick={() => approve(asset.id)} style={{ flex: 1, background: '#052e16', border: '1px solid #10B981', borderRadius: 6, padding: '5px 8px', cursor: 'pointer', color: '#6EE7B7', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                              <CheckCircle size={10} /> Approve
                            </button>
                            <button onClick={() => reject(asset.id)} style={{ flex: 1, background: '#1a0a0a', border: '1px solid #EF4444', borderRadius: 6, padding: '5px 8px', cursor: 'pointer', color: '#FCA5A5', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                              <X size={10} /> Reject
                            </button>
                            <a href={url} download target="_blank" rel="noreferrer" style={{ flex: 1, background: '#0E1525', border: '1px solid #3B82F6', borderRadius: 6, padding: '5px 8px', cursor: 'pointer', color: '#93C5FD', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, textDecoration: 'none' }}>
                              <Download size={10} /> Download
                            </a>
                          </div>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button onClick={() => runAudit(asset.id, 'render_quality')} disabled={auditLoading} style={{ flex: 1, background: 'transparent', border: '1px solid #1E293B', borderRadius: 6, padding: '4px 6px', cursor: 'pointer', color: '#9CA3AF', fontSize: 9 }}>
                              QA: Render
                            </button>
                            <button onClick={() => runAudit(asset.id, 'brand_compliance')} disabled={auditLoading} style={{ flex: 1, background: 'transparent', border: '1px solid #1E293B', borderRadius: 6, padding: '4px 6px', cursor: 'pointer', color: '#9CA3AF', fontSize: 9 }}>
                              QA: Brand
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div style={{ fontSize: 10, color: '#4B5563', fontFamily: 'sans-serif', marginTop: 12 }}>
                Render Job: {result.render_job_id} · Provider: {result.provider_used} · Duration: {result.duration_ms}ms
              </div>
            </ForgeCard>
          )}

          {/* Recent Assets Gallery */}
          <ForgeCard title="Recent Image Assets">
            {recentAssets.length === 0 ? (
              <p style={{ color: '#374151', fontSize: 12, fontFamily: 'sans-serif' }}>No images generated yet.</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 8 }}>
                {recentAssets.slice(0, 24).map(a => (
                  <div key={a.id} style={{ position: 'relative', cursor: 'pointer' }} onClick={() => a.file_url && setPreview(a.file_url)}>
                    {a.file_url || a.preview_url ? (
                      <img src={a.file_url || a.preview_url} alt={a.name} style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 6, border: `1px solid ${a.status === 'approved' ? '#10B981' : a.status === 'rejected' ? '#EF4444' : '#2A2A4A'}` }} />
                    ) : (
                      <div style={{ width: '100%', aspectRatio: '1', background: '#080812', borderRadius: 6, border: '1px solid #2A2A4A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: 9, color: '#374151', fontFamily: 'sans-serif', textAlign: 'center', padding: 4 }}>{a.status}</span>
                      </div>
                    )}
                    <div style={{ position: 'absolute', bottom: 2, left: 2, right: 2, background: '#00000090', borderRadius: 4, padding: '2px 4px', fontSize: 8, color: '#E2E8F0', fontFamily: 'sans-serif', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{a.name}</div>
                  </div>
                ))}
              </div>
            )}
          </ForgeCard>
        </div>
      </div>

      {/* Preview Modal */}
      {preview && (
        <div onClick={() => setPreview(null)} style={{ position: 'fixed', inset: 0, background: '#00000090', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, cursor: 'pointer' }}>
          <img src={preview} alt="Preview" style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: 12, border: '1px solid #C9A84C' }} onClick={e => e.stopPropagation()} />
        </div>
      )}
    </ForgeLayout>
  );
}