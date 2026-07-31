"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { useUser, useSupabase } from "@/supabase";
import { initiateEmailSignIn, initiateGoogleSignIn } from "@/supabase/auth";
import { useIsAdmin } from "@/hooks/use-is-admin";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { user, isUserLoading } = useUser();
  const supabase = useSupabase();
  const router = useRouter();
  const { isAdmin, isAdminLoading } = useIsAdmin();

  useEffect(() => {
    if (user && !isUserLoading && !isAdminLoading) {
      router.push(isAdmin ? "/admin/dashboard" : "/profile");
    }
  }, [user, isUserLoading, isAdmin, isAdminLoading, router]);

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
    setGoogleLoading(true);
    try { await initiateGoogleSignIn(supabase); }
    catch { setGoogleLoading(false); }
  };

  if (isUserLoading) return null;

  return (
    <div className="min-h-screen flex flex-col">

      {/* ── Top header bar — white, full width, like Shopee ── */}
      <div className="bg-white border-b border-gray-200 shrink-0 z-10">
        <div className="max-w-[1280px] mx-auto px-6 h-14 flex items-center justify-between">
          {/* Left: logo + page title */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <Image src="/brand-icon.png" alt="Emoorm" width={30} height={30} className="object-contain" />
              <span className="text-xl font-semibold text-[#29a366]" style={{ fontFamily: "Inter, sans-serif" }}>
                Emoorm
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

      {/* ── Full-width background + floating card ── */}
      <div
        className="flex-1 relative flex items-center justify-end overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #1a6b40 0%, #29a366 45%, #4dbb7a 100%)",
          minHeight: "calc(100vh - 56px)",
        }}
      >
        {/* Background texture overlay */}
        <div className="absolute inset-0 opacity-[0.06] pointer-events-none">
          <Image src="/assets/vegetables.jpg" alt="" fill className="object-cover" unoptimized />
        </div>

        {/* Decorative circles */}
        <div className="absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(255,255,255,0.12) 0%, transparent 70%)" }} />
        <div className="absolute bottom-0 left-1/4 h-96 w-96 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)" }} />

        {/* Left: brand content */}
        <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-center pl-16 pr-8 pointer-events-none select-none"
          style={{ width: "55%" }}>
          <div className="flex items-center gap-4">
            <Image src="/brand-icon.png" alt="Emoorm" width={80} height={80} className="object-contain drop-shadow-xl brightness-0 invert" />
            <span className="text-5xl font-bold text-white drop-shadow-lg" style={{ fontFamily: "Inter, sans-serif" }}>
              Emoorm
            </span>
          </div>
          <p className="text-white/75 text-lg mt-4 font-normal">Discover Oriental Mindoro Products</p>
        </div>

        {/* Right: floating login card */}
        <div className="relative z-10 w-full max-w-[390px] mr-24 my-8">
          <div className="bg-white shadow-2xl px-8 py-8">

            {/* Card title */}
            <h1 className="text-xl font-semibold text-[#333] mb-5">Log In</h1>

            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded px-3 py-2.5 mb-4 text-sm text-red-600">
                {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-3">
              {/* Email */}
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                disabled={loading}
                autoComplete="email"
                required
                className="w-full border border-gray-300 rounded px-3.5 py-3 text-sm text-[#111] placeholder:text-gray-400 outline-none focus:border-[#29a366] focus:ring-1 focus:ring-[#29a366]/30 transition-all disabled:opacity-50"
              />

              {/* Password */}
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  disabled={loading}
                  autoComplete="current-password"
                  required
                  className="w-full border border-gray-300 rounded px-3.5 py-3 pr-10 text-sm text-[#111] placeholder:text-gray-400 outline-none focus:border-[#29a366] focus:ring-1 focus:ring-[#29a366]/30 transition-all disabled:opacity-50"
                />
                <button type="button" tabIndex={-1} onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {/* Submit */}
              <button type="submit" disabled={loading}
                className="w-full py-3 rounded text-white font-bold text-sm uppercase tracking-wide transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                style={{ background: "#29a366" }}>
                {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Signing in...</> : "LOG IN"}
              </button>
            </form>

            {/* Forgot password */}
            <div className="mt-3 mb-4">
              <Link href="/forgot-password" className="text-sm text-[#29a366] hover:underline font-medium">
                Forgot Password
              </Link>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400 font-medium">OR</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            {/* Social buttons */}
            <button onClick={handleGoogle} disabled={googleLoading}
              className="w-full py-2.5 rounded border border-gray-200 text-sm font-semibold text-[#333] flex items-center justify-center gap-2.5 hover:bg-gray-50 transition-colors disabled:opacity-60">
              {googleLoading ? <Loader2 className="h-4 w-4 animate-spin text-gray-400" /> : (
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4" />
                  <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853" />
                  <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05" />
                  <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335" />
                </svg>
              )}
              Google
            </button>

            {/* Terms */}
            <p className="text-[11px] text-gray-400 text-center mt-5 leading-relaxed">
              By logging in, you agree to Emoorm's{" "}
              <Link href="/terms" className="text-[#29a366] hover:underline">Terms of Service</Link>
              {" "}&amp;{" "}
              <Link href="/privacy" className="text-[#29a366] hover:underline">Privacy Policy</Link>
            </p>

            {/* Sign up */}
            <p className="text-sm text-gray-500 text-center mt-4">
              New to Emoorm?{" "}
              <Link href="/signup" className="text-[#29a366] font-bold hover:underline">Sign up</Link>
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}
