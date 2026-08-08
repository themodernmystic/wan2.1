import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { FileText, Plus, Trash2, Edit, X, Loader2, Copy, Search, Tag, Star } from 'lucide-react';
import { toast } from 'sonner';

const EMPTY = { name: '', task_type: '', prompt_text: '', variables: [], model_target: '', average_quality_score: null, notes: '', active: true };

export default function PromptLibrary() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [form, setForm] = useState(EMPTY);
  const [varInput, setVarInput] = useState('');

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try { const data = await base44.entities.PromptTemplate.list('-created_date', 50); setItems(data || []); }
    catch (e) { toast.error('Failed to load prompts'); }
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.prompt_text || !form.task_type) { toast.error('Name, prompt text, and task type required'); return; }
    try {
      const payload = { ...form, average_quality_score: form.average_quality_score ? Number(form.average_quality_score) : null };
      if (editing) { await base44.entities.PromptTemplate.update(editing.id, payload); toast.success('Prompt updated'); }
      else { await base44.entities.PromptTemplate.create(payload); toast.success('Prompt saved'); }
      setShowForm(false); setEditing(null); setForm(EMPTY); load();
    } catch (e) { toast.error('Save failed: ' + e.message); }
  };

  const handleEdit = (item) => { setEditing(item); setForm({ ...EMPTY, ...item, variables: item.variables || [], average_quality_score: item.average_quality_score ?? '' }); setShowForm(true); };

  const handleDelete = async (id) => {
    if (!confirm('Delete this prompt?')) return;
    try { await base44.entities.PromptTemplate.delete(id); toast.success('Deleted'); load(); }
    catch (e) { toast.error('Delete failed'); }
  };

  const handleCopy = async (text) => { navigator.clipboard.writeText(text); toast.success('Prompt copied to clipboard'); };

  const addVariable = () => {
    if (!varInput.trim()) return;
    setForm(f => ({ ...f, variables: [...f.variables, varInput.trim()] }));
    setVarInput('');
  };

  const categories = [...new Set(items.map(i => i.task_type).filter(Boolean))];

  const filtered = items.filter(item => {
    const matchesSearch = !search || item.name?.toLowerCase().includes(search.toLowerCase()) || item.prompt_text?.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || item.task_type === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const inputCls = 'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
  const labelCls = 'text-xs font-medium text-muted-foreground mb-1.5 block';

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><FileText className="w-5 h-5 text-primary" /></div>
          <div><h1 className="text-2xl font-bold">Prompt Library</h1><p className="text-sm text-muted-foreground">Store, categorize, and edit high-performing AI prompts</p></div>
        </div>
        <Button onClick={() => { setEditing(null); setForm(EMPTY); setShowForm(!showForm); }}>{showForm ? <X className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}{showForm ? 'Cancel' : 'Add Prompt'}</Button>
      </div>

      {showForm && (
        <Card><CardContent className="p-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className={labelCls}>Name *</label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="SEO Blog Writer" /></div>
              <div><label className={labelCls}>Task Type *</label><Input value={form.task_type} onChange={e => setForm(f => ({ ...f, task_type: e.target.value }))} placeholder="content_writing, seo, social" /></div>
              <div><label className={labelCls}>Model Target</label><Input value={form.model_target} onChange={e => setForm(f => ({ ...f, model_target: e.target.value }))} placeholder="gemini-2.5-flash, gpt-4o" /></div>
              <div><label className={labelCls}>Quality Score (0-100)</label><Input type="number" min="0" max="100" value={form.average_quality_score} onChange={e => setForm(f => ({ ...f, average_quality_score: e.target.value }))} placeholder="85" /></div>
            </div>
            <div><label className={labelCls}>Prompt Text *</label><Textarea value={form.prompt_text} onChange={e => setForm(f => ({ ...f, prompt_text: e.target.value }))} rows={6} placeholder="Write a comprehensive blog post about {{topic}}. Target audience: {{audience}}. Tone: {{tone}}." /></div>
            <div><label className={labelCls}>Variables</label>
              <div className="flex gap-2 mb-2">
                <Input value={varInput} onChange={e => setVarInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addVariable(); } }} placeholder="topic" />
                <Button type="button" variant="outline" onClick={addVariable}>Add</Button>
              </div>
              {form.variables.length > 0 && <div className="flex gap-1 flex-wrap">{form.variables.map(v => <Badge key={v} variant="secondary" className="cursor-pointer" onClick={() => setForm(f => ({ ...f, variables: f.variables.filter(x => x !== v) }))}>{v} ✕</Badge>)}</div>}
            </div>
            <div><label className={labelCls}>Notes</label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} placeholder="When to use this prompt, performance notes" /></div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} className="w-4 h-4 rounded border-input" />
              <span className="text-sm">Active</span>
            </label>
            <div className="flex gap-2"><Button type="submit">{editing ? 'Update' : 'Save'} Prompt</Button><Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditing(null); setForm(EMPTY); }}>Cancel</Button></div>
          </form>
        </CardContent></Card>
      )}

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search prompts..." className="pl-9" />
        </div>
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className={inputCls + ' max-w-[200px]'}>
          <option value="all">All Categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-20 text-center text-muted-foreground">No prompts found. Save your first high-performing prompt to get started.</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(item => (
            <Card key={item.id} className="hover:border-primary/40 transition-colors"><CardContent className="p-5">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-sm truncate">{item.name}</span>
                    {!item.active && <Badge variant="outline" className="text-zinc-500">Inactive</Badge>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-[10px]"><Tag className="w-2.5 h-2.5 mr-1" />{item.task_type}</Badge>
                    {item.model_target && <span className="text-[10px] text-muted-foreground">→ {item.model_target}</span>}
                  </div>
                </div>
                {item.average_quality_score != null && (
                  <div className="flex items-center gap-1 shrink-0"><Star className="w-3 h-3 text-amber-500" /><span className="text-xs font-medium">{item.average_quality_score}</span></div>
                )}
              </div>
              <div className="bg-muted/50 rounded-md p-3 mb-3 max-h-32 overflow-y-auto">
                <pre className="text-xs whitespace-pre-wrap font-mono text-muted-foreground">{item.prompt_text}</pre>
              </div>
              {item.variables && item.variables.length > 0 && (
                <div className="flex gap-1 flex-wrap mb-2">
                  {item.variables.map(v => <span key={v} className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">{`{{${v}}}`}</span>)}
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">Used {item.times_used || 0}×{item.last_used_at ? ` · ${new Date(item.last_used_at).toLocaleDateString()}` : ''}</span>
                <div className="flex gap-1.5">
                  <Button size="sm" variant="outline" onClick={() => handleCopy(item.prompt_text)}><Copy className="w-3 h-3 mr-1" /> Copy</Button>
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