"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  Loader2, Eye, EyeOff, User, Phone, MapPin, Lock, Check, X, Mail, RotateCw,
} from "lucide-react";
import { useUser, useSupabase } from "@/supabase";
import { initiateEmailSignUp, initiateGoogleSignInPopup } from "@/supabase/auth";

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: "8+ characters", pass: password.length >= 8 },
    { label: "Uppercase", pass: /[A-Z]/.test(password) },
    { label: "Lowercase", pass: /[a-z]/.test(password) },
    { label: "Number", pass: /\d/.test(password) },
  ];
  const score = checks.filter((c) => c.pass).length;
  const colors = ["#e0e0e0", "#e53e3e", "#f6ad55", "#ecc94b", "#29a366"];
  if (!password) return null;
  return (
    <div className="mt-2">
      <div className="flex gap-1 mb-1.5">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex-1 h-1 rounded-full transition-all"
            style={{ background: i <= score ? colors[score] : "#e8e8e8" }} />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5">
        {checks.map((c) => (
          <span key={c.label} className={`flex items-center gap-1 text-[10px] font-medium ${c.pass ? "text-[#29a366]" : "text-[#bbb]"}`}>
            {c.pass ? <Check className="h-2.5 w-2.5" strokeWidth={3} /> : <X className="h-2.5 w-2.5" />}
            {c.label}
          </span>
        ))}
      </div>
    </div>
  );
}

const inp = "w-full border border-gray-300 rounded-none px-3.5 py-3 text-sm text-[#111] placeholder:text-gray-400 outline-none focus:border-[#29a366] focus:ring-1 focus:ring-[#29a366]/30 transition-all disabled:opacity-50";
const lbl = "block text-xs font-semibold text-gray-500 mb-1";

export default function SignUpPage() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    firstName: "", lastName: "", email: "", mobile: "",
    province: "", provinceCode: "", city: "", cityCode: "",
    barangay: "", street: "", password: "", confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [provinces, setProvinces] = useState<any[]>([]);
  const [cities, setCities] = useState<any[]>([]);
  const [barangays, setBarangays] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const supabase = useSupabase();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect");

  useEffect(() => {
    if (user && !isUserLoading && !emailSent) {
      router.push(redirect && redirect.startsWith("/") ? redirect : "/profile");
    }
  }, [user, isUserLoading, router, emailSent, redirect]);

  useEffect(() => {
    fetch("https://psgc.gitlab.io/api/provinces.json")
      .then((r) => r.json())
      .then((d) => setProvinces(d.sort((a: any, b: any) => a.name.localeCompare(b.name))))
      .catch(() => { });
  }, []);

  useEffect(() => {
    if (formData.provinceCode) {
      fetch(`https://psgc.gitlab.io/api/provinces/${formData.provinceCode}/municipalities.json`)
        .then((r) => r.json()).then((d) => { setCities(d); setBarangays([]); }).catch(() => { });
    }
  }, [formData.provinceCode]);

  useEffect(() => {
    if (formData.cityCode) {
      fetch(`https://psgc.gitlab.io/api/municipalities/${formData.cityCode}/barangays.json`)
        .then((r) => r.json()).then((d) => setBarangays(d)).catch(() => { });
    }
  }, [formData.cityCode]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === "province") {
      const sel = provinces.find((p) => p.name === value);
      setFormData((p) => ({ ...p, province: value, provinceCode: sel?.code || "", city: "", cityCode: "", barangay: "" }));
    } else if (name === "city") {
      const sel = cities.find((c) => c.name === value);
      setFormData((p) => ({ ...p, city: value, cityCode: sel?.code || "", barangay: "" }));
    } else {
      setFormData((p) => ({ ...p, [name]: value }));
    }
  };

  const nextStep = (from: number) => {
    if (from === 1 && (!formData.firstName.trim() || !formData.lastName.trim() || !formData.email.includes("@"))) {
      setError("Please fill in your name and a valid email."); return;
    }
    if (from === 2 && (!formData.mobile || formData.mobile.length < 10 || !formData.province || !formData.city || !formData.barangay)) {
      setError("Please complete your contact and address details."); return;
    }
    setError(""); setStep((p) => p + 1); window.scrollTo(0, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) { setError("Passwords do not match."); return; }
    if (formData.password.length < 8) { setError("Password must be at least 8 characters."); return; }
    setError(""); setLoading(true);
    try {
      const result = await initiateEmailSignUp(supabase, formData.email, formData.password);
      localStorage.setItem("pendingProfile", JSON.stringify({
        firstName: formData.firstName, lastName: formData.lastName,
        email: formData.email, mobile: formData.mobile,
        province: formData.province, city: formData.city,
        barangay: formData.barangay, street: formData.street,
      }));
      if (result.needsConfirmation) { setEmailSent(true); return; }
      if (result.user) {
        await supabase.from("users").upsert({
          id: result.user.id,
          name: `${formData.firstName} ${formData.lastName}`.trim(),
          firstName: formData.firstName, lastName: formData.lastName,
          email: formData.email, mobile: formData.mobile || "",
          province: formData.province || "", city: formData.city || "",
          barangay: formData.barangay || "", street: formData.street || "",
          role: "buyer", createdAt: new Date().toISOString(),
        }, { onConflict: "id" });
        localStorage.removeItem("pendingProfile");
      }
    } catch (err: any) {
      const msg: string = err?.message || "";
      if (err instanceof TypeError || msg.toLowerCase().includes("failed to fetch"))
        setError("Unable to connect. Check your internet connection.");
      else if (msg.includes("already registered"))
        setError("This email is already registered. Try signing in instead.");
      else setError(msg || "Something went wrong. Please try again.");
    } finally { setLoading(false); }
  };

  const handleResend = async () => {
    setResending(true);
    try { await initiateEmailSignUp(supabase, formData.email, formData.password); } catch { }
    finally { setResending(false); }
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

  const stepLabels = ["Account", "Address", "Password"];

  return (
    <div className="min-h-screen flex flex-col">

      {/* ── Header bar ── */}
      <div className="bg-white border-b border-gray-200 shrink-0 z-10">
        <div className="max-w-[1280px] mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center" style={{ gap: 3 }}>
              <Image src="/brand-icon.png" alt="Emoorm" width={36} height={36} style={{ objectFit: "contain" }} />
              <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: "1.6rem", letterSpacing: "-0.04em" }}>emoorm</span>
            </Link>
            <span className="text-gray-300 text-lg select-none">|</span>
            <span className="text-lg font-normal text-[#555]">Sign Up</span>
          </div>
          <Link href="/customer-care" className="text-sm text-[#29a366] hover:underline font-medium">Need Help?</Link>
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

        {/* ── Left: brand hero (hidden on mobile) ── */}
        <div
          className="hidden md:flex relative z-10 flex-1 items-center justify-center px-10 py-12"
        >
          <div className="relative z-10 w-full max-w-[520px] text-white">
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
              Join the
              <br />
              <span
                style={{
                  background: "linear-gradient(120deg, #7dffb8 0%, #ffffff 65%, #d9ffe8 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                Mindoro
              </span>
              <br />
              marketplace.
            </h2>

            {/* Stat chip strip */}
            <div className="flex items-center gap-6">
              <div>
                <p className="text-4xl font-black leading-none tracking-tight" style={{ letterSpacing: "-0.04em" }}>Free</p>
                <p className="text-[11px] uppercase tracking-[0.14em] text-white/60 mt-1.5">To sign up</p>
              </div>
              <div className="h-10 w-px bg-white/15" />
              <div>
                <p className="text-4xl font-black leading-none tracking-tight" style={{ letterSpacing: "-0.04em", color: "#7dffb8" }}>Verified</p>
                <p className="text-[11px] uppercase tracking-[0.14em] text-white/60 mt-1.5">Local sellers</p>
              </div>
              <div className="h-10 w-px bg-white/15" />
              <div>
                <p className="text-4xl font-black leading-none tracking-tight" style={{ letterSpacing: "-0.04em" }}>15</p>
                <p className="text-[11px] uppercase tracking-[0.14em] text-white/60 mt-1.5">Municipalities</p>
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
            emoorm
          </span>
        </div>

        {/* ── Right: form card (same green bg) ── */}
        <div
          className="relative z-10 flex-1 flex items-center justify-center px-4 sm:px-8 py-10"
        >
          <div className="w-full max-w-[430px] bg-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.25)] border border-black/[0.04] px-7 py-8 sm:px-8 sm:py-9">

            {/* Email confirmed screen */}
            {emailSent ? (
              <div className="text-center py-4">
                <div className="h-14 w-14 rounded-full bg-[#29a366]/10 flex items-center justify-center mx-auto mb-4">
                  <Mail className="h-7 w-7 text-[#29a366]" />
                </div>
                <h2 className="text-lg font-semibold text-[#111] mb-2">Check your email</h2>
                <p className="text-sm text-gray-500 mb-1">We sent a confirmation link to</p>
                <p className="text-sm font-bold text-[#111] mb-5">{formData.email}</p>
                <p className="text-xs text-gray-400 mb-6">Click the link to verify your account, then sign in.</p>
                <button onClick={handleResend} disabled={resending}
                  className="w-full border border-gray-200 text-gray-700 font-semibold py-2.5 rounded-none text-sm flex items-center justify-center gap-2 mb-4 hover:bg-gray-50 transition-colors disabled:opacity-50">
                  {resending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCw className="h-4 w-4" />}
                  {resending ? "Resending..." : "Resend email"}
                </button>
                <Link href="/login" className="text-sm text-[#29a366] font-semibold hover:underline">Go to Sign In</Link>
              </div>
            ) : (
              <>
                {/* Card title + step dots */}
                <div className="flex items-center justify-between mb-1">
                  <h1 className="text-2xl font-bold text-[#111]" style={{ letterSpacing: "-0.02em" }}>Create account</h1>
                  <div className="flex items-center gap-1.5">
                    {stepLabels.map((_, i) => (
                      <div key={i} className={`h-2 rounded-full transition-all ${step === i + 1 ? "w-6 bg-[#29a366]" : step > i + 1 ? "w-2 bg-[#29a366]/50" : "w-2 bg-gray-200"}`} />
                    ))}
                  </div>
                </div>

                {/* Step label */}
                <p className="text-xs text-gray-500 mb-5">
                  Step {step} of {stepLabels.length} — <span className="font-semibold text-[#111]">{stepLabels[step - 1]}</span>
                </p>

                {/* Error */}
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-none px-3 py-2.5 mb-4 text-sm text-red-600">{error}</div>
                )}

                <form onSubmit={handleSubmit} className="space-y-3">

                  {/* ── Step 1: Account ── */}
                  {step === 1 && (
                    <>
                      <div className="grid grid-cols-2 gap-2.5">
                        <div>
                          <label className={lbl}>First name</label>
                          <input type="text" name="firstName" value={formData.firstName} onChange={handleChange}
                            placeholder="Juan" autoComplete="given-name" className={inp} />
                        </div>
                        <div>
                          <label className={lbl}>Last name</label>
                          <input type="text" name="lastName" value={formData.lastName} onChange={handleChange}
                            placeholder="Dela Cruz" autoComplete="family-name" className={inp} />
                        </div>
                      </div>
                      <div>
                        <label className={lbl}>Email address</label>
                        <input type="email" name="email" value={formData.email} onChange={handleChange}
                          placeholder="juan@example.com" autoComplete="email" className={inp} />
                      </div>
                      <button type="button" onClick={() => nextStep(1)}
                        className="w-full py-3 rounded-none text-white font-bold text-sm uppercase tracking-wide mt-1 transition-all"
                        style={{ background: "#29a366" }}>
                        Continue
                      </button>

                      {/* Divider */}
                      <div className="flex items-center gap-3 my-4">
                        <div className="flex-1 h-px bg-gray-200" />
                        <span className="text-[11px] text-gray-400 font-medium uppercase tracking-wider">Or continue with</span>
                        <div className="flex-1 h-px bg-gray-200" />
                      </div>

                      {/* Google */}
                      <button type="button" onClick={handleGoogle} disabled={googleLoading}
                        className="w-full py-2.5 rounded-none border border-gray-200 text-sm font-semibold text-[#333] flex items-center justify-center gap-2.5 hover:bg-gray-50 transition-colors disabled:opacity-60">
                        {googleLoading ? <Loader2 className="h-4 w-4 animate-spin text-gray-400" /> : (
                          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4" />
                            <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853" />
                            <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05" />
                            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335" />
                          </svg>
                        )}
                        Continue with Google
                      </button>
                    </>
                  )}

                  {/* ── Step 2: Address ── */}
                  {step === 2 && (
                    <>
                      <div>
                        <label className={lbl}>Mobile number</label>
                        <div className="flex items-center border border-gray-300 rounded-none focus-within:border-[#29a366] focus-within:ring-1 focus-within:ring-[#29a366]/30 transition-all bg-white">
                          <span className="pl-3 pr-1 text-sm font-semibold text-gray-400 select-none whitespace-nowrap">+63</span>
                          <input type="tel" name="mobile" value={formData.mobile}
                            onChange={(e) => { const v = e.target.value.replace(/\D/g, "").slice(0, 10); setFormData((p) => ({ ...p, mobile: v })); }}
                            placeholder="9123456789" maxLength={10}
                            className="flex-1 bg-transparent border-none py-3 pr-3 text-sm text-[#111] outline-none placeholder:text-gray-400" />
                        </div>
                      </div>
                      <div>
                        <label className={lbl}>Province</label>
                        <select name="province" value={formData.province} onChange={handleChange}
                          className={inp + " appearance-none cursor-pointer"}>
                          <option value="" disabled>Select province</option>
                          {provinces.map((p) => <option key={p.code} value={p.name}>{p.name}</option>)}
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-2.5">
                        <div>
                          <label className={lbl}>City / Municipality</label>
                          <select name="city" value={formData.city} onChange={handleChange} disabled={!formData.provinceCode}
                            className={inp + " appearance-none cursor-pointer disabled:opacity-40"}>
                            <option value="" disabled>Select city</option>
                            {cities.map((c) => <option key={c.code} value={c.name}>{c.name}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className={lbl}>Barangay</label>
                          <select name="barangay" value={formData.barangay} onChange={handleChange} disabled={!formData.cityCode}
                            className={inp + " appearance-none cursor-pointer disabled:opacity-40"}>
                            <option value="" disabled>Select barangay</option>
                            {barangays.map((b) => <option key={b.name} value={b.name}>{b.name}</option>)}
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className={lbl}>Street / House No. <span className="text-gray-300 font-normal">(optional)</span></label>
                        <input type="text" name="street" value={formData.street} onChange={handleChange}
                          placeholder="123 Rizal St." className={inp} />
                      </div>
                      <div className="flex gap-2.5">
                        <button type="button" onClick={() => { setError(""); setStep((p) => p - 1); }}
                          className="flex-1 py-3 rounded-none border border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50 transition-colors">
                          Back
                        </button>
                        <button type="button" onClick={() => nextStep(2)}
                          className="flex-1 py-3 rounded-none text-white font-bold text-sm uppercase tracking-wide transition-all"
                          style={{ background: "#29a366" }}>
                          Continue
                        </button>
                      </div>
                    </>
                  )}

                  {/* ── Step 3: Password ── */}
                  {step === 3 && (
                    <>
                      <div>
                        <label className={lbl}>Password</label>
                        <div className="relative">
                          <input type={showPassword ? "text" : "password"} name="password" value={formData.password}
                            onChange={handleChange} placeholder="At least 8 characters" disabled={loading}
                            autoComplete="new-password" className={inp + " pr-10"} />
                          <button type="button" tabIndex={-1} onClick={() => setShowPassword((v) => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                        <PasswordStrength password={formData.password} />
                      </div>
                      <div>
                        <label className={lbl}>Confirm password</label>
                        <div className="relative">
                          <input type={showConfirm ? "text" : "password"} name="confirmPassword" value={formData.confirmPassword}
                            onChange={handleChange} placeholder="••••••••" disabled={loading}
                            autoComplete="new-password" className={inp + " pr-10"} />
                          <button type="button" tabIndex={-1} onClick={() => setShowConfirm((v) => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                            {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                        {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                          <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-400 leading-relaxed">
                        By creating an account you agree to our{" "}
                        <Link href="/terms" className="text-[#29a366] hover:underline">Terms of Service</Link>
                        {" "}&amp;{" "}
                        <Link href="/privacy" className="text-[#29a366] hover:underline">Privacy Policy</Link>.
                      </p>
                      <div className="flex gap-2.5">
                        <button type="button" onClick={() => { setError(""); setStep((p) => p - 1); }} disabled={loading}
                          className="flex-1 py-3 rounded-none border border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50 transition-colors disabled:opacity-50">
                          Back
                        </button>
                        <button type="submit" disabled={loading}
                          className="flex-1 py-3 rounded-none text-white font-bold text-sm uppercase tracking-wide flex items-center justify-center gap-2 disabled:opacity-60 transition-all"
                          style={{ background: "#29a366" }}>
                          {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating...</> : "SIGN UP"}
                        </button>
                      </div>
                    </>
                  )}
                </form>

                {/* Already have account */}
                <p className="text-sm text-gray-500 text-center mt-5">
                  Already have an account?{" "}
                  <Link
                    href={redirect ? `/login?redirect=${encodeURIComponent(redirect)}` : "/login"}
                    className="text-[#29a366] font-semibold hover:underline"
                  >
                    Log in
                  </Link>
                </p>
              </>
            )}
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
