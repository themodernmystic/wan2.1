import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Brain, Plus, Search, Pin, Trash2, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import PageHeader from "@/components/shared/HermeticaPageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import EmptyState from "@/components/shared/HermeticaEmptyState";
import { useToast } from "@/components/ui/use-toast";
import { motion } from "framer-motion";

export default function Knowledge() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [form, setForm] = useState({ title: "", content: "", category: "insight", tags: "" });
  const [creating, setCreating] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const { toast } = useToast();

  const loadEntries = async () => {
    const data = await base44.entities.KnowledgeEntry.list("-created_date", 50);
    setEntries(data);
    setLoading(false);
  };

  useEffect(() => { loadEntries(); }, []);

  const handleCreate = async () => {
    if (!form.title.trim() || !form.content.trim()) return;
    setCreating(true);
    await base44.entities.KnowledgeEntry.create({ ...form, source: "user" });
    await base44.entities.ActivityLog.create({ action: `Added knowledge: "${form.title}"`, entity_type: "KnowledgeEntry", actor: "user" });
    setForm({ title: "", content: "", category: "insight", tags: "" });
    setShowCreate(false);
    setCreating(false);
    toast({ title: "Knowledge added" });
    loadEntries();
  };

  const handlePin = async (entry) => {
    await base44.entities.KnowledgeEntry.update(entry.id, { is_pinned: !entry.is_pinned });
    loadEntries();
  };

  const handleDelete = async (id) => {
    await base44.entities.KnowledgeEntry.delete(id);
    toast({ title: "Entry deleted" });
    loadEntries();
  };

  const filtered = entries
    .filter(e => {
      const matchSearch = e.title?.toLowerCase().includes(search.toLowerCase()) || e.content?.toLowerCase().includes(search.toLowerCase());
      const matchCat = catFilter === "all" || e.category === catFilter;
      return matchSearch && matchCat;
    })
    .sort((a, b) => (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0));

  if (loading) {
    return <div className="flex items-center justify-center h-96"><div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /></div>;
  }

  const categoryColors = {
    insight: "from-blue-500/20 to-blue-600/5",
    pattern: "from-purple-500/20 to-purple-600/5",
    best_practice: "from-emerald-500/20 to-emerald-600/5",
    lesson_learned: "from-amber-500/20 to-amber-600/5",
    market_data: "from-cyan-500/20 to-cyan-600/5",
    technical: "from-red-500/20 to-red-600/5",
    strategy: "from-indigo-500/20 to-indigo-600/5",
  };

  return (
    <div>
      <PageHeader
        title="Knowledge Base"
        subtitle={`${entries.length} entries — continuously learning`}
        actions={
          <Button onClick={() => setShowCreate(true)} className="bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white gap-2">
            <Plus className="w-4 h-4" /> Add Entry
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search knowledge base..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-secondary/50 border-border/50" />
        </div>
        <Select value={catFilter} onValueChange={setCatFilter}>
          <SelectTrigger className="w-full sm:w-44 bg-secondary/50 border-border/50"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {["insight", "pattern", "best_practice", "lesson_learned", "market_data", "technical", "strategy"].map(c => (
              <SelectItem key={c} value={c} className="capitalize">{c.replace(/_/g, " ")}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Brain} title="Knowledge base is empty" description="Add insights, patterns, and lessons learned to build your knowledge over time." actionLabel="Add Entry" onAction={() => setShowCreate(true)} />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((entry, i) => (
            <motion.div key={entry.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
              <div
                className={`glass-card rounded-xl p-5 hover:border-white/10 transition-all duration-300 cursor-pointer bg-gradient-to-br ${categoryColors[entry.category] || "from-gray-500/20 to-gray-600/5"} ${entry.is_pinned ? "ring-1 ring-amber-500/30" : ""}`}
                onClick={() => setExpanded(expanded === entry.id ? null : entry.id)}
              >
                <div className="flex items-start justify-between mb-2">
                  <StatusBadge status={entry.category} />
                  <div className="flex items-center gap-1">
                    {entry.is_pinned && <Pin className="w-3 h-3 text-amber-400" />}
                    <span className="text-[10px] text-muted-foreground capitalize">{entry.source}</span>
                  </div>
                </div>
                <h3 className="text-sm font-semibold text-foreground mb-1">{entry.title}</h3>
                <p className={`text-xs text-foreground/60 ${expanded === entry.id ? "" : "line-clamp-3"}`}>{entry.content}</p>
                {entry.tags && <p className="text-[10px] text-primary mt-2">{entry.tags}</p>}
                {expanded === entry.id && (
                  <div className="flex gap-2 mt-3 pt-3 border-t border-border/30">
                    <Button size="sm" variant="ghost" className="text-xs gap-1" onClick={(e) => { e.stopPropagation(); handlePin(entry); }}>
                      <Pin className="w-3 h-3" /> {entry.is_pinned ? "Unpin" : "Pin"}
                    </Button>
                    <Button size="sm" variant="ghost" className="text-xs gap-1 text-destructive" onClick={(e) => { e.stopPropagation(); handleDelete(entry.id); }}>
                      <Trash2 className="w-3 h-3" /> Delete
                    </Button>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-card border-border/50 max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Knowledge Entry</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label className="text-xs text-muted-foreground">Title</Label>
              <Input value={form.title} onChange={(e) => setForm({...form, title: e.target.value})} placeholder="Key insight or finding" className="mt-1 bg-secondary/50 border-border/50" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Content</Label>
              <Textarea value={form.content} onChange={(e) => setForm({...form, content: e.target.value})} placeholder="Detailed knowledge entry..." className="mt-1 bg-secondary/50 border-border/50 min-h-28" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm({...form, category: v})}>
                  <SelectTrigger className="mt-1 bg-secondary/50 border-border/50"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["insight", "pattern", "best_practice", "lesson_learned", "market_data", "technical", "strategy"].map(c => (
                      <SelectItem key={c} value={c} className="capitalize">{c.replace(/_/g, " ")}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Tags</Label>
                <Input value={form.tags} onChange={(e) => setForm({...form, tags: e.target.value})} placeholder="tag1, tag2" className="mt-1 bg-secondary/50 border-border/50" />
              </div>
            </div>
            <Button onClick={handleCreate} disabled={!form.title.trim() || !form.content.trim() || creating} className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 text-white">
              {creating ? "Adding..." : "Add Entry"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}