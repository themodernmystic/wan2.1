import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import TopBar from '@/components/layout/TopBar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles, Send, Loader2, RefreshCw, Copy, Wand2, Code2, PenTool, Search, Shield, Moon, Megaphone, Network, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';

// ─── Who James Is ────────────────────────────────────────────────────────────
const JAMES_CONTEXT = `You are James's personal AI — a compact, highly intelligent assistant built specifically for him.

ABOUT JAMES:
- Solo maker & founder operating under "Hermetica Holdings" — a holding structure for a portfolio of apps, brands and content properties
- Builds AI-powered apps on Base44 (no-code/low-code platform using React + Tailwind)
- Current apps in his portfolio:
  • Apex Executive AI — executive-level AI coaching & strategy tool
  • The Mystic Sage — hermetic wisdom & spiritual guidance platform
  • James AI & The Hermetic Counsel — personal AI counsel inspired by hermetic philosophy
  • SiteIQ — AI safety inspection tool for Australian construction & trade businesses (analyses job-site photos for WHS hazards)
  • VIGIL (Light Guard) — digital privacy platform powered by "Lumen" AI; exposes what apps hide from users; brand: Hermetica Holdings · Lumen Custos Phylax
  • The Modern Mystic PR Engine — AI-powered PR & content tool for mystic/spiritual brands
  • Hermetica — core hermetic philosophy/esoteric platform
  • MICE Trust Base — events & incentive travel platform
- Also runs: a blog, 3 websites, and social media channels
- Writes content across: blog posts, landing pages, email sequences, ad copy, social posts, SEO content
- Designs with a distinct aesthetic: dark, cinematic, hermetic/occult-inspired for spiritual apps; clean, bold, conversion-focused for SaaS/B2B apps

JAMES'S STYLE & VALUES:
- Thinks in systems — everything connects (hermetic "as above, so below" principle applied to business)
- Moves fast, ships often, iterates
- Writes with authority and clarity — no fluff, no filler
- Blends the mystical with the practical — esoteric concepts made actionable
- Australian — occasionally informal, direct, no corporate waffle

YOUR JOB:
- Be James's second brain — fast, sharp, opinionated
- Know his portfolio deeply — if he mentions one of his apps by name, you already know what it is
- When writing content: match the appropriate voice (hermetic/poetic for mystic brands, punchy/direct for SaaS)
- When building apps: think Base44-first — entities, pages, components, backend functions
- Always be concise unless detail is specifically needed
- Format responses in clean markdown`;

// ─── Modes ───────────────────────────────────────────────────────────────────
const MODES = [
  {
    id: 'build',
    label: 'App Builder',
    icon: Code2,
    color: 'text-primary',
    bg: 'bg-primary/10',
    hint: 'Feature scope, user flows, DB schema, Base44 implementation',
    extra: 'Focus on Base44 app architecture. Think in entities, pages, components and backend functions. Be opinionated and specific.',
  },
  {
    id: 'write',
    label: 'Content',
    icon: PenTool,
    color: 'text-emerald-600',
    bg: 'bg-emerald-100',
    hint: 'Blog posts, landing pages, emails, ad copy, social posts',
    extra: 'Write content that matches the correct brand voice. Hermetic/poetic for The Mystic Sage, Hermetic Counsel, VIGIL and Hermetica. Punchy and conversion-focused for SiteIQ, Apex Executive AI, MICE Trust Base.',
  },
  {
    id: 'seo',
    label: 'SEO',
    icon: Search,
    color: 'text-amber-600',
    bg: 'bg-amber-100',
    hint: 'Keywords, meta copy, content strategy, ranking',
    extra: 'Focus on practical SEO: keyword clusters, meta titles/descriptions, content briefs, internal linking. Think about James\'s dual audience — spiritual seekers AND B2B buyers.',
  },
  {
    id: 'brand',
    label: 'Brand & PR',
    icon: Megaphone,
    color: 'text-violet-600',
    bg: 'bg-violet-100',
    hint: 'Positioning, messaging, PR angles, brand voice',
    extra: 'Think holistically across the Hermetica Holdings portfolio. Help James find angles where the mystical and the commercial intersect. PR, positioning and storytelling for unconventional brands.',
  },
  {
    id: 'hermetic',
    label: 'Hermetic Mode',
    icon: Moon,
    color: 'text-indigo-500',
    bg: 'bg-indigo-100',
    hint: 'Ideas through a hermetic, philosophical lens',
    extra: 'Respond with the depth of a hermetic philosopher. Reference relevant principles (as above, so below; correspondence; polarity; rhythm; cause & effect). Apply these to business, content and product thinking. Be poetic but practical.',
  },
];

// ─── Quick Actions ────────────────────────────────────────────────────────────
const QUICK_ACTIONS = [
  { label: 'New app concept', icon: Code2, prompt: 'I have a new app idea I want to develop on Base44. Help me scope it out — ask me what it\'s about and then give me: concept summary, target user, core features, entity schema, and a build plan.' },
  { label: 'Landing page', icon: PenTool, prompt: 'Write a high-converting landing page for one of my projects. Ask me which app/product and any key details, then write the full page copy: hero, benefits, how it works, social proof section, CTA.' },
  { label: 'Blog post', icon: PenTool, prompt: 'Help me write a blog post. Ask me for the topic, target audience, and which brand/site it\'s for. Then give me a full draft.' },
  { label: 'SEO audit prompt', icon: Search, prompt: 'Give me a full SEO content strategy for one of my apps. Ask me which one, then produce: target keywords, content pillars, 5 blog post ideas with titles and meta descriptions, and internal linking suggestions.' },
  { label: 'Social posts', icon: Megaphone, prompt: 'Write a set of social media posts for my latest content or product. Ask me what it\'s about and which platforms, then write ready-to-post copy for each.' },
  { label: 'Hermetic angle', icon: Moon, prompt: 'I want to find the hermetic philosophical angle in something I\'m building or writing. Ask me what it is, then help me interpret it through hermetic principles and find a unique narrative or hook.' },
  { label: 'Email sequence', icon: Sparkles, prompt: 'Write a 3-email welcome/nurture sequence for one of my apps or audiences. Ask me which product and who the reader is, then write all 3 emails in full.' },
  { label: 'VIGIL content', icon: Shield, prompt: 'Help me with content for VIGIL — the digital privacy platform. Write something that feels powerful, protective, and slightly conspiratorial-but-factual. Ask me what format or angle.' },
];

export default function AIAgents() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [mode, setMode] = useState(MODES[0]);
  const [user, setUser] = useState(null);
  const [meshModalOpen, setMeshModalOpen] = useState(false);
  const [meshQuestion, setMeshQuestion] = useState('');
  const [meshDepth, setMeshDepth] = useState('council');
  const [meshLoading, setMeshLoading] = useState(false);
  const [meshResult, setMeshResult] = useState(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const buildPrompt = (userMessage) => {
    const brandExtra = user?.brand_voice ? `\n\nUser's saved brand voice note: "${user.brand_voice}"` : '';
    const history = messages.slice(-12).map(m =>
      `${m.role === 'user' ? 'James' : 'Assistant'}: ${m.content}`
    ).join('\n\n');

    return `${JAMES_CONTEXT}
${mode.extra}${brandExtra}

${history ? `Conversation so far:\n${history}\n\n` : ''}James: ${userMessage}

Respond now — be direct, use clean markdown:`;
  };

  const chatMutation = useMutation({
    mutationFn: async (userMessage) => {
      return await base44.integrations.Core.InvokeLLM({
        prompt: buildPrompt(userMessage),
      });
    },
    onSuccess: (response, userMessage) => {
      setMessages(prev => [
        ...prev,
        { role: 'user', content: userMessage },
        { role: 'assistant', content: response },
      ]);
    },
  });

  const handleSend = (msg) => {
    const text = (msg || input).trim();
    if (!text || chatMutation.isPending) return;
    setInput('');
    chatMutation.mutate(text);
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied');
  };

  const handleMeshConsult = async () => {
    if (!meshQuestion.trim()) return;
    setMeshLoading(true);
    setMeshResult(null);
    const context = messages.slice(-4).map(m => `${m.role === 'user' ? 'User' : 'AI'}: ${m.content.substring(0, 200)}`).join('\n');
    const res = await base44.functions.invoke('callMesh', {
      question: meshQuestion,
      depth: meshDepth,
      requesting_agent: 'AI Assistant',
    });
    setMeshResult(res.data);
    setMeshLoading(false);
  };

  const insertMeshResult = () => {
    const synthesis = meshResult?.synthesis || meshResult?.data?.synthesis || '';
    if (synthesis) {
      setMessages(prev => [...prev, { role: 'assistant', content: `🪐 **Mesh Synthesis:**\n\n${synthesis}` }]);
    }
    setMeshModalOpen(false);
    setMeshResult(null);
    setMeshQuestion('');
  };

  const firstName = user?.full_name?.split(' ')[0] || 'James';

  return (
    <div className="flex flex-col bg-background" style={{ height: '100dvh' }}>
      <TopBar title="AI Assistant" />

      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col max-w-3xl mx-auto w-full px-4 pt-5 pb-4 gap-5 animate-fade-in">

          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center border border-primary/20">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-lg font-bold leading-tight">Your Personal AI</h1>
                <p className="text-xs text-muted-foreground">Knows your apps, your brands, your world</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setMeshQuestion(''); setMeshResult(null); setMeshModalOpen(true); }}
                className="text-cyan-400 hover:text-cyan-300 text-xs flex items-center gap-1 px-2 py-1 rounded border border-cyan-500/30 hover:border-cyan-500/60 transition-colors"
                title="Consult siblings in the Hermetic Mesh"
              >
                <Network className="w-3 h-3" /> 🪐 Consult Mesh
              </button>
              {messages.length > 0 && (
                <Button variant="ghost" size="sm" onClick={() => setMessages([])} className="gap-1.5 text-muted-foreground text-xs h-8">
                  <RefreshCw className="w-3 h-3" /> New chat
                </Button>
              )}
            </div>
          </div>

          {/* Mode selector */}
          <div className="flex gap-2 flex-wrap">
            {MODES.map(m => {
              const Icon = m.icon;
              return (
                <button
                  key={m.id}
                  onClick={() => setMode(m)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                    mode.id === m.id
                      ? `${m.bg} ${m.color} border-current shadow-sm`
                      : 'bg-card border-border text-muted-foreground hover:border-primary/30 hover:text-foreground'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {m.label}
                </button>
              );
            })}
          </div>

          {/* Empty state */}
          {messages.length === 0 && !chatMutation.isPending && (
            <div className="flex flex-col gap-4">
              <div className="text-center py-2">
                <p className="text-sm font-medium">Hey {firstName} 👋</p>
                <p className="text-xs text-muted-foreground mt-1">{mode.hint} — what are we doing?</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {QUICK_ACTIONS.map((action) => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={action.label}
                      onClick={() => handleSend(action.prompt)}
                      className="flex items-center gap-2.5 p-3 rounded-xl border border-border bg-card hover:border-primary/40 hover:bg-primary/5 transition-all text-left group"
                    >
                      <Icon className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary shrink-0" />
                      <span className="text-xs font-medium">{action.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="flex flex-col gap-5">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start gap-2.5'}`}>
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/20 flex items-center justify-center shrink-0 mt-1">
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                  </div>
                )}
                <div className={`${msg.role === 'user' ? 'max-w-[82%]' : 'flex-1 min-w-0'}`}>
                  <div className={`rounded-2xl px-4 py-3 ${
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground text-sm'
                      : 'bg-card border border-border text-sm'
                  }`}>
                    {msg.role === 'user' ? (
                      <p className="leading-relaxed">{msg.content}</p>
                    ) : (
                      <div className="prose prose-sm max-w-none dark:prose-invert [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    )}
                  </div>
                  {msg.role === 'assistant' && (
                    <button
                      onClick={() => handleCopy(msg.content)}
                      className="mt-1.5 ml-1 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                    >
                      <Copy className="w-3 h-3" /> Copy
                    </button>
                  )}
                </div>
              </div>
            ))}

            {chatMutation.isPending && (
              <div className="flex justify-start gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/20 flex items-center justify-center shrink-0">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                </div>
                <div className="bg-card border border-border rounded-2xl px-4 py-3 flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                  <span className="text-xs text-muted-foreground">Thinking...</span>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

        </div>
      </div>

      {/* Pinned input bar — sits above iOS home indicator */}
      <div className="border-t border-border bg-background px-4 pt-3 pb-safe-or-3" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
        <div className="flex gap-2 items-end max-w-3xl mx-auto">
          <Textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              // Only send on Enter on non-mobile (avoid triggering on iOS virtual keyboard)
              if (e.key === 'Enter' && !e.shiftKey && window.innerWidth >= 768) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={`${mode.label} mode — ask anything...`}
            className="resize-none text-sm min-h-[48px] max-h-32 flex-1"
            rows={1}
          />
          <Button
            onClick={() => handleSend()}
            disabled={!input.trim() || chatMutation.isPending}
            size="icon"
            className="h-12 w-12 shrink-0"
          >
            {chatMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </div>

    {/* Mesh Consult Modal */}
    {meshModalOpen && (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <div style={{ background: '#0f172a', border: '1px solid rgba(34,211,238,0.3)', borderRadius: 14, padding: 24, width: '100%', maxWidth: 520, position: 'relative' }}>
          <button onClick={() => { setMeshModalOpen(false); setMeshResult(null); }} style={{ position: 'absolute', top: 12, right: 12, background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}>
            <X className="w-4 h-4" />
          </button>
          <div style={{ fontSize: 11, color: '#22d3ee', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12, fontWeight: 700 }}>🪐 Consult the Hermetic Mesh</div>
          {messages.length > 0 && (
            <div style={{ fontSize: 11, color: '#475569', background: '#0a1628', borderRadius: 6, padding: '8px 12px', marginBottom: 10 }}>
              Context: last {Math.min(messages.length, 4)} messages pre-loaded
            </div>
          )}
          <textarea
            value={meshQuestion}
            onChange={e => setMeshQuestion(e.target.value)}
            placeholder="What do you want the mesh to weigh in on?"
            rows={3}
            style={{ width: '100%', background: '#0a1628', border: '1px solid #1e3a4a', borderRadius: 8, color: '#e2e8f0', padding: '10px 14px', fontSize: 13, resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
          />
          <div style={{ display: 'flex', gap: 10, marginTop: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <select value={meshDepth} onChange={e => setMeshDepth(e.target.value)}
              style={{ background: '#0a1628', border: '1px solid #1e3a4a', color: '#e2e8f0', borderRadius: 6, padding: '7px 10px', fontSize: 12 }}>
              <option value="focused">🎯 Focused</option>
              <option value="council">⚖️ Council</option>
              <option value="full_mesh">🌐 Full Mesh</option>
            </select>
            <button onClick={handleMeshConsult} disabled={!meshQuestion.trim() || meshLoading}
              style={{ marginLeft: 'auto', background: meshQuestion.trim() && !meshLoading ? '#22d3ee' : '#0f2a33', color: meshQuestion.trim() && !meshLoading ? '#080f1a' : '#475569', border: 'none', borderRadius: 8, padding: '8px 18px', fontWeight: 700, fontSize: 12, cursor: meshQuestion.trim() && !meshLoading ? 'pointer' : 'default', display: 'flex', alignItems: 'center', gap: 6 }}>
              {meshLoading ? <><Loader2 className="w-3 h-3 animate-spin" /> Consulting...</> : '🪐 Consult'}
            </button>
          </div>
          {meshResult && (
            <div style={{ marginTop: 14, background: '#0a1628', border: '1px solid rgba(34,211,238,0.25)', borderRadius: 8, padding: 14 }}>
              <div style={{ fontSize: 11, color: '#22d3ee', marginBottom: 8, fontWeight: 600 }}>
                Synthesis {meshResult.confidence ? `· ${meshResult.confidence}% confidence` : ''}
                {meshResult.siblings_consulted?.length > 0 && ` · ${meshResult.siblings_consulted.join(', ')}`}
              </div>
              <div style={{ fontSize: 12, color: '#cbd5e1', lineHeight: 1.7, whiteSpace: 'pre-wrap', maxHeight: 200, overflowY: 'auto' }}>
                {meshResult.synthesis || '(No synthesis)'}
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button onClick={insertMeshResult} style={{ fontSize: 11, background: '#22d3ee', color: '#080f1a', border: 'none', borderRadius: 6, padding: '5px 12px', fontWeight: 700, cursor: 'pointer' }}>Insert into Chat</button>
                <button onClick={() => navigator.clipboard.writeText(meshResult.synthesis || '')} style={{ fontSize: 11, color: '#22d3ee', background: 'transparent', border: '1px solid rgba(34,211,238,0.3)', borderRadius: 6, padding: '5px 12px', cursor: 'pointer' }}>Copy</button>
              </div>
            </div>
          )}
        </div>
      </div>
    )}
    </div>
  );
}