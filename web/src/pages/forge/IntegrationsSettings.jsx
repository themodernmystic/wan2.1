import React, { useState } from 'react';
import { CheckCircle, AlertCircle, Clock, Settings, Zap } from 'lucide-react';
import ForgeLayout from '@/components/forge/ForgeLayout';
import ForgeCard from '@/components/forge/ForgeCard';
import ForgeButton from '@/components/forge/ForgeButton';
import { base44 } from '@/api/base44Client';

const PROVIDERS = {
  image: [
    { key: 'openai_images', name: 'OpenAI Images', models: ['DALL-E 3', 'DALL-E 2'], secretKey: 'OPENAI_API_KEY', docs: 'https://platform.openai.com/api-keys', status: 'unknown', note: 'Required for image generation' },
    { key: 'replicate', name: 'Replicate', models: ['SDXL', 'Flux', 'Ideogram'], secretKey: 'REPLICATE_API_KEY', docs: 'https://replicate.com/account/api-tokens', status: 'not_configured', note: 'Alternative image models' },
    { key: 'stability', name: 'Stability AI', models: ['Stable Diffusion XL'], secretKey: 'STABILITY_API_KEY', docs: 'https://platform.stability.ai/', status: 'not_configured', note: 'Stable Diffusion models' },
  ],
  video: [
    { key: 'base44_video', name: 'Base44 / Veo', models: ['Veo 3.x'], secretKey: null, docs: null, status: 'active', note: 'Built-in, no API key required. Uses integration credits.' },
    { key: 'runway', name: 'Runway', models: ['Gen-3 Alpha', 'Gen-2'], secretKey: 'RUNWAY_API_KEY', docs: 'https://app.runwayml.com/account', status: 'not_configured', note: 'Professional video generation' },
    { key: 'luma', name: 'Luma AI', models: ['Dream Machine'], secretKey: 'LUMA_API_KEY', docs: 'https://lumalabs.ai/', status: 'not_configured', note: 'Realistic video generation' },
    { key: 'pika', name: 'Pika', models: ['Pika 1.0', 'Pika 2.0'], secretKey: 'PIKA_API_KEY', docs: 'https://pika.art/', status: 'not_configured', note: 'Creative video generation' },
  ],
  voice: [
    { key: 'elevenlabs', name: 'ElevenLabs', models: ['Multilingual v2', 'Turbo v2'], secretKey: 'ELEVENLABS_API_KEY', docs: 'https://elevenlabs.io/', status: 'not_configured', note: 'Voice synthesis and cloning' },
    { key: 'openai_tts', name: 'OpenAI TTS', models: ['TTS-1', 'TTS-1-HD'], secretKey: 'OPENAI_API_KEY', docs: 'https://platform.openai.com/', status: 'unknown', note: 'Uses same key as image generation' },
  ],
  deployment: [
    { key: 'vercel', name: 'Vercel', models: ['Edge Network'], secretKey: 'VERCEL_API_KEY', docs: 'https://vercel.com/account/tokens', status: 'not_configured', note: 'Landing page hosting' },
    { key: 'cloudflare', name: 'Cloudflare Pages', models: ['Workers/Pages'], secretKey: 'CLOUDFLARE_API_TOKEN', docs: 'https://dash.cloudflare.com/profile/api-tokens', status: 'not_configured', note: 'Edge hosting' },
  ],
  storage: [
    { key: 'base44_storage', name: 'Base44 Storage', models: ['Built-in'], secretKey: null, docs: null, status: 'active', note: 'Default file storage — always available' },
    { key: 'cloudflare_r2', name: 'Cloudflare R2', models: ['S3-compatible'], secretKey: 'R2_ACCESS_KEY_ID', docs: 'https://dash.cloudflare.com/', status: 'not_configured', note: 'Large file storage' },
  ],
  email: [
    { key: 'resend', name: 'Resend', models: ['Transactional'], secretKey: 'RESEND_API_KEY', docs: 'https://resend.com/', status: 'not_configured', note: 'Email delivery for ebook fulfilment' },
    { key: 'sendgrid', name: 'SendGrid', models: ['Transactional', 'Marketing'], secretKey: 'SENDGRID_API_KEY', docs: 'https://sendgrid.com/', status: 'not_configured', note: 'Alternative email delivery' },
  ],
};

const STATUS_CONFIG = {
  active: { color: '#10B981', label: 'Active', icon: '✓' },
  configured: { color: '#10B981', label: 'Configured', icon: '✓' },
  not_configured: { color: '#6B7280', label: 'Not Configured', icon: '○' },
  missing_key: { color: '#EF4444', label: 'Missing Key', icon: '✗' },
  test_failed: { color: '#EF4444', label: 'Test Failed', icon: '✗' },
  unknown: { color: '#F59E0B', label: 'Unknown', icon: '?' },
};

const CATEGORY_LABELS = { image: 'Image Generation', video: 'Video Generation', voice: 'Voice / Audio', deployment: 'Deployment', storage: 'Storage', email: 'Email Delivery' };
const CATEGORY_COLORS = { image: '#3B82F6', video: '#8B5CF6', voice: '#EC4899', deployment: '#10B981', storage: '#F59E0B', email: '#06B6D4' };

export default function IntegrationsSettings() {
  const [providerStatuses, setProviderStatuses] = useState({});
  const [testing, setTesting] = useState(null);
  const [testErrors, setTestErrors] = useState({});

  const testProvider = async (provider) => {
    setTesting(provider.key);
    try {
      if (!provider.secretKey) {
        // Built-in providers (Base44 storage/video) are always active
        setProviderStatuses(s => ({ ...s, [provider.key]: 'active' }));
      } else {
        const res = await base44.functions.invoke('testIntegrationKey', { secret_key: provider.secretKey });
        const data = res.data;
        setProviderStatuses(s => ({ ...s, [provider.key]: data.ok ? 'configured' : 'missing_key' }));
        if (!data.ok && data.reason) {
          setTestErrors(e => ({ ...e, [provider.key]: data.reason }));
        } else {
          setTestErrors(e => { const n = { ...e }; delete n[provider.key]; return n; });
        }
      }
    } catch (err) {
      setProviderStatuses(s => ({ ...s, [provider.key]: 'test_failed' }));
      setTestErrors(e => ({ ...e, [provider.key]: err.message }));
    }
    setTesting(null);
  };

  const getStatus = (p) => providerStatuses[p.key] || p.status;

  return (
    <ForgeLayout title="Integrations & Settings" subtitle="Provider configuration, API keys, and connection status">
      <div style={{ background: '#1A1000', border: '1px solid #F59E0B', borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: 11, color: '#FCD34D', fontFamily: 'sans-serif' }}>
        <strong>API Keys:</strong> Set provider API keys in Base44 Dashboard → Settings → Environment Variables. Keys are never stored here — set them directly in the platform settings.
      </div>

      {Object.entries(PROVIDERS).map(([category, providers]) => (
        <div key={category} style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, color: CATEGORY_COLORS[category], letterSpacing: 3, textTransform: 'uppercase', fontFamily: 'sans-serif', fontWeight: 600, marginBottom: 12 }}>{CATEGORY_LABELS[category]}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
            {providers.map(provider => {
              const status = getStatus(provider);
              const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.unknown;
              return (
                <div key={provider.key} style={{ background: '#0E0E1C', border: `1px solid ${cfg.color}33`, borderRadius: 10, padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div>
                      <div style={{ fontSize: 12, color: '#E2E8F0', fontFamily: 'sans-serif', fontWeight: 600 }}>{provider.name}</div>
                      <div style={{ fontSize: 10, color: '#4B5563', fontFamily: 'sans-serif' }}>{provider.models.join(', ')}</div>
                    </div>
                    <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: `${cfg.color}22`, color: cfg.color, border: `1px solid ${cfg.color}44`, fontFamily: 'sans-serif', whiteSpace: 'nowrap', flexShrink: 0 }}>
                      {cfg.icon} {cfg.label}
                    </span>
                  </div>
                  <div style={{ fontSize: 10, color: '#6B7280', fontFamily: 'sans-serif', marginBottom: 10 }}>{provider.note}</div>
                  {provider.secretKey && (
                    <div style={{ background: '#080812', border: '1px solid #2A2A4A', borderRadius: 6, padding: '6px 10px', marginBottom: 10 }}>
                      <span style={{ fontSize: 10, color: '#4B5563', fontFamily: 'sans-serif' }}>ENV VAR: </span>
                      <code style={{ fontSize: 10, color: '#C9A84C', fontFamily: 'monospace' }}>{provider.secretKey}</code>
                    </div>
                  )}
                  {testErrors[provider.key] && (
                    <div style={{ fontSize: 9, color: '#EF4444', fontFamily: 'sans-serif', marginBottom: 6, background: '#2A0A0A', border: '1px solid #EF444433', borderRadius: 4, padding: '4px 8px', wordBreak: 'break-word' }}>
                      {testErrors[provider.key]}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => testProvider(provider)} disabled={testing === provider.key}
                      style={{ flex: 1, background: 'transparent', border: `1px solid ${CATEGORY_COLORS[category]}44`, borderRadius: 6, padding: '5px 8px', cursor: 'pointer', color: CATEGORY_COLORS[category], fontSize: 10, fontFamily: 'sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                      {testing === provider.key ? (
                        <span style={{ display: 'inline-block', width: 10, height: 10, border: `1.5px solid ${CATEGORY_COLORS[category]}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                      ) : <Zap size={10} />}
                      Test
                    </button>
                    {provider.docs && (
                      <a href={provider.docs} target="_blank" rel="noreferrer"
                        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: '1px solid #2A2A4A', borderRadius: 6, padding: '5px 8px', color: '#6B7280', fontSize: 10, fontFamily: 'sans-serif', textDecoration: 'none' }}>
                        Get API Key
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </ForgeLayout>
  );
}