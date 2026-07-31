"use client";

import React from "react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { ProfileSidebar } from "@/app/profile/page";
import {
  useUser,
  useSupabase,
  useCollection,
  useStableMemo,
  useSupabaseAuth,
} from "@/supabase";
import {
  Bell,
  Calendar,
  Info,
  Sparkles,
  CheckCheck,
  Gavel,
  PartyPopper,
  Package,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from "next/navigation";

interface Notification {
  id: string;
  title: string;
  content: string;
  type: "order" | "system" | "promo" | "bid" | "welcome";
  timestamp: string;
  isRead: boolean;
  userId: string;
}

const typeConfig: Record<
  string,
  { bg: string; color: string; Icon: React.ElementType }
> = {
  order: { bg: "#eff6ff", color: "#2563eb", Icon: Package },
  promo: { bg: "#f0fdf4", color: "#29a366", Icon: Sparkles },
  bid: { bg: "#fffbeb", color: "#d97706", Icon: Gavel },
  welcome: { bg: "#f0fdf4", color: "#29a366", Icon: PartyPopper },
  system: { bg: "#f5f5f5", color: "#666", Icon: Info },
};

export default function NotificationsPage() {
  const { user, isUserLoading } = useUser();
  const { auth } = useSupabaseAuth();
  const supabase = useSupabase();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await auth.signOut();
      router.push("/login");
    } catch {}
  };

  const notificationsQuery = useStableMemo(() => {
    if (!user) return null;
    return {
      table: "notifications",
      filters: [{ column: "userId", op: "eq" as const, value: user.uid }],
      order: { column: "timestamp", ascending: false },
    };
  }, [user]);

  const { data: notifications } =
    useCollection<Notification>(notificationsQuery);

  const unreadCount = notifications?.filter((n) => !n.isRead).length ?? 0;

  const handleMarkAllRead = async () => {
    if (!user || !notifications?.length) return;
    const unread = notifications.filter((n) => !n.isRead);
    for (const n of unread) {
      await supabase
        .from("notifications")
        .update({ isRead: true })
        .eq("id", n.id);
    }
  };

  const handleMarkRead = async (id: string) => {
    await supabase.from("notifications").update({ isRead: true }).eq("id", id);
  };

  if (isUserLoading)
    return (
      <div
        className="flex min-h-screen flex-col"
        style={{ backgroundColor: "#f2f2f0" }}
      >
        <Header />
        <main className="flex-grow pt-6">
          <div className="max-w-[1280px] mx-auto px-4 md:px-8 pb-24 flex gap-5 items-start">
            <div className="hidden md:flex flex-col w-[200px] shrink-0 gap-2.5">
              <Skeleton className="h-[280px] rounded-[5px]" />
              <Skeleton className="h-[110px] rounded-[5px]" />
            </div>
            <div className="flex-1 min-w-0 space-y-3">
              <Skeleton className="h-[72px] rounded-[5px]" />
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-[80px] rounded-[5px]" />
              ))}
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

          <div className="flex-1 min-w-0 space-y-3">
            {/* Page header */}
            <div className="bg-white rounded-[5px] border border-black/[0.06] px-6 py-5 flex items-center justify-between">
              <div>
                <h1 className="text-lg font-semibold text-[#111]">
                  Notifications
                </h1>
                <p className="text-sm text-[#888]">
                  {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
                </p>
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="flex items-center gap-1.5 text-sm font-semibold text-[#29a366] hover:underline"
                >
                  <CheckCheck className="h-4 w-4" />
                  Mark all read
                </button>
              )}
            </div>

            {/* Notification list */}
            {!notifications || notifications.length === 0 ? (
              <div className="bg-white rounded-[5px] border border-black/[0.06] py-20 flex flex-col items-center text-center gap-3">
                <Bell className="h-12 w-12 text-[#e0e0e0]" strokeWidth={1.5} />
                <p className="text-sm text-[#888]">No notifications yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {notifications.map((notif) => {
                  const cfg = typeConfig[notif.type] ?? typeConfig.system;
                  const Icon = cfg.Icon;
                  return (
                    <div
                      key={notif.id}
                      onClick={() => !notif.isRead && handleMarkRead(notif.id)}
                      className="bg-white rounded-[5px] border border-black/[0.06] p-4 flex gap-4 transition-colors"
                      style={{
                        cursor: notif.isRead ? "default" : "pointer",
                        borderLeft: notif.isRead
                          ? undefined
                          : "3px solid #29a366",
                      }}
                    >
                      <div
                        className="h-9 w-9 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                        style={{ background: cfg.bg }}
                      >
                        <Icon
                          className="h-4.5 w-4.5"
                          style={{ color: cfg.color }}
                          strokeWidth={1.8}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <p
                            className={`text-sm leading-snug ${notif.isRead ? "font-medium text-[#555]" : "font-semibold text-[#111]"}`}
                          >
                            {notif.title}
                          </p>
                          <span className="text-[10px] text-[#bbb] shrink-0 mt-0.5">
                            {notif.timestamp
                              ? new Date(notif.timestamp).toLocaleDateString(
                                  [],
                                  { month: "short", day: "numeric" },
                                )
                              : ""}
                          </span>
                        </div>
                        <p className="text-sm text-[#777] leading-relaxed">
                          {notif.content}
                        </p>
                      </div>
                      {!notif.isRead && (
                        <div className="h-2 w-2 rounded-full bg-[#29a366] shrink-0 mt-2" />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
