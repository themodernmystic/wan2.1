import React from "react";
import { Badge } from "@/components/ui/badge";

const statusConfig = {
  proposed: { color: "bg-gray-500/20 text-gray-400", label: "Proposed" },
  pending_approval: { color: "bg-amber-500/20 text-amber-400", label: "Pending Approval" },
  approved: { color: "bg-blue-500/20 text-blue-400", label: "Approved" },
  running: { color: "bg-cyan-500/20 text-cyan-400", label: "Running" },
  attempted: { color: "bg-purple-500/20 text-purple-400", label: "Attempted" },
  verified: { color: "bg-green-500/20 text-green-400", label: "Verified" },
  failed: { color: "bg-red-500/20 text-red-400", label: "Failed" },
  cancelled: { color: "bg-gray-500/20 text-gray-400", label: "Cancelled" },
  pending: { color: "bg-amber-500/20 text-amber-400", label: "Pending" },
  decided: { color: "bg-blue-500/20 text-blue-400", label: "Decided" },
  executed: { color: "bg-cyan-500/20 text-cyan-400", label: "Executed" },
};

export default function StatusBadge({ status }) {
  const config = statusConfig[status] || { color: "bg-gray-500/20 text-gray-400", label: status };
  return <Badge className={`text-xs ${config.color}`}>{config.label}</Badge>;
}