"use client";

import React, { use, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  MapPin,
  Star,
  MessageSquare,
  UserPlus,
  UserCheck,
  Check,
  Users,
  Package,
  ShoppingCart,
  Navigation,
} from "lucide-react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useDoc,
  useCollection,
  useStableMemo,
  useSupabase,
  useUser,
} from "@/supabase";

type Store = {
  id: string;
  name?: string;
  description?: string;
  imageUrl?: string;
  coverUrl?: string;
  city?: string;
  municipality?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  category?: string;
  rating?: number;
  followerCount?: number;
  verified?: boolean;
  ownerId?: string;
  sellerId?: string;
  createdAt?: string;
};

type Product = {
  id: string;
  name: string;
  imageUrl?: string;
  price?: number;
  pricePerNight?: number;
  storeId?: string;
  category?: string;
  city?: string;
  municipality?: string;
  sold?: number;
  totalSales?: number;
  rating?: number;
  status?: string;
  isAuction?: boolean;
  currentBid?: number;
  startingBid?: number;
  createdAt?: string;
};

export default function StoreDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: storeId } = use(params);
  const supabase = useSupabase();
  const { user } = useUser();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const storeRef = useStableMemo(
    () => ({ table: "stores", id: storeId }),
    [storeId],
  );
  const { data: storeData, isLoading: storeLoading } = useDoc(storeRef);
  const store = storeData as Store | null;

  const productsQuery = useStableMemo(
    () => ({
      table: "facilities",
      filters: [{ column: "sellerId", op: "eq" as const, value: storeId }],
    }),
    [storeId],
  );
  const { data: productsBySeller, isLoading: productsLoading } =
    useCollection(productsQuery);

  const productsByStoreQuery = useStableMemo(
    () => ({
      table: "facilities",
      filters: [{ column: "storeId", op: "eq" as const, value: storeId }],
    }),
    [storeId],
  );
  const { data: productsByStore } = useCollection(productsByStoreQuery);

  const products = useMemo(() => {
    const map = new Map<string, any>();
    (productsBySeller ?? []).forEach((p: any) => map.set(p.id, p));
    (productsByStore ?? []).forEach((p: any) => map.set(p.id, p));
    return Array.from(map.values());
  }, [productsBySeller, productsByStore]);

  const followersQuery = useStableMemo(
    () => ({
      table: "store_followers",
      filters: [{ column: "storeId", op: "eq" as const, value: storeId }],
    }),
    [storeId],
  );
  const { data: followers } = useCollection(followersQuery);

  const followerCount = followers?.length ?? store?.followerCount ?? 0;
  const isFollowing = useMemo(
    () => !!user && followers?.some((f: any) => f.userId === user.uid),
    [user, followers],
  );
  const isOwn = !!user && user.uid === storeId;

  const productList = (products as Product[]) ?? [];
  const productCount = productList.length;
  const totalSold = productList.reduce(
    (s, p) => s + Number(p.sold || 0),
    0,
  );

  const [tab, setTab] = useState<"all" | "new" | "location">("all");
  const sortedProducts = useMemo(() => {
    if (tab === "new") {
      return [...productList].sort((a, b) => {
        const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return tb - ta;
      });
    }
    return productList;
  }, [tab, productList]);

  const hasCoords =
    store?.latitude != null &&
    store?.longitude != null &&
    !Number.isNaN(Number(store.latitude)) &&
    !Number.isNaN(Number(store.longitude));

  const handleFollow = async () => {
    if (!user) {
      router.push(`/login?redirect=/stores/${storeId}`);
      return;
    }
    if (isOwn || busy) return;
    setBusy(true);
    try {
      if (isFollowing) {
        await supabase
          .from("store_followers")
          .delete()
          .eq("storeId", storeId)
          .eq("userId", user.uid);
      } else {
        await supabase
          .from("store_followers")
          .insert({ storeId, userId: user.uid });
      }
    } catch (err) {
      console.error("[stores] follow error", err);
    } finally {
      setBusy(false);
    }
  };

  const handleMessage = async () => {
    if (!user) {
      router.push(`/login?redirect=/stores/${storeId}`);
      return;
    }
    if (isOwn) return;
    const sellerId = store?.sellerId || store?.ownerId || storeId;
    const conversationId = `${sellerId}_${user.uid}`;
    const now = new Date().toISOString();
    try {
      await supabase.from("conversations").upsert(
        {
          id: conversationId,
          userId: user.uid,
          name: store?.name || "Seller",
          avatar: store?.imageUrl || null,
          recipientId: sellerId,
          lastMessage: "",
          updatedAt: now,
        },
        { onConflict: "id" },
      );
    } catch (err) {
      console.error("[stores] message error", err);
    }
    router.push(`/messages?id=${conversationId}`);
  };

  if (storeLoading || !store) {
    return (
      <div
        className="flex min-h-screen flex-col"
        style={{ backgroundColor: "#f2f2f0" }}
      >
        <Header />
        <main className="flex-grow mx-auto px-4 md:px-8 pt-6 md:pt-8 pb-24 w-full max-w-[1280px]">
          <Skeleton className="h-40 md:h-56 w-full rounded-[5px]" />
          <div className="flex gap-4 mt-6">
            <Skeleton className="h-20 w-20 md:h-24 md:w-24 rounded-full" />
            <div className="flex-1 space-y-2 mt-2">
              <Skeleton className="h-5 w-56 rounded-full" />
              <Skeleton className="h-3 w-40 rounded-full" />
              <Skeleton className="h-3 w-32 rounded-full" />
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mt-10">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="bg-white rounded-[5px] overflow-hidden">
                <Skeleton className="aspect-square w-full rounded-none" />
                <div className="p-2.5 space-y-1.5">
                  <Skeleton className="h-3 w-3/4 rounded-full" />
                  <Skeleton className="h-3 w-1/2 rounded-full" />
                  <Skeleton className="h-3.5 w-1/3 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const cover =
    store.coverUrl ||
    store.imageUrl ||
    "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1600&q=80";
  const avatar =
    store.imageUrl ||
    "https://i.pinimg.com/736x/d2/98/4e/d2984ec4b65a8568eab3dc2b640fc58e.jpg";
  const location = store.city || store.municipality;

  return (
    <div
      className="flex min-h-screen flex-col"
      style={{ backgroundColor: "#f2f2f0" }}
    >
      <Header />

      <main className="flex-grow mx-auto px-4 md:px-8 pt-4 md:pt-6 pb-24 w-full max-w-[1280px]">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-1.5 text-xs text-[#666] hover:text-primary transition-colors mb-3"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </button>

        {/* Store header card */}
        <section className="bg-white rounded-[5px] overflow-hidden border border-black/[0.06]">
          <div
            className="relative w-full h-40 md:h-60 bg-neutral-200"
            style={{
              backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.05), rgba(0,0,0,0.4)), url(${cover})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />

          <div className="px-5 md:px-8 pb-6">
            {/* Identity row */}
            <div className="flex items-end gap-4 md:gap-5 -mt-12 md:-mt-16">
              <div className="relative h-24 w-24 md:h-32 md:w-32 rounded-full ring-4 ring-white shadow-lg overflow-hidden shrink-0 bg-white">
                <Image
                  src={avatar}
                  alt={store.name || "Store"}
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>

              <div className="flex-1 min-w-0 pb-1">
                <div className="flex items-center gap-1.5">
                  <h1 className="text-xl md:text-[26px] font-bold text-[#111] leading-tight truncate">
                    {store.name || "Unnamed store"}
                  </h1>
                  {store.verified && (
                    <span
                      className="inline-flex items-center justify-center h-[18px] w-[18px] md:h-5 md:w-5 rounded-full bg-[#1877f2] text-white shrink-0"
                      title="Verified seller"
                      aria-label="Verified seller"
                    >
                      <Check className="h-3 w-3" strokeWidth={4} />
                    </span>
                  )}
                </div>
                {location && (
                  <div className="flex items-center gap-1 mt-1 text-[12px] text-[#666]">
                    <MapPin className="h-3.5 w-3.5" />
                    {location}
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2 mt-5">
              {!isOwn && (
                <>
                  <button
                    onClick={handleFollow}
                    disabled={busy}
                    className={`inline-flex items-center gap-1.5 text-xs font-semibold px-5 py-2 rounded-full border transition-colors disabled:opacity-60 ${
                      isFollowing
                        ? "border-black/10 bg-white text-[#111] hover:bg-[#f5f5f5]"
                        : "border-primary bg-primary text-white hover:bg-primary/90"
                    }`}
                  >
                    {isFollowing ? (
                      <>
                        <UserCheck className="h-3.5 w-3.5" />
                        Following
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-3.5 w-3.5" />
                        Follow
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleMessage}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-5 py-2 rounded-full border border-black/10 bg-white text-[#111] hover:bg-[#f5f5f5] transition-colors"
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    Message
                  </button>
                </>
              )}
              {isOwn && (
                <Link
                  href="/seller/profile"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-5 py-2 rounded-full border border-black/10 bg-white text-[#111] hover:bg-[#f5f5f5] transition-colors"
                >
                  Manage store
                </Link>
              )}
            </div>

            {/* Stat strip */}
            {(() => {
              const stats: {
                key: string;
                icon: React.ReactNode;
                label: string;
                value: string;
              }[] = [];
              if (followerCount > 0)
                stats.push({
                  key: "followers",
                  icon: <Users className="h-3.5 w-3.5" />,
                  label: "Followers",
                  value: followerCount.toLocaleString(),
                });
              if (productCount > 0)
                stats.push({
                  key: "products",
                  icon: <Package className="h-3.5 w-3.5" />,
                  label: "Products",
                  value: productCount.toLocaleString(),
                });
              if (store.rating != null)
                stats.push({
                  key: "rating",
                  icon: (
                    <Star className="h-3.5 w-3.5 fill-[#f59e0b] text-[#f59e0b]" />
                  ),
                  label: "Rating",
                  value: Number(store.rating).toFixed(1),
                });
              if (totalSold > 0)
                stats.push({
                  key: "sold",
                  icon: <ShoppingCart className="h-3.5 w-3.5" />,
                  label: "Sold",
                  value: totalSold.toLocaleString(),
                });
              if (stats.length === 0) return null;
              return (
                <div
                  className={`grid gap-3 mt-6 pt-5 border-t border-black/[0.06]`}
                  style={{
                    gridTemplateColumns: `repeat(${Math.min(stats.length, 4)}, minmax(0, 1fr))`,
                  }}
                >
                  {stats.map((s) => (
                    <Stat
                      key={s.key}
                      icon={s.icon}
                      label={s.label}
                      value={s.value}
                    />
                  ))}
                </div>
              );
            })()}

            {store.description && (
              <p className="text-sm text-[#555] leading-relaxed whitespace-pre-line mt-6">
                {store.description}
              </p>
            )}
          </div>
        </section>

        {/* Location */}

        {/* Tabs */}
        {(() => {
          const tabs: { key: "all" | "new" | "location"; label: string }[] = [
            { key: "all", label: "All products" },
            { key: "new", label: "New listings" },
          ];
          if (hasCoords || location) {
            tabs.push({ key: "location", label: "Location" });
          }
          const activeTab = tabs.some((t) => t.key === tab) ? tab : "all";
          return (
            <section className="mt-8">
              <div className="flex items-center justify-between gap-3 border-b border-black/[0.08] mb-5">
                <div className="flex items-center gap-6">
                  {tabs.map((t) => {
                    const active = activeTab === t.key;
                    return (
                      <button
                        key={t.key}
                        onClick={() => setTab(t.key)}
                        className={`relative py-3 text-sm font-medium transition-colors ${
                          active
                            ? "text-primary"
                            : "text-[#666] hover:text-[#111]"
                        }`}
                      >
                        {t.label}
                        <span
                          className={`absolute left-0 right-0 -bottom-px h-[2px] rounded-full transition-colors ${
                            active ? "bg-primary" : "bg-transparent"
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>
                {activeTab !== "location" && (
                  <span className="text-[11px] text-[#999] hidden sm:inline">
                    {productCount} listing{productCount === 1 ? "" : "s"}
                  </span>
                )}
              </div>

              {activeTab === "location" ? (
                <div className="bg-white rounded-[5px] overflow-hidden border border-black/[0.06]">
                  <div className="flex items-center justify-between px-5 md:px-6 py-4 gap-3">
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-[#111] flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-primary" />
                        Store location
                      </h3>
                      {location && (
                        <p className="text-[12px] text-[#666] mt-0.5 truncate">
                          {store.address
                            ? `${store.address} · ${location}`
                            : location}
                        </p>
                      )}
                    </div>
                    {hasCoords && (
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${store.latitude},${store.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-full bg-primary text-white hover:bg-primary/90 transition-colors shrink-0"
                      >
                        <Navigation className="h-3.5 w-3.5" />
                        Directions
                      </a>
                    )}
                  </div>
                  {hasCoords ? (
                    <div className="relative w-full h-72 md:h-[420px] border-t border-black/[0.06]">
                      <iframe
                        title={`${store.name || "Store"} location`}
                        src={`https://maps.google.com/maps?q=${store.latitude},${store.longitude}&z=15&output=embed`}
                        className="absolute inset-0 w-full h-full"
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                      />
                    </div>
                  ) : (
                    <div className="border-t border-black/[0.06] py-12 text-center text-sm text-[#999] italic">
                      Precise map coordinates not set for this store.
                    </div>
                  )}
                </div>
              ) : productsLoading ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div
                      key={i}
                      className="bg-white rounded-[5px] overflow-hidden"
                    >
                      <Skeleton className="aspect-square w-full rounded-none" />
                      <div className="p-2.5 space-y-1.5">
                        <Skeleton className="h-3 w-3/4 rounded-full" />
                        <Skeleton className="h-3 w-1/2 rounded-full" />
                        <Skeleton className="h-3.5 w-1/3 rounded-full" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : productList.length === 0 ? (
                <div className="bg-white rounded-[5px] border border-black/[0.06] py-16 text-center">
                  <Package className="h-8 w-8 text-[#ccc] mx-auto mb-2" />
                  <p className="text-sm text-[#999] italic">
                    This store hasn&apos;t listed any products yet.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  {sortedProducts.map((product) => {
                const productLoc = product.city || product.municipality;
                return (
                  <div
                    key={product.id}
                    className="bg-white rounded-[5px] overflow-hidden border border-black/[0.06] flex flex-col group transition-all duration-200 hover:shadow-md hover:border-black/[0.12]"
                  >
                    <Link
                      href={`/book/${product.id}`}
                      className="relative block aspect-square overflow-hidden"
                    >
                      {product.imageUrl && (
                        <Image
                          src={product.imageUrl}
                          alt={product.name}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      )}
                      <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all duration-200">
                        <div className="h-7 w-7 rounded-full bg-white/90 shadow flex items-center justify-center">
                          <ShoppingCart className="h-3.5 w-3.5 text-primary" />
                        </div>
                      </div>
                    </Link>
                    <div className="p-3 flex flex-col gap-2">
                      <Link href={`/book/${product.id}`}>
                        <div className="flex items-start gap-1.5">
                          {product.isAuction && (
                            <span className="shrink-0 text-[10px] font-bold rounded-[3px] px-1.5 py-0.5 bg-orange-500 text-white mt-[2px]">
                              Auction
                            </span>
                          )}
                          <h3 className="text-sm font-normal leading-snug line-clamp-2 hover:text-primary transition-colors">
                            {product.name}
                          </h3>
                        </div>
                      </Link>
                      <p className="text-[17px] text-primary font-normal leading-none">
                        ₱
                        {(product.isAuction
                          ? product.currentBid || product.startingBid || 0
                          : product.price || product.pricePerNight || 0
                        ).toLocaleString()}
                      </p>
                      {productLoc && (
                        <span className="text-xs text-[#999] truncate -mt-1">
                          {productLoc}
                        </span>
                      )}
                      <div className="flex items-center gap-1.5">
                        <div className="flex items-center gap-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className="h-3 w-3"
                              style={{
                                fill:
                                  i < Math.round(product.rating ?? 0)
                                    ? "#f59e0b"
                                    : "#e5e7eb",
                                color:
                                  i < Math.round(product.rating ?? 0)
                                    ? "#f59e0b"
                                    : "#e5e7eb",
                              }}
                            />
                          ))}
                        </div>
                        {product.rating ? (
                          <span className="text-[11px] text-[#bbb]">
                            (
                            {(
                              product.sold ??
                              product.totalSales ??
                              0
                            ).toLocaleString()}
                            )
                          </span>
                        ) : (
                          <span className="text-[11px] text-[#ccc]">
                            No ratings
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
          );
        })()}
      </main>

      <Footer />
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-1 text-[11px] text-[#888] uppercase tracking-wide">
        {icon}
        {label}
      </div>
      <div className="text-sm font-semibold text-[#111]">{value}</div>
    </div>
  );
}
