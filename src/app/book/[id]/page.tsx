"use client";

import React, { useState, use, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import {
  Heart,
  MapPin,
  Star,
  ArrowLeft,
  Wifi,
  Wind,
  Waves,
  Dog,
  Coffee,
  CheckCircle2,
  Wallet,
  Smartphone,
  Info,
  X,
  Zap,
  Utensils,
  Sun,
  MessageSquare,
  Gavel,
  Timer,
  Minus,
  Plus,
  ShoppingCart,
  Store,
  Package,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import confetti from "canvas-confetti";
import { useSupabase, useDoc, useStableMemo, useUser, addDocumentNonBlocking, useCollection } from "@/supabase";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

interface Facility {
  id: string;
  name: string;
  type: string;
  capacity: number;
  pricePerNight: number;
  price?: number;
  description: string;
  imageUrl: string;
  status: string;
  amenities?: string[];
  stock?: number;
  sold?: number;
  isAuction?: boolean;
  auctionEndDate?: string;
  startingBid?: number;
  currentBid?: number;
  currentBidderId?: string;
  bidCount?: number;
  storeId?: string;
  sellerId?: string;
  sellerName?: string;
  category?: string;
  productType?: "normal" | "wholesale";
  minimumBulkQuantity?: number;
  bulkPricePerUnit?: number;
}

interface StoreInfo {
  id: string;
  name?: string;
  imageUrl?: string;
  city?: string;
  rating?: number;
  followerCount?: number;
  offersDelivery?: boolean;
  offersPickup?: boolean;
  verified?: boolean;
}

interface Bid {
  id: string;
  productId: string;
  bidderId: string;
  amount: number;
  createdAt: string;
}

interface Booking {
  id: string;
  facilityId: string;
  startDate: string;
  endDate: string;
  status: string;
}

const getAmenityIcon = (label: string) => {
  const l = label.toLowerCase();
  if (l.includes("organic")) return CheckCircle2;
  if (l.includes("fresh") || l.includes("daily")) return Zap;
  if (l.includes("local") || l.includes("sourced")) return MapPin;
  if (l.includes("farm") || l.includes("direct")) return Sun;
  if (l.includes("handmade") || l.includes("homemade")) return Coffee;
  if (l.includes("free range")) return Dog;
  if (l.includes("natural")) return Waves;
  if (l.includes("halal") || l.includes("vegan")) return Utensils;
  if (l.includes("packed") || l.includes("sealed")) return Wind;
  if (l.includes("frozen")) return Wifi;
  return CheckCircle2;
};


export default function FacilityDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useUser();
  const supabase = useSupabase();
  const router = useRouter();

  const [isLiked, setIsLiked] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"onsite" | "gcash">("onsite");
  const [quantity, setQuantity] = useState(1);
  const [bidAmount, setBidAmount] = useState("");
  const [bidPlaced, setBidPlaced] = useState(false);
  const [bidSubmitting, setBidSubmitting] = useState(false);
  const [bidSheetOpen, setBidSheetOpen] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);
  const [cartToast, setCartToast] = useState(false);
  const [selectedVariation, setSelectedVariation] = useState<string | null>(null);
  const [auctionTimeLeft, setAuctionTimeLeft] = useState("");
  const [quickSheet, setQuickSheet] = useState<{ open: boolean; intent: "cart" | "buy" }>({ open: false, intent: "cart" });
  const [sheetQty, setSheetQty] = useState(1);
  const [activeImg, setActiveImg] = useState(0);
  const [relatedVisible, setRelatedVisible] = useState(10);

  // ── Product Reviews ──────────────────────────────────────────────
  interface ProductReview {
    id: string;
    userId: string;
    rating: number;
    title?: string;
    comment: string;
    createdAt: string;
    helpful: number;
    unhelpful: number;
    users?: { firstName?: string; lastName?: string };
  }
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewTitle, setReviewTitle] = useState("");
  const [reviewComment, setReviewComment] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewsVisible, setReviewsVisible] = useState(5);

  const loadReviews = useCallback(async () => {
    if (!id) return;
    setReviewsLoading(true);
    try {
      const res = await fetch(`/api/reviews?reviewType=product&facilityId=${id}&limit=50`);
      if (res.ok) {
        const { data } = await res.json();
        setReviews(data || []);
      }
    } catch { }
    setReviewsLoading(false);
  }, [id]);

  useEffect(() => { loadReviews(); }, [loadReviews]);

  const avgRating = useMemo(() => {
    if (!reviews.length) return 0;
    return reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
  }, [reviews]);

  const submitReview = async () => {
    if (!user || !reviewRating || !reviewComment.trim()) return;
    setReviewSubmitting(true);
    try {
      await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.uid,
          bookingId: "direct",
          facilityId: id,
          reviewType: "product",
          rating: reviewRating,
          title: reviewTitle || undefined,
          comment: reviewComment,
        }),
      });
      setShowReviewForm(false);
      setReviewRating(0);
      setReviewTitle("");
      setReviewComment("");
      loadReviews();
    } catch { }
    setReviewSubmitting(false);
  };

  const facilityRef = useStableMemo(() => {
    if (!id) return null;
    return { table: "facilities", id };
  }, [id]);

  const { data: facility, isLoading } = useDoc<Facility>(facilityRef);

  // Fetch store/seller info
  const storeRef = useStableMemo(() => {
    if (!facility?.storeId) return null;
    return { table: "stores", id: facility.storeId };
  }, [facility?.storeId]);
  const { data: store } = useDoc<StoreInfo>(storeRef);

  // Fetch bookings for this facility to show availability
  const bookingsQuery = useStableMemo(() => {
    if (!id) return null;
    return { table: "bookings", filters: [{ column: "facilityId", op: "eq" as const, value: id }] };
  }, [id]);
  const { data: facilityBookings } = useCollection<Booking>(bookingsQuery);

  // Fetch bids for this product (auction mode)
  const bidsQuery = useStableMemo(() => {
    if (!id) return null;
    return {
      table: "bids",
      filters: [{ column: "productId", op: "eq" as const, value: id }],
      order: { column: "amount", ascending: false },
      limit: 20,
    };
  }, [id]);
  const { data: bids } = useCollection<Bid>(bidsQuery);

  // Fetch bidder names for display
  const bidderIds = useMemo(() => {
    if (!bids) return [];
    return [...new Set(bids.map((b) => b.bidderId))];
  }, [bids]);

  const biddersQuery = useStableMemo(() => {
    if (bidderIds.length === 0) return null;
    return {
      table: "users",
      filters: [{ column: "id", op: "in" as const, value: bidderIds }],
    };
  }, [bidderIds]);
  const { data: bidderUsers } = useCollection<{ id: string; firstName?: string; lastName?: string }>(biddersQuery);

  const bidderNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    bidderUsers?.forEach((u) => {
      const name = [u.firstName, u.lastName].filter(Boolean).join(" ") || "Anonymous";
      map[u.id] = name.length > 2 ? name.slice(0, 2) + "***" : name;
    });
    return map;
  }, [bidderUsers]);

  // Auction countdown timer
  useEffect(() => {
    if (!facility?.isAuction || !facility.auctionEndDate) {
      setAuctionTimeLeft("");
      return;
    }
    const endDate = new Date(facility.auctionEndDate).getTime();
    const update = () => {
      const now = Date.now();
      const diff = endDate - now;
      if (diff <= 0) {
        setAuctionTimeLeft("Auction ended");
        return;
      }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const mins = Math.floor((diff / (1000 * 60)) % 60);
      const secs = Math.floor((diff / 1000) % 60);
      if (days > 0) {
        setAuctionTimeLeft(`${days}d ${hours}h ${mins}m`);
      } else {
        setAuctionTimeLeft(`${hours}h ${mins}m ${secs}s`);
      }
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [facility?.isAuction, facility?.auctionEndDate]);

  // Fetch all products for "You might also like" section
  const allProductsQuery = useStableMemo(() => {
    return { table: "facilities", columns: "* , sold" };
  }, []);
  const { data: allProducts } = useCollection<Facility & { sold?: number; totalSales?: number }>(allProductsQuery);

  const sameStoreProducts = useMemo(() => {
    if (!allProducts || !facility?.storeId) return [];
    return allProducts.filter((p) => p.id !== facility.id && p.storeId === facility.storeId);
  }, [allProducts, facility]);

  const relatedProducts = useMemo(() => {
    if (!allProducts || !facility) return [];
    const category = facility.type || "";
    const storeId = facility.storeId || "";
    const sellerId = facility.sellerId || "";

    const scored = allProducts
      .filter((p) => p.id !== facility.id)
      .map((p) => {
        let score = 0;
        if (category && (p.type || "") === category) score += 3;
        if (storeId && p.storeId === storeId) score += 2;
        if (sellerId && p.sellerId === sellerId) score += 1;
        return { ...p, score };
      })
      .filter((p) => p.score > 0 || allProducts.length <= 20)
      .sort((a, b) => b.score - a.score);

    if (scored.length < 6) {
      const ids = new Set(scored.map((p) => p.id));
      const others = allProducts
        .filter((p) => p.id !== facility.id && !ids.has(p.id))
        .sort(() => Math.random() - 0.5);
      scored.push(...others.map((p) => ({ ...p, score: 0 })));
    }

    return scored;
  }, [allProducts, facility]);

  const images = useMemo(() => {
    if (!facility) return [];
    return [facility.imageUrl].filter(Boolean) as string[];
  }, [facility]);

  const isNew = useMemo(() => {
    if (!allProducts || !facility) return false;
    const last6Ids = new Set(allProducts.slice(-6).map((p) => p.id));
    return last6Ids.has(facility.id);
  }, [allProducts, facility]);

  const handleBookingClick = () => {
    if (!user) {
      router.push("/login");
      return;
    }
    if (!facility) return;
    setShowCheckout(true);
  };

  const confirmBooking = () => {
    if (!facility || !user) return;
    const bookingData = {
      userId: user.uid,
      facilityId: facility.id,
      productId: facility.id,
      quantity,
      totalPrice: (facility.price || facility.pricePerNight || 0) * quantity,
      paymentMethod,
      status: "Pending",
      bookingDate: new Date().toISOString(),
      storeId: facility.storeId || null,
      shippingAddress: null,
      trackingNumber: null,
    };
    addDocumentNonBlocking(supabase, "bookings", bookingData);
    // Notify buyer
    supabase.from("notifications").insert({
      userId: user.uid,
      title: "Order placed!",
      content: `Your order for "${facility.name}" (x${quantity}) has been placed. Total: ₱${((facility.price || facility.pricePerNight || 0) * quantity).toLocaleString()}`,
      type: "order",
      timestamp: new Date().toISOString(),
      isRead: false,
    });
    // Notify seller
    if (facility.sellerId) {
      supabase.from("notifications").insert({
        userId: facility.sellerId,
        title: "New order received!",
        content: `Someone ordered "${facility.name}" (x${quantity}) — ₱${((facility.price || facility.pricePerNight || 0) * quantity).toLocaleString()}`,
        type: "order",
        timestamp: new Date().toISOString(),
        isRead: false,
      });
    }
    setShowCheckout(false);
    setShowSuccess(true);
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ["#e03d8f", "#ff8fb1", "#ffffff"],
    });
  };

  if (isLoading || !facility) {
    return (
      <div className="min-h-screen bg-[#f2f2f0]">
        <Header />
        <main className="max-w-[1280px] mx-auto px-4 md:px-8 py-3 pb-32 md:pb-8">

          {/* Breadcrumb skeleton */}
          <div className="hidden md:flex items-center gap-2 mb-3">
            <Skeleton className="h-3 w-10 rounded-full" />
            <Skeleton className="h-3 w-3 rounded-full" />
            <Skeleton className="h-3 w-16 rounded-full" />
            <Skeleton className="h-3 w-3 rounded-full" />
            <Skeleton className="h-3 w-32 rounded-full" />
          </div>

          {/* Main product card skeleton */}
          <div className="bg-white p-4 md:p-6 mb-3 flex flex-col md:flex-row gap-6">
            {/* Left: image */}
            <div className="md:w-[420px] shrink-0">
              <Skeleton className="aspect-square w-full rounded-none" />
              {/* Single thumbnail placeholder */}
              <div className="flex gap-2 mt-2">
                <Skeleton className="w-[18%] aspect-square rounded-none" />
              </div>
            </div>

            {/* Right: product info */}
            <div className="flex-1 flex flex-col gap-4">
              {/* Badge + name */}
              <div className="flex items-center gap-2">
                <Skeleton className="h-6 w-12 rounded-[3px]" />
                <Skeleton className="h-6 w-2/3 rounded-full" />
              </div>
              {/* Rating row */}
              <div className="flex items-center gap-2">
                <Skeleton className="h-3.5 w-24 rounded-full" />
                <Skeleton className="h-3.5 w-16 rounded-full" />
              </div>
              {/* Price box */}
              <Skeleton className="h-14 w-full rounded-none" />
              {/* Detail rows */}
              <div className="divide-y divide-gray-100 border-t border-gray-100">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex gap-3 py-3">
                    <Skeleton className="h-3 w-28 rounded-full shrink-0" />
                    <Skeleton className="h-3 w-48 rounded-full" />
                  </div>
                ))}
              </div>
              {/* CTA buttons */}
              <div className="hidden md:flex gap-3 mt-2">
                <Skeleton className="flex-1 h-12 rounded-md" />
                <Skeleton className="flex-1 h-12 rounded-md" />
                <Skeleton className="w-14 h-12 rounded-none" />
                <Skeleton className="w-14 h-12 rounded-none" />
              </div>
            </div>
          </div>

          {/* Store info card skeleton */}
          <div className="bg-white p-4 mb-3 flex items-center gap-4">
            <Skeleton className="h-12 w-12 rounded-full shrink-0" />
            <div className="flex-1 flex flex-col gap-2">
              <Skeleton className="h-4 w-32 rounded-full" />
              <Skeleton className="h-3 w-24 rounded-full" />
            </div>
            <Skeleton className="h-8 w-24 rounded-md" />
            <Skeleton className="h-8 w-16 rounded-md" />
          </div>

          {/* Reviews skeleton */}
          <div className="bg-white p-4 mb-3">
            <div className="flex items-center justify-between mb-4">
              <Skeleton className="h-3 w-36 rounded-full" />
              <Skeleton className="h-3 w-24 rounded-full" />
            </div>
            <div className="flex flex-col gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                  <div className="flex-1 flex flex-col gap-2">
                    <Skeleton className="h-3 w-24 rounded-full" />
                    <Skeleton className="h-3 w-full rounded-full" />
                    <Skeleton className="h-3 w-2/3 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Product details card skeleton */}
          <div className="bg-white p-4 md:p-6 mb-3">
            <Skeleton className="h-3 w-28 rounded-full mb-3" />
            <div className="border border-gray-100 overflow-hidden divide-y divide-gray-100 mb-5">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex px-4 py-2.5 gap-3">
                  <Skeleton className="h-3 w-24 rounded-full" />
                  <Skeleton className="h-3 w-32 rounded-full" />
                </div>
              ))}
            </div>
            <Skeleton className="h-3 w-36 rounded-full mb-3" />
            <div className="flex flex-col gap-2">
              <Skeleton className="h-3 w-full rounded-full" />
              <Skeleton className="h-3 w-full rounded-full" />
              <Skeleton className="h-3 w-2/3 rounded-full" />
            </div>
          </div>

          {/* You Might Also Like skeleton */}
          <div className="mb-3">
            <div className="flex items-center gap-4 mb-3">
              <div className="flex-1 h-px bg-gray-200" />
              <Skeleton className="h-5 w-44 rounded-full" />
              <div className="flex-1 h-px bg-gray-200" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-white overflow-hidden border border-black/[0.06] flex flex-col">
                  <Skeleton className="aspect-square w-full rounded-none" />
                  <div className="p-3 flex flex-col gap-2">
                    <Skeleton className="h-3 w-3/4 rounded-full" />
                    <Skeleton className="h-3 w-1/2 rounded-full" />
                    <Skeleton className="h-4 w-1/3 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const availableStock = facility?.stock ?? facility?.capacity ?? 0;
  const soldCount = facility?.sold ?? 0;
  const productCategory = facility?.type || facility?.category || "Product";
  const unitPrice = facility.price || facility.pricePerNight || 0;

  return (
    <div className="min-h-screen bg-[#f2f2f0]">
      <Header />

      <main className="max-w-[1280px] mx-auto px-4 md:px-8 py-3 pb-32 md:pb-8">

        {/* Breadcrumb */}
        <nav className="hidden md:flex items-center gap-1 text-xs text-gray-400 mb-3 flex-wrap">
          <Link href="/" className="hover:text-[#29a366]">Home</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="hover:text-[#29a366] cursor-pointer">{productCategory}</span>
          <ChevronRight className="h-3 w-3" />
          <span className="text-gray-600 line-clamp-1">{facility.name}</span>
        </nav>

        {/* ── Main product card ──────────────────────────────────── */}
        <div className="bg-white p-4 md:p-6 mb-3 flex flex-col md:flex-row gap-6">

          {/* Left: Image gallery */}
          <div className="md:w-[420px] shrink-0">
            {/* Main image */}
            <div className="relative aspect-square overflow-hidden bg-[#f2f2f0]">
              {/* Mobile back button */}
              <button
                onClick={() => router.back()}
                className="absolute top-3 left-3 z-10 md:hidden p-2 bg-white/80 backdrop-blur-sm rounded-full shadow-sm"
              >
                <ArrowLeft className="h-5 w-5 text-gray-700" />
              </button>

              {/* Desktop wishlist */}
              <button
                onClick={() => setIsLiked(!isLiked)}
                className="absolute top-3 right-3 z-10 hidden md:flex p-2 bg-white/80 backdrop-blur-sm rounded-full shadow-sm"
              >
                <Heart
                  className={cn(
                    "h-5 w-5 transition-all",
                    isLiked ? "fill-red-500 text-red-500" : "text-gray-400"
                  )}
                />
              </button>

              {/* Auction badge */}
              {facility.isAuction && (
                <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 px-3 py-1 bg-[#29a366] text-white text-[10px] font-bold uppercase tracking-wider rounded-full flex items-center gap-1">
                  <Gavel className="h-3 w-3" /> Live Auction
                </div>
              )}

              {images[activeImg] && (
                <Image
                  src={images[activeImg]}
                  alt={facility.name}
                  fill
                  className="object-cover"
                  priority
                />
              )}
            </div>

            {/* Thumbnails — show all available images */}
            {images.length > 0 && (
              <div className="flex gap-2 mt-2">
                {images.slice(0, 5).map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImg(idx)}
                    className={cn(
                      "w-[18%] aspect-square overflow-hidden border-2 shrink-0 transition-all",
                      activeImg === idx ? "border-[#29a366]" : "border-transparent"
                    )}
                  >
                    <img
                      src={img}
                      alt={`thumb-${idx}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right: Product info */}
          <div className="flex-1 flex flex-col gap-4 min-w-0">

            {/* Badge + Product name — inline like LazMall style */}
            <h1 className="text-xl font-semibold text-[#111] leading-snug">
              {isNew && (
                <span className="inline-block align-middle text-sm font-bold rounded-[3px] px-2.5 py-1 bg-orange-500 text-white mr-2 translate-y-[-1px]">
                  New
                </span>
              )}
              {facility.name}
            </h1>

            {/* Rating + sold row */}
            <div className="flex items-center gap-3 flex-wrap">
              {/* Stars + avg + review count */}
              <div className="flex items-center gap-1.5">
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => {
                    const filled = i + 1 <= Math.floor(avgRating);
                    const half = !filled && i < avgRating;
                    return (
                      <Star
                        key={i}
                        className="h-3.5 w-3.5"
                        style={{
                          fill: filled ? "#facc15" : half ? "url(#half)" : "none",
                          color: filled || half ? "#facc15" : "#d1d5db",
                        }}
                      />
                    );
                  })}
                </div>
                <span className="text-sm font-semibold text-[#111]">
                  {avgRating > 0 ? avgRating.toFixed(1) : "—"}
                </span>
                <span className="text-sm text-gray-400">
                  ({reviews.length})
                </span>
              </div>

              {/* Rating bar */}
              {reviews.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <div className="w-20 h-1.5 bg-gray-200 overflow-hidden">
                    <div
                      className="h-full bg-[#facc15]"
                      style={{ width: `${(avgRating / 5) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Sold count */}
              {soldCount > 0 && (
                <>
                  <span className="text-gray-300 text-xs">|</span>
                  <span className="text-sm text-gray-400">{soldCount} Sold</span>
                </>
              )}
            </div>

            {/* Price box */}
            <div className="bg-[#f2f2f0] px-4 py-3">
              {facility.isAuction ? (
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-gray-500">Current Bid</span>
                  <span className="text-2xl font-bold text-[#29a366]">
                    ₱{(facility.currentBid || facility.startingBid || 0).toLocaleString()}
                  </span>
                  {auctionTimeLeft && (
                    <div className={cn(
                      "flex items-center gap-1.5 text-xs font-medium mt-1",
                      auctionTimeLeft === "Auction ended" ? "text-red-500" : "text-amber-600"
                    )}>
                      <Timer className="h-3.5 w-3.5" />
                      {auctionTimeLeft === "Auction ended" ? "Auction ended" : `Ends in ${auctionTimeLeft}`}
                    </div>
                  )}
                </div>
              ) : facility.productType === "wholesale" ? (
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-gray-500">Bulk Price</span>
                  <span className="text-2xl font-bold text-[#29a366]">
                    ₱{(facility.bulkPricePerUnit || 0).toLocaleString()}
                    <span className="text-sm font-normal text-gray-500 ml-1">/unit</span>
                  </span>
                  <span className="text-xs text-amber-600 font-medium">
                    Min. order: {facility.minimumBulkQuantity} units
                  </span>
                </div>
              ) : (
                <span className="text-2xl font-bold text-[#29a366]">
                  ₱{unitPrice.toLocaleString()}
                </span>
              )}
            </div>

            {/* Detail rows — label left, value right aligned */}
            <div className="text-sm divide-y divide-gray-100 border-t border-gray-100">

              {/* Delivery Options */}
              <div className="flex gap-3 py-3">
                <span className="text-gray-400 w-28 shrink-0 pt-0.5 leading-snug">Delivery Options:</span>
                <div className="flex-1 flex flex-col gap-1.5">
                  <div className="flex items-start gap-2">
                    <MapPin className="h-3.5 w-3.5 text-gray-400 mt-0.5 shrink-0" />
                    <span className="text-gray-600 leading-snug">
                      {store?.city ? `${store.city}, Oriental Mindoro` : "Oriental Mindoro"}
                    </span>
                  </div>
                  {store?.offersDelivery && (
                    <div className="flex items-start gap-2">
                      <Package className="h-3.5 w-3.5 text-gray-400 mt-0.5 shrink-0" />
                      <span className="text-gray-600 leading-snug">Home Delivery available</span>
                    </div>
                  )}
                  {store?.offersPickup && (
                    <div className="flex items-start gap-2">
                      <Store className="h-3.5 w-3.5 text-gray-400 mt-0.5 shrink-0" />
                      <span className="text-gray-600 leading-snug">Store Pickup available</span>
                    </div>
                  )}
                  {!store?.offersDelivery && !store?.offersPickup && (
                    <div className="flex items-start gap-2">
                      <Package className="h-3.5 w-3.5 text-gray-400 mt-0.5 shrink-0" />
                      <span className="text-gray-600 leading-snug">Contact seller for delivery details</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Return & Warranty */}
              <div className="flex gap-3 py-3">
                <span className="text-gray-400 w-28 shrink-0 pt-0.5 leading-snug">Return &amp; Warranty:</span>
                <div className="flex items-start gap-2 flex-1">
                  <Info className="h-3.5 w-3.5 text-gray-400 mt-0.5 shrink-0" />
                  <span className="text-gray-600 leading-snug">
                    Change of Mind · 7 Days Free Return · Warranty not available
                  </span>
                </div>
              </div>

              {/* Category */}
              <div className="flex items-center gap-3 py-3">
                <span className="text-gray-400 w-28 shrink-0">Category:</span>
                <span className="text-gray-700 font-medium">{productCategory}</span>
              </div>

              {/* Stock */}
              <div className="flex items-center gap-3 py-3">
                <span className="text-gray-400 w-28 shrink-0">Stock:</span>
                <span className={cn("font-medium", availableStock > 0 ? "text-gray-700" : "text-red-500")}>
                  {availableStock > 0 ? `${availableStock} Available` : "Out of Stock"}
                </span>
              </div>

              {/* Auction bids */}
              {facility.isAuction && (
                <div className="flex items-center gap-3 py-3">
                  <span className="text-gray-400 w-28 shrink-0">Total Bids:</span>
                  <span className="text-gray-700 font-medium">{facility.bidCount || 0}</span>
                </div>
              )}

              {/* Variation */}
              {!facility.isAuction && facility.amenities && facility.amenities.length > 0 && (
                <div className="flex items-start gap-3 py-3">
                  <span className="text-gray-400 w-28 shrink-0 pt-1">Variation:</span>
                  <div className="flex flex-wrap gap-2">
                    {facility.amenities.map((v) => (
                      <button
                        key={v}
                        onClick={() => setSelectedVariation(v === selectedVariation ? null : v)}
                        className={cn(
                          "px-3 py-1.5 rounded-[5px] text-xs border transition-all",
                          selectedVariation === v
                            ? "border-[#29a366] bg-[#29a366]/5 text-[#29a366] font-semibold"
                            : "border-gray-200 text-gray-600 hover:border-[#29a366]/60"
                        )}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Quantity */}
              {!facility.isAuction && (
                <div className="flex items-center gap-3 py-3">
                  <span className="text-gray-400 w-28 shrink-0">Quantity:</span>
                  <div className="flex items-center border border-[#ddd] overflow-hidden">
                    <button
                      onClick={() => setQuantity(Math.max(facility.productType === "wholesale" ? (facility.minimumBulkQuantity || 1) : 1, quantity - 1))}
                      className="w-8 h-8 flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="w-10 text-center text-sm font-medium text-gray-800 border-x border-[#ddd] h-8 flex items-center justify-center">
                      {quantity}
                    </span>
                    <button
                      onClick={() => setQuantity(Math.min(availableStock || 999, quantity + 1))}
                      className="w-8 h-8 flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Desktop CTA buttons */}
            <div className="hidden md:flex items-center gap-3 mt-2">
              {facility.isAuction ? (
                <button
                  onClick={() => {
                    if (!user) { router.push("/login"); return; }
                    setBidSheetOpen(true);
                  }}
                  className="flex-1 py-3 rounded-md bg-[#29a366] text-white font-semibold text-sm flex items-center justify-center gap-2 hover:bg-[#23905a] transition-colors"
                >
                  <Gavel className="h-4 w-4" /> Place Bid
                </button>
              ) : facility.productType === "wholesale" ? (
                <>
                  <button
                    onClick={async () => {
                      if (!user) { router.push("/login"); return; }
                      if (quantity < (facility.minimumBulkQuantity || 1)) {
                        alert(`Minimum order quantity is ${facility.minimumBulkQuantity} units`);
                        return;
                      }
                      await supabase.from("cart_items").upsert(
                        { userId: user.uid, productId: facility.id, quantity, isWholesale: true },
                        { onConflict: "userId,productId" }
                      );
                      setAddedToCart(true);
                      setTimeout(() => setAddedToCart(false), 2000);
                    }}
                    className={cn(
                      "flex-1 py-3 rounded-md border text-sm font-semibold flex items-center justify-center gap-2 transition-colors",
                      addedToCart
                        ? "border-green-500 text-green-600 bg-green-50"
                        : "border-[#29a366] text-[#29a366] hover:bg-[#f0fdf4]"
                    )}
                  >
                    <ShoppingCart className="h-4 w-4" />
                    {addedToCart ? "Added!" : "Add to Cart"}
                  </button>
                  <button
                    onClick={() => {
                      if (!user) { router.push("/login"); return; }
                      if (quantity < (facility.minimumBulkQuantity || 1)) {
                        alert(`Minimum order quantity is ${facility.minimumBulkQuantity} units`);
                        return;
                      }
                      setShowCheckout(true);
                    }}
                    className="flex-1 py-3 rounded-md bg-[#29a366] text-white font-semibold text-sm flex items-center justify-center gap-2 hover:bg-[#23905a] transition-colors"
                  >
                    <Package className="h-4 w-4" /> Bulk Order
                  </button>
                </>
              ) : (
                <>
                  {/* Buy Now — outline */}
                  <button
                    onClick={async () => {
                      if (!user) { router.push("/login"); return; }
                      const { data: cartRow } = await supabase
                        .from("cart_items")
                        .upsert(
                          { userId: user.uid, productId: facility.id, quantity },
                          { onConflict: "userId,productId" }
                        )
                        .select("id")
                        .single();
                      if (cartRow?.id) {
                        localStorage.setItem("buy_now_cart_id", cartRow.id);
                      }
                      router.push("/cart");
                    }}
                    className="flex-1 py-3 rounded-md border border-[#29a366] text-[#29a366] font-semibold text-sm hover:bg-[#f0fdf4] transition-colors"
                  >
                    Buy Now
                  </button>

                  {/* Add to Cart — filled */}
                  <button
                    onClick={async () => {
                      if (!user) { router.push("/login"); return; }
                      await supabase.from("cart_items").upsert(
                        { userId: user.uid, productId: facility.id, quantity },
                        { onConflict: "userId,productId" }
                      );
                      setAddedToCart(true);
                      setCartToast(true);
                      setTimeout(() => { setAddedToCart(false); setCartToast(false); }, 2500);
                    }}
                    className={cn(
                      "flex-1 py-3 rounded-md text-sm font-semibold flex items-center justify-center gap-2 transition-all",
                      addedToCart
                        ? "bg-[#23905a] text-white"
                        : "bg-[#29a366] text-white hover:bg-[#23905a]"
                    )}
                  >
                    <ShoppingCart className="h-4 w-4" />
                    {addedToCart ? "Added to Cart!" : "Add to Cart"}
                  </button>

                  {/* Share */}
                  <button
                    onClick={() => {
                      if (navigator.share) {
                        navigator.share({ title: facility.name, url: window.location.href });
                      } else {
                        navigator.clipboard?.writeText(window.location.href);
                      }
                    }}
                    className="flex flex-col items-center justify-center gap-0.5 w-14 py-2 text-gray-500 hover:text-[#29a366] transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 8a3 3 0 1 0-6 0 3 3 0 0 0 6 0zM9 8H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2h-4M12 15v-7" />
                    </svg>
                    <span className="text-[10px] font-medium">Share</span>
                  </button>

                  {/* Like */}
                  <button
                    onClick={() => setIsLiked(!isLiked)}
                    className="flex flex-col items-center justify-center gap-0.5 w-14 py-2 text-gray-500 hover:text-red-500 transition-colors"
                  >
                    <Heart
                      className={cn("h-5 w-5 transition-all", isLiked ? "fill-red-500 text-red-500" : "")}
                    />
                    <span className="text-[10px] font-medium">Like</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ── Store info card ────────────────────────────────────── */}
        {store && (
          <div className="bg-white p-4 mb-3 flex items-center gap-4">
            <div className="h-12 w-12 rounded-full overflow-hidden bg-[#f0fdf4] flex items-center justify-center shrink-0">
              {store.imageUrl ? (
                <img
                  src={store.imageUrl}
                  alt={store.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <Store className="h-6 w-6 text-[#29a366]" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-gray-800 truncate">{store.name || "Store"}</p>
              <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5 flex-wrap">
                {store.city && (
                  <span className="flex items-center gap-0.5">
                    <MapPin className="h-3 w-3" /> {store.city}
                  </span>
                )}
                {store.followerCount != null && store.followerCount > 0 && (
                  <>
                    <span>·</span>
                    <span>{store.followerCount} followers</span>
                  </>
                )}
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <Link
                href={`/stores/${facility.storeId}`}
                className="px-3 py-1.5 rounded-lg border border-[#29a366] text-[#29a366] text-xs font-semibold hover:bg-[#f0fdf4] transition-colors"
              >
                Visit Store
              </Link>
              <button
                onClick={async () => {
                  if (!user) { router.push("/login"); return; }
                  const sellerId = facility.sellerId || facility.storeId;
                  if (!sellerId) return;
                  const conversationId = `${sellerId}_${user.uid}`;
                  const now = new Date().toISOString();
                  await supabase.from("conversations").upsert(
                    {
                      id: conversationId,
                      userId: user.uid,
                      name: store?.name || facility.sellerName || "Seller",
                      avatar: store?.imageUrl || null,
                      recipientId: sellerId,
                      lastMessage: "",
                      updatedAt: now,
                    },
                    { onConflict: "id" }
                  );
                  router.push(`/messages?id=${conversationId}`);
                }}
                className="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 text-xs font-semibold hover:bg-gray-50 transition-colors flex items-center gap-1"
              >
                <MessageSquare className="h-3 w-3" /> Chat
              </button>
            </div>
          </div>
        )
        }

        {/* ── More in this shop ─────────────────────────────────── */}
        {
          store && sameStoreProducts.length > 0 && (
            <div className="bg-white p-4 mb-3">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs uppercase tracking-wide text-gray-400 font-semibold">More in this shop</p>
                <Link
                  href={`/stores/${facility.storeId}`}
                  className="text-xs font-semibold hover:underline"
                  style={{ color: "#29a366" }}
                >
                  See all →
                </Link>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1" style={{ scrollbarWidth: "none" }}>
                {sameStoreProducts.slice(0, 10).map((product) => (
                  <Link key={product.id} href={`/book/${product.id}`} className="shrink-0 w-[100px] group">
                    <div className="aspect-square overflow-hidden border border-black/[0.06] mb-1.5">
                      {product.imageUrl && (
                        <Image
                          src={product.imageUrl}
                          alt={product.name}
                          width={100}
                          height={100}
                          className="object-cover h-full w-full"
                        />
                      )}
                    </div>
                    <p className="text-xs text-[#111] line-clamp-2 leading-snug mb-1 group-hover:text-[#29a366] transition-colors">{product.name}</p>
                    <p className="text-xs font-semibold" style={{ color: "#29a366" }}>
                      ₱{(product.price || product.pricePerNight || 0).toLocaleString()}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          )
        }

        {/* ── Product Reviews ───────────────────────────────────── */}
        <div className="bg-white p-4 md:p-6 mb-3">
          {/* Header row */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs uppercase tracking-wide text-gray-400 font-semibold">
              Customer Reviews
              {reviews.length > 0 && (
                <span className="ml-2 text-gray-500 normal-case">({reviews.length})</span>
              )}
            </p>
            {user && !showReviewForm && (
              <button
                onClick={() => setShowReviewForm(true)}
                className="text-xs font-semibold text-[#29a366] hover:underline"
              >
                + Write a Review
              </button>
            )}
            {!user && (
              <button
                onClick={() => router.push("/login")}
                className="text-xs font-semibold text-[#29a366] hover:underline"
              >
                Sign in to review
              </button>
            )}
          </div>

          {/* Rating summary */}
          {reviews.length > 0 && (
            <div className="flex items-center gap-4 mb-5 pb-4 border-b border-gray-100">
              <div className="text-center shrink-0">
                <p className="text-4xl font-bold text-[#111] leading-none">{avgRating.toFixed(1)}</p>
                <div className="flex items-center justify-center gap-0.5 mt-1.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className="h-3.5 w-3.5"
                      style={{
                        fill: i < Math.round(avgRating) ? "#facc15" : "none",
                        color: i < Math.round(avgRating) ? "#facc15" : "#d1d5db",
                      }}
                    />
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-1">{reviews.length} review{reviews.length !== 1 ? "s" : ""}</p>
              </div>
              {/* Star distribution bars */}
              <div className="flex-1 flex flex-col gap-1.5">
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = reviews.filter((r) => Math.round(r.rating) === star).length;
                  const pct = reviews.length ? (count / reviews.length) * 100 : 0;
                  return (
                    <div key={star} className="flex items-center gap-2">
                      <span className="text-[11px] text-gray-400 w-3 shrink-0">{star}</span>
                      <div className="flex-1 h-1.5 bg-gray-100 overflow-hidden">
                        <div
                          className="h-full bg-[#facc15]"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-[11px] text-gray-400 w-4 text-right shrink-0">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Write review form */}
          {showReviewForm && (
            <div className="mb-5 pb-5 border-b border-gray-100">
              <p className="text-sm font-semibold text-[#111] mb-3">Your Review</p>
              {/* Star picker */}
              <div className="flex items-center gap-1 mb-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setReviewRating(i + 1)}
                    className="p-0.5"
                  >
                    <Star
                      className="h-6 w-6"
                      style={{
                        fill: i < reviewRating ? "#facc15" : "none",
                        color: i < reviewRating ? "#facc15" : "#d1d5db",
                      }}
                    />
                  </button>
                ))}
                {reviewRating > 0 && (
                  <span className="text-xs text-gray-400 ml-1">
                    {["", "Poor", "Fair", "Good", "Great", "Excellent"][reviewRating]}
                  </span>
                )}
              </div>
              <input
                type="text"
                placeholder="Title (optional)"
                value={reviewTitle}
                onChange={(e) => setReviewTitle(e.target.value)}
                maxLength={100}
                className="w-full border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#29a366] mb-2 transition-colors"
              />
              <textarea
                placeholder="Share your experience with this product..."
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                maxLength={1000}
                rows={4}
                className="w-full border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#29a366] resize-none transition-colors"
              />
              <p className="text-[11px] text-gray-400 text-right mb-3">{reviewComment.length}/1000</p>
              <div className="flex gap-2">
                <button
                  onClick={submitReview}
                  disabled={reviewSubmitting || !reviewRating || !reviewComment.trim()}
                  className="px-4 py-2 bg-[#29a366] text-white text-xs font-bold disabled:opacity-40 transition-opacity"
                >
                  {reviewSubmitting ? "Posting..." : "Post Review"}
                </button>
                <button
                  onClick={() => { setShowReviewForm(false); setReviewRating(0); setReviewTitle(""); setReviewComment(""); }}
                  className="px-4 py-2 border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Reviews list */}
          {reviewsLoading ? (
            <div className="flex flex-col gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex gap-3 animate-pulse">
                  <div className="h-8 w-8 rounded-full bg-gray-100 shrink-0" />
                  <div className="flex-1 flex flex-col gap-2">
                    <div className="h-3 w-24 bg-gray-100 rounded-full" />
                    <div className="h-3 w-full bg-gray-100 rounded-full" />
                    <div className="h-3 w-2/3 bg-gray-100 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : reviews.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">
              No reviews yet. Be the first to share your experience!
            </p>
          ) : (
            <div className="flex flex-col divide-y divide-gray-100">
              {reviews.slice(0, reviewsVisible).map((review) => {
                const firstName = review.users?.firstName || "";
                const lastName = review.users?.lastName || "";
                const initials = ((firstName[0] || "") + (lastName[0] || "")).toUpperCase() || "?";
                const fullName = [firstName, lastName].filter(Boolean).join(" ") || "Anonymous";
                const date = new Date(review.createdAt);
                const dateStr = date.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
                return (
                  <div key={review.id} className="py-4 first:pt-0">
                    <div className="flex items-start gap-3">
                      {/* Avatar */}
                      <div className="h-8 w-8 rounded-full bg-[#f0fdf4] flex items-center justify-center shrink-0 text-xs font-bold text-[#29a366]">
                        {initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                          <span className="text-sm font-semibold text-[#111]">{fullName}</span>
                          <span className="text-[11px] text-gray-400">{dateStr}</span>
                        </div>
                        {/* Stars */}
                        <div className="flex items-center gap-0.5 mb-1.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className="h-3 w-3"
                              style={{
                                fill: i < review.rating ? "#facc15" : "none",
                                color: i < review.rating ? "#facc15" : "#d1d5db",
                              }}
                            />
                          ))}
                        </div>
                        {review.title && (
                          <p className="text-sm font-semibold text-[#111] mb-0.5">{review.title}</p>
                        )}
                        <p className="text-sm text-gray-600 leading-relaxed">{review.comment}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
              {reviews.length > reviewsVisible && (
                <button
                  onClick={() => setReviewsVisible((v) => v + 5)}
                  className="pt-4 text-xs font-semibold text-[#29a366] hover:underline text-left"
                >
                  Show more reviews ({reviews.length - reviewsVisible} remaining)
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── Product Details + Description ─────────────────────── */}
        <div className="bg-white p-4 md:p-6 mb-3">
          <p className="text-xs uppercase tracking-wide text-gray-400 font-semibold mb-3">Product Details</p>
          <div className="border border-gray-100 overflow-hidden text-sm divide-y divide-gray-100 mb-5">
            <div className="flex px-4 py-2.5 gap-3">
              <span className="text-gray-400 w-32 shrink-0">Category</span>
              <span className="text-gray-700">{productCategory}</span>
            </div>
            <div className="flex px-4 py-2.5 gap-3">
              <span className="text-gray-400 w-32 shrink-0">Status</span>
              <span className="text-gray-700 capitalize">{facility.status || "Available"}</span>
            </div>
            {soldCount > 0 && (
              <div className="flex px-4 py-2.5 gap-3">
                <span className="text-gray-400 w-32 shrink-0">Sold</span>
                <span className="text-gray-700">{soldCount} units</span>
              </div>
            )}
            {store?.name && (
              <div className="flex px-4 py-2.5 gap-3">
                <span className="text-gray-400 w-32 shrink-0">Store</span>
                <Link href={`/stores/${facility.storeId}`} className="text-[#29a366] hover:underline">
                  {store.name}
                </Link>
              </div>
            )}
          </div>

          <p className="text-xs uppercase tracking-wide text-gray-400 font-semibold mb-3">Product Description</p>
          <p className="text-sm text-gray-600 leading-relaxed mb-4">{facility.description}</p>

          {facility.amenities && facility.amenities.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {facility.amenities.map((amenity, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 rounded-full bg-[#f0fdf4] text-[#29a366] border border-[#29a366]/10 text-xs font-medium"
                >
                  {amenity}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* ── You Might Also Like ───────────────────────────────── */}
        {
          relatedProducts.length > 0 && (
            <div className="mb-3">
              <div className="flex items-center gap-4 mb-3">
                <div className="flex-1 h-px bg-primary/40" />
                <h2 className="text-xl font-headline font-normal tracking-[-0.04em] text-center shrink-0">
                  You Might Also Like
                </h2>
                <div className="flex-1 h-px bg-primary/40" />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {relatedProducts.slice(0, relatedVisible).map((product) => (
                  <div
                    key={product.id}
                    className="bg-white overflow-hidden border border-black/[0.06] flex flex-col"
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
                        />
                      )}
                    </Link>
                    <div className="p-3 flex flex-col gap-2">
                      <Link href={`/book/${product.id}`}>
                        <div className="flex items-start gap-1.5">
                          {product.isAuction && (
                            <span className="shrink-0 text-[10px] font-bold rounded-[3px] px-1.5 py-0.5 bg-orange-500 text-white mt-[2px]">
                              Auction
                            </span>
                          )}
                          {(product as any).productType === "wholesale" && (
                            <span className="shrink-0 text-[10px] font-bold rounded-[3px] px-1.5 py-0.5 bg-amber-600 text-white mt-[2px]">
                              Bulk
                            </span>
                          )}
                          <h3 className="text-sm font-normal leading-snug line-clamp-2 hover:text-primary transition-colors">
                            {product.name}
                          </h3>
                        </div>
                      </Link>
                      <p className="text-[17px] text-primary font-normal leading-none">
                        {product.isAuction
                          ? `₱${(product.currentBid || product.startingBid || 0).toLocaleString()}`
                          : `₱${(product.price || product.pricePerNight || 0).toLocaleString()}`}
                      </p>
                      {(product.sold ?? 0) > 0 && (
                        <span className="text-xs text-[#999] -mt-1">
                          {product.sold} sold
                        </span>
                      )}
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className="h-3 w-3"
                            style={{
                              fill: i < Math.round((product as any).rating ?? 0) ? "#f59e0b" : "#e5e7eb",
                              color: i < Math.round((product as any).rating ?? 0) ? "#f59e0b" : "#e5e7eb",
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {relatedVisible < relatedProducts.length && (
                <div className="flex justify-center mt-6">
                  <button
                    onClick={() => setRelatedVisible((v) => v + 10)}
                    className="px-8 py-3 rounded-full border border-[#29a366] text-[#29a366] text-sm font-semibold hover:bg-[#f0fdf4] transition-colors"
                  >
                    Load More
                  </button>
                </div>
              )}
            </div>
          )
        }
      </main >

      <Footer />

      {/* ── Cart toast — desktop only ─────────────────────────────── */}
      {
        cartToast && facility && (
          <div className="hidden md:flex fixed top-5 right-5 z-[9999] items-center gap-3 bg-white border border-black/[0.07] px-4 py-3.5 shadow-[0_8px_32px_rgba(0,0,0,0.12)]"
            style={{ animation: "slideInRight 220ms cubic-bezier(0.34,1.4,0.64,1)" }}
          >
            <div className="h-9 w-9 rounded-full bg-[#29a366] flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#111]">Added to cart</p>
              <p className="text-xs text-[#888]">{quantity} item{quantity > 1 ? "s" : ""} · ₱{(unitPrice * quantity).toLocaleString()}</p>
            </div>
            <Link
              href="/cart"
              className="ml-2 text-xs font-semibold text-[#29a366] hover:underline whitespace-nowrap"
            >
              View Cart
            </Link>
          </div>
        )
      }

      {/* ── Sticky bottom bar - mobile only ───────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 z-[1000] md:hidden bg-white border-t border-gray-100 px-4 py-3 pb-[max(env(safe-area-inset-bottom),12px)] shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
        <div className="flex items-center gap-3">
          {facility.isAuction ? (
            <button
              onClick={() => {
                if (!user) { router.push("/login"); return; }
                setBidSheetOpen(true);
              }}
              className="flex-1 py-3 rounded-md bg-[#29a366] text-white font-semibold text-sm flex items-center justify-center gap-2"
            >
              <Gavel className="h-4 w-4" /> Place Bid
            </button>
          ) : facility.productType === "wholesale" ? (
            <>
              <button
                onClick={() => {
                  if (!user) { router.push("/login"); return; }
                  setSheetQty(quantity);
                  setQuickSheet({ open: true, intent: "cart" });
                }}
                className="flex-1 py-3 rounded-md border border-[#29a366] text-[#29a366] font-semibold text-sm flex items-center justify-center gap-2"
              >
                <ShoppingCart className="h-4 w-4" /> Cart
              </button>
              <button
                onClick={() => {
                  if (!user) { router.push("/login"); return; }
                  setSheetQty(quantity);
                  setQuickSheet({ open: true, intent: "buy" });
                }}
                className="flex-1 py-3 rounded-md bg-amber-600 text-white font-semibold text-sm flex items-center justify-center gap-2"
              >
                <Package className="h-4 w-4" /> Bulk Order
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => {
                  if (!user) { router.push("/login"); return; }
                  setSheetQty(quantity);
                  setQuickSheet({ open: true, intent: "cart" });
                }}
                className={cn(
                  "flex-1 py-3 rounded-md border text-sm font-semibold flex items-center justify-center gap-2 transition-colors",
                  addedToCart
                    ? "border-green-500 text-green-600 bg-green-50"
                    : "border-[#29a366] text-[#29a366]"
                )}
              >
                <ShoppingCart className="h-4 w-4" />
                {addedToCart ? "Added!" : "Add to Cart"}
              </button>
              <button
                onClick={() => {
                  if (!user) { router.push("/login"); return; }
                  setSheetQty(quantity);
                  setQuickSheet({ open: true, intent: "buy" });
                }}
                className="flex-1 py-3 rounded-md bg-[#29a366] text-white font-semibold text-sm"
              >
                Buy Now
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Quick Selection Bottom Sheet ─────────────────────────── */}
      <Sheet open={quickSheet.open} onOpenChange={(v) => setQuickSheet((prev) => ({ ...prev, open: v }))}>
        <SheetContent side="bottom" className="rounded-t-[32px] px-0 pb-0 pt-0 border-none outline-none max-w-lg mx-auto [&>button]:hidden">
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-10 h-1 rounded-full bg-muted-foreground/20" />
          </div>
          <div className="px-6 pb-8 space-y-6">
            {/* Product snapshot */}
            <div className="flex gap-4">
              <div className="h-24 w-24 rounded-[20px] overflow-hidden bg-[#f8f8f8] shrink-0 border border-black/[0.03]">
                {facility.imageUrl && (
                  <Image
                    src={facility.imageUrl}
                    alt={facility.name}
                    width={96}
                    height={96}
                    className="object-cover h-full w-full"
                    unoptimized
                  />
                )}
              </div>
              <div className="flex flex-col justify-center min-w-0">
                <h3 className="text-base font-bold truncate">{facility.name}</h3>
                <p className="text-lg font-bold text-primary mt-0.5">
                  ₱{unitPrice.toLocaleString()}
                </p>
                <p className={cn("text-xs mt-1", availableStock > 0 ? "text-muted-foreground" : "text-red-500 font-bold")}>
                  {availableStock > 0 ? `${availableStock} available` : "Out of stock"}
                </p>
              </div>
            </div>

            <Separator className="bg-black/[0.05]" />

            {/* Variation / Category */}
            {(facility.type || facility.category) && (
              <div className="space-y-3">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Variation</p>
                <div className="flex flex-wrap gap-2">
                  <div className="px-4 py-2.5 rounded-full bg-black text-white text-xs font-bold">
                    {facility.type || facility.category}
                  </div>
                </div>
              </div>
            )}

            {/* Amenities / Highlights as selectable tags */}
            {facility.amenities && facility.amenities.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Highlights</p>
                <div className="flex flex-wrap gap-2">
                  {facility.amenities.map((tag, i) => (
                    <span key={i} className="px-3 py-2 rounded-full bg-[#f8f8f8] text-xs font-medium text-black/70 border border-black/[0.04]">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <Separator className="bg-black/[0.05]" />

            {/* Quantity selector */}
            <div className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Quantity</p>
              <div className="flex items-center justify-between bg-[#f8f8f8] rounded-full p-2">
                <button
                  onClick={() => setSheetQty(Math.max(1, sheetQty - 1))}
                  className="h-10 w-10 rounded-full bg-white shadow-sm flex items-center justify-center hover:bg-primary/10 transition-colors"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="text-xl font-bold w-16 text-center">{sheetQty}</span>
                <button
                  onClick={() => setSheetQty(Math.min(availableStock || 999, sheetQty + 1))}
                  className="h-10 w-10 rounded-full bg-white shadow-sm flex items-center justify-center hover:bg-primary/10 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Total */}
            <div className="flex justify-between items-center pt-2">
              <span className="text-sm text-muted-foreground font-medium">Total</span>
              <span className="text-xl font-bold text-primary">
                ₱{(unitPrice * sheetQty).toLocaleString()}
              </span>
            </div>

            {/* Confirm Action */}
            {quickSheet.intent === "cart" ? (
              <button
                disabled={availableStock <= 0}
                onClick={async () => {
                  if (!user) { router.push("/login"); return; }
                  setQuantity(sheetQty);
                  await supabase.from("cart_items").upsert(
                    { userId: user.uid, productId: facility.id, quantity: sheetQty },
                    { onConflict: "userId,productId" }
                  );
                  setQuickSheet({ open: false, intent: "cart" });
                  setAddedToCart(true);
                  setTimeout(() => setAddedToCart(false), 2500);
                }}
                className="w-full py-4 rounded-md bg-black text-white font-bold shadow-lg active:scale-[0.98] transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-40"
              >
                <ShoppingCart className="h-4 w-4" />
                {addedToCart ? "Added to Cart!" : "Add to Cart"}
              </button>
            ) : (
              <button
                disabled={availableStock <= 0}
                onClick={async () => {
                  if (!user) { router.push("/login"); return; }
                  setQuantity(sheetQty);
                  const { data: cartRow } = await supabase
                    .from("cart_items")
                    .upsert(
                      { userId: user.uid, productId: facility.id, quantity: sheetQty },
                      { onConflict: "userId,productId" }
                    )
                    .select("id")
                    .single();
                  if (cartRow?.id) {
                    localStorage.setItem("checkout_selected_ids", JSON.stringify([cartRow.id]));
                  }
                  setQuickSheet({ open: false, intent: "buy" });
                  router.push("/checkout");
                }}
                className="w-full py-4 rounded-md bg-primary text-white font-bold shadow-lg active:scale-[0.98] transition-all text-sm disabled:opacity-40"
              >
                Buy Now · ₱{(unitPrice * sheetQty).toLocaleString()}
              </button>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Order Overview — mobile sheet ──────────────────────────── */}
      <Sheet open={showCheckout} onOpenChange={setShowCheckout}>
        <SheetContent side="bottom" className="h-[95vh] rounded-t-[40px] p-0 border-none outline-none">
          <div className="flex flex-col h-full overflow-hidden">
            <div className="flex-1 overflow-y-auto p-6 pb-32">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-bold text-[#111]">Order Overview</h2>
                <button onClick={() => setShowCheckout(false)} className="p-2 hover:bg-muted rounded-full transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-8">
                <div className="bg-muted/30 rounded-[30px] p-6 space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-sm font-bold tracking-tight text-muted-foreground mb-1">Product</h4>
                      <p className="font-bold text-lg">{facility.name}</p>
                    </div>
                    <div className="text-right">
                      <h4 className="text-sm font-bold tracking-tight text-muted-foreground mb-1">Total</h4>
                      <p className="font-black text-xl text-primary">₱{(unitPrice * quantity).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="flex gap-4 items-center pt-2 border-t border-black/5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold">₱{unitPrice.toLocaleString()} × {quantity}</span>
                    </div>
                    <div className="h-1 w-1 rounded-full bg-muted-foreground/30" />
                    <span className="text-xs font-bold text-muted-foreground">
                      {quantity} {quantity === 1 ? "item" : "items"}
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-xs font-bold tracking-tight text-muted-foreground ml-2">Select payment method</h4>
                  <div className="grid grid-cols-1 gap-3">
                    <button
                      onClick={() => setPaymentMethod("onsite")}
                      className={cn(
                        "flex items-center gap-4 p-5 rounded-[24px] border-2 transition-all",
                        paymentMethod === "onsite" ? "border-primary bg-primary/5" : "border-black/5 bg-white hover:border-black/10"
                      )}
                    >
                      <div className={cn("h-10 w-10 rounded-full flex items-center justify-center shrink-0", paymentMethod === "onsite" ? "bg-primary text-white" : "bg-muted text-muted-foreground")}>
                        <Wallet className="h-5 w-5" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-bold">Pay on site</p>
                        <p className="text-[10px] text-muted-foreground font-medium tracking-tighter">Settle payment upon delivery</p>
                      </div>
                    </button>

                    <button
                      onClick={() => setPaymentMethod("gcash")}
                      className={cn(
                        "flex items-center gap-4 p-5 rounded-[24px] border-2 transition-all",
                        paymentMethod === "gcash" ? "border-primary bg-primary/5" : "border-black/5 bg-white hover:border-black/10"
                      )}
                    >
                      <div className={cn("h-10 w-10 rounded-full flex items-center justify-center shrink-0", paymentMethod === "gcash" ? "bg-primary text-white" : "bg-muted text-muted-foreground")}>
                        <Smartphone className="h-5 w-5" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-bold">GCash transfer</p>
                        <p className="text-[10px] text-muted-foreground font-medium tracking-tighter">Fast & digital payment</p>
                      </div>
                    </button>
                  </div>
                </div>

                {paymentMethod === "gcash" && (
                  <div className="p-6 bg-[#f2f2f2] rounded-[30px] flex flex-col items-center animate-in fade-in zoom-in duration-500">
                    <p className="text-[10px] font-bold tracking-tight mb-4">Scan to pay</p>
                    <div className="bg-white p-4 rounded-3xl shadow-sm mb-4 border border-black/5">
                      <img
                        src="https://picsum.photos/seed/gcashqr/300/300"
                        alt="GCash QR"
                        className="w-40 h-40 object-contain"
                        data-ai-hint="gcash qr"
                      />
                    </div>
                    <div className="flex items-start gap-2 max-w-[240px] opacity-60">
                      <Info className="h-4 w-4 shrink-0 mt-0.5" />
                      <p className="text-[10px] font-medium leading-relaxed">
                        Please save a screenshot of your receipt for verification upon delivery.
                      </p>
                    </div>
                  </div>
                )}

                <div className="pt-4">
                  <button
                    onClick={confirmBooking}
                    className="w-full py-5 rounded-full bg-black text-white font-bold shadow-xl active:scale-95 transition-all text-sm tracking-tight"
                  >
                    Order now
                  </button>
                  <p className="text-[10px] text-center text-muted-foreground mt-4 font-medium italic">
                    By clicking &quot;Order Now&quot;, you agree to our marketplace policies.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>



      {/* ── Bid Placement Bottom Sheet ─────────────────────────── */}
      <Sheet open={bidSheetOpen} onOpenChange={setBidSheetOpen}>
        <SheetContent side="bottom" className="rounded-t-[32px] px-0 pb-0 pt-0 border-none outline-none max-w-lg mx-auto [&>button]:hidden">
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-10 h-1 rounded-full bg-muted-foreground/20" />
          </div>
          <div className="px-6 pb-8 space-y-6">
            {/* Product snapshot */}
            <div className="flex gap-4">
              <div className="h-24 w-24 rounded-[20px] overflow-hidden bg-[#f8f8f8] shrink-0 border border-black/[0.03]">
                {facility.imageUrl && (
                  <Image
                    src={facility.imageUrl}
                    alt={facility.name}
                    width={96}
                    height={96}
                    className="object-cover h-full w-full"
                    unoptimized
                  />
                )}
              </div>
              <div className="flex flex-col justify-center min-w-0">
                <h3 className="text-base font-bold truncate">{facility.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <Gavel className="h-4 w-4 text-primary" />
                  <span className="text-sm font-bold text-primary">Live Auction</span>
                </div>
              </div>
            </div>

            {/* Bid Info */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-[#f8f8f8] rounded-[20px]">
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">Current Bid</p>
                <p className="text-2xl font-bold text-primary">
                  ₱{(facility.currentBid || facility.startingBid || 0).toLocaleString()}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">Total Bids</p>
                <p className="text-lg font-bold">{facility.bidCount || 0}</p>
              </div>
            </div>

            {facility.currentBidderId === user?.uid && (
              <div className="flex items-center gap-2 p-3 bg-green-50 rounded-xl text-green-700 text-xs font-bold">
                <CheckCircle2 className="h-3.5 w-3.5" />
                You are the highest bidder!
              </div>
            )}

            {/* Bid Form */}
            {bidPlaced ? (
              <div className="flex items-center gap-3 p-6 bg-green-50 rounded-[24px] text-green-700">
                <CheckCircle2 className="h-5 w-5" />
                <div>
                  <p className="text-sm font-bold">Your bid has been placed!</p>
                  <p className="text-xs opacity-80">You&apos;ll be notified if you&apos;re outbid.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Your Bid (₱)</label>
                  <input
                    type="number"
                    value={bidAmount}
                    onChange={(e) => setBidAmount(e.target.value)}
                    placeholder={`Min ₱${((facility.currentBid || facility.startingBid || 0) + 1).toLocaleString()}`}
                    className="w-full bg-[#f8f8f8] border-none rounded-full px-6 py-4 text-black outline-none focus:ring-2 focus:ring-primary/20 transition-all text-lg font-bold"
                  />
                  {bidAmount && parseFloat(bidAmount) <= (facility.currentBid || facility.startingBid || 0) && (
                    <p className="text-xs text-red-500 ml-2 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" /> Bid must be higher than the current bid
                    </p>
                  )}
                </div>
                <button
                  disabled={bidSubmitting}
                  onClick={async () => {
                    const amt = parseFloat(bidAmount);
                    if (!amt || amt <= (facility.currentBid || facility.startingBid || 0)) return;
                    setBidSubmitting(true);
                    try {
                      await supabase.from("bids").insert({
                        productId: facility.id,
                        bidderId: user?.uid,
                        amount: amt,
                      });
                      await supabase
                        .from("facilities")
                        .update({
                          currentBid: amt,
                          currentBidderId: user?.uid,
                          bidCount: (facility.bidCount || 0) + 1,
                        })
                        .eq("id", facility.id);
                      if (facility.sellerId) {
                        await supabase.from("notifications").insert({
                          userId: facility.sellerId,
                          title: "New bid on your item!",
                          content: `Someone placed a ₱${amt.toLocaleString()} bid on "${facility.name}".`,
                          type: "bid",
                          timestamp: new Date().toISOString(),
                          isRead: false,
                        });
                      }
                      setBidPlaced(true);
                      setBidAmount("");
                      confetti({ particleCount: 80, spread: 60, origin: { y: 0.7 }, colors: ["#e03d8f", "#ff8fb1"] });
                      setTimeout(() => {
                        setBidPlaced(false);
                        setBidSheetOpen(false);
                      }, 3000);
                    } catch (err) {
                      console.error("Bid error:", err);
                    } finally {
                      setBidSubmitting(false);
                    }
                  }}
                  className="w-full py-5 rounded-md bg-primary text-white font-bold shadow-lg active:scale-95 transition-all text-sm disabled:opacity-50"
                >
                  {bidSubmitting ? "Placing Bid..." : "Place Bid"}
                </button>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Success Overlay ───────────────────────────────────────── */}
      {
        showSuccess && (
          <div className="fixed inset-0 z-[6000] flex items-center justify-center p-4 bg-white/40 backdrop-blur-3xl animate-in fade-in duration-500">
            <div className="bg-white rounded-[32px] shadow-2xl max-w-[400px] w-full p-12 text-center animate-in zoom-in duration-700">
              <div className="h-20 w-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="h-10 w-10 text-green-500" />
              </div>
              <h2 className="text-3xl font-normal font-headline tracking-[-0.05em] mb-4">Order placed!</h2>
              <p className="text-muted-foreground text-sm leading-relaxed mb-10">
                Your order for {facility.name} is being processed. Check your profile for status updates.
              </p>
              <div className="flex flex-col gap-4">
                <button
                  onClick={() => router.push("/profile")}
                  className="bg-black text-white py-5 rounded-full font-bold shadow-md active:scale-95 transition-all text-xs tracking-tight w-full"
                >
                  View my orders
                </button>
                <button
                  onClick={() => setShowSuccess(false)}
                  className="text-primary font-bold text-xs tracking-tight hover:underline"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )
      }
    </div >
  );
}
