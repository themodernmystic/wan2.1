import React from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

export default function ValidationScoreChart({ projects }) {
  const data = projects
    .filter(p => p.validation_score != null)
    .slice(0, 8)
    .map(p => ({
      name: p.name.length > 14 ? p.name.slice(0, 12) + "…" : p.name,
      score: p.validation_score,
      fullName: p.name,
    }));

  const getBarColor = (score) => {
    if (score >= 80) return "#22c55e";
    if (score >= 60) return "#3b82f6";
    if (score >= 40) return "#eab308";
    return "#ef4444";
  };

  const tooltipStyle = {
    backgroundColor: "hsl(222 44% 8%)",
    border: "1px solid hsl(222 30% 16%)",
    borderRadius: "8px",
    fontSize: "12px",
  };

  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">
        No validation scores yet. Run validations to see data here.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 30% 16%)" vertical={false} />
        <XAxis
          dataKey="name"
          tick={{ fill: "hsl(215 20% 55%)", fontSize: 10 }}
          axisLine={{ stroke: "hsl(222 30% 16%)" }}
          tickLine={false}
          angle={-20}
          textAnchor="end"
          height={50}
        />
        <YAxis
          domain={[0, 100]}
          tick={{ fill: "hsl(215 20% 55%)", fontSize: 10 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          cursor={{ fill: "hsl(222 30% 16% / 0.3)" }}
          formatter={(value) => [`${value}/100`, "Score"]}
          labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName || ""}
        />
        <Bar dataKey="score" radius={[6, 6, 0, 0]} maxBarSize={50}>
          {data.map((entry, index) => (
            <Cell key={index} fill={getBarColor(entry.score)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}