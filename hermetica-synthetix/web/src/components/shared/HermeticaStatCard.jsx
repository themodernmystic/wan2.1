import React from "react";

export default function HermeticaStatCard({ label, value, icon: Icon, trend, color = "blue" }) {
  const colors = {
    blue: "from-blue-500/20 to-blue-600/5 text-blue-400",
    gold: "from-amber-500/20 to-amber-600/5 text-amber-400",
    green: "from-emerald-500/20 to-emerald-600/5 text-emerald-400",
    purple: "from-purple-500/20 to-purple-600/5 text-purple-400",
  };

  return (
    <div className="glass-card rounded-xl p-5 relative overflow-hidden group hover:border-white/10 transition-all duration-300">
      <div className={`absolute inset-0 bg-gradient-to-br ${colors[color]} opacity-30`} />
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
          {Icon && <Icon className="w-4 h-4 text-muted-foreground" />}
        </div>
        <p className="text-2xl font-bold text-foreground">{value}</p>
        {trend && (
          <p className={`text-xs mt-1 ${trend > 0 ? "text-emerald-400" : "text-red-400"}`}>
            {trend > 0 ? "↑" : "↓"} {Math.abs(trend)}% from last week
          </p>
        )}
      </div>
    </div>
  );
}