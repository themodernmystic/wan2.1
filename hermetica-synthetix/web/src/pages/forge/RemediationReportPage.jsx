import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { ClipboardCheck, AlertTriangle, CheckCircle2, XCircle, Loader2 } from "lucide-react";

export default function RemediationReportPage() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => { loadReports(); }, []);

  async function loadReports() {
    try { setReports(await base44.entities.RemediationReport.list("-report_date", 10)); }
    catch (err) { setError(err.message); } finally { setLoading(false); }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /></div>;
  if (error) return <div className="glass-card rounded-xl p-8 text-center"><p className="text-destructive text-sm">Error: {error}</p><button onClick={loadReports} className="mt-3 text-xs text-primary underline">Retry</button></div>;

  const report = reports[0];

  if (!report) return <div className="glass-card rounded-xl p-8 text-center"><p className="text-sm text-muted-foreground">No remediation report yet.</p></div>;

  const parseList = (str) => str ? str.split("\n").filter(s => s.trim()) : [];

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><ClipboardCheck className="w-6 h-6 text-blue-400" /> Remediation Report</h1><p className="text-sm text-muted-foreground mt-1">Hermetica Forge truthfulness remediation — {report.report_date}</p></div>

      <div className={`glass-card rounded-xl p-6 border-2 ${report.final_verdict?.includes("CONDITIONALLY") ? "border-amber-500/30" : "border-green-500/30"}`}>
        <div className="flex items-center gap-3 mb-2">
          {report.final_verdict?.includes("CONDITIONALLY") ? <AlertTriangle className="w-6 h-6 text-amber-400" /> : <CheckCircle2 className="w-6 h-6 text-green-400" />}
          <h2 className="text-xl font-bold text-foreground">Final Verdict: {report.final_verdict}</h2>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Section title="Changes Completed" icon={CheckCircle2} color="text-green-400" items={parseList(report.changes_completed)} />
        <Section title="Entities Created" icon={CheckCircle2} color="text-blue-400" items={parseList(report.entities_created)} />
        <Section title="Records Migrated / Reclassified" icon={CheckCircle2} color="text-purple-400" items={parseList(report.records_migrated)} />
        <Section title="Contradictions Repaired" icon={CheckCircle2} color="text-amber-400" items={parseList(report.contradictions_repaired)} />
        <Section title="Known Base44 Limitations" icon={AlertTriangle} color="text-orange-400" items={parseList(report.known_limitations)} />
        <Section title="Future Items (Local/OpenAI Engine)" icon={XCircle} color="text-red-400" items={parseList(report.future_items)} />
      </div>

      <div className="glass-card rounded-xl p-6">
        <h2 className="text-lg font-semibold text-foreground mb-3">QA Results</h2>
        <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono bg-secondary/30 p-4 rounded-lg">{report.qa_results}</pre>
      </div>
    </div>
  );
}

function Section({ title, icon: Icon, color, items }) {
  return (
    <div className="glass-card rounded-xl p-5">
      <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3"><Icon className={`w-4 h-4 ${color}`} /> {title}</h2>
      {items.length === 0 ? <p className="text-xs text-muted-foreground">None.</p> : (
        <ul className="space-y-1.5">{items.map((item, i) => <li key={i} className="text-xs text-muted-foreground flex items-start gap-2"><span className={`mt-1 w-1 h-1 rounded-full ${color.replace("text", "bg")} flex-shrink-0`} /> {item}</li>)}</ul>
      )}
    </div>
  );
}