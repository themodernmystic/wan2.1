import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";

const statusColors = { claimed: "bg-blue-500/20 text-blue-400", in_basket: "bg-amber-500/20 text-amber-400", ordered: "bg-green-500/20 text-green-400", fulfilled: "bg-emerald-500/20 text-emerald-400", cancelled: "bg-red-500/20 text-red-400" };

export default function CrystalLiveSale() {
  const [claims, setClaims] = useState([]);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ product_id: "", customer_id: "", sale_event: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [c, p, cust] = await Promise.all([
        base44.entities.LiveSaleClaim.list("-claimed_at", 50),
        base44.entities.CrystalProduct.list(),
        base44.entities.CrystalCustomer.list(),
      ]);
      setClaims(c); setProducts(p); setCustomers(cust);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  }

  async function handleCreate() {
    if (!form.product_id || !form.customer_id) { toast({ variant: "destructive", title: "Product and customer required" }); return; }
    setSaving(true);
    try {
      const product = products.find(p => p.id === form.product_id);
      const customer = customers.find(c => c.id === form.customer_id);
      await base44.entities.LiveSaleClaim.create({
        product_id: form.product_id, product_name: product?.name, product_price: product?.price,
        customer_id: form.customer_id, customer_name: customer?.name,
        sale_event: form.sale_event || "DEMO Live Sale", status: "claimed",
        claimed_at: new Date().toISOString(), notes: form.notes, is_demo: true
      });
      toast({ title: "Claim created" });
      setShowCreate(false); setForm({ product_id: "", customer_id: "", sale_event: "", notes: "" });
      await loadData();
    } catch (err) { toast({ variant: "destructive", title: "Error", description: err.message }); }
    finally { setSaving(false); }
  }

  async function updateStatus(id, status) {
    try { await base44.entities.LiveSaleClaim.update(id, { status }); toast({ title: `Status → ${status}` }); await loadData(); }
    catch (err) { toast({ variant: "destructive", title: "Error", description: err.message }); }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /></div>;
  if (error) return <div className="glass-card rounded-xl p-8 text-center"><p className="text-destructive text-sm">Error: {error}</p><Button onClick={loadData} className="mt-3" size="sm">Retry</Button></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><Radio className="w-6 h-6 text-amber-400" /> Live Sale Claims</h1><p className="text-sm text-muted-foreground mt-1">Manage product claims during live sales</p></div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild><Button className="bg-gradient-to-r from-amber-600 to-amber-500"><Plus className="w-4 h-4" /> New Claim</Button></DialogTrigger>
          <DialogContent className="bg-card border-border/50 max-w-md">
            <DialogHeader><DialogTitle>Create Live Sale Claim</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label className="text-xs text-muted-foreground">Product *</Label><Select value={form.product_id} onValueChange={v => setForm({...form, product_id: v})}><SelectTrigger className="mt-1 bg-secondary/50"><SelectValue placeholder="Select product" /></SelectTrigger><SelectContent>{products.map(p => <SelectItem key={p.id} value={p.id}>{p.name} — ${p.price?.toFixed(2)}</SelectItem>)}</SelectContent></Select></div>
              <div><Label className="text-xs text-muted-foreground">Customer *</Label><Select value={form.customer_id} onValueChange={v => setForm({...form, customer_id: v})}><SelectTrigger className="mt-1 bg-secondary/50"><SelectValue placeholder="Select customer" /></SelectTrigger><SelectContent>{customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div>
              <div><Label className="text-xs text-muted-foreground">Sale Event</Label><Input value={form.sale_event} onChange={e => setForm({...form, sale_event: e.target.value})} placeholder="e.g. Friday Night Live" className="mt-1 bg-secondary/50" /></div>
              <div><Label className="text-xs text-muted-foreground">Notes</Label><Input value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} className="mt-1 bg-secondary/50" /></div>
              <Button onClick={handleCreate} disabled={saving} className="w-full bg-gradient-to-r from-amber-600 to-amber-500">{saving ? "Creating..." : "Create Claim"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {claims.length === 0 ? (
        <div className="glass-card rounded-xl p-12 text-center"><Radio className="w-12 h-12 text-muted-foreground mx-auto mb-3" /><p className="text-sm text-muted-foreground">No claims yet. Create a claim to start a live sale.</p></div>
      ) : (
        <div className="space-y-2">
          {claims.map(claim => (
            <div key={claim.id} className="glass-card rounded-lg p-4 flex items-center justify-between flex-wrap gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-medium text-foreground text-sm truncate">{claim.product_name}</p>
                  <Badge className={`text-xs ${statusColors[claim.status] || ""}`}>{claim.status}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{claim.customer_name} • ${claim.product_price?.toFixed(2)} • {claim.sale_event || "—"}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Claimed: {claim.claimed_at ? new Date(claim.claimed_at).toLocaleString() : "—"}</p>
              </div>
              <Select value={claim.status} onValueChange={v => updateStatus(claim.id, v)}>
                <SelectTrigger className="w-36 bg-secondary/50 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{["claimed", "in_basket", "ordered", "fulfilled", "cancelled"].map(s => <SelectItem key={s} value={s} className="capitalize">{s.replace("_", " ")}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}