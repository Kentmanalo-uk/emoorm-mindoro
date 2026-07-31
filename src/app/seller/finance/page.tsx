"use client";

import React, { useMemo, useState } from "react";
import { SellerLayout } from "@/components/layout/seller-layout";
import {
  Wallet,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowUpRight,
  Receipt,
  CalendarDays,
  ChevronDown,
} from "lucide-react";
import { useSupabaseAuth, useStableMemo, useCollection } from "@/supabase";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const PERIODS = ["All time", "This month", "Last month", "Last 3 months"];

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-black/[0.06] p-5">
      <p className="text-[11px] text-[#aaa] mb-0.5">{label}</p>
      <p className="text-xl font-bold text-[#111] leading-none mb-1">{value}</p>
      {sub && <p className="text-xs text-[#bbb]">{sub}</p>}
    </div>
  );
}

export default function SellerFinancePage() {
  const { user } = useSupabaseAuth();
  const [period, setPeriod] = useState("All time");
  const [showPeriod, setShowPeriod] = useState(false);

  const ordersConfig = useStableMemo(
    () =>
      user
        ? {
            table: "bookings",
            filters: [
              { column: "storeId", op: "eq" as const, value: user.uid },
            ],
            order: { column: "createdAt", ascending: false },
          }
        : null,
    [user],
  );
  const { data: orders, isLoading } = useCollection(ordersConfig);
  const allOrders = (orders ?? []) as any[];

  // Period filter
  const now = new Date();
  const filtered = useMemo(() => {
    if (period === "All time") return allOrders;
    return allOrders.filter((o: any) => {
      if (!o.createdAt) return false;
      const d = new Date(o.createdAt);
      if (period === "This month")
        return (
          d.getMonth() === now.getMonth() &&
          d.getFullYear() === now.getFullYear()
        );
      if (period === "Last month") {
        const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        return (
          d.getMonth() === lm.getMonth() && d.getFullYear() === lm.getFullYear()
        );
      }
      if (period === "Last 3 months")
        return d >= new Date(now.getFullYear(), now.getMonth() - 2, 1);
      return true;
    });
  }, [allOrders, period]);

  const completed = filtered.filter((o: any) =>
    ["Completed", "completed"].includes(o.status),
  );
  const pending = filtered.filter((o: any) =>
    [
      "To Ship",
      "To Receive",
      "To Pickup",
      "To Pay",
      "pending",
      "processing",
      "shipped",
    ].includes(o.status),
  );
  const cancelled = filtered.filter((o: any) =>
    ["Cancelled", "cancelled"].includes(o.status),
  );

  const totalEarnings = completed.reduce(
    (s: number, o: any) => s + Number(o.totalPrice || 0),
    0,
  );
  const pendingValue = pending.reduce(
    (s: number, o: any) => s + Number(o.totalPrice || 0),
    0,
  );
  const cancelledValue = cancelled.reduce(
    (s: number, o: any) => s + Number(o.totalPrice || 0),
    0,
  );

  // Monthly breakdown from all completed orders (not filtered by period for the chart)
  const monthlyBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    allOrders
      .filter((o: any) => ["Completed", "completed"].includes(o.status))
      .forEach((o: any) => {
        if (!o.createdAt) return;
        const key = new Date(o.createdAt).toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
        });
        map[key] = (map[key] || 0) + Number(o.totalPrice || 0);
      });
    return Object.entries(map)
      .sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime())
      .slice(0, 6);
  }, [allOrders]);

  const maxMonthly = Math.max(...monthlyBreakdown.map(([, v]) => v), 1);

  if (isLoading)
    return (
      <SellerLayout>
        <div className="px-4 md:px-6 pt-6 pb-8 space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-2xl" />
            ))}
          </div>
          <Skeleton className="h-48 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </SellerLayout>
    );

  return (
    <SellerLayout>
      <div className="px-4 md:px-6 pt-6 pb-8 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between mb-1">
          <div>
            <h2 className="text-base font-bold text-[#111]">
              Finance Overview
            </h2>
            <p className="text-xs text-[#aaa]">
              Earnings from your store orders
            </p>
          </div>
          {/* Period selector */}
          <div className="relative">
            <button
              onClick={() => setShowPeriod((v) => !v)}
              className="flex items-center gap-1.5 h-8 px-3 rounded-xl border border-black/[0.08] bg-white text-xs font-medium text-[#555] hover:bg-[#f2f2f0] transition-colors"
            >
              <CalendarDays className="h-3.5 w-3.5" />
              {period}
              <ChevronDown
                className={cn(
                  "h-3 w-3 transition-transform",
                  showPeriod && "rotate-180",
                )}
              />
            </button>
            {showPeriod && (
              <div className="absolute right-0 top-full mt-1 bg-white border border-black/[0.08] rounded-xl shadow-lg overflow-hidden z-10 min-w-[140px]">
                {PERIODS.map((p) => (
                  <button
                    key={p}
                    onClick={() => {
                      setPeriod(p);
                      setShowPeriod(false);
                    }}
                    className={cn(
                      "w-full px-4 py-2.5 text-left text-xs font-medium transition-colors hover:bg-[#f2f2f0]",
                      period === p ? "text-[#29a366]" : "text-[#555]",
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            label="Total Earnings"
            value={`₱${totalEarnings.toLocaleString()}`}
            sub={`${completed.length} orders`}
            icon={Wallet}
            color="#29a366"
          />
          <StatCard
            label="Pending"
            value={`₱${pendingValue.toLocaleString()}`}
            sub={`${pending.length} orders`}
            icon={Clock}
            color="#2563eb"
          />
          <StatCard
            label="Cancelled"
            value={`₱${cancelledValue.toLocaleString()}`}
            sub={`${cancelled.length} orders`}
            icon={XCircle}
            color="#dc2626"
          />
          <StatCard
            label="Total Orders"
            value={String(filtered.length)}
            sub="all statuses"
            icon={Receipt}
            color="#f59e0b"
          />
        </div>

        {/* Monthly earnings chart */}
        {monthlyBreakdown.length > 0 ? (
          <div className="bg-white rounded-2xl border border-black/[0.06] p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp
                className="h-4 w-4 text-[#29a366]"
                strokeWidth={1.8}
              />
              <p className="text-sm font-bold text-[#111]">Monthly Earnings</p>
              <span className="text-xs text-[#bbb]">
                (last {monthlyBreakdown.length} months)
              </span>
            </div>
            <div className="space-y-2.5">
              {monthlyBreakdown.map(([month, amount]) => (
                <div key={month} className="flex items-center gap-3">
                  <span className="text-xs text-[#888] w-20 shrink-0">
                    {month}
                  </span>
                  <div className="flex-1 h-6 bg-[#f2f2f0] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.max(2, (amount / maxMonthly) * 100)}%`,
                        background: "#29a366",
                      }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-[#111] w-24 text-right shrink-0">
                    ₱{amount.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-black/[0.06] p-10 flex flex-col items-center gap-2 text-center">
            <TrendingUp className="h-8 w-8 text-[#ddd]" strokeWidth={1.5} />
            <p className="text-sm font-semibold text-[#555]">No earnings yet</p>
            <p className="text-xs text-[#bbb]">
              Complete your first order to see earnings here.
            </p>
          </div>
        )}

        {/* Recent transactions */}
        <div className="bg-white rounded-2xl border border-black/[0.06] overflow-hidden">
          <div className="px-5 py-4 border-b border-black/[0.04] flex items-center justify-between">
            <p className="text-sm font-bold text-[#111]">Recent Transactions</p>
            <span className="text-xs text-[#bbb]">{filtered.length} total</span>
          </div>
          {filtered.length === 0 ? (
            <div className="py-12 flex flex-col items-center gap-2 text-center">
              <Receipt className="h-7 w-7 text-[#ddd]" strokeWidth={1.5} />
              <p className="text-sm text-[#aaa]">
                No transactions in this period
              </p>
            </div>
          ) : (
            <div className="divide-y divide-black/[0.04]">
              {filtered.slice(0, 20).map((o: any) => {
                const isCompleted = ["Completed", "completed"].includes(
                  o.status,
                );
                const isCancelled = ["Cancelled", "cancelled"].includes(
                  o.status,
                );
                return (
                  <div
                    key={o.id}
                    className="flex items-center gap-4 px-5 py-3.5"
                  >
                    <div
                      className={cn(
                        "h-8 w-8 rounded-xl flex items-center justify-center shrink-0",
                        isCompleted
                          ? "bg-[#f0fdf4]"
                          : isCancelled
                            ? "bg-[#fef2f2]"
                            : "bg-[#eff6ff]",
                      )}
                    >
                      {isCompleted ? (
                        <CheckCircle2
                          className="h-4 w-4 text-[#16a34a]"
                          strokeWidth={1.8}
                        />
                      ) : isCancelled ? (
                        <XCircle
                          className="h-4 w-4 text-[#dc2626]"
                          strokeWidth={1.8}
                        />
                      ) : (
                        <Clock
                          className="h-4 w-4 text-[#2563eb]"
                          strokeWidth={1.8}
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#111] truncate">
                        Order #{o.id?.slice(-6).toUpperCase() || "—"}
                      </p>
                      <p className="text-xs text-[#aaa]">
                        {o.createdAt
                          ? new Date(o.createdAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })
                          : "—"}
                        {" · "}
                        {o.status}
                      </p>
                    </div>
                    <p
                      className={cn(
                        "text-sm font-bold shrink-0",
                        isCompleted
                          ? "text-[#16a34a]"
                          : isCancelled
                            ? "text-[#dc2626]"
                            : "text-[#2563eb]",
                      )}
                    >
                      {isCancelled ? "-" : "+"}₱
                      {Number(o.totalPrice || 0).toLocaleString()}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </SellerLayout>
  );
}
