"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminLayout } from "@/components/layout/admin-layout";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  ShoppingCart,
  DollarSign,
  Store,
} from "lucide-react";
import { useUser, useStableMemo, useCollection } from "@/supabase";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

const COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6"];

function computeTrend(data: number[], currentValue: number): string {
  if (data.length < 2) return "0";
  const prevValue = data[data.length - 2];
  if (prevValue === 0) return currentValue > 0 ? "+100" : "0";
  const change = ((currentValue - prevValue) / prevValue) * 100;
  return (change >= 0 ? "+" : "") + change.toFixed(1);
}

export default function AdminAnalyticsPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { isAdmin, isAdminLoading } = useIsAdmin();

  useEffect(() => {
    if (!isAdminLoading && !isAdmin) {
      router.push("/admin");
    }
  }, [isAdmin, isAdminLoading, router]);

  const ordersConfig = useStableMemo(() => {
    if (!user || !isAdmin) return null;
    return { table: "bookings" };
  }, [user, isAdmin]);
  const { data: allOrders, isLoading: ordersLoading } =
    useCollection(ordersConfig);

  const usersConfig = useStableMemo(() => {
    if (!user || !isAdmin) return null;
    return { table: "users" };
  }, [user, isAdmin]);
  const { data: allUsers, isLoading: usersLoading } =
    useCollection(usersConfig);

  const productsConfig = useStableMemo(() => {
    if (!user || !isAdmin) return null;
    return { table: "facilities" };
  }, [user, isAdmin]);
  const { data: allProducts, isLoading: productsLoading } =
    useCollection(productsConfig);

  const storesConfig = useStableMemo(() => {
    if (!user || !isAdmin) return null;
    return { table: "stores" };
  }, [user, isAdmin]);
  const { data: allStores, isLoading: storesLoading } =
    useCollection(storesConfig);

  // Compute monthly revenue data
  const monthlyRevenue = useStableMemo(() => {
    if (!allOrders) return [];
    const map: Record<string, number> = {};
    (allOrders as any[]).forEach((o) => {
      const d = new Date(o.createdAt || o.bookingDate);
      if (isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      map[key] = (map[key] || 0) + (Number(o.totalPrice) || 0);
    });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => {
        const [year, month] = key.split("-");
        const monthNames = [
          "Jan",
          "Feb",
          "Mar",
          "Apr",
          "May",
          "Jun",
          "Jul",
          "Aug",
          "Sep",
          "Oct",
          "Nov",
          "Dec",
        ];
        return {
          name: `${monthNames[parseInt(month) - 1]} ${year}`,
          revenue: value,
        };
      });
  }, [allOrders]);

  // Category breakdown
  const categoryData = useStableMemo(() => {
    if (!allProducts) return [];
    const map: Record<string, number> = {};
    (allProducts as any[]).forEach((p) => {
      const cat = p.category || p.type || "Other";
      map[cat] = (map[cat] || 0) + 1;
    });
    return Object.entries(map)
      .sort(([, a], [, b]) => b - a)
      .map(([name, count]) => ({ name, count }));
  }, [allProducts]);

  // Order status breakdown
  const statusData = useStableMemo(() => {
    if (!allOrders) return [];
    const map: Record<string, number> = {};
    (allOrders as any[]).forEach((o) => {
      const s = o.status || "Unknown";
      map[s] = (map[s] || 0) + 1;
    });
    return Object.entries(map)
      .sort(([, a], [, b]) => b - a)
      .map(([name, value]) => ({ name, value }));
  }, [allOrders]);

  // Top sellers
  const topSellers = useStableMemo(() => {
    if (!allOrders || !allStores) return [];
    const storeRevenue: Record<string, number> = {};
    const storeOrders: Record<string, number> = {};
    (allOrders as any[]).forEach((o) => {
      const sid = o.sellerId || o.storeId;
      if (!sid) return;
      storeRevenue[sid] =
        (storeRevenue[sid] || 0) + (Number(o.totalPrice) || 0);
      storeOrders[sid] = (storeOrders[sid] || 0) + 1;
    });
    return Object.entries(storeRevenue)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([id, revenue]) => {
        const store = (allStores as any[]).find((s) => s.id === id);
        return {
          name: store?.storeName || store?.name || id.slice(0, 8),
          revenue,
          orders: storeOrders[id] || 0,
        };
      });
  }, [allOrders, allStores]);

  // Compute trend stats with real data
  const totalRevenue = (allOrders ?? []).reduce(
    (s: number, o: any) => s + (Number(o.totalPrice) || 0),
    0,
  );
  const totalUsers = allUsers?.length ?? 0;
  const totalOrders = allOrders?.length ?? 0;
  const totalProducts = allProducts?.length ?? 0;

  // Monthly aggregates for trend computation
  const monthlyOrderCounts = useStableMemo(() => {
    if (!allOrders) return [];
    const map: Record<string, number> = {};
    (allOrders as any[]).forEach((o) => {
      const d = new Date(o.createdAt || o.bookingDate);
      if (isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      map[key] = (map[key] || 0) + 1;
    });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => v);
  }, [allOrders]);

  const monthlyRevenueValues = monthlyRevenue.map((m) => m.revenue);

  const monthlyUserCounts = useStableMemo(() => {
    if (!allUsers) return [];
    const map: Record<string, number> = {};
    (allUsers as any[]).forEach((u: any) => {
      const d = new Date(u.createdAt);
      if (isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      map[key] = (map[key] || 0) + 1;
    });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => v);
  }, [allUsers]);

  const revenueTrend = computeTrend(
    monthlyRevenueValues,
    monthlyRevenueValues.length > 0
      ? monthlyRevenueValues[monthlyRevenueValues.length - 1]
      : 0,
  );
  const orderTrend = computeTrend(
    monthlyOrderCounts,
    monthlyOrderCounts.length > 0
      ? monthlyOrderCounts[monthlyOrderCounts.length - 1]
      : 0,
  );
  const userTrend = computeTrend(
    monthlyUserCounts,
    monthlyUserCounts.length > 0
      ? monthlyUserCounts[monthlyUserCounts.length - 1]
      : 0,
  );

  if (isAdminLoading || !isAdmin) return null;

  const isLoading =
    ordersLoading || usersLoading || productsLoading || storesLoading;

  const statsCards = [
    {
      title: "Total Revenue",
      value: `₱${totalRevenue.toLocaleString()}`,
      trend: revenueTrend,
      icon: DollarSign,
      color: "text-green-600 bg-green-50 dark:bg-green-500/10",
    },
    {
      title: "Orders",
      value: totalOrders.toLocaleString(),
      trend: orderTrend,
      icon: ShoppingCart,
      color: "text-blue-600 bg-blue-50 dark:bg-blue-500/10",
    },
    {
      title: "Users",
      value: totalUsers.toLocaleString(),
      trend: userTrend,
      icon: Users,
      color: "text-purple-600 bg-purple-50 dark:bg-purple-500/10",
    },
    {
      title: "Products",
      value: totalProducts.toLocaleString(),
      trend: "0",
      icon: Store,
      color: "text-orange-600 bg-orange-50 dark:bg-orange-500/10",
    },
  ];

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto p-6 md:p-8 w-full pt-6 md:pt-32 pb-24 space-y-8 md:space-y-10">
        {/* Header */}
        <div>
          <h1 className="text-2xl md:text-3xl font-normal font-headline tracking-[-0.05em] text-black dark:text-white">
            Analytics
          </h1>
          <p className="text-sm text-muted-foreground font-normal">
            Platform performance and insights
          </p>
        </div>

        {/* Stats Cards */}
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="rounded-[24px] border border-black/[0.02] bg-white dark:bg-white/[0.03] p-5"
              >
                <Skeleton className="h-10 w-10 rounded-full mb-3" />
                <Skeleton className="h-3 w-16 rounded-full mb-2" />
                <Skeleton className="h-7 w-20 rounded-full" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {statsCards.map((card) => {
              const Icon = card.icon;
              const isPositive =
                card.trend.startsWith("+") || card.trend === "0";
              return (
                <Card
                  key={card.title}
                  className="shadow-[0_12px_40px_rgba(0,0,0,0.03)] border border-black/[0.02] rounded-[24px] bg-white dark:bg-white/[0.03]"
                >
                  <CardContent className="p-5">
                    <div
                      className={`inline-flex p-2.5 rounded-2xl ${card.color} mb-3`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <p className="text-xs text-muted-foreground font-medium mb-0.5">
                      {card.title}
                    </p>
                    <p className="text-xl md:text-2xl font-normal font-headline tracking-[-0.05em]">
                      {card.value}
                    </p>
                    <div className="flex items-center gap-1 mt-1.5">
                      {isPositive ? (
                        <TrendingUp className="h-3 w-3 text-green-500" />
                      ) : (
                        <TrendingDown className="h-3 w-3 text-red-500" />
                      )}
                      <span
                        className={`text-xs font-medium ${isPositive ? "text-green-600" : "text-red-600"}`}
                      >
                        {card.trend}%
                      </span>
                      <span className="text-xs text-muted-foreground ml-0.5">
                        vs last month
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Revenue Chart */}
        <Card className="shadow-[0_20px_50px_rgba(0,0,0,0.04)] border border-black/[0.02] rounded-[32px] bg-white dark:bg-white/[0.03]">
          <CardContent className="p-6 md:p-8">
            <h3 className="text-lg font-medium font-headline tracking-[-0.02em] mb-6">
              Revenue Trends
            </h3>
            {isLoading ? (
              <Skeleton className="h-[260px] w-full rounded-xl" />
            ) : monthlyRevenue.length === 0 ? (
              <div className="h-[260px] flex items-center justify-center text-muted-foreground text-sm">
                No revenue data yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={monthlyRevenue}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(0,0,0,0.05)"
                  />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) =>
                      `₱${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`
                    }
                  />
                  <Tooltip
                    formatter={(v: any) => [
                      `₱${Number(v).toLocaleString()}`,
                      "Revenue",
                    ]}
                    contentStyle={{
                      borderRadius: "16px",
                      border: "1px solid rgba(0,0,0,0.05)",
                      fontSize: "12px",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#22c55e"
                    fill="#22c55e"
                    fillOpacity={0.1}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Category Breakdown */}
          <Card className="shadow-[0_20px_50px_rgba(0,0,0,0.04)] border border-black/[0.02] rounded-[32px] bg-white dark:bg-white/[0.03]">
            <CardContent className="p-6 md:p-8">
              <h3 className="text-lg font-medium font-headline tracking-[-0.02em] mb-6">
                Product Categories
              </h3>
              {isLoading ? (
                <Skeleton className="h-[220px] w-full rounded-xl" />
              ) : categoryData.length === 0 ? (
                <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">
                  No product data yet
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={categoryData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(0,0,0,0.05)"
                    />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 10, fill: "#94a3b8" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "#94a3b8" }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: "16px",
                        border: "1px solid rgba(0,0,0,0.05)",
                        fontSize: "12px",
                      }}
                    />
                    <Bar dataKey="count" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Order Status Pie */}
          <Card className="shadow-[0_20px_50px_rgba(0,0,0,0.04)] border border-black/[0.02] rounded-[32px] bg-white dark:bg-white/[0.03]">
            <CardContent className="p-6 md:p-8">
              <h3 className="text-lg font-medium font-headline tracking-[-0.02em] mb-6">
                Order Status
              </h3>
              {isLoading ? (
                <Skeleton className="h-[220px] w-full rounded-xl" />
              ) : statusData.length === 0 ? (
                <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">
                  No order data yet
                </div>
              ) : (
                <div className="flex items-center gap-6">
                  <ResponsiveContainer width="50%" height={220}>
                    <PieChart>
                      <Pie
                        data={statusData}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="value"
                        labelLine={false}
                      >
                        {statusData.map((_, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          borderRadius: "16px",
                          border: "1px solid rgba(0,0,0,0.05)",
                          fontSize: "12px",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2">
                    {statusData.map((entry, idx) => (
                      <div
                        key={entry.name}
                        className="flex items-center gap-2 text-xs"
                      >
                        <div
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{
                            backgroundColor: COLORS[idx % COLORS.length],
                          }}
                        />
                        <span className="text-muted-foreground">
                          {entry.name}
                        </span>
                        <span className="font-medium ml-auto">
                          {entry.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Top Sellers */}
        <Card className="shadow-[0_20px_50px_rgba(0,0,0,0.04)] border border-black/[0.02] rounded-[32px] bg-white dark:bg-white/[0.03]">
          <CardContent className="p-6 md:p-8">
            <h3 className="text-lg font-medium font-headline tracking-[-0.02em] mb-6">
              Top Sellers
            </h3>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <Skeleton className="h-4 w-32 rounded-full" />
                    <Skeleton className="h-4 w-20 rounded-full" />
                  </div>
                ))}
              </div>
            ) : topSellers.length === 0 ? (
              <div className="h-32 flex items-center justify-center text-muted-foreground text-sm">
                No seller data yet
              </div>
            ) : (
              <div className="space-y-3">
                {topSellers.map((seller, idx) => (
                  <div
                    key={seller.name}
                    className="flex items-center justify-between py-2 border-b border-black/[0.03] last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center text-xs font-bold">
                        {idx + 1}
                      </div>
                      <span className="text-sm font-medium">{seller.name}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-muted-foreground">
                        {seller.orders} orders
                      </span>
                      <span className="font-medium">
                        ₱{seller.revenue.toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
