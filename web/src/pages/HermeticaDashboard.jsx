import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { Rocket, Bot, Brain, FlaskConical, ListTodo, ArrowRight, Activity, TrendingUp, Zap, Plus, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import StatCard from "@/components/shared/HermeticaStatCard";
import StatusBadge from "@/components/shared/StatusBadge";
import PageHeader from "@/components/shared/HermeticaPageHeader";
import ValidationScoreChart from "@/components/dashboard/ValidationScoreChart";
import MarketSizeFunnel from "@/components/dashboard/MarketSizeFunnel";
import DriveStatusBanner from "@/components/shared/DriveStatusBanner";
import { motion } from "framer-motion";

export default function Dashboard() {
  const [projects, setProjects] = useState([]);
  const [reports, setReports] = useState([]);
  const [agents, setAgents] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [p, r, a, t, act] = await Promise.all([
        base44.entities.Project.list("-created_date", 10),
        base44.entities.ValidationReport.list("-created_date", 5),
        base44.entities.ForgeAgent.list("-created_date", 10),
        base44.entities.ProjectTask.list("-created_date", 10),
        base44.entities.ActivityLog.list("-created_date", 8),
      ]);
      setProjects(p);
      setReports(r);
      setAgents(a);
      setTasks(t);
      setActivity(act);
      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const activeProjects = projects.filter(p => !["archived", "live"].includes(p.status));
  const completedTasks = tasks.filter(t => t.status === "done").length;
  const avgScore = reports.filter(r => r.overall_score).reduce((a, r) => a + r.overall_score, 0) / (reports.filter(r => r.overall_score).length || 1);

  return (
    <div>
      <PageHeader
        title="Command Center"
        subtitle="Your Hermetica Forge overview"
        actions={
          <Link to="/hermetica/projects">
            <Button className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white gap-2">
              <Plus className="w-4 h-4" /> New Project
            </Button>
          </Link>
        }
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
          <StatCard label="Active Projects" value={activeProjects.length} icon={Rocket} color="blue" />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <StatCard label="Validations" value={reports.length} icon={FlaskConical} color="gold" />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <StatCard label="Active Agents" value={agents.filter(a => a.status === "active").length} icon={Bot} color="purple" />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <StatCard label="Tasks Done" value={completedTasks} icon={ListTodo} color="green" />
        </motion.div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Projects */}
        <div className="lg:col-span-2 glass-card rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border/50 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Rocket className="w-4 h-4 text-primary" /> Recent Projects
            </h2>
            <Link to="/hermetica/projects" className="text-xs text-primary hover:underline flex items-center gap-1">
              View All <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {projects.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No projects yet. Start by creating your first project.
            </div>
          ) : (
            <div className="divide-y divide-border/30">
              {projects.slice(0, 5).map((project) => (
                <Link
                  key={project.id}
                  to={`/hermetica/projects/${project.id}`}
                  className="flex items-center justify-between px-5 py-3.5 hover:bg-secondary/30 transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Rocket className="w-4 h-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{project.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{project.category?.replace(/_/g, " ")}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={project.status} />
                    {project.validation_score && (
                      <span className="text-xs font-mono text-primary">{project.validation_score}%</span>
                    )}
                    <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Activity Feed */}
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border/50">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Activity className="w-4 h-4 text-amber-400" /> Activity Feed
            </h2>
          </div>
          {activity.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No activity yet. Your actions will appear here.
            </div>
          ) : (
            <div className="divide-y divide-border/30 max-h-80 overflow-y-auto">
              {activity.map((log) => (
                <div key={log.id} className="px-5 py-3">
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-foreground">{log.action}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{log.details}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <DriveStatusBanner />

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border/50">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" /> Validation Scores
              {projects.filter(p => p.validation_score != null).length > 0 ? (
                <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full ml-auto">Live</span>
              ) : (
                <span className="text-[10px] text-muted-foreground bg-secondary px-2 py-0.5 rounded-full ml-auto">No data</span>
              )}
            </h2>
          </div>
          <div className="p-4">
            <ValidationScoreChart projects={projects} />
          </div>
        </div>
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border/50">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Target className="w-4 h-4 text-amber-400" /> Market Sizing (TAM / SAM / SOM)
              {projects.filter(p => p.market_size_tam || p.market_size_sam || p.market_size_som).length > 0 ? (
                <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full ml-auto">Live</span>
              ) : (
                <span className="text-[10px] text-muted-foreground bg-secondary px-2 py-0.5 rounded-full ml-auto">No data</span>
              )}
            </h2>
          </div>
          <div className="p-4">
            <MarketSizeFunnel projects={projects} />
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Validate Idea", icon: FlaskConical, path: "/validate", color: "from-amber-500/10 to-amber-600/5" },
          { label: "Create Agent", icon: Bot, path: "/agents", color: "from-purple-500/10 to-purple-600/5" },
          { label: "Add Knowledge", icon: Brain, path: "/knowledge", color: "from-emerald-500/10 to-emerald-600/5" },
          { label: "View Tasks", icon: ListTodo, path: "/tasks", color: "from-blue-500/10 to-blue-600/5" },
        ].map((action) => (
          <Link
            key={action.path}
            to={action.path}
            className={`glass-card rounded-xl p-4 hover:border-white/10 transition-all duration-300 group bg-gradient-to-br ${action.color}`}
          >
            <action.icon className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors mb-2" />
            <p className="text-sm font-medium text-foreground">{action.label}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}