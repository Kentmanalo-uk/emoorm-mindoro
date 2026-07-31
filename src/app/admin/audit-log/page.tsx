"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminLayout } from "@/components/layout/admin-layout";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ShieldCheck,
  Search,
  Download,
  User as UserIcon,
  Store,
  Package,
  Star,
  FileText,
  Tag,
  Image as ImageIcon,
  Settings as SettingsIcon,
  Megaphone,
  Bot,
} from "lucide-react";
import { useUser, useStableMemo, useCollection } from "@/supabase";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const TARGET_ICONS: Record<string, React.ElementType> = {
  user: UserIcon,
  seller: Store,
  product: Package,
  review: Star,
  report: FileText,
  voucher: Tag,
  banner: ImageIcon,
  modflag: Bot,
  settings: SettingsIcon,
  broadcast: Megaphone,
};

const ACTION_LABELS: Record<string, string> = {
  "user.delete": "Deleted user",
  "user.role_change": "Changed user role",
  "seller.verify": "Verified seller",
  "seller.unverify": "Revoked verification",
  "seller.suspend": "Suspended seller",
  "seller.delete": "Deleted seller",
  "product.takedown": "Took down product",
  "product.deactivate": "Deactivated product",
  "product.reactivate": "Reactivated product",
  "review.remove": "Removed review",
  "report.resolve": "Resolved report",
  "report.reject": "Rejected report",
  "voucher.create": "Created voucher",
  "voucher.update": "Updated voucher",
  "voucher.delete": "Deleted voucher",
  "banner.create": "Created banner",
  "banner.update": "Updated banner",
  "banner.delete": "Deleted banner",
  "broadcast.send": "Sent broadcast",
  "modflag.approve": "Approved AI flag",
  "modflag.reject": "Rejected AI flag",
  "settings.update": "Updated settings",
};

function actionTone(action: string): string {
  if (
    action.includes("delete") ||
    action.includes("takedown") ||
    action.includes("remove") ||
    action.includes("suspend")
  ) {
    return "text-red-600 bg-red-50";
  }
  if (
    action.includes("verify") ||
    action.includes("create") ||
    action.includes("approve") ||
    action.includes("resolve")
  ) {
    return "text-green-600 bg-green-50";
  }
  if (
    action.includes("reject") ||
    action.includes("unverify") ||
    action.includes("deactivate")
  ) {
    return "text-orange-600 bg-orange-50";
  }
  return "text-blue-600 bg-blue-50";
}

export default function AdminAuditLogPage() {
  const { user } = useUser();
  const router = useRouter();
  const { isAdmin, isAdminLoading } = useIsAdmin();
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");

  useEffect(() => {
    if (!isAdminLoading && !isAdmin) {
      router.push("/admin");
    }
  }, [isAdmin, isAdminLoading, router]);

  const auditConfig = useStableMemo(() => {
    if (!user || !isAdmin) return null;
    return {
      table: "admin_audit_log",
      order: { column: "createdAt", ascending: false },
    };
  }, [user, isAdmin]);
  const { data: entries, isLoading } = useCollection(auditConfig);

  if (isAdminLoading || !isAdmin) return null;

  const filtered = (entries ?? []).filter((e: any) => {
    const matchesSearch =
      !searchQuery ||
      (e.adminEmail || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.targetLabel || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.reason || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.action || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesAction =
      actionFilter === "all" || (e.action || "").startsWith(actionFilter);
    return matchesSearch && matchesAction;
  });

  const total = entries?.length ?? 0;
  const today = (entries ?? []).filter(
    (e: any) =>
      new Date(e.createdAt).toDateString() === new Date().toDateString(),
  ).length;

  const handleExport = () => {
    if (!entries || entries.length === 0) return;
    const headers = [
      "createdAt",
      "adminEmail",
      "action",
      "targetType",
      "targetId",
      "targetLabel",
      "reason",
    ];
    const rows = entries.map((e: any) =>
      headers
        .map((h) => `"${String(e[h] ?? "").replace(/"/g, '""')}"`)
        .join(","),
    );
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto p-6 md:p-8 w-full pt-6 md:pt-32 pb-24 space-y-8 md:space-y-10">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl md:text-3xl font-normal font-headline tracking-[-0.05em] text-black dark:text-white">
              Audit Log
            </h1>
            <p className="text-sm text-muted-foreground font-normal">
              {total} actions recorded · {today} today · Every admin action is
              permanent and traceable
            </p>
          </div>
          <Button
            variant="outline"
            className="rounded-full h-11 gap-2 border-black/[0.06]"
            onClick={handleExport}
            disabled={!entries || entries.length === 0}
          >
            <Download className="h-4 w-4" /> Export CSV
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
          <div className="flex-1 relative min-w-[200px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by admin, target, or reason..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.06] rounded-full pl-11 pr-5 py-3.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {[
              { key: "all", label: "All" },
              { key: "user", label: "Users" },
              { key: "seller", label: "Sellers" },
              { key: "product", label: "Products" },
              { key: "review", label: "Reviews" },
              { key: "report", label: "Reports" },
            ].map((f) => (
              <Button
                key={f.key}
                variant={actionFilter === f.key ? "default" : "outline"}
                size="sm"
                className={cn(
                  "rounded-full px-5 h-11 text-xs font-bold shrink-0",
                  actionFilter === f.key
                    ? "bg-black text-white hover:bg-primary"
                    : "border-black/[0.06]",
                )}
                onClick={() => setActionFilter(f.key)}
              >
                {f.label}
              </Button>
            ))}
          </div>
        </div>

        {/* List */}
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-2xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card className="shadow-[0_20px_50px_rgba(0,0,0,0.04)] border border-black/[0.02] rounded-[32px] bg-white dark:bg-white/[0.03]">
            <CardContent className="py-20 text-center">
              <ShieldCheck className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                No audit entries yet
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="shadow-[0_20px_50px_rgba(0,0,0,0.04)] border border-black/[0.02] rounded-[32px] bg-white dark:bg-white/[0.03] overflow-hidden">
            <CardContent className="p-0">
              <div className="divide-y divide-black/[0.04] dark:divide-white/[0.04]">
                {filtered.map((e: any) => {
                  const Icon = TARGET_ICONS[e.targetType] || ShieldCheck;
                  const tone = actionTone(e.action || "");
                  const label = ACTION_LABELS[e.action] || e.action;
                  return (
                    <div
                      key={e.id}
                      className="flex items-start gap-4 p-5 md:px-8 hover:bg-black/[0.01] dark:hover:bg-white/[0.01] transition-colors"
                    >
                      <div className={`p-2.5 rounded-2xl ${tone} shrink-0`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-bold">{label}</p>
                          {e.targetLabel && (
                            <span className="text-sm text-muted-foreground">
                              · {e.targetLabel}
                            </span>
                          )}
                          <Badge
                            variant="outline"
                            className="rounded-full text-[10px] px-2 py-0 ml-auto"
                          >
                            {e.targetType || "system"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground flex-wrap">
                          <span>
                            by{" "}
                            {e.adminEmail ||
                              e.adminId?.slice(0, 8) ||
                              "unknown"}
                          </span>
                          <span>·</span>
                          <span>
                            {e.createdAt
                              ? new Date(e.createdAt).toLocaleString()
                              : "—"}
                          </span>
                          {e.targetId && (
                            <>
                              <span>·</span>
                              <span className="font-mono">
                                {e.targetId.slice(0, 12)}
                              </span>
                            </>
                          )}
                        </div>
                        {e.reason && (
                          <p className="text-xs text-muted-foreground mt-2 italic">
                            &quot;{e.reason}&quot;
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
