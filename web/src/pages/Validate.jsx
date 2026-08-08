import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { FlaskConical, Zap, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PageHeader from "@/components/shared/HermeticaPageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import { useToast } from "@/components/ui/use-toast";
import { motion, AnimatePresence } from "framer-motion";
const runValidation = (payload) => base44.functions.invoke("runValidation", payload);
import SwotMatrix from "@/components/projects/SwotMatrix";
import { CheckCircle2, CloudOff } from "lucide-react";

export default function Validate() {
  const [idea, setIdea] = useState({ name: "", description: "", category: "saas", target_audience: "", revenue_model: "" });
  const [validating, setValidating] = useState(false);
  const [result, setResult] = useState(null);
  const [recentReports, setRecentReports] = useState([]);
  const { toast } = useToast();

  useEffect(() => {
    base44.entities.ValidationReport.filter({ status: "completed" }, "-created_date", 5).then(setRecentReports);
  }, []);

  const handleValidate = async () => {
    if (!idea.name.trim()) return;
    setValidating(true);
    setResult(null);

    try {
      const res = await runValidation({
        name: idea.name,
        description: idea.description,
        category: idea.category,
        target_audience: idea.target_audience,
        revenue_model: idea.revenue_model,
      });
      setResult(res.data);
      setValidating(false);
      toast({ title: "Validation Complete!", description: `Score: ${res.data.overall_score}/100 • Drive: ${res.data.drive_archive?.status}` });
    } catch (err) {
      setValidating(false);
      toast({ title: "Validation failed", description: err.message, variant: "destructive" });
    }
  };

  const getScoreColor = (s) => {
    if (s >= 80) return "text-emerald-400";
    if (s >= 60) return "text-blue-400";
    if (s >= 40) return "text-amber-400";
    return "text-red-400";
  };

  return (
    <div>
      <PageHeader title="Validation Lab" subtitle="AI-powered idea validation with deep market research" />

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Input Form */}
        <div className="lg:col-span-2">
          <div className="glass-card rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-semibold text-foreground">Describe Your Idea</h2>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Idea Name</Label>
              <Input value={idea.name} onChange={(e) => setIdea({...idea, name: e.target.value})} placeholder="e.g., AI-Powered Fitness Coach" className="mt-1 bg-secondary/50 border-border/50" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Description</Label>
              <Textarea value={idea.description} onChange={(e) => setIdea({...idea, description: e.target.value})} placeholder="Describe what your idea does, the problem it solves..." className="mt-1 bg-secondary/50 border-border/50 min-h-28" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Category</Label>
              <Select value={idea.category} onValueChange={(v) => setIdea({...idea, category: v})}>
                <SelectTrigger className="mt-1 bg-secondary/50 border-border/50"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["saas", "marketplace", "mobile_app", "ai_tool", "ecommerce", "api_service", "content_platform", "other"].map(c => (
                    <SelectItem key={c} value={c} className="capitalize">{c.replace(/_/g, " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Target Audience</Label>
              <Input value={idea.target_audience} onChange={(e) => setIdea({...idea, target_audience: e.target.value})} placeholder="e.g., Small business owners aged 25-45" className="mt-1 bg-secondary/50 border-border/50" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Revenue Model</Label>
              <Input value={idea.revenue_model} onChange={(e) => setIdea({...idea, revenue_model: e.target.value})} placeholder="e.g., Freemium SaaS with $29/mo pro plan" className="mt-1 bg-secondary/50 border-border/50" />
            </div>
            <Button onClick={handleValidate} disabled={!idea.name.trim() || validating} className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-semibold gap-2">
              <Zap className="w-4 h-4" />
              {validating ? "Analyzing..." : "Run Full Validation"}
            </Button>
          </div>
        </div>

        {/* Results */}
        <div className="lg:col-span-3">
          <AnimatePresence mode="wait">
            {validating && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="glass-card rounded-xl p-8 glow-gold">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-12 h-12 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
                  <div className="text-center">
                    <p className="text-lg font-semibold text-foreground">Forging Validation Report</p>
                    <p className="text-sm text-muted-foreground mt-1">Running deep market analysis, competitor research, and feasibility assessment...</p>
                  </div>
                </div>
              </motion.div>
            )}

            {result && !validating && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                {/* Score Header */}
                <div className="glass-card rounded-xl p-6 glow-blue">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-foreground">Overall Viability Score</h3>
                    <a href={`/hermetica/projects/${result.project_id}`} className="text-xs text-primary flex items-center gap-1 hover:underline">
                      View Project <ArrowRight className="w-3 h-3" />
                    </a>
                  </div>
                  <div className="text-center mb-6">
                    <span className={`text-6xl font-bold ${getScoreColor(result.overall_score)}`}>{result.overall_score}</span>
                    <span className="text-xl text-muted-foreground">/100</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: "Market", score: result.market_score },
                      { label: "Competition", score: result.competition_score },
                      { label: "Feasibility", score: result.feasibility_score },
                      { label: "Revenue", score: result.revenue_score },
                    ].map(({ label, score }) => (
                      <div key={label} className="bg-secondary/50 rounded-lg p-3 text-center">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{label}</p>
                        <p className={`text-xl font-bold ${getScoreColor(score)}`}>{score}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Market Sizing */}
                <div className="glass-card rounded-xl p-6">
                  <h3 className="text-sm font-semibold text-foreground mb-3">Market Sizing</h3>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: "TAM", value: result.market_size_tam },
                      { label: "SAM", value: result.market_size_sam },
                      { label: "SOM", value: result.market_size_som },
                    ].map(({ label, value }) => (
                      <div key={label} className="bg-secondary/50 rounded-lg p-3 text-center">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{label}</p>
                        <p className="text-sm font-semibold text-foreground">{value || "—"}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Summary */}
                <div className="glass-card rounded-xl p-6">
                  <h3 className="text-sm font-semibold text-foreground mb-3">Executive Summary</h3>
                  <p className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">{result.summary}</p>
                </div>

                {/* Drive Archive Status */}
                {result.drive_archive && (
                  <div className="glass-card rounded-xl p-4 flex items-center gap-3">
                    {result.drive_archive.status === "archived" ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        <span className="text-sm text-emerald-400 font-medium">Archived to Google Drive</span>
                        {result.drive_archive.fileUrl && (
                          <a href={result.drive_archive.fileUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline ml-auto">
                            View on Drive
                          </a>
                        )}
                      </>
                    ) : result.drive_archive.status === "failed" ? (
                      <>
                        <CloudOff className="w-4 h-4 text-red-400 flex-shrink-0" />
                        <span className="text-sm text-red-400 font-medium">Drive archive failed</span>
                        <span className="text-xs text-muted-foreground ml-auto">{result.drive_archive.error}</span>
                      </>
                    ) : null}
                  </div>
                )}

                {/* SWOT */}
                <div className="glass-card rounded-xl p-6">
                  <h3 className="text-sm font-semibold text-foreground mb-3">SWOT Analysis</h3>
                  <SwotMatrix
                    quadrants={result.swot_quadrants}
                    swotText={result.swot_analysis}
                    sourceReportId={result.report_id}
                  />
                </div>

                {/* Recommendations */}
                <div className="glass-card rounded-xl p-6">
                  <h3 className="text-sm font-semibold text-foreground mb-3">Recommendations</h3>
                  <p className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">{result.recommendations}</p>
                </div>

                {/* Risks & Opportunities */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="glass-card rounded-xl p-6">
                    <h3 className="text-sm font-semibold text-red-400 mb-3">Risks</h3>
                    <p className="text-sm text-foreground/80 whitespace-pre-wrap">{result.risks}</p>
                  </div>
                  <div className="glass-card rounded-xl p-6">
                    <h3 className="text-sm font-semibold text-emerald-400 mb-3">Opportunities</h3>
                    <p className="text-sm text-foreground/80 whitespace-pre-wrap">{result.opportunities}</p>
                  </div>
                </div>
              </motion.div>
            )}

            {!result && !validating && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                {recentReports.length > 0 ? (
                  <div className="glass-card rounded-xl overflow-hidden">
                    <div className="px-5 py-4 border-b border-border/50">
                      <h3 className="text-sm font-semibold text-foreground">Recent Validations</h3>
                    </div>
                    <div className="divide-y divide-border/30">
                      {recentReports.map((r) => (
                        <div key={r.id} className="px-5 py-3.5 flex items-center justify-between">
                          <div>
                            <StatusBadge status={r.status} />
                            <span className="text-xs text-muted-foreground ml-2 capitalize">{r.report_type?.replace(/_/g, " ")}</span>
                          </div>
                          {r.overall_score && <span className={`text-lg font-bold ${getScoreColor(r.overall_score)}`}>{r.overall_score}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="glass-card rounded-xl p-12 text-center">
                    <FlaskConical className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                    <p className="text-lg font-semibold text-foreground mb-2">Ready to Validate</p>
                    <p className="text-sm text-muted-foreground max-w-sm mx-auto">Enter your idea details and run a full validation to get market research, competitor analysis, and a viability score.</p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}