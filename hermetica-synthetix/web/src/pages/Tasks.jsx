import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { ListTodo, Plus, Search, Filter, CheckCircle2, Circle, Clock, Eye, Archive, CheckSquare, AlertCircle, XCircle, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import PageHeader from "@/components/shared/HermeticaPageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import EmptyState from "@/components/shared/HermeticaEmptyState";
import BulkActionBar from "@/components/shared/BulkActionBar";
import { useToast } from "@/components/ui/use-toast";
const bulkUpdateEntities = (payload) => base44.functions.invoke("bulkUpdateEntities", payload);

const statusIcons = {
  todo: Circle,
  in_progress: Clock,
  review: Eye,
  done: CheckCircle2,
};

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ title: "", description: "", project_id: "", status: "todo", priority: "medium", phase: "ideation" });
  const [creating, setCreating] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkAction, setBulkAction] = useState(null);
  const [bulkValue, setBulkValue] = useState("");
  const [bulkApplying, setBulkApplying] = useState(false);
  const [bulkResults, setBulkResults] = useState(null);
  const { toast } = useToast();

  const isAdmin = currentUser?.role === "admin";

  const loadData = async () => {
    const [t, p, a] = await Promise.all([
      base44.entities.ProjectTask.list("-created_date", 50),
      base44.entities.Project.list("-created_date", 50),
      base44.entities.ForgeAgent.list("-created_date", 50),
    ]);
    setTasks(t);
    setProjects(p);
    setAgents(a);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const handleCreate = async () => {
    if (!form.title.trim()) return;
    setCreating(true);
    await base44.entities.ProjectTask.create(form);
    setForm({ title: "", description: "", project_id: "", status: "todo", priority: "medium", phase: "ideation" });
    setShowCreate(false);
    setCreating(false);
    toast({ title: "Task created" });
    loadData();
  };

  const handleStatusChange = async (task, newStatus) => {
    await base44.entities.ProjectTask.update(task.id, { status: newStatus });
    loadData();
  };

  const getProjectName = (id) => projects.find(p => p.id === id)?.name || "—";

  const filtered = tasks.filter(t => {
    const matchSearch = t.title?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || t.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const grouped = {
    todo: filtered.filter(t => t.status === "todo"),
    in_progress: filtered.filter(t => t.status === "in_progress"),
    review: filtered.filter(t => t.status === "review"),
    done: filtered.filter(t => t.status === "done"),
  };

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
      return new Set(filtered.map(t => t.id));
    });
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
    setBulkAction(null);
    setBulkResults(null);
    setBulkValue("");
  };

  const selectedTasks = tasks.filter(t => selectedIds.has(t.id));
  const allFilteredSelected = filtered.length > 0 && filtered.every(t => selectedIds.has(t.id));

  const handleBulkApply = async () => {
    if (bulkAction !== "archive" && !bulkValue) return;
    setBulkApplying(true);
    setBulkResults(null);
    try {
      const res = await bulkUpdateEntities({
        entity_type: "ProjectTask",
        ids: Array.from(selectedIds),
        action: bulkAction,
        value: bulkAction === "archive" ? undefined : bulkValue,
      });
      setBulkResults(res.data);
      if (res.data.failed_count === 0) {
        toast({ title: `Updated ${res.data.success_count} task${res.data.success_count !== 1 ? "s" : ""}` });
      } else if (res.data.success_count > 0) {
        toast({ title: "Partial success", description: `${res.data.success_count} updated, ${res.data.failed_count} failed`, variant: "destructive" });
      } else {
        toast({ title: "Bulk update failed", description: `${res.data.failed_count} items failed`, variant: "destructive" });
      }
      if (res.data.success_count > 0) loadData();
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
        title="Task Board"
        subtitle={`${tasks.length} tasks across all projects`}
        actions={
          <div className="flex gap-2">
            {isAdmin && filtered.length > 0 && (
              <Button variant="outline" onClick={toggleSelectAll} className="gap-2">
                <CheckSquare className="w-4 h-4" /> {allFilteredSelected ? "Deselect All" : "Select All"}
              </Button>
            )}
            <Button onClick={() => setShowCreate(true)} className="bg-gradient-to-r from-blue-600 to-blue-500 text-white gap-2">
              <Plus className="w-4 h-4" /> New Task
            </Button>
          </div>
        }
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search tasks..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-secondary/50 border-border/50" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40 bg-secondary/50 border-border/50"><Filter className="w-3.5 h-3.5 mr-2" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {["todo", "in_progress", "review", "done"].map(s => (
              <SelectItem key={s} value={s} className="capitalize">{s.replace(/_/g, " ")}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={ListTodo} title="No tasks" description="Create tasks to track your project progress." actionLabel="Create Task" onAction={() => setShowCreate(true)} />
      ) : (
        <div className="grid lg:grid-cols-4 gap-4">
          {Object.entries(grouped).map(([status, statusTasks]) => {
            const Icon = statusIcons[status] || Circle;
            return (
              <div key={status} className="space-y-3">
                <div className="flex items-center gap-2 px-1">
                  <Icon className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{status.replace(/_/g, " ")}</span>
                  <span className="text-[10px] text-muted-foreground bg-secondary/80 rounded-full px-2 py-0.5">{statusTasks.length}</span>
                </div>
                <div className="space-y-2">
                  {statusTasks.map((task) => (
                    <div key={task.id} className={`glass-card rounded-lg p-4 hover:border-white/10 transition-all relative ${selectedIds.has(task.id) ? "ring-2 ring-primary" : ""}`}>
                      {isAdmin && (
                        <div className="absolute top-3 left-3 z-10" onClick={(e) => e.stopPropagation()}>
                          <Checkbox checked={selectedIds.has(task.id)} onCheckedChange={() => toggleSelect(task.id)} />
                        </div>
                      )}
                      <div className="flex items-start justify-between mb-2">
                        <h4 className={`text-sm font-medium text-foreground ${isAdmin ? "pl-7" : ""}`}>{task.title}</h4>
                        <StatusBadge status={task.priority} />
                      </div>
                      {task.description && <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{task.description}</p>}
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-muted-foreground">{getProjectName(task.project_id)}</span>
                        <Select value={task.status} onValueChange={(v) => handleStatusChange(task, v)}>
                          <SelectTrigger className="h-6 text-[10px] w-24 bg-secondary/50 border-border/30">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {["todo", "in_progress", "review", "done"].map(s => (
                              <SelectItem key={s} value={s} className="capitalize text-xs">{s.replace(/_/g, " ")}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Bulk Action Bar */}
      {isAdmin && (
        <BulkActionBar
          selectedCount={selectedIds.size}
          onClear={clearSelection}
          actions={[
            { label: "Set Status", icon: CheckSquare, onClick: () => { setBulkAction("status"); setBulkResults(null); setBulkValue(""); } },
            { label: "Assign Agent", icon: UserPlus, onClick: () => { setBulkAction("assign"); setBulkResults(null); setBulkValue(""); } },
            { label: "Archive", icon: Archive, variant: "destructive", onClick: () => { setBulkAction("archive"); setBulkResults(null); setBulkValue(""); } },
          ]}
        />
      )}

      {/* Bulk Action Dialog */}
      <Dialog open={!!bulkAction} onOpenChange={(open) => !open && closeBulkDialog()}>
        <DialogContent className="bg-card border-border/50 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              {bulkAction === "status" ? "Bulk Update Status" : bulkAction === "assign" ? "Bulk Assign Agent" : "Bulk Archive Tasks"}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {bulkAction === "status"
                ? `Update status for ${selectedIds.size} selected task${selectedIds.size !== 1 ? "s" : ""}.`
                : bulkAction === "assign"
                ? `Assign ${selectedIds.size} task${selectedIds.size !== 1 ? "s" : ""} to a Forge agent.`
                : `Archive (delete) ${selectedIds.size} task${selectedIds.size !== 1 ? "s" : ""}? This cannot be undone.`}
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
                      {["todo", "in_progress", "review", "done"].map(s => (
                        <SelectItem key={s} value={s} className="capitalize">{s.replace(/_/g, " ")}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {bulkAction === "assign" && (
                <div>
                  <Label className="text-xs text-muted-foreground">Assign To</Label>
                  <Select value={bulkValue} onValueChange={setBulkValue}>
                    <SelectTrigger className="mt-1 bg-secondary/50 border-border/50"><SelectValue placeholder="Select agent" /></SelectTrigger>
                    <SelectContent>
                      {agents.map(a => (
                        <SelectItem key={a.id} value={a.name}>{a.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <Label className="text-xs text-muted-foreground">Affected Tasks</Label>
                <div className="mt-1 max-h-32 overflow-y-auto space-y-1 glass-card rounded-lg p-2">
                  {selectedTasks.map(t => (
                    <div key={t.id} className="text-xs text-muted-foreground flex items-center gap-2">
                      <ListTodo className="w-3 h-3 flex-shrink-0" /> {t.title}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={closeBulkDialog} className="flex-1">Cancel</Button>
                <Button
                  onClick={handleBulkApply}
                  disabled={bulkApplying || (bulkAction !== "archive" && !bulkValue)}
                  className={`flex-1 ${bulkAction === "archive" ? "bg-destructive text-destructive-foreground" : "bg-gradient-to-r from-blue-600 to-blue-500 text-white"}`}
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
                      <span>{tasks.find(t => t.id === f.id)?.title || f.id}: {f.error}</span>
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
            <DialogTitle>Create Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label className="text-xs text-muted-foreground">Title</Label>
              <Input value={form.title} onChange={(e) => setForm({...form, title: e.target.value})} placeholder="Task title" className="mt-1 bg-secondary/50 border-border/50" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} placeholder="Task details..." className="mt-1 bg-secondary/50 border-border/50 min-h-16" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Project</Label>
              <Select value={form.project_id} onValueChange={(v) => setForm({...form, project_id: v})}>
                <SelectTrigger className="mt-1 bg-secondary/50 border-border/50"><SelectValue placeholder="Select project" /></SelectTrigger>
                <SelectContent>
                  {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Priority</Label>
                <Select value={form.priority} onValueChange={(v) => setForm({...form, priority: v})}>
                  <SelectTrigger className="mt-1 bg-secondary/50 border-border/50"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["low", "medium", "high", "critical"].map(p => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Phase</Label>
                <Select value={form.phase} onValueChange={(v) => setForm({...form, phase: v})}>
                  <SelectTrigger className="mt-1 bg-secondary/50 border-border/50"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["ideation", "research", "design", "build", "deploy"].map(p => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={handleCreate} disabled={!form.title.trim() || creating} className="w-full bg-gradient-to-r from-blue-600 to-blue-500 text-white">
              {creating ? "Creating..." : "Create Task"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}