"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export function ThemeColorMeta() {
  const pathname = usePathname();

  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) return;

    // Green status bar on home page, white everywhere else
    const isHome = pathname === "/";
    meta.setAttribute("content", isHome ? "#29a366" : "#ffffff");
  }, [pathname]);

  return null;
}
