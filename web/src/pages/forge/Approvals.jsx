import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { GitBranch, Check, X, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ExecutionModeBadge from "@/components/forge/ExecutionModeBadge";
import StatusBadge from "@/components/forge/StatusBadge";
import { useToast } from "@/components/ui/use-toast";

const riskColors = { low: "bg-green-500/20 text-green-400", medium: "bg-amber-500/20 text-amber-400", high: "bg-orange-500/20 text-orange-400", critical: "bg-red-500/20 text-red-400" };

export default function Approvals() {
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { toast } = useToast();

  useEffect(() => { loadApprovals(); }, []);

  async function loadApprovals() {
    try { setApprovals(await base44.entities.ApprovalRequest.list("-created_date", 50)); }
    catch (err) { setError(err.message); } finally { setLoading(false); }
  }

  async function decide(approval, decision) {
    try {
      await base44.entities.ApprovalRequest.update(approval.id, { decision, decision_reason: `Acceptance test ${decision} by authenticated user`, approver_id: "current_user", approved_at: new Date().toISOString() });
      toast({ title: `Approval ${decision}` });
      await loadApprovals();
    } catch (err) { toast({ variant: "destructive", title: "Error", description: err.message }); }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /></div>;
  if (error) return <div className="glass-card rounded-xl p-8 text-center"><p className="text-destructive text-sm">Error: {error}</p><Button onClick={loadApprovals} className="mt-3" size="sm">Retry</Button></div>;

  const pending = approvals.filter(a => a.decision === "pending");
  const decided = approvals.filter(a => a.decision !== "pending");

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><GitBranch className="w-6 h-6 text-amber-400" /> Approval Governance</h1><p className="text-sm text-muted-foreground mt-1">Approval gates for build, deployment, spending, publishing, messaging, and destructive operations</p></div>

      <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
        <p className="text-xs text-amber-200"><strong>Rule:</strong> No agent or service account can approve its own proposal. Approvals recorded here are acceptance-test approvals by the authenticated user — not real human governance unless explicitly verified.</p>
      </div>

      <div className="glass-card rounded-xl p-6">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-4"><Clock className="w-5 h-5 text-amber-400" /> Pending ({pending.length})</h2>
        {pending.length === 0 ? <p className="text-sm text-muted-foreground text-center py-8">No pending approvals.</p> : (
          <div className="space-y-3">
            {pending.map(a => (
              <div key={a.id} className="p-4 rounded-lg bg-secondary/30 border border-border/30">
                <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
                  <div className="flex-1 min-w-0"><div className="flex items-center gap-2 mb-1 flex-wrap"><Badge className={`text-xs ${riskColors[a.risk_level] || ""}`}>{a.risk_level} risk</Badge><span className="text-xs text-muted-foreground capitalize">{a.request_type.replace(/_/g, " ")}</span>{a.is_acceptance_test && <Badge variant="outline" className="text-xs text-amber-400">Acceptance Test</Badge>}</div><p className="text-sm font-medium text-foreground">{a.requested_action}</p></div>
                </div>
                {a.estimated_cost > 0 && <p className="text-xs text-muted-foreground">Est. cost: ${a.estimated_cost}</p>}
                {a.external_side_effects && <p className="text-xs text-orange-400 mt-1">External side effects: {a.external_side_effects}</p>}
                {a.permissions_requested && <p className="text-xs text-muted-foreground mt-1">Permissions: {a.permissions_requested}</p>}
                <div className="flex gap-2 mt-3"><Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => decide(a, "approved")}><Check className="w-3.5 h-3.5" /> Approve</Button><Button size="sm" variant="outline" className="text-red-400 border-red-500/30 hover:bg-red-500/10" onClick={() => decide(a, "rejected")}><X className="w-3.5 h-3.5" /> Reject</Button></div>
              </div>
            ))}
          </div>
        )}
      </div>

      {decided.length > 0 && (
        <div className="glass-card rounded-xl p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Decided ({decided.length})</h2>
          <div className="space-y-2">
            {decided.map(a => (
              <div key={a.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/20">
                <div className="flex-1 min-w-0"><p className="text-sm font-medium text-foreground truncate">{a.requested_action}</p><p className="text-xs text-muted-foreground capitalize">{a.request_type.replace(/_/g, " ")} • {a.risk_level} risk</p></div>
                <StatusBadge status={a.decision} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}