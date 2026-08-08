import React, { useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { Shield, Rocket, GitBranch, FileCheck, ClipboardCheck, ChevronRight, Zap } from "lucide-react";

const navItems = [
  { path: "/ops", label: "Control Centre", icon: Shield },
  { path: "/ops/ventures", label: "Ventures", icon: Rocket },
  { path: "/ops/approvals", label: "Approvals", icon: GitBranch },
  { path: "/ops/evidence", label: "Evidence", icon: FileCheck },
  { path: "/ops/remediation", label: "Remediation", icon: ClipboardCheck },
];

export default function OpsLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const NavContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-4 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-amber-400 flex items-center justify-center flex-shrink-0">
          <Zap className="w-5 h-5 text-white" />
        </div>
        <div className="overflow-hidden">
          <h1 className="text-sm font-bold tracking-wide text-foreground truncate">SOVEREIGN</h1>
          <p className="text-[10px] font-medium text-amber-400 tracking-widest">FORGE RUNNER</p>
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(item => {
          const isActive = location.pathname === item.path || (item.path !== "/ops" && location.pathname.startsWith(item.path));
          return (
            <Link key={item.path} to={item.path} onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${isActive ? "bg-primary/10 text-primary glow-blue" : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"}`}>
              <item.icon className="w-4.5 h-4.5 flex-shrink-0" />
              <span className="truncate">{item.label}</span>
              {isActive && <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-60" />}
            </Link>
          );
        })}
      </nav>
      <div className="p-3 border-t border-border/50">
        <Link to="/" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50">
          <ChevronRight className="w-4 h-4 rotate-180" /> Back to Forge
        </Link>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <aside className="hidden lg:flex flex-col border-r border-border/50 bg-card/30 backdrop-blur-sm w-60">
        <NavContent />
      </aside>
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 h-14 bg-card/80 backdrop-blur-xl border-b border-border/50 flex items-center px-4">
        <button onClick={() => setMobileOpen(true)} className="mr-3 text-muted-foreground"><Shield className="w-5 h-5" /></button>
        <span className="text-sm font-bold">SOVEREIGN FORGE</span>
      </div>
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-card border-r border-border/50">
            <button onClick={() => setMobileOpen(false)} className="absolute top-3 right-3 text-muted-foreground">✕</button>
            <NavContent />
          </aside>
        </div>
      )}
      <main className="flex-1 overflow-y-auto lg:pt-0 pt-14">
        <div className="max-w-7xl mx-auto p-4 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}