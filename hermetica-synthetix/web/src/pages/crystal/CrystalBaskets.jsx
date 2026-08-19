import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";

export default function CrystalBaskets() {
  const [baskets, setBaskets] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [b, c, p] = await Promise.all([
        base44.entities.CrystalBasket.list("-created_date", 50),
        base44.entities.CrystalCustomer.list(),
        base44.entities.CrystalProduct.list(),
      ]);
      setBaskets(b); setCustomers(c); setProducts(p);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  }

  function addProduct(pid) {
    const product = products.find(p => p.id === pid);
    if (product) setSelectedProducts(prev => [...prev, { product_id: pid, product_name: product.name, price: product.price }]);
  }

  function removeProduct(idx) { setSelectedProducts(prev => prev.filter((_, i) => i !== idx)); }

  async function handleCreate() {
    if (!selectedCustomer || selectedProducts.length === 0) { toast({ variant: "destructive", title: "Customer and at least one product required" }); return; }
    setSaving(true);
    try {
      const customer = customers.find(c => c.id === selectedCustomer);
      const total = selectedProducts.reduce((sum, p) => sum + p.price, 0);
      await base44.entities.CrystalBasket.create({
        customer_id: selectedCustomer, customer_name: customer?.name,
        items: JSON.stringify(selectedProducts), item_count: selectedProducts.length,
        total_amount: total, status: "open", is_demo: true
      });
      toast({ title: "Basket created" });
      setShowCreate(false); setSelectedCustomer(""); setSelectedProducts([]);
      await loadData();
    } catch (err) { toast({ variant: "destructive", title: "Error", description: err.message }); }
    finally { setSaving(false); }
  }

  const statusColors = { open: "bg-blue-500/20 text-blue-400", checked_out: "bg-green-500/20 text-green-400", abandoned: "bg-red-500/20 text-red-400" };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /></div>;
  if (error) return <div className="glass-card rounded-xl p-8 text-center"><p className="text-destructive text-sm">Error: {error}</p><Button onClick={loadData} className="mt-3" size="sm">Retry</Button></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl font-bold text-foreground">Baskets</h1><p className="text-sm text-muted-foreground mt-1">Customer shopping baskets</p></div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild><Button className="bg-gradient-to-r from-blue-600 to-blue-500"><Plus className="w-4 h-4" /> New Basket</Button></DialogTrigger>
          <DialogContent className="bg-card border-border/50 max-w-md max-h-[80vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Create Basket</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><label className="text-xs text-muted-foreground">Customer</label><Select value={selectedCustomer} onValueChange={setSelectedCustomer}><SelectTrigger className="mt-1 bg-secondary/50"><SelectValue placeholder="Select customer" /></SelectTrigger><SelectContent>{customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div>
              <div><label className="text-xs text-muted-foreground">Add Products</label><Select value="" onValueChange={addProduct}><SelectTrigger className="mt-1 bg-secondary/50"><SelectValue placeholder="Select a product to add" /></SelectTrigger><SelectContent>{products.filter(p => p.stock_quantity > 0).map(p => <SelectItem key={p.id} value={p.id}>{p.name} — ${p.price?.toFixed(2)}</SelectItem>)}</SelectContent></Select></div>
              {selectedProducts.length > 0 && (
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {selectedProducts.map((p, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded bg-secondary/30 text-xs">
                      <span className="text-foreground">{p.product_name}</span>
                      <div className="flex items-center gap-2"><span className="text-muted-foreground">${p.price?.toFixed(2)}</span><button onClick={() => removeProduct(i)} className="text-destructive hover:bg-destructive/10 rounded px-1">✕</button></div>
                    </div>
                  ))}
                  <div className="flex justify-between font-semibold pt-2 border-t border-border/30"><span>Total</span><span>${selectedProducts.reduce((s, p) => s + p.price, 0).toFixed(2)}</span></div>
                </div>
              )}
              <Button onClick={handleCreate} disabled={saving} className="w-full bg-gradient-to-r from-blue-600 to-blue-500">{saving ? "Creating..." : "Create Basket"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {baskets.length === 0 ? (
        <div className="glass-card rounded-xl p-12 text-center"><ShoppingCart className="w-12 h-12 text-muted-foreground mx-auto mb-3" /><p className="text-sm text-muted-foreground">No baskets yet.</p></div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {baskets.map(b => {
            let items = [];
            try { items = JSON.parse(b.items || "[]"); } catch { items = []; }
            return (
              <div key={b.id} className="glass-card rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-foreground text-sm">{b.customer_name}</h3>
                  <Badge className={`text-xs ${statusColors[b.status] || ""}`}>{b.status.replace("_", " ")}</Badge>
                </div>
                <div className="space-y-1 mb-3">
                  {items.map((item, i) => <div key={i} className="flex justify-between text-xs"><span className="text-muted-foreground">{item.product_name || item.product}</span><span className="text-muted-foreground">${item.price?.toFixed(2)}</span></div>)}
                </div>
                <div className="flex justify-between pt-2 border-t border-border/30"><span className="text-xs text-muted-foreground">{b.item_count} item(s)</span><span className="font-bold text-foreground">${b.total_amount?.toFixed(2)}</span></div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}