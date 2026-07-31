"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AdminLayout } from "@/components/layout/admin-layout";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DollarSign,
  Package,
  Users,
  TrendingUp,
  MoreVertical,
  BarChart3,
  Settings,
  Store,
  MessageCircle,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
    allOrders?.reduce((sum, o: any) => sum + (Number(o.totalPrice) || 0), 0) ??
    0;
  const totalProducts = allProducts?.length ?? 0;
  const totalUsers = allUsers?.length ?? 0;
  const totalSellers = allStores?.length ?? 0;
  const verifiedSellers = allStores?.filter((s: any) => s.verified).length ?? 0;
  const pendingSellerVerifications = totalSellers - verifiedSellers;

  const revenueTrend = allOrders
    ? computeTrend(allOrders as any[], "totalPrice")
    : "0%";
  const usersTrend = allUsers ? computeTrend(allUsers as any[]) : "0%";
  const sellersTrend = allStores ? computeTrend(allStores as any[]) : "0%";
  const productsTrend = allProducts ? computeTrend(allProducts as any[]) : "0%";

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
      label: "Total Users",
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
      <div className="max-w-7xl mx-auto p-6 md:p-8 w-full pt-6 md:pt-32 pb-24 space-y-8 md:space-y-10">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-normal font-headline tracking-[-0.05em] text-black dark:text-white">
              Admin Dashboard
            </h1>
            <p className="text-sm text-muted-foreground font-normal">
              Oversight &amp; moderation · Order details remain private to
              buyers and sellers
            </p>
          </div>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="rounded-full h-10 w-10"
                >
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-56 rounded-2xl p-1 shadow-[0_20px_50px_rgba(0,0,0,0.1)] bg-white/30 backdrop-blur-xl border-none"
              >
                <DropdownMenuItem
                  asChild
                  className="rounded-xl gap-3 px-3 py-2.5 cursor-pointer"
                >
                  <Link href="/admin/users">
                    <Users className="h-4 w-4" /> Users
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  asChild
                  className="rounded-xl gap-3 px-3 py-2.5 cursor-pointer"
                >
                  <Link href="/admin/sellers">
                    <Store className="h-4 w-4" /> Sellers
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  asChild
                  className="rounded-xl gap-3 px-3 py-2.5 cursor-pointer"
                >
                  <Link href="/admin/products">
                    <Package className="h-4 w-4" /> Products
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  asChild
                  className="rounded-xl gap-3 px-3 py-2.5 cursor-pointer"
                >
                  <Link href="/admin/reviews">
                    <Star className="h-4 w-4" /> Reviews
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  asChild
                  className="rounded-xl gap-3 px-3 py-2.5 cursor-pointer"
                >
                  <Link href="/admin/reports">
                    <FileText className="h-4 w-4" /> Reports
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  asChild
                  className="rounded-xl gap-3 px-3 py-2.5 cursor-pointer"
                >
                  <Link href="/admin/audit-log">
                    <ShieldCheck className="h-4 w-4" /> Audit Log
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  asChild
                  className="rounded-xl gap-3 px-3 py-2.5 cursor-pointer"
                >
                  <Link href="/admin/analytics">
                    <BarChart3 className="h-4 w-4" /> Analytics
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  asChild
                  className="rounded-xl gap-3 px-3 py-2.5 cursor-pointer"
                >
                  <Link href="/admin/settings">
                    <Settings className="h-4 w-4" /> Settings
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {isLoading ? (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-[32px] border border-black/[0.02] bg-white dark:bg-white/[0.03] p-6 md:p-8"
                >
                  <Skeleton className="h-12 w-12 rounded-2xl mb-6" />
                  <Skeleton className="h-3 w-20 rounded-full mb-2" />
                  <Skeleton className="h-7 w-16 rounded-full" />
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 rounded-[32px] border border-black/[0.02] bg-white dark:bg-white/[0.03] p-6">
                <Skeleton className="h-5 w-36 rounded-full mb-4" />
                <Skeleton className="h-[300px] w-full rounded-2xl" />
              </div>
              <div className="rounded-[32px] border border-black/[0.02] bg-white dark:bg-white/[0.03] p-6">
                <Skeleton className="h-5 w-36 rounded-full mb-4" />
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full rounded-full mb-3" />
                ))}
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
              {stats.map((stat) => {
                const Icon = stat.icon;
                return (
                  <Card
                    key={stat.label}
                    className="shadow-[0_20px_50px_rgba(0,0,0,0.04)] border border-black/[0.02] rounded-[32px] bg-white dark:bg-white/[0.03]"
                  >
                    <CardContent className="p-6 md:p-8">
                      <div className="flex justify-between items-start mb-6">
                        <div className={`p-3 rounded-2xl ${stat.color}`}>
                          <Icon className="h-6 w-6 md:h-7 md:w-7" />
                        </div>
                        <Badge
                          variant="outline"
                          className={cn(
                            "font-bold rounded-full px-3 py-1 text-[10px] md:text-xs",
                            stat.positive
                              ? "text-green-600 border-green-200 bg-green-50"
                              : "text-red-600 border-red-200 bg-red-50",
                          )}
                        >
                          {stat.trend}
                        </Badge>
                      </div>
                      <p className="text-xs md:text-sm text-muted-foreground font-medium mb-1 tracking-tight">
                        {stat.label}
                      </p>
                      <p className="text-xl md:text-3xl font-normal font-headline tracking-[-0.05em]">
                        {stat.value}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Chart + Quick Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
              <Card className="lg:col-span-2 shadow-[0_20px_50px_rgba(0,0,0,0.04)] border border-black/[0.02] rounded-[32px] bg-white dark:bg-white/[0.03] overflow-hidden">
                <CardContent className="p-6 md:p-8">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl md:text-2xl font-normal font-headline tracking-[-0.05em]">
                      Revenue Overview
                    </h2>
                    <Link
                      href="/admin/analytics"
                      className="text-sm text-primary hover:underline"
                    >
                      View Details
                    </Link>
                  </div>
                  <p className="text-xs text-muted-foreground mb-4">
                    Aggregate platform revenue per month. Individual order
                    details are private.
                  </p>
                  {chartData.length > 0 ? (
                    <div className="h-[280px] md:h-[350px]">
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
                                stopColor="hsl(var(--primary))"
                                stopOpacity={0.1}
                              />
                              <stop
                                offset="95%"
                                stopColor="hsl(var(--primary))"
                                stopOpacity={0}
                              />
                            </linearGradient>
                          </defs>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            vertical={false}
                            stroke="#f0f0f0"
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
                              borderRadius: "15px",
                              border: "none",
                              boxShadow: "0 10px 20px rgba(0,0,0,0.05)",
                            }}
                          />
                          <Area
                            type="monotone"
                            dataKey="revenue"
                            stroke="hsl(var(--primary))"
                            strokeWidth={3}
                            fillOpacity={1}
                            fill="url(#adminColorRev)"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-[280px] md:h-[350px] flex items-center justify-center text-muted-foreground text-sm">
                      No revenue data yet.
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="shadow-[0_20px_50px_rgba(0,0,0,0.04)] border border-black/[0.02] rounded-[32px] bg-white dark:bg-white/[0.03]">
                <CardContent className="p-6 md:p-8">
                  <h2 className="text-xl md:text-2xl font-normal font-headline tracking-[-0.05em] mb-4">
                    Quick Actions
                  </h2>
                  <div className="space-y-3">
                    <Link href="/admin/users">
                      <button className="w-full flex items-center gap-3 rounded-full h-12 shadow-sm text-sm border-none bg-[#f8f8f8] dark:bg-white/[0.05] hover:bg-muted px-5 transition-all">
                        <Users className="h-5 w-5 text-primary" /> Manage Users
                      </button>
                    </Link>
                    <Link href="/admin/sellers">
                      <button className="w-full flex items-center gap-3 rounded-full h-12 shadow-sm text-sm border-none bg-[#f8f8f8] dark:bg-white/[0.05] hover:bg-muted px-5 transition-all">
                        <Store className="h-5 w-5 text-primary" /> Manage
                        Sellers
                      </button>
                    </Link>
                    <Link href="/admin/reports">
                      <button className="w-full flex items-center gap-3 rounded-full h-12 shadow-sm text-sm border-none bg-[#f8f8f8] dark:bg-white/[0.05] hover:bg-muted px-5 transition-all">
                        <FileText className="h-5 w-5 text-primary" /> Reports &
                        Disputes
                      </button>
                    </Link>
                    <Link href="/admin/broadcast">
                      <button className="w-full flex items-center gap-3 rounded-full h-12 shadow-sm text-sm border-none bg-[#f8f8f8] dark:bg-white/[0.05] hover:bg-muted px-5 transition-all">
                        <Megaphone className="h-5 w-5 text-primary" /> Broadcast
                      </button>
                    </Link>
                  </div>
                  <div className="pt-5 mt-4 border-t">
                    <div className="flex items-center gap-4 p-5 bg-primary/5 rounded-2xl">
                      <TrendingUp className="h-8 w-8 text-primary shrink-0" />
                      <div>
                        <p className="text-[10px] font-bold tracking-tight text-primary">
                          Platform Status
                        </p>
                        <p className="text-sm font-medium leading-tight">
                          {pendingSellerVerifications} seller
                          {pendingSellerVerifications === 1 ? "" : "s"} pending
                          verification · {openReportsCount} open report
                          {openReportsCount === 1 ? "" : "s"}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Moderation Shortcuts (replaces Recent Orders for privacy) */}
            <Card className="shadow-[0_20px_50px_rgba(0,0,0,0.04)] border border-black/[0.02] rounded-[32px] bg-white dark:bg-white/[0.03] overflow-hidden">
              <CardContent className="p-6 md:p-8">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-xl md:text-2xl font-normal font-headline tracking-[-0.05em]">
                    Moderation & Tools
                  </h2>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
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
                      label: "Audit Log",
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
                        <div className="relative flex flex-col items-center justify-center gap-2 h-24 rounded-2xl bg-[#f8f8f8] dark:bg-white/[0.05] hover:bg-muted transition-all p-3">
                          <Icon className="h-5 w-5 text-primary" />
                          <span className="text-xs font-medium">
                            {item.label}
                          </span>
                          {item.badge ? (
                            <Badge className="absolute top-2 right-2 bg-red-500 text-white border-0 rounded-full px-1.5 py-0 text-[9px] h-4 min-w-[16px]">
                              {item.badge}
                            </Badge>
                          ) : null}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
