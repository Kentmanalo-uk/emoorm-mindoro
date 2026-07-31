"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { SellerLayout } from "@/components/layout/seller-layout";
import {
  Search,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Truck,
  Package,
  ChevronDown,
  ShoppingCart,
  Loader2,
  ScanLine,
  X,
  User,
  CreditCard,
  MapPin,
  ExternalLink,
} from "lucide-react";
import {
  useSupabaseAuth,
  useSupabase,
  useStableMemo,
  useCollection,
  updateDocumentNonBlocking,
} from "@/supabase";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from "next/navigation";

const statusConfig: Record<
  string,
  { icon: React.ElementType; color: string; bg: string; label: string }
> = {
  "To Pay": { icon: Clock, color: "#ca8a04", bg: "#fefce8", label: "To Pay" },
  "To Ship": {
    icon: Package,
    color: "#2563eb",
    bg: "#eff6ff",
    label: "To Ship",
  },
  "To Receive": {
    icon: Truck,
    color: "#7c3aed",
    bg: "#f5f3ff",
    label: "To Receive",
  },
  "To Pickup": {
    icon: Package,
    color: "#ea580c",
    bg: "#fff7ed",
    label: "To Pickup",
  },
  Completed: {
    icon: CheckCircle2,
    color: "#16a34a",
    bg: "#f0fdf4",
    label: "Completed",
  },
  Cancelled: {
    icon: XCircle,
    color: "#dc2626",
    bg: "#fef2f2",
    label: "Cancelled",
  },
  pending: { icon: Clock, color: "#ca8a04", bg: "#fefce8", label: "Pending" },
  processing: {
    icon: AlertCircle,
    color: "#2563eb",
    bg: "#eff6ff",
    label: "Processing",
  },
  shipped: { icon: Truck, color: "#7c3aed", bg: "#f5f3ff", label: "Shipped" },
  completed: {
    icon: CheckCircle2,
    color: "#16a34a",
    bg: "#f0fdf4",
    label: "Completed",
  },
  cancelled: {
    icon: XCircle,
    color: "#dc2626",
    bg: "#fef2f2",
    label: "Cancelled",
  },
};

export default function SellerOrdersPage() {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all");
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const scannerRef = useRef<HTMLDivElement>(null);
  const html5QrScannerRef = useRef<any>(null);
  const router = useRouter();
  const { user } = useSupabaseAuth();
  const supabase = useSupabase();

  const startScanner = useCallback(async () => {
    if (html5QrScannerRef.current) return;
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const scanner = new Html5Qrcode("qr-reader");
      html5QrScannerRef.current = scanner;
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText: string) => {
          scanner.stop().then(() => {
            html5QrScannerRef.current = null;
            setShowScanner(false);
            try {
              const url = new URL(decodedText);
              router.push(url.pathname);
            } catch {
              if (decodedText.includes("/orders/")) router.push(decodedText);
            }
          });
        },
        () => {},
      );
    } catch (err) {
      console.error("Scanner error:", err);
    }
  }, [router]);

  const stopScanner = useCallback(() => {
    if (html5QrScannerRef.current) {
      html5QrScannerRef.current
        .stop()
        .then(() => {
          html5QrScannerRef.current = null;
        })
        .catch(() => {});
    }
    setShowScanner(false);
  }, []);

  useEffect(() => {
    if (showScanner) {
      const t = setTimeout(() => startScanner(), 300);
      return () => clearTimeout(t);
    }
    return () => {
      if (html5QrScannerRef.current) {
        html5QrScannerRef.current.stop().catch(() => {});
        html5QrScannerRef.current = null;
      }
    };
  }, [showScanner, startScanner]);

  const ordersConfig = useStableMemo(() => {
    if (!user) return null;
    return {
      table: "bookings",
      filters: [{ column: "storeId", op: "eq" as const, value: user.uid }],
      order: { column: "createdAt", ascending: false },
    };
  }, [user]);
  const { data: orders, isLoading } = useCollection(ordersConfig);

  const productsConfig = useStableMemo(() => ({ table: "facilities" }), []);
  const { data: productsData } = useCollection<any>(productsConfig);

  const usersConfig = useStableMemo(() => ({ table: "users" }), []);
  const { data: usersData } = useCollection<any>(usersConfig);

  const getProduct = (facilityId: string) =>
    productsData?.find((p: any) => p.id === facilityId);
  const getBuyer = (userId: string) =>
    usersData?.find((u: any) => u.id === userId);

  const allOrders = orders ?? [];
  const filteredOrders = allOrders.filter((o: any) => {
    const product = getProduct(o.facilityId);
    const buyer = getBuyer(o.userId);
    const q = search.toLowerCase();
    const matchSearch =
      (o.id || "").toLowerCase().includes(q) ||
      (o.shippingAddress || "").toLowerCase().includes(q) ||
      (product?.name || "").toLowerCase().includes(q) ||
      (buyer?.displayName || buyer?.name || "").toLowerCase().includes(q);
    if (tab === "all") return matchSearch;
    if (tab === "Completed")
      return matchSearch && (o.status || "").toLowerCase() === "completed";
    return matchSearch && (o.status || "") === tab;
  });

  const getCount = (status: string) =>
    allOrders.filter((o: any) => (o.status || "") === status).length;
  const counts = {
    all: allOrders.length,
    "To Pay": getCount("To Pay"),
    "To Ship": getCount("To Ship"),
    "To Receive": getCount("To Receive"),
    "To Pickup": getCount("To Pickup"),
    Completed: getCount("Completed") + getCount("completed"),
    Cancelled: getCount("Cancelled"),
  };

  const [updating, setUpdating] = useState<string | null>(null);
  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    setUpdating(orderId);
    await updateDocumentNonBlocking(supabase, "bookings", orderId, {
      status: newStatus,
    });
    setTimeout(() => window.location.reload(), 500);
  };

  const statusTabs = [
    { value: "all", label: "All", count: counts.all },
    { value: "To Pay", label: "To Pay", count: counts["To Pay"] },
    { value: "To Ship", label: "To Ship", count: counts["To Ship"] },
    { value: "To Receive", label: "To Receive", count: counts["To Receive"] },
    { value: "To Pickup", label: "To Pickup", count: counts["To Pickup"] },
    { value: "Completed", label: "Completed", count: counts.Completed },
    { value: "Cancelled", label: "Cancelled", count: counts.Cancelled },
  ];

  const statCards = [
    {
      label: "To Pay",
      count: counts["To Pay"],
      color: "#ca8a04",
      bg: "#fefce8",
    },
    {
      label: "To Ship",
      count: counts["To Ship"],
      color: "#2563eb",
      bg: "#eff6ff",
    },
    {
      label: "To Receive",
      count: counts["To Receive"],
      color: "#7c3aed",
      bg: "#f5f3ff",
    },
    {
      label: "To Pickup",
      count: counts["To Pickup"],
      color: "#ea580c",
      bg: "#fff7ed",
    },
    {
      label: "Completed",
      count: counts.Completed,
      color: "#16a34a",
      bg: "#f0fdf4",
    },
  ];

  return (
    <SellerLayout>
      <div className="max-w-[1280px] mx-auto px-4 md:px-6 pt-6 pb-8 space-y-4">
        {/* Header */}
        <div className="bg-white rounded-xl border border-black/[0.06] px-6 py-5 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold text-[#111]">Shop Orders</h1>
            <p className="text-sm text-[#888]">
              {counts["To Pay"] + counts["To Ship"]} orders need attention
            </p>
          </div>
          <button
            onClick={() => setShowScanner(true)}
            className="h-9 w-9 rounded-xl border border-black/[0.08] bg-[#f2f2f0] flex items-center justify-center hover:bg-[#29a366] hover:text-white hover:border-[#29a366] transition-all"
            title="Scan COD QR"
          >
            <ScanLine className="h-4 w-4" />
          </button>
        </div>

        {/* QR Scanner Modal */}
        {showScanner && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl border border-black/[0.06] p-6 w-full max-w-md relative shadow-xl">
              <button
                className="absolute top-4 right-4 text-[#888] hover:text-[#111] z-10"
                onClick={stopScanner}
              >
                <X className="h-5 w-5" />
              </button>
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="h-9 w-9 rounded-xl flex items-center justify-center"
                  style={{ background: "#f0faf5" }}
                >
                  <ScanLine className="h-5 w-5" style={{ color: "#29a366" }} />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-[#111]">
                    Scan COD QR
                  </h2>
                  <p className="text-xs text-[#888]">
                    Point your camera at the buyer's QR code
                  </p>
                </div>
              </div>
              <div className="bg-black rounded-xl overflow-hidden">
                <div
                  id="qr-reader"
                  ref={scannerRef}
                  style={{ width: "100%" }}
                />
              </div>
              <p className="text-xs text-[#aaa] text-center mt-3">
                The QR will redirect to the order details.
              </p>
            </div>
          </div>
        )}

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {statCards.map((s) => (
            <button
              key={s.label}
              onClick={() => setTab(tab === s.label ? "all" : s.label)}
              className="bg-white rounded-xl border text-center p-4 transition-all hover:border-[#29a366]/30"
              style={{
                borderColor: tab === s.label ? "#29a366" : "rgba(0,0,0,0.06)",
              }}
            >
              <p className="text-2xl font-bold" style={{ color: s.color }}>
                {s.count}
              </p>
              <p className="text-xs text-[#888] mt-0.5">{s.label}</p>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="bg-white rounded-xl border border-black/[0.06] p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#bbb]" />
            <input
              type="text"
              placeholder="Search orders…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#f2f2f0] border border-black/[0.08] rounded-md pl-9 pr-4 py-2 text-sm text-[#111] placeholder:text-[#bbb] outline-none focus:border-[#29a366] focus:bg-white transition-all"
            />
          </div>
        </div>

        {/* Status tab pills */}
        <div
          className="flex gap-2 overflow-x-auto pb-1"
          style={{ scrollbarWidth: "none" }}
        >
          {statusTabs.map((t) => (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-all"
              style={
                tab === t.value
                  ? { background: "#29a366", color: "#fff" }
                  : {
                      background: "#fff",
                      color: "#555",
                      border: "1px solid rgba(0,0,0,0.08)",
                    }
              }
            >
              {t.label}
              {t.count > 0 && ` (${t.count})`}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-xl border border-black/[0.06] p-4 flex items-center gap-3"
              >
                <Skeleton className="h-12 w-12 rounded-xl shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-40 rounded" />
                  <Skeleton className="h-3 w-28 rounded" />
                </div>
                <Skeleton className="h-5 w-20 rounded" />
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {filteredOrders.map((order: any) => {
                const status = order.status || "To Pay";
                const cfg = statusConfig[status] || statusConfig["To Pay"];
                const StatusIcon = cfg.icon;
                const isExpanded = expandedOrder === order.id;
                const product = getProduct(order.facilityId);
                const buyer = getBuyer(order.userId);

                return (
                  <div
                    key={order.id}
                    className="bg-white rounded-xl border border-black/[0.06] overflow-hidden"
                  >
                    <button
                      className="w-full p-4 flex items-center gap-3 text-left hover:bg-[#f9f9f8] transition-colors"
                      onClick={() =>
                        setExpandedOrder(isExpanded ? null : order.id)
                      }
                    >
                      <div className="h-12 w-12 rounded-xl overflow-hidden bg-[#f2f2f0] shrink-0 border border-black/[0.06]">
                        {product?.imageUrl ? (
                          <img
                            src={product.imageUrl}
                            alt={product.name || "Product"}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="h-5 w-5 text-[#ccc]" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[#111] truncate">
                          {product?.name || `Order #${order.id?.slice(0, 8)}`}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          <span className="text-xs text-[#888]">
                            Qty:{" "}
                            <span className="font-medium text-[#333]">
                              {order.quantity || 1}
                            </span>
                          </span>
                          <span className="text-[#ddd]">·</span>
                          <span className="text-xs text-[#888] capitalize">
                            {order.paymentMethod || "cod"}
                          </span>
                          <span className="text-[#ddd]">·</span>
                          <span className="text-xs text-[#888] inline-flex items-center gap-0.5">
                            {order.fulfillmentMethod === "pickup" ? (
                              <>
                                <Package className="h-3 w-3" /> Pickup
                              </>
                            ) : (
                              <>
                                <Truck className="h-3 w-3" /> Delivery
                              </>
                            )}
                          </span>
                        </div>
                        <span className="text-[11px] text-[#aaa] inline-flex items-center gap-0.5 mt-0.5">
                          <User className="h-3 w-3" />
                          {buyer
                            ? [buyer.firstName, buyer.lastName]
                                .filter(Boolean)
                                .join(" ") ||
                              buyer.email ||
                              "Buyer"
                            : "Buyer"}
                        </span>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <p className="text-sm font-bold text-[#111]">
                          ₱{Number(order.totalPrice || 0).toLocaleString()}
                        </p>
                        <span
                          className="text-[10px] font-semibold px-2 py-0.5 rounded"
                          style={{ color: cfg.color, background: cfg.bg }}
                        >
                          {cfg.label}
                        </span>
                        <ChevronDown
                          className="h-3.5 w-3.5 text-[#bbb] transition-transform"
                          style={{
                            transform: isExpanded ? "rotate(180deg)" : "none",
                          }}
                        />
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="px-4 pb-4 border-t border-black/[0.04]">
                        <div className="pt-3 space-y-2.5">
                          {[
                            [
                              "Order ID",
                              <span className="font-mono text-xs">
                                {order.id?.slice(0, 12)}
                              </span>,
                            ],
                            [
                              "Buyer",
                              buyer
                                ? [buyer.firstName, buyer.lastName]
                                    .filter(Boolean)
                                    .join(" ") || "—"
                                : "—",
                            ],
                            buyer?.mobile && [
                              "Phone",
                              buyer.mobile || buyer.phone,
                            ],
                            buyer?.email && [
                              "Email",
                              <span className="truncate max-w-[180px] inline-block">
                                {buyer.email}
                              </span>,
                            ],
                            [
                              "Status",
                              <span
                                className="text-[10px] font-semibold px-2 py-0.5 rounded"
                                style={{ color: cfg.color, background: cfg.bg }}
                              >
                                {cfg.label}
                              </span>,
                            ],
                            [
                              "Fulfillment",
                              order.fulfillmentMethod === "pickup"
                                ? "Pickup at shop"
                                : order.shippingAddress || "N/A",
                            ],
                            [
                              "Payment",
                              <span className="capitalize">
                                {order.paymentMethod || "cod"}
                              </span>,
                            ],
                          ]
                            .filter(Boolean)
                            .map((row: any, i) => (
                              <div
                                key={i}
                                className="flex items-center justify-between gap-4"
                              >
                                <span className="text-xs text-[#888] shrink-0">
                                  {row[0]}
                                </span>
                                <span className="text-xs text-[#333] text-right">
                                  {row[1]}
                                </span>
                              </div>
                            ))}

                          {order.fulfillmentMethod !== "pickup" &&
                            order.shippingAddress && (
                              <div className="flex gap-2 p-2.5 bg-[#f2f2f0] rounded-xl border border-black/[0.06]">
                                <MapPin className="h-3.5 w-3.5 text-[#888] shrink-0 mt-0.5" />
                                <span className="text-xs text-[#333] leading-relaxed">
                                  {order.shippingAddress}
                                </span>
                              </div>
                            )}

                          {order.paymentMethod === "gcash" && (
                            <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 space-y-1.5">
                              <span className="text-xs font-semibold text-blue-700 flex items-center gap-1">
                                <CreditCard className="h-3.5 w-3.5" /> GCash
                                Payment
                              </span>
                              {order.gcashProofUrl ? (
                                <img
                                  src={order.gcashProofUrl}
                                  alt="GCash Proof"
                                  className="w-28 h-28 object-contain rounded border border-blue-200 bg-white"
                                />
                              ) : (
                                <span className="text-xs text-[#888]">
                                  No proof yet
                                </span>
                              )}
                              <span className="text-xs text-[#555]">
                                Ref:{" "}
                                <span className="font-mono font-bold">
                                  {order.gcashRef || "N/A"}
                                </span>
                              </span>
                            </div>
                          )}
                          {order.paymentMethod === "qrph" && (
                            <div className="p-3 bg-[#f2f2f0] rounded-xl border border-black/[0.06] space-y-1.5">
                              <span className="text-xs font-semibold text-[#333]">
                                QR PH Payment
                              </span>
                              {order.qrphProofUrl ? (
                                <img
                                  src={order.qrphProofUrl}
                                  alt="QR PH Proof"
                                  className="w-28 h-28 object-contain border rounded"
                                />
                              ) : (
                                <span className="text-xs text-[#888]">
                                  No proof yet
                                </span>
                              )}
                              <span className="text-xs text-[#555]">
                                Ref:{" "}
                                <span className="font-mono">
                                  {order.qrphRef || "N/A"}
                                </span>
                              </span>
                            </div>
                          )}

                          <button
                            className="w-full h-8 rounded-xl border border-black/[0.08] text-xs font-semibold text-[#555] hover:bg-[#f2f2f0] transition-colors flex items-center justify-center gap-1.5 mt-1"
                            onClick={() => router.push(`/orders/${order.id}`)}
                          >
                            <ExternalLink className="h-3 w-3" /> View Full Order
                            Details
                          </button>

                          <div className="flex gap-2 pt-1">
                            {status === "To Pay" && (
                              <>
                                {order.paymentMethod === "gcash" &&
                                order.gcashProofUrl ? (
                                  <button
                                    disabled={updating === order.id}
                                    onClick={() =>
                                      handleUpdateStatus(order.id, "To Ship")
                                    }
                                    className="flex-1 h-9 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 flex items-center justify-center gap-1.5"
                                  >
                                    {updating === order.id ? (
                                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                      <>
                                        <CheckCircle2 className="h-3.5 w-3.5" />{" "}
                                        Confirm GCash
                                      </>
                                    )}
                                  </button>
                                ) : (
                                  <button
                                    disabled={updating === order.id}
                                    onClick={() =>
                                      handleUpdateStatus(order.id, "To Ship")
                                    }
                                    className="flex-1 h-9 rounded-xl text-xs font-semibold text-white disabled:opacity-60 flex items-center justify-center gap-1.5"
                                    style={{ background: "#29a366" }}
                                  >
                                    {updating === order.id ? (
                                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                      "Accept Order"
                                    )}
                                  </button>
                                )}
                                <button
                                  disabled={updating === order.id}
                                  onClick={() =>
                                    handleUpdateStatus(order.id, "Cancelled")
                                  }
                                  className="flex-1 h-9 rounded-xl text-xs font-semibold text-[#555] border border-black/[0.08] hover:bg-[#f2f2f0] disabled:opacity-60"
                                >
                                  Decline
                                </button>
                              </>
                            )}
                            {status === "To Ship" &&
                              (order.fulfillmentMethod === "pickup" ? (
                                <button
                                  disabled={updating === order.id}
                                  onClick={() =>
                                    handleUpdateStatus(order.id, "To Pickup")
                                  }
                                  className="flex-1 h-9 rounded-xl text-xs font-semibold text-white disabled:opacity-60 flex items-center justify-center gap-1.5"
                                  style={{ background: "#29a366" }}
                                >
                                  {updating === order.id ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <>
                                      <Package className="h-3.5 w-3.5" /> Ready
                                      for Pickup
                                    </>
                                  )}
                                </button>
                              ) : (
                                <button
                                  disabled={updating === order.id}
                                  onClick={() =>
                                    handleUpdateStatus(order.id, "To Receive")
                                  }
                                  className="flex-1 h-9 rounded-xl text-xs font-semibold text-white disabled:opacity-60 flex items-center justify-center gap-1.5"
                                  style={{ background: "#29a366" }}
                                >
                                  {updating === order.id ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <>
                                      <Truck className="h-3.5 w-3.5" /> Mark as
                                      Shipped
                                    </>
                                  )}
                                </button>
                              ))}
                            {status === "To Pickup" && (
                              <button
                                disabled={updating === order.id}
                                onClick={() =>
                                  handleUpdateStatus(order.id, "Completed")
                                }
                                className="flex-1 h-9 rounded-xl text-xs font-semibold text-white bg-[#16a34a] hover:bg-green-700 disabled:opacity-60 flex items-center justify-center gap-1.5"
                              >
                                {updating === order.id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <>
                                    <CheckCircle2 className="h-3.5 w-3.5" />{" "}
                                    Picked Up — Complete
                                  </>
                                )}
                              </button>
                            )}
                            {status === "To Receive" && (
                              <button
                                disabled={updating === order.id}
                                onClick={() =>
                                  handleUpdateStatus(order.id, "Completed")
                                }
                                className="flex-1 h-9 rounded-xl text-xs font-semibold text-white bg-[#16a34a] hover:bg-green-700 disabled:opacity-60 flex items-center justify-center gap-1.5"
                              >
                                {updating === order.id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <>
                                    <CheckCircle2 className="h-3.5 w-3.5" />{" "}
                                    Mark as Delivered
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {filteredOrders.length === 0 && (
              <div className="bg-white rounded-xl border border-black/[0.06] py-16 flex flex-col items-center gap-3">
                <ShoppingCart
                  className="h-10 w-10 text-[#ddd]"
                  strokeWidth={1.5}
                />
                <p className="text-sm text-[#888]">No orders found</p>
              </div>
            )}
          </>
        )}
      </div>
    </SellerLayout>
  );
}
