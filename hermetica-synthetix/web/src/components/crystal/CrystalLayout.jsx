import React, { useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { LayoutDashboard, Package, Users, Radio, ShoppingCart, ClipboardList, Truck, MessageSquare, BarChart3, Settings, Menu, X, ArrowLeft, AlertCircle } from "lucide-react";

const navItems = [
  { path: "/crystal", label: "Dashboard", icon: LayoutDashboard },
  { path: "/crystal/products", label: "Products", icon: Package },
  { path: "/crystal/customers", label: "Customers", icon: Users },
  { path: "/crystal/live-sale", label: "Live Sale", icon: Radio },
  { path: "/crystal/baskets", label: "Baskets", icon: ShoppingCart },
  { path: "/crystal/orders", label: "Orders", icon: ClipboardList },
  { path: "/crystal/fulfilment", label: "Fulfilment", icon: Truck },
  { path: "/crystal/messages", label: "Messages", icon: MessageSquare },
  { path: "/crystal/analytics", label: "Analytics", icon: BarChart3 },
  { path: "/crystal/settings", label: "Settings", icon: Settings },
];

export default function CrystalLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background flex">
      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      <aside className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-sidebar-background border-r border-sidebar-border flex flex-col transition-transform ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
        <div className="p-4 border-b border-sidebar-border flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-foreground">💎 Crystal Live</h1>
            <p className="text-[10px] text-amber-400 font-semibold uppercase tracking-wider">Legacy Demo Module</p>
          </div>
          <button className="lg:hidden text-muted-foreground" onClick={() => setSidebarOpen(false)}><X className="w-5 h-5" /></button>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map(item => {
            const Icon = item.icon;
            const active = location.pathname === item.path;
            return (
              <Link key={item.path} to={item.path} onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${active ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : "text-sidebar-foreground hover:bg-sidebar-accent/50"}`}>
                <Icon className="w-4 h-4" /> {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-sidebar-border">
          <Link to="/" className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-sidebar-accent/50">
            <ArrowLeft className="w-4 h-4" /> Back to Forge
          </Link>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <p className="text-xs text-amber-200">⚠️ LEGACY DEMO MODULE — All data is simulated acceptance-test data. No real orders, payments, or fulfilments. Reclassified as legacy demonstration. Use the Sovereign Forge for truthful governed workflows.</p>
        </div>
        <header className="lg:hidden p-4 border-b border-border flex items-center gap-3">
          <button onClick={() => setSidebarOpen(true)} className="text-muted-foreground"><Menu className="w-5 h-5" /></button>
          <span className="font-semibold">Crystal Live Sales</span>
        </header>
        <main className="flex-1 p-4 lg:p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}