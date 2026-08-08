import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Megaphone, Pencil, Trash2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";

const emptyForm = { app_id: "", app_name: "", channel: "seo", campaign_type: "", budget: 0, spend: 0, impressions: 0, clicks: 0, conversions: 0, roi: 0, status: "draft", assigned_agent: "" };
const channelColors = { seo: "bg-blue-500/20 text-blue-400", google_ads: "bg-green-500/20 text-green-400", facebook_ads: "bg-blue-600/20 text-blue-500", content: "bg-purple-500/20 text-purple-400", social: "bg-pink-500/20 text-pink-400", email: "bg-amber-500/20 text-amber-400", reddit: "bg-orange-500/20 text-orange-400", producthunt: "bg-red-500/20 text-red-400" };
const statusColors = { draft: "bg-gray-500/20 text-gray-400", active: "bg-green-500/20 text-green-400", paused: "bg-amber-500/20 text-amber-400", completed: "bg-blue-500/20 text-blue-400", failed: "bg-red-500/20 text-red-400" };

export default function GrowthCampaigns() {
  const [campaigns, setCampaigns] = useState([]);
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [c, a] = await Promise.all([
        base44.entities.GrowthCampaign.list("-created_date", 50),
        base44.entities.MicroApp.list(),
      ]);
      setCampaigns(c); setApps(a);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  }

  async function handleSave() {
    if (!form.app_id) { toast({ variant: "destructive", title: "App required" }); return; }
    setSaving(true);
    try {
      const app = apps.find(a => a.id === form.app_id);
      const payload = { ...form, app_name: app?.name || "", budget: Number(form.budget), spend: Number(form.spend), impressions: Number(form.impressions), clicks: Number(form.clicks), conversions: Number(form.conversions), roi: Number(form.roi), is_demo: true };
      if (editing) { await base44.entities.GrowthCampaign.update(editing.id, payload); toast({ title: "Campaign updated" }); }
      else { await base44.entities.GrowthCampaign.create(payload); toast({ title: "Campaign created" }); }
      setShowCreate(false); setEditing(null); setForm(emptyForm); await loadData();
    } catch (err) { toast({ variant: "destructive", title: "Error", description: err.message }); }
    finally { setSaving(false); }
  }

  async function handleDelete(id) {
    if (!confirm("Delete this campaign?")) return;
    try { await base44.entities.GrowthCampaign.delete(id); toast({ title: "Campaign deleted" }); await loadData(); }
    catch (err) { toast({ variant: "destructive", title: "Error", description: err.message }); }
  }

  function openEdit(c) {
    setEditing(c);
    setForm({ app_id: c.app_id, app_name: c.app_name, channel: c.channel || "seo", campaign_type: c.campaign_type || "", budget: c.budget || 0, spend: c.spend || 0, impressions: c.impressions || 0, clicks: c.clicks || 0, conversions: c.conversions || 0, roi: c.roi || 0, status: c.status || "draft", assigned_agent: c.assigned_agent || "" });
    setShowCreate(true);
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /></div>;
  if (error) return <div className="glass-card rounded-xl p-8 text-center"><p className="text-destructive text-sm">Error: {error}</p><Button onClick={loadData} className="mt-3" size="sm">Retry</Button></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><Megaphone className="w-6 h-6 text-amber-400" /> Growth Campaigns</h1><p className="text-sm text-muted-foreground mt-1">Marketing campaigns per app</p></div>
        <Dialog open={showCreate} onOpenChange={(o) => { setShowCreate(o); if (!o) { setEditing(null); setForm(emptyForm); } }}>
          <DialogTrigger asChild><Button className="bg-gradient-to-r from-amber-600 to-amber-500"><Plus className="w-4 h-4" /> Add Campaign</Button></DialogTrigger>
          <DialogContent className="bg-card border-border/50 max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editing ? "Edit Campaign" : "Add Campaign"}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label className="text-xs text-muted-foreground">App *</Label><Select value={form.app_id} onValueChange={v => setForm({...form, app_id: v})}><SelectTrigger className="mt-1 bg-secondary/50"><SelectValue placeholder="Select app" /></SelectTrigger><SelectContent>{apps.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent></Select></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs text-muted-foreground">Channel</Label><Select value={form.channel} onValueChange={v => setForm({...form, channel: v})}><SelectTrigger className="mt-1 bg-secondary/50"><SelectValue /></SelectTrigger><SelectContent>{["seo", "google_ads", "facebook_ads", "content", "social", "email", "reddit", "producthunt"].map(c => <SelectItem key={c} value={c} className="capitalize">{c.replace("_", " ")}</SelectItem>)}</SelectContent></Select></div>
                <div><Label className="text-xs text-muted-foreground">Status</Label><Select value={form.status} onValueChange={v => setForm({...form, status: v})}><SelectTrigger className="mt-1 bg-secondary/50"><SelectValue /></SelectTrigger><SelectContent>{["draft", "active", "paused", "completed", "failed"].map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent></Select></div>
              </div>
              <div><Label className="text-xs text-muted-foreground">Campaign Type</Label><Input value={form.campaign_type} onChange={e => setForm({...form, campaign_type: e.target.value})} className="mt-1 bg-secondary/50" /></div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label className="text-xs text-muted-foreground">Budget ($)</Label><Input type="number" value={form.budget} onChange={e => setForm({...form, budget: e.target.value})} className="mt-1 bg-secondary/50" /></div>
                <div><Label className="text-xs text-muted-foreground">Spend ($)</Label><Input type="number" value={form.spend} onChange={e => setForm({...form, spend: e.target.value})} className="mt-1 bg-secondary/50" /></div>
                <div><Label className="text-xs text-muted-foreground">ROI</Label><Input type="number" step="0.1" value={form.roi} onChange={e => setForm({...form, roi: e.target.value})} className="mt-1 bg-secondary/50" /></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label className="text-xs text-muted-foreground">Impressions</Label><Input type="number" value={form.impressions} onChange={e => setForm({...form, impressions: e.target.value})} className="mt-1 bg-secondary/50" /></div>
                <div><Label className="text-xs text-muted-foreground">Clicks</Label><Input type="number" value={form.clicks} onChange={e => setForm({...form, clicks: e.target.value})} className="mt-1 bg-secondary/50" /></div>
                <div><Label className="text-xs text-muted-foreground">Conversions</Label><Input type="number" value={form.conversions} onChange={e => setForm({...form, conversions: e.target.value})} className="mt-1 bg-secondary/50" /></div>
              </div>
              <Button onClick={handleSave} disabled={saving} className="w-full bg-gradient-to-r from-amber-600 to-amber-500">{saving ? "Saving..." : editing ? "Update" : "Create"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {campaigns.length === 0 ? (
        <div className="glass-card rounded-xl p-12 text-center"><Megaphone className="w-12 h-12 text-muted-foreground mx-auto mb-3" /><p className="text-sm text-muted-foreground">No campaigns yet.</p></div>
      ) : (
        <div className="space-y-3">
          {campaigns.map(c => {
            const ctr = c.impressions > 0 ? ((c.clicks / c.impressions) * 100).toFixed(1) : "0.0";
            const cvr = c.clicks > 0 ? ((c.conversions / c.clicks) * 100).toFixed(1) : "0.0";
            return (
              <div key={c.id} className="glass-card rounded-xl p-4">
                <div className="flex items-start justify-between flex-wrap gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <p className="font-medium text-foreground text-sm">{c.app_name}</p>
                      <Badge className={`text-xs ${channelColors[c.channel] || ""}`}>{c.channel?.replace("_", " ")}</Badge>
                      <Badge className={`text-xs ${statusColors[c.status] || ""}`}>{c.status}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{c.campaign_type}</p>
                  </div>
                  <div className="flex gap-1"><Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(c)}><Pencil className="w-3.5 h-3.5" /></Button><Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => handleDelete(c.id)}><Trash2 className="w-3.5 h-3.5" /></Button></div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 text-center">
                  <div><p className="text-xs text-muted-foreground">Budget</p><p className="text-sm font-semibold text-foreground">${(c.budget || 0).toLocaleString()}</p></div>
                  <div><p className="text-xs text-muted-foreground">Spend</p><p className="text-sm font-semibold text-red-400">${(c.spend || 0).toLocaleString()}</p></div>
                  <div><p className="text-xs text-muted-foreground">Impr.</p><p className="text-sm font-semibold text-foreground">{(c.impressions || 0).toLocaleString()}</p></div>
                  <div><p className="text-xs text-muted-foreground">CTR</p><p className="text-sm font-semibold text-blue-400">{ctr}%</p></div>
                  <div><p className="text-xs text-muted-foreground">Conv.</p><p className="text-sm font-semibold text-green-400">{c.conversions || 0}</p></div>
                  <div><p className="text-xs text-muted-foreground">ROI</p><p className={`text-sm font-bold ${(c.roi || 0) >= 1 ? "text-green-400" : "text-amber-400"}`}>{(c.roi || 0).toFixed(1)}x</p></div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}