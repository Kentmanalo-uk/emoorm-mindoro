"use client";

import React, { useState, useMemo } from "react";
import { SellerLayout } from "@/components/layout/seller-layout";
import {
  Plus,
  Search,
  Trash2,
  Eye,
  EyeOff,
  Package,
  Star,
  ImageIcon,
  Pencil,
  Copy,
  Share2,
  Gavel,
  ArrowUpDown,
  SlidersHorizontal,
  X,
  Heart,
  MessageSquare,
  ChevronDown,
  Info,
  CheckSquare,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useSupabaseAuth,
  useSupabase,
  useStableMemo,
  useCollection,
  updateDocumentNonBlocking,
  deleteDocumentNonBlocking,
} from "@/supabase";
import { Skeleton } from "@/components/ui/skeleton";

const CATEGORIES = [
  "All Categories",
  "Vegetables",
  "Fruits",
  "Seafood",
  "Meat",
  "Snacks",
  "Rice & Grains",
  "Handicrafts",
  "Wellness",
  "Delicacies",
  "Beverages",
  "Condiments",
];

const SORT_OPTIONS = [
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" },
  { value: "price_hi", label: "Price: High → Low" },
  { value: "price_lo", label: "Price: Low → High" },
  { value: "sales", label: "Most Sold" },
  { value: "stock_lo", label: "Low Stock" },
  { value: "name", label: "Name A–Z" },
];

const STATUS_TABS = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "draft", label: "Draft" },
  { value: "out", label: "Out of Stock" },
];

function getStatus(p: any) {
  if (p.stock === 0) return "Out of Stock";
  if (p.status === "Draft" || p.status === "draft") return "Draft";
  return "Available";
}

function ContentScore({ product }: { product: any }) {
  const score = useMemo(() => {
    let s = 0;
    if (product.name?.length > 5) s += 20;
    if (product.description?.length > 20) s += 20;
    if (product.imageUrl) s += 20;
    if (product.price > 0) s += 20;
    if (product.category) s += 20;
    return s;
  }, [product]);

  if (score >= 100)
    return (
      <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
        <span className="h-2 w-2 rounded-full bg-green-500 inline-block" />
        Excellent
      </span>
    );
  if (score >= 60)
    return (
      <span className="flex items-center gap-1 text-xs text-yellow-600 font-medium">
        <span className="h-2 w-2 rounded-full bg-yellow-400 inline-block" />
        Good
      </span>
    );
  return (
    <span className="flex items-center gap-1 text-xs text-orange-500 font-medium">
      <span className="h-2 w-2 rounded-full bg-orange-400 inline-block" />
      To be Improved
    </span>
  );
}

function Toggle({
  active,
  onToggle,
}: {
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none"
      style={{ background: active ? "#29a366" : "#d1d5db" }}
    >
      <span
        className="pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition duration-200 ease-in-out"
        style={{ transform: active ? "translateX(20px)" : "translateX(0)" }}
      />
    </button>
  );
}

export default function SellerProductsPage() {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all");
  const [category, setCategory] = useState("All Categories");
  const [sort, setSort] = useState("newest");
  const [type, setType] = useState("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const router = useRouter();
  const { user } = useSupabaseAuth();
  const supabase = useSupabase();

  const config = useStableMemo(() => {
    if (!user) return null;
    return {
      table: "facilities",
      filters: [{ column: "sellerId", op: "eq" as const, value: user.uid }],
      order: { column: "createdAt", ascending: false },
    };
  }, [user]);
  const { data: products, isLoading } = useCollection(config);
  const all = (products ?? []) as any[];

  const counts = useMemo(
    () => ({
      all: all.length,
      active: all.filter((p) => getStatus(p) === "Available").length,
      draft: all.filter((p) => getStatus(p) === "Draft").length,
      out: all.filter((p) => getStatus(p) === "Out of Stock").length,
    }),
    [all],
  );

  const filtered = useMemo(() => {
    let list = [...all];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name?.toLowerCase().includes(q) ||
          p.category?.toLowerCase().includes(q),
      );
    }
    if (tab === "active")
      list = list.filter((p) => getStatus(p) === "Available");
    if (tab === "draft") list = list.filter((p) => getStatus(p) === "Draft");
    if (tab === "out")
      list = list.filter((p) => getStatus(p) === "Out of Stock");
    if (category !== "All Categories")
      list = list.filter((p) => p.category === category);
    if (type === "auction") list = list.filter((p) => !!p.isAuction);
    if (type === "regular") list = list.filter((p) => !p.isAuction);
    switch (sort) {
      case "oldest":
        list.sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt));
        break;
      case "price_hi":
        list.sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
        break;
      case "price_lo":
        list.sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
        break;
      case "sales":
        list.sort(
          (a, b) =>
            (b.totalSales ?? b.sold ?? 0) - (a.totalSales ?? a.sold ?? 0),
        );
        break;
      case "stock_lo":
        list.sort((a, b) => (a.stock ?? 0) - (b.stock ?? 0));
        break;
      case "name":
        list.sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
        break;
      default:
        list.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
    }
    return list;
  }, [all, search, tab, category, type, sort]);

  const allSelected =
    filtered.length > 0 && filtered.every((p) => selected.has(p.id));
  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(filtered.map((p: any) => p.id)));
  };
  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this product?")) return;
    deleteDocumentNonBlocking(supabase, "facilities", id);
    window.location.reload();
  };
  const handleDuplicate = async (product: any) => {
    const { id, createdAt, updatedAt, totalSales, rating, ...rest } = product;
    await supabase
      .from("facilities")
      .insert({
        ...rest,
        name: `${product.name} (Copy)`,
        status: "Draft",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        totalSales: 0,
      });
    window.location.reload();
  };
  const handleShare = (product: any) => {
    const url = `${window.location.origin}/book/${product.id}`;
    if (navigator.share) navigator.share({ title: product.name, url });
    else {
      navigator.clipboard.writeText(url);
      alert("Link copied!");
    }
  };
  const handleToggleActive = async (id: string, status: string) => {
    const next =
      status === "Available" || status === "active" ? "Draft" : "Available";
    updateDocumentNonBlocking(supabase, "facilities", id, {
      status: next,
      updatedAt: new Date().toISOString(),
    });
    window.location.reload();
  };
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <SellerLayout>
      <div
        className="max-w-[1200px] mx-auto px-4 md:px-6 pt-6 pb-10 space-y-4"
        onClick={() => setOpenMenu(null)}
      >
        {/* Header */}
        <div className="bg-white rounded-xl border border-black/[0.06] px-6 py-5 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold text-[#111]">My Products</h1>
            <p className="text-sm text-[#888]">{all.length} total products</p>
          </div>
          <Link href="/seller/products/add">
            <button
              className="flex items-center gap-2 h-9 px-5 rounded-xl text-white text-sm font-semibold hover:opacity-90 transition-opacity"
              style={{ background: "#29a366" }}
            >
              <Plus className="h-4 w-4" /> Add Product
            </button>
          </Link>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-black/[0.06] p-4 space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#bbb]" />
              <input
                type="text"
                placeholder="Search by name or category…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-[#f2f2f0] border border-black/[0.08] rounded-xl pl-9 pr-9 py-2 text-sm text-[#111] placeholder:text-[#bbb] outline-none focus:border-[#29a366] focus:bg-white transition-all"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#bbb] hover:text-[#555]"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            {/* Sort */}
            <div className="relative">
              <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#bbb] pointer-events-none" />
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="appearance-none bg-[#f2f2f0] border border-black/[0.08] rounded-xl pl-8 pr-7 py-2 text-sm text-[#555] outline-none focus:border-[#29a366] transition-all cursor-pointer"
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Status tabs */}
            {STATUS_TABS.map((t) => (
              <button
                key={t.value}
                onClick={() => setTab(t.value)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                style={
                  tab === t.value
                    ? { background: "#29a366", color: "#fff" }
                    : { background: "#f2f2f0", color: "#555" }
                }
              >
                {t.label} ({counts[t.value as keyof typeof counts]})
              </button>
            ))}

            <div className="h-4 w-px bg-black/[0.08]" />

            {/* Category */}
            <div className="relative">
              <SlidersHorizontal className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#bbb] pointer-events-none" />
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="appearance-none bg-[#f2f2f0] border border-black/[0.08] rounded-xl pl-8 pr-6 py-1.5 text-xs font-semibold text-[#555] outline-none focus:border-[#29a366] transition-all cursor-pointer"
                style={
                  category !== "All Categories"
                    ? {
                        borderColor: "#29a366",
                        background: "#f0fdf4",
                        color: "#16a34a",
                      }
                    : {}
                }
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Type */}
            {[
              { v: "all", l: "All" },
              { v: "regular", l: "Regular" },
              { v: "auction", l: "Auction" },
            ].map((o) => (
              <button
                key={o.v}
                onClick={() => setType(o.v)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                style={
                  type === o.v
                    ? { background: "#111", color: "#fff" }
                    : { background: "#f2f2f0", color: "#555" }
                }
              >
                {o.l}
              </button>
            ))}

            {(category !== "All Categories" ||
              type !== "all" ||
              sort !== "newest") && (
              <button
                onClick={() => {
                  setCategory("All Categories");
                  setType("all");
                  setSort("newest");
                }}
                className="text-xs text-[#aaa] hover:text-red-500 underline transition-colors"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>

        {/* Bulk action bar */}
        {selected.size > 0 && (
          <div className="bg-[#111] text-white rounded-xl px-5 py-3 flex items-center gap-4 text-sm">
            <CheckSquare className="h-4 w-4 text-[#29a366]" />
            <span className="font-medium">{selected.size} selected</span>
            <button
              onClick={() => {
                if (confirm(`Delete ${selected.size} products?`)) {
                  selected.forEach((id) =>
                    deleteDocumentNonBlocking(supabase, "facilities", id),
                  );
                  window.location.reload();
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors text-xs font-semibold"
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete Selected
            </button>
            <button
              onClick={() => setSelected(new Set())}
              className="ml-auto text-[#888] hover:text-white transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <p className="text-xs text-[#aaa] px-1">
          Showing {filtered.length} of {all.length} products
        </p>

        {/* Table */}
        {isLoading ? (
          <div className="bg-white rounded-xl border border-black/[0.06] divide-y divide-black/[0.04]">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4">
                <Skeleton className="h-4 w-4 rounded" />
                <Skeleton className="h-14 w-14 rounded-xl shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48 rounded" />
                  <Skeleton className="h-3 w-32 rounded" />
                </div>
                <Skeleton className="h-4 w-16 rounded" />
                <Skeleton className="h-4 w-12 rounded" />
                <Skeleton className="h-6 w-11 rounded-full" />
                <Skeleton className="h-4 w-24 rounded" />
                <Skeleton className="h-4 w-12 rounded" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-black/[0.06] py-16 flex flex-col items-center gap-3">
            <Package className="h-10 w-10 text-[#ddd]" strokeWidth={1.5} />
            <p className="text-sm font-medium text-[#888]">No products found</p>
            <p className="text-xs text-[#bbb]">
              Try adjusting your filters or search
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-black/[0.06] overflow-hidden">
            {/* Column headers */}
            <div
              className="grid items-center border-b border-black/[0.06] bg-[#fafafa] px-4 py-3"
              style={{
                gridTemplateColumns: "40px 1fr 120px 90px 80px 130px 80px",
              }}
            >
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleAll}
                className="h-4 w-4 rounded border-gray-300 accent-[#29a366] cursor-pointer"
              />
              <span className="text-[11px] font-bold text-[#aaa] ">
                Product Info
              </span>
              <span className="text-[11px] font-bold text-[#aaa] ">Price</span>
              <span className="text-[11px] font-bold text-[#aaa] flex items-center gap-1">
                Stock <Info className="h-3 w-3" />
              </span>
              <span className="text-[11px] font-bold text-[#aaa] ">Active</span>
              <span className="text-[11px] font-bold text-[#aaa] flex items-center gap-1">
                Content Score
              </span>
              <div />
            </div>

            <div className="divide-y divide-black/[0.04]">
              {filtered.map((product: any) => {
                const status = getStatus(product);
                const isActive = status === "Available";
                const isOpen = openMenu === product.id;
                const sales = product.totalSales ?? product.sold ?? 0;
                const views = product.views ?? 0;
                const rating = product.rating ?? 0;

                return (
                  <div
                    key={product.id}
                    className="grid items-center px-4 py-4 hover:bg-[#fafafa] transition-colors relative"
                    style={{
                      gridTemplateColumns:
                        "40px 1fr 120px 90px 80px 130px 80px",
                    }}
                  >
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={selected.has(product.id)}
                      onChange={() => toggleOne(product.id)}
                      className="h-4 w-4 rounded border-gray-300 accent-[#29a366] cursor-pointer"
                      onClick={(e) => e.stopPropagation()}
                    />

                    {/* Product Info */}
                    <div className="flex items-start gap-3 min-w-0 pr-4">
                      <div className="h-[60px] w-[60px] rounded-xl bg-[#f2f2f0] overflow-hidden shrink-0 flex items-center justify-center border border-black/[0.06]">
                        {product.imageUrl ? (
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <ImageIcon className="h-5 w-5 text-[#ccc]" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-[#111] line-clamp-1 leading-snug">
                          {product.name}
                        </p>
                        {/* Product ID */}
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="text-[11px] text-[#aaa]">
                            ID: {String(product.id).slice(0, 12)}…
                          </span>
                          <button
                            onClick={() => copyToClipboard(product.id)}
                            className="text-[#ccc] hover:text-[#29a366] transition-colors"
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                        </div>
                        {/* Category / SKU */}
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="text-[11px] text-[#aaa]">
                            {product.category || "No category"}
                          </span>
                          {product.isAuction && (
                            <span
                              className="text-[9px] font-bold px-1.5 py-0.5 rounded-lg text-white flex items-center gap-0.5 shrink-0"
                              style={{ background: "#29a366" }}
                            >
                              <Gavel className="h-2.5 w-2.5" /> Auction
                            </span>
                          )}
                        </div>
                        {/* Stats row */}
                        <div className="flex items-center gap-3 mt-1.5">
                          <span className="flex items-center gap-0.5 text-[11px] text-[#bbb]">
                            <Heart className="h-3 w-3" /> {sales}
                          </span>
                          <span className="flex items-center gap-0.5 text-[11px] text-[#bbb]">
                            <MessageSquare className="h-3 w-3" />{" "}
                            {product.reviewCount ?? 0}
                          </span>
                          <span className="flex items-center gap-0.5 text-[11px] text-[#bbb]">
                            <Eye className="h-3 w-3" /> {views}
                          </span>
                          <span className="flex items-center gap-0.5 text-[11px] text-[#bbb]">
                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />{" "}
                            {Number(rating).toFixed(1)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Price */}
                    <div>
                      {product.isAuction ? (
                        <div>
                          <div className="flex items-center gap-1">
                            <span
                              className="text-sm font-semibold"
                              style={{ color: "#29a366" }}
                            >
                              ₱
                              {Number(
                                product.currentBid || product.startingBid || 0,
                              ).toLocaleString()}
                            </span>
                            <button
                              onClick={() =>
                                router.push(
                                  `/seller/products/add?edit=${product.id}`,
                                )
                              }
                              className="text-[#bbb] hover:text-[#29a366]"
                            >
                              <Pencil className="h-3 w-3" />
                            </button>
                          </div>
                          <p className="text-[11px] text-[#bbb] mt-0.5">
                            {product.bidCount || 0} bids
                          </p>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <span className="text-sm font-semibold text-[#111]">
                            ₱{Number(product.price || 0).toLocaleString()}
                          </span>
                          <button
                            onClick={() =>
                              router.push(
                                `/seller/products/add?edit=${product.id}`,
                              )
                            }
                            className="text-[#bbb] hover:text-[#29a366] transition-colors"
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Stock */}
                    <div className="flex items-center gap-1">
                      <span
                        className={`text-sm font-medium ${(product.stock ?? 0) <= 5 && (product.stock ?? 0) > 0 ? "text-orange-500" : (product.stock ?? 0) === 0 ? "text-red-500" : "text-[#333]"}`}
                      >
                        {product.stock ?? "—"}
                      </span>
                      <button
                        onClick={() =>
                          router.push(`/seller/products/add?edit=${product.id}`)
                        }
                        className="text-[#bbb] hover:text-[#29a366] transition-colors"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                    </div>

                    {/* Active toggle */}
                    <div>
                      <Toggle
                        active={isActive}
                        onToggle={() => handleToggleActive(product.id, status)}
                      />
                    </div>

                    {/* Content Score */}
                    <div className="flex items-center gap-1">
                      <ContentScore product={product} />
                      <Info className="h-3 w-3 text-[#ccc]" />
                    </div>

                    {/* Actions */}
                    <div
                      className="flex items-center gap-1 justify-end relative"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() =>
                          router.push(`/seller/products/add?edit=${product.id}`)
                        }
                        className="text-xs font-semibold text-[#29a366] hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setOpenMenu(isOpen ? null : product.id)}
                        className="flex items-center gap-0.5 text-xs font-semibold text-[#555] hover:text-[#111] transition-colors"
                      >
                        More{" "}
                        <ChevronDown
                          className={`h-3 w-3 transition-transform ${isOpen ? "rotate-180" : ""}`}
                        />
                      </button>

                      {isOpen && (
                        <div className="absolute right-0 top-7 w-44 bg-white rounded-xl border border-black/[0.08] shadow-lg z-30 overflow-hidden">
                          <button
                            onClick={() => {
                              handleDuplicate(product);
                              setOpenMenu(null);
                            }}
                            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-[#333] hover:bg-[#f2f2f0] transition-colors"
                          >
                            <Copy className="h-3.5 w-3.5 text-[#999]" />{" "}
                            Duplicate
                          </button>
                          <button
                            onClick={() => {
                              handleShare(product);
                              setOpenMenu(null);
                            }}
                            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-[#333] hover:bg-[#f2f2f0] transition-colors"
                          >
                            <Share2 className="h-3.5 w-3.5 text-[#999]" /> Share
                            Link
                          </button>
                          <button
                            onClick={() => {
                              handleToggleActive(product.id, status);
                              setOpenMenu(null);
                            }}
                            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-[#333] hover:bg-[#f2f2f0] transition-colors"
                          >
                            {isActive ? (
                              <EyeOff className="h-3.5 w-3.5 text-[#999]" />
                            ) : (
                              <Eye className="h-3.5 w-3.5 text-[#999]" />
                            )}
                            {isActive ? "Deactivate" : "Activate"}
                          </button>
                          <div className="border-t border-black/[0.04]" />
                          <button
                            onClick={() => {
                              handleDelete(product.id);
                              setOpenMenu(null);
                            }}
                            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </SellerLayout>
  );
}
