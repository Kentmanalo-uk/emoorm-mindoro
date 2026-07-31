"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSupabase } from "@/supabase";

function AuthCallbackInner() {
  const supabase = useSupabase();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "error">("loading");

  useEffect(() => {
    const code = searchParams.get("code");

    if (!code) {
      setStatus("error");
      return;
    }

    (async () => {
      try {
        const { data, error } =
          await supabase.auth.exchangeCodeForSession(code);
        if (error) throw error;

        // Check for pending profile data from signup
        const pendingRaw = localStorage.getItem("pendingProfile");
        if (pendingRaw && data.user) {
          const pending = JSON.parse(pendingRaw);
          const { error: upsertError } = await supabase.from("users").upsert(
            {
              id: data.user.id,
              name: `${pending.firstName || ""} ${pending.lastName || ""}`.trim(),
              firstName: pending.firstName || "",
              lastName: pending.lastName || "",
              email: data.user.email || pending.email || "",
              mobile: pending.mobile || "",
              province: pending.province || "",
              city: pending.city || "",
              barangay: pending.barangay || "",
              street: pending.street || "",
              role: "buyer",
              createdAt: new Date().toISOString(),
            },
            { onConflict: "id" },
          );
          if (upsertError)
            console.error(
              "[Auth Callback] Profile save error:",
              upsertError.message,
            );
          // Send welcome notification
          await supabase.from("notifications").insert({
            userId: data.user.id,
            title: "Welcome to E-Moorm! 🎉",
            content: `Hi ${pending.firstName || "there"}! Your account is ready. Start exploring local products and stores in Oriental Mindoro.`,
            type: "welcome",
            timestamp: new Date().toISOString(),
            isRead: false,
          });
          localStorage.removeItem("pendingProfile");
        }

        router.replace("/profile");
      } catch (err) {
        console.error("Auth callback error:", err);
        setStatus("error");
      }
    })();
  }, [supabase, searchParams, router]);

  if (status === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#f9f9f9]">
        <div className="bg-white rounded-[25px] p-8 md:p-12 w-full max-w-[480px] shadow-sm text-center space-y-4">
          <div className="text-5xl">&#x26A0;&#xFE0F;</div>
          <h2 className="text-xl font-headline tracking-[-0.05em]">
            Verification failed
          </h2>
          <p className="text-sm text-muted-foreground">
            The link may have expired or already been used. Please try signing
            up again.
          </p>
          <a
            href="/signup"
            className="inline-block bg-black text-white font-bold py-4 px-8 rounded-full hover:bg-primary transition-all text-sm"
          >
            Back to Sign Up
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#f9f9f9]">
      <div className="bg-white rounded-[25px] p-8 md:p-12 w-full max-w-[480px] shadow-sm text-center space-y-4">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
        <p className="text-sm text-muted-foreground">Verifying your email...</p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center p-4 bg-[#f9f9f9]">
          <div className="bg-white rounded-[25px] p-8 md:p-12 w-full max-w-[480px] shadow-sm text-center space-y-4">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
            <p className="text-sm text-muted-foreground">
              Verifying your email...
            </p>
          </div>
        </div>
      }
    >
      <AuthCallbackInner />
    </Suspense>
  );
}
