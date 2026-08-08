import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Pencil, Trash2, Rocket, Skull, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";

const emptyForm = { name: "", description: "", niche: "", keyword: "", status: "scouting", url: "", repo_url: "", mrr: 0, api_costs: 0, ad_spend: 0, subscribers: 0, days_live: 0, assigned_agent: "" };
const statusColors = { scouting: "bg-purple-500/20 text-purple-400", building: "bg-blue-500/20 text-blue-400", testing: "bg-amber-500/20 text-amber-400", live: "bg-green-500/20 text-green-400", scaling: "bg-cyan-500/20 text-cyan-400", killed: "bg-red-500/20 text-red-400", archived: "bg-gray-500/20 text-gray-400" };

export default function MicroApps() {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => { loadApps(); }, []);

  async function loadApps() {
    try { setApps(await base44.entities.MicroApp.list("-created_date", 50)); }
    catch (err) { setError(err.message); } finally { setLoading(false); }
  }

  async function handleSave() {
    if (!form.name.trim()) { toast({ variant: "destructive", title: "Name required" }); return; }
    setSaving(true);
    try {
      const payload = { ...form, mrr: Number(form.mrr), api_costs: Number(form.api_costs), ad_spend: Number(form.ad_spend), subscribers: Number(form.subscribers), days_live: Number(form.days_live), is_demo: true };
      if (editing) { await base44.entities.MicroApp.update(editing.id, payload); toast({ title: "App updated" }); }
      else { await base44.entities.MicroApp.create(payload); toast({ title: "App created" }); }
      setShowCreate(false); setEditing(null); setForm(emptyForm); await loadApps();
    } catch (err) { toast({ variant: "destructive", title: "Error", description: err.message }); }
    finally { setSaving(false); }
  }

  async function handleDelete(id) {
    if (!confirm("Delete this micro-app?")) return;
    try { await base44.entities.MicroApp.delete(id); toast({ title: "App deleted" }); await loadApps(); }
    catch (err) { toast({ variant: "destructive", title: "Error", description: err.message }); }
  }

  async function killApp(app) {
    try {
      await base44.entities.MicroApp.update(app.id, { status: "killed", kill_reason: "DEMO. Killed by Accountant — did not hit profitability threshold." });
      toast({ title: `Killed: ${app.name}` });
      await loadApps();
    } catch (err) { toast({ variant: "destructive", title: "Error", description: err.message }); }
  }

  function openEdit(a) {
    setEditing(a);
    setForm({ name: a.name, description: a.description || "", niche: a.niche || "", keyword: a.keyword || "", status: a.status || "scouting", url: a.url || "", repo_url: a.repo_url || "", mrr: a.mrr || 0, api_costs: a.api_costs || 0, ad_spend: a.ad_spend || 0, subscribers: a.subscribers || 0, days_live: a.days_live || 0, assigned_agent: a.assigned_agent || "" });
    setShowCreate(true);
  }

  const filtered = apps.filter(a => a.name?.toLowerCase().includes(search.toLowerCase()) || a.keyword?.toLowerCase().includes(search.toLowerCase()));

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /></div>;
  if (error) return <div className="glass-card rounded-xl p-8 text-center"><p className="text-destructive text-sm">Error: {error}</p><Button onClick={loadApps} className="mt-3" size="sm">Retry</Button></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><Rocket className="w-6 h-6 text-blue-400" /> Micro Apps</h1><p className="text-sm text-muted-foreground mt-1">Portfolio of micro-SaaS utilities</p></div>
        <Dialog open={showCreate} onOpenChange={(o) => { setShowCreate(o); if (!o) { setEditing(null); setForm(emptyForm); } }}>
          <DialogTrigger asChild><Button className="bg-gradient-to-r from-blue-600 to-blue-500"><Plus className="w-4 h-4" /> Add App</Button></DialogTrigger>
          <DialogContent className="bg-card border-border/50 max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editing ? "Edit App" : "Add Micro App"}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label className="text-xs text-muted-foreground">Name *</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="mt-1 bg-secondary/50" /></div>
              <div><Label className="text-xs text-muted-foreground">Description</Label><Textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="mt-1 bg-secondary/50 min-h-16" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs text-muted-foreground">Niche</Label><Input value={form.niche} onChange={e => setForm({...form, niche: e.target.value})} className="mt-1 bg-secondary/50" /></div>
                <div><Label className="text-xs text-muted-foreground">Keyword</Label><Input value={form.keyword} onChange={e => setForm({...form, keyword: e.target.value})} className="mt-1 bg-secondary/50" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs text-muted-foreground">Status</Label><Select value={form.status} onValueChange={v => setForm({...form, status: v})}><SelectTrigger className="mt-1 bg-secondary/50"><SelectValue /></SelectTrigger><SelectContent>{["scouting", "building", "testing", "live", "scaling", "killed", "archived"].map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent></Select></div>
                <div><Label className="text-xs text-muted-foreground">Assigned Agent</Label><Input value={form.assigned_agent} onChange={e => setForm({...form, assigned_agent: e.target.value})} className="mt-1 bg-secondary/50" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs text-muted-foreground">MRR ($)</Label><Input type="number" value={form.mrr} onChange={e => setForm({...form, mrr: e.target.value})} className="mt-1 bg-secondary/50" /></div>
                <div><Label className="text-xs text-muted-foreground">Subscribers</Label><Input type="number" value={form.subscribers} onChange={e => setForm({...form, subscribers: e.target.value})} className="mt-1 bg-secondary/50" /></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label className="text-xs text-muted-foreground">API Costs ($)</Label><Input type="number" value={form.api_costs} onChange={e => setForm({...form, api_costs: e.target.value})} className="mt-1 bg-secondary/50" /></div>
                <div><Label className="text-xs text-muted-foreground">Ad Spend ($)</Label><Input type="number" value={form.ad_spend} onChange={e => setForm({...form, ad_spend: e.target.value})} className="mt-1 bg-secondary/50" /></div>
                <div><Label className="text-xs text-muted-foreground">Days Live</Label><Input type="number" value={form.days_live} onChange={e => setForm({...form, days_live: e.target.value})} className="mt-1 bg-secondary/50" /></div>
              </div>
              <div><Label className="text-xs text-muted-foreground">URL</Label><Input value={form.url} onChange={e => setForm({...form, url: e.target.value})} className="mt-1 bg-secondary/50" /></div>
              <Button onClick={handleSave} disabled={saving} className="w-full bg-gradient-to-r from-blue-600 to-blue-500">{saving ? "Saving..." : editing ? "Update" : "Create"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-xs"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search apps..." className="pl-9 bg-secondary/50" /></div>

      {filtered.length === 0 ? (
        <div className="glass-card rounded-xl p-12 text-center"><Rocket className="w-12 h-12 text-muted-foreground mx-auto mb-3" /><p className="text-sm text-muted-foreground">No micro-apps yet.</p></div>
      ) : (
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border/50 text-xs text-muted-foreground uppercase">
                <th className="text-left p-3 font-medium">App</th><th className="text-left p-3 font-medium">Status</th><th className="text-right p-3 font-medium">MRR</th><th className="text-right p-3 font-medium">Costs</th><th className="text-right p-3 font-medium">Net</th><th className="text-right p-3 font-medium">Days</th><th className="text-right p-3 font-medium">Actions</th>
              </tr></thead>
              <tbody>
                {filtered.map(app => {
                  const costs = (app.api_costs || 0) + (app.ad_spend || 0);
                  const net = (app.mrr || 0) - costs;
                  return (
                    <tr key={app.id} className="border-b border-border/20 hover:bg-secondary/20">
                      <td className="p-3"><p className="font-medium text-foreground">{app.name}</p><p className="text-xs text-muted-foreground">{app.keyword || app.niche}</p></td>
                      <td className="p-3"><Badge className={`text-xs ${statusColors[app.status] || ""}`}>{app.status}</Badge></td>
                      <td className="p-3 text-right text-green-400 font-medium">${(app.mrr || 0).toLocaleString()}</td>
                      <td className="p-3 text-right text-red-400">${costs.toLocaleString()}</td>
                      <td className={`p-3 text-right font-medium ${net >= 0 ? "text-green-400" : "text-red-400"}`}>${net.toLocaleString()}</td>
                      <td className="p-3 text-right text-muted-foreground">{app.days_live}</td>
                      <td className="p-3"><div className="flex justify-end gap-1">
                        {app.status === "live" || app.status === "testing" ? <Button size="icon" variant="ghost" className="h-8 w-8 text-red-400 hover:bg-red-500/10" onClick={() => killApp(app)} title="Kill app"><Skull className="w-3.5 h-3.5" /></Button> : null}
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(app)}><Pencil className="w-3.5 h-3.5" /></Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => handleDelete(app.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                      </div></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}