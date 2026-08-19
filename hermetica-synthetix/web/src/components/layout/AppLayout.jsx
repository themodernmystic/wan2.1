import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { DesktopSidebar, MobileDrawer } from './Sidebar';
import IntegrationLimitBanner from '@/components/shared/IntegrationLimitBanner';

export default function AppLayout() {
  const location = useLocation();
  const isHome = location.pathname === '/';
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  if (isHome) {
    return (
      <div className="min-h-screen bg-background overflow-x-hidden flex flex-col">
        <IntegrationLimitBanner />
        <Outlet />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <IntegrationLimitBanner />
      {/* Desktop sidebar */}
      <DesktopSidebar collapsed={collapsed} setCollapsed={setCollapsed} />

      {/* Mobile drawer */}
      <MobileDrawer open={mobileOpen} onClose={() => setMobileOpen(false)} />

      {/* Mobile top bar */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-40 h-14 bg-sidebar border-b border-sidebar-border flex items-center px-4 gap-3">
        <button
          onClick={() => setMobileOpen(true)}
          aria-label="Open navigation menu"
          className="flex items-center justify-center w-11 h-11 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
        <span className="font-bold text-sidebar-accent-foreground text-base tracking-tight">
          Genera<span className="text-primary">AI</span>
        </span>
      </header>

      {/* Main content */}
      <main className={[
        "min-w-0 flex-1 min-h-screen",
        "pt-14 md:pt-0",
        collapsed ? "md:ml-16" : "md:ml-60",
        "transition-all duration-300"
      ].join(' ')}>
        <Outlet />
      </main>
    </div>
  );
}