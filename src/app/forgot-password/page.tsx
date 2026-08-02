"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Loader2, ArrowLeft, CheckCircle2 } from "lucide-react";
import { useSupabase } from "@/supabase";

export default function ForgotPasswordPage() {
  const supabase = useSupabase();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) {
      setError("Please enter your email.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const redirectTo =
        typeof window !== "undefined"
          ? `${window.location.origin}/reset-password`
          : undefined;
      const { error: err } = await supabase.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        { redirectTo },
      );
      if (err) throw err;
      setSent(true);
    } catch (err: any) {
      const msg: string = err?.message || "";
      if (err instanceof TypeError || msg.toLowerCase().includes("failed to fetch"))
        setError("Unable to connect. Check your internet connection.");
      else setError(msg || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="bg-white border-b border-gray-200 shrink-0 z-10">
        <div className="max-w-[1280px] mx-auto px-6 h-14 flex items-center justify-between">
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
          <Link
            href="/login"
            className="text-sm text-[#29a366] font-semibold hover:underline flex items-center gap-1"
          >
            <ArrowLeft className="h-4 w-4" /> Back to login
          </Link>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 sm:px-8 py-10 bg-[#f2f2f0]">
        <div className="w-full max-w-[400px] bg-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.25)] border border-black/[0.04] px-7 py-8 sm:px-8 sm:py-9">
          {sent ? (
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
                Check your email
              </h1>
              <p className="text-sm text-gray-500">
                We&apos;ve sent a password reset link to{" "}
                <span className="font-semibold text-[#111]">{email}</span>. It
                may take a minute to arrive. Be sure to check your spam folder.
              </p>
              <Link
                href="/login"
                className="inline-block w-full py-3 rounded-none text-white font-semibold text-sm mt-2"
                style={{
                  background: "#29a366",
                  boxShadow: "0 6px 16px -6px rgba(41,163,102,0.55)",
                }}
              >
                Return to login
              </Link>
              <button
                type="button"
                onClick={() => {
                  setSent(false);
                  setEmail("");
                }}
                className="text-xs text-gray-500 hover:text-[#111]"
              >
                Use a different email
              </button>
            </div>
          ) : (
            <>
              <h1
                className="text-2xl font-bold text-[#111] mb-1"
                style={{ letterSpacing: "-0.02em" }}
              >
                Forgot password?
              </h1>
              <p className="text-sm text-gray-500 mb-6">
                Enter the email tied to your account and we&apos;ll send you a
                secure link to set a new password.
              </p>

              {error && (
                <div className="bg-red-50 border border-red-200 px-3 py-2.5 mb-4 text-sm text-red-600">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                    Email address
                  </label>
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
                      <Loader2 className="h-4 w-4 animate-spin" /> Sending
                      link…
                    </>
                  ) : (
                    "Send reset link"
                  )}
                </button>
              </form>

              <p className="text-xs text-gray-500 mt-6 text-center">
                Remembered it?{" "}
                <Link
                  href="/login"
                  className="text-[#29a366] font-semibold hover:underline"
                >
                  Sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
