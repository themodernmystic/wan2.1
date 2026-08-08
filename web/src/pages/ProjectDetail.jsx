import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Rocket, FlaskConical, Save, Trash2, ExternalLink, Edit2, ListTodo, Bot, Cloud, CloudOff, RefreshCw, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SwotMatrix from "@/components/projects/SwotMatrix";
import DriveStatusBanner from "@/components/shared/DriveStatusBanner";
import StatusBadge from "@/components/shared/StatusBadge";
const runValidation = (payload) => base44.functions.invoke("runValidation", payload);
const retryDriveArchive = (payload) => base44.functions.invoke("retryDriveArchive", payload);
import PageHeader from "@/components/shared/HermeticaPageHeader";
import BuildPipelineTab from "@/components/projects/BuildPipelineTab";
import { useToast } from "@/components/ui/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [project, setProject] = useState(null);
  const [reports, setReports] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [validating, setValidating] = useState(false);

  useEffect(() => {
    const load = async () => {
      const [p, r, t] = await Promise.all([
        base44.entities.Project.get(id),
        base44.entities.ValidationReport.filter({ project_id: id }, "-created_date", 10),
        base44.entities.ProjectTask.filter({ project_id: id }, "-created_date", 20),
      ]);
      setProject(p);
      setForm(p);
      setReports(r);
      setTasks(t);
      setLoading(false);
    };
    load();
  }, [id]);

  const handleSave = async () => {
    setSaving(true);
    const { id: _, created_date, updated_date, created_by_id, ...updateData } = form;
    await base44.entities.Project.update(id, updateData);
    setProject({ ...project, ...updateData });
    setEditing(false);
    setSaving(false);
    toast({ title: "Project saved" });
  };

  const handleDelete = async () => {
    await base44.entities.Project.delete(id);
    toast({ title: "Project deleted" });
    navigate("/hermetica/projects");
  };

  const handleValidate = async () => {
    setValidating(true);
    try {
      const res = await runValidation({ project_id: id });
      const [updatedProject, updatedReports] = await Promise.all([
        base44.entities.Project.get(id),
        base44.entities.ValidationReport.filter({ project_id: id }, "-created_date", 10),
      ]);
      setProject(updatedProject);
      setForm(updatedProject);
      setReports(updatedReports);
      setValidating(false);
      toast({ title: "Validation complete", description: `Score: ${res.data.overall_score}/100 • Drive: ${res.data.drive_archive?.status}` });
    } catch (err) {
      setValidating(false);
      toast({ title: "Validation failed", description: err.message, variant: "destructive" });
    }
  };

  const handleRetryArchive = async (reportId) => {
    try {
      const res = await retryDriveArchive({ report_id: reportId });
      const updatedReports = await base44.entities.ValidationReport.filter({ project_id: id }, "-created_date", 10);
      setReports(updatedReports);
      toast({ title: res.data.drive_archive?.status === "archived" ? "Archive successful" : "Archive failed", description: res.data.drive_archive?.fileUrl || res.data.drive_archive?.error });
    } catch (err) {
      toast({ title: "Retry failed", description: err.message, variant: "destructive" });
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-96"><div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /></div>;
  }

  if (!project) {
    return <div className="text-center py-20 text-muted-foreground">Project not found.</div>;
  }

  const latestCompletedReport = reports.find(r => r.status === "completed");
  const parseQuadrants = (report) => {
    if (!report?.swot_quadrants) return null;
    try { return JSON.parse(report.swot_quadrants); } catch { return null; }
  };
  const swotQuadrants = parseQuadrants(latestCompletedReport);
  const latestReport = latestCompletedReport || reports[0];

  return (
    <div>
      <div className="mb-6">
        <Link to="/hermetica/projects" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-4">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Projects
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/10 flex items-center justify-center">
              <Rocket className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{project.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <StatusBadge status={project.status} />
                <StatusBadge status={project.priority} />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handleValidate} disabled={validating} variant="outline" className="gap-2 border-amber-500/30 text-amber-400 hover:bg-amber-500/10">
              <FlaskConical className="w-4 h-4" />
              {validating ? "Validating..." : "Run Validation"}
            </Button>
            <Button onClick={() => setEditing(!editing)} variant="outline" className="gap-2">
              <Edit2 className="w-4 h-4" /> {editing ? "Cancel" : "Edit"}
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="icon" className="border-destructive/30 text-destructive hover:bg-destructive/10">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-card border-border/50">
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete project?</AlertDialogTitle>
                  <AlertDialogDescription>This will permanently delete this project and cannot be undone.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-destructive">Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>

      {validating && (
        <div className="glass-card rounded-xl p-6 mb-6 glow-blue">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            <div>
              <p className="text-sm font-medium text-foreground">Running Full Validation</p>
              <p className="text-xs text-muted-foreground">Analyzing market, competitors, feasibility, and revenue potential...</p>
            </div>
          </div>
        </div>
      )}

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-secondary/50 border border-border/50">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="validation">Validation</TabsTrigger>
          <TabsTrigger value="tasks">Tasks ({tasks.length})</TabsTrigger>
          <TabsTrigger value="build">Build Pipeline</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          {editing ? (
            <div className="glass-card rounded-xl p-6 space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Name</Label>
                  <Input value={form.name || ""} onChange={(e) => setForm({...form, name: e.target.value})} className="mt-1 bg-secondary/50 border-border/50" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <Select value={form.status} onValueChange={(v) => setForm({...form, status: v})}>
                    <SelectTrigger className="mt-1 bg-secondary/50 border-border/50"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["ideation", "research", "design", "build", "deploy", "live", "archived"].map(s => (
                        <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Description</Label>
                <Textarea value={form.description || ""} onChange={(e) => setForm({...form, description: e.target.value})} className="mt-1 bg-secondary/50 border-border/50 min-h-20" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Problem Statement</Label>
                <Textarea value={form.problem_statement || ""} onChange={(e) => setForm({...form, problem_statement: e.target.value})} className="mt-1 bg-secondary/50 border-border/50 min-h-20" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Solution Summary</Label>
                <Textarea value={form.solution_summary || ""} onChange={(e) => setForm({...form, solution_summary: e.target.value})} className="mt-1 bg-secondary/50 border-border/50 min-h-20" />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Target Audience</Label>
                  <Input value={form.target_audience || ""} onChange={(e) => setForm({...form, target_audience: e.target.value})} className="mt-1 bg-secondary/50 border-border/50" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Revenue Model</Label>
                  <Input value={form.revenue_model || ""} onChange={(e) => setForm({...form, revenue_model: e.target.value})} className="mt-1 bg-secondary/50 border-border/50" />
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Tech Stack</Label>
                <Input value={form.tech_stack || ""} onChange={(e) => setForm({...form, tech_stack: e.target.value})} className="mt-1 bg-secondary/50 border-border/50" />
              </div>
              <Button onClick={handleSave} disabled={saving} className="bg-gradient-to-r from-blue-600 to-blue-500 text-white gap-2">
                <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          ) : (
            <div className="grid lg:grid-cols-2 gap-6">
              <div className="glass-card rounded-xl p-6 space-y-4">
                <h3 className="text-sm font-semibold text-foreground">Project Details</h3>
                {[
                  { label: "Description", value: project.description },
                  { label: "Problem", value: project.problem_statement },
                  { label: "Solution", value: project.solution_summary },
                  { label: "Audience", value: project.target_audience },
                  { label: "Revenue Model", value: project.revenue_model },
                  { label: "Tech Stack", value: project.tech_stack },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">{label}</p>
                    <p className="text-sm text-foreground">{value || "—"}</p>
                  </div>
                ))}
              </div>
              <div className="space-y-6">
                {project.validation_score && (
                  <div className="glass-card rounded-xl p-6 glow-blue">
                    <h3 className="text-sm font-semibold text-foreground mb-4">Validation Score</h3>
                    <div className="text-center">
                      <span className="text-5xl font-bold gradient-text">{project.validation_score}</span>
                      <span className="text-lg text-muted-foreground">/100</span>
                    </div>
                  </div>
                )}
                {(swotQuadrants || project.swot_analysis) && (
                  <div className="glass-card rounded-xl p-6">
                    <h3 className="text-sm font-semibold text-foreground mb-4">SWOT Matrix</h3>
                    <SwotMatrix
                      quadrants={swotQuadrants}
                      swotText={project.swot_analysis}
                      sourceReportId={latestCompletedReport?.id}
                      sourceReportDate={latestCompletedReport?.created_date}
                    />
                  </div>
                )}
                {(project.market_size_tam || project.market_size_sam || project.market_size_som) && (
                  <div className="glass-card rounded-xl p-6">
                    <h3 className="text-sm font-semibold text-foreground mb-3">Market Sizing</h3>
                    {[
                      { label: "TAM", value: project.market_size_tam },
                      { label: "SAM", value: project.market_size_sam },
                      { label: "SOM", value: project.market_size_som },
                    ].map(({ label, value }) => value && (
                      <div key={label} className="flex justify-between items-center py-2 border-b border-border/30 last:border-0">
                        <span className="text-xs text-muted-foreground">{label}</span>
                        <span className="text-sm font-medium text-foreground">{value}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="validation">
          <DriveStatusBanner />
          {reports.length === 0 ? (
            <div className="glass-card rounded-xl p-8 text-center">
              <FlaskConical className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No validations yet. Run a validation to get started.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {reports.map((report) => (
                <div key={report.id} className="glass-card rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={report.status} />
                      <span className="text-xs text-muted-foreground capitalize">{report.report_type?.replace(/_/g, " ")}</span>
                    </div>
                    {report.overall_score && <span className="text-2xl font-bold gradient-text">{report.overall_score}/100</span>}
                  </div>
                  {report.summary && <p className="text-sm text-foreground/80 whitespace-pre-wrap mb-4">{report.summary}</p>}
                  {report.status === "completed" && (parseQuadrants(report) || project.swot_analysis) && (
                    <div className="mb-4">
                      <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">SWOT Matrix</p>
                      <SwotMatrix
                        quadrants={parseQuadrants(report)}
                        swotText={report === latestReport ? project.swot_analysis : null}
                        sourceReportId={report.id}
                        sourceReportDate={report.created_date}
                      />
                    </div>
                  )}
                  {report.status === "completed" && report.drive_archive_status && report.drive_archive_status !== "skipped" && (
                    <div className="flex items-center gap-2 mb-4 p-3 rounded-lg bg-secondary/30 border border-border/30">
                      {report.drive_archive_status === "archived" ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                          <span className="text-xs text-emerald-400 font-medium">Archived to Drive</span>
                          {report.drive_file_url && (
                            <a href={report.drive_file_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1 ml-auto">
                              View <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </>
                      ) : report.drive_archive_status === "failed" ? (
                        <>
                          <CloudOff className="w-4 h-4 text-red-400 flex-shrink-0" />
                          <span className="text-xs text-red-400 font-medium">Drive archive failed</span>
                          <Button size="sm" variant="outline" className="ml-auto h-6 text-[10px] gap-1" onClick={() => handleRetryArchive(report.id)}>
                            <RefreshCw className="w-3 h-3" /> Retry
                          </Button>
                        </>
                      ) : (
                        <>
                          <Cloud className="w-4 h-4 text-amber-400 flex-shrink-0" />
                          <span className="text-xs text-amber-400 font-medium capitalize">{report.drive_archive_status}</span>
                        </>
                      )}
                    </div>
                  )}
                  {report.overall_score && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                      {[
                        { label: "Market", score: report.market_score },
                        { label: "Competition", score: report.competition_score },
                        { label: "Feasibility", score: report.feasibility_score },
                        { label: "Revenue", score: report.revenue_score },
                      ].map(({ label, score }) => (
                        <div key={label} className="bg-secondary/50 rounded-lg p-3 text-center">
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{label}</p>
                          <p className="text-lg font-bold text-foreground">{score || "—"}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  {report.recommendations && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Recommendations</p>
                      <p className="text-sm text-foreground/80 whitespace-pre-wrap">{report.recommendations}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="tasks">
          <div className="glass-card rounded-xl overflow-hidden">
            {tasks.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">No tasks for this project yet.</div>
            ) : (
              <div className="divide-y divide-border/30">
                {tasks.map((task) => (
                  <div key={task.id} className="px-5 py-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <ListTodo className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-sm text-foreground truncate">{task.title}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={task.status} />
                      <StatusBadge status={task.priority} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="build">
          <BuildPipelineTab projectId={id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}