"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Package,
  BarChart3,
  Store,
  Settings,
  Bell,
  ChevronRight,
  LogOut,
  Plus,
  Menu,
  X,
  ChevronDown,
  ClipboardList,
  MessageSquare,
  Star,
  Wallet,
} from "lucide-react";
import { useSupabaseAuth, useStableMemo, useDoc } from "@/supabase";
import Image from "next/image";

type NavChild = { href: string; label: string; icon: React.ElementType };
type NavItem =
  | {
      label: string;
      icon: React.ElementType;
      href: string;
      children?: undefined;
    }
  | {
      label: string;
      icon: React.ElementType;
      href?: undefined;
      children: NavChild[];
    };

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/seller/dashboard" },
  { label: "My Orders", icon: ClipboardList, href: "/seller/orders" },
  { label: "Messages", icon: MessageSquare, href: "/seller/messages" },
  {
    label: "Products",
    icon: Package,
    children: [
      { href: "/seller/products", label: "My Products", icon: Package },
      { href: "/seller/products/add", label: "Add Product", icon: Plus },
    ],
  },
  { label: "Reviews", icon: Star, href: "/seller/reviews" },
  { label: "Analytics", icon: BarChart3, href: "/seller/analytics" },
  { label: "Finance", icon: Wallet, href: "/seller/finance" },
  {
    label: "My Shop",
    icon: Store,
    children: [
      { href: "/seller/profile", label: "Shop Profile", icon: Store },
      { href: "/seller/settings", label: "Shop Settings", icon: Settings },
    ],
  },
];

function isActive(pathname: string, href: string) {
  if (href === "/seller/dashboard") return pathname === "/seller/dashboard";
  return pathname.startsWith(href);
}

function SellerSidebarContent({
  pathname,
  userProfile,
  user,
  onClose,
}: {
  pathname: string;
  userProfile: any;
  user: any;
  onClose?: () => void;
}) {
  const router = useRouter();

  // Auto-expand groups that contain the active route
  const defaultOpen = new Set(
    NAV_ITEMS.filter((item) =>
      item.children?.some((c) => isActive(pathname, c.href)),
    ).map((item) => item.label),
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
    "Seller";

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center justify-between px-5 h-14 border-b border-black/[0.06] shrink-0">
        <Link
          href="/seller/dashboard"
          onClick={onClose}
          className="flex items-center gap-2"
        >
          <Image
            src="/brand-icon.png"
            alt="Emoorm"
            width={38}
            height={38}
            className="rounded-xl"
          />
          <span className="text-base font-bold leading-none">
            <span style={{ color: "#29a366" }}>Emoorm</span>
            <span className="text-[#111]"> Seller Center</span>
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

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-3">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;

          // ── Single link ──────────────────────────────────────
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

          // ── Expandable group ─────────────────────────────────
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

              {/* Children — grid trick for smooth height animation */}
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

      {/* User card */}
      <div className="border-t border-black/[0.06] p-3 shrink-0">
        <div
          className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-black/[0.04] transition-colors cursor-pointer"
          onClick={() => {
            router.push("/seller/profile");
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

export function SellerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useSupabaseAuth();

  const userProfileRef = useStableMemo(() => {
    if (!user) return null;
    return { table: "users", id: user.uid };
  }, [user]);
  const { data: userProfile } = useDoc(userProfileRef);

  // Derive page title from pathname
  const pageTitle = (() => {
    if (pathname === "/seller/dashboard") return "Dashboard";
    if (pathname.startsWith("/seller/orders")) return "My Orders";
    if (pathname.startsWith("/seller/messages")) return "Messages";
    if (pathname === "/seller/products/add" || pathname.includes("edit="))
      return "Add Product";
    if (pathname.startsWith("/seller/products")) return "My Products";
    if (pathname.startsWith("/seller/reviews")) return "Reviews";
    if (pathname.startsWith("/seller/analytics")) return "Analytics";
    if (pathname.startsWith("/seller/finance")) return "Finance";
    if (pathname.startsWith("/seller/profile")) return "Shop Profile";
    if (pathname.startsWith("/seller/settings")) return "Shop Settings";
    if (pathname.startsWith("/seller/university")) return "Seller University";
    return "Seller Center";
  })();

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ backgroundColor: "#f2f2f0" }}
    >
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-[220px] shrink-0 bg-white border-r border-black/[0.06] h-full overflow-hidden">
        <SellerSidebarContent
          pathname={pathname}
          userProfile={userProfile}
          user={user}
        />
      </aside>

      {/* Mobile Sidebar Drawer */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="absolute left-0 top-0 bottom-0 w-[220px] bg-white flex flex-col shadow-xl">
            <SellerSidebarContent
              pathname={pathname}
              userProfile={userProfile}
              user={user}
              onClose={() => setSidebarOpen(false)}
            />
          </aside>
        </div>
      )}

      {/* Main content column */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="h-14 bg-white border-b border-black/[0.06] flex items-center px-4 md:px-6 gap-4 shrink-0">
          {/* Mobile hamburger */}
          <button
            className="md:hidden p-1.5 rounded-xl hover:bg-[#f2f2f0] transition-colors text-[#555]"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Page title / breadcrumb */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 text-sm">
              <span className="text-[#888] hidden sm:block">Seller Center</span>
              <ChevronRight className="h-3.5 w-3.5 text-[#ccc] hidden sm:block" />
              <span className="font-semibold text-[#111] truncate">
                {pageTitle}
              </span>
            </div>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            <button className="h-8 w-8 rounded-xl border border-black/[0.08] bg-[#f2f2f0] flex items-center justify-center text-[#555] hover:bg-[#e8e8e6] transition-colors">
              <Bell className="h-4 w-4" strokeWidth={1.8} />
            </button>
            <Link href="/" title="Exit to personal account">
              <button className="h-8 w-8 rounded-xl border border-black/[0.08] bg-[#f2f2f0] flex items-center justify-center text-[#555] hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-colors">
                <LogOut className="h-4 w-4" strokeWidth={1.8} />
              </button>
            </Link>
          </div>
        </header>

        {/* Scrollable page content */}
        <main className="flex-1 overflow-y-auto flex flex-col">
          <div className="flex-1">{children}</div>
          <footer className="border-t border-black/[0.06] px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-2 mt-auto">
            <p className="text-[12px] text-[#aaa]">
              © Emoorm 2026. All rights reserved.
            </p>
            <Link
              href="/seller/university"
              className="text-[12px] font-semibold hover:underline"
              style={{ color: "#29a366" }}
            >
              Emoorm Seller University
            </Link>
          </footer>
        </main>
      </div>
    </div>
  );
}
