import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, DollarSign, Pencil, Trash2, Skull, TrendingUp, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";

const emptyForm = { app_id: "", app_name: "", record_date: new Date().toISOString().split("T")[0], revenue: 0, api_costs: 0, ad_spend: 0, hosting_costs: 0, net_profit: 0, subscribers: 0, decision: "monitor", decision_reason: "", assigned_agent: "" };
const decisionColors = { monitor: "bg-amber-500/20 text-amber-400", scale: "bg-green-500/20 text-green-400", kill: "bg-red-500/20 text-red-400", archive: "bg-gray-500/20 text-gray-400", hold: "bg-blue-500/20 text-blue-400" };

export default function VentureFinancials() {
  const [records, setRecords] = useState([]);
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
      const [r, a] = await Promise.all([
        base44.entities.VentureFinancial.list("-record_date", 50),
        base44.entities.MicroApp.list(),
      ]);
      setRecords(r); setApps(a);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  }

  async function handleSave() {
    if (!form.app_id) { toast({ variant: "destructive", title: "App required" }); return; }
    setSaving(true);
    try {
      const app = apps.find(a => a.id === form.app_id);
      const revenue = Number(form.revenue), apiCosts = Number(form.api_costs), adSpend = Number(form.ad_spend), hosting = Number(form.hosting_costs);
      const net = revenue - apiCosts - adSpend - hosting;
      const payload = { ...form, app_name: app?.name || "", revenue, api_costs: apiCosts, ad_spend: adSpend, hosting_costs: hosting, net_profit: net, subscribers: Number(form.subscribers), is_demo: true };
      if (editing) { await base44.entities.VentureFinancial.update(editing.id, payload); toast({ title: "Financial record updated" }); }
      else { await base44.entities.VentureFinancial.create(payload); toast({ title: "Financial record created" }); }
      setShowCreate(false); setEditing(null); setForm(emptyForm); await loadData();
    } catch (err) { toast({ variant: "destructive", title: "Error", description: err.message }); }
    finally { setSaving(false); }
  }

  async function handleDelete(id) {
    if (!confirm("Delete this financial record?")) return;
    try { await base44.entities.VentureFinancial.delete(id); toast({ title: "Record deleted" }); await loadData(); }
    catch (err) { toast({ variant: "destructive", title: "Error", description: err.message }); }
  }

  function openEdit(r) {
    setEditing(r);
    setForm({ app_id: r.app_id, app_name: r.app_name, record_date: r.record_date || new Date().toISOString().split("T")[0], revenue: r.revenue || 0, api_costs: r.api_costs || 0, ad_spend: r.ad_spend || 0, hosting_costs: r.hosting_costs || 0, net_profit: r.net_profit || 0, subscribers: r.subscribers || 0, decision: r.decision || "monitor", decision_reason: r.decision_reason || "", assigned_agent: r.assigned_agent || "" });
    setShowCreate(true);
  }

  const totalRevenue = records.reduce((s, r) => s + (r.revenue || 0), 0);
  const totalCosts = records.reduce((s, r) => s + (r.api_costs || 0) + (r.ad_spend || 0) + (r.hosting_costs || 0), 0);
  const totalNet = totalRevenue - totalCosts;

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /></div>;
  if (error) return <div className="glass-card rounded-xl p-8 text-center"><p className="text-destructive text-sm">Error: {error}</p><Button onClick={loadData} className="mt-3" size="sm">Retry</Button></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><DollarSign className="w-6 h-6 text-emerald-400" /> Financials</h1><p className="text-sm text-muted-foreground mt-1">Revenue, costs, and profitability per app</p></div>
        <Dialog open={showCreate} onOpenChange={(o) => { setShowCreate(o); if (!o) { setEditing(null); setForm(emptyForm); } }}>
          <DialogTrigger asChild><Button className="bg-gradient-to-r from-emerald-600 to-emerald-500"><Plus className="w-4 h-4" /> Add Record</Button></DialogTrigger>
          <DialogContent className="bg-card border-border/50 max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editing ? "Edit Financial Record" : "Add Financial Record"}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label className="text-xs text-muted-foreground">App *</Label><Select value={form.app_id} onValueChange={v => setForm({...form, app_id: v})}><SelectTrigger className="mt-1 bg-secondary/50"><SelectValue placeholder="Select app" /></SelectTrigger><SelectContent>{apps.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent></Select></div>
              <div><Label className="text-xs text-muted-foreground">Date</Label><Input type="date" value={form.record_date} onChange={e => setForm({...form, record_date: e.target.value})} className="mt-1 bg-secondary/50" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs text-muted-foreground">Revenue ($)</Label><Input type="number" value={form.revenue} onChange={e => setForm({...form, revenue: e.target.value})} className="mt-1 bg-secondary/50" /></div>
                <div><Label className="text-xs text-muted-foreground">Subscribers</Label><Input type="number" value={form.subscribers} onChange={e => setForm({...form, subscribers: e.target.value})} className="mt-1 bg-secondary/50" /></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label className="text-xs text-muted-foreground">API Costs</Label><Input type="number" value={form.api_costs} onChange={e => setForm({...form, api_costs: e.target.value})} className="mt-1 bg-secondary/50" /></div>
                <div><Label className="text-xs text-muted-foreground">Ad Spend</Label><Input type="number" value={form.ad_spend} onChange={e => setForm({...form, ad_spend: e.target.value})} className="mt-1 bg-secondary/50" /></div>
                <div><Label className="text-xs text-muted-foreground">Hosting</Label><Input type="number" value={form.hosting_costs} onChange={e => setForm({...form, hosting_costs: e.target.value})} className="mt-1 bg-secondary/50" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs text-muted-foreground">Decision</Label><Select value={form.decision} onValueChange={v => setForm({...form, decision: v})}><SelectTrigger className="mt-1 bg-secondary/50"><SelectValue /></SelectTrigger><SelectContent>{["monitor", "scale", "kill", "archive", "hold"].map(d => <SelectItem key={d} value={d} className="capitalize">{d}</SelectItem>)}</SelectContent></Select></div>
                <div><Label className="text-xs text-muted-foreground">Agent</Label><Input value={form.assigned_agent} onChange={e => setForm({...form, assigned_agent: e.target.value})} className="mt-1 bg-secondary/50" /></div>
              </div>
              <div><Label className="text-xs text-muted-foreground">Decision Reason</Label><Input value={form.decision_reason} onChange={e => setForm({...form, decision_reason: e.target.value})} className="mt-1 bg-secondary/50" /></div>
              <Button onClick={handleSave} disabled={saving} className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500">{saving ? "Saving..." : editing ? "Update" : "Create"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="glass-card rounded-xl p-4"><div className="flex items-center gap-2 mb-2"><TrendingUp className="w-4 h-4 text-green-400" /><span className="text-xs text-muted-foreground">Total Revenue</span></div><p className="text-xl font-bold text-green-400">${totalRevenue.toLocaleString()}</p></div>
        <div className="glass-card rounded-xl p-4"><div className="flex items-center gap-2 mb-2"><TrendingDown className="w-4 h-4 text-red-400" /><span className="text-xs text-muted-foreground">Total Costs</span></div><p className="text-xl font-bold text-red-400">${totalCosts.toLocaleString()}</p></div>
        <div className="glass-card rounded-xl p-4"><div className="flex items-center gap-2 mb-2"><DollarSign className="w-4 h-4 text-blue-400" /><span className="text-xs text-muted-foreground">Net Profit</span></div><p className={`text-xl font-bold ${totalNet >= 0 ? "text-green-400" : "text-red-400"}`}>${totalNet.toLocaleString()}</p></div>
      </div>

      {records.length === 0 ? (
        <div className="glass-card rounded-xl p-12 text-center"><DollarSign className="w-12 h-12 text-muted-foreground mx-auto mb-3" /><p className="text-sm text-muted-foreground">No financial records yet.</p></div>
      ) : (
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border/50 text-xs text-muted-foreground uppercase">
                <th className="text-left p-3 font-medium">App</th><th className="text-right p-3 font-medium">Revenue</th><th className="text-right p-3 font-medium">API</th><th className="text-right p-3 font-medium">Ads</th><th className="text-right p-3 font-medium">Net</th><th className="text-center p-3 font-medium">Decision</th><th className="text-right p-3 font-medium">Actions</th>
              </tr></thead>
              <tbody>
                {records.map(r => (
                  <tr key={r.id} className="border-b border-border/20 hover:bg-secondary/20">
                    <td className="p-3"><p className="font-medium text-foreground">{r.app_name}</p><p className="text-xs text-muted-foreground">{r.subscribers} subs</p></td>
                    <td className="p-3 text-right text-green-400 font-medium">${(r.revenue || 0).toLocaleString()}</td>
                    <td className="p-3 text-right text-muted-foreground">${(r.api_costs || 0).toLocaleString()}</td>
                    <td className="p-3 text-right text-muted-foreground">${(r.ad_spend || 0).toLocaleString()}</td>
                    <td className={`p-3 text-right font-medium ${(r.net_profit || 0) >= 0 ? "text-green-400" : "text-red-400"}`}>${(r.net_profit || 0).toLocaleString()}</td>
                    <td className="p-3 text-center"><Badge className={`text-xs ${decisionColors[r.decision] || ""}`}>{r.decision}</Badge></td>
                    <td className="p-3"><div className="flex justify-end gap-1"><Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(r)}><Pencil className="w-3.5 h-3.5" /></Button><Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => handleDelete(r.id)}><Trash2 className="w-3.5 h-3.5" /></Button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}