import React from "react";
import { Badge } from "@/components/ui/badge";

const modeConfig = {
  simulation: { color: "bg-purple-500/20 text-purple-400 border-purple-500/30", label: "SIMULATION" },
  dry_run: { color: "bg-blue-500/20 text-blue-400 border-blue-500/30", label: "DRY RUN" },
  test: { color: "bg-amber-500/20 text-amber-400 border-amber-500/30", label: "TEST" },
  production: { color: "bg-green-500/20 text-green-400 border-green-500/30", label: "PRODUCTION" },
};

export default function ExecutionModeBadge({ mode, size = "sm" }) {
  const config = modeConfig[mode] || modeConfig.simulation;
  return <Badge variant="outline" className={`${config.color} ${size === "xs" ? "text-[10px] px-1.5 py-0" : "text-xs"}`}>{config.label}</Badge>;
}