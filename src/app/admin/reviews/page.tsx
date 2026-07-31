"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminLayout } from "@/components/layout/admin-layout";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Star,
  Search,
  MoreVertical,
  Trash2,
  Eye,
  AlertTriangle,
  ThumbsUp,
  ThumbsDown,
  Package,
  Store,
} from "lucide-react";
import {
  useUser,
  useSupabase,
  useStableMemo,
  useCollection,
  deleteDocumentNonBlocking,
} from "@/supabase";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { logAdminAction } from "@/lib/admin-audit";

export default function AdminReviewsPage() {
  const { user } = useUser();
  const supabase = useSupabase();
  const router = useRouter();
  const { toast } = useToast();
  const { isAdmin, isAdminLoading } = useIsAdmin();
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [ratingFilter, setRatingFilter] = useState<string>("all");
  const [removeTarget, setRemoveTarget] = useState<{
    id: string;
    preview: string;
  } | null>(null);
  const [removeReason, setRemoveReason] = useState("");

  useEffect(() => {
    if (!isAdminLoading && !isAdmin) {
      router.push("/admin");
    }
  }, [isAdmin, isAdminLoading, router]);

  const reviewsConfig = useStableMemo(() => {
    if (!user || !isAdmin) return null;
    return {
      table: "reviews",
      order: { column: "createdAt", ascending: false },
    };
  }, [user, isAdmin]);
  const { data: reviews, isLoading } = useCollection(reviewsConfig);

  const usersConfig = useStableMemo(() => {
    if (!user || !isAdmin) return null;
    return { table: "users" };
  }, [user, isAdmin]);
  const { data: allUsers } = useCollection(usersConfig);

  if (isAdminLoading || !isAdmin) return null;

  const userMap = new Map<string, any>();
  (allUsers ?? []).forEach((u: any) => userMap.set(u.id, u));

  const filtered = (reviews ?? []).filter((r: any) => {
    const matchesSearch =
      !searchQuery ||
      (r.comment || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.title || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === "all" || r.reviewType === typeFilter;
    const matchesRating =
      ratingFilter === "all" || String(r.rating) === ratingFilter;
    return matchesSearch && matchesType && matchesRating;
  });

  const total = reviews?.length ?? 0;
  const productReviews =
    reviews?.filter((r: any) => r.reviewType === "product").length ?? 0;
  const sellerReviews =
    reviews?.filter((r: any) => r.reviewType === "seller").length ?? 0;
  const avgRating =
    reviews && reviews.length
      ? (
          reviews.reduce((s: number, r: any) => s + Number(r.rating || 0), 0) /
          reviews.length
        ).toFixed(1)
      : "0.0";

  const handleRemove = async (reviewId: string, preview: string) => {
    deleteDocumentNonBlocking(supabase, "reviews", reviewId);
    if (user) {
      await logAdminAction(supabase, {
        adminId: user.uid,
        adminEmail: user.email ?? undefined,
        action: "review.remove",
        targetType: "review",
        targetId: reviewId,
        targetLabel: preview.slice(0, 60),
        reason: removeReason || "No reason provided",
      });
    }
    toast({
      title: "Review removed",
      description: "The review has been deleted.",
    });
    setRemoveTarget(null);
    setRemoveReason("");
  };

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto p-6 md:p-8 w-full pt-6 md:pt-32 pb-24 space-y-8 md:space-y-10">
        <div>
          <h1 className="text-2xl md:text-3xl font-normal font-headline tracking-[-0.05em] text-black dark:text-white">
            Reviews Moderation
          </h1>
          <p className="text-sm text-muted-foreground font-normal">
            {total} reviews · {productReviews} products · {sellerReviews}{" "}
            sellers · avg ★ {avgRating}
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
          <div className="flex-1 relative min-w-[200px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by comment or title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.06] rounded-full pl-11 pr-5 py-3.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>
          <div className="flex gap-2">
            {[
              { key: "all", label: "All" },
              { key: "product", label: "Product" },
              { key: "seller", label: "Seller" },
            ].map((f) => (
              <Button
                key={f.key}
                variant={typeFilter === f.key ? "default" : "outline"}
                size="sm"
                className={cn(
                  "rounded-full px-5 h-11 text-xs font-bold shrink-0",
                  typeFilter === f.key
                    ? "bg-black text-white hover:bg-primary"
                    : "border-black/[0.06]",
                )}
                onClick={() => setTypeFilter(f.key)}
              >
                {f.label}
              </Button>
            ))}
          </div>
          <div className="flex gap-2">
            {["all", "5", "4", "3", "2", "1"].map((r) => (
              <Button
                key={r}
                variant={ratingFilter === r ? "default" : "outline"}
                size="sm"
                className={cn(
                  "rounded-full px-4 h-11 text-xs font-bold shrink-0",
                  ratingFilter === r
                    ? "bg-black text-white hover:bg-primary"
                    : "border-black/[0.06]",
                )}
                onClick={() => setRatingFilter(r)}
              >
                {r === "all" ? "★" : `${r}★`}
              </Button>
            ))}
          </div>
        </div>

        {/* List */}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full rounded-3xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card className="shadow-[0_20px_50px_rgba(0,0,0,0.04)] border border-black/[0.02] rounded-[32px] bg-white dark:bg-white/[0.03]">
            <CardContent className="py-20 text-center">
              <Star className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No reviews found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((review: any) => {
              const author = userMap.get(review.userId);
              const preview = review.comment || review.title || "(no content)";
              const isLowRating = Number(review.rating) <= 2;
              return (
                <Card
                  key={review.id}
                  className={cn(
                    "shadow-[0_20px_50px_rgba(0,0,0,0.04)] border rounded-[32px] bg-white dark:bg-white/[0.03] overflow-hidden",
                    isLowRating ? "border-red-100" : "border-black/[0.02]",
                  )}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <Badge
                            className={cn(
                              "rounded-full px-3 py-1 text-[10px] font-bold",
                              review.reviewType === "product"
                                ? "bg-blue-50 text-blue-600 border-0"
                                : "bg-purple-50 text-purple-600 border-0",
                            )}
                          >
                            {review.reviewType === "product" ? (
                              <Package className="h-3 w-3 mr-1 inline" />
                            ) : (
                              <Store className="h-3 w-3 mr-1 inline" />
                            )}
                            {review.reviewType}
                          </Badge>
                          <div className="flex items-center gap-0.5">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={cn(
                                  "h-4 w-4",
                                  i < Number(review.rating || 0)
                                    ? "fill-yellow-400 text-yellow-400"
                                    : "text-muted-foreground/30",
                                )}
                              />
                            ))}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            by{" "}
                            {author?.name ||
                              author?.email ||
                              review.userId?.slice(0, 8) ||
                              "anonymous"}
                          </span>
                          {review.createdAt && (
                            <span className="text-xs text-muted-foreground">
                              ·{" "}
                              {new Date(review.createdAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        {review.title && (
                          <p className="text-sm font-bold mb-1">
                            {review.title}
                          </p>
                        )}
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {preview}
                        </p>
                        <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <ThumbsUp className="h-3 w-3" />{" "}
                            {review.helpful ?? 0}
                          </span>
                          <span className="flex items-center gap-1">
                            <ThumbsDown className="h-3 w-3" />{" "}
                            {review.unhelpful ?? 0}
                          </span>
                          {review.facilityId && (
                            <span className="font-mono">
                              product: {review.facilityId.slice(0, 10)}
                            </span>
                          )}
                          {review.storeId && (
                            <span className="font-mono">
                              store: {review.storeId.slice(0, 10)}
                            </span>
                          )}
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="rounded-full h-8 w-8 shrink-0"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="w-48 rounded-2xl p-1 shadow-[0_20px_50px_rgba(0,0,0,0.1)] bg-white/80 backdrop-blur-xl border-none"
                        >
                          {review.facilityId && (
                            <DropdownMenuItem
                              className="rounded-xl gap-3 px-3 py-2.5 cursor-pointer"
                              onClick={() =>
                                router.push(`/book/${review.facilityId}`)
                              }
                            >
                              <Eye className="h-4 w-4" /> View Product
                            </DropdownMenuItem>
                          )}
                          {review.storeId && (
                            <DropdownMenuItem
                              className="rounded-xl gap-3 px-3 py-2.5 cursor-pointer"
                              onClick={() =>
                                router.push(`/stores/${review.storeId}`)
                              }
                            >
                              <Eye className="h-4 w-4" /> View Store
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="rounded-xl gap-3 px-3 py-2.5 cursor-pointer text-red-600"
                            onClick={() =>
                              setRemoveTarget({ id: review.id, preview })
                            }
                          >
                            <Trash2 className="h-4 w-4" /> Remove Review
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Remove Confirmation */}
        <AlertDialog
          open={!!removeTarget}
          onOpenChange={() => {
            setRemoveTarget(null);
            setRemoveReason("");
          }}
        >
          <AlertDialogContent className="rounded-3xl">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                Remove Review
              </AlertDialogTitle>
              <AlertDialogDescription>
                <span className="block mb-3">
                  This will permanently remove the review from the marketplace.
                </span>
                <span className="block bg-muted rounded-lg p-3 text-xs italic line-clamp-3">
                  &quot;{removeTarget?.preview}&quot;
                </span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-2">
              <label className="text-xs font-bold tracking-tight text-muted-foreground">
                Reason (logged to audit trail)
              </label>
              <input
                type="text"
                value={removeReason}
                onChange={(e) => setRemoveReason(e.target.value)}
                placeholder="e.g. spam, hate speech, off-topic"
                className="w-full bg-[#f8f8f8] dark:bg-white/[0.05] border-none rounded-full px-6 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-full">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                className="rounded-full bg-red-600 hover:bg-red-700"
                onClick={() =>
                  removeTarget &&
                  handleRemove(removeTarget.id, removeTarget.preview)
                }
              >
                Remove
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  );
}
