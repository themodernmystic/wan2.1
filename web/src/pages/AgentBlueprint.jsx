import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Workflow, Plus, Trash2, Edit, X, Loader2, ArrowRight, Brain, Code2, Wrench, FlaskConical, Rocket } from 'lucide-react';
import { toast } from 'sonner';

const STATUS_BADGE = {
  draft: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
  generated: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  testing: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  test_failed: 'bg-red-500/15 text-red-400 border-red-500/30',
  ready: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
  deployed: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  failed: 'bg-red-500/15 text-red-400 border-red-500/30',
  archived: 'bg-zinc-500/15 text-zinc-500 border-zinc-500/30',
};
const AGENT_TYPES = ['customer_service', 'sales', 'content', 'coach', 'tutor', 'operations', 'safety', 'privacy', 'mystic', 'custom'];
const TOOL_OPTIONS = ['web_search', 'file_upload', 'email', 'calendar', 'social_post', 'image_gen', 'code_exec', 'data_query'];
const EMPTY = { name: '', agent_type: 'custom', status: 'draft', purpose: '', audience: '', system_prompt: '', personality: '', boundaries: '', tools_enabled: [], memory_enabled: false, deployment_url: '', notes: '' };

const STEPS = [
  { key: 'purpose', label: 'Purpose', icon: Brain, desc: 'What this agent does' },
  { key: 'personality', label: 'Personality', icon: Brain, desc: 'Character & tone' },
  { key: 'system_prompt', label: 'System Prompt', icon: Code2, desc: 'Core instructions' },
  { key: 'tools_enabled', label: 'Tools', icon: Wrench, desc: 'Enabled capabilities' },
  { key: 'testing', label: 'Testing', icon: FlaskConical, desc: 'Validation status' },
  { key: 'deployment_url', label: 'Deployment', icon: Rocket, desc: 'Live endpoint' },
];

export default function AgentBlueprint() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [form, setForm] = useState(EMPTY);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try { const data = await base44.entities.AgentBuild.list('-created_date', 50); setItems(data || []); }
    catch (e) { toast.error('Failed to load blueprints'); }
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name) { toast.error('Blueprint name required'); return; }
    try {
      if (editing) { await base44.entities.AgentBuild.update(editing.id, form); toast.success('Blueprint updated'); }
      else { await base44.entities.AgentBuild.create(form); toast.success('Blueprint created'); }
      setShowForm(false); setEditing(null); setForm(EMPTY); load();
    } catch (e) { toast.error('Save failed: ' + e.message); }
  };

  const handleEdit = (item) => { setEditing(item); setForm({ ...EMPTY, ...item, tools_enabled: item.tools_enabled || [] }); setShowForm(true); };

  const handleDelete = async (id) => {
    if (!confirm('Delete this blueprint?')) return;
    try { await base44.entities.AgentBuild.delete(id); toast.success('Deleted'); load(); }
    catch (e) { toast.error('Delete failed'); }
  };

  const toggleTool = (tool) => setForm(f => ({ ...f, tools_enabled: f.tools_enabled.includes(tool) ? f.tools_enabled.filter(t => t !== tool) : [...f.tools_enabled, tool] }));

  const getStepStatus = (item, stepKey) => {
    if (stepKey === 'testing') {
      if (item.status === 'deployed' || item.status === 'ready') return 'done';
      if (item.status === 'testing') return 'active';
      if (item.status === 'test_failed' || item.status === 'failed') return 'failed';
      return 'pending';
    }
    const val = item[stepKey];
    if (Array.isArray(val)) return val.length > 0 ? 'done' : 'pending';
    return val ? 'done' : 'pending';
  };

  const inputCls = 'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
  const labelCls = 'text-xs font-medium text-muted-foreground mb-1.5 block';
  const stepColors = { done: 'bg-emerald-500', active: 'bg-amber-500', failed: 'bg-red-500', pending: 'bg-slate-600' };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><Workflow className="w-5 h-5 text-primary" /></div>
          <div><h1 className="text-2xl font-bold">Agent Blueprint</h1><p className="text-sm text-muted-foreground">Map out decision-making logic and automation steps for AI agents</p></div>
        </div>
        <Button onClick={() => { setEditing(null); setForm(EMPTY); setShowForm(!showForm); }}>{showForm ? <X className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}{showForm ? 'Cancel' : 'New Blueprint'}</Button>
      </div>

      {showForm && (
        <Card><CardHeader><CardTitle className="text-base">{editing ? 'Edit Blueprint' : 'New Agent Blueprint'}</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className={labelCls}>Name *</label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Customer Support Agent" /></div>
                <div><label className={labelCls}>Agent Type</label><select className={inputCls} value={form.agent_type} onChange={e => setForm(f => ({ ...f, agent_type: e.target.value }))}>{AGENT_TYPES.map(t => <option key={t} value={t}>{t.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}</option>)}</select></div>
                <div><label className={labelCls}>Status</label><select className={inputCls} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>{Object.keys(STATUS_BADGE).map(s => <option key={s} value={s}>{s.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}</option>)}</select></div>
                <div><label className={labelCls}>Audience</label><Input value={form.audience} onChange={e => setForm(f => ({ ...f, audience: e.target.value }))} placeholder="Website visitors" /></div>
                <div><label className={labelCls}>Deployment URL</label><Input value={form.deployment_url} onChange={e => setForm(f => ({ ...f, deployment_url: e.target.value }))} placeholder="https://agent.example.com" /></div>
              </div>
              <div><label className={labelCls}>Purpose</label><Textarea value={form.purpose} onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))} rows={2} placeholder="What this agent is designed to achieve" /></div>
              <div><label className={labelCls}>Personality</label><Textarea value={form.personality} onChange={e => setForm(f => ({ ...f, personality: e.target.value }))} rows={2} placeholder="Tone, character traits, communication style" /></div>
              <div><label className={labelCls}>System Prompt</label><Textarea value={form.system_prompt} onChange={e => setForm(f => ({ ...f, system_prompt: e.target.value }))} rows={4} placeholder="The core instructions that define this agent's behavior" /></div>
              <div><label className={labelCls}>Boundaries</label><Textarea value={form.boundaries} onChange={e => setForm(f => ({ ...f, boundaries: e.target.value }))} rows={2} placeholder="What the agent should NOT do" /></div>
              <div><label className={labelCls}>Tools Enabled</label>
                <div className="flex gap-2 flex-wrap">
                  {TOOL_OPTIONS.map(tool => (
                    <button key={tool} type="button" onClick={() => toggleTool(tool)} className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${form.tools_enabled.includes(tool) ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:text-foreground'}`}>{tool.split('_').join(' ')}</button>
                  ))}
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.memory_enabled} onChange={e => setForm(f => ({ ...f, memory_enabled: e.target.checked }))} className="w-4 h-4 rounded border-input" />
                <span className="text-sm">Memory Enabled</span>
              </label>
              <div className="flex gap-2"><Button type="submit">{editing ? 'Update' : 'Create'} Blueprint</Button><Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditing(null); setForm(EMPTY); }}>Cancel</Button></div>
            </form>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : items.length === 0 ? (
        <Card><CardContent className="py-20 text-center text-muted-foreground">No blueprints yet. Create one to start mapping agent logic.</CardContent></Card>
      ) : (
        <div className="space-y-4">
          {items.map(item => (
            <Card key={item.id} className="hover:border-primary/40 transition-colors">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-4 flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><Workflow className="w-5 h-5 text-primary" /></div>
                    <div>
                      <div className="font-semibold text-sm">{item.name}</div>
                      <div className="text-xs text-muted-foreground capitalize">{item.agent_type?.replace(/_/g, ' ')} · v{item.version || 1}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={STATUS_BADGE[item.status] || ''}>{item.status.split('_').join(' ')}</Badge>
                    <Button size="sm" variant="ghost" onClick={() => setExpanded(expanded === item.id ? null : item.id)}>{expanded === item.id ? 'Collapse' : 'Expand'}</Button>
                    <Button size="sm" variant="ghost" onClick={() => handleEdit(item)}><Edit className="w-3 h-3" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(item.id)}><Trash2 className="w-3 h-3 text-destructive" /></Button>
                  </div>
                </div>

                {/* Visual flow of steps */}
                <div className="flex items-center gap-1 overflow-x-auto pb-2">
                  {STEPS.map((step, idx) => {
                    const stepStatus = getStepStatus(item, step.key);
                    const Icon = step.icon;
                    return (
                      <React.Fragment key={step.key}>
                        <div className="flex flex-col items-center gap-1 min-w-[80px]">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${stepColors[stepStatus]}`}><Icon className="w-4 h-4 text-white" /></div>
                          <div className="text-[10px] text-muted-foreground text-center">{step.label}</div>
                        </div>
                        {idx < STEPS.length - 1 && <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />}
                      </React.Fragment>
                    );
                  })}
                </div>

                {expanded === item.id && (
                  <div className="mt-4 pt-4 border-t border-border space-y-3">
                    {item.purpose && <div><span className="text-xs font-medium text-muted-foreground">Purpose:</span><p className="text-sm mt-1">{item.purpose}</p></div>}
                    {item.audience && <div><span className="text-xs font-medium text-muted-foreground">Audience:</span><p className="text-sm mt-1">{item.audience}</p></div>}
                    {item.personality && <div><span className="text-xs font-medium text-muted-foreground">Personality:</span><p className="text-sm mt-1">{item.personality}</p></div>}
                    {item.system_prompt && <div><span className="text-xs font-medium text-muted-foreground">System Prompt:</span><pre className="text-xs mt-1 bg-muted/50 rounded p-3 whitespace-pre-wrap font-mono">{item.system_prompt}</pre></div>}
                    {item.boundaries && <div><span className="text-xs font-medium text-muted-foreground">Boundaries:</span><p className="text-sm mt-1">{item.boundaries}</p></div>}
                    {item.tools_enabled && item.tools_enabled.length > 0 && (
                      <div><span className="text-xs font-medium text-muted-foreground">Tools:</span>
                        <div className="flex gap-1 flex-wrap mt-1">{item.tools_enabled.map(t => <Badge key={t} variant="secondary" className="text-[10px]">{t.split('_').join(' ')}</Badge>)}</div>
                      </div>
                    )}
                    {item.deployment_url && <div><span className="text-xs font-medium text-muted-foreground">Deployed at:</span><a href={item.deployment_url} target="_blank" rel="noreferrer" className="text-xs text-primary ml-1 hover:underline">{item.deployment_url}</a></div>}
                    {item.failure_reason && <div className="text-xs text-red-400 bg-red-500/5 rounded px-3 py-2">{item.failure_reason}</div>}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}