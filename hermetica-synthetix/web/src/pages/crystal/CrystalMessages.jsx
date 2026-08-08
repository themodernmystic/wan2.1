import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, MessageSquare, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";

const channelColors = { email: "bg-blue-500/20 text-blue-400", sms: "bg-green-500/20 text-green-400", social_media: "bg-purple-500/20 text-purple-400", in_app: "bg-amber-500/20 text-amber-400" };

export default function CrystalMessages() {
  const [messages, setMessages] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterDirection, setFilterDirection] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ customer_id: "", direction: "outbound", channel: "email", subject: "", content: "" });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [m, c] = await Promise.all([
        base44.entities.CrystalMessage.list("-sent_at", 50),
        base44.entities.CrystalCustomer.list(),
      ]);
      setMessages(m); setCustomers(c);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  }

  async function handleCreate() {
    if (!form.customer_id || !form.content.trim()) { toast({ variant: "destructive", title: "Customer and content required" }); return; }
    setSaving(true);
    try {
      const customer = customers.find(c => c.id === form.customer_id);
      await base44.entities.CrystalMessage.create({
        customer_id: form.customer_id, customer_name: customer?.name,
        direction: form.direction, channel: form.channel,
        subject: form.subject, content: form.content,
        status: "sent", sent_at: new Date().toISOString(), is_demo: true
      });
      toast({ title: "Message sent" });
      setShowCreate(false); setForm({ customer_id: "", direction: "outbound", channel: "email", subject: "", content: "" });
      await loadData();
    } catch (err) { toast({ variant: "destructive", title: "Error", description: err.message }); }
    finally { setSaving(false); }
  }

  const filtered = filterDirection === "all" ? messages : messages.filter(m => m.direction === filterDirection);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /></div>;
  if (error) return <div className="glass-card rounded-xl p-8 text-center"><p className="text-destructive text-sm">Error: {error}</p><Button onClick={loadData} className="mt-3" size="sm">Retry</Button></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><MessageSquare className="w-6 h-6 text-blue-400" /> Messages</h1><p className="text-sm text-muted-foreground mt-1">Customer follow-up messages</p></div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild><Button className="bg-gradient-to-r from-blue-600 to-blue-500"><Plus className="w-4 h-4" /> New Message</Button></DialogTrigger>
          <DialogContent className="bg-card border-border/50 max-w-md">
            <DialogHeader><DialogTitle>Send Message</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label className="text-xs text-muted-foreground">Customer *</Label><Select value={form.customer_id} onValueChange={v => setForm({...form, customer_id: v})}><SelectTrigger className="mt-1 bg-secondary/50"><SelectValue placeholder="Select customer" /></SelectTrigger><SelectContent>{customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs text-muted-foreground">Direction</Label><Select value={form.direction} onValueChange={v => setForm({...form, direction: v})}><SelectTrigger className="mt-1 bg-secondary/50"><SelectValue /></SelectTrigger><SelectContent>{["outbound", "inbound"].map(d => <SelectItem key={d} value={d} className="capitalize">{d}</SelectItem>)}</SelectContent></Select></div>
                <div><Label className="text-xs text-muted-foreground">Channel</Label><Select value={form.channel} onValueChange={v => setForm({...form, channel: v})}><SelectTrigger className="mt-1 bg-secondary/50"><SelectValue /></SelectTrigger><SelectContent>{["email", "sms", "social_media", "in_app"].map(c => <SelectItem key={c} value={c} className="capitalize">{c.replace("_", " ")}</SelectItem>)}</SelectContent></Select></div>
              </div>
              <div><Label className="text-xs text-muted-foreground">Subject</Label><Input value={form.subject} onChange={e => setForm({...form, subject: e.target.value})} className="mt-1 bg-secondary/50" /></div>
              <div><Label className="text-xs text-muted-foreground">Content *</Label><Textarea value={form.content} onChange={e => setForm({...form, content: e.target.value})} className="mt-1 bg-secondary/50 min-h-20" /></div>
              <Button onClick={handleCreate} disabled={saving} className="w-full bg-gradient-to-r from-blue-600 to-blue-500">{saving ? "Sending..." : "Send"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-2">
        <Select value={filterDirection} onValueChange={setFilterDirection}><SelectTrigger className="w-40 bg-secondary/50 h-8 text-xs"><SelectValue /></SelectTrigger><SelectContent>{["all", "outbound", "inbound"].map(d => <SelectItem key={d} value={d} className="capitalize">{d}</SelectItem>)}</SelectContent></Select>
      </div>

      {filtered.length === 0 ? (
        <div className="glass-card rounded-xl p-12 text-center"><MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-3" /><p className="text-sm text-muted-foreground">No messages yet. Send your first message to a customer.</p></div>
      ) : (
        <div className="space-y-2">
          {filtered.map(m => (
            <div key={m.id} className={`glass-card rounded-lg p-4 flex gap-3 ${m.direction === "outbound" ? "border-l-2 border-l-blue-500/50" : "border-l-2 border-l-purple-500/50"}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${m.direction === "outbound" ? "bg-blue-500/10 text-blue-400" : "bg-purple-500/10 text-purple-400"}`}>
                {m.direction === "outbound" ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownLeft className="w-4 h-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <p className="text-sm font-medium text-foreground">{m.customer_name}</p>
                  <Badge className={`text-xs capitalize ${channelColors[m.channel] || ""}`}>{m.channel.replace("_", " ")}</Badge>
                  <Badge variant="outline" className="text-xs">{m.status}</Badge>
                  <span className="text-xs text-muted-foreground">{m.sent_at ? new Date(m.sent_at).toLocaleString() : ""}</span>
                </div>
                {m.subject && <p className="text-xs font-medium text-muted-foreground mb-0.5">{m.subject}</p>}
                <p className="text-xs text-foreground/70">{m.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}