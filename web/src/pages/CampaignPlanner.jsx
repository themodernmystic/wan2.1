import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Megaphone, Plus, Trash2, Edit, Calendar, Users, Target, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const STATUS_BADGE = {
  planning: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
  active: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  paused: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  completed: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  archived: 'bg-zinc-500/15 text-zinc-500 border-zinc-500/30',
};
const CAMPAIGN_TYPES = ['launch', 'social', 'email', 'pr', 'product', 'event', 'fundraiser'];
const CHANNEL_OPTIONS = ['Instagram', 'Facebook', 'LinkedIn', 'TikTok', 'X/Twitter', 'Email', 'YouTube', 'Website', 'Podcast'];
const EMPTY = { name: '', campaign_type: 'launch', status: 'planning', core_message: '', audience: '', channels: [], start_date: '', end_date: '', metrics: '' };

export default function CampaignPlanner() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [filter, setFilter] = useState('all');
  const [form, setForm] = useState(EMPTY);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const data = await base44.entities.Campaign.list('-created_date', 50);
      setItems(data || []);
    } catch (e) { toast.error('Failed to load campaigns'); }
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name) { toast.error('Campaign name required'); return; }
    try {
      if (editing) { await base44.entities.Campaign.update(editing.id, form); toast.success('Campaign updated'); }
      else { await base44.entities.Campaign.create(form); toast.success('Campaign created'); }
      setShowForm(false); setEditing(null); setForm(EMPTY); load();
    } catch (e) { toast.error('Save failed: ' + e.message); }
  };

  const handleEdit = (item) => { setEditing(item); setForm({ ...EMPTY, ...item, channels: item.channels || [] }); setShowForm(true); };

  const handleDelete = async (id) => {
    if (!confirm('Delete this campaign?')) return;
    try { await base44.entities.Campaign.delete(id); toast.success('Deleted'); load(); }
    catch (e) { toast.error('Delete failed'); }
  };

  const toggleChannel = (ch) => setForm(f => ({ ...f, channels: f.channels.includes(ch) ? f.channels.filter(c => c !== ch) : [...f.channels, ch] }));

  const filtered = filter === 'all' ? items : items.filter(i => i.status === filter);
  const stats = { total: items.length, active: items.filter(i => i.status === 'active').length, planning: items.filter(i => i.status === 'planning').length, completed: items.filter(i => i.status === 'completed').length };

  const inputCls = 'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
  const labelCls = 'text-xs font-medium text-muted-foreground mb-1.5 block';

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><Megaphone className="w-5 h-5 text-primary" /></div>
          <div><h1 className="text-2xl font-bold">Campaign Planner</h1><p className="text-sm text-muted-foreground">Organize content generation projects by campaign</p></div>
        </div>
        <Button onClick={() => { setEditing(null); setForm(EMPTY); setShowForm(!showForm); }}>{showForm ? <X className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}{showForm ? 'Cancel' : 'New Campaign'}</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: stats.total, color: 'text-foreground' },
          { label: 'Active', value: stats.active, color: 'text-emerald-500' },
          { label: 'Planning', value: stats.planning, color: 'text-slate-500' },
          { label: 'Completed', value: stats.completed, color: 'text-blue-500' },
        ].map(s => (
          <Card key={s.label}><CardContent className="p-4"><div className={`text-2xl font-bold ${s.color}`}>{s.value}</div><div className="text-xs text-muted-foreground mt-1">{s.label}</div></CardContent></Card>
        ))}
      </div>

      {showForm && (
        <Card><CardHeader><CardTitle className="text-base">{editing ? 'Edit Campaign' : 'New Campaign'}</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className={labelCls}>Campaign Name *</label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Summer Launch 2026" /></div>
                <div><label className={labelCls}>Type</label><select className={inputCls} value={form.campaign_type} onChange={e => setForm(f => ({ ...f, campaign_type: e.target.value }))}>{CAMPAIGN_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}</select></div>
                <div><label className={labelCls}>Status</label><select className={inputCls} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}><option value="planning">Planning</option><option value="active">Active</option><option value="paused">Paused</option><option value="completed">Completed</option><option value="archived">Archived</option></select></div>
                <div><label className={labelCls}>Audience</label><Input value={form.audience} onChange={e => setForm(f => ({ ...f, audience: e.target.value }))} placeholder="Tech founders, 25-45" /></div>
                <div><label className={labelCls}>Start Date</label><Input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} /></div>
                <div><label className={labelCls}>End Date</label><Input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} /></div>
              </div>
              <div><label className={labelCls}>Core Message</label><Textarea value={form.core_message} onChange={e => setForm(f => ({ ...f, core_message: e.target.value }))} rows={2} placeholder="The primary message of this campaign" /></div>
              <div><label className={labelCls}>Audience Channels</label>
                <div className="flex gap-2 flex-wrap">
                  {CHANNEL_OPTIONS.map(ch => (
                    <button key={ch} type="button" onClick={() => toggleChannel(ch)} className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${form.channels.includes(ch) ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:text-foreground'}`}>{ch}</button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2"><Button type="submit">{editing ? 'Update' : 'Create'} Campaign</Button><Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditing(null); setForm(EMPTY); }}>Cancel</Button></div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-2 flex-wrap">
        {['all', 'planning', 'active', 'paused', 'completed', 'archived'].map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${filter === f ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:text-foreground'}`}>{f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}</button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-20 text-center text-muted-foreground">No campaigns yet. Create one to get started.</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(item => (
            <Card key={item.id} className="hover:border-primary/40 transition-colors"><CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div><div className="font-semibold text-sm">{item.name}</div><div className="text-xs text-muted-foreground capitalize">{item.campaign_type} campaign</div></div>
                <Badge variant="outline" className={STATUS_BADGE[item.status] || ''}>{item.status}</Badge>
              </div>
              {item.core_message && <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{item.core_message}</p>}
              {item.audience && <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2"><Users className="w-3 h-3" />{item.audience}</div>}
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
                <Calendar className="w-3 h-3" />
                {item.start_date ? new Date(item.start_date).toLocaleDateString() : 'No start'} → {item.end_date ? new Date(item.end_date).toLocaleDateString() : 'No end'}
              </div>
              {item.channels && item.channels.length > 0 && (
                <div className="flex gap-1 flex-wrap mb-3">
                  {item.channels.map(ch => <Badge key={ch} variant="secondary" className="text-[10px]">{ch}</Badge>)}
                </div>
              )}
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={() => handleEdit(item)}><Edit className="w-3 h-3 mr-1" /> Edit</Button>
                <Button size="sm" variant="ghost" onClick={() => handleDelete(item.id)}><Trash2 className="w-3 h-3 text-destructive" /></Button>
              </div>
            </CardContent></Card>
          ))}
        </div>
      )}
    </div>
  );
}