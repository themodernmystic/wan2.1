import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Bot, Plus, Zap, Settings2, Play, Trash2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PageHeader from "@/components/shared/HermeticaPageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import EmptyState from "@/components/shared/HermeticaEmptyState";
import { useToast } from "@/components/ui/use-toast";
import { motion } from "framer-motion";
const runAgentTask = (payload) => base44.functions.invoke("runAgentTask", payload);
import AgentCollaborationPanel from "@/components/agents/AgentCollaborationPanel";

const AGENT_TEMPLATES = [
  { name: "Market Research Analyst", type: "research", capabilities: "Web research, market sizing, competitor analysis, trend identification", prompt: "You are an elite market research analyst. Conduct thorough market research with data-driven insights." },
  { name: "App Builder Agent", type: "builder", capabilities: "Code generation, architecture design, API integration, database schema design", prompt: "You are an expert full-stack developer. Help design and build applications with clean architecture." },
  { name: "Business Strategist", type: "analyst", capabilities: "SWOT analysis, financial modeling, go-to-market strategy, risk assessment", prompt: "You are a senior business strategist. Provide strategic recommendations backed by analysis." },
  { name: "UX/UI Designer", type: "designer", capabilities: "Wireframing, user flow design, UI component design, accessibility review", prompt: "You are a world-class UX/UI designer. Create intuitive, beautiful, and accessible designs." },
  { name: "DevOps Deployer", type: "deployer", capabilities: "CI/CD setup, infrastructure planning, monitoring, performance optimization", prompt: "You are a DevOps expert. Help deploy, monitor, and optimize application infrastructure." },
  { name: "Growth Optimizer", type: "optimizer", capabilities: "SEO, conversion optimization, A/B testing strategy, analytics", prompt: "You are a growth hacking expert. Optimize for growth with data-driven experiments." },
];

export default function Agents() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ name: "", description: "", agent_type: "custom", capabilities: "", tools: "", system_prompt: "" });
  const [creating, setCreating] = useState(false);
  const [executing, setExecuting] = useState(null);
  const [execPrompt, setExecPrompt] = useState("");
  const [execResult, setExecResult] = useState("");
  const { toast } = useToast();

  const loadAgents = async () => {
    const data = await base44.entities.ForgeAgent.list("-created_date", 50);
    setAgents(data);
    setLoading(false);
  };

  useEffect(() => { loadAgents(); }, []);

  const handleCreate = async () => {
    if (!form.name.trim()) return;
    setCreating(true);
    await base44.entities.ForgeAgent.create(form);
    await base44.entities.ActivityLog.create({ action: `Created agent "${form.name}"`, entity_type: "ForgeAgent", actor: "user" });
    setForm({ name: "", description: "", agent_type: "custom", capabilities: "", tools: "", system_prompt: "" });
    setShowCreate(false);
    setCreating(false);
    toast({ title: "Agent created" });
    loadAgents();
  };

  const handleUseTemplate = (template) => {
    setForm({
      name: template.name,
      description: `${template.type} agent with specialized capabilities`,
      agent_type: template.type,
      capabilities: template.capabilities,
      tools: "",
      system_prompt: template.prompt,
    });
  };

  const handleExecute = async (agent) => {
    if (!execPrompt.trim()) return;
    setExecResult("");
    setExecuting(agent);
    try {
      const res = await runAgentTask({ agent_id: agent.id, prompt: execPrompt });
      setExecResult(res.data.result);
      toast({ title: "Task complete", description: `Journal entry created • Lessons captured` });
      loadAgents();
    } catch (err) {
      setExecResult(`Error: ${err.message}`);
    }
  };

  const handleDelete = async (id) => {
    await base44.entities.ForgeAgent.delete(id);
    toast({ title: "Agent deleted" });
    loadAgents();
  };

  const filtered = agents.filter(a => a.name?.toLowerCase().includes(search.toLowerCase()));

  if (loading) {
    return <div className="flex items-center justify-center h-96"><div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /></div>;
  }

  return (
    <div>
      <PageHeader
        title="Agent Workshop"
        subtitle="Create and manage specialized AI agents"
        actions={
          <Button onClick={() => setShowCreate(true)} className="bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white gap-2">
            <Plus className="w-4 h-4" /> New Agent
          </Button>
        }
      />

      {/* Search */}
      <div className="relative mb-6">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search agents..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-secondary/50 border-border/50 max-w-sm" />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Bot} title="No agents yet" description="Create specialized AI agents to help with market research, app building, strategy, and more." actionLabel="Create Agent" onAction={() => setShowCreate(true)} />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((agent, i) => (
            <motion.div key={agent.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <div className="glass-card rounded-xl p-5 hover:border-white/10 transition-all duration-300">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500/20 to-purple-600/10 flex items-center justify-center">
                    <Bot className="w-5 h-5 text-purple-400" />
                  </div>
                  <div className="flex items-center gap-1">
                    <StatusBadge status={agent.status} />
                  </div>
                </div>
                <h3 className="text-base font-semibold text-foreground mb-1">{agent.name}</h3>
                <p className="text-xs text-muted-foreground capitalize mb-2">{agent.agent_type} Agent</p>
                {agent.capabilities && (
                  <p className="text-xs text-foreground/60 line-clamp-2 mb-3">{agent.capabilities}</p>
                )}
                <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-3">
                  <span>{agent.execution_count || 0} executions</span>
                  <span>{agent.success_rate || 100}% success</span>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1 gap-1 text-xs" onClick={() => { setExecuting(agent); setExecPrompt(""); setExecResult(""); }}>
                    <Play className="w-3 h-3" /> Execute
                  </Button>
                  <Button size="sm" variant="outline" className="text-xs text-destructive hover:bg-destructive/10" onClick={() => handleDelete(agent.id)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Agent Collaboration */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-foreground mb-1">Agent Collaboration</h2>
        <p className="text-xs text-muted-foreground mb-4">Agents communicate, claim tasks, request help, hand off work, and share findings — all project-scoped and auditable.</p>
        <div className="glass-card rounded-xl p-6">
          <AgentCollaborationPanel />
        </div>
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-card border-border/50 max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Agent</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="templates">
            <TabsList className="bg-secondary/50 border border-border/50 mb-4">
              <TabsTrigger value="templates">Templates</TabsTrigger>
              <TabsTrigger value="custom">Custom</TabsTrigger>
            </TabsList>
            <TabsContent value="templates">
              <div className="grid sm:grid-cols-2 gap-3">
                {AGENT_TEMPLATES.map((t) => (
                  <button
                    key={t.name}
                    onClick={() => { handleUseTemplate(t); }}
                    className={`text-left p-4 rounded-lg border transition-all ${form.name === t.name ? "border-purple-500/50 bg-purple-500/10" : "border-border/50 hover:border-white/10 bg-secondary/30"}`}
                  >
                    <p className="text-sm font-medium text-foreground mb-1">{t.name}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">{t.type}</p>
                    <p className="text-xs text-foreground/60">{t.capabilities}</p>
                  </button>
                ))}
              </div>
            </TabsContent>
            <TabsContent value="custom" />
          </Tabs>
          <div className="space-y-4 mt-2">
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Agent Name</Label>
                <Input value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} className="mt-1 bg-secondary/50 border-border/50" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Type</Label>
                <Select value={form.agent_type} onValueChange={(v) => setForm({...form, agent_type: v})}>
                  <SelectTrigger className="mt-1 bg-secondary/50 border-border/50"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["research", "builder", "analyst", "designer", "deployer", "optimizer", "custom"].map(t => (
                      <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Capabilities</Label>
              <Textarea value={form.capabilities} onChange={(e) => setForm({...form, capabilities: e.target.value})} placeholder="List agent capabilities..." className="mt-1 bg-secondary/50 border-border/50 min-h-16" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">System Prompt</Label>
              <Textarea value={form.system_prompt} onChange={(e) => setForm({...form, system_prompt: e.target.value})} placeholder="Define the agent's behavior and personality..." className="mt-1 bg-secondary/50 border-border/50 min-h-24" />
            </div>
            <Button onClick={handleCreate} disabled={!form.name.trim() || creating} className="w-full bg-gradient-to-r from-purple-600 to-purple-500 text-white">
              {creating ? "Creating..." : "Create Agent"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Execute Dialog */}
      <Dialog open={!!executing} onOpenChange={() => setExecuting(null)}>
        <DialogContent className="bg-card border-border/50 max-w-xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-purple-400" /> {executing?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground">Task / Prompt</Label>
              <Textarea value={execPrompt} onChange={(e) => setExecPrompt(e.target.value)} placeholder="What would you like this agent to do?" className="mt-1 bg-secondary/50 border-border/50 min-h-20" />
            </div>
            <Button onClick={() => handleExecute(executing)} disabled={!execPrompt.trim()} className="w-full bg-gradient-to-r from-purple-600 to-purple-500 text-white gap-2">
              <Zap className="w-4 h-4" /> Execute
            </Button>
            {execResult && (
              <div className="glass-card rounded-lg p-4 max-h-60 overflow-y-auto">
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Result</p>
                <p className="text-sm text-foreground/80 whitespace-pre-wrap">{execResult}</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}