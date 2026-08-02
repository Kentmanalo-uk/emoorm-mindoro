"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useIsAdmin } from "@/hooks/use-is-admin";

const ADMIN_ONLY_PREFIX = "/admin";

const PUBLIC_ALLOWED_FOR_ADMIN = [
  "/login",
  "/signup",
  "/confirm-email",
  "/auth",
  "/privacy",
  "/terms",
  "/customer-care",
  "/offline",
];

export function AdminRouteGuard({ children }: { children: React.ReactNode }) {
  const { isAdmin, isAdminLoading } = useIsAdmin();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isAdminLoading || !isAdmin || !pathname) return;

    const inAdminArea = pathname.startsWith(ADMIN_ONLY_PREFIX);
    if (inAdminArea) return;

    const isPublicAllowed = PUBLIC_ALLOWED_FOR_ADMIN.some(
      (p) => pathname === p || pathname.startsWith(`${p}/`),
    );
    if (isPublicAllowed) return;

    router.replace("/admin/dashboard");
  }, [isAdmin, isAdminLoading, pathname, router]);

  return <>{children}</>;
}
