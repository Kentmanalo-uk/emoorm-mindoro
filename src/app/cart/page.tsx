"use client";

import React, { useMemo, useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import {
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  Store,
  Check,
  ChevronRight,
  ArrowUpDown,
} from "lucide-react";
import { FirstTimeIntro } from "@/components/first-time-intro";
import { useUser, useSupabase, useCollection, useStableMemo } from "@/supabase";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";

interface CartItem {
  id: string;
  productId: string;
  quantity: number;
}
interface Product {
  id: string;
  name: string;
  price: number;
  pricePerNight?: number;
  imageUrl: string;
  stock: number;
  storeId?: string;
  sellerId?: string;
  sellerName?: string;
}
interface StoreData {
  id: string;
  name: string;
}

function CartPageInner() {
  const { user, isUserLoading } = useUser();
  const supabase = useSupabase();
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get("q")?.toLowerCase().trim() || "";
  const [sortBy, setSortBy] = useState<"default" | "price-asc" | "price-desc" | "name">("default");

  const cartQuery = useStableMemo(() => {
    if (!user) return null;
    return {
      table: "cart_items",
      filters: [{ column: "userId", op: "eq" as const, value: user.uid }],
    };
  }, [user]);
  const { data: cartData, isLoading: cartLoading } =
    useCollection<CartItem>(cartQuery);

  const productsQuery = useStableMemo(() => ({ table: "facilities" }), []);
  const { data: productsData } = useCollection<Product>(productsQuery);

  const storesQuery = useStableMemo(() => ({ table: "stores" }), []);
  const { data: storesData } = useCollection<StoreData>(storesQuery);

  const cartItems = useMemo(() => {
    if (!cartData || !productsData) return [];
    return cartData
      .map((c) => {
        const product = productsData.find((p) => p.id === c.productId);
        return product ? { ...c, product } : null;
      })
      .filter(Boolean) as (CartItem & { product: Product })[];
  }, [cartData, productsData]);

  const groupedByStore = useMemo(() => {
    const groups: Record<
      string,
      { storeName: string; items: typeof cartItems }
    > = {};
    cartItems.forEach((item) => {
      const key =
        item.product.storeId || item.product.sellerId || "independent";
      if (!groups[key]) {
        const store = storesData?.find((s) => s.id === item.product.storeId);
        groups[key] = {
          storeName:
            store?.name || item.product.sellerName || "Independent Seller",
          items: [],
        };
      }
      groups[key].items.push(item);
    });
    return groups;
  }, [cartItems, storesData]);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [buyNowPendingId, setBuyNowPendingId] = useState<string | null>(null);

  // On mount, check if we came from "Buy Now" and grab the target cart item ID
  useEffect(() => {
    const id = localStorage.getItem("buy_now_cart_id");
    if (id) {
      setBuyNowPendingId(id);
      localStorage.removeItem("buy_now_cart_id");
    }
  }, []);

  useEffect(() => {
    if (cartItems.length === 0) return;
    const validIds = new Set(cartItems.map((i) => i.id));

    if (buyNowPendingId && validIds.has(buyNowPendingId)) {
      // Buy Now flow: pre-select only the bought item
      setSelectedIds(new Set([buyNowPendingId]));
      setBuyNowPendingId(null);
      return;
    }

    setSelectedIds((prev) => {
      if (prev.size === 0) return validIds;
      const next = new Set<string>();
      prev.forEach((id) => { if (validIds.has(id)) next.add(id); });
      return next;
    });
  }, [cartItems, buyNowPendingId]);

  const toggleItem = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleStoreGroup = useCallback((itemIds: string[]) => {
    setSelectedIds((prev) => {
      const allSelected = itemIds.every((id) => prev.has(id));
      const next = new Set(prev);
      if (allSelected) {
        itemIds.forEach((id) => next.delete(id));
      } else {
        itemIds.forEach((id) => next.add(id));
      }
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setSelectedIds((prev) => {
      const allSelected =
        cartItems.length > 0 && cartItems.every((i) => prev.has(i.id));
      return allSelected
        ? new Set<string>()
        : new Set(cartItems.map((i) => i.id));
    });
  }, [cartItems]);

  const filteredGrouped = useMemo(() => {
    const sortFn = (a: typeof cartItems[number], b: typeof cartItems[number]) => {
      const pa = a.product.price || a.product.pricePerNight || 0;
      const pb = b.product.price || b.product.pricePerNight || 0;
      if (sortBy === "price-asc") return pa - pb;
      if (sortBy === "price-desc") return pb - pa;
      if (sortBy === "name") return a.product.name.localeCompare(b.product.name);
      return 0;
    };
    const result: typeof groupedByStore = {};
    Object.entries(groupedByStore).forEach(([key, group]) => {
      const filtered = group.items
        .filter(i => !searchQuery || i.product.name.toLowerCase().includes(searchQuery))
        .sort(sortFn);
      if (filtered.length > 0) result[key] = { ...group, items: filtered };
    });
    return result;
  }, [groupedByStore, searchQuery, sortBy]);

  const selectedItems = useMemo(
    () => cartItems.filter((i) => selectedIds.has(i.id)),
    [cartItems, selectedIds],
  );
  const totalPrice = useMemo(
    () =>
      selectedItems.reduce(
        (sum, item) =>
          sum +
          (item.product.price || item.product.pricePerNight || 0) *
            item.quantity,
        0,
      ),
    [selectedItems],
  );

  const updateQuantity = async (cartItemId: string, quantity: number) => {
    if (quantity < 1) {
      await supabase.from("cart_items").delete().eq("id", cartItemId);
    } else {
      await supabase
        .from("cart_items")
        .update({ quantity, updatedAt: new Date().toISOString() })
        .eq("id", cartItemId);
    }
  };

  const removeItem = async (cartItemId: string) => {
    await supabase.from("cart_items").delete().eq("id", cartItemId);
  };

  if (isUserLoading)
    return (
      <div className="flex min-h-screen flex-col" style={{ backgroundColor: "#f2f2f0" }}>
        <Header />
        <main className="flex-grow pt-20 md:pt-6">
          <div className="max-w-[1280px] mx-auto px-4 md:px-8 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-white rounded-[5px] border border-black/[0.06] p-4 flex gap-4">
                <Skeleton className="h-20 w-20 rounded-[5px] shrink-0" />
                <div className="flex-1 space-y-2 pt-1">
                  <Skeleton className="h-4 w-3/4 rounded" />
                  <Skeleton className="h-3 w-1/3 rounded" />
                </div>
              </div>
            ))}
          </div>
        </main>
        <Footer />
      </div>
    );

  if (!user)
    return (
      <div className="flex min-h-screen flex-col" style={{ backgroundColor: "#f2f2f0" }}>
        <Header />
        <main className="flex-grow pt-20 md:pt-6">
          <div className="max-w-[1280px] mx-auto px-4 md:px-8">
            <div className="bg-white rounded-[5px] border border-black/[0.06] py-20 flex flex-col items-center text-center gap-4">
              <ShoppingCart className="h-12 w-12 text-[#ddd]" strokeWidth={1.5} />
              <div>
                <h2 className="text-base font-semibold text-[#111] mb-1">Your Cart</h2>
                <p className="text-sm text-[#888]">Sign in to start shopping.</p>
              </div>
              <Link href="/login">
                <button className="h-10 px-8 rounded-[5px] text-white text-sm font-semibold" style={{ background: "#29a366" }}>
                  Sign In
                </button>
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );

  return (
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: "#f2f2f0" }}>
      <Header />
      <main className="flex-grow pt-20 md:pt-6">
        <div className="max-w-[1280px] mx-auto px-4 md:px-8 pb-32">

          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-xs text-[#999] mb-4">
            <Link href="/" className="hover:text-[#29a366] transition-colors">Home</Link>
            <ChevronRight className="h-3 w-3 shrink-0" />
            <span className="text-[#555] font-medium">My Cart</span>
            {cartItems.length > 0 && (
              <span className="text-[#bbb]">({cartItems.length})</span>
            )}
          </nav>

          {cartLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="bg-white rounded-[5px] border border-black/[0.06] p-4 flex gap-4">
                  <Skeleton className="h-20 w-20 rounded-[5px] shrink-0" />
                  <div className="flex-1 space-y-2 pt-1">
                    <Skeleton className="h-4 w-3/4 rounded" />
                    <Skeleton className="h-3 w-1/3 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : cartItems.length === 0 ? (
            <div className="bg-white rounded-[5px] border border-black/[0.06] py-20 flex flex-col items-center text-center gap-4">
              <ShoppingCart className="h-12 w-12 text-[#ddd]" strokeWidth={1.5} />
              <p className="text-sm text-[#888]">Your cart is empty.</p>
              <Link href="/">
                <button className="h-10 px-8 rounded-[5px] text-white text-sm font-semibold" style={{ background: "#29a366" }}>
                  Browse Products
                </button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">

              {/* Select-all bar + sort */}
              <div className="bg-white rounded-[5px] border border-black/[0.06] px-4 py-3 flex items-center gap-3">
                <button
                  onClick={toggleAll}
                  className="flex items-center justify-center h-5 w-5 rounded border-2 transition-all shrink-0"
                  style={cartItems.every((i) => selectedIds.has(i.id)) ? { background: "#29a366", borderColor: "#29a366" } : { borderColor: "rgba(0,0,0,0.2)" }}
                >
                  {cartItems.every((i) => selectedIds.has(i.id)) && <Check className="h-3 w-3 text-white" />}
                </button>
                <span className="text-sm font-medium text-[#333]">Select All</span>
                <span className="text-xs text-[#aaa]">{selectedIds.size}/{cartItems.length} selected</span>
                <div className="ml-auto flex items-center gap-2">
                  <ArrowUpDown className="h-3.5 w-3.5 text-[#bbb] shrink-0" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                    className="text-xs text-[#555] border border-black/[0.10] rounded-[5px] px-2 py-1 bg-white focus:outline-none focus:border-[#29a366] cursor-pointer"
                  >
                    <option value="default">Default</option>
                    <option value="price-asc">Price: Low → High</option>
                    <option value="price-desc">Price: High → Low</option>
                    <option value="name">Name A–Z</option>
                  </select>
                </div>
              </div>

              {/* Item groups */}
              {Object.entries(filteredGrouped).map(([storeKey, group]) => {
                const groupItemIds = group.items.map((i) => i.id);
                const allGroupSelected = groupItemIds.every((id) => selectedIds.has(id));
                return (
                  <div key={storeKey} className="bg-white rounded-[5px] border border-black/[0.06] overflow-hidden">
                    {/* Store header */}
                    <div className="flex items-center gap-3 px-4 py-3 border-b border-black/[0.05] bg-[#fafafa]">
                      <button
                        onClick={() => toggleStoreGroup(groupItemIds)}
                        className="flex items-center justify-center h-5 w-5 rounded border-2 transition-all shrink-0"
                        style={allGroupSelected ? { background: "#29a366", borderColor: "#29a366" } : { borderColor: "rgba(0,0,0,0.2)" }}
                      >
                        {allGroupSelected && <Check className="h-3 w-3 text-white" />}
                      </button>
                      <Store className="h-4 w-4 text-[#bbb]" />
                      <span className="text-sm font-semibold text-[#333]">{group.storeName}</span>
                    </div>

                    {/* Items */}
                    <div className="divide-y divide-black/[0.04]">
                      {group.items.map((item) => {
                        const isSelected = selectedIds.has(item.id);
                        const unitPrice = item.product.price || item.product.pricePerNight || 0;
                        return (
                          <div key={item.id} className={`flex items-center gap-4 px-4 py-4 transition-opacity ${isSelected ? "" : "opacity-40"}`}>
                            {/* Checkbox */}
                            <button
                              onClick={() => toggleItem(item.id)}
                              className="flex items-center justify-center h-5 w-5 rounded border-2 transition-all shrink-0"
                              style={isSelected ? { background: "#29a366", borderColor: "#29a366" } : { borderColor: "rgba(0,0,0,0.2)" }}
                            >
                              {isSelected && <Check className="h-3 w-3 text-white" />}
                            </button>

                            {/* Image */}
                            <Link href={`/book/${item.product.id}`} className="shrink-0">
                              <div className="h-20 w-20 rounded-[5px] overflow-hidden border border-black/[0.06]">
                                <Image src={item.product.imageUrl} alt={item.product.name} width={80} height={80} className="object-cover h-full w-full" />
                              </div>
                            </Link>

                            {/* Name + price */}
                            <div className="flex-1 min-w-0">
                              <Link href={`/book/${item.product.id}`}>
                                <p className="text-sm font-medium text-[#111] line-clamp-2 hover:text-[#29a366] transition-colors leading-snug">{item.product.name}</p>
                              </Link>
                              <p className="text-sm font-semibold mt-1.5" style={{ color: "#29a366" }}>
                                ₱{unitPrice.toLocaleString()}
                              </p>
                            </div>

                            {/* Qty + delete */}
                            <div className="flex flex-col items-end gap-2 shrink-0">
                              <div className="flex items-center bg-[#f2f2f0] rounded-[5px] border border-black/[0.08]">
                                <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="w-8 h-8 flex items-center justify-center hover:text-[#29a366] transition-colors">
                                  <Minus className="h-3.5 w-3.5" />
                                </button>
                                <span className="w-9 text-center text-sm font-semibold text-[#111]">{item.quantity}</span>
                                <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="w-8 h-8 flex items-center justify-center hover:text-[#29a366] transition-colors">
                                  <Plus className="h-3.5 w-3.5" />
                                </button>
                              </div>
                              <button onClick={() => removeItem(item.id)} className="text-[#ccc] hover:text-red-400 transition-colors">
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>

                            {/* Subtotal */}
                            <div className="w-24 text-right shrink-0 hidden sm:block">
                              <p className="text-sm font-bold text-[#111]">₱{(unitPrice * item.quantity).toLocaleString()}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {/* No search results */}
              {Object.keys(filteredGrouped).length === 0 && searchQuery && (
                <div className="bg-white rounded-[5px] border border-black/[0.06] py-14 flex flex-col items-center text-center gap-3">
                  <ShoppingCart className="h-10 w-10 text-[#ddd]" strokeWidth={1.5} />
                  <p className="text-sm text-[#888]">No items match &ldquo;<span className="font-medium text-[#555]">{searchQuery}</span>&rdquo;</p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Shopee-style sticky bottom checkout bar */}
      {cartItems.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t-2 border-black/[0.07] shadow-[0_-4px_24px_rgba(0,0,0,0.10)]">
          <div className="max-w-[1280px] mx-auto px-5 md:px-10 py-4 flex items-center gap-5" style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}>
            {/* Select all */}
            <div className="flex items-center gap-2.5 shrink-0">
              <button
                onClick={toggleAll}
                className="flex items-center justify-center h-6 w-6 rounded border-2 transition-all shrink-0"
                style={cartItems.every((i) => selectedIds.has(i.id)) ? { background: "#29a366", borderColor: "#29a366" } : { borderColor: "rgba(0,0,0,0.25)" }}
              >
                {cartItems.every((i) => selectedIds.has(i.id)) && <Check className="h-3.5 w-3.5 text-white" />}
              </button>
              <span className="text-sm font-medium text-[#444] hidden sm:inline">All</span>
            </div>

            <div className="flex-1" />

            {/* Total */}
            <div className="text-right">
              <p className="text-xs text-[#888]">Total ({selectedItems.length} item{selectedItems.length !== 1 ? "s" : ""})</p>
              <p className="text-xl font-bold leading-tight mt-0.5" style={{ color: "#29a366" }}>₱{totalPrice.toLocaleString()}</p>
            </div>

            {/* Checkout button */}
            <button
              onClick={() => {
                if (selectedItems.length === 0) return;
                localStorage.setItem("checkout_selected_ids", JSON.stringify(Array.from(selectedIds)));
                router.push("/checkout");
              }}
              disabled={selectedItems.length === 0}
              className="h-13 px-10 rounded-[5px] text-white text-base font-semibold disabled:opacity-40 transition-opacity whitespace-nowrap"
              style={{ background: "#29a366", height: "52px" }}
            >
              Checkout ({selectedItems.length})
            </button>
          </div>
        </div>
      )}

      <FirstTimeIntro
        storageKey="cart"
        title="Your Cart"
        description="Review items you've added, adjust quantities, and proceed to checkout when you're ready."
        icon={<ShoppingCart className="h-7 w-7" />}
      />
      <Footer />
    </div>
  );
}

export default function CartPage() {
  return (
    <React.Suspense fallback={null}>
      <CartPageInner />
    </React.Suspense>
  );
}
