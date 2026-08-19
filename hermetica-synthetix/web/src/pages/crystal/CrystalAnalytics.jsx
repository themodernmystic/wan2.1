import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { BarChart3, TrendingUp, Package, Users } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

export default function CrystalAnalytics() {
  const [data, setData] = useState({ revenueByStatus: [], topProducts: [], customerTiers: [], claimsByStatus: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [products, customers, claims, orders] = await Promise.all([
        base44.entities.CrystalProduct.list(),
        base44.entities.CrystalCustomer.list(),
        base44.entities.LiveSaleClaim.list(),
        base44.entities.CrystalOrder.list(),
      ]);

      // Revenue by order status
      const statusMap = {};
      orders.forEach(o => {
        const status = o.status || "pending";
        if (!statusMap[status]) statusMap[status] = { status: status.replace("_", " "), revenue: 0, count: 0 };
        statusMap[status].revenue += o.total_amount || 0;
        statusMap[status].count += 1;
      });

      // Top products by claims
      const productClaimMap = {};
      claims.forEach(c => {
        const name = c.product_name || "Unknown";
        productClaimMap[name] = (productClaimMap[name] || 0) + 1;
      });
      const topProducts = Object.entries(productClaimMap).map(([name, count]) => ({ name: name.length > 20 ? name.slice(0, 20) + "..." : name, claims: count })).sort((a, b) => b.claims - a.claims).slice(0, 6);

      // Customer tier distribution
      const tierMap = {};
      customers.forEach(c => { tierMap[c.tier || "bronze"] = (tierMap[c.tier || "bronze"] || 0) + 1; });
      const tierColors = { bronze: "#b45309", silver: "#9ca3af", gold: "#eab308", vip: "#a855f7" };
      const customerTiers = Object.entries(tierMap).map(([name, value]) => ({ name, value, fill: tierColors[name] || "#3b82f6" }));

      // Claims by status
      const claimStatusMap = {};
      claims.forEach(c => { claimStatusMap[c.status || "claimed"] = (claimStatusMap[c.status || "claimed"] || 0) + 1; });
      const claimsByStatus = Object.entries(claimStatusMap).map(([name, value]) => ({ name: name.replace("_", " "), value }));

      setData({ revenueByStatus: Object.values(statusMap), topProducts, customerTiers, claimsByStatus });
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /></div>;
  if (error) return <div className="glass-card rounded-xl p-8 text-center"><p className="text-destructive text-sm">Error: {error}</p></div>;

  const totalRevenue = data.revenueByStatus.reduce((s, r) => s + r.revenue, 0);

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><BarChart3 className="w-6 h-6 text-blue-400" /> Analytics</h1><p className="text-sm text-muted-foreground mt-1">Sales insights and performance metrics — DEMO data only</p></div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card rounded-xl p-4"><div className="flex items-center gap-2 mb-2"><TrendingUp className="w-4 h-4 text-emerald-400" /><span className="text-xs text-muted-foreground">Total Revenue</span></div><p className="text-xl font-bold text-foreground">${totalRevenue.toFixed(2)}</p></div>
        <div className="glass-card rounded-xl p-4"><div className="flex items-center gap-2 mb-2"><Package className="w-4 h-4 text-blue-400" /><span className="text-xs text-muted-foreground">Products</span></div><p className="text-xl font-bold text-foreground">{data.topProducts.length}</p></div>
        <div className="glass-card rounded-xl p-4"><div className="flex items-center gap-2 mb-2"><Users className="w-4 h-4 text-purple-400" /><span className="text-xs text-muted-foreground">Customers</span></div><p className="text-xl font-bold text-foreground">{data.customerTiers.reduce((s, t) => s + t.value, 0)}</p></div>
        <div className="glass-card rounded-xl p-4"><div className="flex items-center gap-2 mb-2"><BarChart3 className="w-4 h-4 text-amber-400" /><span className="text-xs text-muted-foreground">Total Claims</span></div><p className="text-xl font-bold text-foreground">{data.claimsByStatus.reduce((s, c) => s + c.value, 0)}</p></div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="glass-card rounded-xl p-6">
          <h3 className="text-sm font-semibold text-foreground mb-4">Revenue by Order Status</h3>
          {data.revenueByStatus.length === 0 ? <p className="text-xs text-muted-foreground text-center py-8">No data</p> : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data.revenueByStatus}><CartesianGrid strokeDasharray="3 3" stroke="hsl(222 30% 16%)" /><XAxis dataKey="status" tick={{ fill: "hsl(215 20% 55%)", fontSize: 11 }} /><YAxis tick={{ fill: "hsl(215 20% 55%)", fontSize: 11 }} /><Tooltip contentStyle={{ background: "hsl(222 44% 8%)", border: "1px solid hsl(222 30% 16%)", borderRadius: "8px" }} /><Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} /></BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="glass-card rounded-xl p-6">
          <h3 className="text-sm font-semibold text-foreground mb-4">Top Products by Claims</h3>
          {data.topProducts.length === 0 ? <p className="text-xs text-muted-foreground text-center py-8">No data</p> : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data.topProducts} layout="vertical"><CartesianGrid strokeDasharray="3 3" stroke="hsl(222 30% 16%)" /><XAxis type="number" tick={{ fill: "hsl(215 20% 55%)", fontSize: 11 }} /><YAxis type="category" dataKey="name" tick={{ fill: "hsl(215 20% 55%)", fontSize: 10 }} width={100} /><Tooltip contentStyle={{ background: "hsl(222 44% 8%)", border: "1px solid hsl(222 30% 16%)", borderRadius: "8px" }} /><Bar dataKey="claims" fill="#eab308" radius={[0, 4, 4, 0]} /></BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="glass-card rounded-xl p-6">
          <h3 className="text-sm font-semibold text-foreground mb-4">Customer Tier Distribution</h3>
          {data.customerTiers.length === 0 ? <p className="text-xs text-muted-foreground text-center py-8">No data</p> : (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart><Pie data={data.customerTiers} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={{ fill: "hsl(215 20% 55%)", fontSize: 11 }}>{data.customerTiers.map((entry, i) => <Cell key={i} fill={entry.fill} />)}</Pie><Tooltip contentStyle={{ background: "hsl(222 44% 8%)", border: "1px solid hsl(222 30% 16%)", borderRadius: "8px" }} /><Legend wrapperStyle={{ fontSize: 11 }} /></PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="glass-card rounded-xl p-6">
          <h3 className="text-sm font-semibold text-foreground mb-4">Claims by Status</h3>
          {data.claimsByStatus.length === 0 ? <p className="text-xs text-muted-foreground text-center py-8">No data</p> : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data.claimsByStatus}><CartesianGrid strokeDasharray="3 3" stroke="hsl(222 30% 16%)" /><XAxis dataKey="name" tick={{ fill: "hsl(215 20% 55%)", fontSize: 11 }} /><YAxis tick={{ fill: "hsl(215 20% 55%)", fontSize: 11 }} /><Tooltip contentStyle={{ background: "hsl(222 44% 8%)", border: "1px solid hsl(222 30% 16%)", borderRadius: "8px" }} /><Bar dataKey="value" fill="#22c55e" radius={[4, 4, 0, 0]} /></BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}