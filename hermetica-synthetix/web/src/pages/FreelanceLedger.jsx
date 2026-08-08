import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Briefcase, Plus, Trash2, Edit, X, Loader2, DollarSign, Calendar, CheckCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';

const STATUS_BADGE = {
  draft: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
  listed: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  enquiry: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
  proposal_sent: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
  accepted: 'bg-violet-500/15 text-violet-400 border-violet-500/30',
  in_progress: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  delivered: 'bg-teal-500/15 text-teal-400 border-teal-500/30',
  revision: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  completed: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  paid: 'bg-green-500/15 text-green-400 border-green-500/30',
  cancelled: 'bg-red-500/15 text-red-400 border-red-500/30',
};
const PLATFORMS = ['fiverr', 'upwork', 'toptal', 'direct', 'referral', 'linkedin', 'other'];
const STATUSES = Object.keys(STATUS_BADGE);
const EMPTY = { title: '', platform: 'direct', client_name: '', client_email: '', description: '', deliverables: '', price: null, cost_estimate: null, status: 'draft', deadline: '', hours_estimated: null, notes: '' };

export default function FreelanceLedger() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [filter, setFilter] = useState('all');
  const [form, setForm] = useState(EMPTY);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try { const data = await base44.entities.FreelanceGig.list('-created_date', 50); setItems(data || []); }
    catch (e) { toast.error('Failed to load gigs'); }
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.platform) { toast.error('Title and platform required'); return; }
    try {
      const payload = { ...form, price: form.price ? Number(form.price) : null, cost_estimate: form.cost_estimate ? Number(form.cost_estimate) : null, hours_estimated: form.hours_estimated ? Number(form.hours_estimated) : null };
      if (editing) { await base44.entities.FreelanceGig.update(editing.id, payload); toast.success('Gig updated'); }
      else { await base44.entities.FreelanceGig.create(payload); toast.success('Gig added'); }
      setShowForm(false); setEditing(null); setForm(EMPTY); load();
    } catch (e) { toast.error('Save failed: ' + e.message); }
  };

  const handleEdit = (item) => { setEditing(item); setForm({ ...EMPTY, ...item, price: item.price ?? '', cost_estimate: item.cost_estimate ?? '', hours_estimated: item.hours_estimated ?? '' }); setShowForm(true); };

  const handleDelete = async (id) => {
    if (!confirm('Delete this gig?')) return;
    try { await base44.entities.FreelanceGig.delete(id); toast.success('Deleted'); load(); }
    catch (e) { toast.error('Delete failed'); }
  };

  const cycleStatus = async (item) => {
    const idx = STATUSES.indexOf(item.status);
    const next = STATUSES[(idx + 1) % STATUSES.length];
    try { await base44.entities.FreelanceGig.update(item.id, { status: next }); toast.success(`Status: ${next}`); load(); }
    catch (e) { toast.error('Update failed'); }
  };

  const filtered = filter === 'all' ? items : items.filter(i => i.status === filter);
  const totalRevenue = items.filter(i => i.price).reduce((sum, i) => sum + (i.price || 0), 0);
  const paidRevenue = items.filter(i => i.status === 'paid').reduce((sum, i) => sum + (i.price || 0), 0);
  const outstanding = totalRevenue - paidRevenue;
  const activeCount = items.filter(i => ['accepted', 'in_progress', 'delivered', 'revision'].includes(i.status)).length;

  const inputCls = 'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
  const labelCls = 'text-xs font-medium text-muted-foreground mb-1.5 block';

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><Briefcase className="w-5 h-5 text-primary" /></div>
          <div><h1 className="text-2xl font-bold">Freelance Ledger</h1><p className="text-sm text-muted-foreground">Track active gigs, client details, deliverables, and payment status</p></div>
        </div>
        <Button onClick={() => { setEditing(null); setForm(EMPTY); setShowForm(!showForm); }}>{showForm ? <X className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}{showForm ? 'Cancel' : 'Add Gig'}</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Pipeline', value: `$${totalRevenue.toLocaleString()}`, color: 'text-foreground', icon: DollarSign },
          { label: 'Paid', value: `$${paidRevenue.toLocaleString()}`, color: 'text-emerald-500', icon: CheckCircle },
          { label: 'Outstanding', value: `$${outstanding.toLocaleString()}`, color: 'text-amber-500', icon: Clock },
          { label: 'Active Gigs', value: activeCount, color: 'text-blue-500', icon: Briefcase },
        ].map(s => (
          <Card key={s.label}><CardContent className="p-4"><div className="flex items-center gap-2"><s.icon className={`w-4 h-4 ${s.color}`} /><div className={`text-2xl font-bold ${s.color}`}>{s.value}</div></div><div className="text-xs text-muted-foreground mt-1">{s.label}</div></CardContent></Card>
        ))}
      </div>

      {showForm && (
        <Card><CardContent className="p-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className={labelCls}>Title *</label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Landing page for ACME Corp" /></div>
              <div><label className={labelCls}>Platform *</label><select className={inputCls} value={form.platform} onChange={e => setForm(f => ({ ...f, platform: e.target.value }))}>{PLATFORMS.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}</select></div>
              <div><label className={labelCls}>Client Name</label><Input value={form.client_name} onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))} placeholder="John Smith" /></div>
              <div><label className={labelCls}>Client Email</label><Input value={form.client_email} onChange={e => setForm(f => ({ ...f, client_email: e.target.value }))} placeholder="john@example.com" /></div>
              <div><label className={labelCls}>Price ($)</label><Input type="number" min="0" step="0.01" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="500" /></div>
              <div><label className={labelCls}>Cost Estimate ($)</label><Input type="number" min="0" step="0.01" value={form.cost_estimate} onChange={e => setForm(f => ({ ...f, cost_estimate: e.target.value }))} placeholder="100" /></div>
              <div><label className={labelCls}>Status</label><select className={inputCls} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>{STATUSES.map(s => <option key={s} value={s}>{s.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}</option>)}</select></div>
              <div><label className={labelCls}>Deadline</label><Input type="date" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} /></div>
              <div><label className={labelCls}>Hours Estimated</label><Input type="number" min="0" step="0.5" value={form.hours_estimated} onChange={e => setForm(f => ({ ...f, hours_estimated: e.target.value }))} placeholder="10" /></div>
            </div>
            <div><label className={labelCls}>Deliverables</label><Textarea value={form.deliverables} onChange={e => setForm(f => ({ ...f, deliverables: e.target.value }))} rows={2} placeholder="1x landing page, 1x thank you page" /></div>
            <div><label className={labelCls}>Notes</label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} /></div>
            <div className="flex gap-2"><Button type="submit">{editing ? 'Update' : 'Add'} Gig</Button><Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditing(null); setForm(EMPTY); }}>Cancel</Button></div>
          </form>
        </CardContent></Card>
      )}

      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setFilter('all')} className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${filter === 'all' ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:text-foreground'}`}>All ({items.length})</button>
        {STATUSES.slice(0, 8).map(s => (
          <button key={s} onClick={() => setFilter(s)} className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${filter === s ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:text-foreground'}`}>{s.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}</button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-20 text-center text-muted-foreground">No gigs recorded yet. Add one to start tracking.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(item => (
            <Card key={item.id} className="hover:border-primary/40 transition-colors"><CardContent className="p-4">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-sm">{item.title}</span>
                    <Badge variant="outline" className={STATUS_BADGE[item.status] || ''}>{item.status.split('_').join(' ')}</Badge>
                    <Badge variant="outline" className="text-muted-foreground capitalize">{item.platform}</Badge>
                  </div>
                  {item.client_name && <div className="text-xs text-muted-foreground mb-1">Client: {item.client_name}{item.client_email ? ` (${item.client_email})` : ''}</div>}
                  {item.deliverables && <div className="text-xs text-muted-foreground mb-1 line-clamp-1">{item.deliverables}</div>}
                  <div className="flex items-center gap-4 mt-1 text-[10px] text-muted-foreground">
                    {item.price != null && <span className="font-medium text-emerald-500">${item.price.toLocaleString()}</span>}
                    {item.cost_estimate != null && <span>cost: ${item.cost_estimate.toLocaleString()}</span>}
                    {item.deadline && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(item.deadline).toLocaleDateString()}</span>}
                  </div>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <Button size="sm" variant="outline" onClick={() => cycleStatus(item)}>Advance Status</Button>
                  <Button size="sm" variant="ghost" onClick={() => handleEdit(item)}><Edit className="w-3 h-3" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(item.id)}><Trash2 className="w-3 h-3 text-destructive" /></Button>
                </div>
              </div>
            </CardContent></Card>
          ))}
        </div>
      )}
    </div>
  );
}