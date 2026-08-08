import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Sparkles, Image, FolderKanban, Globe,
  Search, Shield, Settings, ChevronLeft, ChevronRight,
  Wand2, Bot, X, Network, Brain,
  Plug, Activity, Megaphone, Users, Briefcase, Workflow, FileText
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { base44 } from '@/api/base44Client';

function useMeshUnreadCount() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    base44.entities.MeshInbox.filter({ status: 'unread' }, '-received_at', 100)
      .then(rows => setCount((rows || []).length))
      .catch(() => {});
    const unsub = base44.entities.MeshInbox.subscribe((event) => {
      if (event.type === 'create' && event.data?.status === 'unread') setCount(c => c + 1);
      if (event.type === 'update' && event.data?.status !== 'unread') {
        base44.entities.MeshInbox.filter({ status: 'unread' }, '-received_at', 100)
          .then(rows => setCount((rows || []).length))
          .catch(() => {});
      }
    });
    return unsub;
  }, []);
  return count;
}

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/content', icon: Sparkles, label: 'Content Studio' },
  { path: '/media', icon: Image, label: 'Media Library' },
  { path: '/projects', icon: FolderKanban, label: 'Projects' },
  { path: '/seo', icon: Search, label: 'SEO & Analytics' },
  { path: '/accessibility', icon: Shield, label: 'Accessibility' },
  { path: '/localization', icon: Globe, label: 'Localization' },
  { path: '/agents', icon: Bot, label: 'AI Assistant' },
  { path: '/integration-hub', icon: Plug, label: 'Integrations' },
  { path: '/workflow-monitor', icon: Activity, label: 'Workflows' },
  { path: '/campaign-planner', icon: Megaphone, label: 'Campaigns' },
  { path: '/agent-directory', icon: Users, label: 'Agent Directory' },
  { path: '/freelance-ledger', icon: Briefcase, label: 'Freelance Ledger' },
  { path: '/agent-blueprint', icon: Workflow, label: 'Agent Blueprint' },
  { path: '/prompt-library', icon: FileText, label: 'Prompt Library' },
  { path: '/riley', icon: Sparkles, label: 'Riley', gold: true },
  { path: '/forge', icon: Wand2, label: 'Riley Forge', gold: true },
  { path: '/mesh', icon: Network, label: '🪐 The Mesh', cyan: true },
  { path: '/continuity', icon: Brain, label: '✦ Continuity Engine', gold: true },
  { path: '/settings', icon: Settings, label: 'Settings' },
];

function NavLinks({ collapsed, onNavClick }) {
  const location = useLocation();
  const meshUnread = useMeshUnreadCount();
  return (
    <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
      {navItems.map(item => {
        const active = location.pathname === item.path ||
          (item.path !== '/' && location.pathname.startsWith(item.path));
        const isMesh = item.path === '/mesh';
        return (
          <Link
            key={item.path}
            to={item.path}
            onClick={onNavClick}
            className={cn(
              "flex items-center gap-3 px-3 rounded-lg text-sm font-medium transition-all duration-200 min-h-[44px]",
              item.gold
                ? active ? "text-yellow-300 shadow-lg" : "text-yellow-600 hover:text-yellow-400"
                : item.cyan
                  ? active ? "text-cyan-300" : "text-cyan-600 hover:text-cyan-400"
                  : active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-lg shadow-primary/20"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            )}
            style={
              item.gold && active ? { background: 'linear-gradient(135deg, #C9A84C22, #8B691410)', border: '1px solid #C9A84C44' }
              : item.cyan && active ? { background: 'rgba(34,211,238,0.08)', border: '1px solid rgba(34,211,238,0.3)' }
              : {}
            }
          >
            <item.icon className="w-5 h-5 shrink-0" />
            {!collapsed && <span className="flex-1">{item.label}</span>}
            {isMesh && meshUnread > 0 && (
              <span style={{
                background: '#6d28d9', color: '#c4b5fd', border: '1px solid #7c3aed',
                padding: '1px 7px', borderRadius: 20, fontSize: 10, fontWeight: 700,
                flexShrink: 0,
              }}>
                {meshUnread}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

// Desktop sidebar (md+)
export function DesktopSidebar({ collapsed, setCollapsed }) {
  return (
    <aside className={cn(
      "hidden md:flex fixed left-0 top-0 h-screen bg-sidebar border-r border-sidebar-border z-50 flex-col transition-all duration-300",
      collapsed ? "w-16" : "w-60"
    )}>
      <div className="flex items-center gap-3 px-4 h-16 border-b border-sidebar-border shrink-0">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
          <Wand2 className="w-4 h-4 text-primary-foreground" />
        </div>
        {!collapsed && (
          <span className="font-bold text-sidebar-accent-foreground text-lg tracking-tight">
            Genera<span className="text-primary">AI</span>
          </span>
        )}
      </div>
      <NavLinks collapsed={collapsed} />
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-center h-12 border-t border-sidebar-border text-sidebar-foreground hover:text-sidebar-accent-foreground transition-colors"
      >
        {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>
    </aside>
  );
}

// Mobile drawer
export function MobileDrawer({ open, onClose }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 md:hidden">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} aria-hidden="true" />
      {/* Drawer */}
      <aside className="absolute left-0 top-0 h-full w-72 max-w-[85vw] bg-sidebar border-r border-sidebar-border flex flex-col">
        <div className="flex items-center justify-between px-4 h-16 border-b border-sidebar-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
              <Wand2 className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-sidebar-accent-foreground text-lg tracking-tight">
              Genera<span className="text-primary">AI</span>
            </span>
          </div>
          <button
            onClick={onClose}
            aria-label="Close navigation menu"
            className="flex items-center justify-center w-11 h-11 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <NavLinks collapsed={false} onNavClick={onClose} />
      </aside>
    </div>
  );
}

// Default export for backward compat — not used when AppLayout controls state
export default function Sidebar() {
  const [collapsed, setCollapsed] = React.useState(false);
  return <DesktopSidebar collapsed={collapsed} setCollapsed={setCollapsed} />;
}