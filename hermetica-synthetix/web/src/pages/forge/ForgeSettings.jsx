import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Settings, Database, Cpu, AlertTriangle, MessageSquare, Volume2, Check } from 'lucide-react';
import ForgeLayout from '@/components/forge/ForgeLayout';
import ForgeCard from '@/components/forge/ForgeCard';
import ForgeButton from '@/components/forge/ForgeButton';
import ForgeBadge from '@/components/forge/ForgeBadge';
import { toast } from 'sonner';

const GOLD = '#C9A84C';

export default function ForgeSettings() {
  const [localModels, setLocalModels] = useState([]);
  const [newModel, setNewModel] = useState({ provider_name: '', runtime: 'Ollama', model_name: '', endpoint_url: '', connection_status: 'Endpoint Not Configured', use_cases: '', limitations: '', setup_notes: '' });
  const [showNewModel, setShowNewModel] = useState(false);
  const [testing, setTesting] = useState(null);
  const [chatProvider, setChatProvider] = useState(() => localStorage.getItem('riley_chat_provider') || 'base44');
  const [chatSaved, setChatSaved] = useState(false);
  const [ollamaEndpoint, setOllamaEndpoint] = useState(() => localStorage.getItem('riley_ollama_endpoint') || '');
  const [customEndpoint, setCustomEndpoint] = useState(() => localStorage.getItem('riley_custom_endpoint') || '');
  const [customKey, setCustomKey] = useState(() => localStorage.getItem('riley_custom_key') || '');
  const [voiceProvider, setVoiceProvider] = useState(() => localStorage.getItem('riley_voice_provider') || 'off');
  const [voiceSaved, setVoiceSaved] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(() => localStorage.getItem('riley_auto_speak') === 'true');

  const flashSaved = (setter) => {
    setter(true);
    setTimeout(() => setter(false), 1200);
  };

  const selectChatProvider = (value) => {
    setChatProvider(value);
    localStorage.setItem('riley_chat_provider', value);
    flashSaved(setChatSaved);
  };

  const saveProviderSettings = () => {
    localStorage.setItem('riley_chat_provider', chatProvider);
    localStorage.setItem('riley_ollama_endpoint', ollamaEndpoint);
    localStorage.setItem('riley_custom_endpoint', customEndpoint);
    localStorage.setItem('riley_custom_key', customKey);
    flashSaved(setChatSaved);
  };

  const selectVoiceProvider = (value) => {
    setVoiceProvider(value);
    localStorage.setItem('riley_voice_provider', value);
    flashSaved(setVoiceSaved);
  };

  const saveVoiceSettings = () => {
    localStorage.setItem('riley_voice_provider', voiceProvider);
    localStorage.setItem('riley_auto_speak', autoSpeak ? 'true' : 'false');
    flashSaved(setVoiceSaved);
  };

  const { data: models = [], isLoading, refetch } = useQuery({ queryKey: ['local-models'], queryFn: () => base44.entities.LocalModelProvider.list('-created_date', 20) });

  const handleCreate = async () => {
    if (!newModel.provider_name) return;
    await base44.entities.LocalModelProvider.create({ ...newModel });
    refetch();
    setShowNewModel(false);
    setNewModel({ provider_name: '', runtime: 'Ollama', model_name: '', endpoint_url: '', connection_status: 'Endpoint Not Configured', use_cases: '', limitations: '', setup_notes: '' });
    toast.success('Model provider added');
  };

  const handleTest = async (m) => {
    setTesting(m.id);
    const res = await base44.functions.invoke('rileyTestLocalModelProvider', { provider_id: m.id, test_prompt: m.test_prompt || 'Hello. Respond in one sentence.' });
    refetch();
    setTesting(null);
    if (res.data?.status === 'connected') toast.success('Connected successfully');
    else toast.info('Manual workflow — see result below');
  };

  const inputStyle = { width: '100%', background: '#080812', border: '1px solid #1E293B', borderRadius: 6, padding: '8px 12px', color: '#CBD5E1', fontSize: 12, fontFamily: 'sans-serif', outline: 'none', boxSizing: 'border-box' };

  return (
    <ForgeLayout title="Settings" subtitle="Local models · Preferences · Danger zone">
      {/* Info banner */}
      <div style={{ background: '#172554', border: '1px solid #1D4ED8', borderRadius: 8, padding: '12px 16px', marginBottom: 24, fontSize: 12, color: '#93C5FD', fontFamily: 'sans-serif', lineHeight: 1.7 }}>
        <strong>Riley Forge</strong> is built for manual-first, credit-saving, privacy-preserving workflows.
        External integrations are placeholders unless explicitly connected. Local model support uses manual copy/paste workflows by default.
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* AI Chat Provider */}
        <ForgeCard title="AI Chat Provider" accent="#C9A84C"
          actions={
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {chatSaved && <span style={{ fontSize: 11, color: '#4ade80', display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'sans-serif' }}><Check size={12} /> Saved</span>}
              <ForgeButton icon={MessageSquare} variant="gold" size="sm" onClick={saveProviderSettings}>Save</ForgeButton>
            </div>
          }
        >
          <div style={{ fontSize: 11, color: '#4B5563', fontFamily: 'sans-serif', lineHeight: 1.7, marginBottom: 16 }}>
            Choose how Riley sends chat messages. Gemini, Grok, Ollama, and Custom bypass Base44 integration credits entirely.
          </div>

          {[
            { value: 'base44', label: 'Base44 (Default)', desc: 'Uses InvokeLLM — consumes integration credits', badge: 'credits' },
            { value: 'gemini', label: 'Gemini (Google)', desc: 'Calls Gemini API directly via GEMINI_API_KEY — no credits', badge: 'free' },
            { value: 'grok', label: 'Grok API (xAI)', desc: 'Calls Grok API directly via GROK_API_KEY — no credits', badge: 'free' },
            { value: 'ollama', label: 'Ollama Local', desc: 'Calls local Ollama via OLLAMA_ENDPOINT — fully free', badge: 'free' },
            { value: 'custom', label: 'Custom LLM', desc: 'Your own OpenAI-compatible endpoint', badge: 'free' },
          ].map(opt => (
            <div
              key={opt.value}
              onClick={() => selectChatProvider(opt.value)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', marginBottom: 8,
                background: chatProvider === opt.value ? '#C9A84C12' : '#080812',
                border: `1px solid ${chatProvider === opt.value ? '#C9A84C55' : '#1E293B'}`,
                borderRadius: 8, cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              <div style={{
                width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
                border: `2px solid ${chatProvider === opt.value ? '#C9A84C' : '#374151'}`,
                background: chatProvider === opt.value ? '#C9A84C' : 'transparent',
              }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: chatProvider === opt.value ? '#C9A84C' : '#E2E8F0', fontFamily: 'sans-serif' }}>{opt.label}</div>
                <div style={{ fontSize: 11, color: '#4B5563', fontFamily: 'sans-serif', marginTop: 2 }}>{opt.desc}</div>
              </div>
              <span style={{
                fontSize: 9, padding: '2px 8px', borderRadius: 20, fontFamily: 'sans-serif', fontWeight: 600, letterSpacing: 1,
                background: opt.badge === 'credits' ? '#1c1108' : '#052e16',
                color: opt.badge === 'credits' ? '#fbbf24' : '#4ade80',
                border: `1px solid ${opt.badge === 'credits' ? '#92400e' : '#166534'}`,
              }}>
                {opt.badge === 'credits' ? 'USES CREDITS' : 'NO CREDITS'}
              </span>
            </div>
          ))}

          {chatProvider === 'ollama' && (
            <div style={{ marginTop: 12, padding: '12px 14px', background: '#080812', border: '1px solid #1E293B', borderRadius: 8 }}>
              <label style={{ fontSize: 10, color: '#4B5563', display: 'block', marginBottom: 6, fontFamily: 'sans-serif', letterSpacing: 1 }}>OLLAMA ENDPOINT (overrides OLLAMA_ENDPOINT env var for this browser)</label>
              <input
                value={ollamaEndpoint}
                onChange={e => setOllamaEndpoint(e.target.value)}
                placeholder="e.g. https://your-ngrok-url.ngrok.io"
                style={inputStyle}
              />
              <div style={{ fontSize: 10, color: '#374151', fontFamily: 'sans-serif', marginTop: 6 }}>
                For local Ollama, use an ngrok tunnel or similar. The OLLAMA_ENDPOINT backend env var is preferred.
              </div>
            </div>
          )}

          {chatProvider === 'custom' && (
            <div style={{ marginTop: 12, padding: '12px 14px', background: '#080812', border: '1px solid #1E293B', borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <label style={{ fontSize: 10, color: '#4B5563', display: 'block', marginBottom: 4, fontFamily: 'sans-serif', letterSpacing: 1 }}>CUSTOM LLM BASE URL</label>
                <input value={customEndpoint} onChange={e => setCustomEndpoint(e.target.value)} placeholder="https://your-api.com/v1" style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 10, color: '#4B5563', display: 'block', marginBottom: 4, fontFamily: 'sans-serif', letterSpacing: 1 }}>API KEY (optional)</label>
                <input value={customKey} onChange={e => setCustomKey(e.target.value)} placeholder="sk-..." type="password" style={inputStyle} />
              </div>
            </div>
          )}

          {chatProvider !== 'base44' && (
            <div style={{ marginTop: 12, background: '#172554', border: '1px solid #1D4ED8', borderRadius: 6, padding: '10px 14px', fontSize: 11, color: '#93C5FD', fontFamily: 'sans-serif', lineHeight: 1.7 }}>
              <strong>API keys for Gemini/Grok/Custom</strong> must be set as environment variables in the Base44 dashboard (GEMINI_API_KEY, GROK_API_KEY, CUSTOM_LLM_KEY). The backend function handles all API calls securely.
            </div>
          )}
        </ForgeCard>

        {/* Riley Voice */}
        <ForgeCard title="Riley Voice (TTS)" accent="#C9A84C"
          actions={
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {voiceSaved && <span style={{ fontSize: 11, color: '#4ade80', display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'sans-serif' }}><Check size={12} /> Saved</span>}
              <ForgeButton icon={Volume2} variant="gold" size="sm" onClick={saveVoiceSettings}>Save</ForgeButton>
            </div>
          }
        >
          <div style={{ fontSize: 11, color: '#4B5563', fontFamily: 'sans-serif', lineHeight: 1.7, marginBottom: 16 }}>
            Choose how Riley speaks responses aloud. Kokoro-82M is a free, local TTS model. Browser uses your device's built-in speech.
          </div>

          {[
            { value: 'off', label: 'Off', desc: 'No voice output (default)' },
            { value: 'kokoro', label: 'Kokoro (Local)', desc: 'Kokoro-82M via KOKORO_ENDPOINT — free, high quality' },
            { value: 'browser', label: 'Browser (Basic)', desc: 'Device speech synthesis — no setup required' },
          ].map(opt => (
            <div
              key={opt.value}
              onClick={() => selectVoiceProvider(opt.value)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', marginBottom: 8,
                background: voiceProvider === opt.value ? '#C9A84C12' : '#080812',
                border: `1px solid ${voiceProvider === opt.value ? '#C9A84C55' : '#1E293B'}`,
                borderRadius: 8, cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              <div style={{
                width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
                border: `2px solid ${voiceProvider === opt.value ? '#C9A84C' : '#374151'}`,
                background: voiceProvider === opt.value ? '#C9A84C' : 'transparent',
              }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: voiceProvider === opt.value ? '#C9A84C' : '#E2E8F0', fontFamily: 'sans-serif' }}>{opt.label}</div>
                <div style={{ fontSize: 11, color: '#4B5563', fontFamily: 'sans-serif', marginTop: 2 }}>{opt.desc}</div>
              </div>
            </div>
          ))}

          {/* Auto-speak toggle */}
          <div
            onClick={() => setAutoSpeak(v => !v)}
            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', marginTop: 4, background: '#080812', border: '1px solid #1E293B', borderRadius: 8, cursor: 'pointer' }}
          >
            <div style={{
              width: 36, height: 20, borderRadius: 10, position: 'relative', flexShrink: 0, transition: 'background 0.2s',
              background: autoSpeak ? '#C9A84C' : '#1E293B',
            }}>
              <div style={{
                position: 'absolute', top: 2, left: autoSpeak ? 18 : 2, width: 16, height: 16,
                borderRadius: '50%', background: '#fff', transition: 'left 0.2s',
              }} />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#E2E8F0', fontFamily: 'sans-serif' }}>Auto-speak</div>
              <div style={{ fontSize: 11, color: '#4B5563', fontFamily: 'sans-serif', marginTop: 2 }}>Automatically speak every Riley response (requires voice provider set above)</div>
            </div>
          </div>

          {voiceProvider === 'kokoro' && (
            <div style={{ marginTop: 12, background: '#172554', border: '1px solid #1D4ED8', borderRadius: 6, padding: '10px 14px', fontSize: 11, color: '#93C5FD', fontFamily: 'sans-serif', lineHeight: 1.7 }}>
              Set <strong>KOKORO_ENDPOINT</strong> as a backend env var (e.g. <code style={{ background: '#0a1628', padding: '1px 5px', borderRadius: 3 }}>http://your-ngrok.ngrok.io</code>).
              The server calls <code style={{ background: '#0a1628', padding: '1px 5px', borderRadius: 3 }}>POST /generate</code> with <code style={{ background: '#0a1628', padding: '1px 5px', borderRadius: 3 }}>{"{ text, voice, speed }"}</code>.
              Falls back to Browser TTS if unavailable.
            </div>
          )}
        </ForgeCard>

        {/* Local Models */}
        <ForgeCard title="Local Model Providers" accent="#8B5CF6"
          actions={<ForgeButton icon={Cpu} variant="ghost" size="sm" onClick={() => setShowNewModel(true)}>Add Model</ForgeButton>}
        >
          <div style={{ background: '#1c1108', border: '1px solid #92400e', borderRadius: 6, padding: '8px 14px', marginBottom: 14, fontSize: 11, color: '#FCD34D', fontFamily: 'sans-serif', lineHeight: 1.6 }}>
            ⚠ Riley Forge is hosted. http://localhost refers to the server, not your machine.
            Use <strong>manual workflow</strong> for local Ollama unless you have a secure tunnel/bridge configured.
          </div>

          {showNewModel && (
            <div style={{ background: '#080812', border: '1px solid #1E293B', borderRadius: 8, padding: 16, marginBottom: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                {[
                  { key: 'provider_name', label: 'Provider Name *', type: 'input' },
                  { key: 'model_name', label: 'Model Name', type: 'input' },
                  { key: 'runtime', label: 'Runtime', type: 'select', options: ['Ollama', 'LM Studio', 'Open WebUI', 'llama.cpp', 'Other'] },
                  { key: 'connection_status', label: 'Status', type: 'select', options: ['Manual Workflow', 'Endpoint Not Configured', 'Configured', 'Testing'] },
                  { key: 'endpoint_url', label: 'Endpoint URL', type: 'input' },
                ].map(f => (
                  <div key={f.key}>
                    <label style={{ fontSize: 10, color: '#4B5563', display: 'block', marginBottom: 3, fontFamily: 'sans-serif' }}>{f.label}</label>
                    {f.type === 'select' ? (
                      <select value={newModel[f.key]} onChange={e => setNewModel(m => ({ ...m, [f.key]: e.target.value }))} style={inputStyle}>
                        {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    ) : (
                      <input value={newModel[f.key]} onChange={e => setNewModel(m => ({ ...m, [f.key]: e.target.value }))} style={inputStyle} />
                    )}
                  </div>
                ))}
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ fontSize: 10, color: '#4B5563', display: 'block', marginBottom: 3, fontFamily: 'sans-serif' }}>Use Cases</label>
                  <textarea value={newModel.use_cases} onChange={e => setNewModel(m => ({ ...m, use_cases: e.target.value }))} rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <ForgeButton onClick={handleCreate} disabled={!newModel.provider_name}>Add Provider</ForgeButton>
                <ForgeButton variant="ghost" onClick={() => setShowNewModel(false)}>Cancel</ForgeButton>
              </div>
            </div>
          )}

          {isLoading ? <p style={{ color: '#4B5563', fontSize: 12, fontFamily: 'sans-serif' }}>Loading...</p>
            : models.length === 0 ? <p style={{ color: '#374151', fontSize: 12, fontFamily: 'sans-serif' }}>No local model providers configured.</p>
            : models.map(m => (
              <div key={m.id} style={{ padding: '14px 0', borderBottom: '1px solid #111827' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#E2E8F0', fontFamily: 'sans-serif' }}>{m.provider_name}</div>
                    <div style={{ fontSize: 11, color: '#4B5563', fontFamily: 'sans-serif' }}>{m.runtime} · {m.model_name || 'No model specified'}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <ForgeBadge label={m.connection_status || 'Manual Workflow'} />
                    <ForgeButton variant="ghost" size="sm" icon={Cpu} loading={testing === m.id} onClick={() => handleTest(m)}>Test</ForgeButton>
                  </div>
                </div>
                {m.endpoint_url && <div style={{ fontSize: 11, color: '#3B82F6', fontFamily: 'monospace', marginBottom: 6 }}>{m.endpoint_url}</div>}
                {m.use_cases && <div style={{ fontSize: 11, color: '#64748B', fontFamily: 'sans-serif', lineHeight: 1.6 }}>{m.use_cases}</div>}
                {m.last_test_result && (
                  <div style={{ marginTop: 8, background: '#080812', borderRadius: 6, padding: '8px 12px', fontSize: 11, color: '#94A3B8', fontFamily: 'sans-serif', lineHeight: 1.6 }}>
                    <strong style={{ color: '#4B5563' }}>Last result:</strong> {m.last_test_result}
                  </div>
                )}
              </div>
            ))
          }
        </ForgeCard>

        {/* Platform info */}
        <ForgeCard title="Platform Info" accent="#4B5563">
          {[
            { label: 'Platform', value: 'Base44 (hosted React + Tailwind)' },
            { label: 'Builder Style', value: 'Open-source-first · Manual workflow priority · Credit-saving' },
            { label: 'Agent', value: 'Riley Forge — Phase 1' },
            { label: 'Soul Core', value: 'Active — Prime Directive locked' },
            { label: 'Local Model Support', value: 'Manual workflow (Ollama/LM Studio via copy/paste)' },
          ].map(({ label, value }) => (
            <div key={label} style={{ display: 'flex', gap: 16, padding: '8px 0', borderBottom: '1px solid #111827' }}>
              <div style={{ fontSize: 11, color: '#4B5563', fontFamily: 'sans-serif', minWidth: 180 }}>{label}</div>
              <div style={{ fontSize: 12, color: '#94A3B8', fontFamily: 'sans-serif' }}>{value}</div>
            </div>
          ))}
        </ForgeCard>

        {/* Danger zone */}
        <ForgeCard title="Danger Zone" accent="#EF4444">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p style={{ fontSize: 12, color: '#4B5563', fontFamily: 'sans-serif', margin: 0 }}>These actions are irreversible. Use with care.</p>
            <ForgeButton variant="danger" icon={AlertTriangle}
              onClick={() => { if (confirm('Clear all builder prompts? This cannot be undone.')) toast.error('Not implemented — back up your data first.'); }}>
              Clear All Prompts
            </ForgeButton>
          </div>
        </ForgeCard>
      </div>
    </ForgeLayout>
  );
}