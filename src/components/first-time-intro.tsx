"use client";

import React, { useState, useEffect } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface FirstTimeIntroProps {
  storageKey: string;
  title: string;
  description: string;
  icon?: React.ReactNode;
}

export function FirstTimeIntro({
  storageKey,
  title,
  description,
  icon,
}: FirstTimeIntroProps) {
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    const key = `intro_seen_${storageKey}`;
    const seen = localStorage.getItem(key);
    if (!seen) {
      const timer = setTimeout(() => {
        setOpen(true);
        requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [storageKey]);

  const handleDismiss = () => {
    localStorage.setItem(`intro_seen_${storageKey}`, "true");
    setVisible(false);
    setTimeout(() => setOpen(false), 260);
  };

  /* ── Mobile: keep the original bottom sheet ── */
  if (isMobile) {
    return (
      <Sheet
        open={open}
        onOpenChange={(v) => {
          if (!v) handleDismiss();
        }}
      >
        <SheetContent
          side="bottom"
          className="rounded-t-[28px] px-6 pb-8 pt-4 max-w-lg mx-auto [&>button]:hidden"
        >
          <div className="flex justify-center mb-5">
            <div className="w-10 h-1 rounded-full bg-muted-foreground/20" />
          </div>
          <SheetHeader className="items-center text-center space-y-3">
            {icon && (
              <div className="flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 text-primary mb-1">
                {icon}
              </div>
            )}
            <SheetTitle className="text-xl font-semibold tracking-tight">
              {title}
            </SheetTitle>
            <SheetDescription className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
              {description}
            </SheetDescription>
          </SheetHeader>
          <Button
            onClick={handleDismiss}
            className="w-full mt-6 rounded-full h-12 text-base font-medium"
          >
            Got it
          </Button>
        </SheetContent>
      </Sheet>
    );
  }

  /* ── Desktop: floating centered card ── */
  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={handleDismiss}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.30)",
          backdropFilter: "blur(2px)",
          zIndex: 9998,
          opacity: visible ? 1 : 0,
          transition: "opacity 240ms ease",
        }}
      />

      {/* Floating card */}
      <div
        style={{
          position: "fixed",
          left: "50%",
          top: "50%",
          transform: visible
            ? "translate(-50%, -50%) scale(1)"
            : "translate(-50%, -44%) scale(0.96)",
          zIndex: 9999,
          width: "100%",
          maxWidth: 400,
          opacity: visible ? 1 : 0,
          transition: "opacity 240ms ease, transform 300ms cubic-bezier(0.34,1.4,0.64,1)",
        }}
      >
        <div
          style={{
            background: "white",
            borderRadius: 20,
            boxShadow: "0 24px 64px rgba(0,0,0,0.16), 0 0 0 1px rgba(0,0,0,0.04)",
            padding: "32px 28px 28px",
            position: "relative",
          }}
        >
          {/* Close button */}
          <button
            onClick={handleDismiss}
            style={{
              position: "absolute",
              top: 14,
              right: 14,
              width: 30,
              height: 30,
              borderRadius: "50%",
              border: "none",
              background: "rgba(0,0,0,0.06)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "#666",
            }}
          >
            <X size={14} />
          </button>

          {/* Content */}
          <div style={{ textAlign: "center" }}>
            {icon && (
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 56,
                  height: 56,
                  borderRadius: "50%",
                  background: "rgba(41,163,102,0.10)",
                  color: "#29a366",
                  marginBottom: 16,
                }}
              >
                {icon}
              </div>
            )}
            <h2
              style={{
                fontSize: "1.15rem",
                fontWeight: 700,
                color: "#111",
                marginBottom: 8,
                letterSpacing: "-0.02em",
              }}
            >
              {title}
            </h2>
            <p
              style={{
                fontSize: "0.85rem",
                color: "#777",
                lineHeight: 1.6,
                marginBottom: 24,
                maxWidth: 300,
                margin: "0 auto 24px",
              }}
            >
              {description}
            </p>
            <button
              onClick={handleDismiss}
              style={{
                width: "100%",
                height: 44,
                borderRadius: 999,
                background: "#29a366",
                color: "white",
                fontWeight: 600,
                fontSize: "0.9rem",
                border: "none",
                cursor: "pointer",
                transition: "opacity 0.15s",
              }}
              onMouseOver={(e) => (e.currentTarget.style.opacity = "0.88")}
              onMouseOut={(e) => (e.currentTarget.style.opacity = "1")}
            >
              Got it
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
