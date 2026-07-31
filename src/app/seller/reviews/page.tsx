"use client";

import React, { useMemo } from "react";
import { SellerLayout } from "@/components/layout/seller-layout";
import { Star, MessageCircle, Package, ThumbsUp } from "lucide-react";
import { useSupabaseAuth, useStableMemo, useCollection } from "@/supabase";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

function StarRow({
  stars,
  count,
  total,
}: {
  stars: number;
  count: number;
  total: number;
}) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-[#888] w-4 shrink-0">{stars}</span>
      <Star className="h-3 w-3 text-amber-400 fill-amber-400 shrink-0" />
      <div className="flex-1 h-2 bg-[#f2f2f0] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full bg-amber-400 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-[#bbb] w-6 text-right shrink-0">
        {count}
      </span>
    </div>
  );
}

function RatingStars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={cn(
            "h-3.5 w-3.5",
            n <= Math.round(rating)
              ? "text-amber-400 fill-amber-400"
              : "text-[#e5e7eb]",
          )}
        />
      ))}
    </div>
  );
}

export default function SellerReviewsPage() {
  const { user } = useSupabaseAuth();

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

  const productsConfig = useStableMemo(() => ({ table: "facilities" }), []);
  const { data: productsData } = useCollection<any>(productsConfig);
  const getProduct = (id: string) =>
    productsData?.find((p: any) => p.id === id);

  const reviewed = useMemo(
    () =>
      allOrders.filter(
        (o: any) =>
          o.rating != null || o.review != null || o.reviewText != null,
      ),
    [allOrders],
  );

  const avgRating = useMemo(() => {
    if (!reviewed.length) return 0;
    return (
      reviewed.reduce((s: number, o: any) => s + Number(o.rating || 0), 0) /
      reviewed.length
    );
  }, [reviewed]);

  const ratingCounts = useMemo(
    () =>
      [5, 4, 3, 2, 1].map((n) => ({
        stars: n,
        count: reviewed.filter((o: any) => Math.round(Number(o.rating)) === n)
          .length,
      })),
    [reviewed],
  );

  const positiveCount = reviewed.filter(
    (o: any) => Number(o.rating) >= 4,
  ).length;
  const positiveRate =
    reviewed.length > 0
      ? Math.round((positiveCount / reviewed.length) * 100)
      : 0;

  if (isLoading)
    return (
      <SellerLayout>
        <div className="px-4 md:px-6 pt-6 pb-8 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
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
        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-3">
          {/* Average rating */}
          <div className="bg-white rounded-2xl border border-black/[0.06] p-5 flex flex-col items-center justify-center text-center gap-1 col-span-1">
            <p className="text-3xl font-bold text-[#111]">
              {reviewed.length ? avgRating.toFixed(1) : "—"}
            </p>
            <RatingStars rating={avgRating} />
            <p className="text-[11px] text-[#aaa] mt-0.5">Average rating</p>
          </div>
          {/* Total reviews */}
          <div className="bg-white rounded-2xl border border-black/[0.06] p-5 flex flex-col items-center justify-center text-center gap-1">
            <div className="h-9 w-9 rounded-xl bg-[#eff6ff] flex items-center justify-center mb-1">
              <MessageCircle
                className="h-4.5 w-4.5 text-[#2563eb]"
                strokeWidth={1.8}
              />
            </div>
            <p className="text-xl font-bold text-[#111]">{reviewed.length}</p>
            <p className="text-[11px] text-[#aaa]">Total reviews</p>
          </div>
          {/* Positive rate */}
          <div className="bg-white rounded-2xl border border-black/[0.06] p-5 flex flex-col items-center justify-center text-center gap-1">
            <div className="h-9 w-9 rounded-xl bg-[#f0fdf4] flex items-center justify-center mb-1">
              <ThumbsUp
                className="h-4.5 w-4.5 text-[#29a366]"
                strokeWidth={1.8}
              />
            </div>
            <p className="text-xl font-bold text-[#111]">{positiveRate}%</p>
            <p className="text-[11px] text-[#aaa]">Positive (4★+)</p>
          </div>
        </div>

        {/* Rating breakdown */}
        {reviewed.length > 0 && (
          <div className="bg-white rounded-2xl border border-black/[0.06] p-5">
            <p className="text-sm font-bold text-[#111] mb-4">
              Rating Breakdown
            </p>
            <div className="space-y-2">
              {ratingCounts.map(({ stars, count }) => (
                <StarRow
                  key={stars}
                  stars={stars}
                  count={count}
                  total={reviewed.length}
                />
              ))}
            </div>
          </div>
        )}

        {/* Reviews list */}
        <div className="bg-white rounded-2xl border border-black/[0.06] overflow-hidden">
          <div className="px-5 py-4 border-b border-black/[0.04] flex items-center justify-between">
            <p className="text-sm font-bold text-[#111]">All Reviews</p>
            <span className="text-xs text-[#bbb]">
              {reviewed.length} reviews
            </span>
          </div>

          {reviewed.length === 0 ? (
            <div className="py-14 flex flex-col items-center gap-3 text-center px-6">
              <div className="h-14 w-14 rounded-full bg-[#f2f2f0] flex items-center justify-center">
                <Star className="h-7 w-7 text-[#ddd]" strokeWidth={1.5} />
              </div>
              <p className="text-sm font-semibold text-[#555]">
                No reviews yet
              </p>
              <p className="text-xs text-[#bbb] max-w-xs leading-relaxed">
                Once buyers complete their orders and leave ratings, they will
                appear here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-black/[0.04]">
              {reviewed.map((o: any) => {
                const product = getProduct(o.facilityId);
                const reviewText = o.review || o.reviewText || o.comment;
                const date = o.createdAt
                  ? new Date(o.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  : "";
                return (
                  <div key={o.id} className="px-5 py-4">
                    <div className="flex items-start gap-3">
                      {/* Product image */}
                      <div className="h-10 w-10 rounded-xl bg-[#f2f2f0] overflow-hidden shrink-0 flex items-center justify-center border border-black/[0.06]">
                        {product?.imageUrl ? (
                          <img
                            src={product.imageUrl}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <Package
                            className="h-5 w-5 text-[#ccc]"
                            strokeWidth={1.5}
                          />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <p className="text-xs font-semibold text-[#555] truncate">
                            {product?.name ||
                              `Order #${o.id?.slice(-6).toUpperCase()}`}
                          </p>
                          <span className="text-[10px] text-[#bbb] shrink-0">
                            {date}
                          </span>
                        </div>
                        <RatingStars rating={Number(o.rating || 0)} />
                        {reviewText && (
                          <p className="text-xs text-[#666] leading-relaxed mt-1.5">
                            {reviewText}
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
    </SellerLayout>
  );
}
