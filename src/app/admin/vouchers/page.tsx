"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminLayout } from "@/components/layout/admin-layout";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tag,
  Plus,
  Search,
  MoreVertical,
  Edit,
  Trash2,
  Save,
  AlertTriangle,
  Calendar,
  Percent,
  DollarSign,
  Truck,
  Power,
  PowerOff,
} from "lucide-react";
import {
  useUser,
  useSupabase,
  useStableMemo,
  useCollection,
  setDocumentNonBlocking,
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

const EMPTY_FORM = {
  code: "",
  description: "",
  discountType: "percentage" as "percentage" | "fixed" | "free_shipping",
  discountValue: 10,
  minOrderAmount: 0,
  maxRedemptions: 100,
  perUserLimit: 1,
  validUntil: "",
  active: true,
};

const TYPE_ICON: Record<string, React.ElementType> = {
  percentage: Percent,
  fixed: DollarSign,
  free_shipping: Truck,
};

export default function AdminVouchersPage() {
  const { user } = useUser();
  const supabase = useSupabase();
  const router = useRouter();
  const { toast } = useToast();
  const { isAdmin, isAdminLoading } = useIsAdmin();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    code: string;
  } | null>(null);

  useEffect(() => {
    if (!isAdminLoading && !isAdmin) {
      router.push("/admin");
    }
  }, [isAdmin, isAdminLoading, router]);

  const vouchersConfig = useStableMemo(() => {
    if (!user || !isAdmin) return null;
    return {
      table: "vouchers",
      order: { column: "createdAt", ascending: false },
    };
  }, [user, isAdmin]);
  const { data: vouchers, isLoading } = useCollection(vouchersConfig);

  if (isAdminLoading || !isAdmin) return null;

  const filtered = (vouchers ?? []).filter((v: any) => {
    const matchesSearch =
      !searchQuery ||
      (v.code || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (v.description || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && v.active) ||
      (statusFilter === "inactive" && !v.active);
    return matchesSearch && matchesStatus;
  });

  const total = vouchers?.length ?? 0;
  const active = vouchers?.filter((v: any) => v.active).length ?? 0;
  const totalRedemptions =
    vouchers?.reduce((s: number, v: any) => s + (v.redemptionCount || 0), 0) ??
    0;

  const openCreateDialog = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setEditDialogOpen(true);
  };

  const openEditDialog = (v: any) => {
    setEditing(v);
    setForm({
      code: v.code || "",
      description: v.description || "",
      discountType: v.discountType || "percentage",
      discountValue: Number(v.discountValue || 0),
      minOrderAmount: Number(v.minOrderAmount || 0),
      maxRedemptions: Number(v.maxRedemptions || 0),
      perUserLimit: Number(v.perUserLimit || 1),
      validUntil: v.validUntil
        ? new Date(v.validUntil).toISOString().slice(0, 10)
        : "",
      active: v.active ?? true,
    });
    setEditDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.code.trim()) {
      toast({
        variant: "destructive",
        title: "Missing code",
        description: "Voucher code is required.",
      });
      return;
    }
    const id = editing?.id || crypto.randomUUID();
    const data: any = {
      id,
      code: form.code.trim().toUpperCase(),
      description: form.description,
      discountType: form.discountType,
      discountValue: form.discountValue,
      minOrderAmount: form.minOrderAmount,
      maxRedemptions: form.maxRedemptions || null,
      perUserLimit: form.perUserLimit,
      validUntil: form.validUntil
        ? new Date(form.validUntil).toISOString()
        : null,
      active: form.active,
      createdByAdminId: user?.uid,
    };
    if (!editing) {
      data.createdAt = new Date().toISOString();
      data.redemptionCount = 0;
      data.validFrom = new Date().toISOString();
    }
    setDocumentNonBlocking(supabase, "vouchers", data);
    if (user) {
      await logAdminAction(supabase, {
        adminId: user.uid,
        adminEmail: user.email ?? undefined,
        action: editing ? "voucher.update" : "voucher.create",
        targetType: "voucher",
        targetId: id,
        targetLabel: data.code,
      });
    }
    toast({
      title: editing ? "Voucher updated" : "Voucher created",
      description: `${data.code} ${editing ? "saved" : "is now live"}.`,
    });
    setEditDialogOpen(false);
  };

  const handleToggleActive = async (v: any) => {
    updateDocumentNonBlocking(supabase, "vouchers", v.id, {
      active: !v.active,
    });
    if (user) {
      await logAdminAction(supabase, {
        adminId: user.uid,
        adminEmail: user.email ?? undefined,
        action: "voucher.update",
        targetType: "voucher",
        targetId: v.id,
        targetLabel: v.code,
        metadata: { active: !v.active },
      });
    }
    toast({ title: v.active ? "Voucher disabled" : "Voucher enabled" });
  };

  const handleDelete = async (id: string, code: string) => {
    deleteDocumentNonBlocking(supabase, "vouchers", id);
    if (user) {
      await logAdminAction(supabase, {
        adminId: user.uid,
        adminEmail: user.email ?? undefined,
        action: "voucher.delete",
        targetType: "voucher",
        targetId: id,
        targetLabel: code,
      });
    }
    toast({ title: "Voucher deleted" });
    setDeleteTarget(null);
  };

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto p-6 md:p-8 w-full pt-6 md:pt-32 pb-24 space-y-8 md:space-y-10">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-normal font-headline tracking-[-0.05em] text-black dark:text-white">
              Vouchers & Promo Codes
            </h1>
            <p className="text-sm text-muted-foreground font-normal">
              {total} vouchers · {active} active · {totalRedemptions} total
              redemptions
            </p>
          </div>
          <Button
            className="bg-black hover:bg-primary transition-colors rounded-full px-6 h-12 shadow-sm gap-2"
            onClick={openCreateDialog}
          >
            <Plus className="h-4 w-4" /> New Voucher
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by code or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.06] rounded-full pl-11 pr-5 py-3.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>
          <div className="flex gap-2">
            {[
              { key: "all", label: "All" },
              { key: "active", label: "Active" },
              { key: "inactive", label: "Inactive" },
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

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-44 rounded-3xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card className="shadow-[0_20px_50px_rgba(0,0,0,0.04)] border border-black/[0.02] rounded-[32px] bg-white dark:bg-white/[0.03]">
            <CardContent className="py-20 text-center">
              <Tag className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground mb-4">
                No vouchers yet
              </p>
              <Button className="rounded-full" onClick={openCreateDialog}>
                <Plus className="h-4 w-4 mr-2" /> Create First Voucher
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((v: any) => {
              const Icon = TYPE_ICON[v.discountType] || Percent;
              const expired =
                v.validUntil && new Date(v.validUntil) < new Date();
              const exhausted =
                v.maxRedemptions && v.redemptionCount >= v.maxRedemptions;
              return (
                <Card
                  key={v.id}
                  className={cn(
                    "shadow-[0_20px_50px_rgba(0,0,0,0.04)] border rounded-[32px] bg-white dark:bg-white/[0.03] overflow-hidden",
                    !v.active && "opacity-60",
                  )}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <div className="p-3 rounded-2xl bg-primary/10 text-primary">
                        <Icon className="h-5 w-5" />
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="rounded-full h-8 w-8"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="w-48 rounded-2xl p-1 bg-white/80 backdrop-blur-xl border-none"
                        >
                          <DropdownMenuItem
                            className="rounded-xl gap-3 px-3 py-2.5 cursor-pointer"
                            onClick={() => openEditDialog(v)}
                          >
                            <Edit className="h-4 w-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="rounded-xl gap-3 px-3 py-2.5 cursor-pointer"
                            onClick={() => handleToggleActive(v)}
                          >
                            {v.active ? (
                              <>
                                <PowerOff className="h-4 w-4" /> Disable
                              </>
                            ) : (
                              <>
                                <Power className="h-4 w-4" /> Enable
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="rounded-xl gap-3 px-3 py-2.5 cursor-pointer text-red-600"
                            onClick={() =>
                              setDeleteTarget({ id: v.id, code: v.code })
                            }
                          >
                            <Trash2 className="h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <p className="font-mono font-black text-lg tracking-tight">
                      {v.code}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2 min-h-[32px]">
                      {v.description || "No description"}
                    </p>
                    <div className="flex items-center gap-2 mt-3 flex-wrap">
                      <Badge className="bg-primary/10 text-primary border-0 rounded-full text-[10px]">
                        {v.discountType === "percentage"
                          ? `${v.discountValue}% off`
                          : v.discountType === "fixed"
                            ? `₱${v.discountValue} off`
                            : "Free shipping"}
                      </Badge>
                      {v.minOrderAmount > 0 && (
                        <Badge
                          variant="outline"
                          className="rounded-full text-[10px]"
                        >
                          min ₱{v.minOrderAmount}
                        </Badge>
                      )}
                      {expired && (
                        <Badge className="bg-red-50 text-red-600 border-0 rounded-full text-[10px]">
                          Expired
                        </Badge>
                      )}
                      {exhausted && (
                        <Badge className="bg-orange-50 text-orange-600 border-0 rounded-full text-[10px]">
                          Exhausted
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t text-xs text-muted-foreground">
                      <span>
                        {v.redemptionCount || 0}
                        {v.maxRedemptions ? `/${v.maxRedemptions}` : ""}{" "}
                        redeemed
                      </span>
                      {v.validUntil && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />{" "}
                          {new Date(v.validUntil).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="sm:max-w-[500px] rounded-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-headline tracking-[-0.03em]">
                {editing ? "Edit Voucher" : "New Voucher"}
              </DialogTitle>
              <DialogDescription>
                {editing
                  ? "Update voucher details below."
                  : "Create a promo code buyers can apply at checkout."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-xs font-bold tracking-tight text-muted-foreground">
                  Code *
                </label>
                <input
                  type="text"
                  value={form.code}
                  onChange={(e) =>
                    setForm({ ...form, code: e.target.value.toUpperCase() })
                  }
                  placeholder="MOORM10"
                  className="w-full bg-[#f8f8f8] dark:bg-white/[0.05] border-none rounded-full px-6 py-3 text-sm font-mono font-bold outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold tracking-tight text-muted-foreground">
                  Description
                </label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  placeholder="Welcome 10% off for new buyers"
                  className="w-full bg-[#f8f8f8] dark:bg-white/[0.05] border-none rounded-full px-6 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-xs font-bold tracking-tight text-muted-foreground">
                    Type
                  </label>
                  <select
                    value={form.discountType}
                    onChange={(e) =>
                      setForm({ ...form, discountType: e.target.value as any })
                    }
                    className="w-full bg-[#f8f8f8] dark:bg-white/[0.05] border-none rounded-full px-5 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  >
                    <option value="percentage">Percentage %</option>
                    <option value="fixed">Fixed ₱</option>
                    <option value="free_shipping">Free shipping</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold tracking-tight text-muted-foreground">
                    Value
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={form.discountValue}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        discountValue: Number(e.target.value),
                      })
                    }
                    disabled={form.discountType === "free_shipping"}
                    className="w-full bg-[#f8f8f8] dark:bg-white/[0.05] border-none rounded-full px-5 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all disabled:opacity-50"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-xs font-bold tracking-tight text-muted-foreground">
                    Min order ₱
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={form.minOrderAmount}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        minOrderAmount: Number(e.target.value),
                      })
                    }
                    className="w-full bg-[#f8f8f8] dark:bg-white/[0.05] border-none rounded-full px-5 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold tracking-tight text-muted-foreground">
                    Max redemptions
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={form.maxRedemptions}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        maxRedemptions: Number(e.target.value),
                      })
                    }
                    className="w-full bg-[#f8f8f8] dark:bg-white/[0.05] border-none rounded-full px-5 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-xs font-bold tracking-tight text-muted-foreground">
                    Per-user limit
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={form.perUserLimit}
                    onChange={(e) =>
                      setForm({ ...form, perUserLimit: Number(e.target.value) })
                    }
                    className="w-full bg-[#f8f8f8] dark:bg-white/[0.05] border-none rounded-full px-5 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold tracking-tight text-muted-foreground">
                    Valid until
                  </label>
                  <input
                    type="date"
                    value={form.validUntil}
                    onChange={(e) =>
                      setForm({ ...form, validUntil: e.target.value })
                    }
                    className="w-full bg-[#f8f8f8] dark:bg-white/[0.05] border-none rounded-full px-5 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) =>
                    setForm({ ...form, active: e.target.checked })
                  }
                  className="h-4 w-4 rounded"
                />
                <span className="text-sm">Active immediately</span>
              </label>
              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  className="flex-1 rounded-full h-12"
                  onClick={() => setEditDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 rounded-full h-12 bg-black hover:bg-primary gap-2"
                  onClick={handleSave}
                >
                  <Save className="h-4 w-4" />
                  {editing ? "Update" : "Create"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog
          open={!!deleteTarget}
          onOpenChange={() => setDeleteTarget(null)}
        >
          <AlertDialogContent className="rounded-3xl">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" /> Delete
                Voucher
              </AlertDialogTitle>
              <AlertDialogDescription>
                Permanently delete <strong>{deleteTarget?.code}</strong>? This
                cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-full">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                className="rounded-full bg-red-600 hover:bg-red-700"
                onClick={() =>
                  deleteTarget &&
                  handleDelete(deleteTarget.id, deleteTarget.code)
                }
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  );
}
