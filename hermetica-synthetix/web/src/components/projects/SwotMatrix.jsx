import React, { useMemo } from "react";
import { TrendingUp, TrendingDown, AlertTriangle, Target, ShieldCheck } from "lucide-react";

export default function SwotMatrix({ quadrants, swotText, sourceReportId, sourceReportDate }) {
  const parsed = useMemo(() => {
    if (quadrants && (quadrants.strengths || quadrants.weaknesses || quadrants.opportunities || quadrants.threats)) {
      return {
        strengths: quadrants.strengths || [],
        weaknesses: quadrants.weaknesses || [],
        opportunities: quadrants.opportunities || [],
        threats: quadrants.threats || [],
      };
    }
    if (swotText) return parseSwot(swotText);
    return null;
  }, [quadrants, swotText]);

  if (!parsed) {
    return (
      <div className="glass-card rounded-xl p-6 text-center">
        <p className="text-sm text-muted-foreground">No SWOT analysis available. Run a validation to generate one.</p>
      </div>
    );
  }

  const cards = [
    { key: "strengths", title: "Strengths", icon: TrendingUp, color: "text-emerald-400", border: "border-emerald-500/20", bg: "from-emerald-500/10 to-transparent", items: parsed.strengths },
    { key: "weaknesses", title: "Weaknesses", icon: TrendingDown, color: "text-red-400", border: "border-red-500/20", bg: "from-red-500/10 to-transparent", items: parsed.weaknesses },
    { key: "opportunities", title: "Opportunities", icon: Target, color: "text-blue-400", border: "border-blue-500/20", bg: "from-blue-500/10 to-transparent", items: parsed.opportunities },
    { key: "threats", title: "Threats", icon: AlertTriangle, color: "text-amber-400", border: "border-amber-500/20", bg: "from-amber-500/10 to-transparent", items: parsed.threats },
  ];

  return (
    <div>
      <div className="grid sm:grid-cols-2 gap-4">
        {cards.map((card) => (
          <div key={card.key} className={`glass-card rounded-xl p-5 border ${card.border} bg-gradient-to-br ${card.bg}`}>
            <div className="flex items-center gap-2 mb-3">
              <card.icon className={`w-4 h-4 ${card.color}`} />
              <h4 className={`text-sm font-semibold ${card.color}`}>{card.title}</h4>
            </div>
            {card.items.length > 0 ? (
              <ul className="space-y-1.5">
                {card.items.map((item, i) => (
                  <li key={i} className="text-xs text-foreground/80 flex gap-2">
                    <span className={`flex-shrink-0 mt-1 ${card.color}`}>•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground italic">No data</p>
            )}
          </div>
        ))}
      </div>
      {sourceReportId && (
        <div className="flex items-center gap-1.5 mt-3 px-1">
          <ShieldCheck className="w-3 h-3 text-muted-foreground" />
          <span className="text-[10px] text-muted-foreground">
            Source: Report {sourceReportId.slice(0, 8)}
            {sourceReportDate ? ` · ${new Date(sourceReportDate).toLocaleDateString()}` : ""}
          </span>
        </div>
      )}
    </div>
  );
}

function parseSwot(text) {
  if (!text || typeof text !== "string") return null;

  const sectionKeywords = {
    strengths: ["strengths", "strength"],
    weaknesses: ["weaknesses", "weakness"],
    opportunities: ["opportunities", "opportunity"],
    threats: ["threats", "threat"],
  };

  const positions = {};
  for (const [quad, keywords] of Object.entries(sectionKeywords)) {
    let foundPos = -1;
    for (const kw of keywords) {
      const patterns = [
        new RegExp(`(^|\\n)\\s*[*#\\-]*\\s*\\**${kw}\\**\\s*[:\\-]?`, "i"),
        new RegExp(`\\**${kw}\\**\\s*[:\\-]`, "i"),
      ];
      for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match && (foundPos === -1 || match.index < foundPos)) {
          foundPos = match.index + match[0].length;
        }
      }
    }
    positions[quad] = foundPos;
  }

  const foundCount = Object.values(positions).filter(p => p !== -1).length;
  if (foundCount === 0) {
    return { strengths: [], weaknesses: [], opportunities: [], threats: [] };
  }

  const sortedQuads = Object.keys(positions)
    .filter(q => positions[q] !== -1)
    .sort((a, b) => positions[a] - positions[b]);

  const result = { strengths: [], weaknesses: [], opportunities: [], threats: [] };

  for (let i = 0; i < sortedQuads.length; i++) {
    const quad = sortedQuads[i];
    const startPos = positions[quad];
    const endPos = i + 1 < sortedQuads.length ? positions[sortedQuads[i + 1]] : text.length;
    const sectionText = text.slice(startPos, endPos);

    const lines = sectionText
      .split("\n")
      .map(l => l.trim())
      .filter(l => l.length > 0)
      .filter(l => !isHeaderLine(l, sectionKeywords[quad]));

    const items = [];
    for (const line of lines) {
      const cleaned = line
        .replace(/^[\s]*[-*•#\d.)\]]+\s*/, "")
        .replace(/^\**|\**$/g, "")
        .replace(/^[A-Z][a-z]+:\s*/, "")
        .trim();
      if (cleaned.length > 3) {
        items.push(cleaned);
      }
    }
    result[quad] = items;
  }

  return result;
}

function isHeaderLine(line, keywords) {
  const lower = line.toLowerCase().replace(/[*#\-\:]/g, "").trim();
  return keywords.some(kw => lower === kw || lower === kw + "s");
}