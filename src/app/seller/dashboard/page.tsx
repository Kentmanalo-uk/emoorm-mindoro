"use client";

import React from "react";
import { SellerLayout } from "@/components/layout/seller-layout";
import {
  DollarSign,
  Package,
  ShoppingCart,
  TrendingUp,
  Star,
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Truck,
  Loader2,
  BarChart3,
  Settings,
  User,
  ClipboardList,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import {
  useSupabaseAuth,
  useStableMemo,
  useDoc,
  useCollection,
} from "@/supabase";
import { Skeleton } from "@/components/ui/skeleton";

const statusConfig: Record<
  string,
  { icon: React.ElementType; color: string; bg: string }
> = {
  "To Pay": { icon: Clock, color: "#ca8a04", bg: "#fefce8" },
  "To Ship": { icon: AlertCircle, color: "#2563eb", bg: "#eff6ff" },
  "To Receive": { icon: Truck, color: "#7c3aed", bg: "#f5f3ff" },
  Completed: { icon: CheckCircle2, color: "#16a34a", bg: "#f0fdf4" },
  Cancelled: { icon: XCircle, color: "#dc2626", bg: "#fef2f2" },
  pending: { icon: Clock, color: "#ca8a04", bg: "#fefce8" },
  processing: { icon: AlertCircle, color: "#2563eb", bg: "#eff6ff" },
  shipped: { icon: Truck, color: "#7c3aed", bg: "#f5f3ff" },
  completed: { icon: CheckCircle2, color: "#16a34a", bg: "#f0fdf4" },
  cancelled: { icon: XCircle, color: "#dc2626", bg: "#fef2f2" },
};

export default function SellerDashboardPage() {
  const { user } = useSupabaseAuth();

  const storeRef = useStableMemo(() => {
    if (!user) return null;
    return { table: "stores", id: user.uid };
  }, [user]);
  const { data: store } = useDoc(storeRef);

  const productsConfig = useStableMemo(() => {
    if (!user) return null;
    return {
      table: "facilities",
      filters: [{ column: "sellerId", op: "eq" as const, value: user.uid }],
      order: { column: "createdAt", ascending: false },
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

  const totalSales =
    orders?.reduce((sum, o: any) => sum + (Number(o.totalPrice) || 0), 0) ?? 0;
  const totalOrders = orders?.length ?? 0;
  const totalProducts = products?.length ?? 0;
  const completedOrders =
    orders?.filter(
      (o: any) => o.status === "Completed" || o.status === "completed",
    ).length ?? 0;

  const stats = [
    {
      label: "Total Sales",
      value: `₱${totalSales.toLocaleString()}`,
      icon: DollarSign,
      color: "#29a366",
      bg: "#f0faf5",
    },
    {
      label: "Orders",
      value: String(totalOrders),
      icon: ShoppingCart,
      color: "#2563eb",
      bg: "#eff6ff",
    },
    {
      label: "Products",
      value: String(totalProducts),
      icon: Package,
      color: "#7c3aed",
      bg: "#f5f3ff",
    },
    {
      label: "Completed",
      value: String(completedOrders),
      icon: CheckCircle2,
      color: "#ea580c",
      bg: "#fff7ed",
    },
  ];

  const recentOrders = (orders ?? []).slice(0, 5);
  const topProducts = (products ?? [])
    .sort((a: any, b: any) => (Number(b.rating) || 0) - (Number(a.rating) || 0))
    .slice(0, 3);

  const isLoading = productsLoading || ordersLoading;

  const quickLinks = [
    { href: "/seller/products", icon: Package, label: "Manage Products" },
    { href: "/seller/orders", icon: ClipboardList, label: "View Orders" },
    { href: "/seller/analytics", icon: BarChart3, label: "Analytics" },
    { href: "/seller/profile", icon: User, label: "Shop Profile" },
    { href: "/seller/settings", icon: Settings, label: "Settings" },
  ];

  return (
    <SellerLayout>
      <div className="max-w-[1280px] mx-auto px-4 md:px-6 pt-6 pb-8 space-y-4">
        {/* Header */}
        <div className="bg-white rounded-xl border border-black/[0.06] px-6 py-5 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold text-[#111]">
              Seller Dashboard
            </h1>
            <p className="text-sm text-[#888]">
              {store
                ? `Overview of ${(store as any).name}`
                : "Overview of your shop"}
            </p>
          </div>
          <Link href="/seller/products/add">
            <button
              className="hidden md:flex items-center gap-2 h-9 px-5 rounded-xl text-white text-sm font-semibold"
              style={{ background: "#29a366" }}
            >
              <Plus className="h-4 w-4" /> Add Product
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
                  <Skeleton className="h-9 w-9 rounded-xl mb-4" />
                  <Skeleton className="h-3 w-20 rounded mb-2" />
                  <Skeleton className="h-6 w-16 rounded" />
                </div>
              ))}
            </div>
            <div className="bg-white rounded-xl border border-black/[0.06] p-5">
              <Skeleton className="h-4 w-32 rounded mb-4" />
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 py-3 border-b border-black/[0.04] last:border-0"
                >
                  <Skeleton className="h-10 w-10 rounded-xl" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3.5 w-40 rounded" />
                    <Skeleton className="h-3 w-24 rounded" />
                  </div>
                  <Skeleton className="h-5 w-16 rounded" />
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
                  <p className="text-xs text-[#888] mb-1">{stat.label}</p>
                  <p className="text-xl font-bold text-[#111]">{stat.value}</p>
                </div>
              ))}
            </div>

            <div className="flex flex-col lg:flex-row gap-4">
              {/* Recent Orders */}
              <div className="flex-1 min-w-0 bg-white rounded-xl border border-black/[0.06] overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-black/[0.05]">
                  <p className="text-sm font-semibold text-[#111]">
                    Recent Orders
                  </p>
                  <Link
                    href="/seller/orders"
                    className="text-xs font-semibold"
                    style={{ color: "#29a366" }}
                  >
                    View All
                  </Link>
                </div>
                {recentOrders.length === 0 ? (
                  <div className="py-12 flex flex-col items-center text-center gap-2">
                    <ShoppingCart
                      className="h-8 w-8 text-[#ddd]"
                      strokeWidth={1.5}
                    />
                    <p className="text-sm text-[#888]">No orders yet</p>
                  </div>
                ) : (
                  <div>
                    {recentOrders.map((order: any) => {
                      const status = order.status || "pending";
                      const cfg = statusConfig[status] || statusConfig.pending;
                      const Icon = cfg.icon;
                      return (
                        <div
                          key={order.id}
                          className="flex items-center gap-3 px-5 py-3.5 border-b border-black/[0.04] last:border-0 hover:bg-[#f9f9f8] transition-colors"
                        >
                          <div
                            className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0"
                            style={{ background: cfg.bg }}
                          >
                            <Icon
                              className="h-4 w-4"
                              style={{ color: cfg.color }}
                              strokeWidth={1.8}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-[#111] truncate">
                              Order #{order.id?.slice(0, 8)}
                            </p>
                            <p className="text-xs text-[#888]">
                              Qty: {order.quantity || 1} ·{" "}
                              {new Date(order.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-[#111]">
                              ₱{Number(order.totalPrice || 0).toLocaleString()}
                            </p>
                            <span
                              className="text-[10px] capitalize px-2 py-0.5 rounded font-medium"
                              style={{ color: cfg.color, background: cfg.bg }}
                            >
                              {status}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Right column */}
              <div className="w-full lg:w-[280px] shrink-0 space-y-4">
                {/* Top Products */}
                <div className="bg-white rounded-xl border border-black/[0.06] overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-black/[0.05]">
                    <p className="text-sm font-semibold text-[#111]">
                      Top Products
                    </p>
                    <TrendingUp
                      className="h-4 w-4 text-[#bbb]"
                      strokeWidth={1.8}
                    />
                  </div>
                  {topProducts.length === 0 ? (
                    <div className="py-10 flex flex-col items-center gap-2">
                      <Package
                        className="h-8 w-8 text-[#ddd]"
                        strokeWidth={1.5}
                      />
                      <p className="text-sm text-[#888]">No products yet</p>
                    </div>
                  ) : (
                    <div className="p-5 space-y-4">
                      {topProducts.map((product: any, i: number) => (
                        <div
                          key={product.id}
                          className="flex items-start gap-3"
                        >
                          <span
                            className="flex items-center justify-center w-6 h-6 rounded text-xs font-bold text-white shrink-0"
                            style={{ background: "#29a366" }}
                          >
                            {i + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-[#111] truncate">
                              {product.name}
                            </p>
                            <p className="text-xs text-[#888]">
                              ₱{Number(product.price || 0).toLocaleString()} ·
                              Stock: {product.stock || 0}
                            </p>
                            <div className="flex items-center gap-1 mt-0.5">
                              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                              <span className="text-xs text-[#888]">
                                {product.rating || 0}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Quick Links */}
                <div className="bg-white rounded-xl border border-black/[0.06] overflow-hidden">
                  <p className="text-xs font-semibold text-[#555] px-5 pt-4 pb-3">
                    Quick Actions
                  </p>
                  {quickLinks.map((link) => {
                    const Icon = link.icon;
                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        className="flex items-center justify-between px-5 py-3 text-sm text-[#444] hover:bg-[#f2f2f0] hover:text-[#29a366] transition-colors border-t border-black/[0.04]"
                      >
                        <span className="flex items-center gap-2.5">
                          <Icon
                            className="h-4 w-4 text-[#bbb]"
                            strokeWidth={1.8}
                          />
                          {link.label}
                        </span>
                        <ChevronRight className="h-3.5 w-3.5 text-[#bbb]" />
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </SellerLayout>
  );
}
