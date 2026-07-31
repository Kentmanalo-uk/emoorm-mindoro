"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminLayout } from "@/components/layout/admin-layout";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Store,
  Search,
  MoreVertical,
  Trash2,
  Eye,
  Star,
  MapPin,
  Package,
  ShoppingCart,
  Ban,
  CheckCircle2,
  ExternalLink,
  AlertTriangle,
  Shield,
  ShieldOff,
  FileText,
  Phone,
  Mail,
  User,
  Camera,
  IdCard,
} from "lucide-react";
import {
  useUser,
  useSupabase,
  useStableMemo,
  useCollection,
  updateDocumentNonBlocking,
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";
import Link from "next/link";
import { logAdminAction } from "@/lib/admin-audit";

export default function AdminSellersPage() {
  const { user, isUserLoading } = useUser();
  const supabase = useSupabase();
  const router = useRouter();
  const { toast } = useToast();
  const { isAdmin, isAdminLoading } = useIsAdmin();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [verificationFilter, setVerificationFilter] = useState<string>("all");
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [suspendTarget, setSuspendTarget] = useState<{
    id: string;
    name: string;
    currentStatus: string;
  } | null>(null);
  const [verifyTarget, setVerifyTarget] = useState<{
    id: string;
    name: string;
    currentStatus: boolean;
  } | null>(null);
  const [viewRegTarget, setViewRegTarget] = useState<any | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    if (!isAdminLoading && !isAdmin) {
      router.push("/admin");
    }
  }, [isAdmin, isAdminLoading, router]);

  const storesConfig = useStableMemo(() => {
    if (!user || !isAdmin) return null;
    return { table: "stores" };
  }, [user, isAdmin, refreshTrigger]);
  const { data: allStores, isLoading } = useCollection(storesConfig);

  const productsConfig = useStableMemo(() => {
    if (!user || !isAdmin) return null;
    return { table: "facilities" };
  }, [user, isAdmin]);
  const { data: allProducts } = useCollection(productsConfig);

  const ordersConfig = useStableMemo(() => {
    if (!user || !isAdmin) return null;
    return { table: "bookings" };
  }, [user, isAdmin]);
  const { data: allOrders } = useCollection(ordersConfig);

  if (isAdminLoading || !isAdmin) return null;

  const filteredStores = (allStores ?? []).filter((s: any) => {
    const matchesSearch =
      !searchQuery ||
      (s.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.category || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && s.status !== "suspended") ||
      (statusFilter === "suspended" && s.status === "suspended");
    const matchesVerification =
      verificationFilter === "all" ||
      (verificationFilter === "verified" && s.verified) ||
      (verificationFilter === "unverified" && !s.verified);
    return matchesSearch && matchesStatus && matchesVerification;
  });

  const getStoreProductCount = (storeId: string) =>
    allProducts?.filter(
      (p: any) => p.sellerId === storeId || p.storeId === storeId,
    ).length ?? 0;

  const getStoreOrderCount = (storeId: string) =>
    allOrders?.filter(
      (o: any) => o.storeId === storeId || o.sellerId === storeId,
    ).length ?? 0;

  const getStoreRevenue = (storeId: string) =>
    allOrders
      ?.filter((o: any) => o.storeId === storeId || o.sellerId === storeId)
      .reduce((sum, o: any) => sum + (Number(o.totalPrice) || 0), 0) ?? 0;

  const handleSuspendStore = async (storeId: string, currentStatus: string) => {
    const newStatus = currentStatus === "suspended" ? "active" : "suspended";

    try {
      const { error } = await supabase
        .from("stores")
        .update({ status: newStatus })
        .eq("id", storeId);

      if (error) {
        const errorMsg =
          error?.message || JSON.stringify(error) || "Unknown error";
        console.error("Suspend/reactivate error:", errorMsg);
        toast({
          title: "Error",
          description: "Failed to update store status. Please try again.",
        });
        return;
      }

      // Trigger a data refresh
      setRefreshTrigger((prev) => prev + 1);

      const target = (allStores ?? []).find((s: any) => s.id === storeId);
      if (user) {
        await logAdminAction(supabase, {
          adminId: user.uid,
          adminEmail: user.email ?? undefined,
          action: "seller.suspend",
          targetType: "seller",
          targetId: storeId,
          targetLabel: target?.name || storeId,
          metadata: { from: currentStatus, to: newStatus },
        });
      }

      toast({
        title:
          newStatus === "suspended" ? "Store suspended" : "Store reactivated",
        description:
          newStatus === "suspended"
            ? "The store has been suspended and will no longer be visible to customers."
            : "The store is now active and visible to customers.",
      });
      setSuspendTarget(null);
    } catch (err) {
      console.error("Suspend/reactivate exception:", err);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
      });
    }
  };

  const handleVerifyStore = async (
    storeId: string,
    currentVerificationStatus: boolean,
  ) => {
    const newVerificationStatus = !currentVerificationStatus;
    const verifiedAtTime = newVerificationStatus
      ? new Date().toISOString()
      : null;

    console.log("[VERIFY] Starting verification for store:", {
      storeId,
      newVerificationStatus,
      verifiedAtTime,
    });

    try {
      const { data, error, count } = await supabase
        .from("stores")
        .update({
          verified: newVerificationStatus,
          verified_at: verifiedAtTime,
        })
        .eq("id", storeId)
        .select();

      console.log("[VERIFY] Update response:", { data, error, count });

      if (error) {
        const errorMsg =
          error?.message || JSON.stringify(error) || "Unknown error";
        console.error("[VERIFY] Database error:", errorMsg);
        toast({
          title: "Error",
          description: `Failed to update seller verification: ${errorMsg}`,
        });
        return;
      }

      if (!data || data.length === 0) {
        console.error(
          "[VERIFY] No rows were updated. Store ID may not exist:",
          storeId,
        );
        toast({
          title: "Error",
          description:
            "Store not found or could not be updated. Please refresh and try again.",
        });
        return;
      }

      console.log("[VERIFY] Update successful, new data:", data[0]);

      // Verify the data was actually persisted
      const { data: verifyData, error: verifyError } = await supabase
        .from("stores")
        .select("verified, verified_at")
        .eq("id", storeId)
        .single();

      console.log("[VERIFY] Verification check:", {
        verified: verifyData?.verified,
        verified_at: verifyData?.verified_at,
        error: verifyError,
      });

      if (verifyError) {
        console.error(
          "[VERIFY] Error checking verification:",
          verifyError.message,
        );
      } else if (verifyData?.verified !== newVerificationStatus) {
        console.error(
          "[VERIFY] CRITICAL: Data was not persisted! Expected:",
          newVerificationStatus,
          "Got:",
          verifyData?.verified,
        );
        toast({
          title: "Warning",
          description:
            "Verification may not have been saved. Please check manually.",
        });
      }

      // Trigger a data refresh by incrementing the refresh counter
      setRefreshTrigger((prev) => prev + 1);

      const target = (allStores ?? []).find((s: any) => s.id === storeId);
      if (user) {
        await logAdminAction(supabase, {
          adminId: user.uid,
          adminEmail: user.email ?? undefined,
          action: newVerificationStatus ? "seller.verify" : "seller.unverify",
          targetType: "seller",
          targetId: storeId,
          targetLabel: target?.name || storeId,
        });
      }

      toast({
        title: newVerificationStatus
          ? "✓ Seller verified"
          : "✓ Verification revoked",
        description: newVerificationStatus
          ? "This seller is now verified. Their products will be visible to customers immediately."
          : "This seller's verification has been revoked. Their products will no longer be visible to customers.",
      });
      setVerifyTarget(null);
    } catch (err) {
      console.error("[VERIFY] Exception:", err);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
      });
    }
  };

  const handleDeleteStore = async (storeId: string) => {
    try {
      // Also deactivate all products from this store
      const storeProducts =
        allProducts?.filter(
          (p: any) => p.sellerId === storeId || p.storeId === storeId,
        ) ?? [];

      // Deactivate products
      for (const p of storeProducts) {
        const { error } = await supabase
          .from("facilities")
          .update({ status: "draft" })
          .eq("id", p.id);
        if (error) {
          const errorMsg =
            error?.message || JSON.stringify(error) || "Unknown error";
          console.error(`Error deactivating product ${p.id}:`, errorMsg);
        }
      }

      // Delete store
      const { error: deleteError } = await supabase
        .from("stores")
        .delete()
        .eq("id", storeId);

      if (deleteError) {
        const errorMsg =
          deleteError?.message ||
          JSON.stringify(deleteError) ||
          "Unknown error";
        console.error("Delete error:", errorMsg);
        toast({
          title: "Error",
          description: "Failed to delete store. Please try again.",
        });
        return;
      }

      // Trigger a data refresh
      setRefreshTrigger((prev) => prev + 1);

      const target = (allStores ?? []).find((s: any) => s.id === storeId);
      if (user) {
        await logAdminAction(supabase, {
          adminId: user.uid,
          adminEmail: user.email ?? undefined,
          action: "seller.delete",
          targetType: "seller",
          targetId: storeId,
          targetLabel: target?.name || storeId,
          metadata: { productsRemoved: storeProducts.length },
        });
      }

      toast({
        title: "Store deleted",
        description: `The store and its ${storeProducts.length} products have been removed.`,
      });
      setDeleteTarget(null);
    } catch (err) {
      console.error("Delete exception:", err);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
      });
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto p-6 md:p-8 w-full pt-6 md:pt-32 pb-24 space-y-8 md:space-y-10">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-normal font-headline tracking-[-0.05em] text-black dark:text-white">
              Seller Management
            </h1>
            <p className="text-sm text-muted-foreground font-normal">
              {allStores?.length ?? 0} registered sellers
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
          {[
            {
              label: "Total Sellers",
              value: allStores?.length ?? 0,
              icon: Store,
              color: "text-blue-600 bg-blue-50 dark:bg-blue-500/10",
            },
            {
              label: "Verified Sellers",
              value: allStores?.filter((s: any) => s.verified).length ?? 0,
              icon: Shield,
              color: "text-green-600 bg-green-50 dark:bg-green-500/10",
            },
            {
              label: "Total Products",
              value: allProducts?.length ?? 0,
              icon: Package,
              color: "text-purple-600 bg-purple-50 dark:bg-purple-500/10",
            },
            {
              label: "Suspended",
              value:
                allStores?.filter((s: any) => s.status === "suspended")
                  .length ?? 0,
              icon: Ban,
              color: "text-red-600 bg-red-50 dark:bg-red-500/10",
            },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <Card
                key={stat.label}
                className="shadow-[0_20px_50px_rgba(0,0,0,0.04)] border border-black/[0.02] rounded-[32px] bg-white dark:bg-white/[0.03]"
              >
                <CardContent className="p-5 md:p-8">
                  <div className={`p-3 rounded-2xl ${stat.color} w-fit mb-4`}>
                    <Icon className="h-5 w-5 md:h-6 md:w-6" />
                  </div>
                  <p className="text-xs text-muted-foreground font-medium mb-1">
                    {stat.label}
                  </p>
                  <p className="text-xl md:text-3xl font-normal font-headline tracking-[-0.05em]">
                    {stat.value}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Search & Filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search sellers by name or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.06] rounded-full pl-11 pr-5 py-3.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>
        </div>

        {/* Status and Verification Filters */}
        <div className="flex flex-col gap-3">
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2">
              Store Status
            </p>
            <div className="flex gap-2 flex-wrap">
              {[
                { key: "all", label: "All" },
                { key: "active", label: "Active" },
                { key: "suspended", label: "Suspended" },
              ].map((f) => (
                <Button
                  key={f.key}
                  variant={statusFilter === f.key ? "default" : "outline"}
                  size="sm"
                  className={cn(
                    "rounded-full px-5 h-11 text-xs font-bold shrink-0",
                    statusFilter === f.key
                      ? "bg-black text-white hover:bg-primary"
                      : "border-black/[0.06]",
                  )}
                  onClick={() => setStatusFilter(f.key)}
                >
                  {f.label}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2">
              Verification Status
            </p>
            <div className="flex gap-2 flex-wrap">
              {[
                { key: "all", label: "All", icon: null },
                {
                  key: "verified",
                  label: "Verified",
                  icon: <Shield className="h-3 w-3" />,
                },
                {
                  key: "unverified",
                  label: "Unverified",
                  icon: <ShieldOff className="h-3 w-3" />,
                },
              ].map((f) => (
                <Button
                  key={f.key}
                  variant={verificationFilter === f.key ? "default" : "outline"}
                  size="sm"
                  className={cn(
                    "rounded-full px-5 h-11 text-xs font-bold shrink-0 gap-2",
                    verificationFilter === f.key
                      ? "bg-blue-600 text-white hover:bg-blue-700"
                      : "border-black/[0.06]",
                  )}
                  onClick={() => setVerificationFilter(f.key)}
                >
                  {f.icon}
                  {f.label}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Sellers List */}
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="rounded-[32px] border border-black/[0.02] bg-white dark:bg-white/[0.03] p-6 flex items-center gap-4"
              >
                <Skeleton className="h-16 w-16 rounded-2xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/3 rounded-full" />
                  <Skeleton className="h-3 w-1/2 rounded-full" />
                </div>
                <Skeleton className="h-8 w-20 rounded-full" />
              </div>
            ))}
          </div>
        ) : filteredStores.length === 0 ? (
          <Card className="shadow-[0_20px_50px_rgba(0,0,0,0.04)] border border-black/[0.02] rounded-[32px] bg-white dark:bg-white/[0.03]">
            <CardContent className="py-20 text-center">
              <Store className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No sellers found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredStores.map((store: any) => {
              const logoUrl =
                store.logoUrl ||
                "https://i.pinimg.com/736x/d2/98/4e/d2984ec4b65a8568eab3dc2b640fc58e.jpg";
              const productCount = getStoreProductCount(store.id);
              const orderCount = getStoreOrderCount(store.id);
              const revenue = getStoreRevenue(store.id);

              return (
                <Card
                  key={store.id}
                  className="shadow-[0_20px_50px_rgba(0,0,0,0.04)] border border-black/[0.02] rounded-[32px] bg-white dark:bg-white/[0.03] overflow-hidden"
                >
                  <CardContent className="p-5 md:p-8">
                    <div className="flex items-start gap-4 md:gap-6">
                      <div className="h-16 w-16 md:h-20 md:w-20 rounded-2xl overflow-hidden border border-black/[0.06] shrink-0">
                        <Image
                          src={logoUrl}
                          alt={store.name || "Store"}
                          width={80}
                          height={80}
                          className="object-cover h-full w-full"
                          unoptimized
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-lg font-medium font-headline tracking-[-0.02em] truncate">
                            {store.name || "Unnamed Store"}
                          </h3>
                          <Badge
                            className={cn(
                              "rounded-full px-3 py-0.5 text-[10px] font-bold shrink-0",
                              store.status === "suspended"
                                ? "bg-red-50 text-red-600"
                                : "bg-green-50 text-green-600",
                            )}
                          >
                            {store.status === "suspended"
                              ? "Suspended"
                              : "Active"}
                          </Badge>
                          <Badge
                            className={cn(
                              "rounded-full px-3 py-0.5 text-[10px] font-bold shrink-0 gap-1",
                              store.verified
                                ? "bg-blue-50 text-blue-600"
                                : "bg-orange-50 text-orange-600",
                            )}
                          >
                            {store.verified ? (
                              <>
                                <Shield className="h-2.5 w-2.5" /> Verified
                              </>
                            ) : (
                              <>
                                <ShieldOff className="h-2.5 w-2.5" /> Unverified
                              </>
                            )}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mb-3 truncate">
                          {store.category || "General"} ·{" "}
                          {store.description?.slice(0, 60) || "No description"}
                        </p>
                        {store.verified && store.verified_at && (
                          <p className="text-[11px] text-blue-600 dark:text-blue-400 mb-3">
                            ✓ Verified on{" "}
                            {new Date(store.verified_at).toLocaleDateString()}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Package className="h-3.5 w-3.5" /> {productCount}{" "}
                            products
                          </span>
                          <span className="flex items-center gap-1">
                            <ShoppingCart className="h-3.5 w-3.5" />{" "}
                            {orderCount} orders
                          </span>
                          <span className="flex items-center gap-1 font-medium text-black dark:text-white">
                            ₱{revenue.toLocaleString()} revenue
                          </span>
                          {store.city && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5" /> {store.city}
                            </span>
                          )}
                          {store.rating && (
                            <span className="flex items-center gap-1">
                              <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />{" "}
                              {store.rating}
                            </span>
                          )}
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="rounded-full h-9 w-9 shrink-0"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="w-48 rounded-2xl p-1 shadow-[0_20px_50px_rgba(0,0,0,0.1)] bg-white/80 backdrop-blur-xl border-none"
                        >
                          <DropdownMenuItem
                            asChild
                            className="rounded-xl gap-3 px-3 py-2.5 cursor-pointer"
                          >
                            <Link href={`/stores/${store.id}`}>
                              <ExternalLink className="h-4 w-4" /> View Store
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="rounded-xl gap-3 px-3 py-2.5 cursor-pointer"
                            onClick={() => setViewRegTarget(store)}
                          >
                            <FileText className="h-4 w-4 text-indigo-600" />{" "}
                            View Registration
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="rounded-xl gap-3 px-3 py-2.5 cursor-pointer"
                            onClick={() =>
                              setVerifyTarget({
                                id: store.id,
                                name: store.name || "this store",
                                currentStatus: store.verified,
                              })
                            }
                          >
                            {store.verified ? (
                              <>
                                <ShieldOff className="h-4 w-4 text-orange-600" />{" "}
                                Revoke Verification
                              </>
                            ) : (
                              <>
                                <Shield className="h-4 w-4 text-blue-600" />{" "}
                                Verify Seller
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="rounded-xl gap-3 px-3 py-2.5 cursor-pointer"
                            onClick={() =>
                              setSuspendTarget({
                                id: store.id,
                                name: store.name || "this store",
                                currentStatus: store.status || "active",
                              })
                            }
                          >
                            {store.status === "suspended" ? (
                              <>
                                <CheckCircle2 className="h-4 w-4" /> Reactivate
                              </>
                            ) : (
                              <>
                                <Ban className="h-4 w-4" /> Suspend
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="rounded-xl gap-3 px-3 py-2.5 cursor-pointer text-red-600"
                            onClick={() =>
                              setDeleteTarget({
                                id: store.id,
                                name: store.name || "this store",
                              })
                            }
                          >
                            <Trash2 className="h-4 w-4" /> Delete Store
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

        {/* Delete Confirmation Dialog */}
        <AlertDialog
          open={!!deleteTarget}
          onOpenChange={() => setDeleteTarget(null)}
        >
          <AlertDialogContent className="rounded-3xl">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                Delete Store
              </AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete{" "}
                <strong>{deleteTarget?.name}</strong>? This will also deactivate
                all products from this store. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-full">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                className="rounded-full bg-red-600 hover:bg-red-700"
                onClick={() =>
                  deleteTarget && handleDeleteStore(deleteTarget.id)
                }
              >
                Delete Store
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Suspend/Reactivate Confirmation Dialog */}
        <AlertDialog
          open={!!suspendTarget}
          onOpenChange={() => setSuspendTarget(null)}
        >
          <AlertDialogContent className="rounded-3xl">
            <AlertDialogHeader>
              <AlertDialogTitle>
                {suspendTarget?.currentStatus === "suspended"
                  ? "Reactivate Store"
                  : "Suspend Store"}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {suspendTarget?.currentStatus === "suspended" ? (
                  <>
                    Reactivate <strong>{suspendTarget?.name}</strong>? The store
                    will be visible to customers again.
                  </>
                ) : (
                  <>
                    Suspend <strong>{suspendTarget?.name}</strong>? The store
                    will be hidden from customers.
                  </>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-full">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                className={cn(
                  "rounded-full",
                  suspendTarget?.currentStatus === "suspended"
                    ? ""
                    : "bg-red-600 hover:bg-red-700",
                )}
                onClick={() =>
                  suspendTarget &&
                  handleSuspendStore(
                    suspendTarget.id,
                    suspendTarget.currentStatus,
                  )
                }
              >
                {suspendTarget?.currentStatus === "suspended"
                  ? "Reactivate"
                  : "Suspend"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Registration Data Dialog */}
        <Dialog
          open={!!viewRegTarget}
          onOpenChange={() => setViewRegTarget(null)}
        >
          <DialogContent className="rounded-3xl max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl font-headline font-normal tracking-[-0.03em]">
                <FileText className="h-5 w-5 text-indigo-600" />
                Seller Registration — {viewRegTarget?.name}
              </DialogTitle>
            </DialogHeader>

            {viewRegTarget && (
              <div className="space-y-6 mt-2">
                {/* Store Info */}
                <div className="p-4 bg-[#f8f8f8] rounded-2xl space-y-3">
                  <p className="text-xs font-bold text-muted-foreground ">
                    Store Information
                  </p>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Store Name</span>
                      <p className="font-medium">{viewRegTarget.name || "—"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Category</span>
                      <p className="font-medium">
                        {viewRegTarget.category || "—"}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">City</span>
                      <p className="font-medium">{viewRegTarget.city || "—"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Barangay</span>
                      <p className="font-medium">
                        {viewRegTarget.barangay || "—"}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Address</span>
                      <p className="font-medium">
                        {viewRegTarget.address || "—"}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Description</span>
                      <p className="font-medium text-xs leading-relaxed">
                        {viewRegTarget.description || "—"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Owner Info */}
                <div className="p-4 bg-[#f8f8f8] rounded-2xl space-y-3">
                  <p className="text-xs font-bold text-muted-foreground ">
                    Owner Information
                  </p>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div>
                        <span className="text-muted-foreground text-xs">
                          Full Name
                        </span>
                        <p className="font-medium">
                          {viewRegTarget.ownerName || "—"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div>
                        <span className="text-muted-foreground text-xs">
                          Email
                        </span>
                        <p className="font-medium truncate">
                          {viewRegTarget.email || "—"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div>
                        <span className="text-muted-foreground text-xs">
                          Contact
                        </span>
                        <p className="font-medium">
                          {viewRegTarget.contact || viewRegTarget.phone || "—"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <IdCard className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div>
                        <span className="text-muted-foreground text-xs">
                          ID Type
                        </span>
                        <p className="font-medium">
                          {viewRegTarget.governmentIdType || "—"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ID Documents */}
                <div className="space-y-3">
                  <p className="text-xs font-bold text-muted-foreground ">
                    KYC Documents
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Government ID Front */}
                    <div className="space-y-2">
                      <p className="text-xs font-semibold flex items-center gap-1.5 text-muted-foreground">
                        <IdCard className="h-3.5 w-3.5" /> Government ID (Front)
                      </p>
                      {viewRegTarget.governmentIdFront ? (
                        <a
                          href={viewRegTarget.governmentIdFront}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Image
                            src={viewRegTarget.governmentIdFront}
                            alt="ID Front"
                            width={280}
                            height={180}
                            className="w-full object-cover rounded-2xl border border-black/[0.06] hover:opacity-90 transition-opacity cursor-pointer"
                            unoptimized
                          />
                        </a>
                      ) : (
                        <div className="w-full h-32 rounded-2xl bg-[#f8f8f8] border border-dashed border-black/10 flex items-center justify-center text-xs text-muted-foreground">
                          No image uploaded
                        </div>
                      )}
                    </div>

                    {/* Government ID Back */}
                    <div className="space-y-2">
                      <p className="text-xs font-semibold flex items-center gap-1.5 text-muted-foreground">
                        <IdCard className="h-3.5 w-3.5" /> Government ID (Back)
                      </p>
                      {viewRegTarget.governmentIdBack ? (
                        <a
                          href={viewRegTarget.governmentIdBack}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Image
                            src={viewRegTarget.governmentIdBack}
                            alt="ID Back"
                            width={280}
                            height={180}
                            className="w-full object-cover rounded-2xl border border-black/[0.06] hover:opacity-90 transition-opacity cursor-pointer"
                            unoptimized
                          />
                        </a>
                      ) : (
                        <div className="w-full h-32 rounded-2xl bg-[#f8f8f8] border border-dashed border-black/10 flex items-center justify-center text-xs text-muted-foreground">
                          No image uploaded
                        </div>
                      )}
                    </div>

                    {/* Selfie / Face Verification */}
                    <div className="space-y-2">
                      <p className="text-xs font-semibold flex items-center gap-1.5 text-muted-foreground">
                        <Camera className="h-3.5 w-3.5" /> Selfie Verification
                      </p>
                      {viewRegTarget.selfieImage ? (
                        <a
                          href={viewRegTarget.selfieImage}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Image
                            src={viewRegTarget.selfieImage}
                            alt="Selfie"
                            width={280}
                            height={280}
                            className="w-full aspect-square object-cover rounded-2xl border border-black/[0.06] hover:opacity-90 transition-opacity cursor-pointer"
                            unoptimized
                          />
                        </a>
                      ) : (
                        <div className="w-full h-32 rounded-2xl bg-[#f8f8f8] border border-dashed border-black/10 flex items-center justify-center text-xs text-muted-foreground">
                          No selfie uploaded
                        </div>
                      )}
                    </div>

                    {/* Store Logo */}
                    {viewRegTarget.logoUrl && (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold flex items-center gap-1.5 text-muted-foreground">
                          <Store className="h-3.5 w-3.5" /> Store Logo
                        </p>
                        <Image
                          src={viewRegTarget.logoUrl}
                          alt="Store Logo"
                          width={280}
                          height={280}
                          className="w-full aspect-square object-cover rounded-2xl border border-black/[0.06]"
                          unoptimized
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Verification Status */}
                <div className="p-4 rounded-2xl border border-black/[0.06] flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Verification Status
                    </p>
                    <p className="text-sm font-bold mt-0.5">
                      {viewRegTarget.verified ? (
                        <span className="text-blue-600">
                          Verified{" "}
                          {viewRegTarget.verified_at &&
                            `on ${new Date(viewRegTarget.verified_at).toLocaleDateString()}`}
                        </span>
                      ) : (
                        <span className="text-orange-600">
                          Not yet verified
                        </span>
                      )}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setViewRegTarget(null);
                      setVerifyTarget({
                        id: viewRegTarget.id,
                        name: viewRegTarget.name || "this store",
                        currentStatus: viewRegTarget.verified,
                      });
                    }}
                    className={cn(
                      "px-5 py-2.5 rounded-full text-xs font-bold transition-all",
                      viewRegTarget.verified
                        ? "bg-orange-50 text-orange-600 hover:bg-orange-100"
                        : "bg-blue-600 text-white hover:bg-blue-700",
                    )}
                  >
                    {viewRegTarget.verified
                      ? "Revoke Verification"
                      : "Verify Seller"}
                  </button>
                </div>

                {/* Registration date */}
                {viewRegTarget.createdAt && (
                  <p className="text-xs text-muted-foreground text-center">
                    Registered on{" "}
                    {new Date(viewRegTarget.createdAt).toLocaleDateString(
                      "en-PH",
                      { year: "numeric", month: "long", day: "numeric" },
                    )}
                  </p>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Verification Confirmation Dialog */}
        <AlertDialog
          open={!!verifyTarget}
          onOpenChange={() => setVerifyTarget(null)}
        >
          <AlertDialogContent className="rounded-3xl">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <Shield
                  className={cn(
                    "h-5 w-5",
                    verifyTarget?.currentStatus
                      ? "text-orange-600"
                      : "text-blue-600",
                  )}
                />
                {verifyTarget?.currentStatus
                  ? "Revoke Verification"
                  : "Verify Seller"}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {verifyTarget?.currentStatus ? (
                  <>
                    Revoke verification for{" "}
                    <strong>{verifyTarget?.name}</strong>? Their products will
                    no longer be visible to customers. Existing customers will
                    still see their products in order history.
                  </>
                ) : (
                  <>
                    Verify <strong>{verifyTarget?.name}</strong>? Their products
                    will now be visible to all customers. Make sure you've
                    reviewed their business information first.
                  </>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-full">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                className={cn(
                  "rounded-full",
                  verifyTarget?.currentStatus
                    ? "bg-orange-600 hover:bg-orange-700"
                    : "bg-blue-600 hover:bg-blue-700",
                )}
                onClick={() =>
                  verifyTarget &&
                  handleVerifyStore(verifyTarget.id, verifyTarget.currentStatus)
                }
              >
                {verifyTarget?.currentStatus
                  ? "Revoke Verification"
                  : "Verify Seller"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  );
}
