import React from "react";
import Link from "next/link";
import { Home, SearchX } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-white dark:bg-[#050505]">
      <main className="flex-grow flex items-center justify-center px-6">
        <div className="flex flex-col items-center text-center max-w-md">
          <div className="h-28 w-28 rounded-full bg-black/[0.03] dark:bg-white/[0.03] flex items-center justify-center mb-8">
            <SearchX className="h-14 w-14 text-muted-foreground/40" />
          </div>

          <h1 className="text-[7rem] leading-none font-headline tracking-tighter text-black/10 dark:text-white/10 select-none">
            404
          </h1>

          <h2 className="text-xl md:text-2xl font-headline tracking-tight text-black dark:text-white -mt-4 mb-3">
            Page not found
          </h2>

          <p className="text-sm text-muted-foreground leading-relaxed mb-10">
            The page you&apos;re looking for doesn&apos;t exist or has been
            moved. Let&apos;s get you back on track.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
            <Link
              href="/"
              className="flex-1 h-12 rounded-full border border-black/10 dark:border-white/10 flex items-center justify-center gap-2 text-sm font-medium hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
              <Home className="h-4 w-4" />
              Back to Home
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
