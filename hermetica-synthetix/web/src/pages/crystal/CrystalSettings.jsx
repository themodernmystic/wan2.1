import React, { useState } from "react";
import { Settings, AlertTriangle, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";

export default function CrystalSettings() {
  const [form, setForm] = useState({ storeName: "Crystal Live — Demo Store", storeEmail: "store@demo.example.com", currency: "AUD", taxRate: "10", description: "DEMO ACCEPTANCE TEST — This is a simulated crystal retail store for Forge acceptance testing." });
  const { toast } = useToast();

  function handleSave() {
    toast({ title: "Settings saved (demo)" });
  }

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><Settings className="w-6 h-6 text-muted-foreground" /> Settings</h1><p className="text-sm text-muted-foreground mt-1">Store configuration</p></div>

      <div className="glass-card rounded-xl p-6 border-l-2 border-l-amber-500/50">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-1">Demo Mode Active</h3>
            <p className="text-xs text-muted-foreground">This is a DEMO ACCEPTANCE TEST environment. All data is simulated. No real payments are processed. No real emails are sent. No real customers exist.</p>
            <Badge className="mt-2 text-xs bg-amber-500/20 text-amber-400">is_demo = true on all records</Badge>
          </div>
        </div>
      </div>

      <div className="glass-card rounded-xl p-6 space-y-4">
        <h3 className="text-sm font-semibold text-foreground">Store Information</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <div><Label className="text-xs text-muted-foreground">Store Name</Label><Input value={form.storeName} onChange={e => setForm({...form, storeName: e.target.value})} className="mt-1 bg-secondary/50" /></div>
          <div><Label className="text-xs text-muted-foreground">Store Email</Label><Input value={form.storeEmail} onChange={e => setForm({...form, storeEmail: e.target.value})} className="mt-1 bg-secondary/50" /></div>
          <div><Label className="text-xs text-muted-foreground">Currency</Label><Input value={form.currency} onChange={e => setForm({...form, currency: e.target.value})} className="mt-1 bg-secondary/50" /></div>
          <div><Label className="text-xs text-muted-foreground">Tax Rate (%)</Label><Input value={form.taxRate} onChange={e => setForm({...form, taxRate: e.target.value})} className="mt-1 bg-secondary/50" /></div>
        </div>
        <div><Label className="text-xs text-muted-foreground">Description</Label><Textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="mt-1 bg-secondary/50 min-h-16" /></div>
        <Button onClick={handleSave} className="bg-gradient-to-r from-blue-600 to-blue-500">Save Settings</Button>
      </div>

      <div className="glass-card rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2"><Database className="w-4 h-4 text-muted-foreground" /><h3 className="text-sm font-semibold text-foreground">Demo Data Management</h3></div>
        <p className="text-xs text-muted-foreground">All records in this demo environment have <code className="text-blue-400">is_demo=true</code>. This data is for acceptance testing only and can be safely cleared without affecting production data.</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <div className="p-3 rounded-lg bg-secondary/30"><p className="text-lg font-bold text-blue-400">8</p><p className="text-xs text-muted-foreground">Products</p></div>
          <div className="p-3 rounded-lg bg-secondary/30"><p className="text-lg font-bold text-purple-400">6</p><p className="text-xs text-muted-foreground">Customers</p></div>
          <div className="p-3 rounded-lg bg-secondary/30"><p className="text-lg font-bold text-amber-400">10</p><p className="text-xs text-muted-foreground">Claims</p></div>
          <div className="p-3 rounded-lg bg-secondary/30"><p className="text-lg font-bold text-green-400">4</p><p className="text-xs text-muted-foreground">Orders</p></div>
        </div>
        <div className="text-xs text-muted-foreground p-3 rounded-lg bg-destructive/5 border border-destructive/20">
          <strong>Known Limitations:</strong>
          <ul className="list-disc list-inside mt-1 space-y-0.5">
            <li>No real payment processing (Stripe not configured in demo)</li>
            <li>No live video integration</li>
            <li>No native mobile app (web-only, responsive)</li>
            <li>Runs within Forge app (VERIFIED_PREVIEW_ONLY — not standalone deployment)</li>
            <li>Authentication inherited from Forge platform</li>
          </ul>
        </div>
      </div>
    </div>
  );
}