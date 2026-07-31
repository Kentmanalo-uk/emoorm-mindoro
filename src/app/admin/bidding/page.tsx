"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminLayout } from "@/components/layout/admin-layout";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Gavel,
  Search,
  Eye,
  Trash2,
  Clock,
  CheckCircle2,
  TrendingUp,
  AlertTriangle,
  MoreVertical,
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
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";
import { logAdminAction } from "@/lib/admin-audit";

export default function AdminBiddingPage() {
  const { user } = useUser();
  const supabase = useSupabase();
  const router = useRouter();
  const { toast } = useToast();
  const { isAdmin, isAdminLoading } = useIsAdmin();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("active");
  const [endTarget, setEndTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);

  useEffect(() => {
    if (!isAdminLoading && !isAdmin) {
      router.push("/admin");
    }
  }, [isAdmin, isAdminLoading, router]);

  const auctionsConfig = useStableMemo(() => {
    if (!user || !isAdmin) return null;
    return {
      table: "facilities",
      filters: [{ column: "isAuction", op: "eq" as const, value: true }],
      order: { column: "auctionEndDate", ascending: false },
    };
  }, [user, isAdmin]);
  const { data: auctions, isLoading } = useCollection(auctionsConfig);

  const bidsConfig = useStableMemo(() => {
    if (!user || !isAdmin) return null;
    return {
      table: "bids",
      order: { column: "createdAt", ascending: false },
    };
  }, [user, isAdmin]);
  const { data: bids } = useCollection(bidsConfig);

  if (isAdminLoading || !isAdmin) return null;

  const now = new Date();

  const isLive = (a: any) => {
    if (!a.auctionEndDate) return true;
    return new Date(a.auctionEndDate) > now;
  };

  const filtered = (auctions ?? []).filter((a: any) => {
    const matchesSearch =
      !searchQuery ||
      (a.name || "").toLowerCase().includes(searchQuery.toLowerCase());
    const live = isLive(a);
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && live) ||
      (statusFilter === "ended" && !live);
    return matchesSearch && matchesStatus;
  });

  const totalAuctions = auctions?.length ?? 0;
  const liveAuctions = auctions?.filter(isLive).length ?? 0;
  const endedAuctions = totalAuctions - liveAuctions;
  const totalBids = bids?.length ?? 0;

  const handleEnd = async (id: string, name: string) => {
    updateDocumentNonBlocking(supabase, "facilities", id, {
      auctionEndDate: new Date().toISOString(),
    });
    if (user) {
      await logAdminAction(supabase, {
        adminId: user.uid,
        adminEmail: user.email ?? undefined,
        action: "product.deactivate",
        targetType: "product",
        targetId: id,
        targetLabel: name,
        reason: "Auction force-ended by admin",
      });
    }
    toast({
      title: "Auction ended",
      description: `${name} has been closed early.`,
    });
    setEndTarget(null);
  };

  const handleDelete = async (id: string, name: string) => {
    deleteDocumentNonBlocking(supabase, "facilities", id);
    if (user) {
      await logAdminAction(supabase, {
        adminId: user.uid,
        adminEmail: user.email ?? undefined,
        action: "product.takedown",
        targetType: "product",
        targetId: id,
        targetLabel: name,
        reason: "Auction listing removed",
      });
    }
    toast({
      title: "Auction removed",
      description: `${name} has been taken down.`,
    });
  };

  const bidCountFor = (productId: string) =>
    (bids ?? []).filter((b: any) => b.productId === productId).length;

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto p-6 md:p-8 w-full pt-6 md:pt-32 pb-24 space-y-8 md:space-y-10">
        <div>
          <h1 className="text-2xl md:text-3xl font-normal font-headline tracking-[-0.05em] text-black dark:text-white">
            Auction Oversight
          </h1>
          <p className="text-sm text-muted-foreground font-normal">
            {totalAuctions} auctions · {liveAuctions} live · {endedAuctions}{" "}
            ended · {totalBids} total bids
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {
              label: "Live Auctions",
              value: liveAuctions,
              icon: TrendingUp,
              color: "text-green-600 bg-green-50",
            },
            {
              label: "Ended",
              value: endedAuctions,
              icon: CheckCircle2,
              color: "text-muted-foreground bg-muted",
            },
            {
              label: "Total Bids",
              value: totalBids,
              icon: Gavel,
              color: "text-blue-600 bg-blue-50",
            },
            {
              label: "All-Time",
              value: totalAuctions,
              icon: Clock,
              color: "text-orange-600 bg-orange-50",
            },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <Card
                key={s.label}
                className="shadow-[0_20px_50px_rgba(0,0,0,0.04)] border border-black/[0.02] rounded-[32px] bg-white dark:bg-white/[0.03]"
              >
                <CardContent className="p-5">
                  <div className={`p-2.5 rounded-2xl ${s.color} w-fit mb-3`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <p className="text-xs text-muted-foreground font-medium">
                    {s.label}
                  </p>
                  <p className="text-2xl font-normal font-headline tracking-[-0.05em]">
                    {s.value}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search auctions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.06] rounded-full pl-11 pr-5 py-3.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>
          <div className="flex gap-2">
            {[
              { key: "active", label: "Live" },
              { key: "ended", label: "Ended" },
              { key: "all", label: "All" },
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

        {/* List */}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-3xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card className="shadow-[0_20px_50px_rgba(0,0,0,0.04)] border border-black/[0.02] rounded-[32px] bg-white dark:bg-white/[0.03]">
            <CardContent className="py-20 text-center">
              <Gavel className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No auctions found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((auction: any) => {
              const live = isLive(auction);
              const bidCount = auction.bidCount ?? bidCountFor(auction.id);
              const imageUrl =
                auction.imageUrl ||
                auction.images?.[0] ||
                "https://placehold.co/100x100/f8f8f8/ccc?text=No+Image";
              return (
                <Card
                  key={auction.id}
                  className="shadow-[0_20px_50px_rgba(0,0,0,0.04)] border border-black/[0.02] rounded-[32px] bg-white dark:bg-white/[0.03] overflow-hidden"
                >
                  <CardContent className="p-5">
                    <div className="flex items-center gap-4">
                      <div className="h-16 w-16 rounded-2xl overflow-hidden shrink-0 bg-muted">
                        <Image
                          src={imageUrl}
                          alt={auction.name || "Auction"}
                          width={64}
                          height={64}
                          className="object-cover h-full w-full"
                          unoptimized
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-bold truncate">
                            {auction.name || "Unnamed"}
                          </p>
                          <Badge
                            className={cn(
                              "rounded-full px-2 py-0.5 text-[10px] font-bold border-0 shrink-0",
                              live
                                ? "bg-green-50 text-green-600"
                                : "bg-muted text-muted-foreground",
                            )}
                          >
                            {live ? "LIVE" : "ENDED"}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          <span>
                            Current bid:{" "}
                            <span className="font-bold text-foreground">
                              ₱
                              {Number(auction.currentBid || 0).toLocaleString()}
                            </span>
                          </span>
                          <span>
                            Starting: ₱
                            {Number(auction.startingBid || 0).toLocaleString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <Gavel className="h-3 w-3" /> {bidCount} bids
                          </span>
                          {auction.auctionEndDate && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {live ? "ends" : "ended"}{" "}
                              {new Date(
                                auction.auctionEndDate,
                              ).toLocaleDateString()}
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
                          <DropdownMenuItem
                            className="rounded-xl gap-3 px-3 py-2.5 cursor-pointer"
                            onClick={() => router.push(`/book/${auction.id}`)}
                          >
                            <Eye className="h-4 w-4" /> View Listing
                          </DropdownMenuItem>
                          {live && (
                            <DropdownMenuItem
                              className="rounded-xl gap-3 px-3 py-2.5 cursor-pointer"
                              onClick={() =>
                                setEndTarget({
                                  id: auction.id,
                                  name: auction.name || "this auction",
                                })
                              }
                            >
                              <Clock className="h-4 w-4" /> Force End
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="rounded-xl gap-3 px-3 py-2.5 cursor-pointer text-red-600"
                            onClick={() =>
                              handleDelete(
                                auction.id,
                                auction.name || "this auction",
                              )
                            }
                          >
                            <Trash2 className="h-4 w-4" /> Take Down
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

        {/* Force End Confirmation */}
        <AlertDialog open={!!endTarget} onOpenChange={() => setEndTarget(null)}>
          <AlertDialogContent className="rounded-3xl">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                Force End Auction
              </AlertDialogTitle>
              <AlertDialogDescription>
                End <strong>{endTarget?.name}</strong> immediately. The current
                highest bidder wins. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-full">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                className="rounded-full bg-orange-600 hover:bg-orange-700"
                onClick={() =>
                  endTarget && handleEnd(endTarget.id, endTarget.name)
                }
              >
                End Auction
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  );
}
