"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { useUser, useSupabase } from "@/supabase";
import { initiateEmailSignIn, initiateGoogleSignInPopup } from "@/supabase/auth";
import { useIsAdmin } from "@/hooks/use-is-admin";

function LoginPageContent() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { user, isUserLoading } = useUser();
  const supabase = useSupabase();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect");
  const { isAdmin, isAdminLoading } = useIsAdmin();

  useEffect(() => {
    if (user && !isUserLoading && !isAdminLoading) {
      if (isAdmin) router.push("/admin/dashboard");
      else if (redirect && redirect.startsWith("/")) router.push(redirect);
      else router.push("/profile");
    }
  }, [user, isUserLoading, isAdmin, isAdminLoading, redirect, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setError("Please fill in all fields."); return; }
    setError("");
    setLoading(true);
    try {
      await initiateEmailSignIn(supabase, email, password);
    } catch (err: any) {
      const msg: string = err?.message || "";
      if (err instanceof TypeError || msg.toLowerCase().includes("failed to fetch"))
        setError("Unable to connect. Check your internet connection.");
      else if (msg.includes("Invalid login credentials"))
        setError("Incorrect email or password.");
      else if (msg.includes("Email not confirmed"))
        setError("Please verify your email first. Check your inbox.");
      else setError(msg || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError("");
    setGoogleLoading(true);
    try {
      await initiateGoogleSignInPopup(supabase);
    } catch (err: any) {
      setError(err?.message || "Google sign-in was cancelled.");
    } finally {
      setGoogleLoading(false);
    }
  };

  if (isUserLoading) return null;

  return (
    <div className="min-h-screen flex flex-col">

      {/* ── Top header bar — white, full width, like Shopee ── */}
      <div className="bg-white border-b border-gray-200 shrink-0 z-10">
        <div className="max-w-[1280px] mx-auto px-6 h-14 flex items-center justify-between">
          {/* Left: logo + page title */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center" style={{ gap: 3 }}>
              <Image src="/brand-icon.png" alt="Emoorm" width={36} height={36} style={{ objectFit: "contain" }} />
              <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: "1.6rem", letterSpacing: "-0.04em" }}>
                emoorm
              </span>
            </Link>
            <span className="text-gray-300 text-lg select-none">|</span>
            <span className="text-lg font-normal text-[#555]">Log In</span>
          </div>
          {/* Right: need help */}
          <Link href="/customer-care" className="text-sm text-[#29a366] hover:underline font-medium">
            Need Help?
          </Link>
        </div>
      </div>

      {/* ── Split layout: hero left, card right ── */}
      <div
        className="flex-1 relative flex flex-col md:flex-row overflow-hidden"
        style={{
          minHeight: "calc(100vh - 56px)",
          background:
            "linear-gradient(140deg, #0f3d24 0%, #1a6b40 40%, #29a366 100%)",
        }}
      >
        {/* Soft glow (spans full width) */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(circle at 20% 25%, rgba(125,255,184,0.18), transparent 55%), radial-gradient(circle at 80% 75%, rgba(255,255,255,0.08), transparent 60%)",
          }}
        />
        {/* Faint grid (spans full width) */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.06]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.9) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.9) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />

        {/* ── Left: brand hero (hidden on small mobile) ── */}
        <div
          className="hidden md:flex relative z-10 flex-1 items-center justify-center px-10 py-12"
        >
          <div className="relative z-10 w-full max-w-[520px] text-white">
            {/* Brand */}
            <div className="flex items-center gap-3 mb-10">
              <Image
                src="/brand-icon.png"
                alt="Emoorm"
                width={44}
                height={44}
                className="object-contain rounded-lg bg-white/95 p-1"
              />
              <span
                className="text-2xl font-bold tracking-tight"
                style={{ fontFamily: "Inter, sans-serif", letterSpacing: "-0.03em" }}
              >
                emoorm
              </span>
            </div>

            {/* Display headline — dynamic scale */}
            <h2
              className="font-black leading-[0.9] mb-6"
              style={{
                fontFamily: "Inter, sans-serif",
                fontSize: "clamp(3rem, 6vw, 5.25rem)",
                letterSpacing: "-0.055em",
              }}
            >
              Fresh from
              <br />
              <span
                style={{
                  background: "linear-gradient(120deg, #7dffb8 0%, #ffffff 65%, #d9ffe8 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                the island.
              </span>
            </h2>

            {/* Stat chip strip */}
            <div className="flex items-center gap-6">
              <div>
                <p className="text-4xl font-black leading-none tracking-tight" style={{ letterSpacing: "-0.04em" }}>15</p>
                <p className="text-[11px] uppercase tracking-[0.14em] text-white/60 mt-1.5">Municipalities</p>
              </div>
              <div className="h-10 w-px bg-white/15" />
              <div>
                <p className="text-4xl font-black leading-none tracking-tight" style={{ letterSpacing: "-0.04em", color: "#7dffb8" }}>100%</p>
                <p className="text-[11px] uppercase tracking-[0.14em] text-white/60 mt-1.5">Local sellers</p>
              </div>
              <div className="h-10 w-px bg-white/15" />
              <div>
                <p className="text-4xl font-black leading-none tracking-tight" style={{ letterSpacing: "-0.04em" }}>Free</p>
                <p className="text-[11px] uppercase tracking-[0.14em] text-white/60 mt-1.5">To join</p>
              </div>
            </div>
          </div>

          {/* Decorative oversized outline word */}
          <span
            aria-hidden
            className="absolute pointer-events-none select-none font-black"
            style={{
              right: "-4%",
              bottom: "-6%",
              fontSize: "18rem",
              lineHeight: 1,
              letterSpacing: "-0.06em",
              color: "transparent",
              WebkitTextStroke: "1px rgba(255,255,255,0.08)",
              fontFamily: "Inter, sans-serif",
            }}
          >
            mindoro
          </span>
        </div>

        {/* ── Right: form card (same green bg as left) ── */}
        <div
          className="relative z-10 flex-1 flex items-center justify-center px-4 sm:px-8 py-10"
        >
          <div className="w-full max-w-[400px] bg-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.25)] border border-black/[0.04] px-7 py-8 sm:px-8 sm:py-9">

            {/* Card title */}
            <h1 className="text-2xl font-bold text-[#111] mb-1" style={{ letterSpacing: "-0.02em" }}>
              Welcome back
            </h1>
            <p className="text-sm text-gray-500 mb-6">Sign in to continue to Emoorm.</p>

            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 px-3 py-2.5 mb-4 text-sm text-red-600">
                {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-3">
              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Email address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  disabled={loading}
                  autoComplete="email"
                  required
                  className="w-full border border-gray-200 rounded-none px-3.5 py-3 text-sm text-[#111] placeholder:text-gray-400 outline-none focus:border-[#29a366] focus:ring-2 focus:ring-[#29a366]/15 transition-all disabled:opacity-50"
                />
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-gray-500">Password</label>
                  <Link href="/forgot-password" className="text-[11px] text-[#29a366] hover:underline font-semibold">
                    Forgot?
                  </Link>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    disabled={loading}
                    autoComplete="current-password"
                    required
                    className="w-full border border-gray-200 rounded-none px-3.5 py-3 pr-10 text-sm text-[#111] placeholder:text-gray-400 outline-none focus:border-[#29a366] focus:ring-2 focus:ring-[#29a366]/15 transition-all disabled:opacity-50"
                  />
                  <button type="button" tabIndex={-1} onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button type="submit" disabled={loading}
                className="w-full py-3 rounded-none text-white font-semibold text-sm transition-all disabled:opacity-60 flex items-center justify-center gap-2 mt-2 hover:opacity-95 active:scale-[0.99]"
                style={{ background: "#29a366", boxShadow: "0 6px 16px -6px rgba(41,163,102,0.55)" }}>
                {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Signing in…</> : "Log in"}
              </button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-3 my-5">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-[11px] text-gray-400 font-medium uppercase tracking-wider">Or continue with</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            {/* Google button */}
            <button onClick={handleGoogle} disabled={googleLoading}
              className="w-full py-2.5 rounded-none border border-gray-200 text-sm font-semibold text-[#333] flex items-center justify-center gap-2.5 hover:bg-gray-50 transition-colors disabled:opacity-60">
              {googleLoading ? <Loader2 className="h-4 w-4 animate-spin text-gray-400" /> : (
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4" />
                  <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853" />
                  <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05" />
                  <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335" />
                </svg>
              )}
              Sign in with Google
            </button>

            {/* Sign up */}
            <p className="text-sm text-gray-500 text-center mt-6">
              New to Emoorm?{" "}
              <Link
                href={redirect ? `/signup?redirect=${encodeURIComponent(redirect)}` : "/signup"}
                className="text-[#29a366] font-semibold hover:underline"
              >
                Create an account
              </Link>
            </p>

            {/* Terms */}
            <p className="text-[10.5px] text-gray-400 text-center mt-4 leading-relaxed">
              By logging in, you agree to Emoorm's{" "}
              <Link href="/terms" className="text-gray-500 hover:text-[#29a366]">Terms</Link>
              {" "}&amp;{" "}
              <Link href="/privacy" className="text-gray-500 hover:text-[#29a366]">Privacy Policy</Link>
            </p>
          </div>
        </div>
      </div>

      {/* Dim backdrop while Google popup is open */}
      {googleLoading && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center"
          style={{ background: "rgba(10, 25, 15, 0.55)" }}
        >
          <div className="bg-white px-6 py-5 flex items-center gap-3 shadow-2xl">
            <Loader2 className="h-5 w-5 animate-spin text-[#29a366]" />
            <span className="text-sm font-medium text-[#111]">Continue in the Google window…</span>
          </div>
        </div>
      )}

    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <LoginPageContent />
    </Suspense>
  );
}
