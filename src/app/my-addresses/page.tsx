"use client";

import React, { useState } from "react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { ProfileSidebar } from "@/app/profile/page";
import {
  useUser,
  useSupabase,
  useCollection,
  useStableMemo,
  useSupabaseAuth,
} from "@/supabase";
import { MapPin, Plus, Pencil, Trash2, Check, X, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";

interface Address {
  id: string;
  userId: string;
  name: string;
  phone: string;
  street: string;
  barangay: string;
  city: string;
  province: string;
  zipCode: string;
  isDefault: boolean;
}

const EMPTY_FORM = {
  name: "",
  phone: "",
  street: "",
  barangay: "",
  city: "",
  province: "",
  zipCode: "",
  isDefault: false,
};

const inputClass =
  "w-full bg-[#f2f2f0] border border-black/[0.08] rounded-md px-3 py-2 text-sm text-[#111] placeholder:text-[#bbb] outline-none focus:border-[#29a366] focus:bg-white transition-all";
const labelClass = "block text-xs font-medium text-[#555] mb-1";

export default function MyAddressesPage() {
  const { user, isUserLoading } = useUser();
  const { auth } = useSupabaseAuth();
  const supabase = useSupabase();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await auth.signOut();
      router.push("/login");
    } catch {}
  };

  const addressQuery = useStableMemo(() => {
    if (!user) return null;
    return {
      table: "addresses",
      filters: [{ column: "userId", op: "eq" as const, value: user.uid }],
    };
  }, [user]);
  const { data: addresses } = useCollection<Address>(addressQuery);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const openAdd = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(true);
  };

  const openEdit = (addr: Address) => {
    setForm({
      name: addr.name ?? "",
      phone: addr.phone ?? "",
      street: addr.street ?? "",
      barangay: addr.barangay ?? "",
      city: addr.city ?? "",
      province: addr.province ?? "",
      zipCode: addr.zipCode ?? "",
      isDefault: addr.isDefault ?? false,
    });
    setEditingId(addr.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!user) return;
    if (!form.name.trim() || !form.street.trim() || !form.city.trim()) return;
    setSaving(true);
    try {
      // If marking as default, unset all others first
      if (form.isDefault) {
        await supabase
          .from("addresses")
          .update({ isDefault: false })
          .eq("userId", user.uid);
      }
      if (editingId) {
        await supabase
          .from("addresses")
          .update({ ...form, updatedAt: new Date().toISOString() })
          .eq("id", editingId);
      } else {
        await supabase.from("addresses").insert({
          ...form,
          userId: user.uid,
          createdAt: new Date().toISOString(),
        });
      }
      setShowForm(false);
      setEditingId(null);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await supabase.from("addresses").delete().eq("id", id);
    } finally {
      setDeletingId(null);
    }
  };

  const handleSetDefault = async (addr: Address) => {
    if (!user || addr.isDefault) return;
    await supabase
      .from("addresses")
      .update({ isDefault: false })
      .eq("userId", user.uid);
    await supabase
      .from("addresses")
      .update({ isDefault: true })
      .eq("id", addr.id);
  };

  // ── Loading ──────────────────────────────────────────────────────────
  if (isUserLoading)
    return (
      <div
        className="flex min-h-screen flex-col"
        style={{ backgroundColor: "#f2f2f0" }}
      >
        <Header />
        <main className="flex-grow pt-6">
          <div className="max-w-[1280px] mx-auto px-4 md:px-8 pb-24 flex gap-5 items-start">
            <div className="hidden md:flex flex-col w-[200px] shrink-0 gap-2.5">
              <Skeleton className="h-[300px] rounded-[5px]" />
              <Skeleton className="h-[100px] rounded-[5px]" />
            </div>
            <div className="flex-1 min-w-0 space-y-3">
              <Skeleton className="h-[72px] rounded-[5px]" />
              <Skeleton className="h-[140px] rounded-[5px]" />
              <Skeleton className="h-[140px] rounded-[5px]" />
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );

  if (!user) {
    router.push("/login");
    return null;
  }

  const sorted = [...((addresses as Address[]) ?? [])].sort(
    (a, b) => (b.isDefault ? 1 : 0) - (a.isDefault ? 1 : 0),
  );

  return (
    <div
      className="flex min-h-screen flex-col"
      style={{ backgroundColor: "#f2f2f0" }}
    >
      <Header />
      <main className="flex-grow pt-6">
        <div className="max-w-[1280px] mx-auto px-4 md:px-8 pb-24 flex gap-5 items-start">
          <ProfileSidebar onLogout={handleLogout} />

          <div className="flex-1 min-w-0 space-y-3">
            {/* Header */}
            <div className="bg-white rounded-[5px] border border-black/[0.06] px-6 py-5 flex items-center justify-between">
              <div>
                <h1 className="text-lg font-semibold text-[#111]">
                  My Addresses
                </h1>
                <p className="text-sm text-[#888]">
                  {sorted.length} saved address{sorted.length !== 1 ? "es" : ""}
                </p>
              </div>
              {!showForm && (
                <button
                  onClick={openAdd}
                  className="flex items-center gap-1.5 text-sm font-semibold text-white px-4 py-2 rounded-[5px] transition-opacity hover:opacity-90"
                  style={{ background: "#29a366" }}
                >
                  <Plus className="h-4 w-4" /> Add Address
                </button>
              )}
            </div>

            {/* Add / Edit form */}
            {showForm && (
              <div className="bg-white rounded-[5px] border border-black/[0.06] p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-[#111]">
                    {editingId ? "Edit Address" : "New Address"}
                  </h2>
                  <button
                    onClick={() => setShowForm(false)}
                    className="p-1 text-[#bbb] hover:text-[#555] transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>
                      Full Name <span className="text-red-400">*</span>
                    </label>
                    <input
                      className={inputClass}
                      placeholder="e.g. Juan Dela Cruz"
                      value={form.name}
                      onChange={(e) =>
                        setForm({ ...form, name: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Phone Number</label>
                    <input
                      className={inputClass}
                      placeholder="+63 912 345 6789"
                      value={form.phone}
                      onChange={(e) =>
                        setForm({ ...form, phone: e.target.value })
                      }
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelClass}>
                      Street / House No. <span className="text-red-400">*</span>
                    </label>
                    <input
                      className={inputClass}
                      placeholder="e.g. 123 Rizal Street"
                      value={form.street}
                      onChange={(e) =>
                        setForm({ ...form, street: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Barangay</label>
                    <input
                      className={inputClass}
                      placeholder="e.g. Barangay Centro"
                      value={form.barangay}
                      onChange={(e) =>
                        setForm({ ...form, barangay: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className={labelClass}>
                      City / Municipality{" "}
                      <span className="text-red-400">*</span>
                    </label>
                    <input
                      className={inputClass}
                      placeholder="e.g. Calapan City"
                      value={form.city}
                      onChange={(e) =>
                        setForm({ ...form, city: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Province</label>
                    <input
                      className={inputClass}
                      placeholder="e.g. Oriental Mindoro"
                      value={form.province}
                      onChange={(e) =>
                        setForm({ ...form, province: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className={labelClass}>ZIP Code</label>
                    <input
                      className={inputClass}
                      placeholder="e.g. 5200"
                      value={form.zipCode}
                      onChange={(e) =>
                        setForm({ ...form, zipCode: e.target.value })
                      }
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2.5 mt-4 cursor-pointer select-none">
                  <div
                    onClick={() =>
                      setForm({ ...form, isDefault: !form.isDefault })
                    }
                    className="h-5 w-5 rounded border flex items-center justify-center transition-all"
                    style={{
                      background: form.isDefault ? "#29a366" : "transparent",
                      borderColor: form.isDefault
                        ? "#29a366"
                        : "rgba(0,0,0,0.15)",
                    }}
                  >
                    {form.isDefault && (
                      <Check className="h-3 w-3 text-white" strokeWidth={3} />
                    )}
                  </div>
                  <span className="text-sm text-[#333]">
                    Set as default address
                  </span>
                </label>

                <div className="flex gap-2 mt-5">
                  <button
                    onClick={handleSave}
                    disabled={
                      saving ||
                      !form.name.trim() ||
                      !form.street.trim() ||
                      !form.city.trim()
                    }
                    className="flex items-center gap-1.5 h-9 px-5 rounded-[5px] text-sm font-semibold text-white disabled:opacity-50 transition-opacity"
                    style={{ background: "#29a366" }}
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                    {saving ? "Saving…" : "Save Address"}
                  </button>
                  <button
                    onClick={() => setShowForm(false)}
                    className="h-9 px-4 rounded-[5px] text-sm text-[#555] border border-black/[0.08] hover:bg-[#f2f2f0] transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Address list */}
            {sorted.length === 0 && !showForm ? (
              <div className="bg-white rounded-[5px] border border-black/[0.06] py-20 flex flex-col items-center text-center gap-3">
                <MapPin
                  className="h-12 w-12 text-[#e0e0e0]"
                  strokeWidth={1.5}
                />
                <div>
                  <p className="text-sm font-medium text-[#333] mb-1">
                    No saved addresses yet
                  </p>
                  <p className="text-xs text-[#999]">
                    Add an address to make checkout faster.
                  </p>
                </div>
                <button
                  onClick={openAdd}
                  className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-white px-4 py-2 rounded-[5px]"
                  style={{ background: "#29a366" }}
                >
                  <Plus className="h-4 w-4" /> Add Address
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {sorted.map((addr) => (
                  <div
                    key={addr.id}
                    className="bg-white rounded-[5px] border border-black/[0.06] p-5"
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className="h-9 w-9 rounded-full flex items-center justify-center shrink-0"
                        style={{
                          background: addr.isDefault ? "#29a36615" : "#f5f5f5",
                        }}
                      >
                        <MapPin
                          className="h-4.5 w-4.5"
                          style={{ color: addr.isDefault ? "#29a366" : "#aaa" }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <span className="text-sm font-semibold text-[#111]">
                            {addr.name}
                          </span>
                          {addr.isDefault && (
                            <span className="text-[10px] font-semibold text-[#29a366] border border-[#29a366]/30 rounded-full px-2 py-0.5 leading-none">
                              Default
                            </span>
                          )}
                        </div>
                        {addr.phone && (
                          <p className="text-xs text-[#888] mb-0.5">
                            {addr.phone}
                          </p>
                        )}
                        <p className="text-sm text-[#555] leading-relaxed">
                          {[
                            addr.street,
                            addr.barangay,
                            addr.city,
                            addr.province,
                            addr.zipCode,
                          ]
                            .filter(Boolean)
                            .join(", ")}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {!addr.isDefault && (
                          <button
                            onClick={() => handleSetDefault(addr)}
                            className="h-8 px-3 text-xs font-medium text-[#29a366] border border-[#29a366]/30 rounded-[5px] hover:bg-[#29a366]/5 transition-colors"
                          >
                            Set default
                          </button>
                        )}
                        <button
                          onClick={() => openEdit(addr)}
                          className="h-8 w-8 flex items-center justify-center rounded-[5px] text-[#888] hover:text-[#29a366] hover:bg-[#f2f2f0] transition-colors"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(addr.id)}
                          disabled={deletingId === addr.id}
                          className="h-8 w-8 flex items-center justify-center rounded-[5px] text-[#bbb] hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
                        >
                          {deletingId === addr.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {!showForm && (
                  <button
                    onClick={openAdd}
                    className="w-full bg-white rounded-[5px] border border-dashed border-black/[0.12] py-4 flex items-center justify-center gap-2 text-sm text-[#888] hover:border-[#29a366] hover:text-[#29a366] transition-colors"
                  >
                    <Plus className="h-4 w-4" /> Add another address
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
