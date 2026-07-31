"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  Mail,
  RotateCw,
  Loader2,
  Eye,
  EyeOff,
  Check,
  X,
  Store,
  Sprout,
} from "lucide-react";
import { useUser, useSupabase } from "@/supabase";
import { initiateEmailSignUp } from "@/supabase/auth";

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: "At least 8 characters", pass: password.length >= 8 },
    { label: " letter", pass: /[A-Z]/.test(password) },
    { label: "Number", pass: /\d/.test(password) },
  ];
  const score = checks.filter((c) => c.pass).length;
  const colors = ["#e0e0e0", "#e53e3e", "#f6ad55", "#29a366"];
  const labels = ["", "Too short", "Almost there", "Strong"];
  if (!password) return null;
  return (
    <div className="mt-2 space-y-2">
      <div className="flex gap-1">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex-1 h-1 rounded-full transition-all"
            style={{ background: i <= score ? colors[score] : "#e8e8e8" }}
          />
        ))}
      </div>
      <p className="text-xs font-medium" style={{ color: colors[score] }}>
        {labels[score]}
      </p>
      <div className="space-y-1">
        {checks.map((c) => (
          <div key={c.label} className="flex items-center gap-1.5">
            {c.pass ? (
              <Check className="h-3 w-3 text-[#29a366]" />
            ) : (
              <X className="h-3 w-3 text-[#ccc]" />
            )}
            <span
              className={`text-[11px] ${c.pass ? "text-[#29a366]" : "text-[#aaa]"}`}
            >
              {c.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

const inputClass =
  "w-full bg-white border border-[#e0e0e0] rounded-xl px-4 py-3.5 text-sm text-[#111] placeholder:text-[#bbb] outline-none focus:border-[#29a366] focus:ring-2 focus:ring-[#29a366]/15 transition-all disabled:opacity-50";
const labelClass = "block text-xs font-semibold text-[#555] mb-1.5 ml-1";

export default function SellerSignupPage() {
  const router = useRouter();
  const supabase = useSupabase();
  const { user, isUserLoading } = useUser();

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  useEffect(() => {
    if (user && !isUserLoading && !emailSent)
      router.replace("/seller/register");
  }, [user, isUserLoading, emailSent]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firstName.trim() || !form.lastName.trim()) {
      setError("Please enter your full name.");
      return;
    }
    if (!form.email.includes("@")) {
      setError("Please enter a valid email.");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setError("");
    setLoading(true);

    try {
      const result = await initiateEmailSignUp(
        supabase,
        form.email,
        form.password,
      );
      // Mark seller intent so after email confirmation the app can redirect properly
      localStorage.setItem("sellerSignupIntent", "true");
      localStorage.setItem(
        "pendingProfile",
        JSON.stringify({
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
        }),
      );

      if (result.needsConfirmation) {
        setEmailSent(true);
        return;
      }
      if (result.user) {
        await supabase.from("users").upsert(
          {
            id: result.user.id,
            name: `${form.firstName} ${form.lastName}`.trim(),
            firstName: form.firstName,
            lastName: form.lastName,
            email: form.email,
            role: "buyer",
            createdAt: new Date().toISOString(),
          },
          { onConflict: "id" },
        );
        localStorage.removeItem("pendingProfile");
        router.push("/seller/register");
      }
    } catch (err: any) {
      const msg: string = err?.message || "";
      if (msg.includes("already registered")) {
        setError("This email is already registered. Try signing in instead.");
      } else {
        setError(msg || "Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await initiateEmailSignUp(supabase, form.email, form.password);
    } catch {
    } finally {
      setResending(false);
    }
  };

  if (isUserLoading) return null;

  // Email confirmation screen
  if (emailSent)
    return (
      <div
        className="min-h-screen flex items-center justify-center p-6"
        style={{ backgroundColor: "#f2f2f0" }}
      >
        <div className="bg-white rounded-2xl p-10 w-full max-w-[420px] shadow-sm border border-black/[0.06] text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#29a366]/10 flex items-center justify-center mx-auto mb-5">
            <Mail className="h-8 w-8 text-[#29a366]" />
          </div>
          <h2 className="text-xl font-bold text-[#111] mb-2">
            Check your email
          </h2>
          <p className="text-sm text-[#777] mb-1">
            We sent a confirmation link to
          </p>
          <p className="text-sm font-bold text-[#111] mb-3">{form.email}</p>
          <p className="text-xs text-[#aaa] leading-relaxed mb-8">
            Click the link in the email to verify your account. After
            confirming, you will be taken to set up your seller shop.
          </p>
          <button
            onClick={handleResend}
            disabled={resending}
            className="w-full bg-[#f4f4f2] text-[#111] font-semibold py-3.5 rounded-xl text-sm flex items-center justify-center gap-2 mb-4 disabled:opacity-60 hover:bg-[#ebebeb] transition-colors"
          >
            {resending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RotateCw className="h-4 w-4" />
            )}
            {resending ? "Resending…" : "Resend confirmation email"}
          </button>
          <Link
            href="/login"
            className="text-sm text-[#29a366] font-semibold hover:underline"
          >
            Go to Sign In
          </Link>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: "#f2f2f0" }}>
      {/* Left panel */}
      <div
        className="hidden lg:flex flex-col justify-between w-[400px] shrink-0 relative overflow-hidden p-10"
        style={{
          background: "linear-gradient(160deg, #064e3b 0%, #29a366 100%)",
        }}
      >
        <div className="absolute inset-0 opacity-[0.07]">
          <Image
            src="/assets/fruits.jpg"
            alt=""
            fill
            className="object-cover"
            unoptimized
          />
        </div>
        <div className="relative z-10">
          <Link href="/sell" className="flex items-center gap-2 mb-12">
            <Image
              src="/brand-icon.png"
              alt="Emoorm"
              width={36}
              height={36}
              className="rounded-xl"
            />
            <span className="text-white font-bold text-base">Emoorm</span>
          </Link>
          <div className="mb-3">
            <div className="h-8 w-8 rounded-xl bg-white/10 flex items-center justify-center mb-5">
              <Store className="h-4 w-4 text-white" strokeWidth={1.8} />
            </div>
            <h2 className="text-2xl font-bold text-white leading-snug mb-3">
              Start selling to your community
            </h2>
            <p className="text-sm text-white/65 leading-relaxed">
              Join local farmers, fisherfolk, and agri-entrepreneurs already
              earning on Emoorm — no fees, no middlemen.
            </p>
          </div>
          <div className="space-y-3 mt-8">
            {[
              "Free to open a shop",
              "Reach buyers in Oriental Mindoro",
              "Set your own prices and delivery area",
            ].map((b) => (
              <div key={b} className="flex items-center gap-2.5">
                <div className="h-4 w-4 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                  <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />
                </div>
                <span className="text-xs text-white/75">{b}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="relative z-10 text-[11px] text-white/30">
          © Emoorm 2026. All rights reserved.
        </p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 min-h-screen">
        <div className="w-full max-w-[420px]">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center justify-center gap-2 mb-8">
            <Image
              src="/brand-icon.png"
              alt="Emoorm"
              width={32}
              height={32}
              className="rounded-xl"
            />
            <span className="font-bold text-sm text-[#111]">Emoorm</span>
          </div>

          <Link
            href="/sell"
            className="inline-flex items-center gap-1.5 text-xs text-[#888] hover:text-[#111] mb-8 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Sell page
          </Link>

          <div className="mb-7">
            <h1 className="text-2xl font-bold text-[#111] mb-1">
              Create your seller account
            </h1>
            <p className="text-sm text-[#888]">
              You'll set up your shop details in the next step.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>First name</label>
                <input
                  name="firstName"
                  value={form.firstName}
                  onChange={handleChange}
                  placeholder="Juan"
                  className={inputClass}
                  required
                />
              </div>
              <div>
                <label className={labelClass}>Last name</label>
                <input
                  name="lastName"
                  value={form.lastName}
                  onChange={handleChange}
                  placeholder="Dela Cruz"
                  className={inputClass}
                  required
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>Email address</label>
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="you@example.com"
                className={inputClass}
                required
              />
            </div>

            <div>
              <label className={labelClass}>Password</label>
              <div className="relative">
                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Create a strong password"
                  className={inputClass + " pr-11"}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#bbb] hover:text-[#555] transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              <PasswordStrength password={form.password} />
            </div>

            <div>
              <label className={labelClass}>Confirm password</label>
              <div className="relative">
                <input
                  name="confirmPassword"
                  type={showConfirm ? "text" : "password"}
                  value={form.confirmPassword}
                  onChange={handleChange}
                  placeholder="Repeat your password"
                  className={inputClass + " pr-11"}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#bbb] hover:text-[#555] transition-colors"
                >
                  {showConfirm ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                <p className="text-xs text-red-600">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl text-white text-sm font-bold flex items-center justify-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-60 mt-2"
              style={{ background: "#29a366" }}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {loading ? "Creating account…" : "Create Seller Account"}
            </button>
          </form>

          <p className="text-center text-xs text-[#aaa] mt-6">
            Already have an account?{" "}
            <Link
              href="/login?redirect=/seller/register"
              className="text-[#29a366] font-semibold hover:underline"
            >
              Sign in
            </Link>
          </p>
          <p className="text-center text-xs text-[#bbb] mt-3">
            Want to shop instead?{" "}
            <Link
              href="/signup"
              className="text-[#888] hover:text-[#555] underline underline-offset-2"
            >
              Regular sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
