"use client";

import React, { useState, useEffect, useMemo } from "react";
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
  ShieldCheck,
  User,
  Phone,
  MapPin,
  Lock,
  Check,
  X,
} from "lucide-react";
import { useUser, useSupabase } from "@/supabase";
import { initiateEmailSignUp } from "@/supabase/auth";

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: "At least 8 characters", pass: password.length >= 8 },
    { label: " letter", pass: /[A-Z]/.test(password) },
    { label: "Lowercase letter", pass: /[a-z]/.test(password) },
    { label: "Number", pass: /\d/.test(password) },
    { label: "Special character", pass: /[^A-Za-z0-9]/.test(password) },
  ];
  const score = checks.filter((c) => c.pass).length;
  const colors = [
    "#e0e0e0",
    "#e53e3e",
    "#f6ad55",
    "#ecc94b",
    "#68d391",
    "#29a366",
  ];
  const labels = ["", "Very weak", "Weak", "Fair", "Good", "Strong"];

  if (!password) return null;
  return (
    <div className="mt-2 space-y-2">
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
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
const iconInputClass =
  "w-full bg-white border border-[#e0e0e0] rounded-xl pl-11 pr-4 py-3.5 text-sm text-[#111] placeholder:text-[#bbb] outline-none focus:border-[#29a366] focus:ring-2 focus:ring-[#29a366]/15 transition-all disabled:opacity-50";
const labelClass = "block text-xs font-semibold text-[#555] mb-1.5 ml-1";

export default function SignUpPage() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    mobile: "",
    province: "",
    provinceCode: "",
    city: "",
    cityCode: "",
    barangay: "",
    street: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [provinces, setProvinces] = useState<any[]>([]);
  const [cities, setCities] = useState<any[]>([]);
  const [barangays, setBarangays] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [showEmailConfirm, setShowEmailConfirm] = useState(false);

  const supabase = useSupabase();
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (user && !isUserLoading && !showEmailConfirm) router.push("/profile");
  }, [user, isUserLoading, router, showEmailConfirm]);

  useEffect(() => {
    fetch("https://psgc.gitlab.io/api/provinces.json")
      .then((r) => r.json())
      .then((d) =>
        setProvinces(d.sort((a: any, b: any) => a.name.localeCompare(b.name))),
      )
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (formData.provinceCode) {
      fetch(
        `https://psgc.gitlab.io/api/provinces/${formData.provinceCode}/municipalities.json`,
      )
        .then((r) => r.json())
        .then((d) => {
          setCities(d);
          setBarangays([]);
        })
        .catch(() => {});
    }
  }, [formData.provinceCode]);

  useEffect(() => {
    if (formData.cityCode) {
      fetch(
        `https://psgc.gitlab.io/api/municipalities/${formData.cityCode}/barangays.json`,
      )
        .then((r) => r.json())
        .then((d) => setBarangays(d))
        .catch(() => {});
    }
  }, [formData.cityCode]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    if (name === "province") {
      const sel = provinces.find((p) => p.name === value);
      setFormData((prev) => ({
        ...prev,
        province: value,
        provinceCode: sel?.code || "",
        city: "",
        cityCode: "",
        barangay: "",
      }));
    } else if (name === "city") {
      const sel = cities.find((c) => c.name === value);
      setFormData((prev) => ({
        ...prev,
        city: value,
        cityCode: sel?.code || "",
        barangay: "",
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const nextStep = (from: number) => {
    if (
      from === 1 &&
      (!formData.firstName.trim() ||
        !formData.lastName.trim() ||
        !formData.email.includes("@"))
    ) {
      setError("Please fill in your name and a valid email.");
      return;
    }
    if (
      from === 2 &&
      (!formData.mobile ||
        formData.mobile.length < 10 ||
        !formData.province ||
        !formData.city ||
        !formData.barangay)
    ) {
      setError("Please complete your contact and address details.");
      return;
    }
    setError("");
    setStep((p) => p + 1);
    window.scrollTo(0, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const result = await initiateEmailSignUp(
        supabase,
        formData.email,
        formData.password,
      );
      localStorage.setItem(
        "pendingProfile",
        JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          mobile: formData.mobile,
          province: formData.province,
          city: formData.city,
          barangay: formData.barangay,
          street: formData.street,
        }),
      );
      if (result.needsConfirmation) {
        router.push("/confirm-email");
        return;
      }
      if (result.user) {
        await supabase.from("users").upsert(
          {
            id: result.user.id,
            name: `${formData.firstName} ${formData.lastName}`.trim(),
            firstName: formData.firstName,
            lastName: formData.lastName,
            email: formData.email,
            mobile: formData.mobile || "",
            province: formData.province || "",
            city: formData.city || "",
            barangay: formData.barangay || "",
            street: formData.street || "",
            role: "buyer",
            createdAt: new Date().toISOString(),
          },
          { onConflict: "id" },
        );
        localStorage.removeItem("pendingProfile");
      }
    } catch (err: any) {
      const msg: string = err?.message || "";
      if (
        err instanceof TypeError ||
        msg.toLowerCase().includes("failed to fetch") ||
        msg.toLowerCase().includes("networkerror")
      ) {
        setError(
          "Unable to connect. Please check your internet connection and try again.",
        );
      } else if (msg.includes("already registered")) {
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
      await initiateEmailSignUp(supabase, formData.email, formData.password);
    } catch {
    } finally {
      setResending(false);
    }
  };

  if (isUserLoading) return null;

  // Email confirm screen
  if (showEmailConfirm)
    return (
      <div
        className="min-h-screen flex items-center justify-center p-6"
        style={{ backgroundColor: "#f2f2f0" }}
      >
        <div className="bg-white rounded-2xl p-10 w-full max-w-[420px] shadow-sm border border-[#eee] text-center">
          <div className="w-16 h-16 rounded-full bg-[#29a366]/10 flex items-center justify-center mx-auto mb-5">
            <Mail className="h-8 w-8 text-[#29a366]" />
          </div>
          <h2 className="text-xl font-semibold text-[#111] mb-2">
            Check your email
          </h2>
          <p className="text-sm text-[#777] mb-1">
            We sent a confirmation link to
          </p>
          <p className="text-sm font-bold text-[#111] mb-5">{formData.email}</p>
          <p className="text-xs text-[#aaa] mb-7">
            Click the link in the email to verify your account, then come back
            to sign in.
          </p>
          <button
            onClick={handleResend}
            disabled={resending}
            className="w-full bg-[#f4f4f2] text-[#111] font-semibold py-3.5 rounded-xl text-sm flex items-center justify-center gap-2 mb-4 disabled:opacity-60 transition-colors hover:bg-[#ebebeb]"
          >
            {resending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RotateCw className="h-4 w-4" />
            )}
            {resending ? "Resending..." : "Resend confirmation email"}
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

  const stepLabels = ["Personal", "Address", "Security"];

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: "#f2f2f0" }}>
      {/* Left panel */}
      <div
        className="hidden lg:flex flex-col justify-between w-[440px] shrink-0 relative overflow-hidden"
        style={{
          background: "linear-gradient(160deg, #1a6b40 0%, #29a366 100%)",
        }}
      >
        <div className="absolute inset-0 opacity-10">
          <Image
            src="/assets/fruits.jpg"
            alt=""
            fill
            className="object-cover"
          />
        </div>
        <div className="relative z-10 p-10">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/brand-icon.png"
              alt="Emoorm"
              width={40}
              height={40}
              style={{ objectFit: "contain" }}
            />
            <span
              className="text-2xl font-normal text-white"
              style={{ fontFamily: "Inter, sans-serif" }}
            >
              Emoorm
            </span>
          </Link>
        </div>
        <div className="relative z-10 p-10 space-y-4">
          {[
            "Support local farmers and producers",
            "Get farm-fresh products delivered",
            "Secure & verified transactions",
          ].map((t) => (
            <div
              key={t}
              className="flex items-center gap-3 text-white/80 text-sm"
            >
              <div className="h-5 w-5 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                <Check className="h-3 w-3 text-white" />
              </div>
              {t}
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 overflow-y-auto">
        {/* Mobile brand */}
        <Link href="/" className="flex items-center gap-2 mb-6 lg:hidden">
          <Image
            src="/brand-icon.png"
            alt="Emoorm"
            width={32}
            height={32}
            style={{ objectFit: "contain" }}
          />
          <span
            className="text-xl font-normal text-[#1a6b40]"
            style={{ fontFamily: "Inter, sans-serif" }}
          >
            Emoorm
          </span>
        </Link>

        <div className="w-full max-w-[480px]">
          <div className="mb-6">
            <h1
              className="text-2xl font-semibold text-[#111] mb-1"
              style={{ fontFamily: "Inter, sans-serif" }}
            >
              Create your account
            </h1>
            <p className="text-sm text-[#777]">
              Join the local marketplace of Oriental Mindoro
            </p>
          </div>

          {/* Step progress */}
          <div className="flex items-center gap-0 mb-8">
            {stepLabels.map((label, i) => {
              const num = i + 1;
              const done = step > num;
              const active = step === num;
              return (
                <React.Fragment key={label}>
                  <div className="flex flex-col items-center gap-1">
                    <div
                      className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                        done
                          ? "bg-[#29a366] text-white"
                          : active
                            ? "bg-[#1a6b40] text-white"
                            : "bg-[#e8e8e8] text-[#aaa]"
                      }`}
                    >
                      {done ? <Check className="h-4 w-4" /> : num}
                    </div>
                    <span
                      className={`text-[10px] font-medium ${active ? "text-[#1a6b40]" : done ? "text-[#29a366]" : "text-[#bbb]"}`}
                    >
                      {label}
                    </span>
                  </div>
                  {i < 2 && (
                    <div
                      className={`flex-1 h-px mx-2 mb-4 transition-all ${done ? "bg-[#29a366]" : "bg-[#e8e8e8]"}`}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {error && (
            <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4 mb-5">
              <div className="h-4 w-4 rounded-full bg-red-500 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-white text-[9px] font-bold">!</span>
              </div>
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Step 1 — Personal */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>First name</label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#aaa]" />
                      <input
                        type="text"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleChange}
                        placeholder="Juan"
                        autoComplete="given-name"
                        className={iconInputClass}
                      />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Last name</label>
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      placeholder="Dela Cruz"
                      autoComplete="family-name"
                      className={inputClass}
                    />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Email address</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#aaa]" />
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="juan@example.com"
                      autoComplete="email"
                      className={iconInputClass}
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => nextStep(1)}
                  className="w-full text-white font-semibold py-3.5 rounded-xl text-sm transition-all mt-2"
                  style={{ background: "#29a366" }}
                >
                  Continue
                </button>
              </div>
            )}

            {/* Step 2 — Address */}
            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <label className={labelClass}>Mobile number</label>
                  <div className="flex items-center bg-white border border-[#e0e0e0] rounded-xl focus-within:border-[#29a366] focus-within:ring-2 focus-within:ring-[#29a366]/15 transition-all">
                    <Phone className="h-4 w-4 text-[#aaa] ml-4 shrink-0" />
                    <span className="pl-2 pr-1 text-sm font-bold text-[#777] select-none">
                      +63
                    </span>
                    <input
                      type="tel"
                      name="mobile"
                      value={formData.mobile}
                      onChange={(e) => {
                        const v = e.target.value
                          .replace(/\D/g, "")
                          .slice(0, 10);
                        setFormData((p) => ({ ...p, mobile: v }));
                      }}
                      placeholder="9123456789"
                      maxLength={10}
                      autoComplete="tel"
                      className="flex-1 bg-transparent border-none py-3.5 pr-4 text-sm text-[#111] outline-none placeholder:text-[#bbb]"
                    />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Province</label>
                  <div className="relative">
                    <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#aaa] pointer-events-none" />
                    <select
                      name="province"
                      value={formData.province}
                      onChange={handleChange}
                      className="w-full bg-white border border-[#e0e0e0] rounded-xl pl-10 pr-4 py-3.5 text-sm text-[#111] outline-none appearance-none cursor-pointer focus:border-[#29a366] focus:ring-2 focus:ring-[#29a366]/15 transition-all"
                    >
                      <option value="" disabled>
                        Select province
                      </option>
                      {provinces.map((p) => (
                        <option key={p.code} value={p.name}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>City / Municipality</label>
                    <select
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      disabled={!formData.provinceCode}
                      className="w-full bg-white border border-[#e0e0e0] rounded-xl px-4 py-3.5 text-sm text-[#111] outline-none appearance-none cursor-pointer focus:border-[#29a366] focus:ring-2 focus:ring-[#29a366]/15 transition-all disabled:opacity-50"
                    >
                      <option value="" disabled>
                        Select city
                      </option>
                      {cities.map((c) => (
                        <option key={c.code} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Barangay</label>
                    <select
                      name="barangay"
                      value={formData.barangay}
                      onChange={handleChange}
                      disabled={!formData.cityCode}
                      className="w-full bg-white border border-[#e0e0e0] rounded-xl px-4 py-3.5 text-sm text-[#111] outline-none appearance-none cursor-pointer focus:border-[#29a366] focus:ring-2 focus:ring-[#29a366]/15 transition-all disabled:opacity-50"
                    >
                      <option value="" disabled>
                        Select barangay
                      </option>
                      {barangays.map((b) => (
                        <option key={b.name} value={b.name}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className={labelClass}>
                    Street / House No.{" "}
                    <span className="text-[#bbb] font-normal">(optional)</span>
                  </label>
                  <input
                    type="text"
                    name="street"
                    value={formData.street}
                    onChange={handleChange}
                    placeholder="123 Rizal St."
                    autoComplete="street-address"
                    className={inputClass}
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setError("");
                      setStep((p) => p - 1);
                    }}
                    className="flex-1 bg-[#f0f0ee] text-[#555] font-semibold py-3.5 rounded-xl text-sm hover:bg-[#e8e8e6] transition-colors"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => nextStep(2)}
                    className="flex-1 text-white font-semibold py-3.5 rounded-xl text-sm transition-all"
                    style={{ background: "#29a366" }}
                  >
                    Continue
                  </button>
                </div>
              </div>
            )}

            {/* Step 3 — Security */}
            {step === 3 && (
              <div className="space-y-4">
                <div>
                  <label className={labelClass}>Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#aaa]" />
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="••••••••"
                      disabled={loading}
                      autoComplete="new-password"
                      className="w-full bg-white border border-[#e0e0e0] rounded-xl pl-11 pr-12 py-3.5 text-sm text-[#111] placeholder:text-[#bbb] outline-none focus:border-[#29a366] focus:ring-2 focus:ring-[#29a366]/15 transition-all disabled:opacity-50"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      tabIndex={-1}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-[#aaa] hover:text-[#555] transition-colors"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  <PasswordStrength password={formData.password} />
                </div>
                <div>
                  <label className={labelClass}>Confirm password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#aaa]" />
                    <input
                      type={showConfirm ? "text" : "password"}
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      placeholder="••••••••"
                      disabled={loading}
                      autoComplete="new-password"
                      className="w-full bg-white border border-[#e0e0e0] rounded-xl pl-11 pr-12 py-3.5 text-sm text-[#111] placeholder:text-[#bbb] outline-none focus:border-[#29a366] focus:ring-2 focus:ring-[#29a366]/15 transition-all disabled:opacity-50"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm((v) => !v)}
                      tabIndex={-1}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-[#aaa] hover:text-[#555] transition-colors"
                    >
                      {showConfirm ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {formData.confirmPassword &&
                    formData.password !== formData.confirmPassword && (
                      <p className="text-xs text-red-500 mt-1.5 ml-1">
                        Passwords do not match
                      </p>
                    )}
                </div>
                <p className="text-xs text-[#aaa] leading-relaxed">
                  By creating an account you agree to our{" "}
                  <Link
                    href="/terms"
                    className="text-[#29a366] hover:underline"
                  >
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link
                    href="/privacy"
                    className="text-[#29a366] hover:underline"
                  >
                    Privacy Policy
                  </Link>
                  .
                </p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setError("");
                      setStep((p) => p - 1);
                    }}
                    disabled={loading}
                    className="flex-1 bg-[#f0f0ee] text-[#555] font-semibold py-3.5 rounded-xl text-sm hover:bg-[#e8e8e6] transition-colors disabled:opacity-50"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 text-white font-semibold py-3.5 rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-70 transition-all"
                    style={{ background: "#29a366" }}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Creating...
                      </>
                    ) : (
                      "Create Account"
                    )}
                  </button>
                </div>
              </div>
            )}
          </form>

          <p className="text-center text-sm text-[#777] mt-6">
            Already a member?{" "}
            <Link
              href="/login"
              className="text-[#29a366] font-semibold hover:underline"
            >
              Sign in
            </Link>
          </p>

          <div className="flex items-center justify-center gap-1.5 mt-6 text-xs text-[#bbb]">
            <ShieldCheck className="h-3.5 w-3.5" />
            Protected by 256-bit SSL encryption
          </div>

          <Link
            href="/"
            className="flex items-center justify-center gap-1.5 text-xs text-[#bbb] hover:text-[#555] transition-colors mt-3"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
