"use client";

import React, { useRef, useState } from "react";
import { SellerLayout } from "@/components/layout/seller-layout";
import {
  MapPin,
  Star,
  Package,
  ShoppingCart,
  Settings,
  ArrowUpRight,
  Loader2,
  UserCircle,
  Edit2,
  TrendingUp,
  Camera,
  Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useSupabaseAuth,
  useSupabase,
  useStableMemo,
  useDoc,
  useCollection,
} from "@/supabase";
import { uploadImage } from "@/lib/upload-image";
import { Skeleton } from "@/components/ui/skeleton";

export default function SellerProfilePage() {
  const router = useRouter();
  const { user } = useSupabaseAuth();
  const supabase = useSupabase();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const storeRef = useStableMemo(
    () => (user ? { table: "stores", id: user.uid } : null),
    [user],
  );
  const productsConfig = useStableMemo(
    () =>
      user
        ? {
            table: "facilities",
            filters: [
              { column: "sellerId", op: "eq" as const, value: user.uid },
            ],
          }
        : null,
    [user],
  );
  const ordersConfig = useStableMemo(
    () =>
      user
        ? {
            table: "bookings",
            filters: [
              { column: "storeId", op: "eq" as const, value: user.uid },
            ],
          }
        : null,
    [user],
  );
  const followersConfig = useStableMemo(
    () =>
      user
        ? {
            table: "store_followers",
            filters: [
              { column: "storeId", op: "eq" as const, value: user.uid },
            ],
          }
        : null,
    [user],
  );

  const { data: store, isLoading } = useDoc(storeRef);
  const { data: products } = useCollection(productsConfig);
  const { data: orders } = useCollection(ordersConfig);
  const { data: followers } = useCollection(followersConfig);

  const s = store as any;
  const productCount = products?.length ?? 0;
  const orderCount = orders?.length ?? 0;
  const followerCount = followers?.length ?? (s?.followerCount || 0);
  const totalRevenue =
    orders?.reduce(
      (sum: number, o: any) => sum + Number(o.totalPrice || 0),
      0,
    ) ?? 0;
  const storeImage =
    s?.imageUrl ||
    "https://i.pinimg.com/736x/d2/98/4e/d2984ec4b65a8568eab3dc2b640fc58e.jpg";
  const joinDate = s?.createdAt
    ? new Date(s.createdAt).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      })
    : "";
  const location = [s?.barangay, s?.city, s?.province]
    .filter(Boolean)
    .join(", ");

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploadingLogo(true);
    try {
      const url = await uploadImage(
        supabase,
        "stores",
        file,
        `logo/${user.uid}`,
      );
      await supabase
        .from("stores")
        .update({ imageUrl: url })
        .eq("id", user.uid);
      window.location.reload();
    } catch {
      alert("Failed to upload logo.");
    } finally {
      setUploadingLogo(false);
    }
  };

  if (isLoading)
    return (
      <SellerLayout>
        <div className="px-4 md:px-6 pt-6 pb-8 space-y-4">
          <div className="bg-white rounded-2xl border border-black/[0.06] p-10 flex flex-col items-center gap-4">
            <Skeleton className="h-24 w-24 rounded-full" />
            <Skeleton className="h-6 w-40 rounded-full" />
            <Skeleton className="h-4 w-56 rounded-full" />
            <div className="flex gap-8 pt-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-16 rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </SellerLayout>
    );

  return (
    <SellerLayout>
      <div className="px-4 md:px-6 pt-6 pb-8 space-y-3">
        {/* ── Hero card ──────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-black/[0.06] overflow-hidden">
          {/* Gradient banner */}
          <div
            className="h-28"
            style={{
              background:
                "linear-gradient(135deg, #d1fae5 0%, #bbf7d0 60%, #a7f3d0 100%)",
            }}
          />

          {/* Content */}
          <div className="flex flex-col items-center text-center px-6 pb-6 -mt-12">
            {/* Avatar */}
            <div
              className="h-24 w-24 rounded-full border-4 border-white shadow-lg overflow-hidden bg-[#f2f2f0] relative group cursor-pointer mb-4 shrink-0"
              onClick={() => logoInputRef.current?.click()}
            >
              <Image
                src={storeImage}
                alt={s?.name || "Shop"}
                width={96}
                height={96}
                className="object-cover h-full w-full"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center rounded-full">
                <Camera className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              {uploadingLogo && (
                <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-full">
                  <Loader2 className="h-5 w-5 animate-spin text-[#29a366]" />
                </div>
              )}
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleLogoUpload}
                disabled={uploadingLogo}
              />
            </div>

            {/* Name & status */}
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold text-[#111]">
                {s?.name || "My Shop"}
              </h1>
              {s?.status === "active" && (
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ color: "#16a34a", background: "#dcfce7" }}
                >
                  Active
                </span>
              )}
            </div>

            {s?.category && (
              <p className="text-sm text-[#aaa] mb-3">{s.category}</p>
            )}
            {s?.description && (
              <p className="text-sm text-[#666] leading-relaxed max-w-sm mb-4">
                {s.description}
              </p>
            )}

            {/* Location + date */}
            {(location || joinDate) && (
              <p className="text-xs text-[#bbb] mb-6">
                {location && (
                  <span className="flex items-center justify-center gap-1 mb-0.5">
                    <MapPin className="h-3 w-3" />
                    {location}
                  </span>
                )}
                {joinDate && <span>Joined {joinDate}</span>}
              </p>
            )}

            {/* Edit button */}
            <Link href="/seller/settings">
              <button className="flex items-center gap-1.5 h-8 px-5 rounded-full border border-black/[0.10] text-xs font-semibold text-[#555] hover:bg-[#f2f2f0] transition-colors mb-6">
                <Edit2 className="h-3 w-3" /> Edit Shop
              </button>
            </Link>

            {/* Stats */}
            <div className="w-full grid grid-cols-4 divide-x divide-black/[0.06] border-t border-black/[0.06] pt-5">
              {[
                { label: "Products", value: productCount },
                { label: "Orders", value: orderCount },
                { label: "Followers", value: followerCount },
                {
                  label: "Revenue",
                  value: `₱${totalRevenue.toLocaleString()}`,
                },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="flex flex-col items-center gap-0.5 px-2"
                >
                  <p className="text-base font-bold text-[#111]">
                    {stat.value}
                  </p>
                  <p className="text-[11px] text-[#aaa]">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Rating & sales ─────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-black/[0.06] px-6 py-5 flex items-center justify-between">
          <div className="text-center flex-1">
            <p className="text-xl font-bold text-[#111]">
              {Number(s?.rating || 5).toFixed(1)}
            </p>
            <p className="text-[11px] text-[#aaa]">Shop Rating</p>
          </div>
          <div className="h-8 w-px bg-black/[0.06]" />
          <div className="text-center flex-1">
            <p className="text-xl font-bold text-[#111]">
              {s?.totalSales || 0}
            </p>
            <p className="text-[11px] text-[#aaa]">Total Sales</p>
          </div>
          <div className="h-8 w-px bg-black/[0.06]" />
          <div className="text-center flex-1">
            <p className="text-xl font-bold" style={{ color: "#29a366" }}>
              {productCount}
            </p>
            <p className="text-[11px] text-[#aaa]">Active Listings</p>
          </div>
        </div>

        {/* ── Actions ────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-black/[0.06] divide-y divide-black/[0.04] overflow-hidden">
          {[
            {
              href: "/seller/products",
              label: "My Products",
              sub: `${productCount} listed`,
            },
            {
              href: "/seller/orders",
              label: "Manage Orders",
              sub: `${orderCount} total`,
            },
            {
              href: "/seller/analytics",
              label: "Analytics",
              sub: "Performance insights",
            },
            {
              href: "/seller/settings",
              label: "Shop Settings",
              sub: "Preferences & info",
            },
          ].map((item) => (
            <Link key={item.href} href={item.href}>
              <div className="flex items-center justify-between px-5 py-4 hover:bg-[#fafafa] transition-colors group">
                <div>
                  <p className="text-sm font-semibold text-[#111]">
                    {item.label}
                  </p>
                  <p className="text-xs text-[#aaa]">{item.sub}</p>
                </div>
                <ArrowUpRight className="h-4 w-4 text-[#ddd] group-hover:text-[#29a366] transition-colors" />
              </div>
            </Link>
          ))}
        </div>

        {/* ── Switch to personal ─────────────────────────────── */}
        <button
          onClick={() => router.push("/profile")}
          className="w-full bg-white rounded-2xl border border-black/[0.06] px-5 py-4 flex items-center justify-between hover:border-blue-200 hover:bg-blue-50/30 transition-all group"
        >
          <div className="text-left">
            <p className="text-sm font-semibold text-blue-600">
              Switch to Personal Account
            </p>
            <p className="text-xs text-[#aaa]">View your buyer profile</p>
          </div>
          <ArrowUpRight className="h-4 w-4 text-blue-300 group-hover:text-blue-500 transition-colors" />
        </button>
      </div>
    </SellerLayout>
  );
}
