import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Bot, Search, Rocket, Megaphone, DollarSign, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const agentIcons = { research: Search, builder: Rocket, optimizer: Megaphone, analyst: DollarSign };
const typeColors = { research: "bg-purple-500/10 text-purple-400", builder: "bg-blue-500/10 text-blue-400", optimizer: "bg-amber-500/10 text-amber-400", analyst: "bg-emerald-500/10 text-emerald-400" };

export default function AgentControl() {
  const [agents, setAgents] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [a, m] = await Promise.all([
        base44.entities.ForgeAgent.filter({ project_id: "6a5ade7b596f86a2320f2a10" }),
        base44.entities.AgentMessage.filter({ project_id: "6a5ade7b596f86a2320f2a10" }),
      ]);
      setAgents(a); setMessages(m.sort((x, y) => new Date(y.created_date) - new Date(x.created_date)));
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /></div>;
  if (error) return <div className="glass-card rounded-xl p-8 text-center"><p className="text-destructive text-sm">Error: {error}</p><button onClick={loadData} className="mt-3 text-xs text-primary underline">Retry</button></div>;

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><Bot className="w-6 h-6 text-purple-400" /> Agent Control</h1><p className="text-sm text-muted-foreground mt-1">The 4 venture studio agents and their collaboration</p></div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {agents.map(agent => {
          const Icon = agentIcons[agent.agent_type] || Bot;
          return (
            <div key={agent.id} className="glass-card rounded-xl p-5">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-3 ${typeColors[agent.agent_type] || "bg-secondary text-muted-foreground"}`}><Icon className="w-6 h-6" /></div>
              <h3 className="font-semibold text-foreground text-sm">{agent.name}</h3>
              <p className="text-xs text-muted-foreground capitalize mb-2">{agent.agent_type}</p>
              <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{agent.description}</p>
              <div className="grid grid-cols-2 gap-2 text-center pt-3 border-t border-border/30">
                <div><p className="text-lg font-bold text-foreground">{agent.execution_count || 0}</p><p className="text-xs text-muted-foreground">Runs</p></div>
                <div><p className="text-lg font-bold text-green-400">{agent.success_rate || 100}%</p><p className="text-xs text-muted-foreground">Success</p></div>
              </div>
              <Badge variant="outline" className="text-xs mt-3 w-full justify-center">{agent.status}</Badge>
            </div>
          );
        })}
      </div>

      <div className="glass-card rounded-xl p-6">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-4"><ArrowUpRight className="w-5 h-5 text-blue-400" /> Agent Collaboration Feed</h2>
        {messages.length === 0 ? <p className="text-sm text-muted-foreground text-center py-8">No messages yet.</p> : (
          <div className="space-y-2">
            {messages.map(msg => (
              <div key={msg.id} className={`rounded-lg p-4 flex gap-3 ${msg.message_type === "help_request" ? "bg-amber-500/5 border-l-2 border-l-amber-500/50" : msg.message_type === "handoff" ? "bg-blue-500/5 border-l-2 border-l-blue-500/50" : msg.message_type === "finding" ? "bg-purple-500/5 border-l-2 border-l-purple-500/50" : msg.message_type === "status_update" ? "bg-green-500/5 border-l-2 border-l-green-500/50" : "bg-secondary/20 border-l-2 border-l-border"}`}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-secondary text-muted-foreground">
                  {msg.message_type === "help_request" ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-xs font-medium text-foreground">{msg.from_agent_name}</span>
                    <span className="text-xs text-muted-foreground">→</span>
                    <span className="text-xs font-medium text-foreground">{msg.to_agent_name || "All"}</span>
                    <Badge variant="outline" className="text-xs">{msg.message_type.replace("_", " ")}</Badge>
                    {msg.requires_response && <Badge className="text-xs bg-amber-500/20 text-amber-400">Needs Response</Badge>}
                  </div>
                  <p className="text-xs text-foreground/70">{msg.content}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}