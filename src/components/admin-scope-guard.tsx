"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useIsAdmin } from "@/hooks/use-is-admin";

// Paths a Municipal Admin is NOT allowed to visit.
const SUPER_ADMIN_ONLY_PATHS = [
  "/admin/users",
  "/admin/municipal-admins",
  "/admin/settings",
  "/admin/audit-log",
  "/admin/vouchers",
  "/admin/municipal",
  "/admin/analytics",
];

function isSuperAdminOnly(pathname: string) {
  return SUPER_ADMIN_ONLY_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
}

/**
 * Enforces route-level access for admin sub-pages.
 * - Not signed in / not admin → /admin (login)
 * - Municipal admin trying to reach a super-admin-only page → /admin/dashboard
 * Wrap admin pages that must be role-gated.
 */
export function AdminScopeGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname() || "";
  const { isAdmin, isAdminLoading, isSuperAdmin } = useIsAdmin();

  useEffect(() => {
    if (isAdminLoading) return;
    if (!isAdmin) {
      router.replace("/admin");
      return;
    }
    if (!isSuperAdmin && isSuperAdminOnly(pathname)) {
      router.replace("/admin/dashboard");
    }
  }, [isAdmin, isAdminLoading, isSuperAdmin, pathname, router]);

  if (isAdminLoading) return null;
  if (!isAdmin) return null;
  if (!isSuperAdmin && isSuperAdminOnly(pathname)) return null;

  return <>{children}</>;
}
