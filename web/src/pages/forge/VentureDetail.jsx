import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, Rocket, FileText, FlaskConical, GitBranch, Package, ScrollText, Activity, CheckCircle2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import ExecutionModeBadge from "@/components/forge/ExecutionModeBadge";
import StatusBadge from "@/components/forge/StatusBadge";
import { useToast } from "@/components/ui/use-toast";

const lifecycleStages = ["brief", "evidence", "assumptions", "decision", "build_approval", "action_proposal", "runner_execution", "artifact_manifest", "qa", "inspection", "deployment_approval", "verified_preview", "ready_handoff"];

function ArtifactRow({ artifact }) {
  const statusColors = { planned: "bg-gray-500/20 text-gray-400", generated_in_app: "bg-blue-500/20 text-blue-400", exported: "bg-amber-500/20 text-amber-400", verified_local: "bg-green-500/20 text-green-400", deployed: "bg-emerald-500/20 text-emerald-400", failed: "bg-red-500/20 text-red-400" };
  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
      <div className="flex items-center gap-3"><Package className="w-4 h-4 text-muted-foreground" /><div><p className="text-sm font-medium text-foreground">{artifact.name}</p><p className="text-xs text-muted-foreground">{artifact.path}</p></div></div>
      <div className="flex items-center gap-2"><span className={`text-xs px-2 py-0.5 rounded ${statusColors[artifact.status] || ""}`}>{artifact.status.replace(/_/g, " ")}</span>{artifact.is_generated_in_app && <span className="text-[10px] text-blue-400">in-app</span>}</div>
    </div>
  );
}

function EvidenceRow({ ev }) {
  const classColors = { sourced: "bg-green-500/20 text-green-400", inferred: "bg-amber-500/20 text-amber-400", estimated: "bg-orange-500/20 text-orange-400", user_provided: "bg-blue-500/20 text-blue-400" };
  return (
    <div className="p-3 rounded-lg bg-secondary/30">
      <div className="flex items-start justify-between gap-2 mb-1"><p className="text-sm font-medium text-foreground flex-1">{ev.claim_supported}</p><span className={`text-xs px-2 py-0.5 rounded ${classColors[ev.classification] || ""}`}>{ev.classification}</span></div>
      <p className="text-xs text-muted-foreground truncate">{ev.source_title}</p>
      {ev.source_url && <a href={ev.source_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:underline truncate block">{ev.source_url}</a>}
      <p className="text-[10px] text-muted-foreground mt-1">Confidence: {ev.confidence || 0}% • Reliability: {ev.reliability_rating || 0}/10</p>
    </div>
  );
}

export default function VentureDetail() {
  const { id } = useParams();
  const [venture, setVenture] = useState(null);
  const [data, setData] = useState({ briefs: [], evidence: [], assumptions: [], decisions: [], artifacts: [], approvals: [], workflows: [], evaluations: [], proposals: [], outcomes: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showEvidence, setShowEvidence] = useState(false);
  const [showBrief, setShowBrief] = useState(false);
  const [showAssumption, setShowAssumption] = useState(false);
  const [evForm, setEvForm] = useState({ claim_supported: "", source_title: "", source_url: "", publisher: "", classification: "inferred", confidence: 50, excerpt_or_summary: "" });
  const [briefForm, setBriefForm] = useState({ problem_statement: "", proposed_solution: "", target_audience: "", revenue_model_hypothesis: "", success_criteria: "", constraints: "" });
  const [assumptionForm, setAssumptionForm] = useState({ statement: "", rationale: "", confidence: 50, classification: "inferred" });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => { loadAll(); }, [id]);

  async function loadAll() {
    try {
      const [v, briefs, evidence, assumptions, decisions, artifacts, approvals, workflows, evaluations, proposals, outcomes] = await Promise.all([
        base44.entities.Venture.get(id),
        base44.entities.VentureBrief.filter({ venture_id: id }),
        base44.entities.Evidence.filter({ venture_id: id }),
        base44.entities.Assumption.filter({ venture_id: id }),
        base44.entities.Decision.filter({ venture_id: id }),
        base44.entities.Artifact.filter({ venture_id: id }),
        base44.entities.ApprovalRequest.filter({ venture_id: id }),
        base44.entities.WorkflowRun.filter({ venture_id: id }),
        base44.entities.Evaluation.filter({ venture_id: id }),
        base44.entities.ActionProposal.filter({ venture_id: id }),
        base44.entities.OutcomeEvent.filter({ venture_id: id }),
      ]);
      setVenture(v); setData({ briefs, evidence, assumptions, decisions, artifacts, approvals, workflows, evaluations, proposals, outcomes });
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  }

  async function advanceStage() {
    const currentIdx = lifecycleStages.indexOf(venture.lifecycle_stage);
    if (currentIdx < lifecycleStages.length - 1) {
      const nextStage = lifecycleStages[currentIdx + 1];
      try { await base44.entities.Venture.update(id, { lifecycle_stage: nextStage, status: nextStage === "verified_preview" ? "verified" : "running" }); toast({ title: `Advanced to: ${nextStage.replace(/_/g, " ")}` }); await loadAll(); }
      catch (err) { toast({ variant: "destructive", title: "Error", description: err.message }); }
    }
  }

  async function saveEvidence() {
    setSaving(true);
    try { await base44.entities.Evidence.create({ ...evForm, venture_id: id, retrieved_at: new Date().toISOString(), confidence: Number(evForm.confidence), status: "proposed" }); toast({ title: "Evidence added" }); setShowEvidence(false); setEvForm({ claim_supported: "", source_title: "", source_url: "", publisher: "", classification: "inferred", confidence: 50, excerpt_or_summary: "" }); await loadAll(); }
    catch (err) { toast({ variant: "destructive", title: "Error", description: err.message }); } finally { setSaving(false); }
  }

  async function saveBrief() {
    setSaving(true);
    try { await base44.entities.VentureBrief.create({ ...briefForm, venture_id: id, status: "submitted" }); toast({ title: "Brief saved" }); setShowBrief(false); setBriefForm({ problem_statement: "", proposed_solution: "", target_audience: "", revenue_model_hypothesis: "", success_criteria: "", constraints: "" }); await loadAll(); }
    catch (err) { toast({ variant: "destructive", title: "Error", description: err.message }); } finally { setSaving(false); }
  }

  async function saveAssumption() {
    setSaving(true);
    try { await base44.entities.Assumption.create({ ...assumptionForm, venture_id: id, confidence: Number(assumptionForm.confidence) }); toast({ title: "Assumption added" }); setShowAssumption(false); setAssumptionForm({ statement: "", rationale: "", confidence: 50, classification: "inferred" }); await loadAll(); }
    catch (err) { toast({ variant: "destructive", title: "Error", description: err.message }); } finally { setSaving(false); }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /></div>;
  if (error) return <div className="glass-card rounded-xl p-8 text-center"><p className="text-destructive text-sm">Error: {error}</p><Button onClick={loadAll} className="mt-3" size="sm">Retry</Button></div>;
  if (!venture) return <div className="glass-card rounded-xl p-8 text-center"><p className="text-sm text-muted-foreground">Venture not found.</p></div>;

  const currentStageIdx = lifecycleStages.indexOf(venture.lifecycle_stage);

  return (
    <div className="space-y-6">
      <Link to="/forge/ventures" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="w-4 h-4" /> Back to Ventures</Link>

      <div className="glass-card rounded-xl p-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap"><h1 className="text-2xl font-bold text-foreground">{venture.name}</h1><ExecutionModeBadge mode={venture.execution_mode} /><StatusBadge status={venture.status} /></div>
            <p className="text-sm text-muted-foreground">{venture.description}</p>
            {venture.truth_disclosure && <div className="mt-3 bg-amber-500/10 border border-amber-500/20 rounded-lg p-3"><p className="text-xs text-amber-200"><strong>Truth Disclosure:</strong> {venture.truth_disclosure}</p></div>}
          </div>
          <div className="flex flex-col gap-2">
            {currentStageIdx < lifecycleStages.length - 1 && <Button onClick={advanceStage} className="bg-gradient-to-r from-blue-600 to-blue-500"><CheckCircle2 className="w-4 h-4" /> Advance Stage</Button>}
            {venture.lifecycle_stage === "ready_handoff" && <div className="text-xs text-green-400 text-right">✓ Lifecycle complete</div>}
          </div>
        </div>
      </div>

      <div className="glass-card rounded-xl p-4">
        <div className="flex items-center gap-1 overflow-x-auto pb-2">
          {lifecycleStages.map((stage, idx) => (
            <React.Fragment key={stage}>
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs whitespace-nowrap ${idx <= currentStageIdx ? "bg-primary/20 text-primary font-medium" : "bg-secondary/30 text-muted-foreground"}`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${idx <= currentStageIdx ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{idx + 1}</span>
                {stage.replace(/_/g, " ")}
              </div>
              {idx < lifecycleStages.length - 1 && <div className={`h-px w-4 ${idx < currentStageIdx ? "bg-primary" : "bg-border"}`} />}
            </React.Fragment>
          ))}
        </div>
      </div>

      <Tabs defaultValue="brief" className="space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="brief" className="text-xs">Brief ({data.briefs.length})</TabsTrigger>
          <TabsTrigger value="evidence" className="text-xs">Evidence ({data.evidence.length})</TabsTrigger>
          <TabsTrigger value="assumptions" className="text-xs">Assumptions ({data.assumptions.length})</TabsTrigger>
          <TabsTrigger value="decisions" className="text-xs">Decisions ({data.decisions.length})</TabsTrigger>
          <TabsTrigger value="artifacts" className="text-xs">Artifacts ({data.artifacts.length})</TabsTrigger>
          <TabsTrigger value="approvals" className="text-xs">Approvals ({data.approvals.length})</TabsTrigger>
          <TabsTrigger value="workflows" className="text-xs">Workflows ({data.workflows.length})</TabsTrigger>
          <TabsTrigger value="outcomes" className="text-xs">Outcomes ({data.outcomes.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="brief" className="space-y-3">
          <Dialog open={showBrief} onOpenChange={setShowBrief}>
            <DialogTrigger asChild><Button size="sm" variant="outline"><Plus className="w-4 h-4" /> Add Brief</Button></DialogTrigger>
            <DialogContent className="bg-card border-border/50 max-w-lg max-h-[85vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Venture Brief</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label className="text-xs text-muted-foreground">Problem Statement</Label><Textarea value={briefForm.problem_statement} onChange={e => setBriefForm({...briefForm, problem_statement: e.target.value})} className="mt-1 bg-secondary/50 min-h-16" /></div>
                <div><Label className="text-xs text-muted-foreground">Proposed Solution</Label><Textarea value={briefForm.proposed_solution} onChange={e => setBriefForm({...briefForm, proposed_solution: e.target.value})} className="mt-1 bg-secondary/50 min-h-16" /></div>
                <div><Label className="text-xs text-muted-foreground">Target Audience</Label><Input value={briefForm.target_audience} onChange={e => setBriefForm({...briefForm, target_audience: e.target.value})} className="mt-1 bg-secondary/50" /></div>
                <div><Label className="text-xs text-muted-foreground">Revenue Model Hypothesis</Label><Input value={briefForm.revenue_model_hypothesis} onChange={e => setBriefForm({...briefForm, revenue_model_hypothesis: e.target.value})} className="mt-1 bg-secondary/50" /></div>
                <div><Label className="text-xs text-muted-foreground">Success Criteria</Label><Textarea value={briefForm.success_criteria} onChange={e => setBriefForm({...briefForm, success_criteria: e.target.value})} className="mt-1 bg-secondary/50 min-h-12" /></div>
                <Button onClick={saveBrief} disabled={saving} className="w-full bg-gradient-to-r from-blue-600 to-blue-500">{saving ? "Saving..." : "Save Brief"}</Button>
              </div>
            </DialogContent>
          </Dialog>
          {data.briefs.length === 0 ? <p className="text-sm text-muted-foreground text-center py-8">No brief yet.</p> : data.briefs.map(b => (
            <div key={b.id} className="glass-card rounded-xl p-4 space-y-2">
              <p className="text-xs text-muted-foreground">Problem</p><p className="text-sm text-foreground">{b.problem_statement}</p>
              <p className="text-xs text-muted-foreground">Solution</p><p className="text-sm text-foreground">{b.proposed_solution}</p>
              <p className="text-xs text-muted-foreground">Target: <span className="text-foreground">{b.target_audience}</span></p>
              <p className="text-xs text-muted-foreground">Revenue: <span className="text-foreground">{b.revenue_model_hypothesis}</span></p>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="evidence" className="space-y-3">
          <Dialog open={showEvidence} onOpenChange={setShowEvidence}>
            <DialogTrigger asChild><Button size="sm" variant="outline"><Plus className="w-4 h-4" /> Add Evidence</Button></DialogTrigger>
            <DialogContent className="bg-card border-border/50 max-w-lg max-h-[85vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Add Evidence</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label className="text-xs text-muted-foreground">Claim Supported</Label><Textarea value={evForm.claim_supported} onChange={e => setEvForm({...evForm, claim_supported: e.target.value})} className="mt-1 bg-secondary/50 min-h-12" /></div>
                <div><Label className="text-xs text-muted-foreground">Source Title</Label><Input value={evForm.source_title} onChange={e => setEvForm({...evForm, source_title: e.target.value})} className="mt-1 bg-secondary/50" /></div>
                <div><Label className="text-xs text-muted-foreground">Source URL</Label><Input value={evForm.source_url} onChange={e => setEvForm({...evForm, source_url: e.target.value})} className="mt-1 bg-secondary/50" /></div>
                <div><Label className="text-xs text-muted-foreground">Publisher</Label><Input value={evForm.publisher} onChange={e => setEvForm({...evForm, publisher: e.target.value})} className="mt-1 bg-secondary/50" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-xs text-muted-foreground">Classification</Label><select value={evForm.classification} onChange={e => setEvForm({...evForm, classification: e.target.value})} className="mt-1 w-full h-9 rounded-md border border-input bg-secondary/50 px-3 text-sm"><option value="sourced">Sourced</option><option value="inferred">Inferred</option><option value="estimated">Estimated</option><option value="user_provided">User Provided</option></select></div>
                  <div><Label className="text-xs text-muted-foreground">Confidence (%)</Label><Input type="number" value={evForm.confidence} onChange={e => setEvForm({...evForm, confidence: e.target.value})} className="mt-1 bg-secondary/50" /></div>
                </div>
                <Button onClick={saveEvidence} disabled={saving} className="w-full bg-gradient-to-r from-blue-600 to-blue-500">{saving ? "Saving..." : "Save Evidence"}</Button>
              </div>
            </DialogContent>
          </Dialog>
          {data.evidence.length === 0 ? <p className="text-sm text-muted-foreground text-center py-8">No evidence yet.</p> : <div className="space-y-2">{data.evidence.map(ev => <EvidenceRow key={ev.id} ev={ev} />)}</div>}
        </TabsContent>

        <TabsContent value="assumptions" className="space-y-3">
          <Dialog open={showAssumption} onOpenChange={setShowAssumption}>
            <DialogTrigger asChild><Button size="sm" variant="outline"><Plus className="w-4 h-4" /> Add Assumption</Button></DialogTrigger>
            <DialogContent className="bg-card border-border/50 max-w-lg">
              <DialogHeader><DialogTitle>Add Assumption</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label className="text-xs text-muted-foreground">Statement</Label><Textarea value={assumptionForm.statement} onChange={e => setAssumptionForm({...assumptionForm, statement: e.target.value})} className="mt-1 bg-secondary/50 min-h-12" /></div>
                <div><Label className="text-xs text-muted-foreground">Rationale</Label><Textarea value={assumptionForm.rationale} onChange={e => setAssumptionForm({...assumptionForm, rationale: e.target.value})} className="mt-1 bg-secondary/50 min-h-12" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-xs text-muted-foreground">Classification</Label><select value={assumptionForm.classification} onChange={e => setAssumptionForm({...assumptionForm, classification: e.target.value})} className="mt-1 w-full h-9 rounded-md border border-input bg-secondary/50 px-3 text-sm"><option value="sourced">Sourced</option><option value="inferred">Inferred</option><option value="estimated">Estimated</option><option value="user_provided">User Provided</option></select></div>
                  <div><Label className="text-xs text-muted-foreground">Confidence (%)</Label><Input type="number" value={assumptionForm.confidence} onChange={e => setAssumptionForm({...assumptionForm, confidence: e.target.value})} className="mt-1 bg-secondary/50" /></div>
                </div>
                <Button onClick={saveAssumption} disabled={saving} className="w-full bg-gradient-to-r from-blue-600 to-blue-500">{saving ? "Saving..." : "Save Assumption"}</Button>
              </div>
            </DialogContent>
          </Dialog>
          {data.assumptions.length === 0 ? <p className="text-sm text-muted-foreground text-center py-8">No assumptions yet.</p> : data.assumptions.map(a => (
            <div key={a.id} className="glass-card rounded-xl p-4"><div className="flex items-start justify-between gap-2 mb-1"><p className="text-sm font-medium text-foreground flex-1">{a.statement}</p><span className="text-xs text-muted-foreground">Confidence: {a.confidence}%</span></div><p className="text-xs text-muted-foreground">{a.rationale}</p><p className="text-[10px] text-muted-foreground mt-1">Classification: {a.classification}</p></div>
          ))}
        </TabsContent>

        <TabsContent value="decisions" className="space-y-3">
          {data.decisions.length === 0 ? <p className="text-sm text-muted-foreground text-center py-8">No decisions yet.</p> : data.decisions.map(d => (
            <div key={d.id} className="glass-card rounded-xl p-4"><div className="flex items-center gap-2 mb-2"><StatusBadge status={d.status} /><span className="text-sm font-medium text-foreground capitalize">{d.decision_type.replace(/_/g, " ")}</span></div><p className="text-xs text-foreground">{d.rationale}</p>{d.conditions && <p className="text-xs text-muted-foreground mt-1">Conditions: {d.conditions}</p>}</div>
          ))}
        </TabsContent>

        <TabsContent value="artifacts" className="space-y-3">
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 mb-2"><p className="text-xs text-blue-200"><strong>Artifact Manifest</strong> — Expected project-kit outputs. Statuses reflect truthful state: <em>planned</em>, <em>generated_in_app</em>, <em>exported</em>, <em>verified_local</em>, <em>deployed</em>, or <em>failed</em>. No external deployment is claimed without verified evidence.</p></div>
          {data.artifacts.length === 0 ? <p className="text-sm text-muted-foreground text-center py-8">No artifacts yet.</p> : data.artifacts.map(a => <ArtifactRow key={a.id} artifact={a} />)}
        </TabsContent>

        <TabsContent value="approvals" className="space-y-3">
          {data.approvals.length === 0 ? <p className="text-sm text-muted-foreground text-center py-8">No approval requests yet.</p> : data.approvals.map(a => (
            <div key={a.id} className="glass-card rounded-xl p-4"><div className="flex items-center gap-2 mb-2"><StatusBadge status={a.decision} /><span className="text-sm font-medium text-foreground capitalize">{a.request_type.replace(/_/g, " ")}</span><span className="text-xs text-muted-foreground">Risk: {a.risk_level}</span></div><p className="text-sm text-foreground">{a.requested_action}</p>{a.is_acceptance_test && <p className="text-[10px] text-amber-400 mt-1">Acceptance test approval (not real human approval)</p>}</div>
          ))}
        </TabsContent>

        <TabsContent value="workflows" className="space-y-3">
          {data.workflows.length === 0 ? <p className="text-sm text-muted-foreground text-center py-8">No workflow runs yet.</p> : data.workflows.map(w => (
            <div key={w.id} className="glass-card rounded-xl p-4"><div className="flex items-center gap-2 mb-2 flex-wrap"><ExecutionModeBadge mode={w.execution_mode} /><StatusBadge status={w.status} /><span className="text-sm font-medium text-foreground">{w.workflow_type.replace(/_/g, " ")}</span></div>{w.current_step && <p className="text-xs text-muted-foreground">Current step: {w.current_step}</p>}{w.error_log && <p className="text-xs text-red-400 mt-1">Error: {w.error_log}</p>}{w.is_acceptance_test && <p className="text-[10px] text-amber-400 mt-1">Acceptance test</p>}</div>
          ))}
        </TabsContent>

        <TabsContent value="outcomes" className="space-y-3">
          {data.outcomes.length === 0 ? <p className="text-sm text-muted-foreground text-center py-8">No outcome events yet.</p> : data.outcomes.map(o => (
            <div key={o.id} className="glass-card rounded-xl p-4"><div className="flex items-center gap-2 mb-1"><span className="text-xs px-2 py-0.5 rounded bg-secondary">{o.outcome_type.replace(/_/g, " ")}</span>{o.is_simulated ? <span className="text-[10px] text-purple-400">SIMULATED</span> : <span className="text-[10px] text-green-400">VERIFIED</span>}</div><p className="text-sm text-foreground">{o.description}</p></div>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}