import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Plug, Plus, Trash2, Edit, Zap, ExternalLink, Loader2, Check, X, Key } from 'lucide-react';
import { toast } from 'sonner';

const STATUS_BADGE = {
  planned: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
  configured: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  tested: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
  active: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  deprecated: 'bg-red-500/15 text-red-400 border-red-500/30',
};
const COST_BADGE = {
  free: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  freemium: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  paid: 'bg-red-500/15 text-red-400 border-red-500/30',
};

const EMPTY = { name: '', provider: '', base_url: '', auth_type: 'api_key', auth_key_env_var: '', documentation_url: '', cost_level: 'freemium', status: 'planned', notes: '' };

export default function IntegrationHub() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [testing, setTesting] = useState(null);
  const [filter, setFilter] = useState('all');
  const [form, setForm] = useState(EMPTY);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const data = await base44.entities.APIIntegration.list('-created_date', 50);
      setItems(data || []);
    } catch (e) { toast.error('Failed to load integrations'); }
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.provider) { toast.error('Name and provider required'); return; }
    try {
      if (editing) {
        await base44.entities.APIIntegration.update(editing.id, form);
        toast.success('Integration updated');
      } else {
        await base44.entities.APIIntegration.create(form);
        toast.success('Integration added');
      }
      setShowForm(false); setEditing(null); setForm(EMPTY);
      load();
    } catch (e) { toast.error('Save failed: ' + e.message); }
  };

  const handleEdit = (item) => {
    setEditing(item);
    setForm({ ...EMPTY, ...item });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this integration?')) return;
    try { await base44.entities.APIIntegration.delete(id); toast.success('Deleted'); load(); }
    catch (e) { toast.error('Delete failed'); }
  };

  const handleTest = async (item) => {
    if (!item.auth_key_env_var) { toast.error('No API key env var configured for this integration'); return; }
    setTesting(item.id);
    try {
      const res = await base44.functions.invoke('testIntegrationKey', { secret_key: item.auth_key_env_var });
      const ok = res.data?.ok;
      if (ok) {
        toast.success(`${item.name}: Key valid ✓`);
        await base44.entities.APIIntegration.update(item.id, { status: 'tested', last_tested_at: new Date().toISOString() });
      } else {
        toast.error(`${item.name}: ${res.data?.reason || 'Key invalid'}`);
        await base44.entities.APIIntegration.update(item.id, { last_tested_at: new Date().toISOString() });
      }
      load();
    } catch (e) { toast.error('Test failed: ' + e.message); }
    setTesting(null);
  };

  const filtered = filter === 'all' ? items : items.filter(i => i.status === filter);
  const stats = {
    total: items.length,
    active: items.filter(i => i.status === 'active').length,
    tested: items.filter(i => i.status === 'tested').length,
    planned: items.filter(i => i.status === 'planned').length,
  };

  const inputCls = 'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';
  const labelCls = 'text-xs font-medium text-muted-foreground mb-1.5 block';

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><Plug className="w-5 h-5 text-primary" /></div>
          <div>
            <h1 className="text-2xl font-bold">Integration Hub</h1>
            <p className="text-sm text-muted-foreground">View, test, and manage API keys for external services</p>
          </div>
        </div>
        <Button onClick={() => { setEditing(null); setForm(EMPTY); setShowForm(!showForm); }}>
          {showForm ? <X className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
          {showForm ? 'Cancel' : 'Add Integration'}
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: stats.total, color: 'text-foreground' },
          { label: 'Active', value: stats.active, color: 'text-emerald-500' },
          { label: 'Tested', value: stats.tested, color: 'text-cyan-500' },
          { label: 'Planned', value: stats.planned, color: 'text-slate-500' },
        ].map(s => (
          <Card key={s.label}><CardContent className="p-4">
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
          </CardContent></Card>
        ))}
      </div>

      {showForm && (
        <Card><CardHeader><CardTitle className="text-base">{editing ? 'Edit Integration' : 'New Integration'}</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className={labelCls}>Name *</label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Gemini API" /></div>
                <div><label className={labelCls}>Provider *</label><Input value={form.provider} onChange={e => setForm(f => ({ ...f, provider: e.target.value }))} placeholder="e.g. Google" /></div>
                <div><label className={labelCls}>Base URL</label><Input value={form.base_url} onChange={e => setForm(f => ({ ...f, base_url: e.target.value }))} placeholder="https://api.example.com" /></div>
                <div><label className={labelCls}>Auth Type</label><select className={inputCls} value={form.auth_type} onChange={e => setForm(f => ({ ...f, auth_type: e.target.value }))}><option value="api_key">API Key</option><option value="oauth2">OAuth 2</option><option value="bearer">Bearer Token</option><option value="basic">Basic Auth</option><option value="none">None</option></select></div>
                <div><label className={labelCls}>Auth Key Env Var</label><Input value={form.auth_key_env_var} onChange={e => setForm(f => ({ ...f, auth_key_env_var: e.target.value }))} placeholder="GEMINI_API_KEY" /></div>
                <div><label className={labelCls}>Documentation URL</label><Input value={form.documentation_url} onChange={e => setForm(f => ({ ...f, documentation_url: e.target.value }))} placeholder="https://docs.example.com" /></div>
                <div><label className={labelCls}>Cost Level</label><select className={inputCls} value={form.cost_level} onChange={e => setForm(f => ({ ...f, cost_level: e.target.value }))}><option value="free">Free</option><option value="freemium">Freemium</option><option value="paid">Paid</option></select></div>
                <div><label className={labelCls}>Status</label><select className={inputCls} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}><option value="planned">Planned</option><option value="configured">Configured</option><option value="tested">Tested</option><option value="active">Active</option><option value="deprecated">Deprecated</option></select></div>
              </div>
              <div><label className={labelCls}>Notes</label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} placeholder="Rate limits, usage notes, etc." /></div>
              <div className="flex gap-2"><Button type="submit">{editing ? 'Update' : 'Add'} Integration</Button><Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditing(null); setForm(EMPTY); }}>Cancel</Button></div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-2 flex-wrap">
        {['all', 'planned', 'configured', 'tested', 'active', 'deprecated'].map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${filter === f ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:text-foreground'}`}>
            {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-20 text-center text-muted-foreground">No integrations found. Click "Add Integration" to get started.</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(item => (
            <Card key={item.id} className="hover:border-primary/40 transition-colors">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center"><Key className="w-4 h-4 text-muted-foreground" /></div>
                    <div>
                      <div className="font-semibold text-sm">{item.name}</div>
                      <div className="text-xs text-muted-foreground">{item.provider}</div>
                    </div>
                  </div>
                  <Badge variant="outline" className={STATUS_BADGE[item.status] || ''}>{item.status}</Badge>
                </div>
                {item.auth_key_env_var && (
                  <div className="text-xs text-muted-foreground font-mono bg-muted/50 rounded px-2 py-1 mb-3">ENV: {item.auth_key_env_var}</div>
                )}
                <div className="flex items-center gap-2 mb-3">
                  <Badge variant="outline" className={COST_BADGE[item.cost_level] || ''}>{item.cost_level}</Badge>
                  <Badge variant="outline" className="text-muted-foreground">{item.auth_type}</Badge>
                </div>
                {item.notes && <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{item.notes}</p>}
                {item.last_tested_at && <p className="text-[10px] text-muted-foreground mb-3">Last tested: {new Date(item.last_tested_at).toLocaleDateString()}</p>}
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleTest(item)} disabled={testing === item.id}>
                    {testing === item.id ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Zap className="w-3 h-3 mr-1" />} Test
                  </Button>
                  {item.documentation_url && (
                    <Button size="sm" variant="ghost" onClick={() => window.open(item.documentation_url, '_blank')}><ExternalLink className="w-3 h-3 mr-1" /> Docs</Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => handleEdit(item)}><Edit className="w-3 h-3" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(item.id)}><Trash2 className="w-3 h-3 text-destructive" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}