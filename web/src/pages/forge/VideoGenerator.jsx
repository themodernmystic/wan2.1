import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Film, Download, AlertCircle, Play } from 'lucide-react';
import ForgeLayout from '@/components/forge/ForgeLayout';
import ForgeCard from '@/components/forge/ForgeCard';
import ForgeButton from '@/components/forge/ForgeButton';

const DURATIONS = [4, 6, 8];
const ASPECT_RATIOS = ['16:9', '9:16'];
const STYLE_PRESETS = ['None', 'Cinematic', 'Documentary', 'Animated', 'Mystical / Ethereal', 'Corporate Clean', 'Dramatic', 'Time-lapse'];

export default function VideoGenerator() {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    project_id: '', video_name: '', prompt: '', duration: 6,
    aspect_ratio: '16:9', style: 'None', provider: 'base44'
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const { data: projects = [] } = useQuery({ queryKey: ['riley-projects-list'], queryFn: () => base44.entities.RileyProject.list() });
  const { data: videoAssets = [] } = useQuery({ queryKey: ['video-assets'], queryFn: () => base44.entities.GeneratedAsset.filter({ asset_type: 'video' }, '-created_date', 10) });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const generate = async () => {
    if (!form.video_name || !form.prompt) { setError('Video name and prompt are required.'); return; }
    setLoading(true); setError(null); setResult(null);
    try {
      const r = await base44.functions.invoke('generateVideo', {
        ...form,
        style: form.style === 'None' ? null : form.style
      });
      if (r.data.success) { setResult(r.data); qc.invalidateQueries(['video-assets']); }
      else setError(r.data.error || 'Generation failed.');
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  };

  const inputStyle = { width: '100%', background: '#080812', border: '1px solid #2A2A4A', borderRadius: 8, padding: '8px 12px', color: '#E2E8F0', fontSize: 12, fontFamily: 'sans-serif', boxSizing: 'border-box' };
  const labelStyle = { fontSize: 10, color: '#9CA3AF', fontFamily: 'sans-serif', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4, display: 'block' };

  return (
    <ForgeLayout title="Video Generator" subtitle="AI video generation via Base44 / Veo · Runway and Luma coming soon">
      <div style={{ background: '#0E1A0E', border: '1px solid #10B981', borderRadius: 10, padding: '10px 14px', marginBottom: 20, fontSize: 11, color: '#6EE7B7', fontFamily: 'sans-serif' }}>
        ✓ Currently supported: <strong>Base44 / Veo</strong> (built-in, no API key required) — 6-second videos, 16:9 or 9:16 · Each video costs integration credits.
      </div>
      <div style={{ background: '#1A1000', border: '1px solid #F59E0B', borderRadius: 10, padding: '10px 14px', marginBottom: 20, fontSize: 11, color: '#FCD34D', fontFamily: 'sans-serif' }}>
        ⏳ Coming Soon: Runway, Luma, Pika — set RUNWAY_API_KEY / LUMA_API_KEY / PIKA_API_KEY in environment variables when ready.
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 20 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <ForgeCard title="Video Configuration">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
              <div><label style={labelStyle}>Project</label>
                <select style={inputStyle} value={form.project_id} onChange={e => set('project_id', e.target.value)}>
                  <option value="">No Project</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div><label style={labelStyle}>Video Name *</label><input style={inputStyle} value={form.video_name} onChange={e => set('video_name', e.target.value)} placeholder="e.g. Fundraiser Hero Video" /></div>
              <div><label style={labelStyle}>Prompt *</label>
                <textarea style={{ ...inputStyle, height: 100, resize: 'vertical' }} value={form.prompt} onChange={e => set('prompt', e.target.value)}
                  placeholder="Describe the video in detail. Include subject, action, lighting, mood, setting..." />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div><label style={labelStyle}>Duration (seconds)</label>
                  <select style={inputStyle} value={form.duration} onChange={e => set('duration', Number(e.target.value))}>
                    {DURATIONS.map(d => <option key={d} value={d}>{d}s</option>)}
                  </select>
                </div>
                <div><label style={labelStyle}>Aspect Ratio</label>
                  <select style={inputStyle} value={form.aspect_ratio} onChange={e => set('aspect_ratio', e.target.value)}>
                    {ASPECT_RATIOS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>
              <div><label style={labelStyle}>Style Preset</label>
                <select style={inputStyle} value={form.style} onChange={e => set('style', e.target.value)}>
                  {STYLE_PRESETS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div><label style={labelStyle}>Provider</label>
                <select style={inputStyle} value={form.provider} onChange={e => set('provider', e.target.value)}>
                  <option value="base44">Base44 / Veo (Active)</option>
                  <option value="runway" disabled>Runway (Not Configured)</option>
                  <option value="luma" disabled>Luma (Not Configured)</option>
                  <option value="pika" disabled>Pika (Not Configured)</option>
                </select>
              </div>
            </div>
          </ForgeCard>
          <ForgeButton onClick={generate} loading={loading} icon={Film} variant="gold">
            {loading ? 'Generating Video...' : 'Generate Video'}
          </ForgeButton>
          {error && (
            <div style={{ background: '#1A0A0A', border: '1px solid #7F1D1D', borderRadius: 8, padding: 12 }}>
              <div style={{ fontSize: 11, color: '#EF4444', fontFamily: 'sans-serif', fontWeight: 600, marginBottom: 4 }}>Generation Failed</div>
              <div style={{ fontSize: 11, color: '#FCA5A5', fontFamily: 'sans-serif' }}>{error}</div>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {result?.success && (
            <ForgeCard title="Video Generated" accent="#10B981">
              <div style={{ fontSize: 12, color: '#6EE7B7', fontFamily: 'sans-serif', marginBottom: 12 }}>Video created successfully.</div>
              {result.video_url && (
                <div>
                  <video controls style={{ width: '100%', borderRadius: 8, border: '1px solid #2A2A4A', maxHeight: 400 }} src={result.video_url}>
                    Your browser does not support the video tag.
                  </video>
                  <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                    <a href={result.video_url} download target="_blank" rel="noreferrer"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#C9A84C', color: '#080812', padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700, textDecoration: 'none', fontFamily: 'sans-serif' }}>
                      <Download size={13} /> Download Video
                    </a>
                  </div>
                </div>
              )}
              <div style={{ fontSize: 10, color: '#4B5563', fontFamily: 'sans-serif', marginTop: 8 }}>
                Asset: {result.asset_id} · Job: {result.render_job_id} · {result.duration_ms}ms
              </div>
            </ForgeCard>
          )}

          <ForgeCard title="Previous Videos">
            {videoAssets.length === 0 ? (
              <p style={{ color: '#374151', fontSize: 12, fontFamily: 'sans-serif' }}>No videos generated yet.</p>
            ) : videoAssets.map(a => (
              <div key={a.id} style={{ padding: '10px 0', borderBottom: '1px solid #1E1E35' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div>
                    <div style={{ fontSize: 12, color: '#E2E8F0', fontFamily: 'sans-serif', fontWeight: 500 }}>{a.name}</div>
                    <div style={{ fontSize: 10, color: '#4B5563', fontFamily: 'sans-serif' }}>{a.status} · {a.duration_seconds}s · {a.provider}</div>
                  </div>
                  {a.file_url && (
                    <a href={a.file_url} download target="_blank" rel="noreferrer"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#0E1525', border: '1px solid #3B82F6', borderRadius: 6, padding: '5px 10px', color: '#93C5FD', fontSize: 10, textDecoration: 'none', fontFamily: 'sans-serif' }}>
                      <Download size={10} /> Download
                    </a>
                  )}
                </div>
                {a.file_url && (
                  <video controls style={{ width: '100%', borderRadius: 6, maxHeight: 200 }} src={a.file_url} />
                )}
              </div>
            ))}
          </ForgeCard>
        </div>
      </div>
    </ForgeLayout>
  );
}