import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Search, Pencil, Trash2, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";

const emptyForm = { name: "", description: "", category: "crystal", price: 0, stock_quantity: 0, sku: "", crystal_type: "", origin: "", metaphysical_properties: "" };

export default function CrystalProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => { loadProducts(); }, []);

  async function loadProducts() {
    try {
      const data = await base44.entities.CrystalProduct.list("-created_date", 50);
      setProducts(data);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  async function handleSave() {
    if (!form.name.trim()) { toast({ variant: "destructive", title: "Name required" }); return; }
    setSaving(true);
    try {
      const payload = { ...form, price: Number(form.price), stock_quantity: Number(form.stock_quantity), is_demo: true };
      if (editing) {
        await base44.entities.CrystalProduct.update(editing.id, payload);
        toast({ title: "Product updated" });
      } else {
        await base44.entities.CrystalProduct.create(payload);
        toast({ title: "Product created" });
      }
      setShowCreate(false); setEditing(null); setForm(emptyForm);
      await loadProducts();
    } catch (err) { toast({ variant: "destructive", title: "Error", description: err.message }); }
    finally { setSaving(false); }
  }

  async function handleDelete(id) {
    if (!confirm("Delete this product?")) return;
    try { await base44.entities.CrystalProduct.delete(id); toast({ title: "Product deleted" }); await loadProducts(); }
    catch (err) { toast({ variant: "destructive", title: "Error", description: err.message }); }
  }

  function openEdit(p) { setEditing(p); setForm({ name: p.name, description: p.description || "", category: p.category || "crystal", price: p.price || 0, stock_quantity: p.stock_quantity || 0, sku: p.sku || "", crystal_type: p.crystal_type || "", origin: p.origin || "", metaphysical_properties: p.metaphysical_properties || "" }); setShowCreate(true); }

  const filtered = products.filter(p => p.name?.toLowerCase().includes(search.toLowerCase()) || p.sku?.toLowerCase().includes(search.toLowerCase()));

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /></div>;
  if (error) return <div className="glass-card rounded-xl p-8 text-center"><p className="text-destructive text-sm">Error: {error}</p><Button onClick={loadProducts} className="mt-3" size="sm">Retry</Button></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl font-bold text-foreground">Products</h1><p className="text-sm text-muted-foreground mt-1">Manage your crystal inventory</p></div>
        <Dialog open={showCreate} onOpenChange={(o) => { setShowCreate(o); if (!o) { setEditing(null); setForm(emptyForm); } }}>
          <DialogTrigger asChild><Button className="bg-gradient-to-r from-blue-600 to-blue-500"><Plus className="w-4 h-4" /> Add Product</Button></DialogTrigger>
          <DialogContent className="bg-card border-border/50 max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editing ? "Edit Product" : "Add Product"}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label className="text-xs text-muted-foreground">Name *</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="mt-1 bg-secondary/50" /></div>
              <div><Label className="text-xs text-muted-foreground">Description</Label><Textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="mt-1 bg-secondary/50 min-h-16" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs text-muted-foreground">Category</Label><Select value={form.category} onValueChange={v => setForm({...form, category: v})}><SelectTrigger className="mt-1 bg-secondary/50"><SelectValue /></SelectTrigger><SelectContent>{["crystal", "jewelry", "gemstone", "accessory", "other"].map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}</SelectContent></Select></div>
                <div><Label className="text-xs text-muted-foreground">SKU</Label><Input value={form.sku} onChange={e => setForm({...form, sku: e.target.value})} className="mt-1 bg-secondary/50" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs text-muted-foreground">Price ($)</Label><Input type="number" step="0.01" value={form.price} onChange={e => setForm({...form, price: e.target.value})} className="mt-1 bg-secondary/50" /></div>
                <div><Label className="text-xs text-muted-foreground">Stock</Label><Input type="number" value={form.stock_quantity} onChange={e => setForm({...form, stock_quantity: e.target.value})} className="mt-1 bg-secondary/50" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs text-muted-foreground">Crystal Type</Label><Input value={form.crystal_type} onChange={e => setForm({...form, crystal_type: e.target.value})} className="mt-1 bg-secondary/50" /></div>
                <div><Label className="text-xs text-muted-foreground">Origin</Label><Input value={form.origin} onChange={e => setForm({...form, origin: e.target.value})} className="mt-1 bg-secondary/50" /></div>
              </div>
              <div><Label className="text-xs text-muted-foreground">Metaphysical Properties</Label><Input value={form.metaphysical_properties} onChange={e => setForm({...form, metaphysical_properties: e.target.value})} className="mt-1 bg-secondary/50" /></div>
              <Button onClick={handleSave} disabled={saving} className="w-full bg-gradient-to-r from-blue-600 to-blue-500">{saving ? "Saving..." : editing ? "Update" : "Create"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-xs"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products..." className="pl-9 bg-secondary/50" /></div>

      {filtered.length === 0 ? (
        <div className="glass-card rounded-xl p-12 text-center"><Package className="w-12 h-12 text-muted-foreground mx-auto mb-3" /><p className="text-sm text-muted-foreground">No products found. Add your first product to get started.</p></div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(p => (
            <div key={p.id} className="glass-card rounded-xl p-4">
              <div className="flex items-start justify-between mb-2">
                <div><h3 className="font-semibold text-foreground text-sm">{p.name}</h3><p className="text-xs text-muted-foreground">{p.sku || "No SKU"}</p></div>
                <Badge variant="outline" className="text-xs capitalize">{p.category}</Badge>
              </div>
              {p.description && <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{p.description}</p>}
              {p.crystal_type && <p className="text-xs text-blue-400 mb-1">💎 {p.crystal_type} {p.origin && `• ${p.origin}`}</p>}
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/30">
                <div><span className="text-lg font-bold text-foreground">${p.price?.toFixed(2)}</span><span className="text-xs text-muted-foreground ml-2">Stock: {p.stock_quantity}</span></div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(p)}><Pencil className="w-3.5 h-3.5" /></Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => handleDelete(p.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}