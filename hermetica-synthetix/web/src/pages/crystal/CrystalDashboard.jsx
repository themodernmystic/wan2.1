import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Package, Users, Radio, ClipboardList, DollarSign, TrendingUp, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

function StatCard({ icon: Icon, label, value, to, color }) {
  return (
    <Link to={to} className="glass-card rounded-xl p-5 hover:border-white/20 transition-all">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}><Icon className="w-5 h-5" /></div>
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </Link>
  );
}

export default function CrystalDashboard() {
  const [stats, setStats] = useState({ products: 0, customers: 0, claims: 0, orders: 0, revenue: 0, pending: 0 });
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => { loadStats(); }, []);

  async function loadStats() {
    try {
      const [products, customers, claims, orders] = await Promise.all([
        base44.entities.CrystalProduct.list(),
        base44.entities.CrystalCustomer.list(),
        base44.entities.LiveSaleClaim.list(),
        base44.entities.CrystalOrder.list(),
      ]);
      const revenue = orders.filter(o => o.payment_status === "paid").reduce((sum, o) => sum + (o.total_amount || 0), 0);
      const pending = orders.filter(o => ["pending", "picking", "packed"].includes(o.fulfilment_status)).length;
      setStats({ products: products.length, customers: customers.length, claims: claims.length, orders: orders.length, revenue, pending });
      setRecentOrders(orders.slice(0, 5));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /></div>;
  if (error) return <div className="glass-card rounded-xl p-8 text-center"><p className="text-destructive text-sm">Error loading dashboard: {error}</p><button onClick={loadStats} className="mt-3 text-xs text-primary underline">Retry</button></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Crystal Live Sales Operations — DEMO ACCEPTANCE TEST</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard icon={Package} label="Products" value={stats.products} to="/crystal/products" color="bg-blue-500/10 text-blue-400" />
        <StatCard icon={Users} label="Customers" value={stats.customers} to="/crystal/customers" color="bg-purple-500/10 text-purple-400" />
        <StatCard icon={Radio} label="Live Claims" value={stats.claims} to="/crystal/live-sale" color="bg-amber-500/10 text-amber-400" />
        <StatCard icon={ClipboardList} label="Orders" value={stats.orders} to="/crystal/orders" color="bg-green-500/10 text-green-400" />
        <StatCard icon={DollarSign} label="Revenue (Paid)" value={`$${stats.revenue.toFixed(2)}`} to="/crystal/analytics" color="bg-emerald-500/10 text-emerald-400" />
        <StatCard icon={Clock} label="Pending Fulfilment" value={stats.pending} to="/crystal/fulfilment" color="bg-orange-500/10 text-orange-400" />
      </div>

      <div className="glass-card rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2"><TrendingUp className="w-5 h-5 text-blue-400" /> Recent Orders</h2>
          <Link to="/crystal/orders" className="text-xs text-primary hover:underline">View all</Link>
        </div>
        {recentOrders.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No orders yet.</p>
        ) : (
          <div className="space-y-2">
            {recentOrders.map(order => (
              <div key={order.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border/30">
                <div>
                  <p className="text-sm font-medium text-foreground">{order.customer_name}</p>
                  <p className="text-xs text-muted-foreground">${order.total_amount?.toFixed(2)} • {new Date(order.order_date).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">{order.status}</Badge>
                  <Badge variant="outline" className="text-xs">{order.payment_status}</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}