"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  Store,
  MapPin,
  Upload,
  Tag,
  CheckCircle2,
  ChevronRight,
  Camera,
  Loader2,
  User,
  Phone,
  FileText,
} from "lucide-react";
import {
  useSupabaseAuth,
  useSupabase,
  useStableMemo,
  useDoc,
  setDocumentNonBlocking,
  updateDocumentNonBlocking,
} from "@/supabase";
import { uploadImage } from "@/lib/upload-image";

const MUNICIPALITIES = [
  "Baco",
  "Bansud",
  "Bongabong",
  "Bulalacao",
  "Calapan City",
  "Gloria",
  "Mansalay",
  "Naujan",
  "Pinamalayan",
  "Pola",
  "Puerto Galera",
  "Roxas",
  "San Teodoro",
  "Socorro",
  "Victoria",
];

const CATEGORIES = [
  "Agriculture",
  "Vegetables",
  "Fruits",
  "Seafood",
  "Meat & Poultry",
  "Rice & Grains",
  "Dairy",
  "Handicrafts",
  "Wellness",
  "Delicacies",
  "Beverages",
  "Condiments",
  "General Store",
  "Other",
];

const ID_TYPES = [
  "National ID",
  "PhilHealth ID",
  "SSS ID",
  "UMID",
  "Passport",
  "Driver's License",
  "PRC ID",
  "Postal ID",
  "Voter's ID",
  "TIN ID",
  "PWD ID",
  "Others",
];

const STEPS = [
  { label: "Shop Info", icon: Store },
  { label: "Location", icon: MapPin },
  { label: "Owner", icon: User },
  { label: "Verification", icon: FileText },
];

const inputClass =
  "w-full bg-[#f9f9f8] border border-black/[0.08] rounded-xl px-4 py-3 text-sm text-[#111] placeholder:text-[#bbb] outline-none focus:border-[#29a366] focus:ring-2 focus:ring-[#29a366]/15 transition-all";
const labelClass = "block text-xs font-semibold text-[#555] mb-1.5";
const selectClass = inputClass + " cursor-pointer appearance-none";

function FieldRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className={labelClass}>{label}</label>
      {children}
    </div>
  );
}

export default function ShopRegistrationPage() {
  const router = useRouter();
  const { user } = useSupabaseAuth();
  const supabase = useSupabase();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const frontInputRef = useRef<HTMLInputElement>(null);
  const backInputRef = useRef<HTMLInputElement>(null);
  const selfieInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [registered, setRegistered] = useState(false);

  const [form, setForm] = useState({
    storeName: "",
    description: "",
    category: "",
    logo: "",
    city: "",
    barangay: "",
    address: "",
    ownerName: "",
    email: "",
    contact: "",
    governmentIdType: "",
    governmentIdFront: "",
    governmentIdBack: "",
    selfieImage: "",
  });
  const [idFiles, setIdFiles] = useState<Record<string, File | null>>({
    governmentIdFront: null,
    governmentIdBack: null,
    selfieImage: null,
  });

  // Redirect if already registered
  const storeRef = useStableMemo(
    () => (user ? { table: "stores", id: user.uid } : null),
    [user],
  );
  const { data: existingStore } = useDoc(storeRef);
  useEffect(() => {
    if (existingStore) router.replace("/seller/dashboard");
  }, [existingStore, router]);

  // Pre-fill owner name and email from user profile
  useEffect(() => {
    if (user?.displayName && !form.ownerName)
      setForm((p) => ({ ...p, ownerName: user.displayName || "" }));
    if (user?.email && !form.email)
      setForm((p) => ({ ...p, email: user.email || "" }));
  }, [user]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleImageFile = (name: string, file: File) => {
    const reader = new FileReader();
    reader.onload = (ev) =>
      setForm((p) => ({ ...p, [name]: ev.target?.result as string }));
    reader.readAsDataURL(file);
    if (
      ["governmentIdFront", "governmentIdBack", "selfieImage"].includes(name)
    ) {
      setIdFiles((p) => ({ ...p, [name]: file }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    try {
      const prefix = `seller-ids/${user.uid}`;
      const [frontUrl, backUrl, selfieUrl, logoUrl] = await Promise.all([
        idFiles.governmentIdFront
          ? uploadImage(
              supabase,
              "stores",
              idFiles.governmentIdFront,
              `${prefix}/id-front`,
            )
          : Promise.resolve(""),
        idFiles.governmentIdBack
          ? uploadImage(
              supabase,
              "stores",
              idFiles.governmentIdBack,
              `${prefix}/id-back`,
            )
          : Promise.resolve(""),
        idFiles.selfieImage
          ? uploadImage(
              supabase,
              "stores",
              idFiles.selfieImage,
              `${prefix}/selfie`,
            )
          : Promise.resolve(""),
        form.logo && !form.logo.startsWith("http")
          ? uploadImage(
              supabase,
              "stores",
              await (async () => {
                const r = await fetch(form.logo);
                return new File([await r.blob()], "logo");
              })(),
              `logos/${user.uid}`,
            )
          : Promise.resolve(form.logo),
      ]);

      setDocumentNonBlocking(supabase, "stores", {
        id: user.uid,
        ownerId: user.uid,
        name: form.storeName,
        description: form.description,
        category: form.category,
        imageUrl: logoUrl || "",
        city: form.city,
        barangay: form.barangay,
        street: form.address,
        status: "active",
        governmentIdType: form.governmentIdType,
        governmentIdFront: frontUrl,
        governmentIdBack: backUrl,
        selfieImage: selfieUrl,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      updateDocumentNonBlocking(supabase, "users", user.uid, {
        isSeller: true,
        role: "seller",
      });

      setRegistered(true);
      localStorage.removeItem("sellerSignupIntent");
      setTimeout(() => router.push("/seller/dashboard"), 3000);
    } catch (err) {
      console.error("Registration error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  // Validate current step before advancing
  const canAdvance = () => {
    if (step === 0) return form.storeName.trim().length > 0 && form.category;
    if (step === 1) return !!form.city && form.barangay.trim().length > 0;
    if (step === 2)
      return (
        form.ownerName.trim().length > 0 &&
        form.email.includes("@") &&
        form.contact.length >= 10
      );
    return true;
  };

  if (!user) return null;

  // Success screen
  if (registered)
    return (
      <div
        className="min-h-screen flex items-center justify-center p-6"
        style={{ backgroundColor: "#f2f2f0" }}
      >
        <div className="bg-white rounded-2xl p-10 w-full max-w-[420px] border border-black/[0.06] text-center">
          <div className="h-16 w-16 rounded-full bg-[#f0fdf4] flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 className="h-8 w-8 text-[#29a366]" />
          </div>
          <h1 className="text-xl font-bold text-[#111] mb-2">
            You're all set!
          </h1>
          <p className="text-sm text-[#888] mb-6">
            Your shop has been registered. Taking you to your seller dashboard…
          </p>
          <div className="h-1.5 w-full bg-[#f2f2f0] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                background: "#29a366",
                animation: "progress 3s ease-in-out forwards",
              }}
            />
          </div>
          <style jsx>{`
            @keyframes progress {
              from {
                width: 0%;
              }
              to {
                width: 100%;
              }
            }
          `}</style>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#f2f2f0" }}>

      {/* Top navbar */}
      <div className="bg-white border-b border-black/[0.06] sticky top-0 z-50">
        <div className="max-w-[900px] mx-auto px-6 h-14 flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <Image src="/brand-icon.png" alt="Emoorm" width={32} height={32} style={{ objectFit: "contain" }} />
            <span style={{ fontFamily: "'Ubuntu', sans-serif", fontWeight: 700, fontSize: "1.25rem", letterSpacing: "-0.05em" }}>
              emoorm
            </span>
          </Link>
          <div style={{ width: 1, height: 22, background: "rgba(0,0,0,0.15)", flexShrink: 0 }} />
          <span className="text-sm font-semibold text-[#555]">Seller Center</span>
        </div>
      </div>

      {/* Horizontal step bar */}
      <div className="bg-white border-b border-black/[0.05]">
        <div className="max-w-[900px] mx-auto px-6 py-4">
          <div className="flex items-center">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              const done = i < step;
              const current = i === step;
              return (
                <React.Fragment key={s.label}>
                  <div className="flex flex-col items-center gap-1.5 shrink-0">
                    <div
                      className="h-8 w-8 rounded-full flex items-center justify-center transition-all"
                      style={{ background: done || current ? "#29a366" : "#e5e7eb" }}
                    >
                      {done
                        ? <CheckCircle2 className="h-4 w-4 text-white" strokeWidth={2.5} />
                        : <Icon className="h-4 w-4 text-white" strokeWidth={1.8} />}
                    </div>
                    <span
                      className="text-[11px] font-semibold whitespace-nowrap"
                      style={{ color: done || current ? "#29a366" : "#aaa" }}
                    >
                      {s.label}
                    </span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div
                      className="flex-1 h-0.5 mx-3 mb-5 rounded-full transition-all"
                      style={{ background: done ? "#29a366" : "#e5e7eb" }}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main form panel */}
      <div className="flex-1 flex flex-col items-center justify-start p-6 md:p-10">
        <div className="w-full max-w-[520px]">
          {/* Back link */}
          <div className="flex items-center gap-2 mb-6">
            <button
              onClick={() => (step > 0 ? setStep((p) => p - 1) : router.back())}
              className="flex items-center gap-1.5 text-xs text-[#888] hover:text-[#111] transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {step > 0 ? "Back" : "Back to sell page"}
            </button>
            <div className="flex-1" />
            <span className="text-xs text-[#bbb]">Step {step + 1} / {STEPS.length}</span>
          </div>

          <form
            onSubmit={
              step < STEPS.length - 1
                ? (e) => {
                    e.preventDefault();
                    if (canAdvance()) setStep((p) => p + 1);
                  }
                : handleSubmit
            }
          >
            {/* ── Step 0: Shop Info ──────────────────────────────── */}
            {step === 0 && (
              <div className="space-y-4">
                <div className="mb-6">
                  <h1 className="text-xl font-bold text-[#111] mb-1">
                    Shop information
                  </h1>
                  <p className="text-sm text-[#888]">
                    This is what buyers will see on your store page.
                  </p>
                </div>

                {/* Logo upload */}
                <div className="flex justify-center mb-2">
                  <div
                    className="h-20 w-20 rounded-2xl bg-white border-2 border-dashed border-black/[0.12] flex flex-col items-center justify-center cursor-pointer hover:border-[#29a366] transition-colors overflow-hidden relative group"
                    onClick={() => logoInputRef.current?.click()}
                  >
                    {form.logo ? (
                      <img
                        src={form.logo}
                        alt="Logo"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <>
                        <Camera
                          className="h-5 w-5 text-[#ccc] mb-1"
                          strokeWidth={1.5}
                        />
                        <span className="text-[10px] text-[#bbb]">
                          Shop logo
                        </span>
                      </>
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleImageFile("logo", f);
                      }}
                    />
                  </div>
                </div>

                <FieldRow label="Shop name *">
                  <input
                    name="storeName"
                    value={form.storeName}
                    onChange={handleChange}
                    placeholder="e.g. Mindoro Fresh Harvest"
                    className={inputClass}
                    required
                  />
                </FieldRow>

                <FieldRow label="Description *">
                  <textarea
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                    placeholder="Tell buyers what you sell and what makes your shop special…"
                    className={inputClass + " resize-none"}
                    rows={3}
                    required
                  />
                </FieldRow>

                <FieldRow label="Shop category *">
                  <select
                    name="category"
                    value={form.category}
                    onChange={handleChange}
                    className={selectClass}
                    required
                  >
                    <option value="">Select a category</option>
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </FieldRow>
              </div>
            )}

            {/* ── Step 1: Location ───────────────────────────────── */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="mb-6">
                  <h1 className="text-xl font-bold text-[#111] mb-1">
                    Shop location
                  </h1>
                  <p className="text-sm text-[#888]">
                    Buyers filter by location. Accurate info builds trust.
                  </p>
                </div>

                <div className="bg-white rounded-xl border border-black/[0.06] px-4 py-3 flex items-center gap-2">
                  <MapPin
                    className="h-4 w-4 text-[#29a366] shrink-0"
                    strokeWidth={1.8}
                  />
                  <div>
                    <p className="text-xs font-semibold text-[#111]">
                      Oriental Mindoro, MIMAROPA
                    </p>
                    <p className="text-[11px] text-[#bbb]">
                      Province is locked to Oriental Mindoro
                    </p>
                  </div>
                </div>

                <FieldRow label="Municipality *">
                  <select
                    name="city"
                    value={form.city}
                    onChange={handleChange}
                    className={selectClass}
                    required
                  >
                    <option value="">Select municipality</option>
                    {MUNICIPALITIES.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </FieldRow>

                <FieldRow label="Barangay *">
                  <input
                    name="barangay"
                    value={form.barangay}
                    onChange={handleChange}
                    placeholder="e.g. Barangay San Roque"
                    className={inputClass}
                    required
                  />
                </FieldRow>

                <FieldRow label="Street / Detailed address">
                  <input
                    name="address"
                    value={form.address}
                    onChange={handleChange}
                    placeholder="House no., street, building…"
                    className={inputClass}
                  />
                </FieldRow>
              </div>
            )}

            {/* ── Step 2: Owner Info ─────────────────────────────── */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="mb-6">
                  <h1 className="text-xl font-bold text-[#111] mb-1">
                    Owner information
                  </h1>
                  <p className="text-sm text-[#888]">
                    Your personal details for account verification.
                  </p>
                </div>

                <FieldRow label="Full name *">
                  <input
                    name="ownerName"
                    value={form.ownerName}
                    onChange={handleChange}
                    placeholder="Juan Dela Cruz"
                    className={inputClass}
                    required
                  />
                </FieldRow>

                <FieldRow label="Email address *">
                  <input
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="you@example.com"
                    className={inputClass}
                    required
                  />
                </FieldRow>

                <FieldRow label="Phone number *">
                  <div className="flex items-center gap-2">
                    <div className="bg-[#f9f9f8] border border-black/[0.08] rounded-xl px-3 py-3 text-sm font-semibold text-[#555] shrink-0">
                      +63
                    </div>
                    <input
                      type="tel"
                      name="contact"
                      value={form.contact}
                      onChange={handleChange}
                      placeholder="9123456789"
                      className={inputClass}
                      maxLength={10}
                      onInput={(e) => {
                        (e.target as HTMLInputElement).value = (
                          e.target as HTMLInputElement
                        ).value
                          .replace(/\D/g, "")
                          .slice(0, 10);
                      }}
                      required
                    />
                  </div>
                </FieldRow>
              </div>
            )}

            {/* ── Step 3: Verification ───────────────────────────── */}
            {step === 3 && (
              <div className="space-y-4">
                <div className="mb-6">
                  <h1 className="text-xl font-bold text-[#111] mb-1">
                    Identity verification
                  </h1>
                  <p className="text-sm text-[#888]">
                    Required to activate your seller account and build buyer
                    trust.
                  </p>
                </div>

                <FieldRow label="Government ID type *">
                  <select
                    name="governmentIdType"
                    value={form.governmentIdType}
                    onChange={handleChange}
                    className={selectClass}
                    required
                  >
                    <option value="">Select valid PH ID</option>
                    {ID_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </FieldRow>

                {/* ID Front */}
                <div>
                  <label className={labelClass}>ID photo — Front *</label>
                  <div
                    className="w-full h-32 rounded-xl border-2 border-dashed border-black/[0.10] bg-[#f9f9f8] flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-[#29a366] transition-colors overflow-hidden relative"
                    onClick={() => frontInputRef.current?.click()}
                  >
                    {form.governmentIdFront ? (
                      <img
                        src={form.governmentIdFront}
                        alt="ID front"
                        className="h-full w-full object-contain p-2"
                      />
                    ) : (
                      <>
                        <Upload
                          className="h-5 w-5 text-[#ccc]"
                          strokeWidth={1.5}
                        />
                        <span className="text-xs text-[#bbb]">
                          Click to upload front of ID
                        </span>
                      </>
                    )}
                    <input
                      ref={frontInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      required
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleImageFile("governmentIdFront", f);
                      }}
                    />
                  </div>
                </div>

                {/* ID Back */}
                <div>
                  <label className={labelClass}>ID photo — Back *</label>
                  <div
                    className="w-full h-32 rounded-xl border-2 border-dashed border-black/[0.10] bg-[#f9f9f8] flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-[#29a366] transition-colors overflow-hidden relative"
                    onClick={() => backInputRef.current?.click()}
                  >
                    {form.governmentIdBack ? (
                      <img
                        src={form.governmentIdBack}
                        alt="ID back"
                        className="h-full w-full object-contain p-2"
                      />
                    ) : (
                      <>
                        <Upload
                          className="h-5 w-5 text-[#ccc]"
                          strokeWidth={1.5}
                        />
                        <span className="text-xs text-[#bbb]">
                          Click to upload back of ID
                        </span>
                      </>
                    )}
                    <input
                      ref={backInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      required
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleImageFile("governmentIdBack", f);
                      }}
                    />
                  </div>
                </div>

                {/* Selfie */}
                <div>
                  <label className={labelClass}>Selfie with ID *</label>
                  <div
                    className="w-full h-32 rounded-xl border-2 border-dashed border-black/[0.10] bg-[#f9f9f8] flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-[#29a366] transition-colors overflow-hidden relative"
                    onClick={() => selfieInputRef.current?.click()}
                  >
                    {form.selfieImage ? (
                      <img
                        src={form.selfieImage}
                        alt="Selfie"
                        className="h-full w-full object-contain p-2"
                      />
                    ) : (
                      <>
                        <Camera
                          className="h-5 w-5 text-[#ccc]"
                          strokeWidth={1.5}
                        />
                        <span className="text-xs text-[#bbb]">
                          Upload a selfie holding your ID
                        </span>
                      </>
                    )}
                    <input
                      ref={selfieInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      required
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleImageFile("selfieImage", f);
                      }}
                    />
                  </div>
                </div>

                <div className="bg-[#f0fdf4] border border-[#bbf7d0] rounded-xl px-4 py-3">
                  <p className="text-xs text-[#166534] leading-relaxed">
                    Your ID is stored securely and only used for verification.
                    It will not be shared with buyers.
                  </p>
                </div>
              </div>
            )}

            {/* Navigation buttons */}
            <div className="flex gap-3 mt-8">
              {step > 0 && (
                <button
                  type="button"
                  onClick={() => setStep((p) => p - 1)}
                  className="h-12 px-6 rounded-xl border border-black/[0.10] text-sm font-semibold text-[#555] hover:bg-white transition-colors"
                >
                  Back
                </button>
              )}
              <button
                type="submit"
                disabled={
                  submitting || (step < STEPS.length - 1 && !canAdvance())
                }
                className="flex-1 h-12 rounded-xl text-white text-sm font-bold flex items-center justify-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ background: "#29a366" }}
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {step < STEPS.length - 1
                  ? "Continue"
                  : submitting
                    ? "Setting up your shop…"
                    : "Activate My Shop"}
                {!submitting && step < STEPS.length - 1 && (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
