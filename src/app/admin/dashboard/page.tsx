"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AdminLayout } from "@/components/layout/admin-layout";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { useAdminStoreScope } from "@/hooks/use-admin-store-scope";
import {
  DollarSign,
  Package,
  Users,
  TrendingUp,
  BarChart3,
  Store,
  FileText,
  Star,
  ShieldCheck,
  Megaphone,
  Tag,
  Image as ImageIcon,
  Activity,
  Gavel,
} from "lucide-react";
import Link from "next/link";
import { useStableMemo, useCollection } from "@/supabase";
import { Skeleton } from "@/components/ui/skeleton";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import { cn } from "@/lib/utils";

/** Compute % change between this month and last month */
function computeTrend(items: any[], valueKey?: string) {
  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();
  const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1;
  const lastMonthYear = thisMonth === 0 ? thisYear - 1 : thisYear;

  let thisVal = 0;
  let lastVal = 0;

  items.forEach((item) => {
    const d = new Date(item.createdAt || item.bookingDate || 0);
    const m = d.getMonth();
    const y = d.getFullYear();
    const v = valueKey ? Number(item[valueKey]) || 0 : 1;
    if (m === thisMonth && y === thisYear) thisVal += v;
    if (m === lastMonth && y === lastMonthYear) lastVal += v;
  });

  if (lastVal === 0) return thisVal > 0 ? "+100%" : "0%";
  const pct = ((thisVal - lastVal) / lastVal) * 100;
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`;
}

function isTrendPositive(trend: string) {
  return trend.startsWith("+") && trend !== "+0%" && trend !== "+0.0%";
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const { isAdmin, isAdminLoading, user } = useIsAdmin();
  const { inScopeIds } = useAdminStoreScope();

  useEffect(() => {
    if (!isAdminLoading && !isAdmin) {
      router.push("/admin");
    }
  }, [isAdmin, isAdminLoading, router]);

  const usersConfig = useStableMemo(() => {
    if (!user || !isAdmin) return null;
    return { table: "users" };
  }, [user, isAdmin]);
  const { data: allUsers, isLoading: usersLoading } =
    useCollection(usersConfig);

  // Aggregate-only order data (anonymous totals, no per-order detail)
  const ordersAggConfig = useStableMemo(() => {
    if (!user || !isAdmin) return null;
    return {
      table: "bookings",
      columns: "id, totalPrice, createdAt, bookingDate",
    };
  }, [user, isAdmin]);
  const { data: allOrders, isLoading: ordersLoading } =
    useCollection(ordersAggConfig);

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

  const reportsConfig = useStableMemo(() => {
    if (!user || !isAdmin) return null;
    return {
      table: "reports",
      filters: [{ column: "status", op: "eq" as const, value: "open" }],
    };
  }, [user, isAdmin]);
  const { data: openReports } = useCollection(reportsConfig);

  // Monthly revenue (aggregate only — no order IDs, no buyer info)
  const monthlyData = React.useMemo(() => {
    if (!allOrders || allOrders.length === 0) return [];
    const months: Record<string, number> = {};
    allOrders.forEach((o: any) => {
      const d = new Date(o.createdAt || o.bookingDate);
      if (isNaN(d.getTime())) return;
      const key = d.toLocaleString("default", {
        month: "short",
        year: "2-digit",
      });
      months[key] = (months[key] || 0) + (Number(o.totalPrice) || 0);
    });
    return Object.entries(months).map(([name, revenue]) => ({ name, revenue }));
  }, [allOrders]);

  if (isAdminLoading || !user || !isAdmin) return null;

  const isLoading =
    usersLoading || ordersLoading || productsLoading || storesLoading;

  const totalRevenue =
    (inScopeIds
      ? (allOrders ?? []).filter(
          (o: any) =>
            inScopeIds.has(String(o.storeId)) ||
            inScopeIds.has(String(o.sellerId)),
        )
      : allOrders ?? []
    ).reduce((sum, o: any) => sum + (Number(o.totalPrice) || 0), 0);
  const scopedStores = inScopeIds
    ? (allStores ?? []).filter((s: any) => inScopeIds.has(String(s.id)))
    : (allStores ?? []);
  const scopedProducts = inScopeIds
    ? (allProducts ?? []).filter(
        (p: any) =>
          inScopeIds.has(String(p.storeId)) ||
          inScopeIds.has(String(p.sellerId)),
      )
    : (allProducts ?? []);
  const scopedOrders = inScopeIds
    ? (allOrders ?? []).filter(
        (o: any) =>
          inScopeIds.has(String(o.storeId)) ||
          inScopeIds.has(String(o.sellerId)),
      )
    : (allOrders ?? []);

  const totalProducts = scopedProducts.length;
  const totalUsers = inScopeIds ? scopedStores.length : allUsers?.length ?? 0;
  const totalSellers = scopedStores.length;
  const verifiedSellers = scopedStores.filter((s: any) => s.verified).length;
  const pendingSellerVerifications = totalSellers - verifiedSellers;

  const revenueTrend = scopedOrders.length
    ? computeTrend(scopedOrders as any[], "totalPrice")
    : "0%";
  const usersTrend =
    inScopeIds || !allUsers
      ? "0%"
      : computeTrend(allUsers as any[]);
  const sellersTrend = scopedStores.length
    ? computeTrend(scopedStores as any[])
    : "0%";
  const productsTrend = scopedProducts.length
    ? computeTrend(scopedProducts as any[])
    : "0%";

  const stats = [
    {
      label: "Platform Revenue",
      value: `₱${totalRevenue.toLocaleString()}`,
      icon: DollarSign,
      color: "text-green-600 bg-green-50 dark:bg-green-500/10",
      trend: revenueTrend,
      positive: isTrendPositive(revenueTrend),
    },
    {
      label: inScopeIds ? "Stores In Scope" : "Total Users",
      value: String(totalUsers),
      icon: Users,
      color: "text-purple-600 bg-purple-50 dark:bg-purple-500/10",
      trend: usersTrend,
      positive: isTrendPositive(usersTrend),
    },
    {
      label: "Active Sellers",
      value: String(verifiedSellers),
      icon: Store,
      color: "text-orange-600 bg-orange-50 dark:bg-orange-500/10",
      trend: sellersTrend,
      positive: isTrendPositive(sellersTrend),
    },
    {
      label: "Listings",
      value: String(totalProducts),
      icon: Package,
      color: "text-blue-600 bg-blue-50 dark:bg-blue-500/10",
      trend: productsTrend,
      positive: isTrendPositive(productsTrend),
    },
  ];

  const chartData = monthlyData.length > 0 ? monthlyData : [];
  const openReportsCount = openReports?.length ?? 0;

  return (
    <AdminLayout>
      <div className="max-w-[1280px] mx-auto px-4 md:px-6 pt-6 pb-8 space-y-4">
        {/* Header */}
        <div className="bg-white rounded-xl border border-black/[0.06] px-6 py-5 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold text-[#111]">
              Admin Dashboard
            </h1>
            <p className="text-sm text-[#888]">
              Oversight &amp; moderation · Order details remain private to
              buyers and sellers
            </p>
          </div>
          <Link href="/admin/analytics" className="hidden md:block">
            <button
              className="flex items-center gap-2 h-9 px-5 rounded-xl text-white text-sm font-semibold"
              style={{ background: "#29a366" }}
            >
              <BarChart3 className="h-4 w-4" /> Analytics
            </button>
          </Link>
        </div>

        {isLoading ? (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-white rounded-xl border border-black/[0.06] p-5"
                >
                  <Skeleton className="h-3 w-20 rounded mb-2" />
                  <Skeleton className="h-6 w-16 rounded" />
                </div>
              ))}
            </div>
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1 bg-white rounded-xl border border-black/[0.06] p-5">
                <Skeleton className="h-4 w-36 rounded mb-4" />
                <Skeleton className="h-[240px] w-full rounded" />
              </div>
              <div className="lg:w-[320px] bg-white rounded-xl border border-black/[0.06] p-5">
                <Skeleton className="h-4 w-36 rounded mb-4" />
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full rounded mb-2" />
                ))}
              </div>
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
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-[#888]">{stat.label}</p>
                    <span
                      className={cn(
                        "text-[10px] font-semibold px-1.5 py-0.5 rounded",
                        stat.positive
                          ? "text-[#29a366] bg-[#29a366]/10"
                          : "text-red-600 bg-red-50",
                      )}
                    >
                      {stat.trend}
                    </span>
                  </div>
                  <p className="text-xl font-bold text-[#111]">{stat.value}</p>
                </div>
              ))}
            </div>

            {/* Chart + Quick actions */}
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1 min-w-0 bg-white rounded-xl border border-black/[0.06] overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-black/[0.05]">
                  <div>
                    <p className="text-sm font-semibold text-[#111]">
                      Revenue overview
                    </p>
                    <p className="text-[11px] text-[#888] mt-0.5">
                      Aggregate platform revenue per month.
                    </p>
                  </div>
                  <Link
                    href="/admin/analytics"
                    className="text-xs font-semibold"
                    style={{ color: "#29a366" }}
                  >
                    View All
                  </Link>
                </div>
                <div className="p-5">
                  {chartData.length > 0 ? (
                    <div className="h-[240px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                          <defs>
                            <linearGradient
                              id="adminColorRev"
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="1"
                            >
                              <stop
                                offset="5%"
                                stopColor="#29a366"
                                stopOpacity={0.2}
                              />
                              <stop
                                offset="95%"
                                stopColor="#29a366"
                                stopOpacity={0}
                              />
                            </linearGradient>
                          </defs>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            vertical={false}
                            stroke="#eee"
                          />
                          <XAxis
                            dataKey="name"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 11, fill: "#888" }}
                          />
                          <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 11, fill: "#888" }}
                          />
                          <Tooltip
                            contentStyle={{
                              borderRadius: "12px",
                              border: "1px solid rgba(0,0,0,0.06)",
                              boxShadow: "0 6px 18px rgba(0,0,0,0.06)",
                              fontSize: 12,
                            }}
                          />
                          <Area
                            type="monotone"
                            dataKey="revenue"
                            stroke="#29a366"
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#adminColorRev)"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-[240px] flex items-center justify-center text-sm text-[#aaa] italic">
                      No revenue data yet.
                    </div>
                  )}
                </div>
              </div>

              <div className="lg:w-[320px] bg-white rounded-xl border border-black/[0.06] overflow-hidden flex flex-col">
                <div className="px-5 py-4 border-b border-black/[0.05]">
                  <p className="text-sm font-semibold text-[#111]">
                    Quick actions
                  </p>
                </div>
                <div className="p-4 space-y-2 flex-1">
                  {[
                    {
                      href: "/admin/users",
                      icon: Users,
                      label: "Manage users",
                    },
                    {
                      href: "/admin/sellers",
                      icon: Store,
                      label: "Manage sellers",
                    },
                    {
                      href: "/admin/reports",
                      icon: FileText,
                      label: "Reports & disputes",
                    },
                    {
                      href: "/admin/broadcast",
                      icon: Megaphone,
                      label: "Broadcast",
                    },
                  ].map(({ href, icon: Icon, label }) => (
                    <Link key={href} href={href}>
                      <button className="w-full flex items-center gap-2.5 h-10 rounded-xl text-xs font-medium text-[#333] bg-[#f2f2f0] hover:bg-[#e8e8e6] px-3 transition-colors">
                        <Icon
                          className="h-4 w-4"
                          style={{ color: "#29a366" }}
                        />
                        {label}
                      </button>
                    </Link>
                  ))}
                </div>
                <div className="p-4 border-t border-black/[0.05]">
                  <div
                    className="flex items-start gap-3 p-3 rounded-xl"
                    style={{ background: "#f0faf5" }}
                  >
                    <TrendingUp
                      className="h-4 w-4 shrink-0 mt-0.5"
                      style={{ color: "#29a366" }}
                    />
                    <div>
                      <p
                        className="text-[10px] font-bold uppercase tracking-wide"
                        style={{ color: "#29a366" }}
                      >
                        Platform status
                      </p>
                      <p className="text-xs text-[#333] leading-snug mt-0.5">
                        {pendingSellerVerifications} seller
                        {pendingSellerVerifications === 1 ? "" : "s"} pending
                        verification · {openReportsCount} open report
                        {openReportsCount === 1 ? "" : "s"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Moderation shortcuts */}
            <div className="bg-white rounded-xl border border-black/[0.06] overflow-hidden">
              <div className="px-5 py-4 border-b border-black/[0.05]">
                <p className="text-sm font-semibold text-[#111]">
                  Moderation &amp; tools
                </p>
              </div>
              <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  {
                    href: "/admin/products",
                    icon: Package,
                    label: "Products",
                  },
                  { href: "/admin/reviews", icon: Star, label: "Reviews" },
                  { href: "/admin/bidding", icon: Gavel, label: "Bidding" },
                  {
                    href: "/admin/reports",
                    icon: FileText,
                    label: "Reports",
                    badge: openReportsCount,
                  },
                  { href: "/admin/vouchers", icon: Tag, label: "Vouchers" },
                  {
                    href: "/admin/banners",
                    icon: ImageIcon,
                    label: "Banners",
                  },
                  {
                    href: "/admin/audit-log",
                    icon: ShieldCheck,
                    label: "Audit log",
                  },
                  {
                    href: "/admin/system-health",
                    icon: Activity,
                    label: "System",
                  },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link href={item.href} key={item.href}>
                      <div className="relative flex flex-col items-center justify-center gap-2 h-20 rounded-xl bg-[#f2f2f0] hover:bg-[#e8e8e6] transition-colors p-3">
                        <Icon
                          className="h-4 w-4"
                          style={{ color: "#29a366" }}
                        />
                        <span className="text-[11px] font-medium text-[#333]">
                          {item.label}
                        </span>
                        {item.badge ? (
                          <span className="absolute top-1.5 right-1.5 bg-red-500 text-white rounded-full px-1.5 text-[9px] font-bold h-4 min-w-[16px] flex items-center justify-center">
                            {item.badge}
                          </span>
                        ) : null}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
