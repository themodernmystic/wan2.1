import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Rocket, DollarSign, TrendingUp, Skull, Activity, Bot } from "lucide-react";
import { Badge } from "@/components/ui/badge";

function StatCard({ icon: Icon, label, value, sub, color }) {
  return (
    <div className="glass-card rounded-xl p-5">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${color}`}><Icon className="w-5 h-5" /></div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

export default function VentureDashboard() {
  const [stats, setStats] = useState({ totalMrr: 0, totalCosts: 0, netProfit: 0, liveApps: 0, killedApps: 0, killRate: 0 });
  const [recentApps, setRecentApps] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [apps, ags] = await Promise.all([
        base44.entities.MicroApp.list("-created_date", 50),
        base44.entities.ForgeAgent.filter({ project_id: "6a5ade7b596f86a2320f2a10" }),
      ]);
      const liveApps = apps.filter(a => a.status === "live");
      const killedApps = apps.filter(a => a.status === "killed" || a.status === "archived");
      const totalMrr = liveApps.reduce((s, a) => s + (a.mrr || 0), 0);
      const totalCosts = liveApps.reduce((s, a) => s + (a.api_costs || 0) + (a.ad_spend || 0), 0);
      const killRate = apps.length > 0 ? Math.round((killedApps.length / apps.length) * 100) : 0;
      setStats({ totalMrr, totalCosts, netProfit: totalMrr - totalCosts, liveApps: liveApps.length, killedApps: killedApps.length, killRate });
      setRecentApps(apps.slice(0, 6));
      setAgents(ags);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /></div>;
  if (error) return <div className="glass-card rounded-xl p-8 text-center"><p className="text-destructive text-sm">Error: {error}</p><button onClick={loadData} className="mt-3 text-xs text-primary underline">Retry</button></div>;

  const statusColors = { live: "bg-green-500/20 text-green-400", building: "bg-blue-500/20 text-blue-400", testing: "bg-amber-500/20 text-amber-400", killed: "bg-red-500/20 text-red-400", archived: "bg-gray-500/20 text-gray-400", scouting: "bg-purple-500/20 text-purple-400" };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Venture Studio Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Autonomous AI micro-SaaS portfolio — DEMO ACCEPTANCE TEST</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard icon={DollarSign} label="Total MRR" value={`$${stats.totalMrr.toLocaleString()}`} sub="Across live apps" color="bg-emerald-500/10 text-emerald-400" />
        <StatCard icon={TrendingUp} label="Net Profit" value={`$${stats.netProfit.toLocaleString()}`} sub="MRR minus costs" color="bg-blue-500/10 text-blue-400" />
        <StatCard icon={Rocket} label="Live Apps" value={stats.liveApps} sub="Generating revenue" color="bg-green-500/10 text-green-400" />
        <StatCard icon={Skull} label="Killed" value={stats.killedApps} sub="Failed profitability" color="bg-red-500/10 text-red-400" />
        <StatCard icon={Activity} label="Kill Rate" value={`${stats.killRate}%`} sub="Of all launched" color="bg-orange-500/10 text-orange-400" />
        <StatCard icon={Bot} label="Active Agents" value={agents.length} sub="Scout, Dev, Growth, Acct" color="bg-purple-500/10 text-purple-400" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="glass-card rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2"><Rocket className="w-5 h-5 text-blue-400" /> Portfolio</h2>
            <Link to="/venture/apps" className="text-xs text-primary hover:underline">View all</Link>
          </div>
          {recentApps.length === 0 ? <p className="text-sm text-muted-foreground text-center py-8">No apps yet.</p> : (
            <div className="space-y-2">
              {recentApps.map(app => (
                <div key={app.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border/30">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{app.name}</p>
                    <p className="text-xs text-muted-foreground">{app.niche || app.keyword} • {app.days_live}d live</p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-right"><p className="text-sm font-semibold text-foreground">${(app.mrr || 0).toLocaleString()}</p><p className="text-xs text-muted-foreground">MRR</p></div>
                    <Badge className={`text-xs ${statusColors[app.status] || ""}`}>{app.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="glass-card rounded-xl p-6">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-4"><Bot className="w-5 h-5 text-purple-400" /> Agent Roster</h2>
          {agents.length === 0 ? <p className="text-sm text-muted-foreground text-center py-8">No agents.</p> : (
            <div className="space-y-2">
              {agents.map(agent => (
                <div key={agent.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border/30">
                  <div><p className="text-sm font-medium text-foreground">{agent.name}</p><p className="text-xs text-muted-foreground capitalize">{agent.agent_type}</p></div>
                  <div className="flex items-center gap-3">
                    <div className="text-right"><p className="text-xs text-muted-foreground">{agent.execution_count || 0} runs</p><p className="text-xs text-muted-foreground">{agent.success_rate || 100}% success</p></div>
                    <Badge variant="outline" className="text-xs">{agent.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}