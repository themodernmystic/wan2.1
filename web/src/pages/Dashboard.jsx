import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import {
  Sparkles, ArrowRight, Wand2, Globe, Image, FileText,
  Bot, Shield, Search, FolderKanban, ChevronRight,
  Zap, Code2, Database, Video, Cpu, Play, Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const PLACEHOLDERS = [
  "A SaaS dashboard for tracking team productivity with AI insights...",
  "An e-commerce site for handmade jewellery with a blog and SEO...",
  "A multilingual landing page with video content and lead capture...",
  "A project management app with AI task generation and media...",
  "A personal portfolio with AI-written bio and generated images...",
];

const CAPABILITIES = [
  { icon: Code2, label: "Web App & Pages", desc: "Full pages, layouts, and UI built instantly" },
  { icon: Database, label: "Databases & Logic", desc: "Entities, schemas, and backend in seconds" },
  { icon: FileText, label: "AI Content", desc: "Blog posts, ads, emails, landing pages" },
  { icon: Image, label: "AI Media", desc: "Images, illustrations, and visual assets" },
  { icon: Video, label: "AI Video", desc: "Videos, scripts, voiceovers, subtitles" },
  { icon: Bot, label: "AI Agents", desc: "Smart agents for any task or workflow" },
  { icon: Globe, label: "Localization", desc: "Translated into any language instantly" },
  { icon: Search, label: "SEO Optimized", desc: "Keywords, meta tags, and content scoring" },
  { icon: Shield, label: "Accessibility", desc: "WCAG checks, alt text, screen readers" },
  { icon: FolderKanban, label: "Project Mgmt", desc: "Tasks, teams, and progress tracking" },
];

const STEPS = [
  { num: "01", title: "Describe your idea", desc: "Type your vision in plain English — no technical knowledge needed." },
  { num: "02", title: "AI builds everything", desc: "Pages, databases, agents, content, and media generated in minutes." },
  { num: "03", title: "Customize & launch", desc: "Refine with a chat, then publish your app to the world." },
];

const EXAMPLE_OUTPUTS = [
  { label: "Pages built", value: "12", icon: Code2 },
  { label: "Content pieces", value: "24", icon: FileText },
  { label: "Media generated", value: "36", icon: Image },
  { label: "Time taken", value: "4 min", icon: Zap },
];

export default function Dashboard() {
  const [idea, setIdea] = useState('');
  const [placeholder, setPlaceholder] = useState(PLACEHOLDERS[0]);
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState(0);
  const [done, setDone] = useState(false);
  const textareaRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIdx(i => (i + 1) % PLACEHOLDERS.length);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setPlaceholder(PLACEHOLDERS[placeholderIdx]);
  }, [placeholderIdx]);

  const GENERATION_STEPS = [
    "Analyzing your idea...",
    "Designing page structure...",
    "Setting up databases...",
    "Generating AI content...",
    "Creating media assets...",
    "Configuring AI agents...",
    "Optimizing for SEO...",
    "Running accessibility checks...",
    "Finalizing your project...",
  ];

  const handleGenerate = async () => {
    if (!idea.trim()) return;
    setGenerating(true);
    setGenerationStep(0);
    setDone(false);

    for (let i = 0; i < GENERATION_STEPS.length; i++) {
      await new Promise(r => setTimeout(r, 600));
      setGenerationStep(i + 1);
    }

    // Save as a project
    await base44.entities.Project.create({
      name: idea.slice(0, 60),
      description: idea,
      status: 'active',
      priority: 'high',
      progress: 0,
    });

    await new Promise(r => setTimeout(r, 500));
    setGenerating(false);
    setDone(true);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleGenerate();
    }
  };

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Ambient background blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-primary/8 blur-[120px]" />
        <div className="absolute -top-20 right-0 w-[500px] h-[500px] rounded-full bg-accent/8 blur-[100px]" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full bg-primary/5 blur-[140px]" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-6 pt-20 pb-32">

        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-center mb-8"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/30 bg-primary/5 text-primary text-sm font-medium">
            <Sparkles className="w-3.5 h-3.5" />
            AI-Powered Platform · No coding required
          </div>
        </motion.div>

        {/* Hero headline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-center mb-6"
        >
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.08] text-foreground">
            Describe your idea.
            <br />
            <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
              It does the rest.
            </span>
          </h1>
        </motion.div>

        {/* Subheadline */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-center text-lg text-muted-foreground max-w-2xl mx-auto mb-12 leading-relaxed"
        >
          A few prompts and GeneraAI builds your full web app, pages, databases, logic,
          agents, content, videos, and more — in minutes. No coding required.
        </motion.p>

        {/* Main input card */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="relative"
        >
          <div className="rounded-2xl border border-border bg-card shadow-2xl shadow-primary/10 overflow-hidden">
            <AnimatePresence mode="wait">
              {!generating && !done ? (
                <motion.div key="input" initial={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <textarea
                    ref={textareaRef}
                    value={idea}
                    onChange={e => setIdea(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    rows={4}
                    className="w-full px-6 pt-6 pb-4 text-base bg-transparent border-0 outline-none resize-none placeholder:text-muted-foreground/50 text-foreground leading-relaxed"
                  />
                  <div className="flex items-center justify-between px-6 pb-5 pt-2 border-t border-border/50">
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <Cpu className="w-3.5 h-3.5" /> AI-powered
                      </span>
                      <span>·</span>
                      <span>⌘ + Enter to generate</span>
                    </div>
                    <Button
                      onClick={handleGenerate}
                      disabled={!idea.trim()}
                      size="lg"
                      className="gap-2 px-6 rounded-xl bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25"
                    >
                      <Wand2 className="w-4 h-4" />
                      Build it now
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                </motion.div>
              ) : generating ? (
                <motion.div
                  key="generating"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="px-6 py-10"
                >
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Sparkles className="w-5 h-5 text-primary animate-pulse" />
                    </div>
                    <div>
                      <p className="font-semibold">Building your idea...</p>
                      <p className="text-sm text-muted-foreground line-clamp-1">{idea}</p>
                    </div>
                  </div>
                  <div className="space-y-2.5">
                    {GENERATION_STEPS.map((step, i) => (
                      <motion.div
                        key={step}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: generationStep > i ? 1 : 0.3, x: 0 }}
                        className="flex items-center gap-3"
                      >
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all ${
                          generationStep > i ? 'bg-primary text-primary-foreground' :
                          generationStep === i ? 'border-2 border-primary' :
                          'border-2 border-border'
                        }`}>
                          {generationStep > i && <Check className="w-3 h-3" />}
                          {generationStep === i && <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />}
                        </div>
                        <span className={`text-sm ${generationStep > i ? 'text-foreground' : 'text-muted-foreground'}`}>{step}</span>
                      </motion.div>
                    ))}
                  </div>
                  {/* Progress bar */}
                  <div className="mt-6 h-1.5 rounded-full bg-muted overflow-hidden">
                    <motion.div
                      className="h-full bg-primary rounded-full"
                      animate={{ width: `${(generationStep / GENERATION_STEPS.length) * 100}%` }}
                      transition={{ duration: 0.4 }}
                    />
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="done"
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="px-6 py-8"
                >
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                      <Check className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-emerald-700">Project created successfully!</p>
                      <p className="text-sm text-muted-foreground line-clamp-1">{idea}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-3 mb-6">
                    {EXAMPLE_OUTPUTS.map(o => (
                      <div key={o.label} className="bg-muted rounded-xl p-3 text-center">
                        <o.icon className="w-4 h-4 mx-auto mb-1 text-primary" />
                        <p className="text-xl font-bold">{o.value}</p>
                        <p className="text-xs text-muted-foreground">{o.label}</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-3">
                    <Link to="/projects" className="flex-1">
                      <Button className="w-full gap-2">
                        <FolderKanban className="w-4 h-4" /> View Project
                      </Button>
                    </Link>
                    <Button variant="outline" onClick={() => { setDone(false); setIdea(''); }} className="gap-2">
                      <Wand2 className="w-4 h-4" /> Build another
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Glow effect */}
          <div className="absolute -inset-px rounded-2xl bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 blur-xl -z-10 opacity-60" />
        </motion.div>

        {/* Example prompts */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex flex-wrap justify-center gap-2 mt-5"
        >
          {["E-commerce store", "SaaS dashboard", "Portfolio site", "Blog with AI", "Booking app"].map(ex => (
            <button
              key={ex}
              onClick={() => setIdea(ex + ' with full features, AI content, and media')}
              className="px-3 py-1.5 rounded-full border border-border text-xs text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-primary/5 transition-all"
            >
              {ex}
            </button>
          ))}
        </motion.div>

        {/* How it works */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-24"
        >
          <p className="text-center text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-12">How it works</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {STEPS.map((step, i) => (
              <div key={step.num} className="relative">
                {i < STEPS.length - 1 && (
                  <div className="hidden md:block absolute top-8 left-full w-full h-px bg-gradient-to-r from-border to-transparent z-0" />
                )}
                <div className="relative z-10 flex flex-col items-start gap-4 p-6 rounded-2xl bg-card border border-border hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl font-black text-primary/20">{step.num}</span>
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-primary" />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">{step.title}</h3>
                    <p className="text-sm text-muted-foreground">{step.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Capabilities grid */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="mt-24"
        >
          <p className="text-center text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">Everything generated for you</p>
          <h2 className="text-center text-3xl font-bold mb-12">One prompt. Ten superpowers.</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {CAPABILITIES.map((cap, i) => (
              <motion.div
                key={cap.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 + i * 0.05 }}
                className="flex flex-col items-center gap-3 p-4 rounded-xl border border-border bg-card hover:border-primary/40 hover:bg-primary/3 hover:shadow-md transition-all text-center group cursor-default"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
                  <cap.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{cap.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{cap.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="mt-24 rounded-2xl bg-gradient-to-br from-primary/10 via-accent/10 to-primary/5 border border-primary/20 p-10 text-center"
        >
          <div className="w-14 h-14 rounded-2xl bg-primary/15 flex items-center justify-center mx-auto mb-5">
            <Wand2 className="w-7 h-7 text-primary" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Ready to build something amazing?</h2>
          <p className="text-muted-foreground mb-6">Just describe it above and watch GeneraAI bring it to life.</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button size="lg" className="gap-2 px-8" onClick={() => textareaRef.current?.focus()}>
              <Sparkles className="w-4 h-4" /> Start building now
            </Button>
            <Link to="/content">
              <Button size="lg" variant="outline" className="gap-2 px-8">
                <FileText className="w-4 h-4" /> Explore tools
                <ChevronRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}