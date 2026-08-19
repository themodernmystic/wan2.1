import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Search, Pencil, Trash2, Users, Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";

const emptyForm = { name: "", email: "", phone: "", address: "", tier: "bronze", notes: "" };
const tierColors = { bronze: "bg-amber-700/20 text-amber-500", silver: "bg-gray-400/20 text-gray-300", gold: "bg-yellow-500/20 text-yellow-400", vip: "bg-purple-500/20 text-purple-400" };

export default function CrystalCustomers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => { loadCustomers(); }, []);

  async function loadCustomers() {
    try { setCustomers(await base44.entities.CrystalCustomer.list("-created_date", 50)); }
    catch (err) { setError(err.message); } finally { setLoading(false); }
  }

  async function handleSave() {
    if (!form.name.trim()) { toast({ variant: "destructive", title: "Name required" }); return; }
    setSaving(true);
    try {
      const payload = { ...form, is_demo: true };
      if (editing) { await base44.entities.CrystalCustomer.update(editing.id, payload); toast({ title: "Customer updated" }); }
      else { await base44.entities.CrystalCustomer.create(payload); toast({ title: "Customer created" }); }
      setShowCreate(false); setEditing(null); setForm(emptyForm); await loadCustomers();
    } catch (err) { toast({ variant: "destructive", title: "Error", description: err.message }); }
    finally { setSaving(false); }
  }

  async function handleDelete(id) {
    if (!confirm("Delete this customer?")) return;
    try { await base44.entities.CrystalCustomer.delete(id); toast({ title: "Customer deleted" }); await loadCustomers(); }
    catch (err) { toast({ variant: "destructive", title: "Error", description: err.message }); }
  }

  function openEdit(c) { setEditing(c); setForm({ name: c.name, email: c.email || "", phone: c.phone || "", address: c.address || "", tier: c.tier || "bronze", notes: c.notes || "" }); setShowCreate(true); }

  const filtered = customers.filter(c => c.name?.toLowerCase().includes(search.toLowerCase()) || c.email?.toLowerCase().includes(search.toLowerCase()));

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /></div>;
  if (error) return <div className="glass-card rounded-xl p-8 text-center"><p className="text-destructive text-sm">Error: {error}</p><Button onClick={loadCustomers} className="mt-3" size="sm">Retry</Button></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl font-bold text-foreground">Customers</h1><p className="text-sm text-muted-foreground mt-1">Manage customer relationships</p></div>
        <Dialog open={showCreate} onOpenChange={(o) => { setShowCreate(o); if (!o) { setEditing(null); setForm(emptyForm); } }}>
          <DialogTrigger asChild><Button className="bg-gradient-to-r from-purple-600 to-purple-500"><Plus className="w-4 h-4" /> Add Customer</Button></DialogTrigger>
          <DialogContent className="bg-card border-border/50 max-w-md">
            <DialogHeader><DialogTitle>{editing ? "Edit Customer" : "Add Customer"}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label className="text-xs text-muted-foreground">Name *</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="mt-1 bg-secondary/50" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs text-muted-foreground">Email</Label><Input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="mt-1 bg-secondary/50" /></div>
                <div><Label className="text-xs text-muted-foreground">Phone</Label><Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="mt-1 bg-secondary/50" /></div>
              </div>
              <div><Label className="text-xs text-muted-foreground">Address</Label><Input value={form.address} onChange={e => setForm({...form, address: e.target.value})} className="mt-1 bg-secondary/50" /></div>
              <div><Label className="text-xs text-muted-foreground">Tier</Label><Select value={form.tier} onValueChange={v => setForm({...form, tier: v})}><SelectTrigger className="mt-1 bg-secondary/50"><SelectValue /></SelectTrigger><SelectContent>{["bronze", "silver", "gold", "vip"].map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent></Select></div>
              <div><Label className="text-xs text-muted-foreground">Notes</Label><Textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} className="mt-1 bg-secondary/50 min-h-16" /></div>
              <Button onClick={handleSave} disabled={saving} className="w-full bg-gradient-to-r from-purple-600 to-purple-500">{saving ? "Saving..." : editing ? "Update" : "Create"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-xs"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search customers..." className="pl-9 bg-secondary/50" /></div>

      {filtered.length === 0 ? (
        <div className="glass-card rounded-xl p-12 text-center"><Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" /><p className="text-sm text-muted-foreground">No customers found. Add your first customer to get started.</p></div>
      ) : (
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border/50 text-xs text-muted-foreground uppercase">
                <th className="text-left p-3 font-medium">Name</th><th className="text-left p-3 font-medium">Contact</th><th className="text-left p-3 font-medium">Tier</th><th className="text-right p-3 font-medium">Orders</th><th className="text-right p-3 font-medium">Spent</th><th className="text-right p-3 font-medium">Actions</th>
              </tr></thead>
              <tbody>
                {filtered.map(c => (
                  <tr key={c.id} className="border-b border-border/20 hover:bg-secondary/20">
                    <td className="p-3 font-medium text-foreground">{c.name}</td>
                    <td className="p-3"><div className="flex flex-col gap-0.5"><span className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="w-3 h-3" />{c.email || "—"}</span><span className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3" />{c.phone || "—"}</span></div></td>
                    <td className="p-3"><Badge className={`text-xs capitalize ${tierColors[c.tier] || ""}`}>{c.tier}</Badge></td>
                    <td className="p-3 text-right text-muted-foreground">{c.total_orders || 0}</td>
                    <td className="p-3 text-right text-muted-foreground">${(c.total_spent || 0).toFixed(2)}</td>
                    <td className="p-3"><div className="flex justify-end gap-1"><Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(c)}><Pencil className="w-3.5 h-3.5" /></Button><Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => handleDelete(c.id)}><Trash2 className="w-3.5 h-3.5" /></Button></div></td>
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