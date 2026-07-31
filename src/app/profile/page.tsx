"use client";

import React, { useState, useRef, useMemo } from "react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import {
  useUser,
  useSupabase,
  useCollection,
  useDoc,
  useStableMemo,
  useSupabaseAuth,
} from "@/supabase";
import {
  Shield,
  HelpCircle,
  LogOut,
  ChevronRight,
  Star,
  Settings,
  User as UserIcon,
  Store,
  ArrowUpRight,
  Heart,
  Truck,
  CreditCard,
  Package,
  ShoppingBag,
  Bell,
  MessageCircle,
  Tag,
  Camera,
  MapPin,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/contexts/language-context";
import { uploadImage } from "@/lib/upload-image";
import { Skeleton } from "@/components/ui/skeleton";

export function ProfileSidebar({ onLogout }: { onLogout: () => void }) {
  return (
    <aside className="hidden md:flex flex-col w-[200px] shrink-0 gap-2.5">
      <nav className="bg-white rounded-[5px] border border-black/[0.06] overflow-hidden">
        {[
          {
            label: "My Profile",
            href: "/profile",
            icon: <UserIcon className="h-4 w-4" />,
          },
          {
            label: "My Addresses",
            href: "/my-addresses",
            icon: <MapPin className="h-4 w-4" />,
          },
          {
            label: "My Reviews",
            href: "/my-reviews",
            icon: <Star className="h-4 w-4" />,
          },
          {
            label: "My Orders",
            href: "/my-bookings",
            icon: <Package className="h-4 w-4" />,
          },
          {
            label: "My Wishlist",
            href: "/wishlist",
            icon: <Heart className="h-4 w-4" />,
          },
          {
            label: "Followed Stores",
            href: "/profile#followed-stores",
            icon: <Store className="h-4 w-4" />,
          },
          {
            label: "Messages",
            href: "/messages",
            icon: <MessageCircle className="h-4 w-4" />,
          },
          {
            label: "Notifications",
            href: "/notifications",
            icon: <Bell className="h-4 w-4" />,
          },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-3 px-4 py-3 text-sm text-[#333] hover:text-[#29a366] border-b border-black/[0.05] last:border-0 transition-colors group"
          >
            <span className="text-[#bbb] group-hover:text-[#29a366] transition-colors">
              {item.icon}
            </span>
            {item.label}
          </Link>
        ))}
      </nav>
      <nav className="bg-white rounded-[5px] border border-black/[0.06] overflow-hidden">
        {[
          {
            label: "Settings",
            href: "/settings",
            icon: <Settings className="h-4 w-4" />,
          },
          {
            label: "Help Center",
            href: "/customer-care",
            icon: <HelpCircle className="h-4 w-4" />,
          },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-3 px-4 py-3 text-sm text-[#333] hover:text-[#29a366] border-b border-black/[0.05] last:border-0 transition-colors group"
          >
            <span className="text-[#bbb] group-hover:text-[#29a366] transition-colors">
              {item.icon}
            </span>
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}

export default function ProfilePage() {
  const { user, isUserLoading } = useUser();
  const { auth } = useSupabaseAuth();
  const supabase = useSupabase();
  const router = useRouter();

  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [localProfilePic, setLocalProfilePic] = useState<string | null>(null);

  const handleAvatarClick = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    try {
      const publicUrl = await uploadImage(
        supabase,
        "avatars",
        file,
        `avatars/${user.uid}`,
      );
      const freshUrl = `${publicUrl}?t=${Date.now()}`;
      await supabase
        .from("users")
        .update({ profilePictureUrl: freshUrl })
        .eq("id", user.uid);
      setLocalProfilePic(freshUrl);
    } catch {
      alert("Failed to upload profile picture.");
    } finally {
      setUploading(false);
    }
  };

  const userProfileRef = useStableMemo(() => {
    if (!user) return null;
    return { table: "users", id: user.uid };
  }, [user]);
  const { data: userProfile } = useDoc(userProfileRef);

  const storeRef = useStableMemo(() => {
    if (!user) return null;
    return { table: "stores", id: user.uid };
  }, [user]);
  const { data: userShop } = useDoc(storeRef);

  const bookingsQuery = useStableMemo(() => {
    if (!user) return null;
    return {
      table: "bookings",
      filters: [{ column: "userId", op: "eq" as const, value: user.uid }],
    };
  }, [user]);
  const { data: bookings } = useCollection(bookingsQuery);

  const facilitiesQuery = useStableMemo(() => ({ table: "facilities" }), []);
  const { data: facilities } = useCollection(facilitiesQuery);

  const wishlistQuery = useStableMemo(() => {
    if (!user) return null;
    return {
      table: "wishlist",
      filters: [{ column: "userId", op: "eq" as const, value: user.uid }],
    };
  }, [user]);
  const { data: wishlistData } = useCollection(wishlistQuery);

  const addressQuery = useStableMemo(() => {
    if (!user) return null;
    return {
      table: "addresses",
      filters: [{ column: "userId", op: "eq" as const, value: user.uid }],
    };
  }, [user]);
  const { data: addresses } = useCollection(addressQuery);

  const reviewsQuery = useStableMemo(() => {
    if (!user) return null;
    return {
      table: "reviews",
      filters: [{ column: "userId", op: "eq" as const, value: user.uid }],
    };
  }, [user]);
  const { data: userReviews } = useCollection(reviewsQuery);

  const storeFollowsQuery = useStableMemo(() => {
    if (!user) return null;
    return {
      table: "store_follows",
      filters: [{ column: "userId", op: "eq" as const, value: user.uid }],
    };
  }, [user]);
  const { data: storeFollows } = useCollection(storeFollowsQuery);

  const [followedStoreData, setFollowedStoreData] = useState<any[]>([]);
  React.useEffect(() => {
    if (!user || !storeFollows || (storeFollows as any[]).length === 0) {
      setFollowedStoreData([]);
      return;
    }
    const ids = (storeFollows as any[])
      .map((f: any) => f.storeId)
      .filter(Boolean);
    if (ids.length === 0) return;
    supabase
      .from("stores")
      .select("*")
      .in("id", ids)
      .then(({ data }) => {
        setFollowedStoreData(data || []);
      });
  }, [user, storeFollows]);

  const reviewsWithProducts = useMemo(() => {
    if (!userReviews || !facilities) return [];
    return (userReviews as any[]).map((r: any) => ({
      ...r,
      product: facilities.find(
        (f: any) => f.id === (r.productId ?? r.facilityId),
      ),
    }));
  }, [userReviews, facilities]);

  const wishlistProducts = useMemo(() => {
    if (!wishlistData || !facilities) return [];
    return (wishlistData as any[])
      .map((w: any) => {
        const product = facilities.find((f: any) => f.id === w.productId);
        return product ? { ...product, wishlistId: w.id } : null;
      })
      .filter(Boolean);
  }, [wishlistData, facilities]);

  const { t } = useLanguage();

  const handleLogout = async () => {
    try {
      await auth.signOut();
      router.push("/login");
    } catch {}
  };

  // ── Loading ────────────────────────────────────────────────────────
  if (isUserLoading)
    return (
      <div
        className="flex min-h-screen flex-col"
        style={{ backgroundColor: "#f2f2f0" }}
      >
        <Header />
        <main className="pt-6">
          <div className="max-w-[1280px] mx-auto px-4 md:px-8 pb-16 flex gap-5">
            <div className="hidden md:flex flex-col w-[200px] shrink-0 gap-2.5">
              <Skeleton className="h-[220px] rounded-[5px]" />
              <Skeleton className="h-[110px] rounded-[5px]" />
            </div>
            <div className="flex-1 space-y-3">
              <Skeleton className="h-[140px] rounded-[5px]" />
              <Skeleton className="h-[100px] rounded-[5px]" />
              <Skeleton className="h-[100px] rounded-[5px]" />
              <Skeleton className="h-[260px] rounded-[5px]" />
            </div>
          </div>
        </main>
      </div>
    );

  // ── Not logged in ──────────────────────────────────────────────────
  if (!user)
    return (
      <div
        className="flex min-h-screen flex-col"
        style={{ backgroundColor: "#f2f2f0" }}
      >
        <Header />
        <main className="flex-grow flex items-center justify-center px-4 pt-6">
          <div className="bg-white rounded-[5px] border border-black/[0.06] p-10 flex flex-col items-center text-center max-w-sm w-full">
            <div className="h-20 w-20 rounded-full bg-[#f5f5f5] flex items-center justify-center mb-4">
              <UserIcon className="h-10 w-10 text-[#ccc]" />
            </div>
            <h2 className="text-xl font-semibold text-[#111] mb-1">
              Welcome to Emoorm
            </h2>
            <p className="text-sm text-[#777] mb-6 leading-relaxed">
              Sign in to view your profile, orders, and wishlist.
            </p>
            <div className="flex gap-3 w-full">
              <button
                onClick={() => router.push("/login")}
                className="flex-1 h-11 rounded-[5px] text-white font-semibold text-sm"
                style={{ background: "#29a366" }}
              >
                Sign In
              </button>
              <button
                onClick={() => router.push("/signup")}
                className="flex-1 h-11 rounded-[5px] border border-[#e0e0e0] text-[#333] font-semibold text-sm hover:bg-[#f5f5f5] transition-all"
              >
                Sign Up
              </button>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );

  const displayName = userProfile?.firstName
    ? `${userProfile.firstName} ${userProfile.lastName}`
    : user.displayName || "Shopper";
  const profilePic =
    localProfilePic ||
    userProfile?.profilePictureUrl ||
    user.photoURL ||
    "https://i.pinimg.com/736x/d2/98/4e/d2984ec4b65a8568eab3dc2b640fc58e.jpg";

  const orderStatuses = [
    {
      label: t("profile.toPay"),
      status: "To Pay",
      icon: <CreditCard className="h-6 w-6" />,
    },
    {
      label: t("profile.toShip"),
      status: "To Ship",
      icon: <Truck className="h-6 w-6" />,
    },
    {
      label: t("profile.toReceive"),
      status: "To Receive",
      icon: <Package className="h-6 w-6" />,
    },
    {
      label: t("profile.toPickUp"),
      status: "Ready to PickUp",
      icon: <ShoppingBag className="h-6 w-6" />,
    },
  ];

  return (
    <div
      className="flex min-h-screen flex-col"
      style={{ backgroundColor: "#f2f2f0" }}
    >
      <Header />

      <main className="pt-6">
        <div className="max-w-[1280px] mx-auto px-4 md:px-8 pb-16 flex gap-5 items-start">
          {/* ── Sidebar ─────────────────────────────────────────────── */}
          <ProfileSidebar onLogout={handleLogout} />

          {/* ── Main ────────────────────────────────────────────────── */}
          <div className="flex-1 min-w-0 space-y-3">
            {/* Profile card */}
            <div className="bg-white rounded-[5px] border border-black/[0.06] p-6">
              <div className="flex items-center gap-5">
                {/* Avatar */}
                <div
                  className="relative h-20 w-20 rounded-full overflow-hidden bg-[#f5f5f5] border-2 border-[#f0f0f0] cursor-pointer shrink-0 group"
                  onClick={handleAvatarClick}
                  title="Change profile picture"
                >
                  <Image
                    src={profilePic}
                    alt="Profile"
                    fill
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Camera className="h-5 w-5 text-white" />
                  </div>
                  {uploading && (
                    <div className="absolute inset-0 bg-white/80 flex items-center justify-center text-[#29a366] text-[10px] font-bold">
                      Uploading...
                    </div>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                  disabled={uploading}
                />

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <h1 className="text-base font-semibold text-[#111] truncate">
                      {displayName}
                    </h1>
                  </div>
                  <p className="text-sm text-[#999] mb-3 truncate">
                    {user.email}
                  </p>
                  <div className="flex items-center gap-5">
                    <div className="text-center">
                      <p className="text-sm font-bold text-[#111]">
                        {(storeFollows as any[])?.length ?? 0}
                      </p>
                      <p className="text-[11px] text-[#999]">Following</p>
                    </div>
                    <div className="h-7 w-px bg-[#f0f0f0]" />
                    <div className="text-center">
                      <p className="text-sm font-bold text-[#111]">
                        {wishlistProducts.length}
                      </p>
                      <p className="text-[11px] text-[#999]">
                        {t("profile.wishlistCount")}
                      </p>
                    </div>
                    <div className="h-7 w-px bg-[#f0f0f0]" />
                    <div className="text-center">
                      <p className="text-sm font-bold text-[#111]">
                        {userReviews?.length ?? 0}
                      </p>
                      <p className="text-[11px] text-[#999]">
                        {t("profile.reviewsCount")}
                      </p>
                    </div>
                  </div>
                </div>

                <Link
                  href="/settings"
                  className="hidden sm:flex items-center gap-1.5 text-sm border border-[#e0e0e0] rounded-[5px] px-4 py-2 text-[#555] hover:border-[#29a366] hover:text-[#29a366] transition-colors shrink-0"
                >
                  <Settings className="h-3.5 w-3.5" />
                  {t("profile.editProfile")}
                </Link>
              </div>
            </div>

            {/* My Purchase */}
            <div className="bg-white rounded-[5px] border border-black/[0.06] p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-[#111]">
                  {t("profile.myPurchase")}
                </h2>
                <Link
                  href="/my-bookings"
                  className="flex items-center gap-0.5 text-xs text-[#29a366] hover:underline"
                >
                  See All <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>
              <div className="grid grid-cols-4 gap-1">
                {orderStatuses.map(({ label, status, icon }) => {
                  const count =
                    bookings?.filter((bk) => bk.status === status).length || 0;
                  return (
                    <Link
                      key={status}
                      href={`/my-bookings?status=${encodeURIComponent(status)}`}
                      className="flex flex-col items-center gap-1.5 py-3 rounded-[5px] hover:bg-[#f7f7f7] transition-colors"
                    >
                      <div className="relative text-[#555]">
                        {icon}
                        {count > 0 && (
                          <span className="absolute -top-1.5 -right-1.5 h-4 min-w-4 px-0.5 rounded-full bg-[#29a366] text-white text-[9px] font-bold flex items-center justify-center">
                            {count}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-[#555] font-medium text-center leading-tight">
                        {label}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Services */}
            <div className="bg-white rounded-[5px] border border-black/[0.06] p-5">
              <h2 className="text-sm font-semibold text-[#111] mb-4">
                {t("profile.services")}
              </h2>
              <div className="grid grid-cols-4 gap-1">
                {[
                  {
                    label: t("profile.notifications"),
                    icon: <Bell className="h-6 w-6" />,
                    href: "/notifications",
                  },
                  {
                    label: t("profile.messages"),
                    icon: <MessageCircle className="h-6 w-6" />,
                    href: "/messages",
                  },
                  {
                    label: t("profile.wishlistCount"),
                    icon: <Heart className="h-6 w-6" />,
                    href: "/wishlist",
                  },
                  {
                    label: t("profile.vouchers"),
                    icon: <Tag className="h-6 w-6" />,
                    href: "/vouchers",
                  },
                ].map(({ label, icon, href }) => (
                  <Link
                    key={href}
                    href={href}
                    className="flex flex-col items-center gap-1.5 py-3 rounded-[5px] hover:bg-[#f7f7f7] transition-colors"
                  >
                    <span className="text-[#29a366]">{icon}</span>
                    <span className="text-[11px] text-[#555] font-medium text-center">
                      {label}
                    </span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Followed Stores */}
            <div
              id="followed-stores"
              className="bg-white rounded-[5px] border border-black/[0.06] p-5"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-[#111]">
                  Followed Stores
                </h2>
                {followedStoreData.length > 6 && (
                  <Link
                    href="/profile#followed-stores"
                    className="flex items-center gap-0.5 text-xs text-[#29a366] hover:underline"
                  >
                    See All <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                )}
              </div>
              {followedStoreData.length > 0 ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                  {followedStoreData.slice(0, 6).map((store: any) => (
                    <Link
                      key={store.id}
                      href={`/stores/${store.id}`}
                      className="flex flex-col items-center gap-1.5 p-2.5 rounded-[5px] border border-black/[0.06] hover:border-[#29a366]/30 hover:bg-[#f9fffe] transition-all text-center"
                    >
                      <div className="h-11 w-11 rounded-full overflow-hidden bg-[#f5f5f5] border border-black/[0.06] shrink-0">
                        {store.logoUrl ? (
                          <Image
                            src={store.logoUrl}
                            alt={store.name}
                            width={44}
                            height={44}
                            className="object-cover h-full w-full"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center">
                            <Store className="h-5 w-5 text-[#ccc]" />
                          </div>
                        )}
                      </div>
                      <p className="text-[11px] font-medium text-[#111] line-clamp-1 w-full">
                        {store.name}
                      </p>
                      {(store.city || store.municipality) && (
                        <p className="text-[10px] text-[#aaa] line-clamp-1 w-full">
                          {store.city || store.municipality}
                        </p>
                      )}
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center py-8 text-center">
                  <Store className="h-9 w-9 text-[#e8e8e8] mb-2" />
                  <p className="text-sm text-[#999] mb-3">
                    Not following any stores yet
                  </p>
                  <Link
                    href="/"
                    className="text-sm text-[#29a366] font-semibold hover:underline"
                  >
                    Discover Stores
                  </Link>
                </div>
              )}
            </div>

            {/* Shop Tools */}
            <div className="grid grid-cols-2 gap-3">
              {userShop ? (
                <div className="bg-white rounded-[5px] border border-black/[0.06] p-5 flex flex-col items-center text-center">
                  <div className="h-12 w-12 rounded-full bg-[#29a366]/10 flex items-center justify-center mb-3">
                    <Store className="h-6 w-6 text-[#29a366]" />
                  </div>
                  <h3 className="text-sm font-semibold text-[#111] mb-1">
                    {(userShop as any).name || "My Shop"}
                  </h3>
                  <p className="text-xs text-[#999] mb-4 leading-relaxed">
                    Manage your products and orders
                  </p>
                  <Link
                    href="/seller/dashboard"
                    className="flex items-center gap-1 text-xs font-semibold text-white px-4 py-2 rounded-[5px]"
                    style={{ background: "#29a366" }}
                  >
                    Dashboard <ArrowUpRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              ) : (
                <div className="bg-white rounded-[5px] border border-black/[0.06] p-5 flex flex-col items-center text-center">
                  <div className="h-12 w-12 rounded-full bg-[#29a366]/10 flex items-center justify-center mb-3">
                    <Store className="h-6 w-6 text-[#29a366]" />
                  </div>
                  <h3 className="text-sm font-semibold text-[#111] mb-1">
                    {t("profile.becomeSeller")}
                  </h3>
                  <p className="text-xs text-[#999] mb-4 leading-relaxed">
                    {t("profile.startStore")}
                  </p>
                  <Link
                    href="/seller/register"
                    className="text-xs font-semibold text-white px-4 py-2 rounded-[5px]"
                    style={{ background: "#29a366" }}
                  >
                    Register Now
                  </Link>
                </div>
              )}
              <div className="bg-white rounded-[5px] border border-black/[0.06] p-5 flex flex-col items-center text-center">
                <div className="h-12 w-12 rounded-full bg-[#f5f5f5] flex items-center justify-center mb-3">
                  <HelpCircle className="h-6 w-6 text-[#777]" />
                </div>
                <h3 className="text-sm font-semibold text-[#111] mb-1">
                  {t("profile.helpCenter")}
                </h3>
                <p className="text-xs text-[#999] mb-4 leading-relaxed">
                  {t("profile.getSupport")}
                </p>
                <Link
                  href="/customer-care"
                  className="text-xs font-semibold text-[#29a366] border border-[#29a366]/30 px-4 py-2 rounded-[5px] hover:bg-[#29a366]/5 transition-all"
                >
                  Contact Us
                </Link>
              </div>
            </div>

            {/* Account menu (mobile only) */}
            <div className="md:hidden bg-white rounded-[5px] border border-black/[0.06] overflow-hidden">
              {[
                {
                  label: "My Addresses",
                  href: "/my-addresses",
                  icon: <MapPin className="h-4 w-4" />,
                },
                {
                  label: "My Reviews",
                  href: "/my-reviews",
                  icon: <Star className="h-4 w-4" />,
                },
                {
                  label: "Followed Stores",
                  href: "/profile#followed-stores",
                  icon: <Store className="h-4 w-4" />,
                },
                {
                  label: t("profile.settings"),
                  href: "/settings",
                  icon: <Settings className="h-4 w-4" />,
                },
                {
                  label: t("profile.privacy"),
                  href: "/privacy",
                  icon: <Shield className="h-4 w-4" />,
                },
                {
                  label: t("profile.helpCenter"),
                  href: "/customer-care",
                  icon: <HelpCircle className="h-4 w-4" />,
                },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 px-4 py-3.5 text-sm text-[#333] hover:text-[#29a366] border-b border-black/[0.05] transition-colors"
                >
                  <span className="text-[#bbb]">{item.icon}</span>
                  {item.label}
                  <ChevronRight className="h-4 w-4 text-[#ddd] ml-auto" />
                </Link>
              ))}
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 px-4 py-3.5 text-sm text-red-500 border-t border-black/[0.05] w-full"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
