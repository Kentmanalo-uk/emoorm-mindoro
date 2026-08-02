"use client";

import React, { useState, useMemo, createContext, useContext } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Package,
  Store,
  BarChart3,
  Settings,
  Bell,
  MessageCircle,
  FileText,
  Shield,
  Star,
  Gavel,
  Tag,
  Activity,
  ShieldCheck,
  ChevronDown,
  ChevronRight,
  LogOut,
  Menu,
  X,
  MapPin,
} from "lucide-react";
import { useSupabaseAuth, useStableMemo, useDoc } from "@/supabase";
import Image from "next/image";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { AdminScopeGuard } from "@/components/admin-scope-guard";

type NavChild = {
  href: string;
  label: string;
  icon: React.ElementType;
  superOnly?: boolean;
};
type NavItem =
  | {
      label: string;
      icon: React.ElementType;
      href: string;
      children?: undefined;
      superOnly?: boolean;
    }
  | {
      label: string;
      icon: React.ElementType;
      href?: undefined;
      children: NavChild[];
      superOnly?: boolean;
    };

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/admin/dashboard" },
  { label: "Messages", icon: MessageCircle, href: "/admin/messages" },
  {
    label: "People",
    icon: Users,
    children: [
      { href: "/admin/users", label: "Users", icon: Users, superOnly: true },
      { href: "/admin/sellers", label: "Sellers", icon: Store },
      {
        href: "/admin/municipal-admins",
        label: "Municipal Admins",
        icon: ShieldCheck,
        superOnly: true,
      },
    ],
  },
  {
    label: "Catalog",
    icon: Package,
    children: [
      { href: "/admin/products", label: "Products", icon: Package },
      { href: "/admin/bidding", label: "Bidding", icon: Gavel },
      { href: "/admin/reviews", label: "Reviews", icon: Star },
    ],
  },
  {
    label: "Moderation",
    icon: Shield,
    children: [
      { href: "/admin/reports", label: "Reports", icon: FileText },
      {
        href: "/admin/audit-log",
        label: "Audit Log",
        icon: Activity,
        superOnly: true,
      },
    ],
  },
  { label: "Analytics", icon: BarChart3, href: "/admin/analytics", superOnly: true },
  { label: "Vouchers", icon: Tag, href: "/admin/vouchers", superOnly: true },
  { label: "Municipal", icon: MapPin, href: "/admin/municipal", superOnly: true },
  { label: "Settings", icon: Settings, href: "/admin/settings", superOnly: true },
];

function isActive(pathname: string, href: string) {
  if (href === "/admin/dashboard") return pathname === "/admin/dashboard";
  return pathname.startsWith(href);
}

const PAGE_TITLES: Array<[string, string]> = [
  ["/admin/dashboard", "Dashboard"],
  ["/admin/messages", "Messages"],
  ["/admin/users", "Users"],
  ["/admin/sellers", "Sellers"],
  ["/admin/municipal-admins", "Municipal Admins"],
  ["/admin/products", "Products"],
  ["/admin/bidding", "Bidding"],
  ["/admin/reviews", "Reviews"],
  ["/admin/reports", "Reports"],
  ["/admin/audit-log", "Audit Log"],
  ["/admin/analytics", "Analytics"],
  ["/admin/vouchers", "Vouchers"],
  ["/admin/municipal", "Municipal"],
  ["/admin/settings", "Settings"],
  ["/admin/test-verification", "Test Verification"],
];

function derivePageTitle(pathname: string) {
  for (const [prefix, title] of PAGE_TITLES) {
    if (pathname === prefix || pathname.startsWith(prefix + "/")) return title;
  }
  return "Admin Center";
}

function AdminSidebarContent({
  pathname,
  userProfile,
  user,
  onClose,
  isSuperAdmin,
  municipality,
}: {
  pathname: string;
  userProfile: any;
  user: any;
  onClose?: () => void;
  isSuperAdmin: boolean;
  municipality: string | null;
}) {
  const router = useRouter();

  const visibleItems = useMemo(() => {
    return NAV_ITEMS.map((item) => {
      if (isSuperAdmin) return item;
      if (item.superOnly) return null;
      if (!item.children) return item;
      const kids = item.children.filter((c) => !c.superOnly);
      if (kids.length === 0) return null;
      return { ...item, children: kids };
    }).filter(Boolean) as NavItem[];
  }, [isSuperAdmin]);

  const defaultOpen = new Set(
    visibleItems
      .filter((item) =>
        item.children?.some((c) => isActive(pathname, c.href)),
      )
      .map((item) => item.label),
  );
  const [openGroups, setOpenGroups] = useState<Set<string>>(defaultOpen);

  const toggleGroup = (label: string) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      next.has(label) ? next.delete(label) : next.add(label);
      return next;
    });
  };

  const profilePic =
    userProfile?.profilePictureUrl ||
    user?.photoURL ||
    "https://i.pinimg.com/736x/d2/98/4e/d2984ec4b65a8568eab3dc2b640fc58e.jpg";
  const displayName =
    [userProfile?.firstName, userProfile?.lastName].filter(Boolean).join(" ") ||
    user?.email ||
    "Admin";

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-5 h-14 border-b border-black/[0.06] shrink-0">
        <Link
          href="/admin/dashboard"
          onClick={onClose}
          className="flex items-center gap-2"
        >
          <div
            className="h-9 w-9 rounded-xl flex items-center justify-center"
            style={{ background: "#29a366" }}
          >
            <Shield className="h-4 w-4 text-white" strokeWidth={2.2} />
          </div>
          <span className="text-base font-bold leading-none">
            <span style={{ color: "#29a366" }}>Emoorm</span>
            <span className="text-[#111]">
              {isSuperAdmin ? " Admin" : " Municipal"}
            </span>
          </span>
        </Link>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 text-[#888] hover:text-[#111]"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto py-3 px-3">
        {!isSuperAdmin && municipality ? (
          <div className="mb-3 mx-1 px-3 py-2 rounded-xl bg-[#f0faf5] border border-[#29a366]/20">
            <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "#29a366" }}>
              Municipal Scope
            </p>
            <p className="text-xs font-semibold text-[#111] truncate mt-0.5">
              {municipality}
            </p>
          </div>
        ) : null}
        {visibleItems.map((item) => {
          const Icon = item.icon;

          if (!item.children) {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all mb-0.5",
                  active
                    ? "bg-black/[0.06] text-[#111]"
                    : "text-[#555] hover:bg-black/[0.04] hover:text-[#111]",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" strokeWidth={1.8} />
                {item.label}
              </Link>
            );
          }

          const isOpen = openGroups.has(item.label);
          const hasActiveChild = item.children.some((c) =>
            isActive(pathname, c.href),
          );

          return (
            <div key={item.label} className="mb-0.5">
              <button
                onClick={() => toggleGroup(item.label)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                  hasActiveChild
                    ? "bg-black/[0.06] text-[#111]"
                    : "text-[#555] hover:bg-black/[0.04] hover:text-[#111]",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" strokeWidth={1.8} />
                <span className="flex-1 text-left">{item.label}</span>
                <ChevronDown
                  className={cn(
                    "h-3.5 w-3.5 shrink-0 transition-transform duration-200",
                    isOpen && "rotate-180",
                  )}
                  strokeWidth={2}
                />
              </button>

              <div
                className="grid transition-all duration-200 ease-in-out"
                style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
              >
                <div className="overflow-hidden">
                  <div className="ml-3 pl-3 border-l border-black/[0.08] mt-0.5 mb-1 flex flex-col gap-0.5">
                    {item.children.map((child) => {
                      const ChildIcon = child.icon;
                      const active = isActive(pathname, child.href);
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          onClick={onClose}
                          className={cn(
                            "flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-all",
                            active
                              ? "bg-black/[0.06] text-[#111]"
                              : "text-[#666] hover:bg-black/[0.04] hover:text-[#111]",
                          )}
                        >
                          <ChildIcon
                            className="h-3.5 w-3.5 shrink-0"
                            strokeWidth={1.8}
                          />
                          {child.label}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </nav>

      <div className="border-t border-black/[0.06] p-3 shrink-0">
        <div
          className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-black/[0.04] transition-colors cursor-pointer"
          onClick={() => {
            router.push("/admin/settings");
            onClose?.();
          }}
        >
          <div className="h-8 w-8 rounded-full overflow-hidden shrink-0 border border-black/[0.08]">
            <Image
              src={profilePic}
              alt="Profile"
              width={32}
              height={32}
              className="object-cover h-full w-full"
              unoptimized
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[#111] truncate">
              {displayName}
            </p>
            <p className="text-[11px] text-[#888] truncate">
              {user?.email || ""}
            </p>
          </div>
          <ChevronRight className="h-3.5 w-3.5 text-[#bbb] shrink-0" />
        </div>
      </div>
    </div>
  );
}

// Prevents nested AdminLayout wrappers (in page files) from rendering the
// chrome again once an ancestor layout has already rendered it.
const AdminLayoutMountedContext = createContext(false);

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const alreadyMounted = useContext(AdminLayoutMountedContext);
  if (alreadyMounted) return <>{children}</>;
  return <AdminLayoutChrome>{children}</AdminLayoutChrome>;
}

function AdminLayoutChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useSupabaseAuth();
  const { isSuperAdmin, municipality } = useIsAdmin();

  const userProfileRef = useStableMemo(() => {
    if (!user) return null;
    return { table: "users", id: user.uid };
  }, [user]);
  const { data: userProfile } = useDoc(userProfileRef);

  const pageTitle = derivePageTitle(pathname);

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ backgroundColor: "#f2f2f0" }}
    >
      <aside className="hidden md:flex flex-col w-[220px] shrink-0 bg-white border-r border-black/[0.06] h-full overflow-hidden">
        <AdminSidebarContent
          pathname={pathname}
          userProfile={userProfile}
          user={user}
          isSuperAdmin={isSuperAdmin}
          municipality={municipality}
        />
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="absolute left-0 top-0 bottom-0 w-[220px] bg-white flex flex-col shadow-xl">
            <AdminSidebarContent
              pathname={pathname}
              userProfile={userProfile}
              user={user}
              onClose={() => setSidebarOpen(false)}
              isSuperAdmin={isSuperAdmin}
              municipality={municipality}
            />
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-14 bg-white border-b border-black/[0.06] flex items-center px-4 md:px-6 gap-4 shrink-0">
          <button
            className="md:hidden p-1.5 rounded-xl hover:bg-[#f2f2f0] transition-colors text-[#555]"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 text-sm">
              <span className="text-[#888] hidden sm:block">Admin Center</span>
              <ChevronRight className="h-3.5 w-3.5 text-[#ccc] hidden sm:block" />
              <span className="font-semibold text-[#111] truncate">
                {pageTitle}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/admin/messages">
              <button className="h-8 w-8 rounded-xl border border-black/[0.08] bg-[#f2f2f0] flex items-center justify-center text-[#555] hover:bg-[#e8e8e6] transition-colors">
                <Bell className="h-4 w-4" strokeWidth={1.8} />
              </button>
            </Link>
            <Link href="/" title="Exit to personal account">
              <button className="h-8 w-8 rounded-xl border border-black/[0.08] bg-[#f2f2f0] flex items-center justify-center text-[#555] hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-colors">
                <LogOut className="h-4 w-4" strokeWidth={1.8} />
              </button>
            </Link>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto flex flex-col">
          <div className="flex-1">
            <AdminScopeGuard>
              <AdminLayoutMountedContext.Provider value={true}>
                {children}
              </AdminLayoutMountedContext.Provider>
            </AdminScopeGuard>
          </div>
          <footer className="border-t border-black/[0.06] px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-2 mt-auto">
            <p className="text-[12px] text-[#aaa]">
              © Emoorm 2026. All rights reserved.
            </p>
            <span
              className="text-[12px] font-semibold"
              style={{ color: "#29a366" }}
            >
              Emoorm Admin Center
            </span>
          </footer>
        </main>
      </div>
    </div>
  );
}

// Legacy exports kept as no-ops so any lingering imports don't break the build.
export function AdminHeader() {
  return null;
}
export function AdminBottomNav() {
  return null;
}
