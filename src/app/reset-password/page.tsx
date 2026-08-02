"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Loader2, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { useSupabase } from "@/supabase";

function ResetPasswordInner() {
  const supabase = useSupabase();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [exchanging, setExchanging] = useState(true);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  // On mount: if the URL has a `?code=...` (Supabase PKCE) or `#access_token` (implicit),
  // exchange it for a recovery session so updateUser() works.
  useEffect(() => {
    (async () => {
      try {
        const code = searchParams.get("code");
        if (code) {
          const { error: exErr } =
            await supabase.auth.exchangeCodeForSession(code);
          if (exErr) throw exErr;
        }
        const { data } = await supabase.auth.getSession();
        if (!data.session) {
          setError(
            "This reset link is invalid or has expired. Request a new one below.",
          );
        } else {
          setReady(true);
        }
      } catch (err: any) {
        setError(
          err?.message ||
            "This reset link is invalid or has expired. Request a new one below.",
        );
      } finally {
        setExchanging(false);
      }
    })();
  }, [supabase, searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const { error: upErr } = await supabase.auth.updateUser({ password });
      if (upErr) throw upErr;
      setDone(true);
      setTimeout(() => router.replace("/login"), 2000);
    } catch (err: any) {
      setError(err?.message || "Could not update password. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="bg-white border-b border-gray-200 shrink-0 z-10">
        <div className="max-w-[1280px] mx-auto px-6 h-14 flex items-center">
          <Link href="/" className="flex items-center" style={{ gap: 3 }}>
            <Image
              src="/brand-icon.png"
              alt="Emoorm"
              width={36}
              height={36}
              style={{ objectFit: "contain" }}
            />
            <span
              style={{
                fontFamily: "'Inter', sans-serif",
                fontWeight: 700,
                fontSize: "1.6rem",
                letterSpacing: "-0.04em",
              }}
            >
              emoorm
            </span>
          </Link>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 sm:px-8 py-10 bg-[#f2f2f0]">
        <div className="w-full max-w-[400px] bg-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.25)] border border-black/[0.04] px-7 py-8 sm:px-8 sm:py-9">
          {exchanging ? (
            <div className="text-center space-y-3 py-8">
              <Loader2
                className="h-6 w-6 animate-spin mx-auto"
                style={{ color: "#29a366" }}
              />
              <p className="text-sm text-gray-500">Verifying reset link…</p>
            </div>
          ) : done ? (
            <div className="text-center space-y-4">
              <div
                className="mx-auto h-12 w-12 rounded-full flex items-center justify-center"
                style={{ background: "#f0faf5" }}
              >
                <CheckCircle2 className="h-6 w-6" style={{ color: "#29a366" }} />
              </div>
              <h1
                className="text-xl font-bold text-[#111]"
                style={{ letterSpacing: "-0.02em" }}
              >
                Password updated
              </h1>
              <p className="text-sm text-gray-500">
                Redirecting you to sign in…
              </p>
            </div>
          ) : ready ? (
            <>
              <h1
                className="text-2xl font-bold text-[#111] mb-1"
                style={{ letterSpacing: "-0.02em" }}
              >
                Set a new password
              </h1>
              <p className="text-sm text-gray-500 mb-6">
                Pick something strong you&apos;ll remember. Minimum 8
                characters.
              </p>

              {error && (
                <div className="bg-red-50 border border-red-200 px-3 py-2.5 mb-4 text-sm text-red-600">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                    New password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      disabled={loading}
                      autoComplete="new-password"
                      required
                      className="w-full border border-gray-200 rounded-none px-3.5 py-3 pr-10 text-sm text-[#111] placeholder:text-gray-400 outline-none focus:border-[#29a366] focus:ring-2 focus:ring-[#29a366]/15 transition-all disabled:opacity-50"
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                    Confirm new password
                  </label>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Retype your password"
                    disabled={loading}
                    autoComplete="new-password"
                    required
                    className="w-full border border-gray-200 rounded-none px-3.5 py-3 text-sm text-[#111] placeholder:text-gray-400 outline-none focus:border-[#29a366] focus:ring-2 focus:ring-[#29a366]/15 transition-all disabled:opacity-50"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-none text-white font-semibold text-sm transition-all disabled:opacity-60 flex items-center justify-center gap-2 mt-2 hover:opacity-95 active:scale-[0.99]"
                  style={{
                    background: "#29a366",
                    boxShadow: "0 6px 16px -6px rgba(41,163,102,0.55)",
                  }}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Updating…
                    </>
                  ) : (
                    "Update password"
                  )}
                </button>
              </form>
            </>
          ) : (
            <div className="text-center space-y-4">
              <h1
                className="text-xl font-bold text-[#111]"
                style={{ letterSpacing: "-0.02em" }}
              >
                Link invalid or expired
              </h1>
              <p className="text-sm text-gray-500">{error}</p>
              <Link
                href="/forgot-password"
                className="inline-block w-full py-3 rounded-none text-white font-semibold text-sm"
                style={{
                  background: "#29a366",
                  boxShadow: "0 6px 16px -6px rgba(41,163,102,0.55)",
                }}
              >
                Request a new link
              </Link>
              <Link
                href="/login"
                className="block text-xs text-gray-500 hover:text-[#111]"
              >
                Back to login
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#f2f2f0]">
          <Loader2
            className="h-6 w-6 animate-spin"
            style={{ color: "#29a366" }}
          />
        </div>
      }
    >
      <ResetPasswordInner />
    </Suspense>
  );
}
