import React from "react";

export default function ScoreRing({ score, size = 80, label }) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const getColor = (s) => {
    if (s >= 80) return "#22c55e";
    if (s >= 60) return "#3b82f6";
    if (s >= 40) return "#eab308";
    return "#ef4444";
  };

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="hsl(222 30% 16%)" strokeWidth="4" />
        <circle
          cx={size/2} cy={size/2} r={radius} fill="none"
          stroke={getColor(score)} strokeWidth="4"
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center" style={{ width: size, height: size }}>
        <span className="text-lg font-bold">{score}</span>
      </div>
      {label && <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</span>}
    </div>
  );
}