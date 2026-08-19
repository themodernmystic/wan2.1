import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { Plus, Rocket, Search, Filter, ArrowRight, Archive, CheckSquare, AlertCircle, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import PageHeader from "@/components/shared/HermeticaPageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import EmptyState from "@/components/shared/HermeticaEmptyState";
import BulkActionBar from "@/components/shared/BulkActionBar";
import { useToast } from "@/components/ui/use-toast";
import { motion } from "framer-motion";
const bulkUpdateEntities = (payload) => base44.functions.invoke("bulkUpdateEntities", payload);

export default function Projects() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", category: "saas", priority: "medium" });
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkAction, setBulkAction] = useState(null);
  const [bulkValue, setBulkValue] = useState("");
  const [bulkApplying, setBulkApplying] = useState(false);
  const [bulkResults, setBulkResults] = useState(null);
  const { toast } = useToast();

  const isAdmin = currentUser?.role === "admin";

  const loadProjects = async () => {
    const data = await base44.entities.Project.list("-created_date", 50);
    setProjects(data);
    setLoading(false);
  };

  useEffect(() => {
    loadProjects();
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const handleCreate = async () => {
    if (!form.name.trim()) return;
    setCreating(true);
    await base44.entities.Project.create(form);
    await base44.entities.ActivityLog.create({ action: `Created project "${form.name}"`, entity_type: "Project", actor: "user" });
    setForm({ name: "", description: "", category: "saas", priority: "medium" });
    setShowCreate(false);
    setCreating(false);
    toast({ title: "Project created", description: `"${form.name}" is ready to forge.` });
    loadProjects();
  };

  const filtered = projects.filter(p => {
    const matchSearch = p.name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedIds(prev => {
      if (prev.size === filtered.length) return new Set();
      return new Set(filtered.map(p => p.id));
    });
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
    setBulkAction(null);
    setBulkResults(null);
    setBulkValue("");
  };

  const selectedProjects = projects.filter(p => selectedIds.has(p.id));
  const allFilteredSelected = filtered.length > 0 && filtered.every(p => selectedIds.has(p.id));

  const handleBulkApply = async () => {
    if (bulkAction !== "archive" && !bulkValue) return;
    setBulkApplying(true);
    setBulkResults(null);
    try {
      const res = await bulkUpdateEntities({
        entity_type: "Project",
        ids: Array.from(selectedIds),
        action: bulkAction,
        value: bulkAction === "archive" ? undefined : bulkValue,
      });
      setBulkResults(res.data);
      if (res.data.failed_count === 0) {
        toast({ title: `Updated ${res.data.success_count} project${res.data.success_count !== 1 ? "s" : ""}` });
      } else if (res.data.success_count > 0) {
        toast({ title: "Partial success", description: `${res.data.success_count} updated, ${res.data.failed_count} failed`, variant: "destructive" });
      } else {
        toast({ title: "Bulk update failed", description: `${res.data.failed_count} items failed`, variant: "destructive" });
      }
      if (res.data.success_count > 0) loadProjects();
    } catch (err) {
      toast({ title: "Bulk update failed", description: err.message, variant: "destructive" });
    } finally {
      setBulkApplying(false);
    }
  };

  const closeBulkDialog = () => {
    setBulkAction(null);
    setBulkResults(null);
    setBulkValue("");
    if (bulkResults?.success_count > 0) clearSelection();
  };

  if (loading) {
    return <div className="flex items-center justify-center h-96"><div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /></div>;
  }

  return (
    <div>
      <PageHeader
        title="Projects"
        subtitle={`${projects.length} project${projects.length !== 1 ? "s" : ""} in your forge`}
        actions={
          <Button onClick={() => setShowCreate(true)} className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white gap-2">
            <Plus className="w-4 h-4" /> New Project
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        {isAdmin && filtered.length > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 glass-card rounded-lg">
            <Checkbox checked={allFilteredSelected} onCheckedChange={toggleSelectAll} />
            <span className="text-xs text-muted-foreground whitespace-nowrap">Select all</span>
          </div>
        )}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-secondary/50 border-border/50"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40 bg-secondary/50 border-border/50">
            <Filter className="w-3.5 h-3.5 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {["ideation", "research", "design", "build", "deploy", "live", "archived"].map(s => (
              <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Project Grid */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={Rocket}
          title={search || statusFilter !== "all" ? "No matching projects" : "No projects yet"}
          description={search || statusFilter !== "all" ? "Try adjusting your filters." : "Create your first project to begin forging ideas into reality."}
          actionLabel={!search && statusFilter === "all" ? "Create Project" : undefined}
          onAction={!search && statusFilter === "all" ? () => setShowCreate(true) : undefined}
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((project, i) => (
            <motion.div key={project.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <div
                className={`glass-card rounded-xl p-5 transition-all duration-300 group relative cursor-pointer hover:border-white/10 ${selectedIds.has(project.id) ? "ring-2 ring-primary" : ""}`}
                onClick={() => navigate(`/hermetica/projects/${project.id}`)}
              >
                {isAdmin && (
                  <div className="absolute top-3 left-3 z-10" onClick={(e) => e.stopPropagation()}>
                    <Checkbox checked={selectedIds.has(project.id)} onCheckedChange={() => toggleSelect(project.id)} />
                  </div>
                )}
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500/20 to-blue-600/10 flex items-center justify-center ${isAdmin ? "ml-8" : ""}`}>
                    <Rocket className="w-5 h-5 text-primary" />
                  </div>
                  <StatusBadge status={project.status} />
                </div>
                <h3 className="text-base font-semibold text-foreground mb-1 truncate">{project.name}</h3>
                <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{project.description || "No description"}</p>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{project.category?.replace(/_/g, " ")}</span>
                  {project.validation_score && (
                    <span className="text-xs font-mono text-primary font-semibold">{project.validation_score}%</span>
                  )}
                </div>
                <div className="flex items-center gap-1 mt-3 text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                  Open project <ArrowRight className="w-3 h-3" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Bulk Action Bar */}
      {isAdmin && (
        <BulkActionBar
          selectedCount={selectedIds.size}
          onClear={clearSelection}
          actions={[
            { label: "Set Status", icon: CheckSquare, onClick: () => { setBulkAction("status"); setBulkResults(null); setBulkValue(""); } },
            { label: "Archive", icon: Archive, onClick: () => { setBulkAction("archive"); setBulkResults(null); setBulkValue(""); } },
          ]}
        />
      )}

      {/* Bulk Action Dialog */}
      <Dialog open={!!bulkAction} onOpenChange={(open) => !open && closeBulkDialog()}>
        <DialogContent className="bg-card border-border/50 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              {bulkAction === "status" ? "Bulk Update Status" : "Bulk Archive Projects"}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {bulkAction === "status"
                ? `Update status for ${selectedIds.size} selected project${selectedIds.size !== 1 ? "s" : ""}.`
                : `Archive ${selectedIds.size} project${selectedIds.size !== 1 ? "s" : ""}? Archived projects can be restored by changing their status.`}
            </DialogDescription>
          </DialogHeader>

          {!bulkResults ? (
            <div className="space-y-4 mt-2">
              {bulkAction === "status" && (
                <div>
                  <Label className="text-xs text-muted-foreground">New Status</Label>
                  <Select value={bulkValue} onValueChange={setBulkValue}>
                    <SelectTrigger className="mt-1 bg-secondary/50 border-border/50"><SelectValue placeholder="Select status" /></SelectTrigger>
                    <SelectContent>
                      {["ideation", "research", "design", "build", "deploy", "live", "archived"].map(s => (
                        <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <Label className="text-xs text-muted-foreground">Affected Projects</Label>
                <div className="mt-1 max-h-32 overflow-y-auto space-y-1 glass-card rounded-lg p-2">
                  {selectedProjects.map(p => (
                    <div key={p.id} className="text-xs text-muted-foreground flex items-center gap-2">
                      <Rocket className="w-3 h-3 flex-shrink-0" /> {p.name}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={closeBulkDialog} className="flex-1">Cancel</Button>
                <Button
                  onClick={handleBulkApply}
                  disabled={bulkApplying || (bulkAction === "status" && !bulkValue)}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-blue-500 text-white"
                >
                  {bulkApplying ? "Applying..." : bulkAction === "archive" ? "Archive" : "Apply"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 mt-2">
              <div className="flex items-center gap-2">
                {bulkResults.failed_count === 0 ? (
                  <><CheckCircle2 className="w-5 h-5 text-emerald-400" /><span className="text-sm font-medium text-emerald-400">All {bulkResults.success_count} updated successfully</span></>
                ) : (
                  <><AlertCircle className="w-5 h-5 text-amber-400" /><span className="text-sm font-medium text-amber-400">{bulkResults.success_count} succeeded, {bulkResults.failed_count} failed</span></>
                )}
              </div>
              {bulkResults.failed?.length > 0 && (
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {bulkResults.failed.map(f => (
                    <div key={f.id} className="text-xs text-red-400 flex items-start gap-1.5">
                      <XCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      <span>{projects.find(p => p.id === f.id)?.name || f.id}: {f.error}</span>
                    </div>
                  ))}
                </div>
              )}
              <Button onClick={closeBulkDialog} className="w-full">Done</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-card border-border/50 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-foreground">Create New Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label className="text-xs text-muted-foreground">Project Name</Label>
              <Input value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} placeholder="My Next Big Idea" className="mt-1 bg-secondary/50 border-border/50" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} placeholder="Describe your idea..." className="mt-1 bg-secondary/50 border-border/50 min-h-24" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm({...form, category: v})}>
                  <SelectTrigger className="mt-1 bg-secondary/50 border-border/50"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["saas", "marketplace", "mobile_app", "ai_tool", "ecommerce", "api_service", "content_platform", "other"].map(c => (
                      <SelectItem key={c} value={c} className="capitalize">{c.replace(/_/g, " ")}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Priority</Label>
                <Select value={form.priority} onValueChange={(v) => setForm({...form, priority: v})}>
                  <SelectTrigger className="mt-1 bg-secondary/50 border-border/50"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["low", "medium", "high", "critical"].map(p => (
                      <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={handleCreate} disabled={!form.name.trim() || creating} className="w-full bg-gradient-to-r from-blue-600 to-blue-500 text-white">
              {creating ? "Creating..." : "Create Project"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}