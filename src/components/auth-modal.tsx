"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  X,
  Loader2,
  Check,
  ArrowRight,
  Phone,
  ChevronLeft,
} from "lucide-react";
import { useUser, useSupabase } from "@/supabase";
import {
  initiateEmailSignIn,
  initiateEmailSignUp,
  initiatePhoneOtp,
  verifyPhoneOtp,
  initiateGoogleSignIn,
} from "@/supabase/auth";

/* ─── shared input styles (homepage-matched) ──────────────────────────── */
const inp = [
  "w-full bg-[#f7f7f5] border border-black/[0.08] rounded-lg",
  "pl-10 pr-4 py-3 text-sm text-[#111] placeholder:text-[#aaa]",
  "outline-none focus:border-[#29a366] focus:ring-2 focus:ring-[#29a366]/10",
  "transition-all disabled:opacity-50",
].join(" ");

const inpBase = [
  "w-full bg-[#f7f7f5] border border-black/[0.08] rounded-lg",
  "px-4 py-3 text-sm text-[#111] placeholder:text-[#aaa]",
  "outline-none focus:border-[#29a366] focus:ring-2 focus:ring-[#29a366]/10",
  "transition-all disabled:opacity-50",
].join(" ");

const btnPrimary = [
  "w-full h-11 rounded-lg text-white font-semibold text-sm",
  "flex items-center justify-center gap-2 transition-opacity disabled:opacity-60",
].join(" ");

const btnGradient: React.CSSProperties = {
  background: "#29a366",
};

/* ─── password strength ───────────────────────────────────────────────── */
function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: "8+ chars", pass: password.length >= 8 },
    { label: "", pass: /[A-Z]/.test(password) },
    { label: "Lowercase", pass: /[a-z]/.test(password) },
    { label: "Number", pass: /\d/.test(password) },
    { label: "Symbol", pass: /[^A-Za-z0-9]/.test(password) },
  ];
  const score = checks.filter((c) => c.pass).length;
  const bar = [
    "#e8e8e8",
    "#e53e3e",
    "#f6ad55",
    "#ecc94b",
    "#68d391",
    "#29a366",
  ];
  if (!password) return null;
  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="flex-1 h-1 rounded-full transition-all"
            style={{ background: i <= score ? bar[score] : "#e8e8e8" }}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5">
        {checks.map((c) => (
          <span
            key={c.label}
            className={`flex items-center gap-1 text-[10px] font-medium ${c.pass ? "text-[#29a366]" : "text-[#bbb]"}`}
          >
            <Check className="h-2.5 w-2.5" strokeWidth={3} /> {c.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ─── label helper ────────────────────────────────────────────────────── */
function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold text-[#666] mb-1.5 ">{children}</p>
  );
}

/* ─── error box ───────────────────────────────────────────────────────── */
function ErrBox({ msg }: { msg: string }) {
  if (!msg) return null;
  return (
    <div className="bg-red-50 border border-red-100 rounded-lg px-3.5 py-2.5 text-xs text-red-600 font-medium">
      {msg}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
 EMAIL — SIGN IN
═══════════════════════════════════════════════════════════════════════ */
function GoogleButton() {
  const supabase = useSupabase();
  const [loading, setLoading] = useState(false);

  const handleGoogle = async () => {
    setLoading(true);
    try {
      await initiateGoogleSignIn(supabase);
    } catch {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-3 my-1">
        <div className="flex-1 h-px bg-black/[0.07]" />
        <span className="text-[11px] text-[#bbb] font-medium">or</span>
        <div className="flex-1 h-px bg-black/[0.07]" />
      </div>
      <button
        onClick={handleGoogle}
        disabled={loading}
        className="w-full h-11 rounded-lg border border-black/[0.1] bg-white flex items-center justify-center gap-2.5 text-sm font-semibold text-[#333] hover:bg-[#f7f7f5] transition-all disabled:opacity-60 mt-3"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin text-[#888]" />
        ) : (
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path
              d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
              fill="#4285F4"
            />
            <path
              d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
              fill="#34A853"
            />
            <path
              d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
              fill="#FBBC05"
            />
            <path
              d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z"
              fill="#EA4335"
            />
          </svg>
        )}
        Continue with Google
      </button>
    </div>
  );
}

function AgreeCheckbox({
  agreed,
  onChange,
}: {
  agreed: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-2.5 cursor-pointer select-none">
      <div
        onClick={() => onChange(!agreed)}
        className={[
          "mt-0.5 h-4 w-4 shrink-0 rounded border transition-all flex items-center justify-center",
          agreed
            ? "border-[#29a366] bg-[#29a366]"
            : "border-black/[0.15] bg-white",
        ].join(" ")}
      >
        {agreed && <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />}
      </div>
      <span className="text-[11px] text-[#888] leading-relaxed">
        By continuing, you agree to Emoorm's{" "}
        <a
          href="/terms"
          onClick={(e) => e.stopPropagation()}
          className="text-[#29a366] hover:underline font-medium"
        >
          Terms of Service
        </a>{" "}
        and{" "}
        <a
          href="/privacy"
          onClick={(e) => e.stopPropagation()}
          className="text-[#29a366] hover:underline font-medium"
        >
          Privacy Policy
        </a>
        .
      </span>
    </label>
  );
}

function EmailSignIn({
  onSwitch,
  onClose,
}: {
  onSwitch: () => void;
  onClose: () => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const supabase = useSupabase();
  const router = useRouter();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await initiateEmailSignIn(supabase, email, password);
      onClose();
      router.refresh();
    } catch (err: any) {
      const m: string = err?.message || "";
      if (m.includes("Invalid login credentials"))
        setError("Incorrect email or password.");
      else if (m.includes("Email not confirmed"))
        setError("Please verify your email first.");
      else setError(m || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <ErrBox msg={error} />
      <div>
        <Label>Email address</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#bbb]" />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            disabled={loading}
            autoComplete="email"
            className={inp}
            required
          />
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <Label>Password</Label>
          <button
            type="button"
            onClick={() => {
              onClose();
              router.push("/forgot-password");
            }}
            className="text-[11px] text-[#29a366] hover:underline font-medium"
          >
            Forgot password?
          </button>
        </div>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#bbb]" />
          <input
            type={showPw ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            disabled={loading}
            autoComplete="current-password"
            className={inp}
            required
          />
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPw((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#bbb] hover:text-[#555] transition-colors"
          >
            {showPw ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
      <AgreeCheckbox agreed={agreed} onChange={setAgreed} />
      <button
        type="submit"
        disabled={loading || !agreed}
        className={btnPrimary}
        style={btnGradient}
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Signing in…
          </>
        ) : (
          "Sign In"
        )}
      </button>
      <p className="text-center text-xs text-[#888]">
        No account?{" "}
        <button
          type="button"
          onClick={onSwitch}
          className="text-[#29a366] font-semibold hover:underline"
        >
          Create one
        </button>
      </p>
    </form>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
 EMAIL — SIGN UP
═══════════════════════════════════════════════════════════════════════ */
function EmailSignUp({
  onSwitch,
  onClose,
}: {
  onSwitch: () => void;
  onClose: () => void;
}) {
  const [step, setStep] = useState(1);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const supabase = useSupabase();

  const goNext = () => {
    if (!firstName.trim() || !lastName.trim() || !email.includes("@")) {
      setError("Please fill in your name and a valid email.");
      return;
    }
    setError("");
    setStep(2);
  };

  const submit = async (e: React.FormEvent) => {
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
      await initiateEmailSignUp(supabase, email, password);
      setDone(true);
    } catch (err: any) {
      const m: string = err?.message || "";
      if (m.includes("already registered"))
        setError("This email is already registered.");
      else setError(m || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  if (done)
    return (
      <div className="flex flex-col items-center text-center gap-4 py-2">
        <div
          className="h-14 w-14 rounded-full flex items-center justify-center"
          style={{ background: "#29a366" }}
        >
          <Check className="h-7 w-7 text-white" strokeWidth={2.5} />
        </div>
        <div>
          <p className="font-semibold text-[#111] mb-1">Check your inbox</p>
          <p className="text-sm text-[#777] leading-relaxed">
            We sent a confirmation link to{" "}
            <span className="font-semibold text-[#333]">{email}</span>. Click it
            to activate your account.
          </p>
        </div>
        <button
          onClick={onClose}
          className={btnPrimary}
          style={{ ...btnGradient, width: "auto", padding: "0 32px" }}
        >
          Got it
        </button>
      </div>
    );

  return (
    <div className="space-y-4">
      {/* Step dots */}
      <div className="flex items-center gap-2">
        {[1, 2].map((s) => (
          <React.Fragment key={s}>
            <div
              className={`h-6 w-6 rounded-full flex items-center justify-center text-[11px] font-bold transition-all ${step >= s ? "text-white" : "bg-[#eee] text-[#aaa]"}`}
              style={step >= s ? btnGradient : undefined}
            >
              {s}
            </div>
            {s < 2 && (
              <div
                className={`flex-1 h-0.5 rounded-full transition-all ${step > s ? "bg-[#29a366]" : "bg-[#e8e8e8]"}`}
              />
            )}
          </React.Fragment>
        ))}
      </div>

      <ErrBox msg={error} />

      {step === 1 && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>First name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#bbb]" />
                <input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Juan"
                  className={inp}
                />
              </div>
            </div>
            <div>
              <Label>Last name</Label>
              <input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Dela Cruz"
                className={inpBase}
              />
            </div>
          </div>
          <div>
            <Label>Email address</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#bbb]" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                className={inp}
              />
            </div>
          </div>
          <button
            type="button"
            onClick={goNext}
            className={btnPrimary}
            style={btnGradient}
          >
            Continue <ArrowRight className="h-4 w-4" />
          </button>
          <p className="text-center text-xs text-[#888]">
            Already have an account?{" "}
            <button
              type="button"
              onClick={onSwitch}
              className="text-[#29a366] font-semibold hover:underline"
            >
              Sign in
            </button>
          </p>
        </div>
      )}

      {step === 2 && (
        <form onSubmit={submit} className="space-y-3">
          <div>
            <Label>Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#bbb]" />
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                autoComplete="new-password"
                className={inp}
                required
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#bbb] hover:text-[#555] transition-colors"
              >
                {showPw ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            <PasswordStrength password={password} />
          </div>
          <div>
            <Label>Confirm password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#bbb]" />
              <input
                type={showConfirm ? "text" : "password"}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
                className={inp}
                required
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#bbb] hover:text-[#555] transition-colors"
              >
                {showConfirm ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
          <AgreeCheckbox agreed={agreed} onChange={setAgreed} />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setStep(1);
                setError("");
              }}
              className="flex-1 h-11 rounded-lg border border-black/[0.1] text-[#555] font-semibold text-sm hover:bg-[#f5f5f5] transition-all flex items-center justify-center gap-1"
            >
              <ChevronLeft className="h-4 w-4" /> Back
            </button>
            <button
              type="submit"
              disabled={loading || !agreed}
              className="flex-1 h-11 rounded-lg text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-60"
              style={btnGradient}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Creating…
                </>
              ) : (
                "Create Account"
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
 PHONE — OTP flow (sign in + sign up unified)
═══════════════════════════════════════════════════════════════════════ */
function PhoneAuth({ onClose }: { onClose: () => void }) {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendSecs, setResendSecs] = useState(0);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const supabase = useSupabase();
  const router = useRouter();

  /* countdown timer */
  useEffect(() => {
    if (resendSecs <= 0) return;
    const t = setTimeout(() => setResendSecs((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendSecs]);

  /* format PH number: ensure +63 prefix */
  const normalizePhone = (raw: string) => {
    const digits = raw.replace(/\D/g, "");
    if (digits.startsWith("0")) return "+63" + digits.slice(1);
    if (digits.startsWith("63")) return "+" + digits;
    if (digits.startsWith("9") && digits.length === 10) return "+63" + digits;
    return "+" + digits;
  };

  const sendOtp = async () => {
    const normalized = normalizePhone(phone);
    if (normalized.length < 10) {
      setError("Enter a valid phone number.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await initiatePhoneOtp(supabase, normalized);
      setStep("otp");
      setResendSecs(60);
    } catch (err: any) {
      setError(err?.message || "Failed to send OTP.");
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    const code = otp.join("");
    if (code.length < 6) {
      setError("Enter the 6-digit code.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await verifyPhoneOtp(supabase, normalizePhone(phone), code);
      onClose();
      router.refresh();
    } catch (err: any) {
      setError(err?.message || "Invalid code. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpKey = (
    i: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === "Backspace" && !otp[i] && i > 0) {
      otpRefs.current[i - 1]?.focus();
    }
  };

  const handleOtpChange = (i: number, val: string) => {
    const digit = val.replace(/\D/g, "").slice(-1);
    const next = [...otp];
    next[i] = digit;
    setOtp(next);
    if (digit && i < 5) otpRefs.current[i + 1]?.focus();
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!text) return;
    e.preventDefault();
    const next = Array(6)
      .fill("")
      .map((_, i) => text[i] || "");
    setOtp(next);
    otpRefs.current[Math.min(text.length, 5)]?.focus();
  };

  if (step === "phone")
    return (
      <div className="space-y-4">
        <div
          className="rounded-xl p-4 border border-black/[0.06]"
          style={{ background: "#f7f7f5" }}
        >
          <p className="text-xs text-[#666] leading-relaxed">
            Enter your mobile number and we'll send a one-time code. Works for
            both new and existing accounts.
          </p>
        </div>
        <ErrBox msg={error} />
        <div>
          <Label>Mobile number</Label>
          <div className="flex gap-2">
            <div className="flex items-center gap-1.5 px-3 bg-[#f7f7f5] border border-black/[0.08] rounded-lg text-sm font-semibold text-[#333] shrink-0">
              <Image
                src="/assets/ph-flag.png"
                alt="PH"
                width={18}
                height={13}
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
              +63
            </div>
            <div className="relative flex-1">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#bbb]" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="9XX XXX XXXX"
                autoComplete="tel"
                className={inp}
                onKeyDown={(e) => e.key === "Enter" && sendOtp()}
              />
            </div>
          </div>
          <p className="mt-1.5 text-[11px] text-[#aaa]">
            Example: 09171234567 or 9171234567
          </p>
        </div>
        <AgreeCheckbox agreed={agreed} onChange={setAgreed} />
        <button
          onClick={sendOtp}
          disabled={loading || !agreed}
          className={btnPrimary}
          style={btnGradient}
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Sending…
            </>
          ) : (
            <>
              Send Code <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </div>
    );

  return (
    <div className="space-y-4">
      <button
        onClick={() => {
          setStep("phone");
          setOtp(["", "", "", "", "", ""]);
          setError("");
        }}
        className="flex items-center gap-1 text-xs text-[#666] hover:text-[#29a366] transition-colors font-medium"
      >
        <ChevronLeft className="h-3.5 w-3.5" /> Change number
      </button>
      <div
        className="rounded-xl p-4 border border-black/[0.06]"
        style={{ background: "#f7f7f5" }}
      >
        <p className="text-xs text-[#666] leading-relaxed">
          Code sent to{" "}
          <span className="font-semibold text-[#333]">
            {normalizePhone(phone)}
          </span>
          . Enter the 6-digit code below.
        </p>
      </div>
      <ErrBox msg={error} />
      <div>
        <Label>Verification code</Label>
        <div className="flex gap-2 justify-between" onPaste={handleOtpPaste}>
          {otp.map((digit, i) => (
            <input
              key={i}
              ref={(el) => {
                otpRefs.current[i] = el;
              }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleOtpChange(i, e.target.value)}
              onKeyDown={(e) => handleOtpKey(i, e)}
              className={[
                "w-11 h-12 text-center text-lg font-bold rounded-lg border transition-all outline-none",
                digit
                  ? "border-[#29a366] bg-[#29a366]/5 text-[#29a366]"
                  : "border-black/[0.08] bg-[#f7f7f5] text-[#111]",
                "focus:border-[#29a366] focus:ring-2 focus:ring-[#29a366]/10",
              ].join(" ")}
            />
          ))}
        </div>
      </div>
      <button
        onClick={verifyOtp}
        disabled={loading}
        className={btnPrimary}
        style={btnGradient}
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Verifying…
          </>
        ) : (
          "Verify & Continue"
        )}
      </button>
      <div className="text-center">
        {resendSecs > 0 ? (
          <p className="text-xs text-[#aaa]">Resend code in {resendSecs}s</p>
        ) : (
          <button
            onClick={sendOtp}
            disabled={loading}
            className="text-xs text-[#29a366] font-semibold hover:underline disabled:opacity-50"
          >
            Resend code
          </button>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
 MAIN MODAL
═══════════════════════════════════════════════════════════════════════ */
function AuthModalInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useUser();

  const mode = searchParams.get("auth");
  const isOpen = mode === "signin" || mode === "signup";
  const [tab, setTab] = useState<"signin" | "signup">(
    mode === "signup" ? "signup" : "signin",
  );
  const [method, setMethod] = useState<"email" | "phone">("email");

  /* ── animation state ── */
  const [rendered, setRendered] = useState(isOpen);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setRendered(true);
      const raf = requestAnimationFrame(() =>
        requestAnimationFrame(() => setVisible(true)),
      );
      return () => cancelAnimationFrame(raf);
    } else {
      setVisible(false);
      const t = setTimeout(() => setRendered(false), 260);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  useEffect(() => {
    if (mode === "signin" || mode === "signup") setTab(mode);
  }, [mode]);
  useEffect(() => {
    if (user && isOpen) close();
  }, [user, isOpen]);

  /* Escape key to close */
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen]);

  const close = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("auth");
    const qs = params.toString();
    router.replace(qs ? `?${qs}` : window.location.pathname, { scroll: false });
  };

  const setAuthTab = (t: "signin" | "signup") => {
    setTab(t);
    const params = new URLSearchParams(searchParams.toString());
    params.set("auth", t);
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  if (!rendered) return null;

  return (
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center p-4"
      style={{
        backgroundColor: "rgba(0,0,0,0.45)",
        opacity: visible ? 1 : 0,
        transition: "opacity 220ms ease",
      }}
      onClick={close}
    >
      <div
        className="bg-white w-full max-w-[420px] overflow-hidden"
        style={{
          borderRadius: 16,
          boxShadow: "0 20px 60px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.04)",
          opacity: visible ? 1 : 0,
          transform: visible ? "scale(1) translateY(0)" : "scale(0.95) translateY(20px)",
          transition: visible
            ? "opacity 240ms ease, transform 300ms cubic-bezier(0.34,1.4,0.64,1)"
            : "opacity 200ms ease, transform 200ms ease",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div
          className="relative flex items-center justify-center px-6 pt-5 pb-4"
          style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}
        >
          <p className="text-base font-bold text-[#111]">
            {method === "phone"
              ? "Sign In / Sign Up"
              : tab === "signup"
                ? "Sign Up"
                : "Sign In"}
          </p>
          <button
            onClick={close}
            className="absolute right-4 h-7 w-7 rounded-[5px] flex items-center justify-center text-[#aaa] hover:text-[#555] hover:bg-black/[0.04] transition-all"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 pt-5 pb-6 space-y-5">
          {/* ── Method toggle ── */}
          <div
            className="relative flex rounded-lg p-1"
            style={{ background: "#f2f2f0" }}
          >
            {/* sliding pill */}
            <div
              className="absolute top-1 bottom-1 rounded-md bg-white shadow-sm pointer-events-none"
              style={{
                width: "calc(50% - 4px)",
                left: 4,
                transform: method === "email" ? "translateX(0)" : "translateX(100%)",
                transition: "transform 220ms cubic-bezier(0.34,1.4,0.64,1)",
              }}
            />
            {(["email", "phone"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMethod(m)}
                className={[
                  "relative z-10 flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-sm font-semibold transition-colors",
                  method === m ? "text-[#111]" : "text-[#999] hover:text-[#555]",
                ].join(" ")}
              >
                {m === "email" ? (
                  <Mail className="h-3.5 w-3.5" />
                ) : (
                  <Phone className="h-3.5 w-3.5" />
                )}
                {m === "email" ? "Email" : "Phone"}
              </button>
            ))}
          </div>

          {/* ── Phone label ── */}
          {method === "phone" && (
            <div>
              <p className="text-[13px] font-semibold text-[#111]">
                Sign in or create account
              </p>
              <p className="text-xs text-[#888] mt-0.5">
                We'll sign you in or create an account automatically.
              </p>
            </div>
          )}

          {/* ── Form ── */}
          {method === "email" && tab === "signin" && (
            <EmailSignIn
              onSwitch={() => setAuthTab("signup")}
              onClose={close}
            />
          )}
          {method === "email" && tab === "signup" && (
            <EmailSignUp
              onSwitch={() => setAuthTab("signin")}
              onClose={close}
            />
          )}
          {method === "phone" && <PhoneAuth onClose={close} />}

          {/* ── Or divider + Google ── */}
          <GoogleButton />
        </div>
      </div>
    </div>
  );
}

export function AuthModal() {
  return (
    <React.Suspense fallback={null}>
      <AuthModalInner />
    </React.Suspense>
  );
}
