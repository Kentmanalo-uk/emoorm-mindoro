"use client";

import React from "react";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import {
  useUser,
  useCollection,
  useStableMemo,
  useSupabase,
  useSupabaseAuth,
} from "@/supabase";
import Image from "next/image";
import { Trash2, ShoppingCart, Heart, ChevronRight } from "lucide-react";
import { FirstTimeIntro } from "@/components/first-time-intro";
import { ProfileSidebar } from "@/app/profile/page";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";

export default function MyWishlistPage() {
  const { user, isUserLoading } = useUser();
  const { auth } = useSupabaseAuth();
  const supabase = useSupabase();
  const router = useRouter();
  const handleLogout = async () => {
    try {
      await auth.signOut();
      router.push("/login");
    } catch { }
  };

  const wishlistQuery = useStableMemo(() => {
    if (!user) return null;
    return {
      table: "wishlist",
      filters: [{ column: "userId", op: "eq" as const, value: user.uid }],
    };
  }, [user]);
  const { data: wishlistData, isLoading: wishlistLoading } =
    useCollection(wishlistQuery);

  const facilitiesQuery = useStableMemo(() => ({ table: "facilities" }), []);
  const { data: facilities } = useCollection(facilitiesQuery);

  const wishlistProducts = React.useMemo(() => {
    if (!wishlistData || !facilities) return [];
    return (wishlistData as any[])
      .map((w: any) => {
        const product = facilities.find((f: any) => f.id === w.productId);
        return product ? { ...product, wishlistId: w.id } : null;
      })
      .filter(Boolean);
  }, [wishlistData, facilities]);

  const removeFromWishlist = async (wishlistId: string) => {
    await supabase.from("wishlist").delete().eq("id", wishlistId);
    window.location.reload();
  };

  const addToCart = async (productId: string) => {
    if (!user) return;
    await supabase
      .from("cart_items")
      .upsert(
        { userId: user.uid, productId, quantity: 1 },
        { onConflict: "userId,productId" },
      );
  };

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
        </main>
        <Footer />
      </div>
    );

  if (!user)
    return (
      <div
        className="flex min-h-screen flex-col"
        style={{ backgroundColor: "#f2f2f0" }}
      >
        <Header />
        <main className="flex-grow pt-6">
          <div className="max-w-[1280px] mx-auto px-4 md:px-8 pb-24">
            <div className="bg-white rounded-[5px] border border-black/[0.06] py-20 flex flex-col items-center text-center gap-4">
              <Heart className="h-14 w-14 text-[#ddd]" strokeWidth={1.5} />
              <div>
                <h2 className="text-lg font-semibold text-[#111] mb-1">
                  My Wishlist
                </h2>
                <p className="text-sm text-[#888]">
                  Sign in to view your wishlist.
                </p>
              </div>
              <Link href="/login">
                <button
                  className="h-10 px-8 rounded-[5px] text-white text-sm font-semibold"
                  style={{ background: "#29a366" }}
                >
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
    <div
      className="flex min-h-screen flex-col"
      style={{ backgroundColor: "#f2f2f0" }}
    >
      <Header />
      <main className="flex-grow pt-6">
        <div className="max-w-[1280px] mx-auto px-4 md:px-8 pb-24 flex gap-5 items-start">
          <ProfileSidebar onLogout={handleLogout} />
          <div className="flex-1 min-w-0 space-y-4">
            <div className="bg-white rounded-[5px] border border-black/[0.06] px-6 py-5">
              <h1 className="text-lg font-semibold text-[#111]">My Wishlist</h1>
              <p className="text-sm text-[#888]">
                {wishlistProducts.length} item
                {wishlistProducts.length !== 1 ? "s" : ""}
              </p>
            </div>

            {wishlistLoading ? (
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
            ) : wishlistProducts.length === 0 ? (
              <div className="bg-white rounded-[5px] border border-black/[0.06] py-20 flex flex-col items-center text-center gap-4">
                <Heart className="h-14 w-14 text-[#ddd]" strokeWidth={1.5} />
                <p className="text-sm text-[#888]">Your wishlist is empty.</p>
                <Link href="/">
                  <button
                    className="h-10 px-8 rounded-[5px] text-white text-sm font-semibold"
                    style={{ background: "#29a366" }}
                  >
                    Browse Products
                  </button>
                </Link>
              </div>
            ) : (
              <div className="max-w-3xl space-y-3">
                {wishlistProducts.map((product: any) => (
                  <div
                    key={product.id}
                    className="bg-white rounded-[5px] border border-black/[0.06] p-4 flex gap-4"
                  >
                    <Link href={`/book/${product.id}`}>
                      <div className="h-20 w-20 rounded-[5px] overflow-hidden shrink-0 border border-black/[0.06]">
                        {product.imageUrl && (
                          <Image
                            src={product.imageUrl}
                            alt={product.name}
                            width={80}
                            height={80}
                            className="object-cover h-full w-full"
                          />
                        )}
                      </div>
                    </Link>
                    <div className="flex-1 min-w-0">
                      <Link href={`/book/${product.id}`}>
                        <h3 className="text-sm font-medium text-[#111] line-clamp-2 hover:text-[#29a366] transition-colors">
                          {product.name}
                        </h3>
                      </Link>
                      <p
                        className="text-sm font-semibold mt-1"
                        style={{ color: "#29a366" }}
                      >
                        ₱
                        {(
                          product.price ||
                          product.pricePerNight ||
                          0
                        ).toLocaleString()}
                      </p>
                      <div className="flex items-center gap-2 mt-3">
                        <button
                          onClick={() => addToCart(product.id)}
                          className="h-8 px-4 rounded-[5px] text-white text-xs font-semibold flex items-center gap-1.5"
                          style={{ background: "#29a366" }}
                        >
                          <ShoppingCart className="h-3.5 w-3.5" /> Add to Cart
                        </button>
                        <button
                          onClick={() => removeFromWishlist(product.wishlistId)}
                          className="p-1.5 text-[#ccc] hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          {/* end flex-1 */}
        </div>
      </main>
      <FirstTimeIntro
        storageKey="wishlist"
        title="Your Wishlist"
        description="Save products you love and come back to them anytime."
        icon={<Heart className="h-7 w-7" />}
      />
      <Footer />
    </div>
  );
}
