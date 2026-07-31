"use client";

import { useEffect, useState } from "react";
import { X, Download } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Don't show if already dismissed or installed
    const dismissed = localStorage.getItem("pwa-install-dismissed");
    if (dismissed) return;

    // Check if already installed as PWA
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    // Detect iOS
    const isIOSDevice =
      /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(isIOSDevice);

    // Listen for the beforeinstallprompt event (Chrome, Edge, etc.)
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Show prompt after a short delay for better UX
      setTimeout(() => setShowPrompt(true), 2000);
    };

    window.addEventListener("beforeinstallprompt", handler);

    // For iOS, show custom prompt after delay
    if (isIOSDevice) {
      setTimeout(() => setShowPrompt(true), 2000);
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setShowPrompt(false);
      }
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem("pwa-install-dismissed", "true");
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-6 left-4 right-4 z-[9999] animate-in slide-in-from-bottom-5 duration-500 md:left-auto md:right-6 md:max-w-sm">
      <div className="bg-white/60 backdrop-blur-xl rounded-[24px] shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-black/[0.04] p-5 relative">
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-black/5 transition-colors"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </button>

        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
            <Download className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-headline text-base font-semibold tracking-tight text-black">
              Install E-Moorm
            </h3>
            {isIOS ? (
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Tap the <span className="font-semibold">Share</span> button,
                then{" "}
                <span className="font-semibold">
                  &quot;Add to Home Screen&quot;
                </span>{" "}
                for the best experience.
              </p>
            ) : (
              <>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Add E-Moorm to your home screen for quick access and a better
                  experience.
                </p>
                <button
                  onClick={handleInstall}
                  className="mt-3 w-full bg-primary text-white text-sm font-medium py-2.5 rounded-full hover:bg-primary/90 active:scale-[0.98] transition-all"
                >
                  Install App
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
