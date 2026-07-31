"use client";

import React, { useMemo } from "react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { ProfileSidebar } from "@/app/profile/page";
import {
  useUser,
  useSupabase,
  useCollection,
  useStableMemo,
  useSupabaseAuth,
} from "@/supabase";
import { Star, MessageSquare } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";

interface Review {
  id: string;
  userId: string;
  productId?: string;
  facilityId?: string;
  storeId?: string;
  rating: number;
  comment: string;
  createdAt: string;
}

interface Facility {
  id: string;
  name: string;
  imageUrl: string;
  category?: string;
}

interface Store {
  id: string;
  name: string;
  logoUrl?: string;
}

function StarRow({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          style={{ width: size, height: size }}
          className={
            i < rating
              ? "fill-[#f59e0b] text-[#f59e0b]"
              : "fill-[#e5e7eb] text-[#e5e7eb]"
          }
        />
      ))}
    </div>
  );
}

export default function MyReviewsPage() {
  const { user, isUserLoading } = useUser();
  const { auth } = useSupabaseAuth();
  const supabase = useSupabase();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await auth.signOut();
      router.push("/login");
    } catch {}
  };

  const reviewsQuery = useStableMemo(() => {
    if (!user) return null;
    return {
      table: "reviews",
      filters: [{ column: "userId", op: "eq" as const, value: user.uid }],
      order: { column: "createdAt", ascending: false },
    };
  }, [user]);
  const { data: reviews, isLoading: reviewsLoading } =
    useCollection<Review>(reviewsQuery);

  const facilitiesQuery = useStableMemo(() => ({ table: "facilities" }), []);
  const { data: facilities } = useCollection<Facility>(facilitiesQuery);

  const storesQuery = useStableMemo(() => ({ table: "stores" }), []);
  const { data: stores } = useCollection<Store>(storesQuery);

  const enriched = useMemo(() => {
    if (!reviews) return [];
    return reviews.map((r) => ({
      ...r,
      product: facilities?.find((f) => f.id === (r.productId ?? r.facilityId)),
      store: stores?.find((s) => s.id === r.storeId),
    }));
  }, [reviews, facilities, stores]);

  const avgRating = useMemo(() => {
    if (!enriched.length) return 0;
    return (
      enriched.reduce((sum, r) => sum + (r.rating ?? 0), 0) / enriched.length
    );
  }, [enriched]);

  // ── Loading ──────────────────────────────────────────────────────────
  if (isUserLoading)
    return (
      <div
        className="flex min-h-screen flex-col"
        style={{ backgroundColor: "#f2f2f0" }}
      >
        <Header />
        <main className="flex-grow pt-6">
          <div className="max-w-[1280px] mx-auto px-4 md:px-8 pb-24 flex gap-5 items-start">
            <div className="hidden md:flex flex-col w-[200px] shrink-0 gap-2.5">
              <Skeleton className="h-[300px] rounded-[5px]" />
              <Skeleton className="h-[100px] rounded-[5px]" />
            </div>
            <div className="flex-1 min-w-0 space-y-3">
              <Skeleton className="h-[72px] rounded-[5px]" />
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-[120px] rounded-[5px]" />
              ))}
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );

  if (!user) {
    router.push("/login");
    return null;
  }

  return (
    <div
      className="flex min-h-screen flex-col"
      style={{ backgroundColor: "#f2f2f0" }}
    >
      <Header />
      <main className="flex-grow pt-6">
        <div className="max-w-[1280px] mx-auto px-4 md:px-8 pb-24 flex gap-5 items-start">
          <ProfileSidebar onLogout={handleLogout} />

          <div className="flex-1 min-w-0 space-y-3">
            {/* Header */}
            <div className="bg-white rounded-[5px] border border-black/[0.06] px-6 py-5 flex items-center justify-between">
              <div>
                <h1 className="text-lg font-semibold text-[#111]">
                  My Reviews
                </h1>
                <p className="text-sm text-[#888]">
                  {enriched.length} review{enriched.length !== 1 ? "s" : ""}
                </p>
              </div>
              {enriched.length > 0 && (
                <div className="flex items-center gap-2">
                  <StarRow rating={Math.round(avgRating)} />
                  <span className="text-sm font-semibold text-[#111]">
                    {avgRating.toFixed(1)}
                  </span>
                  <span className="text-xs text-[#aaa]">avg</span>
                </div>
              )}
            </div>

            {/* Summary bar */}
            {enriched.length > 0 && (
              <div className="bg-white rounded-[5px] border border-black/[0.06] px-6 py-4">
                <p className="text-xs font-semibold text-[#555] mb-3">
                  Rating Breakdown
                </p>
                <div className="space-y-1.5">
                  {[5, 4, 3, 2, 1].map((star) => {
                    const count = enriched.filter(
                      (r) => Math.round(r.rating) === star,
                    ).length;
                    const pct = enriched.length
                      ? (count / enriched.length) * 100
                      : 0;
                    return (
                      <div key={star} className="flex items-center gap-3">
                        <div className="flex items-center gap-0.5 w-[52px] shrink-0">
                          <span className="text-xs text-[#555] w-3 text-right">
                            {star}
                          </span>
                          <Star className="h-3 w-3 fill-[#f59e0b] text-[#f59e0b]" />
                        </div>
                        <div className="flex-1 h-1.5 bg-[#f0f0f0] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${pct}%`, background: "#f59e0b" }}
                          />
                        </div>
                        <span className="text-xs text-[#aaa] w-6 text-right shrink-0">
                          {count}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Reviews list */}
            {reviewsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-[120px] rounded-[5px]" />
                ))}
              </div>
            ) : enriched.length === 0 ? (
              <div className="bg-white rounded-[5px] border border-black/[0.06] py-20 flex flex-col items-center text-center gap-3">
                <MessageSquare
                  className="h-12 w-12 text-[#e0e0e0]"
                  strokeWidth={1.5}
                />
                <div>
                  <p className="text-sm font-medium text-[#333] mb-1">
                    No reviews yet
                  </p>
                  <p className="text-xs text-[#999]">
                    After completing an order you can rate and review the
                    product.
                  </p>
                </div>
                <Link
                  href="/my-bookings?status=Completed"
                  className="mt-1 text-sm font-semibold px-4 py-2 rounded-[5px] text-white"
                  style={{ background: "#29a366" }}
                >
                  View Completed Orders
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {enriched.map((review) => {
                  const target = review.product ?? review.store;
                  const href = review.product
                    ? `/book/${review.product.id}`
                    : review.store
                      ? `/stores/${review.store.id}`
                      : "#";
                  const imgSrc =
                    review.product?.imageUrl ?? review.store?.logoUrl;
                  const targetName =
                    review.product?.name ?? review.store?.name ?? "Product";
                  const isStore = !review.product && !!review.store;

                  return (
                    <div
                      key={review.id}
                      className="bg-white rounded-[5px] border border-black/[0.06] p-5"
                    >
                      <div className="flex gap-4">
                        {/* Thumbnail */}
                        <Link href={href} className="shrink-0">
                          <div
                            className={`h-16 w-16 overflow-hidden bg-[#f5f5f5] border border-black/[0.06] ${isStore ? "rounded-full" : "rounded-[5px]"} relative`}
                          >
                            {imgSrc ? (
                              <Image
                                src={imgSrc}
                                alt={targetName}
                                fill
                                className="object-cover"
                              />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center text-[#ccc] text-xs">
                                {targetName[0]}
                              </div>
                            )}
                          </div>
                        </Link>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <Link
                              href={href}
                              className="text-sm font-semibold text-[#111] hover:text-[#29a366] transition-colors line-clamp-1"
                            >
                              {targetName}
                            </Link>
                            <span className="text-[11px] text-[#bbb] shrink-0">
                              {new Date(review.createdAt).toLocaleDateString(
                                [],
                                {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                },
                              )}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 mb-2">
                            <StarRow rating={review.rating} size={13} />
                            <span className="text-xs font-semibold text-[#555]">
                              {review.rating}/5
                            </span>
                            {isStore && (
                              <span className="text-[10px] font-medium text-[#888] bg-[#f5f5f5] rounded-full px-2 py-0.5">
                                Seller
                              </span>
                            )}
                          </div>

                          {review.comment ? (
                            <p className="text-sm text-[#555] leading-relaxed">
                              {review.comment}
                            </p>
                          ) : (
                            <p className="text-sm text-[#bbb] italic">
                              No comment left.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
