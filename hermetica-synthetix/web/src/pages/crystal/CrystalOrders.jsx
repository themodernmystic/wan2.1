import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";

const statusColors = { pending: "bg-amber-500/20 text-amber-400", paid: "bg-green-500/20 text-green-400", fulfilled: "bg-emerald-500/20 text-emerald-400", cancelled: "bg-red-500/20 text-red-400", refunded: "bg-purple-500/20 text-purple-400" };

export default function CrystalOrders() {
  const [orders, setOrders] = useState([]);
  const [baskets, setBaskets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedBasket, setSelectedBasket] = useState("");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [o, b] = await Promise.all([
        base44.entities.CrystalOrder.list("-order_date", 50),
        base44.entities.CrystalBasket.filter({ status: "open" }),
      ]);
      setOrders(o); setBaskets(b);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  }

  async function handleCreate() {
    if (!selectedBasket) { toast({ variant: "destructive", title: "Select a basket" }); return; }
    setSaving(true);
    try {
      const basket = baskets.find(b => b.id === selectedBasket);
      if (!basket) throw new Error("Basket not found");
      await base44.entities.CrystalOrder.create({
        customer_id: basket.customer_id, customer_name: basket.customer_name,
        basket_id: basket.id, total_amount: basket.total_amount,
        status: "pending", payment_status: "unpaid", fulfilment_status: "pending",
        order_date: new Date().toISOString(), is_demo: true
      });
      await base44.entities.CrystalBasket.update(basket.id, { status: "checked_out" });
      toast({ title: "Order created from basket" });
      setShowCreate(false); setSelectedBasket("");
      await loadData();
    } catch (err) { toast({ variant: "destructive", title: "Error", description: err.message }); }
    finally { setSaving(false); }
  }

  async function updateOrder(id, field, value) {
    try {
      const update = { [field]: value };
      if (field === "status" && value === "paid") update.payment_status = "paid";
      await base44.entities.CrystalOrder.update(id, update);
      toast({ title: `Updated` });
      await loadData();
    } catch (err) { toast({ variant: "destructive", title: "Error", description: err.message }); }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /></div>;
  if (error) return <div className="glass-card rounded-xl p-8 text-center"><p className="text-destructive text-sm">Error: {error}</p><Button onClick={loadData} className="mt-3" size="sm">Retry</Button></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><ClipboardList className="w-6 h-6 text-green-400" /> Orders</h1><p className="text-sm text-muted-foreground mt-1">Manage customer orders</p></div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild><Button className="bg-gradient-to-r from-green-600 to-green-500"><Plus className="w-4 h-4" /> New Order</Button></DialogTrigger>
          <DialogContent className="bg-card border-border/50 max-w-md">
            <DialogHeader><DialogTitle>Create Order from Basket</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><label className="text-xs text-muted-foreground">Open Baskets</label><Select value={selectedBasket} onValueChange={setSelectedBasket}><SelectTrigger className="mt-1 bg-secondary/50"><SelectValue placeholder="Select an open basket" /></SelectTrigger><SelectContent>{baskets.length === 0 ? <SelectItem value={null} disabled>No open baskets</SelectItem> : baskets.map(b => <SelectItem key={b.id} value={b.id}>{b.customer_name} — ${b.total_amount?.toFixed(2)} ({b.item_count} items)</SelectItem>)}</SelectContent></Select></div>
              <Button onClick={handleCreate} disabled={saving || !selectedBasket} className="w-full bg-gradient-to-r from-green-600 to-green-500">{saving ? "Creating..." : "Create Order"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {orders.length === 0 ? (
        <div className="glass-card rounded-xl p-12 text-center"><ClipboardList className="w-12 h-12 text-muted-foreground mx-auto mb-3" /><p className="text-sm text-muted-foreground">No orders yet.</p></div>
      ) : (
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border/50 text-xs text-muted-foreground uppercase">
                <th className="text-left p-3 font-medium">Customer</th><th className="text-left p-3 font-medium">Total</th><th className="text-left p-3 font-medium">Status</th><th className="text-left p-3 font-medium">Payment</th><th className="text-left p-3 font-medium">Fulfilment</th><th className="text-left p-3 font-medium">Date</th>
              </tr></thead>
              <tbody>
                {orders.map(o => (
                  <tr key={o.id} className="border-b border-border/20 hover:bg-secondary/20">
                    <td className="p-3 font-medium text-foreground">{o.customer_name}</td>
                    <td className="p-3 text-muted-foreground">${o.total_amount?.toFixed(2)}</td>
                    <td className="p-3"><Select value={o.status} onValueChange={v => updateOrder(o.id, "status", v)}><SelectTrigger className="w-28 h-7 text-xs bg-secondary/50"><SelectValue /></SelectTrigger><SelectContent>{["pending", "paid", "fulfilled", "cancelled", "refunded"].map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent></Select></td>
                    <td className="p-3"><Badge variant="outline" className="text-xs">{o.payment_status}</Badge></td>
                    <td className="p-3"><Badge variant="outline" className="text-xs">{o.fulfilment_status}</Badge></td>
                    <td className="p-3 text-xs text-muted-foreground">{o.order_date ? new Date(o.order_date).toLocaleDateString() : "—"}</td>
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