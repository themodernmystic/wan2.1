import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
const buildPipeline = (payload) => base44.functions.invoke("buildPipeline", payload);
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { CheckCircle2, Circle, FileText, Hammer, Bug, Rocket, AlertCircle, Loader2, ShieldCheck, Lock } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import ReactMarkdown from "react-markdown";

const stages = [
  { key: "validation", label: "Validation", icon: CheckCircle2 },
  { key: "blueprint", label: "Blueprint", icon: FileText },
  { key: "approval", label: "Human Approval", icon: ShieldCheck },
  { key: "build", label: "Build", icon: Hammer },
  { key: "qa", label: "QA Checks", icon: Bug },
  { key: "deploy_approval", label: "Deploy Approval", icon: Lock },
  { key: "deployed", label: "Deployed", icon: Rocket },
];

export default function BuildPipelineTab({ projectId }) {
  const [plan, setPlan] = useState(null);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [showDetails, setShowDetails] = useState(null);
  const { toast } = useToast();

  const loadData = useCallback(async () => {
    const [plans, reps] = await Promise.all([
      base44.entities.BuildPlan.filter({ project_id: projectId }),
      base44.entities.ValidationReport.filter({ project_id: projectId, status: "completed" }),
    ]);
    setPlan(plans.length > 0 ? plans[0] : null);
    setReports(reps);
    setLoading(false);
  }, [projectId]);

  useEffect(() => { loadData(); }, [loadData]);

  const validationComplete = reports.length > 0;
  const latestReport = reports[0];

  const handleAction = async (action, payload = {}) => {
    setBusy(action);
    try {
      if (action === "generate_blueprint") {
        const res = await buildPipeline({ action: "generate_blueprint", project_id: projectId });
        toast({ title: "Blueprint generated", description: "Review and approve to proceed" });
      } else if (action === "approve_blueprint") {
        await buildPipeline({ action: "approve_blueprint", build_plan_id: plan.id, approved: payload.approved });
        toast({ title: payload.approved ? "Blueprint approved" : "Blueprint rejected" });
      } else if (action === "execute_build") {
        const res = await buildPipeline({ action: "execute_build", build_plan_id: plan.id });
        toast({ title: "Build complete", description: res.data.build_summary });
      } else if (action === "run_qa") {
        const res = await buildPipeline({ action: "run_qa", build_plan_id: plan.id });
        toast({ title: res.data.passed ? "QA Passed" : "QA Failed", description: `Score: ${res.data.qa_score}/100`, variant: res.data.passed ? "default" : "destructive" });
      } else if (action === "approve_deployment") {
        await buildPipeline({ action: "approve_deployment", build_plan_id: plan.id, approved: payload.approved });
        toast({ title: payload.approved ? "Deployment approved" : "Deployment not approved" });
      }
      loadData();
    } catch (err) {
      toast({ title: "Action failed", description: err.message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-32"><div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /></div>;
  }

  const stageStatus = (key) => {
    if (key === "validation") return validationComplete ? "done" : "blocked";
    if (!plan) return "blocked";
    switch (key) {
      case "blueprint": return plan.blueprint ? "done" : "blocked";
      case "approval": return plan.approval_status === "approved" ? "done" : plan.blueprint ? "active" : "blocked";
      case "build": return plan.status === "built" || plan.status === "qa_in_progress" || plan.status === "qa_passed" || plan.status === "qa_failed" || plan.status === "ready_deploy" || plan.status === "deployed" ? "done" : plan.approval_status === "approved" ? "active" : "blocked";
      case "qa": return plan.status === "qa_passed" || plan.status === "ready_deploy" || plan.status === "deployed" ? "done" : plan.status === "qa_failed" ? "failed" : plan.status === "built" ? "active" : plan.status === "qa_in_progress" ? "active" : "blocked";
      case "deploy_approval": return plan.status === "deployed" ? "done" : plan.status === "ready_deploy" ? "active" : plan.status === "qa_passed" ? "active" : "blocked";
      case "deployed": return plan.status === "deployed" ? "done" : "blocked";
      default: return "blocked";
    }
  };

  return (
    <div className="space-y-6">
      {/* Pipeline Stepper */}
      <div className="glass-card rounded-xl p-6">
        <h3 className="text-sm font-semibold text-foreground mb-4">Build Pipeline</h3>
        <div className="space-y-1">
          {stages.map((stage, i) => {
            const status = stageStatus(stage.key);
            const Icon = stage.icon;
            const isLast = i === stages.length - 1;
            return (
              <div key={stage.key} className="flex items-start gap-3">
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    status === "done" ? "bg-emerald-500/20 text-emerald-400" :
                    status === "active" ? "bg-blue-500/20 text-blue-400" :
                    status === "failed" ? "bg-red-500/20 text-red-400" :
                    "bg-secondary text-muted-foreground"
                  }`}>
                    {status === "active" && busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Icon className="w-4 h-4" />}
                  </div>
                  {!isLast && <div className={`w-0.5 h-8 ${status === "done" ? "bg-emerald-500/30" : "bg-border"}`} />}
                </div>
                <div className="flex-1 pb-6">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{stage.label}</span>
                    {status === "done" && <Badge className="text-[9px] py-0 px-1.5 bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Complete</Badge>}
                    {status === "active" && <Badge className="text-[9px] py-0 px-1.5 bg-blue-500/20 text-blue-400 border-blue-500/30">In Progress</Badge>}
                    {status === "failed" && <Badge className="text-[9px] py-0 px-1.5 bg-red-500/20 text-red-400 border-red-500/30">Failed</Badge>}
                    {status === "blocked" && <Badge variant="outline" className="text-[9px] py-0 px-1.5">Waiting</Badge>}
                  </div>
                  {/* Stage content */}
                  {stage.key === "validation" && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {validationComplete ? `Score: ${latestReport.overall_score || 'N/A'}/100` : "Complete validation first"}
                    </p>
                  )}
                  {stage.key === "blueprint" && status === "blocked" && validationComplete && !plan && (
                    <Button size="sm" variant="outline" onClick={() => handleAction("generate_blueprint")} disabled={busy === "generate_blueprint"} className="mt-2 gap-1.5">
                      {busy === "generate_blueprint" ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileText className="w-3 h-3" />} Generate Blueprint
                    </Button>
                  )}
                  {stage.key === "blueprint" && plan?.blueprint && (
                    <Button size="sm" variant="ghost" onClick={() => setShowDetails("blueprint")} className="mt-1 text-xs">View Blueprint</Button>
                  )}
                  {stage.key === "approval" && plan?.blueprint && plan.approval_status === "pending" && (
                    <div className="flex gap-2 mt-2">
                      <Button size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-white gap-1.5" onClick={() => handleAction("approve_blueprint", { approved: true })} disabled={busy === "approve_blueprint"}>
                        <ShieldCheck className="w-3 h-3" /> Approve
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleAction("approve_blueprint", { approved: false })} disabled={busy === "approve_blueprint"}>Reject</Button>
                    </div>
                  )}
                  {stage.key === "build" && plan?.approval_status === "approved" && plan.status !== "built" && plan.status !== "generating" && (
                    <Button size="sm" variant="outline" onClick={() => handleAction("execute_build")} disabled={busy === "execute_build"} className="mt-2 gap-1.5">
                      {busy === "execute_build" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Hammer className="w-3 h-3" />} Execute Build
                    </Button>
                  )}
                  {stage.key === "build" && plan?.status === "built" && (
                    <Button size="sm" variant="ghost" onClick={() => setShowDetails("artifacts")} className="mt-1 text-xs">View Artifacts</Button>
                  )}
                  {stage.key === "qa" && plan?.status === "built" && (
                    <Button size="sm" variant="outline" onClick={() => handleAction("run_qa")} disabled={busy === "run_qa"} className="mt-2 gap-1.5">
                      {busy === "run_qa" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Bug className="w-3 h-3" />} Run QA Checks
                    </Button>
                  )}
                  {stage.key === "qa" && (plan?.status === "qa_passed" || plan?.status === "qa_failed") && (
                    <div className="flex items-center gap-2 mt-1">
                      <Button size="sm" variant="ghost" onClick={() => setShowDetails("qa")} className="text-xs">View QA Report</Button>
                      {plan.status === "qa_passed" && <Badge className="text-[9px] py-0 px-1.5 bg-emerald-500/20 text-emerald-400 border-emerald-500/30">{plan.qa_score}/100</Badge>}
                      {plan.status === "qa_failed" && <Badge className="text-[9px] py-0 px-1.5 bg-red-500/20 text-red-400 border-red-500/30">{plan.qa_score}/100</Badge>}
                    </div>
                  )}
                  {stage.key === "deploy_approval" && plan?.status === "qa_passed" && plan.deployment_status !== "approved" && (
                    <div className="flex gap-2 mt-2">
                      <Button size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-white gap-1.5" onClick={() => handleAction("approve_deployment", { approved: true })} disabled={busy === "approve_deployment"}>
                        <Lock className="w-3 h-3" /> Approve Deploy
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleAction("approve_deployment", { approved: false })} disabled={busy === "approve_deployment"}>Reject</Button>
                    </div>
                  )}
                  {stage.key === "deployed" && plan?.status === "deployed" && plan.deployment_url && (
                    <a href={plan.deployment_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline mt-1 inline-block">
                      {plan.deployment_url}
                    </a>
                  )}
                  {stage.key === "deployed" && plan?.deployment_status === "approved" && plan.status !== "deployed" && (
                    <p className="text-xs text-amber-400 mt-1">Deployment approved — awaiting deployment</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Details Dialogs */}
      <Dialog open={!!showDetails} onOpenChange={(open) => !open && setShowDetails(null)}>
        <DialogContent className="bg-card border-border/50 max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              {showDetails === "blueprint" && "Build Blueprint"}
              {showDetails === "artifacts" && "Build Artifacts"}
              {showDetails === "qa" && "QA Report"}
            </DialogTitle>
            <DialogDescription>
              {showDetails === "blueprint" && `Tech Stack: ${plan?.tech_stack || 'N/A'}`}
              {showDetails === "artifacts" && "Generated code artifacts"}
              {showDetails === "qa" && `Score: ${plan?.qa_score}/100`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            {showDetails === "blueprint" && (
              <>
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground mb-1">Summary</h4>
                  <ReactMarkdown className="text-sm text-foreground/80 prose prose-sm prose-invert">{plan?.blueprint || "N/A"}</ReactMarkdown>
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground mb-1">Build Phases</h4>
                  <ReactMarkdown className="text-sm text-foreground/80 prose prose-sm prose-invert">{plan?.build_phases || "N/A"}</ReactMarkdown>
                </div>
                {plan?.build_artifacts && (() => {
                  let parsed = {};
                  try { parsed = JSON.parse(plan.build_artifacts.split('\n---BUILD_OUTPUT---')[0]); } catch {}
                  return (
                    <>
                      {parsed.key_features && <div><h4 className="text-xs font-semibold text-muted-foreground mb-1">Key Features</h4><ReactMarkdown className="text-sm text-foreground/80 prose prose-sm prose-invert">{parsed.key_features}</ReactMarkdown></div>}
                      {parsed.file_structure && <div><h4 className="text-xs font-semibold text-muted-foreground mb-1">File Structure</h4><ReactMarkdown className="text-sm text-foreground/80 prose prose-sm prose-invert">{parsed.file_structure}</ReactMarkdown></div>}
                      {parsed.architecture_decisions && <div><h4 className="text-xs font-semibold text-muted-foreground mb-1">Architecture Decisions</h4><ReactMarkdown className="text-sm text-foreground/80 prose prose-sm prose-invert">{parsed.architecture_decisions}</ReactMarkdown></div>}
                      {parsed.risks && <div><h4 className="text-xs font-semibold text-muted-foreground mb-1">Risks</h4><ReactMarkdown className="text-sm text-foreground/80 prose prose-sm prose-invert">{parsed.risks}</ReactMarkdown></div>}
                    </>
                  );
                })()}
              </>
            )}
            {showDetails === "artifacts" && (
              <pre className="text-xs text-foreground/80 bg-secondary/50 rounded-lg p-4 overflow-x-auto whitespace-pre-wrap">{plan?.build_artifacts?.split('\n---BUILD_OUTPUT---\n')[1] || "No build output available"}</pre>
            )}
            {showDetails === "qa" && (
              (() => {
                let parsed = {};
                try { parsed = JSON.parse(plan?.qa_report || "{}"); } catch {}
                return (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold text-foreground">{plan?.qa_score}</span>
                      <span className="text-sm text-muted-foreground">/ 100</span>
                      <Badge className={plan?.qa_score >= 70 ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}>
                        {plan?.qa_score >= 70 ? "PASSED" : "FAILED"}
                      </Badge>
                    </div>
                    {parsed.report && <div><h4 className="text-xs font-semibold text-muted-foreground mb-1">Report</h4><ReactMarkdown className="text-sm text-foreground/80 prose prose-sm prose-invert">{parsed.report}</ReactMarkdown></div>}
                    {parsed.bugs && <div><h4 className="text-xs font-semibold text-muted-foreground mb-1">Bugs Found</h4><ReactMarkdown className="text-sm text-foreground/80 prose prose-sm prose-invert">{parsed.bugs}</ReactMarkdown></div>}
                    {parsed.security && <div><h4 className="text-xs font-semibold text-muted-foreground mb-1">Security Issues</h4><ReactMarkdown className="text-sm text-foreground/80 prose prose-sm prose-invert">{parsed.security}</ReactMarkdown></div>}
                    {parsed.recommendations && <div><h4 className="text-xs font-semibold text-muted-foreground mb-1">Recommendations</h4><ReactMarkdown className="text-sm text-foreground/80 prose prose-sm prose-invert">{parsed.recommendations}</ReactMarkdown></div>}
                  </>
                );
              })()
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}