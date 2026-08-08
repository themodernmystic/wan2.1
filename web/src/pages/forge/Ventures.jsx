import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Plus, Rocket, Search, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ExecutionModeBadge from "@/components/forge/ExecutionModeBadge";
import StatusBadge from "@/components/forge/StatusBadge";
import { useToast } from "@/components/ui/use-toast";

const emptyForm = { name: "", description: "", venture_type: "experiment", execution_mode: "simulation", lifecycle_stage: "brief", status: "proposed", truth_disclosure: "", is_acceptance_test: true, tags: "" };

export default function Ventures() {
  const [ventures, setVentures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => { loadVentures(); }, []);

  async function loadVentures() {
    try { setVentures(await base44.entities.Venture.list("-created_date", 50)); }
    catch (err) { setError(err.message); } finally { setLoading(false); }
  }

  async function handleSave() {
    if (!form.name.trim()) { toast({ variant: "destructive", title: "Name required" }); return; }
    setSaving(true);
    try {
      await base44.entities.Venture.create({ ...form, truth_disclosure: form.truth_disclosure || "SIMULATION MODE — No external systems accessed. All artifacts generated in-app within Base44. No standalone deployment, real payments, or external integrations claimed unless verified by ToolExecution evidence." });
      toast({ title: "Venture created in simulation mode" });
      setShowCreate(false); setForm(emptyForm); await loadVentures();
    } catch (err) { toast({ variant: "destructive", title: "Error", description: err.message }); }
    finally { setSaving(false); }
  }

  const filtered = ventures.filter(v => v.name?.toLowerCase().includes(search.toLowerCase()));

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /></div>;
  if (error) return <div className="glass-card rounded-xl p-8 text-center"><p className="text-destructive text-sm">Error: {error}</p><Button onClick={loadVentures} className="mt-3" size="sm">Retry</Button></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><Rocket className="w-6 h-6 text-blue-400" /> Ventures</h1><p className="text-sm text-muted-foreground mt-1">Governed ventures with truthful execution modes</p></div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild><Button className="bg-gradient-to-r from-blue-600 to-blue-500"><Plus className="w-4 h-4" /> New Venture</Button></DialogTrigger>
          <DialogContent className="bg-card border-border/50 max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Create New Venture</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label className="text-xs text-muted-foreground">Name *</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="mt-1 bg-secondary/50" placeholder="e.g. Honest Acceptance Test Venture" /></div>
              <div><Label className="text-xs text-muted-foreground">Description</Label><Textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="mt-1 bg-secondary/50 min-h-16" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs text-muted-foreground">Type</Label><Select value={form.venture_type} onValueChange={v => setForm({...form, venture_type: v})}><SelectTrigger className="mt-1 bg-secondary/50"><SelectValue /></SelectTrigger><SelectContent>{["product", "service", "research", "experiment", "acceptance_test"].map(t => <SelectItem key={t} value={t} className="capitalize">{t.replace(/_/g, " ")}</SelectItem>)}</SelectContent></Select></div>
                <div><Label className="text-xs text-muted-foreground">Execution Mode</Label><Select value={form.execution_mode} onValueChange={v => setForm({...form, execution_mode: v})}><SelectTrigger className="mt-1 bg-secondary/50"><SelectValue /></SelectTrigger><SelectContent>{["simulation", "dry_run", "test", "production"].map(m => <SelectItem key={m} value={m} className="capitalize">{m.replace(/_/g, " ")}</SelectItem>)}</SelectContent></Select></div>
              </div>
              <div><Label className="text-xs text-muted-foreground">Truth Disclosure (limitations)</Label><Textarea value={form.truth_disclosure} onChange={e => setForm({...form, truth_disclosure: e.target.value})} className="mt-1 bg-secondary/50 min-h-20" placeholder="Disclose all limitations. What cannot this venture do? What is simulated?" /></div>
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3"><p className="text-xs text-amber-200">New ventures default to <strong>simulation mode</strong> and <strong>acceptance test</strong>. No external deployment or real payments will be claimed.</p></div>
              <Button onClick={handleSave} disabled={saving} className="w-full bg-gradient-to-r from-blue-600 to-blue-500">{saving ? "Creating..." : "Create Venture"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-xs"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search ventures..." className="pl-9 bg-secondary/50" /></div>

      {filtered.length === 0 ? (
        <div className="glass-card rounded-xl p-12 text-center"><Rocket className="w-12 h-12 text-muted-foreground mx-auto mb-3" /><p className="text-sm text-muted-foreground">No ventures yet. Create one to begin the governed workflow.</p></div>
      ) : (
        <div className="space-y-3">
          {filtered.map(v => (
            <Link key={v.id} to={`/forge/ventures/${v.id}`} className="glass-card rounded-xl p-4 flex items-center gap-4 hover:border-primary/30 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500/20 to-amber-400/20 flex items-center justify-center flex-shrink-0"><Rocket className="w-5 h-5 text-blue-400" /></div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap"><p className="font-medium text-foreground text-sm">{v.name}</p><ExecutionModeBadge mode={v.execution_mode} /><StatusBadge status={v.status} /></div>
                <p className="text-xs text-muted-foreground truncate">{v.description || "No description"}</p>
                <p className="text-[10px] text-muted-foreground mt-1 capitalize">Stage: {v.lifecycle_stage?.replace(/_/g, " ")}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}