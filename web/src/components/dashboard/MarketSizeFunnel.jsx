import React from "react";

export default function MarketSizeFunnel({ projects }) {
  const withMarket = projects.filter(p => p.market_size_tam || p.market_size_sam || p.market_size_som);

  if (withMarket.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">
        No market sizing data yet. Run validations to see TAM/SAM/SOM.
      </div>
    );
  }

  return (
    <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
      {withMarket.slice(0, 6).map((project) => {
        const layers = [
          { label: "TAM", value: project.market_size_tam, width: "100%", color: "from-blue-500/30 to-blue-600/10", text: "text-blue-400" },
          { label: "SAM", value: project.market_size_sam, width: "75%", color: "from-amber-500/30 to-amber-600/10", text: "text-amber-400" },
          { label: "SOM", value: project.market_size_som, width: "50%", color: "from-emerald-500/30 to-emerald-600/10", text: "text-emerald-400" },
        ];

        return (
          <div key={project.id} className="border-b border-border/30 pb-3 last:border-0 last:pb-0">
            <p className="text-xs font-medium text-foreground mb-2 truncate">{project.name}</p>
            <div className="space-y-1">
              {layers.map((layer) => (
                <div key={layer.label} className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground w-8">{layer.label}</span>
                  <div className="flex-1">
                    <div
                      className={`bg-gradient-to-r ${layer.color} rounded-md px-2 py-1 ${layer.text} text-xs font-medium`}
                      style={{ width: layer.width }}
                    >
                      {layer.value || "—"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}