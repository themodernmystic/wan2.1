import React, { useState } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import {
  LayoutDashboard, Rocket, FlaskConical, Bot, Brain,
  ListTodo, Settings, LogOut, Menu, X, ChevronRight, Zap,
  Shield, GitBranch, FileCheck, ClipboardCheck, Gem
} from "lucide-react";
import { Button } from "@/components/ui/button";

const navItems = [
  { section: "Sovereign Forge" },
  { label: "Control Centre", path: "/ops", icon: Shield },
  { label: "Ventures", path: "/ops/ventures", icon: Rocket },
  { label: "Approvals", path: "/ops/approvals", icon: GitBranch },
  { label: "Evidence", path: "/ops/evidence", icon: FileCheck },
  { label: "Remediation", path: "/ops/remediation", icon: ClipboardCheck },
  { section: "Legacy Tools" },
  { label: "Command Center", path: "/hermetica", icon: LayoutDashboard },
  { label: "Projects", path: "/hermetica/projects", icon: Rocket },
  { label: "Validation Lab", path: "/hermetica/validate", icon: FlaskConical },
  { label: "Agent Workshop", path: "/hermetica/agents", icon: Bot },
  { label: "Knowledge Base", path: "/hermetica/knowledge", icon: Brain },
  { label: "Task Board", path: "/hermetica/tasks", icon: ListTodo },
  { section: "Demonstrations" },
  { label: "Crystal Platform", path: "/crystal", icon: Gem },
  { label: "Venture Studio", path: "/venture", icon: Zap },
];

export default function HermeticaAppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const handleLogout = () => {
    base44.auth.logout("/login");
  };

  const NavContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-4 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-amber-400 flex items-center justify-center flex-shrink-0">
          <Zap className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <h1 className="text-sm font-bold tracking-wide text-foreground truncate">HERMETICA</h1>
            <p className="text-[10px] font-medium text-muted-foreground tracking-widest">FORGE</p>
          </div>
        )}
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item, idx) => {
          if (item.section) {
            return !collapsed && (
              <div key={`section-${idx}`} className="px-3 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
                {item.section}
              </div>
            );
          }
          const isActive = location.pathname === item.path || 
            (item.path !== "/" && location.pathname.startsWith(item.path));
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group
                ${isActive
                  ? "bg-primary/10 text-primary glow-blue"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                }`}
            >
              <item.icon className={`w-4.5 h-4.5 flex-shrink-0 ${isActive ? "text-primary" : ""}`} />
              {!collapsed && <span className="truncate">{item.label}</span>}
              {!collapsed && isActive && <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-60" />}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-border/50">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all w-full"
        >
          <LogOut className="w-4.5 h-4.5" />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <aside className={`hidden lg:flex flex-col border-r border-border/50 bg-card/30 backdrop-blur-sm transition-all duration-300 ${collapsed ? "w-16" : "w-60"}`}>
        <NavContent />
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute top-5 -right-3 w-6 h-6 rounded-full bg-secondary border border-border flex items-center justify-center text-muted-foreground hover:text-foreground z-50 hidden lg:flex"
          style={{ left: collapsed ? "52px" : "228px" }}
        >
          <ChevronRight className={`w-3 h-3 transition-transform ${collapsed ? "" : "rotate-180"}`} />
        </button>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 h-14 bg-card/80 backdrop-blur-xl border-b border-border/50 flex items-center px-4">
        <Button variant="ghost" size="icon" onClick={() => setMobileOpen(true)} className="mr-3">
          <Menu className="w-5 h-5" />
        </Button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-gradient-to-br from-blue-500 to-amber-400 flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-bold tracking-wide">HERMETICA FORGE</span>
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-card border-r border-border/50">
            <div className="absolute top-3 right-3">
              <Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <NavContent />
          </aside>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto lg:pt-0 pt-14">
        <div className="max-w-7xl mx-auto p-4 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}