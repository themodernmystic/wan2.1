import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { FileCheck, Search, AlertTriangle, ExternalLink, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const classColors = { sourced: "bg-green-500/20 text-green-400", inferred: "bg-amber-500/20 text-amber-400", estimated: "bg-orange-500/20 text-orange-400", user_provided: "bg-blue-500/20 text-blue-400" };
const statusColors = { proposed: "bg-gray-500/20 text-gray-400", verified: "bg-green-500/20 text-green-400", rejected: "bg-red-500/20 text-red-400", expired: "bg-orange-500/20 text-orange-400" };

export default function Evidence() {
  const [evidence, setEvidence] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [filterClass, setFilterClass] = useState("all");

  useEffect(() => { loadEvidence(); }, []);

  async function loadEvidence() {
    try { setEvidence(await base44.entities.Evidence.list("-created_date", 100)); }
    catch (err) { setError(err.message); } finally { setLoading(false); }
  }

  const filtered = evidence.filter(e => {
    const matchesSearch = e.claim_supported?.toLowerCase().includes(search.toLowerCase()) || e.source_title?.toLowerCase().includes(search.toLowerCase());
    const matchesClass = filterClass === "all" || e.classification === filterClass;
    return matchesSearch && matchesClass;
  });

  const unsupportedCount = evidence.filter(e => e.classification !== "sourced" && e.status !== "verified").length;

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /></div>;
  if (error) return <div className="glass-card rounded-xl p-8 text-center"><p className="text-destructive text-sm">Error: {error}</p><Button onClick={loadEvidence} className="mt-3" size="sm">Retry</Button></div>;

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><FileCheck className="w-6 h-6 text-green-400" /> Evidence Library</h1><p className="text-sm text-muted-foreground mt-1">Structured evidence — every claim traced to source, classification, and confidence</p></div>

      {unsupportedCount > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div><p className="text-sm font-medium text-amber-200">{unsupportedCount} unsupported or unverified claims</p><p className="text-xs text-amber-200/70 mt-1">These claims are inferred, estimated, or user-provided and have not been verified against a primary source. Treat with caution.</p></div>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search claims or sources..." className="pl-9 bg-secondary/50" /></div>
        <select value={filterClass} onChange={e => setFilterClass(e.target.value)} className="h-9 rounded-md border border-input bg-secondary/50 px-3 text-sm"><option value="all">All Classifications</option><option value="sourced">Sourced</option><option value="inferred">Inferred</option><option value="estimated">Estimated</option><option value="user_provided">User Provided</option></select>
      </div>

      {filtered.length === 0 ? (
        <div className="glass-card rounded-xl p-12 text-center"><FileCheck className="w-12 h-12 text-muted-foreground mx-auto mb-3" /><p className="text-sm text-muted-foreground">No evidence records found.</p></div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {filtered.map(ev => (
            <div key={ev.id} className="glass-card rounded-xl p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <p className="text-sm font-medium text-foreground flex-1">{ev.claim_supported}</p>
                <Badge className={`text-xs ${classColors[ev.classification] || ""}`}>{ev.classification}</Badge>
              </div>
              <p className="text-xs text-muted-foreground mb-1">{ev.source_title}</p>
              {ev.publisher && <p className="text-xs text-muted-foreground">Publisher: {ev.publisher}</p>}
              {ev.source_url && <a href={ev.source_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:underline flex items-center gap-1 mt-1"><ExternalLink className="w-3 h-3" /> Source</a>}
              {ev.excerpt_or_summary && <p className="text-xs text-muted-foreground mt-2 italic">"{ev.excerpt_or_summary}"</p>}
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/30">
                <div className="flex items-center gap-2"><Badge className={`text-xs ${statusColors[ev.status] || ""}`}>{ev.status}</Badge>{ev.status === "verified" && <ShieldCheck className="w-3.5 h-3.5 text-green-400" />}</div>
                <div className="text-right"><p className="text-xs text-muted-foreground">Confidence: <span className="text-foreground font-medium">{ev.confidence || 0}%</span></p><p className="text-xs text-muted-foreground">Reliability: {ev.reliability_rating || 0}/10</p></div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}