"use client";

import React, { useState, useMemo } from "react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import {
  useUser,
  useSupabase,
  useCollection,
  useStableMemo,
  useSupabaseAuth,
} from "@/supabase";
import {
  Calendar,
  ChevronRight,
  Search,
  Users,
  Star,
  Package,
} from "lucide-react";
import { FirstTimeIntro } from "@/components/first-time-intro";
import { ReviewModal } from "@/components/review-modal";
import { ProfileSidebar } from "@/app/profile/page";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface Booking {
  id: string;
  facilityId: string;
  startDate: string;
  endDate: string;
  totalPrice: number;
  status: string;
  numberOfGuests: number;
  storeId?: string;
}
interface Facility {
  id: string;
  name: string;
  imageUrl: string;
  storeId?: string;
}
interface Store {
  id: string;
  name: string;
  ownerId: string;
  imageUrl?: string;
}

const STATUS_FILTERS = [
  "All",
  "To Pay",
  "Pending",
  "Confirmed",
  "To Ship",
  "To Receive",
  "To Pickup",
  "Completed",
];

const statusStyle: Record<string, { color: string; bg: string }> = {
  "To Pay": { color: "#ca8a04", bg: "#fefce8" },
  Pending: { color: "#ea580c", bg: "#fff7ed" },
  Confirmed: { color: "#2563eb", bg: "#eff6ff" },
  "To Ship": { color: "#2563eb", bg: "#eff6ff" },
  "To Receive": { color: "#7c3aed", bg: "#f5f3ff" },
  "To Pickup": { color: "#ea580c", bg: "#fff7ed" },
  Completed: { color: "#16a34a", bg: "#f0fdf4" },
  Cancelled: { color: "#dc2626", bg: "#fef2f2" },
};

export default function MyBookingsPage() {
  const { user, isUserLoading } = useUser();
  const { auth } = useSupabaseAuth();
  const router = useRouter();
  const handleLogout = async () => {
    try {
      await auth.signOut();
      router.push("/login");
    } catch {}
  };
  const [searchTerm, setSearchTerm] = useState("");
  const [activeStatus, setActiveStatus] = useState("All");
  const [reviewModal, setReviewModal] = useState<{
    open: boolean;
    bookingId?: string;
    facilityId?: string;
    facilityName?: string;
    storeId?: string;
    storeName?: string;
    reviewType?: "product" | "seller";
  }>({ open: false });

  const bookingsQuery = useStableMemo(() => {
    if (!user?.id) return null;
    return { table: "bookings", filter: { userId: user.id } };
  }, [user?.id]);

  const facilitiesQuery = useStableMemo(() => ({ table: "facilities" }), []);
  const { data: facilities } = useCollection<Facility>(facilitiesQuery);

  const storesQuery = useStableMemo(() => ({ table: "stores" }), []);
  const { data: stores } = useCollection<Store>(storesQuery);

  const { data: bookings, isLoading: isBookingsLoading } =
    useCollection<Booking>(bookingsQuery);

  const filteredBookings = useMemo(() => {
    if (!bookings) return [];
    return bookings.filter((bk) => {
      const facility = facilities?.find((f) => f.id === bk.facilityId);
      const matchesSearch =
        facility?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        false;
      const matchesStatus =
        activeStatus === "All" || bk.status === activeStatus;
      return matchesSearch && matchesStatus;
    });
  }, [bookings, facilities, searchTerm, activeStatus]);

  if (isUserLoading)
    return (
      <div
        className="flex min-h-screen flex-col"
        style={{ backgroundColor: "#f2f2f0" }}
      >
        <Header />
        <main className="flex-grow pt-6">
          <div className="max-w-[1280px] mx-auto px-4 md:px-8 pb-24 space-y-4">
            <div className="bg-white rounded-[5px] border border-black/[0.06] px-6 py-5">
              <Skeleton className="h-6 w-28 rounded mb-1.5" />
              <Skeleton className="h-4 w-20 rounded" />
            </div>
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-white rounded-[5px] border border-black/[0.06] p-4 flex gap-4"
                >
                  <Skeleton className="h-20 w-20 rounded-[5px] shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4 rounded" />
                    <Skeleton className="h-3 w-1/2 rounded" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );

  if (!user) {
    if (typeof window !== "undefined") router.push("/login");
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
          <div className="flex-1 min-w-0 space-y-4">
            {/* Header + Search */}
            <div className="bg-white rounded-[5px] border border-black/[0.06] px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-lg font-semibold text-[#111]">My Orders</h1>
                <p className="text-sm text-[#888]">
                  {filteredBookings.length} order
                  {filteredBookings.length !== 1 ? "s" : ""}
                </p>
              </div>
              <div className="relative w-full sm:w-60">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#bbb]" />
                <input
                  type="text"
                  placeholder="Search orders…"
                  className="w-full bg-[#f2f2f0] border border-black/[0.08] rounded-md pl-9 pr-4 py-2 text-sm text-[#111] placeholder:text-[#bbb] outline-none focus:border-[#29a366] focus:bg-white transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {/* Status filter pills */}
            <div
              className="flex gap-2 overflow-x-auto pb-1"
              style={{ scrollbarWidth: "none" }}
            >
              {STATUS_FILTERS.map((status) => (
                <button
                  key={status}
                  onClick={() => setActiveStatus(status)}
                  className="px-3 py-1.5 rounded-[5px] text-xs font-semibold whitespace-nowrap shrink-0 transition-all"
                  style={
                    activeStatus === status
                      ? { background: "#29a366", color: "#fff" }
                      : {
                          background: "#fff",
                          color: "#555",
                          border: "1px solid rgba(0,0,0,0.08)",
                        }
                  }
                >
                  {status}
                </button>
              ))}
            </div>

            {/* Orders list */}
            {isBookingsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="bg-white rounded-[5px] border border-black/[0.06] p-4 flex gap-4"
                  >
                    <Skeleton className="h-20 w-20 rounded-[5px] shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4 rounded" />
                      <Skeleton className="h-3 w-1/2 rounded" />
                      <Skeleton className="h-3 w-1/3 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredBookings.length > 0 ? (
              <div className="space-y-3">
                {filteredBookings.map((bk) => {
                  const facility = facilities?.find(
                    (f) => f.id === bk.facilityId,
                  );
                  const store = stores?.find((s) => s.id === bk.storeId);
                  const isCompleted = bk.status === "Completed";
                  const style = statusStyle[bk.status] || {
                    color: "#555",
                    bg: "#f3f4f6",
                  };

                  return (
                    <div
                      key={bk.id}
                      className="bg-white rounded-[5px] border border-black/[0.06] overflow-hidden"
                    >
                      <div className="flex gap-4 p-4">
                        <div className="h-20 w-20 rounded-[5px] overflow-hidden shrink-0 bg-[#f2f2f0] relative">
                          <Image
                            src={
                              facility?.imageUrl ||
                              "https://picsum.photos/seed/product/400/300"
                            }
                            alt={facility?.name || "Product"}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <h3 className="text-sm font-medium text-[#111] line-clamp-2">
                              {facility?.name || "Loading…"}
                            </h3>
                            <span
                              className="text-[10px] font-semibold px-2 py-0.5 rounded shrink-0"
                              style={{
                                color: style.color,
                                background: style.bg,
                              }}
                            >
                              {bk.status}
                            </span>
                          </div>
                          <p className="text-xs text-[#888] mb-2">
                            Oriental Mindoro
                          </p>
                          <div className="flex flex-wrap items-center gap-4 text-xs text-[#777]">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5 text-[#ccc]" />
                              {new Date(bk.startDate).toLocaleDateString([], {
                                month: "short",
                                day: "numeric",
                              })}{" "}
                              –{" "}
                              {new Date(bk.endDate).toLocaleDateString([], {
                                month: "short",
                                day: "numeric",
                              })}
                            </span>
                            <span className="flex items-center gap-1">
                              <Users className="h-3.5 w-3.5 text-[#ccc]" />
                              {bk.numberOfGuests} items
                            </span>
                            <span className="font-semibold text-[#111]">
                              ₱{bk.totalPrice.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>

                      {isCompleted && (
                        <div className="flex gap-2 px-4 pb-4 border-t border-black/[0.04] pt-3">
                          <button
                            className="flex-1 h-8 rounded-[5px] text-xs font-semibold text-[#555] border border-black/[0.08] hover:bg-[#f2f2f0] transition-colors flex items-center justify-center gap-1.5"
                            onClick={() =>
                              setReviewModal({
                                open: true,
                                bookingId: bk.id,
                                facilityId: bk.facilityId,
                                facilityName: facility?.name,
                                reviewType: "product",
                              })
                            }
                          >
                            <Star className="h-3.5 w-3.5 text-yellow-400" />{" "}
                            Rate Product
                          </button>
                          <button
                            className="flex-1 h-8 rounded-[5px] text-xs font-semibold text-[#555] border border-black/[0.08] hover:bg-[#f2f2f0] transition-colors flex items-center justify-center gap-1.5"
                            onClick={() =>
                              setReviewModal({
                                open: true,
                                bookingId: bk.id,
                                storeId: bk.storeId,
                                storeName: store?.name,
                                reviewType: "seller",
                              })
                            }
                          >
                            <Star className="h-3.5 w-3.5 text-yellow-400" />{" "}
                            Rate Seller
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-white rounded-[5px] border border-black/[0.06] py-20 flex flex-col items-center text-center gap-4">
                <Calendar className="h-12 w-12 text-[#ddd]" strokeWidth={1.5} />
                <div>
                  <p className="text-sm text-[#888]">
                    No matching orders found.
                  </p>
                  <Link
                    href="/"
                    className="text-sm font-semibold mt-1 inline-block"
                    style={{ color: "#29a366" }}
                  >
                    Browse products
                  </Link>
                </div>
              </div>
            )}
          </div>
          {/* end flex-1 */}
        </div>
      </main>

      <FirstTimeIntro
        storageKey="my-bookings"
        title="My Orders"
        description="Track all your orders in one place. Filter by status and search by product name."
        icon={<Package className="h-7 w-7" />}
      />

      {reviewModal.open && user && reviewModal.reviewType && (
        <ReviewModal
          open={reviewModal.open}
          onOpenChange={(open) => setReviewModal({ ...reviewModal, open })}
          userId={user.uid}
          bookingId={reviewModal.bookingId || ""}
          facilityId={reviewModal.facilityId}
          facilityName={reviewModal.facilityName}
          storeId={reviewModal.storeId}
          storeName={reviewModal.storeName}
          reviewType={reviewModal.reviewType}
        />
      )}
      <Footer />
    </div>
  );
}
