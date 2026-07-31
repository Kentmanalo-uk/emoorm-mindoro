"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  ShoppingCart,
  Package,
  Store,
  BarChart3,
  Settings,
  Bell,
  MessageCircle,
  FileText,
  Shield,
} from "lucide-react";
import { useSupabaseAuth, useStableMemo, useDoc } from "@/supabase";
import Image from "next/image";

const adminNavItems = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/orders", label: "Orders", icon: ShoppingCart },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/sellers", label: "Sellers", icon: Store },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/reports", label: "Reports", icon: FileText },
];

const adminNavItemsMobile = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/orders", label: "Orders", icon: ShoppingCart },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/messages", label: "Messages", icon: MessageCircle },
];

export function AdminHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useSupabaseAuth();

  const isActive = (path: string) => {
    if (path === "/admin/dashboard" && pathname === "/admin/dashboard")
      return true;
    if (path !== "/admin/dashboard" && pathname.startsWith(path)) return true;
    return false;
  };

  const userProfileRef = useStableMemo(() => {
    if (!user) return null;
    return { table: "users", id: user.uid };
  }, [user]);
  const { data: userProfile } = useDoc(userProfileRef);
  const profilePic =
    (userProfile as any)?.profilePictureUrl ||
    user?.photoURL ||
    "https://i.pinimg.com/736x/d2/98/4e/d2984ec4b65a8568eab3dc2b640fc58e.jpg";

  return (
    <>
      {/* Desktop floating nav — matches seller .site-nav style */}
      <div className="site-nav" style={{ display: undefined }}>
        <div className="nav-side left-side">
          <div className="brand">
            <Link
              href="/admin/dashboard"
              className="logo flex items-center gap-2"
            >
              <Shield className="h-4 w-4 text-primary" />
              Admin Panel
            </Link>
          </div>
        </div>

        <nav className="navlinks">
          {adminNavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(isActive(item.href) && "active")}
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/admin/settings"
            className={cn(pathname.startsWith("/admin/settings") && "active")}
          >
            Settings
          </Link>
        </nav>

        <div className="nav-side right-side">
          <div className="auth-actions">
            <Link href="/admin/messages">
              <div
                className={cn(
                  "icon-btn",
                  pathname.startsWith("/admin/messages") && "text-primary",
                )}
                aria-label="Messages"
              >
                <MessageCircle className="h-[18px] w-[18px]" />
              </div>
            </Link>
            <Link href="/admin/messages">
              <div className="icon-btn" aria-label="Notifications">
                <Bell className="h-[18px] w-[18px]" />
              </div>
            </Link>
            <div
              className="h-10 w-10 rounded-full border border-white/20 shadow-sm overflow-hidden cursor-pointer hover:scale-105 transition-transform"
              onClick={() => router.push("/admin/settings")}
            >
              <Image
                src={profilePic}
                alt="Profile"
                width={40}
                height={40}
                className="object-cover h-full w-full"
                unoptimized
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export function AdminBottomNav() {
  const pathname = usePathname();
  const { user } = useSupabaseAuth();
  const userProfileRef = useStableMemo(() => {
    if (!user) return null;
    return { table: "users", id: user.uid };
  }, [user]);
  const { data: userProfile } = useDoc(userProfileRef);
  const profilePic =
    (userProfile as any)?.profilePictureUrl ||
    user?.photoURL ||
    "https://i.pinimg.com/736x/d2/98/4e/d2984ec4b65a8568eab3dc2b640fc58e.jpg";

  const isActive = (path: string) => {
    if (path === "/admin/dashboard" && pathname === "/admin/dashboard")
      return true;
    if (path !== "/admin/dashboard" && pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <div className="mobile-bottom-nav">
      <div className="mobile-nav-container">
        {adminNavItemsMobile.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn("mobile-nav-item", isActive(item.href) && "active")}
            >
              <div className="mobile-nav-icon">
                <Icon
                  className="h-[30px] w-[30px]"
                  strokeWidth={1.2}
                  fill={isActive(item.href) ? "currentColor" : "none"}
                />
              </div>
              <span>{item.label}</span>
            </Link>
          );
        })}
        <Link
          href="/admin/settings"
          className={cn(
            "mobile-nav-item",
            pathname.startsWith("/admin/settings") && "active",
          )}
        >
          <div
            className={cn(
              "h-8 w-8 rounded-full overflow-hidden border-2 transition-all",
              pathname.startsWith("/admin/settings")
                ? "border-primary scale-110 shadow-lg"
                : "border-muted",
            )}
          >
            <Image
              src={profilePic}
              alt="PFP"
              width={32}
              height={32}
              className="object-cover h-full w-full"
              unoptimized
            />
          </div>
          <span>Admin</span>
        </Link>
      </div>
    </div>
  );
}

export function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-white dark:bg-[#050505]">
      <AdminHeader />
      <main className="flex-grow page-content">{children}</main>
      <AdminBottomNav />
    </div>
  );
}
