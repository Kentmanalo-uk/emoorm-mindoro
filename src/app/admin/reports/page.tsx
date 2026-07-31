"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminLayout } from "@/components/layout/admin-layout";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Search,
  Eye,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  ShieldAlert,
  Package,
  Store,
  User as UserIcon,
  Star,
  MessageCircle,
} from "lucide-react";
import {
  useUser,
  useSupabase,
  useStableMemo,
  useCollection,
  updateDocumentNonBlocking,
} from "@/supabase";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { logAdminAction } from "@/lib/admin-audit";

const TARGET_ICONS: Record<string, React.ElementType> = {
  product: Package,
  seller: Store,
  user: UserIcon,
  review: Star,
  order: ShieldAlert,
  message: MessageCircle,
};

const PRIORITY_TONE: Record<string, string> = {
  high: "bg-red-50 text-red-600 border-red-200",
  medium: "bg-orange-50 text-orange-600 border-orange-200",
  low: "bg-blue-50 text-blue-600 border-blue-200",
};

const STATUS_TONE: Record<string, string> = {
  open: "bg-orange-50 text-orange-600 border-orange-200",
  investigating: "bg-blue-50 text-blue-600 border-blue-200",
  resolved: "bg-green-50 text-green-600 border-green-200",
  rejected: "bg-muted text-muted-foreground border-transparent",
};

export default function AdminReportsPage() {
  const { user } = useUser();
  const supabase = useSupabase();
  const router = useRouter();
  const { toast } = useToast();
  const { isAdmin, isAdminLoading } = useIsAdmin();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("open");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [selected, setSelected] = useState<any>(null);
  const [resolution, setResolution] = useState("");

  useEffect(() => {
    if (!isAdminLoading && !isAdmin) {
      router.push("/admin");
    }
  }, [isAdmin, isAdminLoading, router]);

  const reportsConfig = useStableMemo(() => {
    if (!user || !isAdmin) return null;
    return {
      table: "reports",
      order: { column: "createdAt", ascending: false },
    };
  }, [user, isAdmin]);
  const { data: reports, isLoading } = useCollection(reportsConfig);

  if (isAdminLoading || !isAdmin) return null;

  const filtered = (reports ?? []).filter((r: any) => {
    const matchesSearch =
      !searchQuery ||
      (r.targetLabel || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.category || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.description || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.targetId || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || r.status === statusFilter;
    const matchesPriority =
      priorityFilter === "all" || r.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const total = reports?.length ?? 0;
  const open = reports?.filter((r: any) => r.status === "open").length ?? 0;
  const investigating =
    reports?.filter((r: any) => r.status === "investigating").length ?? 0;
  const highPriority =
    reports?.filter((r: any) => r.priority === "high" && r.status === "open")
      .length ?? 0;

  const handleStatusChange = async (
    report: any,
    newStatus: "investigating" | "resolved" | "rejected",
    note?: string,
  ) => {
    const updates: any = {
      status: newStatus,
      updatedAt: new Date().toISOString(),
    };
    if (newStatus === "investigating") {
      updates.assignedAdminId = user?.uid;
    }
    if (newStatus === "resolved" || newStatus === "rejected") {
      updates.resolution = note ?? "";
      updates.resolvedAt = new Date().toISOString();
      updates.resolvedByAdminId = user?.uid;
    }
    updateDocumentNonBlocking(supabase, "reports", report.id, updates);
    if (user) {
      await logAdminAction(supabase, {
        adminId: user.uid,
        adminEmail: user.email ?? undefined,
        action: newStatus === "rejected" ? "report.reject" : "report.resolve",
        targetType: "report",
        targetId: report.id,
        targetLabel:
          report.targetLabel ||
          `${report.targetType}:${report.targetId?.slice(0, 8)}`,
        reason: note,
        metadata: { newStatus, originalCategory: report.category },
      });
    }
    toast({
      title: `Report ${newStatus}`,
      description: "The report has been updated.",
    });
    setSelected(null);
    setResolution("");
  };

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto p-6 md:p-8 w-full pt-6 md:pt-32 pb-24 space-y-8 md:space-y-10">
        <div>
          <h1 className="text-2xl md:text-3xl font-normal font-headline tracking-[-0.05em] text-black dark:text-white">
            Reports & Disputes
          </h1>
          <p className="text-sm text-muted-foreground font-normal">
            {total} total · {open} open · {investigating} investigating ·{" "}
            {highPriority} high-priority
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {
              label: "Open",
              value: open,
              icon: Clock,
              color: "text-orange-600 bg-orange-50",
            },
            {
              label: "Investigating",
              value: investigating,
              icon: ShieldAlert,
              color: "text-blue-600 bg-blue-50",
            },
            {
              label: "High Priority",
              value: highPriority,
              icon: AlertTriangle,
              color: "text-red-600 bg-red-50",
            },
            {
              label: "All-Time",
              value: total,
              icon: FileText,
              color: "text-purple-600 bg-purple-50",
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
        <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
          <div className="flex-1 relative min-w-[200px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search reports..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.06] rounded-full pl-11 pr-5 py-3.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {[
              { key: "open", label: "Open" },
              { key: "investigating", label: "Investigating" },
              { key: "resolved", label: "Resolved" },
              { key: "rejected", label: "Rejected" },
              { key: "all", label: "All" },
            ].map((f) => (
              <Button
                key={f.key}
                variant={statusFilter === f.key ? "default" : "outline"}
                size="sm"
                className={cn(
                  "rounded-full px-4 h-11 text-xs font-bold shrink-0",
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
          <div className="flex gap-2">
            {["all", "high", "medium", "low"].map((p) => (
              <Button
                key={p}
                variant={priorityFilter === p ? "default" : "outline"}
                size="sm"
                className={cn(
                  "rounded-full px-4 h-11 text-xs font-bold shrink-0 capitalize",
                  priorityFilter === p
                    ? "bg-black text-white hover:bg-primary"
                    : "border-black/[0.06]",
                )}
                onClick={() => setPriorityFilter(p)}
              >
                {p}
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
              <FileText className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No reports found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((report: any) => {
              const Icon = TARGET_ICONS[report.targetType] || FileText;
              return (
                <Card
                  key={report.id}
                  className="shadow-[0_20px_50px_rgba(0,0,0,0.04)] border border-black/[0.02] rounded-[32px] bg-white dark:bg-white/[0.03] overflow-hidden cursor-pointer hover:border-primary/20 transition-colors"
                  onClick={() => setSelected(report)}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-2xl bg-muted shrink-0">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <p className="text-sm font-bold truncate">
                            {report.category || "Untitled report"}
                          </p>
                          <Badge
                            variant="outline"
                            className={cn(
                              "rounded-full text-[10px] px-2 py-0",
                              PRIORITY_TONE[report.priority] ||
                                PRIORITY_TONE.medium,
                            )}
                          >
                            {report.priority || "medium"}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={cn(
                              "rounded-full text-[10px] px-2 py-0 capitalize",
                              STATUS_TONE[report.status] || STATUS_TONE.open,
                            )}
                          >
                            {report.status || "open"}
                          </Badge>
                        </div>
                        {report.targetLabel && (
                          <p className="text-xs text-muted-foreground truncate">
                            against {report.targetType}:{" "}
                            <span className="font-medium">
                              {report.targetLabel}
                            </span>
                          </p>
                        )}
                        {report.description && (
                          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                            {report.description}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                          Reported{" "}
                          {report.createdAt
                            ? new Date(report.createdAt).toLocaleString()
                            : "—"}{" "}
                          by {report.reporterRole || "user"}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Detail Dialog */}
        <Dialog
          open={!!selected}
          onOpenChange={() => {
            setSelected(null);
            setResolution("");
          }}
        >
          <DialogContent className="sm:max-w-[600px] rounded-3xl max-h-[90vh] overflow-y-auto">
            {selected && (
              <>
                <DialogHeader>
                  <DialogTitle className="font-headline tracking-[-0.03em] flex items-center gap-2">
                    {selected.category}
                    <Badge
                      variant="outline"
                      className={cn(
                        "rounded-full text-[10px] ml-2",
                        PRIORITY_TONE[selected.priority] ||
                          PRIORITY_TONE.medium,
                      )}
                    >
                      {selected.priority || "medium"}
                    </Badge>
                  </DialogTitle>
                  <DialogDescription>
                    Report against {selected.targetType}:{" "}
                    <strong>{selected.targetLabel || selected.targetId}</strong>
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  <div>
                    <p className="text-[10px] font-bold tracking-tight text-muted-foreground mb-1">
                      Reporter
                    </p>
                    <p className="text-sm">
                      {selected.reporterRole} ·{" "}
                      <span className="font-mono text-xs">
                        {selected.reporterId?.slice(0, 12)}
                      </span>
                    </p>
                  </div>

                  {selected.description && (
                    <div>
                      <p className="text-[10px] font-bold tracking-tight text-muted-foreground mb-1">
                        Description
                      </p>
                      <p className="text-sm whitespace-pre-wrap bg-muted/50 rounded-2xl p-4">
                        {selected.description}
                      </p>
                    </div>
                  )}

                  {Array.isArray(selected.evidence) &&
                    selected.evidence.length > 0 && (
                      <div>
                        <p className="text-[10px] font-bold tracking-tight text-muted-foreground mb-1">
                          Evidence
                        </p>
                        <ul className="text-xs space-y-1">
                          {selected.evidence.map((e: any, i: number) => (
                            <li
                              key={i}
                              className="font-mono text-muted-foreground"
                            >
                              {typeof e === "string" ? e : JSON.stringify(e)}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                  {selected.resolution && (
                    <div>
                      <p className="text-[10px] font-bold tracking-tight text-muted-foreground mb-1">
                        Previous Resolution
                      </p>
                      <p className="text-sm bg-green-50 text-green-800 rounded-2xl p-4">
                        {selected.resolution}
                      </p>
                    </div>
                  )}

                  {selected.targetType !== "order" && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-full gap-2"
                      onClick={() => {
                        const route =
                          selected.targetType === "product"
                            ? `/book/${selected.targetId}`
                            : selected.targetType === "seller"
                              ? `/stores/${selected.targetId}`
                              : null;
                        if (route) window.open(route, "_blank");
                      }}
                    >
                      <Eye className="h-4 w-4" /> View target
                    </Button>
                  )}

                  {(selected.status === "open" ||
                    selected.status === "investigating") && (
                    <div className="space-y-2 pt-2 border-t">
                      <label className="text-xs font-bold tracking-tight text-muted-foreground">
                        Resolution / Notes
                      </label>
                      <textarea
                        value={resolution}
                        onChange={(e) => setResolution(e.target.value)}
                        rows={3}
                        placeholder="Action taken, contacted user, etc..."
                        className="w-full bg-[#f8f8f8] dark:bg-white/[0.05] border-none rounded-2xl px-5 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none"
                      />
                    </div>
                  )}
                </div>

                <div className="flex gap-2 flex-wrap">
                  {selected.status === "open" && (
                    <Button
                      variant="outline"
                      className="rounded-full gap-2"
                      onClick={() =>
                        handleStatusChange(selected, "investigating")
                      }
                    >
                      <ShieldAlert className="h-4 w-4" /> Take Up
                    </Button>
                  )}
                  {(selected.status === "open" ||
                    selected.status === "investigating") && (
                    <>
                      <Button
                        variant="outline"
                        className="rounded-full gap-2 text-muted-foreground"
                        onClick={() =>
                          handleStatusChange(selected, "rejected", resolution)
                        }
                      >
                        <XCircle className="h-4 w-4" /> Reject
                      </Button>
                      <Button
                        className="rounded-full gap-2 ml-auto bg-green-600 hover:bg-green-700"
                        onClick={() =>
                          handleStatusChange(selected, "resolved", resolution)
                        }
                      >
                        <CheckCircle2 className="h-4 w-4" /> Resolve
                      </Button>
                    </>
                  )}
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
