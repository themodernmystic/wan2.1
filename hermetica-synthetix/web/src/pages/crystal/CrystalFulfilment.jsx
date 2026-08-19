import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";

const statusColors = { pending: "bg-amber-500/20 text-amber-400", picking: "bg-blue-500/20 text-blue-400", packed: "bg-purple-500/20 text-purple-400", shipped: "bg-cyan-500/20 text-cyan-400", delivered: "bg-emerald-500/20 text-emerald-400", returned: "bg-red-500/20 text-red-400" };

export default function CrystalFulfilment() {
  const [fulfilments, setFulfilments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [trackingEdits, setTrackingEdits] = useState({});
  const [carrierEdits, setCarrierEdits] = useState({});
  const { toast } = useToast();

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try { setFulfilments(await base44.entities.CrystalFulfilment.list("-created_date", 50)); }
    catch (err) { setError(err.message); } finally { setLoading(false); }
  }

  async function updateStatus(id, status) {
    try {
      const update = { status };
      if (status === "shipped") update.shipped_at = new Date().toISOString();
      if (status === "delivered") update.delivered_at = new Date().toISOString();
      await base44.entities.CrystalFulfilment.update(id, update);
      toast({ title: `Status → ${status}` });
      await loadData();
    } catch (err) { toast({ variant: "destructive", title: "Error", description: err.message }); }
  }

  async function saveTracking(id) {
    try {
      await base44.entities.CrystalFulfilment.update(id, {
        tracking_number: trackingEdits[id] || "",
        carrier: carrierEdits[id] || ""
      });
      toast({ title: "Tracking saved" });
      await loadData();
    } catch (err) { toast({ variant: "destructive", title: "Error", description: err.message }); }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /></div>;
  if (error) return <div className="glass-card rounded-xl p-8 text-center"><p className="text-destructive text-sm">Error: {error}</p><Button onClick={loadData} className="mt-3" size="sm">Retry</Button></div>;

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><Truck className="w-6 h-6 text-orange-400" /> Fulfilment</h1><p className="text-sm text-muted-foreground mt-1">Track order fulfilment and shipping</p></div>

      {fulfilments.length === 0 ? (
        <div className="glass-card rounded-xl p-12 text-center"><Truck className="w-12 h-12 text-muted-foreground mx-auto mb-3" /><p className="text-sm text-muted-foreground">No fulfilment records yet. Orders with fulfilment status will appear here.</p></div>
      ) : (
        <div className="space-y-3">
          {fulfilments.map(f => (
            <div key={f.id} className="glass-card rounded-xl p-4">
              <div className="flex items-start justify-between flex-wrap gap-3 mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-foreground text-sm">{f.customer_name}</p>
                    <Badge className={`text-xs ${statusColors[f.status] || ""}`}>{f.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">Order: {f.order_id?.slice(-8) || "—"}</p>
                  {f.shipped_at && <p className="text-xs text-muted-foreground">Shipped: {new Date(f.shipped_at).toLocaleString()}</p>}
                  {f.delivered_at && <p className="text-xs text-muted-foreground">Delivered: {new Date(f.delivered_at).toLocaleString()}</p>}
                </div>
                <Select value={f.status} onValueChange={v => updateStatus(f.id, v)}>
                  <SelectTrigger className="w-36 bg-secondary/50 h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{["pending", "picking", "packed", "shipped", "delivered", "returned"].map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-end">
                <div><Label className="text-xs text-muted-foreground">Tracking #</Label><Input value={trackingEdits[f.id] ?? f.tracking_number ?? ""} onChange={e => setTrackingEdits({...trackingEdits, [f.id]: e.target.value})} className="mt-1 bg-secondary/50 h-8 text-xs" placeholder="Enter tracking" /></div>
                <div><Label className="text-xs text-muted-foreground">Carrier</Label><Input value={carrierEdits[f.id] ?? f.carrier ?? ""} onChange={e => setCarrierEdits({...carrierEdits, [f.id]: e.target.value})} className="mt-1 bg-secondary/50 h-8 text-xs" placeholder="e.g. AusPost" /></div>
                <Button size="sm" variant="outline" onClick={() => saveTracking(f.id)} className="h-8">Save</Button>
              </div>
              {f.notes && <p className="text-xs text-muted-foreground mt-2">{f.notes}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}