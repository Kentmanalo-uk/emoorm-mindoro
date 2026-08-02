"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useSupabase } from "@/supabase";

function CallbackPopupInner() {
  const supabase = useSupabase();
  const searchParams = useSearchParams();
  const [msg, setMsg] = useState("Finishing sign-in…");

  useEffect(() => {
    const opener = window.opener as Window | null;
    const targetOrigin = window.location.origin;

    const notify = (payload: Record<string, unknown>) => {
      try { opener?.postMessage(payload, targetOrigin); } catch {}
    };

    (async () => {
      const code = searchParams.get("code");
      const err = searchParams.get("error_description") || searchParams.get("error");
      if (err) {
        setMsg("Sign-in failed.");
        notify({ type: "emoorm-oauth-error", message: err });
        setTimeout(() => window.close(), 400);
        return;
      }
      try {
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        }
        // If a pending profile exists from signup flow, upsert it.
        const pendingRaw = localStorage.getItem("pendingProfile");
        const { data: userRes } = await supabase.auth.getUser();
        if (pendingRaw && userRes?.user) {
          try {
            const p = JSON.parse(pendingRaw);
            await supabase.from("users").upsert({
              id: userRes.user.id,
              name: `${p.firstName || ""} ${p.lastName || ""}`.trim(),
              firstName: p.firstName || "",
              lastName: p.lastName || "",
              email: userRes.user.email || p.email || "",
              mobile: p.mobile || "",
              province: p.province || "",
              city: p.city || "",
              barangay: p.barangay || "",
              street: p.street || "",
              role: "user",
              createdAt: new Date().toISOString(),
            }, { onConflict: "id" });
            localStorage.removeItem("pendingProfile");
          } catch {}
        }
        setMsg("Signed in. Closing…");
        notify({ type: "emoorm-oauth-complete" });
      } catch (e: any) {
        setMsg("Sign-in failed.");
        notify({ type: "emoorm-oauth-error", message: e?.message || "Unknown error" });
      } finally {
        setTimeout(() => { try { window.close(); } catch {} }, 300);
      }
    })();
  }, [supabase, searchParams]);

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "'Inter', sans-serif",
      background: "linear-gradient(140deg, #0f3d24 0%, #1a6b40 40%, #29a366 100%)",
      color: "white",
    }}>
      <div style={{ textAlign: "center" }}>
        <div style={{
          width: 36, height: 36, borderRadius: "50%",
          border: "3px solid rgba(255,255,255,0.25)", borderTopColor: "#fff",
          margin: "0 auto 14px", animation: "spin 0.9s linear infinite",
        }} />
        <p style={{ fontSize: 14, opacity: 0.9 }}>{msg}</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default function CallbackPopupPage() {
  return (
    <Suspense fallback={null}>
      <CallbackPopupInner />
    </Suspense>
  );
}
