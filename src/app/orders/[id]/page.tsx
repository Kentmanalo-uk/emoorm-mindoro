"use client";

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white dark:bg-[#050505] px-6 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-10 w-10 text-primary"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M18.364 5.636a9 9 0 11-12.728 0M12 9v4m0 4h.01"
          />
        </svg>
      </div>
      <h1 className="mb-2 text-2xl font-bold text-foreground font-headline">
        You&apos;re Offline
      </h1>
      <p className="mb-8 max-w-sm text-muted-foreground">
        It looks like you&apos;ve lost your internet connection. Please check
        your connection and try again.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="rounded-full bg-primary px-8 py-3 text-sm font-medium text-white transition-colors hover:bg-primary/90"
      >
        Try Again
      </button>
    </div>
  );
}
