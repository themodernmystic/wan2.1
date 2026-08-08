import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Search, Pencil, Trash2, Rocket, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";

const emptyForm = { title: "", description: "", source: "reddit", source_url: "", keyword: "", search_volume: 0, keyword_value: "", competition_score: 0, opportunity_score: 0, status: "found", assigned_to: "" };
const statusColors = { found: "bg-blue-500/20 text-blue-400", validated: "bg-amber-500/20 text-amber-400", building: "bg-purple-500/20 text-purple-400", live: "bg-green-500/20 text-green-400", rejected: "bg-red-500/20 text-red-400", killed: "bg-gray-500/20 text-gray-400" };

export default function NicheOpportunities() {
  const [opps, setOpps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => { loadOpps(); }, []);

  async function loadOpps() {
    try { setOpps(await base44.entities.NicheOpportunity.list("-created_date", 50)); }
    catch (err) { setError(err.message); } finally { setLoading(false); }
  }

  async function handleSave() {
    if (!form.title.trim()) { toast({ variant: "destructive", title: "Title required" }); return; }
    setSaving(true);
    try {
      const payload = { ...form, search_volume: Number(form.search_volume), competition_score: Number(form.competition_score), opportunity_score: Number(form.opportunity_score), is_demo: true };
      if (editing) { await base44.entities.NicheOpportunity.update(editing.id, payload); toast({ title: "Opportunity updated" }); }
      else { await base44.entities.NicheOpportunity.create(payload); toast({ title: "Opportunity created" }); }
      setShowCreate(false); setEditing(null); setForm(emptyForm); await loadOpps();
    } catch (err) { toast({ variant: "destructive", title: "Error", description: err.message }); }
    finally { setSaving(false); }
  }

  async function handleDelete(id) {
    if (!confirm("Delete this opportunity?")) return;
    try { await base44.entities.NicheOpportunity.delete(id); toast({ title: "Opportunity deleted" }); await loadOpps(); }
    catch (err) { toast({ variant: "destructive", title: "Error", description: err.message }); }
  }

  async function buildOpportunity(opp) {
    try { await base44.entities.NicheOpportunity.update(opp.id, { status: "building" }); toast({ title: `Building: ${opp.title}` }); await loadOpps(); }
    catch (err) { toast({ variant: "destructive", title: "Error", description: err.message }); }
  }

  function openEdit(o) {
    setEditing(o);
    setForm({ title: o.title, description: o.description || "", source: o.source || "reddit", source_url: o.source_url || "", keyword: o.keyword || "", search_volume: o.search_volume || 0, keyword_value: o.keyword_value || "", competition_score: o.competition_score || 0, opportunity_score: o.opportunity_score || 0, status: o.status || "found", assigned_to: o.assigned_to || "" });
    setShowCreate(true);
  }

  const filtered = opps.filter(o => o.title?.toLowerCase().includes(search.toLowerCase()) || o.keyword?.toLowerCase().includes(search.toLowerCase()));

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /></div>;
  if (error) return <div className="glass-card rounded-xl p-8 text-center"><p className="text-destructive text-sm">Error: {error}</p><Button onClick={loadOpps} className="mt-3" size="sm">Retry</Button></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><Search className="w-6 h-6 text-purple-400" /> Niche Opportunities</h1><p className="text-sm text-muted-foreground mt-1">Scout's discovered niches — ranked by opportunity score</p></div>
        <Dialog open={showCreate} onOpenChange={(o) => { setShowCreate(o); if (!o) { setEditing(null); setForm(emptyForm); } }}>
          <DialogTrigger asChild><Button className="bg-gradient-to-r from-purple-600 to-purple-500"><Plus className="w-4 h-4" /> Add Opportunity</Button></DialogTrigger>
          <DialogContent className="bg-card border-border/50 max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editing ? "Edit Opportunity" : "Add Niche Opportunity"}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label className="text-xs text-muted-foreground">Title *</Label><Input value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="mt-1 bg-secondary/50" /></div>
              <div><Label className="text-xs text-muted-foreground">Description</Label><Textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="mt-1 bg-secondary/50 min-h-16" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs text-muted-foreground">Source</Label><Select value={form.source} onValueChange={v => setForm({...form, source: v})}><SelectTrigger className="mt-1 bg-secondary/50"><SelectValue /></SelectTrigger><SelectContent>{["github", "reddit", "twitter", "indiehackers", "producthunt", "google_trends", "manual"].map(s => <SelectItem key={s} value={s} className="capitalize">{s.replace("_", " ")}</SelectItem>)}</SelectContent></Select></div>
                <div><Label className="text-xs text-muted-foreground">Keyword</Label><Input value={form.keyword} onChange={e => setForm({...form, keyword: e.target.value})} className="mt-1 bg-secondary/50" /></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label className="text-xs text-muted-foreground">Search Vol</Label><Input type="number" value={form.search_volume} onChange={e => setForm({...form, search_volume: e.target.value})} className="mt-1 bg-secondary/50" /></div>
                <div><Label className="text-xs text-muted-foreground">Competition</Label><Input type="number" value={form.competition_score} onChange={e => setForm({...form, competition_score: e.target.value})} className="mt-1 bg-secondary/50" /></div>
                <div><Label className="text-xs text-muted-foreground">Opp Score</Label><Input type="number" value={form.opportunity_score} onChange={e => setForm({...form, opportunity_score: e.target.value})} className="mt-1 bg-secondary/50" /></div>
              </div>
              <div><Label className="text-xs text-muted-foreground">Keyword Value</Label><Input value={form.keyword_value} onChange={e => setForm({...form, keyword_value: e.target.value})} className="mt-1 bg-secondary/50" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs text-muted-foreground">Status</Label><Select value={form.status} onValueChange={v => setForm({...form, status: v})}><SelectTrigger className="mt-1 bg-secondary/50"><SelectValue /></SelectTrigger><SelectContent>{["found", "validated", "building", "live", "rejected", "killed"].map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent></Select></div>
                <div><Label className="text-xs text-muted-foreground">Assigned To</Label><Input value={form.assigned_to} onChange={e => setForm({...form, assigned_to: e.target.value})} className="mt-1 bg-secondary/50" /></div>
              </div>
              <Button onClick={handleSave} disabled={saving} className="w-full bg-gradient-to-r from-purple-600 to-purple-500">{saving ? "Saving..." : editing ? "Update" : "Create"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-xs"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search opportunities..." className="pl-9 bg-secondary/50" /></div>

      {filtered.length === 0 ? (
        <div className="glass-card rounded-xl p-12 text-center"><Search className="w-12 h-12 text-muted-foreground mx-auto mb-3" /><p className="text-sm text-muted-foreground">No opportunities found.</p></div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.sort((a, b) => (b.opportunity_score || 0) - (a.opportunity_score || 0)).map(opp => (
            <div key={opp.id} className="glass-card rounded-xl p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0"><h3 className="font-semibold text-foreground text-sm truncate">{opp.title}</h3><p className="text-xs text-muted-foreground capitalize">{opp.source?.replace("_", " ")}</p></div>
                <Badge className={`text-xs ${statusColors[opp.status] || ""}`}>{opp.status}</Badge>
              </div>
              {opp.description && <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{opp.description}</p>}
              <div className="grid grid-cols-3 gap-2 mb-3 text-center">
                <div className="p-2 rounded bg-secondary/30"><p className="text-xs text-muted-foreground">Volume</p><p className="text-sm font-semibold text-foreground">{(opp.search_volume || 0).toLocaleString()}</p></div>
                <div className="p-2 rounded bg-secondary/30"><p className="text-xs text-muted-foreground">Comp</p><p className="text-sm font-semibold text-foreground">{opp.competition_score || 0}</p></div>
                <div className="p-2 rounded bg-blue-500/10"><p className="text-xs text-muted-foreground">Score</p><p className="text-sm font-bold text-blue-400">{opp.opportunity_score || 0}</p></div>
              </div>
              {opp.keyword_value && <p className="text-xs text-emerald-400 mb-2 flex items-center gap-1"><TrendingUp className="w-3 h-3" /> {opp.keyword_value}</p>}
              <div className="flex gap-1 pt-2 border-t border-border/30">
                {opp.status === "found" || opp.status === "validated" ? <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => buildOpportunity(opp)}><Rocket className="w-3 h-3" /> Build</Button> : null}
                <Button size="icon" variant="ghost" className="h-7 w-7 ml-auto" onClick={() => openEdit(opp)}><Pencil className="w-3 h-3" /></Button>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={() => handleDelete(opp.id)}><Trash2 className="w-3 h-3" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}