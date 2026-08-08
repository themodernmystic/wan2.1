import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Bot, Plus, Trash2, Edit, MessageSquare, Settings, X, Loader2, Circle, Play, Pause } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

const STATUS_DOT = {
  draft: 'bg-slate-500', active: 'bg-emerald-500', paused: 'bg-amber-500', retired: 'bg-zinc-600', failed: 'bg-red-500',
};
const ROLES = ['content_creator', 'social_poster', 'lead_qualifier', 'customer_support', 'sales_assistant', 'research_analyst', 'seo_optimizer', 'pr_pitcher', 'community_manager', 'onboarding_guide', 'custom'];
const EMPTY = { agent_name: '', agent_role: 'content_creator', status: 'draft', assigned_platform: '', schedule: '', performance_score: null, notes: '' };

export default function AgentDirectory() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [filter, setFilter] = useState('all');
  const [form, setForm] = useState(EMPTY);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try { const data = await base44.entities.AgentFleet.list('-created_date', 50); setItems(data || []); }
    catch (e) { toast.error('Failed to load agents'); }
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.agent_name || !form.agent_role) { toast.error('Name and role required'); return; }
    try {
      const payload = { ...form, performance_score: form.performance_score ? Number(form.performance_score) : null };
      if (editing) { await base44.entities.AgentFleet.update(editing.id, payload); toast.success('Agent updated'); }
      else { await base44.entities.AgentFleet.create(payload); toast.success('Agent added'); }
      setShowForm(false); setEditing(null); setForm(EMPTY); load();
    } catch (e) { toast.error('Save failed: ' + e.message); }
  };

  const handleEdit = (item) => { setEditing(item); setForm({ ...EMPTY, ...item, performance_score: item.performance_score ?? '' }); setShowForm(true); };

  const handleDelete = async (id) => {
    if (!confirm('Delete this agent?')) return;
    try { await base44.entities.AgentFleet.delete(id); toast.success('Deleted'); load(); }
    catch (e) { toast.error('Delete failed'); }
  };

  const toggleStatus = async (item) => {
    const newStatus = item.status === 'active' ? 'paused' : 'active';
    try { await base44.entities.AgentFleet.update(item.id, { status: newStatus }); toast.success(`Agent ${newStatus}`); load(); }
    catch (e) { toast.error('Status update failed'); }
  };

  const filtered = filter === 'all' ? items : items.filter(i => i.status === filter);
  const stats = { total: items.length, active: items.filter(i => i.status === 'active').length, draft: items.filter(i => i.status === 'draft').length, paused: items.filter(i => i.status === 'paused').length };

  const inputCls = 'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
  const labelCls = 'text-xs font-medium text-muted-foreground mb-1.5 block';

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><Bot className="w-5 h-5 text-primary" /></div>
          <div><h1 className="text-2xl font-bold">Agent Directory</h1><p className="text-sm text-muted-foreground">All configured AI agents and their current status</p></div>
        </div>
        <Button onClick={() => { setEditing(null); setForm(EMPTY); setShowForm(!showForm); }}>{showForm ? <X className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}{showForm ? 'Cancel' : 'Add Agent'}</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Agents', value: stats.total, color: 'text-foreground' },
          { label: 'Active', value: stats.active, color: 'text-emerald-500' },
          { label: 'Draft', value: stats.draft, color: 'text-slate-500' },
          { label: 'Paused', value: stats.paused, color: 'text-amber-500' },
        ].map(s => (
          <Card key={s.label}><CardContent className="p-4"><div className={`text-2xl font-bold ${s.color}`}>{s.value}</div><div className="text-xs text-muted-foreground mt-1">{s.label}</div></CardContent></Card>
        ))}
      </div>

      {showForm && (
        <Card><CardContent className="p-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className={labelCls}>Agent Name *</label><Input value={form.agent_name} onChange={e => setForm(f => ({ ...f, agent_name: e.target.value }))} placeholder="Content Writer Bot" /></div>
              <div><label className={labelCls}>Role *</label><select className={inputCls} value={form.agent_role} onChange={e => setForm(f => ({ ...f, agent_role: e.target.value }))}>{ROLES.map(r => <option key={r} value={r}>{r.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}</option>)}</select></div>
              <div><label className={labelCls}>Status</label><select className={inputCls} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}><option value="draft">Draft</option><option value="active">Active</option><option value="paused">Paused</option><option value="retired">Retired</option><option value="failed">Failed</option></select></div>
              <div><label className={labelCls}>Assigned Platform</label><Input value={form.assigned_platform} onChange={e => setForm(f => ({ ...f, assigned_platform: e.target.value }))} placeholder="Instagram, Website, etc." /></div>
              <div><label className={labelCls}>Schedule</label><Input value={form.schedule} onChange={e => setForm(f => ({ ...f, schedule: e.target.value }))} placeholder="Daily 9am, Weekly, etc." /></div>
              <div><label className={labelCls}>Performance Score (0-100)</label><Input type="number" min="0" max="100" value={form.performance_score} onChange={e => setForm(f => ({ ...f, performance_score: e.target.value }))} placeholder="85" /></div>
            </div>
            <div><label className={labelCls}>Notes</label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} /></div>
            <div className="flex gap-2"><Button type="submit">{editing ? 'Update' : 'Add'} Agent</Button><Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditing(null); setForm(EMPTY); }}>Cancel</Button></div>
          </form>
        </CardContent></Card>
      )}

      <div className="flex gap-2 flex-wrap">
        {['all', 'draft', 'active', 'paused', 'retired', 'failed'].map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${filter === f ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:text-foreground'}`}>{f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}</button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-20 text-center text-muted-foreground">No agents configured yet. Add one to get started.</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(item => (
            <Card key={item.id} className="hover:border-primary/40 transition-colors"><CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center"><Bot className="w-4 h-4 text-muted-foreground" /></div>
                    <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card ${STATUS_DOT[item.status] || 'bg-slate-500'}`} />
                  </div>
                  <div><div className="font-semibold text-sm">{item.agent_name}</div><div className="text-xs text-muted-foreground capitalize">{item.agent_role?.replace(/_/g, ' ')}</div></div>
                </div>
              </div>
              {item.performance_score != null && (
                <div className="mb-3">
                  <div className="flex items-center justify-between text-xs mb-1"><span className="text-muted-foreground">Performance</span><span className="font-medium">{item.performance_score}/100</span></div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden"><div className={`h-full rounded-full ${item.performance_score >= 70 ? 'bg-emerald-500' : item.performance_score >= 40 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${item.performance_score}%` }} /></div>
                </div>
              )}
              <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                {item.assigned_platform && <span>{item.assigned_platform}</span>}
                {item.total_actions_taken > 0 && <span>{item.total_actions_taken} actions</span>}
              </div>
              {item.last_run_at && <p className="text-[10px] text-muted-foreground mb-3">Last run: {new Date(item.last_run_at).toLocaleString()}</p>}
              <div className="flex gap-1.5 flex-wrap">
                <Link to="/riley"><Button size="sm" variant="outline"><MessageSquare className="w-3 h-3 mr-1" /> Chat</Button></Link>
                <Link to="/forge/agent-builder"><Button size="sm" variant="ghost"><Settings className="w-3 h-3 mr-1" /> Config</Button></Link>
                <Button size="sm" variant="ghost" onClick={() => toggleStatus(item)}>{item.status === 'active' ? <><Pause className="w-3 h-3" /></> : <><Play className="w-3 h-3" /></>}</Button>
                <Button size="sm" variant="ghost" onClick={() => handleEdit(item)}><Edit className="w-3 h-3" /></Button>
                <Button size="sm" variant="ghost" onClick={() => handleDelete(item.id)}><Trash2 className="w-3 h-3 text-destructive" /></Button>
              </div>
            </CardContent></Card>
          ))}
        </div>
      )}
    </div>
  );
}