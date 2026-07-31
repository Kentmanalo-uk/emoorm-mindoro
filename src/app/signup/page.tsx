"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  Loader2, Eye, EyeOff, User, Phone, MapPin, Lock, Check, X, Mail, RotateCw,
} from "lucide-react";
import { useUser, useSupabase } from "@/supabase";
import { initiateEmailSignUp } from "@/supabase/auth";

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

const inp = "w-full border border-gray-300 rounded px-3.5 py-3 text-sm text-[#111] placeholder:text-gray-400 outline-none focus:border-[#29a366] focus:ring-1 focus:ring-[#29a366]/30 transition-all disabled:opacity-50";
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

  const supabase = useSupabase();
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (user && !isUserLoading && !emailSent) router.push("/profile");
  }, [user, isUserLoading, router, emailSent]);

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

  if (isUserLoading) return null;

  const stepLabels = ["Account", "Address", "Password"];

  return (
    <div className="min-h-screen flex flex-col">

      {/* ── Header bar ── */}
      <div className="bg-white border-b border-gray-200 shrink-0 z-10">
        <div className="max-w-[1280px] mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <Image src="/brand-icon.png" alt="Emoorm" width={30} height={30} className="object-contain" />
              <span className="text-xl font-semibold text-[#29a366]" style={{ fontFamily: "Inter, sans-serif" }}>Emoorm</span>
            </Link>
            <span className="text-gray-300 text-lg select-none">|</span>
            <span className="text-lg font-normal text-[#555]">Sign Up</span>
          </div>
          <Link href="/customer-care" className="text-sm text-[#29a366] hover:underline font-medium">Need Help?</Link>
        </div>
      </div>

      {/* ── Full-width background + floating card ── */}
      <div className="flex-1 relative flex items-center justify-end overflow-hidden"
        style={{ background: "linear-gradient(135deg, #1a6b40 0%, #29a366 45%, #4dbb7a 100%)", minHeight: "calc(100vh - 56px)" }}>

        {/* Background texture */}
        <div className="absolute inset-0 opacity-[0.06] pointer-events-none">
          <Image src="/assets/fruits.jpg" alt="" fill className="object-cover" unoptimized />
        </div>

        {/* Glow circles */}
        <div className="absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(255,255,255,0.12) 0%, transparent 70%)" }} />
        <div className="absolute bottom-0 left-1/4 h-96 w-96 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)" }} />

        {/* Left brand content */}
        <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-center pl-16 pr-8 pointer-events-none select-none" style={{ width: "52%" }}>
          <div className="flex items-center gap-4">
            <Image src="/brand-icon.png" alt="Emoorm" width={80} height={80} className="object-contain drop-shadow-xl brightness-0 invert" />
            <span className="text-5xl font-bold text-white drop-shadow-lg" style={{ fontFamily: "Inter, sans-serif" }}>Emoorm</span>
          </div>
        </div>

        {/* ── Floating card ── */}
        <div className="relative z-10 w-full max-w-[420px] mr-24 my-8">
          <div className="bg-white shadow-2xl px-8 py-8">

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
                  className="w-full border border-gray-200 text-gray-700 font-semibold py-2.5 rounded text-sm flex items-center justify-center gap-2 mb-4 hover:bg-gray-50 transition-colors disabled:opacity-50">
                  {resending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCw className="h-4 w-4" />}
                  {resending ? "Resending..." : "Resend email"}
                </button>
                <Link href="/login" className="text-sm text-[#29a366] font-semibold hover:underline">Go to Sign In</Link>
              </div>
            ) : (
              <>
                {/* Card title + step dots */}
                <div className="flex items-center justify-between mb-5">
                  <h1 className="text-xl font-semibold text-[#333]">Sign Up</h1>
                  <div className="flex items-center gap-1.5">
                    {stepLabels.map((_, i) => (
                      <div key={i} className={`h-2 rounded-full transition-all ${step === i + 1 ? "w-6 bg-[#29a366]" : step > i + 1 ? "w-2 bg-[#29a366]/50" : "w-2 bg-gray-200"}`} />
                    ))}
                  </div>
                </div>

                {/* Step label */}
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-4">
                  Step {step} of {stepLabels.length} — {stepLabels[step - 1]}
                </p>

                {/* Error */}
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded px-3 py-2.5 mb-4 text-sm text-red-600">{error}</div>
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
                        className="w-full py-3 rounded text-white font-bold text-sm uppercase tracking-wide mt-1 transition-all"
                        style={{ background: "#29a366" }}>
                        Continue
                      </button>
                    </>
                  )}

                  {/* ── Step 2: Address ── */}
                  {step === 2 && (
                    <>
                      <div>
                        <label className={lbl}>Mobile number</label>
                        <div className="flex items-center border border-gray-300 rounded focus-within:border-[#29a366] focus-within:ring-1 focus-within:ring-[#29a366]/30 transition-all bg-white">
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
                          className="flex-1 py-3 rounded border border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50 transition-colors">
                          Back
                        </button>
                        <button type="button" onClick={() => nextStep(2)}
                          className="flex-1 py-3 rounded text-white font-bold text-sm uppercase tracking-wide transition-all"
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
                          className="flex-1 py-3 rounded border border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50 transition-colors disabled:opacity-50">
                          Back
                        </button>
                        <button type="submit" disabled={loading}
                          className="flex-1 py-3 rounded text-white font-bold text-sm uppercase tracking-wide flex items-center justify-center gap-2 disabled:opacity-60 transition-all"
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
                  <Link href="/login" className="text-[#29a366] font-bold hover:underline">Log in</Link>
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
