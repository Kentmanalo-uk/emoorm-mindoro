"use client";

import React, { useMemo } from "react";
import { SellerLayout } from "@/components/layout/seller-layout";
import {
  DollarSign,
  ShoppingCart,
  Package,
  Users,
  TrendingUp,
} from "lucide-react";
import { useSupabaseAuth, useStableMemo, useCollection } from "@/supabase";
import { Skeleton } from "@/components/ui/skeleton";

export default function SellerAnalyticsPage() {
  const { user } = useSupabaseAuth();

  const productsConfig = useStableMemo(() => {
    if (!user) return null;
    return {
      table: "facilities",
      filters: [{ column: "sellerId", op: "eq" as const, value: user.uid }],
    };
  }, [user]);
  const { data: products, isLoading: productsLoading } =
    useCollection(productsConfig);

  const ordersConfig = useStableMemo(() => {
    if (!user) return null;
    return {
      table: "bookings",
      filters: [{ column: "storeId", op: "eq" as const, value: user.uid }],
      order: { column: "createdAt", ascending: false },
    };
  }, [user]);
  const { data: orders, isLoading: ordersLoading } =
    useCollection(ordersConfig);

  const reviewsConfig = useStableMemo(() => {
    if (!user) return null;
    return {
      table: "reviews",
      filters: [{ column: "storeId", op: "eq" as const, value: user.uid }],
    };
  }, [user]);
  const { data: reviews } = useCollection(reviewsConfig);

  const isLoading = productsLoading || ordersLoading;
  const allOrders = orders ?? [];
  const allProducts = products ?? [];
  const allReviews = reviews ?? [];

  const totalRevenue = allOrders.reduce(
    (sum, o: any) => sum + (Number(o.totalPrice) || 0),
    0,
  );
  const totalOrders = allOrders.length;
  const totalProducts = allProducts.length;
  const uniqueCustomers = new Set(allOrders.map((o: any) => o.userId)).size;
  const completedOrders = allOrders.filter(
    (o: any) => o.status === "Completed" || o.status === "completed",
  ).length;
  const avgRating =
    allReviews.length > 0
      ? (
          allReviews.reduce(
            (s: number, r: any) => s + (Number(r.rating) || 5),
            0,
          ) / allReviews.length
        ).toFixed(1)
      : "5.0";

  const stats = [
    {
      label: "Total Revenue",
      value: `₱${totalRevenue.toLocaleString()}`,
      icon: DollarSign,
      color: "#29a366",
      bg: "#f0faf5",
      sub: "All-time",
    },
    {
      label: "Total Orders",
      value: String(totalOrders),
      icon: ShoppingCart,
      color: "#2563eb",
      bg: "#eff6ff",
      sub: `${completedOrders} completed`,
    },
    {
      label: "Products",
      value: String(totalProducts),
      icon: Package,
      color: "#7c3aed",
      bg: "#f5f3ff",
      sub: "Listed",
    },
    {
      label: "Customers",
      value: String(uniqueCustomers),
      icon: Users,
      color: "#ea580c",
      bg: "#fff7ed",
      sub: "Unique buyers",
    },
  ];

  const weeklyRevenue = useMemo(() => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const dayTotals: Record<number, number> = {};
    allOrders.forEach((o: any) => {
      const day = new Date(o.createdAt).getDay();
      dayTotals[day] = (dayTotals[day] || 0) + (Number(o.totalPrice) || 0);
    });
    const maxAmount = Math.max(...Object.values(dayTotals), 1);
    return days.map((name, i) => ({
      day: name,
      amount: dayTotals[i] || 0,
      pct: Math.round(((dayTotals[i] || 0) / maxAmount) * 100),
    }));
  }, [allOrders]);

  const topCategories = useMemo(() => {
    const catMap: Record<string, number> = {};
    allProducts.forEach((p: any) => {
      const cat = p.category || p.type || "Other";
      catMap[cat] = (catMap[cat] || 0) + 1;
    });
    const total = allProducts.length || 1;
    return Object.entries(catMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({
        name,
        count,
        pct: Math.round((count / total) * 100),
      }));
  }, [allProducts]);

  const orderStatusBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    allOrders.forEach((o: any) => {
      const s = o.status || "To Pay";
      map[s] = (map[s] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [allOrders]);

  const recentActivity = useMemo(() => {
    const activities: {
      action: string;
      detail: string;
      time: string;
      date: Date;
    }[] = [];
    allOrders.slice(0, 5).forEach((o: any) => {
      const d = new Date(o.createdAt);
      activities.push({
        action: `Order (${o.status || "To Pay"})`,
        detail: `₱${Number(o.totalPrice || 0).toLocaleString()}`,
        time: d.toLocaleDateString(),
        date: d,
      });
    });
    allReviews.slice(0, 3).forEach((r: any) => {
      const d = new Date(r.createdAt);
      activities.push({
        action: "Product reviewed",
        detail: `⭐ ${r.rating || 5}`,
        time: d.toLocaleDateString(),
        date: d,
      });
    });
    return activities
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 8);
  }, [allOrders, allReviews]);

  return (
    <SellerLayout>
      <div className="max-w-[1280px] mx-auto px-4 md:px-6 pt-6 pb-8 space-y-4">
        {/* Header */}
        <div className="bg-white rounded-xl border border-black/[0.06] px-6 py-5">
          <h1 className="text-lg font-semibold text-[#111]">Shop Analytics</h1>
          <p className="text-sm text-[#888]">
            Track your shop performance and sales data
          </p>
        </div>

        {isLoading ? (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-white rounded-xl border border-black/[0.06] p-5"
                >
                  <Skeleton className="h-9 w-9 rounded-xl mb-4" />
                  <Skeleton className="h-3 w-20 rounded mb-2" />
                  <Skeleton className="h-6 w-16 rounded" />
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="bg-white rounded-xl border border-black/[0.06] p-5"
                >
                  <p className="text-xs text-[#888] mb-0.5">{stat.label}</p>
                  <p className="text-xl font-bold text-[#111]">{stat.value}</p>
                  <p className="text-[11px] text-[#bbb] mt-0.5">{stat.sub}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Revenue by Day chart */}
              <div className="lg:col-span-2 bg-white rounded-xl border border-black/[0.06] p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm font-semibold text-[#111]">
                      Revenue by Day of Week
                    </p>
                    <p className="text-xs text-[#888]">
                      Distribution across all orders
                    </p>
                  </div>
                  <p className="text-base font-bold text-[#111]">
                    ₱{totalRevenue.toLocaleString()}
                  </p>
                </div>
                <div className="flex items-end gap-2 h-36">
                  {weeklyRevenue.map((d) => (
                    <div
                      key={d.day}
                      className="flex-1 flex flex-col items-center gap-1.5"
                    >
                      <span className="text-[10px] text-[#aaa]">
                        {d.amount > 0
                          ? `₱${(d.amount / 1000).toFixed(1)}k`
                          : "—"}
                      </span>
                      <div
                        className="w-full flex flex-col justify-end"
                        style={{ height: "96px" }}
                      >
                        <div
                          className="w-full rounded-t-[3px] transition-all"
                          style={{
                            height: `${Math.max(d.pct, 3)}%`,
                            background: d.pct > 0 ? "#29a366" : "#e8e8e8",
                          }}
                        />
                      </div>
                      <span className="text-[10px] text-[#888]">{d.day}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Order status breakdown */}
              <div className="bg-white rounded-xl border border-black/[0.06] p-5">
                <p className="text-sm font-semibold text-[#111] mb-4">
                  Order Status
                </p>
                {orderStatusBreakdown.length === 0 ? (
                  <p className="text-sm text-[#888] text-center py-8">
                    No orders yet
                  </p>
                ) : (
                  <div className="space-y-3">
                    {orderStatusBreakdown.map(([status, count]) => (
                      <div key={status}>
                        <div className="flex justify-between mb-1">
                          <span className="text-xs text-[#555]">{status}</span>
                          <span className="text-xs font-semibold text-[#111]">
                            {count}
                          </span>
                        </div>
                        <div className="h-1.5 bg-[#f2f2f0] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.round((count / totalOrders) * 100)}%`,
                              background: "#29a366",
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Product Categories */}
              <div className="bg-white rounded-xl border border-black/[0.06] p-5">
                <p className="text-sm font-semibold text-[#111] mb-4">
                  Product Categories
                </p>
                {topCategories.length === 0 ? (
                  <p className="text-sm text-[#888] text-center py-8">
                    No products yet
                  </p>
                ) : (
                  <div className="space-y-3">
                    {topCategories.map((cat, i) => (
                      <div key={cat.name}>
                        <div className="flex justify-between mb-1">
                          <span className="text-xs text-[#555]">
                            {cat.name}
                          </span>
                          <span className="text-xs text-[#888]">
                            {cat.count} products
                          </span>
                        </div>
                        <div className="h-1.5 bg-[#f2f2f0] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${cat.pct}%`,
                              background: [
                                "#29a366",
                                "#2563eb",
                                "#7c3aed",
                                "#ea580c",
                                "#ca8a04",
                              ][i],
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Highlights */}
              <div className="bg-white rounded-xl border border-black/[0.06] p-5">
                <p className="text-sm font-semibold text-[#111] mb-4">
                  Highlights
                </p>
                <div className="space-y-3">
                  {[
                    {
                      label: "Avg. Rating",
                      value: avgRating + " ★",
                      color: "#ca8a04",
                    },
                    {
                      label: "Reviews",
                      value: String(allReviews.length),
                      color: "#7c3aed",
                    },
                    {
                      label: "Completed %",
                      value:
                        totalOrders > 0
                          ? `${Math.round((completedOrders / totalOrders) * 100)}%`
                          : "—",
                      color: "#29a366",
                    },
                    {
                      label: "Avg. Order Value",
                      value:
                        totalOrders > 0
                          ? `₱${Math.round(totalRevenue / totalOrders).toLocaleString()}`
                          : "—",
                      color: "#2563eb",
                    },
                  ].map((h) => (
                    <div
                      key={h.label}
                      className="flex items-center justify-between py-2 border-b border-black/[0.04] last:border-0"
                    >
                      <span className="text-xs text-[#777]">{h.label}</span>
                      <span
                        className="text-sm font-bold"
                        style={{ color: h.color }}
                      >
                        {h.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Activity */}
              <div className="bg-white rounded-xl border border-black/[0.06] p-5">
                <p className="text-sm font-semibold text-[#111] mb-4">
                  Recent Activity
                </p>
                {recentActivity.length === 0 ? (
                  <p className="text-sm text-[#888] text-center py-8">
                    No recent activity
                  </p>
                ) : (
                  <div className="space-y-3">
                    {recentActivity.map((item, i) => (
                      <div key={i} className="flex items-start gap-2.5">
                        <div
                          className="h-1.5 w-1.5 rounded-full mt-1.5 shrink-0"
                          style={{ background: "#29a366" }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-[#333] truncate">
                            {item.action}
                          </p>
                          <p className="text-[11px] text-[#888]">
                            {item.detail} · {item.time}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </SellerLayout>
  );
}
