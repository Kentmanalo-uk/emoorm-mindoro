"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useIsAdmin } from "@/hooks/use-is-admin";

/**
 * Admin routes that admins ARE allowed to access.
 * Everything else will redirect them to /admin/dashboard.
 */
const ADMIN_ALLOWED_PATHS = ["/admin", "/login", "/signup", "/auth"];

/**
 * Redirects admin users away from regular user pages to the admin dashboard.
 * Admin accounts can only access /admin/* routes + login/signup/auth.
 */
export function AdminRouteGuard({ children }: { children: React.ReactNode }) {
  const { isAdmin, isAdminLoading } = useIsAdmin();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (isAdminLoading) return;
    if (!isAdmin) return;

    // Check if current path is allowed for admins
    const isAllowed = ADMIN_ALLOWED_PATHS.some((p) => pathname.startsWith(p));

    if (!isAllowed) {
      router.replace("/admin/dashboard");
    }
  }, [isAdmin, isAdminLoading, pathname, router]);

  // While checking, show the page normally (avoids flash)
  // The redirect will happen via useEffect if needed
  return <>{children}</>;
}
