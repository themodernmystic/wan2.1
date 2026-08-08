import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Shield, Rocket, GitBranch, FileCheck, AlertTriangle, XCircle, Package, Lock, ScrollText, TrendingUp, TrendingDown } from "lucide-react";
import ExecutionModeBadge from "@/components/forge/ExecutionModeBadge";
import StatusBadge from "@/components/forge/StatusBadge";

function StatCard({ icon: Icon, label, value, sub, color, link }) {
  const content = (
    <div className="glass-card rounded-xl p-5 hover:border-primary/30 transition-colors">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${color}`}><Icon className="w-5 h-5" /></div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
  return link ? <Link to={link}>{content}</Link> : content;
}

export default function ControlCentre() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [ventures, approvals, runs, outcomes, artifacts, evidence, toolExecs, auditLogs] = await Promise.all([
        base44.entities.Venture.list("-created_date", 50),
        base44.entities.ApprovalRequest.list("-created_date", 50),
        base44.entities.WorkflowRun.list("-created_date", 50),
        base44.entities.OutcomeEvent.list("-created_date", 50),
        base44.entities.Artifact.list("-created_date", 50),
        base44.entities.Evidence.list("-created_date", 50),
        base44.entities.ToolExecution.list("-created_date", 50),
        base44.entities.ActivityLog.filter({}).then(r => r.slice(0, 10)),
      ]);
      const pendingApprovals = approvals.filter(a => a.decision === "pending");
      const simulatedOutcomes = outcomes.filter(o => o.is_simulated);
      const verifiedOutcomes = outcomes.filter(o => !o.is_simulated);
      const unsupportedClaims = evidence.filter(e => e.classification === "inferred" && e.status !== "verified");
      const failedToolExecs = toolExecs.filter(t => t.status === "failed");
      const artifactsAwaitingVerification = artifacts.filter(a => a.status === "generated_in_app" || a.status === "planned");
      const simRuns = runs.filter(r => r.execution_mode === "simulation");
      const prodRuns = runs.filter(r => r.execution_mode === "production");
      const stages = {};
      ventures.forEach(v => { stages[v.lifecycle_stage] = (stages[v.lifecycle_stage] || 0) + 1; });
      setStats({
        totalVentures: ventures.length, stages, pendingApprovals: pendingApprovals.length,
        totalRuns: runs.length, simRuns: simRuns.length, prodRuns: prodRuns.length,
        verifiedOutcomes: verifiedOutcomes.length, simulatedOutcomes: simulatedOutcomes.length,
        unsupportedClaims: unsupportedClaims.length, failedToolExecs: failedToolExecs.length,
        artifactsAwaiting: artifactsAwaitingVerification.length,
        recentAudit: auditLogs,
        pendingApprovalsList: pendingApprovals.slice(0, 5),
        failedToolExecsList: failedToolExecs.slice(0, 5),
      });
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /></div>;
  if (error) return <div className="glass-card rounded-xl p-8 text-center"><p className="text-destructive text-sm">Error: {error}</p><button onClick={loadData} className="mt-3 text-xs text-primary underline">Retry</button></div>;
  if (!stats) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><Shield className="w-6 h-6 text-blue-400" /> Sovereign Control Centre</h1>
        <p className="text-sm text-muted-foreground mt-1">Truthful execution governance — every outcome is traced to verified or simulated evidence</p>
      </div>

      <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-amber-200">Truth Disclosure</p>
          <p className="text-xs text-amber-200/70 mt-1">All ventures default to <strong>simulation mode</strong>. No external systems (Vercel, Stripe, Google Ads, social networks) are accessed unless a ToolExecution record contains verified evidence. In-app artifacts are generated within Base44 only — no standalone local codebase or external deployment is claimed without proof.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Rocket} label="Total Ventures" value={stats.totalVentures} sub="Across all lifecycle stages" color="bg-blue-500/10 text-blue-400" link="/forge/ventures" />
        <StatCard icon={GitBranch} label="Pending Approvals" value={stats.pendingApprovals} sub="Awaiting decision" color="bg-amber-500/10 text-amber-400" link="/forge/approvals" />
        <StatCard icon={TrendingUp} label="Verified Outcomes" value={stats.verifiedOutcomes} sub="Evidence-backed" color="bg-green-500/10 text-green-400" />
        <StatCard icon={TrendingDown} label="Simulated Outcomes" value={stats.simulatedOutcomes} sub="Not real-world" color="bg-purple-500/10 text-purple-400" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="glass-card rounded-xl p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Ventures by Lifecycle Stage</h2>
          {stats.totalVentures === 0 ? <p className="text-sm text-muted-foreground text-center py-8">No ventures yet.</p> : (
            <div className="space-y-2">
              {["brief", "evidence", "assumptions", "decision", "build_approval", "action_proposal", "runner_execution", "artifact_manifest", "qa", "inspection", "deployment_approval", "verified_preview", "ready_handoff", "archived"].map(stage => {
                const count = stats.stages[stage] || 0;
                if (count === 0) return null;
                const pct = Math.round((count / stats.totalVentures) * 100);
                return (
                  <div key={stage} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-32 capitalize truncate">{stage.replace(/_/g, " ")}</span>
                    <div className="flex-1 h-6 bg-secondary/30 rounded-md overflow-hidden"><div className="h-full bg-primary/40 rounded-md flex items-center justify-end px-2" style={{ width: `${Math.max(pct, 8)}%` }}><span className="text-[10px] font-medium text-foreground">{count}</span></div></div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="glass-card rounded-xl p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Workflow Runs by Execution Mode</h2>
          {stats.totalRuns === 0 ? <p className="text-sm text-muted-foreground text-center py-8">No workflow runs yet.</p> : (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-purple-500/10"><div className="flex items-center gap-2"><ExecutionModeBadge mode="simulation" /> <span className="text-sm text-muted-foreground">Simulated</span></div><span className="text-lg font-bold text-purple-400">{stats.simRuns.length}</span></div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-green-500/10"><div className="flex items-center gap-2"><ExecutionModeBadge mode="production" /> <span className="text-sm text-muted-foreground">Production</span></div><span className="text-lg font-bold text-green-400">{stats.prodRuns.length}</span></div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30"><div className="flex items-center gap-2"><ExecutionModeBadge mode="test" /> <span className="text-sm text-muted-foreground">Test</span></div><span className="text-lg font-bold text-amber-400">{stats.totalRuns - stats.simRuns.length - stats.prodRuns.length}</span></div>
            </div>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="glass-card rounded-xl p-6">
          <div className="flex items-center justify-between mb-4"><h2 className="text-lg font-semibold text-foreground flex items-center gap-2"><GitBranch className="w-5 h-5 text-amber-400" /> Pending Approvals</h2><Link to="/forge/approvals" className="text-xs text-primary hover:underline">View all</Link></div>
          {stats.pendingApprovalsList.length === 0 ? <p className="text-sm text-muted-foreground text-center py-8">No pending approvals.</p> : (
            <div className="space-y-2">
              {stats.pendingApprovalsList.map(a => (
                <div key={a.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                  <div className="flex-1 min-w-0"><p className="text-sm font-medium text-foreground truncate">{a.requested_action}</p><p className="text-xs text-muted-foreground capitalize">{a.request_type.replace(/_/g, " ")} • Risk: {a.risk_level}</p></div>
                  <StatusBadge status={a.decision} />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="glass-card rounded-xl p-6">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-4"><AlertTriangle className="w-5 h-5 text-red-400" /> Issues Requiring Attention</h2>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 rounded-lg bg-red-500/10"><div className="flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-red-400" /><span className="text-sm text-foreground">Unsupported Claims</span></div><span className="text-lg font-bold text-red-400">{stats.unsupportedClaims}</span></div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-red-500/10"><div className="flex items-center gap-2"><XCircle className="w-4 h-4 text-red-400" /><span className="text-sm text-foreground">Failed Tool Executions</span></div><span className="text-lg font-bold text-red-400">{stats.failedToolExecs}</span></div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-amber-500/10"><div className="flex items-center gap-2"><Package className="w-4 h-4 text-amber-400" /><span className="text-sm text-foreground">Artifacts Awaiting Verification</span></div><span className="text-lg font-bold text-amber-400">{stats.artifactsAwaiting}</span></div>
          </div>
        </div>
      </div>

      <div className="glass-card rounded-xl p-6">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-4"><Lock className="w-5 h-5 text-purple-400" /> Permission Boundaries</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-lg bg-secondary/30"><p className="text-muted-foreground">External Deployment</p><p className="font-medium text-red-400">Not Permitted</p></div>
          <div className="p-3 rounded-lg bg-secondary/30"><p className="text-muted-foreground">Real Payments</p><p className="font-medium text-red-400">Not Permitted</p></div>
          <div className="p-3 rounded-lg bg-secondary/30"><p className="text-muted-foreground">External Messaging</p><p className="font-medium text-amber-400">Requires Approval</p></div>
          <div className="p-3 rounded-lg bg-secondary/30"><p className="text-muted-foreground">In-App Generation</p><p className="font-medium text-green-400">Permitted</p></div>
        </div>
      </div>

      <div className="glass-card rounded-xl p-6">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-4"><ScrollText className="w-5 h-5 text-blue-400" /> Recent Audit Events</h2>
        {stats.recentAudit.length === 0 ? <p className="text-sm text-muted-foreground text-center py-8">No audit events.</p> : (
          <div className="space-y-1">
            {stats.recentAudit.map(log => (
              <div key={log.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-secondary/20">
                <span className="text-xs text-muted-foreground mt-0.5">{new Date(log.created_date).toLocaleTimeString()}</span>
                <div className="flex-1 min-w-0"><p className="text-xs text-foreground truncate">{log.action}</p><p className="text-[10px] text-muted-foreground">Actor: {log.actor}</p></div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}