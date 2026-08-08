import React from "react";

const statusStyles = {
  ideation: "bg-purple-500/15 text-purple-400 border-purple-500/20",
  research: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  design: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  build: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  deploy: "bg-cyan-500/15 text-cyan-400 border-cyan-500/20",
  live: "bg-green-500/15 text-green-400 border-green-500/20",
  archived: "bg-gray-500/15 text-gray-400 border-gray-500/20",
  active: "bg-green-500/15 text-green-400 border-green-500/20",
  inactive: "bg-gray-500/15 text-gray-400 border-gray-500/20",
  training: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  error: "bg-red-500/15 text-red-400 border-red-500/20",
  pending: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
  in_progress: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  completed: "bg-green-500/15 text-green-400 border-green-500/20",
  failed: "bg-red-500/15 text-red-400 border-red-500/20",
  todo: "bg-gray-500/15 text-gray-400 border-gray-500/20",
  review: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  done: "bg-green-500/15 text-green-400 border-green-500/20",
  low: "bg-gray-500/15 text-gray-400 border-gray-500/20",
  medium: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  high: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  critical: "bg-red-500/15 text-red-400 border-red-500/20",
};

export default function StatusBadge({ status }) {
  const style = statusStyles[status] || "bg-gray-500/15 text-gray-400 border-gray-500/20";
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${style} capitalize`}>
      {status?.replace(/_/g, " ")}
    </span>
  );
}