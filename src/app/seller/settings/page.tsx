"use client";

import React, { useState, useEffect } from "react";
import { SellerLayout } from "@/components/layout/seller-layout";
import { Switch } from "@/components/ui/switch";
import {
  Store,
  Bell,
  Shield,
  Save,
  Camera,
  Globe,
  Loader2,
  Truck,
  MapPin,
  Map,
} from "lucide-react";
import dynamic from "next/dynamic";

const LocationPickerMap = dynamic(
  () => import("@/components/location-picker-map"),
  { ssr: false },
);

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useSupabaseAuth,
  useSupabase,
  useStableMemo,
  useDoc,
  updateDocumentNonBlocking,
} from "@/supabase";
import { uploadImage } from "@/lib/upload-image";
import { Skeleton } from "@/components/ui/skeleton";

const inputClass =
  "w-full bg-[#f2f2f0] border border-black/[0.08] rounded-md px-3 py-2 text-sm text-[#111] outline-none focus:border-[#29a366] focus:bg-white transition-all";
const labelClass = "block text-xs font-medium text-[#555] mb-1.5";

export default function SellerSettingsPage() {
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingQR, setUploadingQR] = useState(false);
  const logoInputRef = React.useRef<HTMLInputElement>(null);
  const qrInputRef = React.useRef<HTMLInputElement>(null);

  const { user } = useSupabaseAuth();
  const supabase = useSupabase();

  const storeRef = useStableMemo(() => {
    if (!user) return null;
    return { table: "stores", id: user.uid };
  }, [user]);
  const { data: store, isLoading } = useDoc(storeRef);

  const [form, setForm] = useState({
    name: "",
    description: "",
    category: "General",
    imageUrl: "",
    city: "",
    street: "",
    barangay: "",
    qrphUrl: "",
    offersDelivery: true,
    offersPickup: true,
    latitude: null as number | null,
    longitude: null as number | null,
  });

  useEffect(() => {
    if (store) {
      const s = store as any;
      setForm({
        name: s.name || "",
        description: s.description || "",
        category: s.category || "General",
        imageUrl: s.imageUrl || "",
        city: s.city || "",
        street: s.street || "",
        barangay: s.barangay || "",
        qrphUrl: s.qrphUrl || "",
        offersDelivery: s.offersDelivery !== false,
        offersPickup: s.offersPickup !== false,
        latitude: s.latitude || null,
        longitude: s.longitude || null,
      });
    }
  }, [store]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploadingLogo(true);
    try {
      const url = await uploadImage(
        supabase,
        "stores",
        file,
        `logo/${user.uid}`,
      );
      setForm((prev) => ({ ...prev, imageUrl: url }));
    } catch {
      alert("Failed to upload shop logo.");
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleQRUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploadingQR(true);
    try {
      const url = await uploadImage(
        supabase,
        "stores",
        file,
        `qrph/${user.uid}`,
      );
      setForm((prev) => ({ ...prev, qrphUrl: url }));
    } catch {
      alert("Failed to upload QR PH code.");
    } finally {
      setUploadingQR(false);
    }
  };

  const handleSave = () => {
    if (!user) return;
    setSaving(true);
    updateDocumentNonBlocking(supabase, "stores", user.uid, {
      ...form,
      updatedAt: new Date().toISOString(),
    });
    setTimeout(() => {
      setSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }, 500);
  };

  if (isLoading) {
    return (
      <SellerLayout>
        <div className="max-w-[1280px] mx-auto px-4 md:px-6 pt-6 pb-8 space-y-4">
          <div className="bg-white rounded-xl border border-black/[0.06] px-6 py-5 flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-5 w-36 rounded" />
              <Skeleton className="h-3.5 w-52 rounded" />
            </div>
            <Skeleton className="h-9 w-24 rounded-xl" />
          </div>
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-xl border border-black/[0.06] p-6 space-y-4"
            >
              <Skeleton className="h-4 w-32 rounded" />
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} className="space-y-1.5">
                  <Skeleton className="h-3 w-20 rounded" />
                  <Skeleton className="h-9 w-full rounded-md" />
                </div>
              ))}
            </div>
          ))}
        </div>
      </SellerLayout>
    );
  }

  return (
    <SellerLayout>
      <div className="max-w-[1280px] mx-auto px-4 md:px-6 pt-6 pb-8 space-y-4">
        {/* Header */}
        <div className="bg-white rounded-xl border border-black/[0.06] px-6 py-5 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold text-[#111]">Shop Settings</h1>
            <p className="text-sm text-[#888]">Manage your shop preferences</p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 h-9 px-5 rounded-xl text-white text-sm font-semibold transition-colors disabled:opacity-60"
            style={{ background: "#29a366" }}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saved ? "Saved!" : saving ? "Saving…" : "Save Changes"}
          </button>
        </div>

        {/* Verification Status */}
        <div
          className="rounded-xl border p-4"
          style={{
            background: (store as any)?.verified ? "#eff6ff" : "#fffbeb",
            borderColor: (store as any)?.verified ? "#bfdbfe" : "#fde68a",
          }}
        >
          <div className="flex items-center gap-2 mb-1">
            <Shield
              className="h-4 w-4"
              style={{
                color: (store as any)?.verified ? "#2563eb" : "#d97706",
              }}
            />
            <p
              className="text-sm font-semibold"
              style={{
                color: (store as any)?.verified ? "#1e40af" : "#92400e",
              }}
            >
              {(store as any)?.verified
                ? "✓ Seller Verified"
                : "⚠ Seller Unverified"}
            </p>
          </div>
          <p
            className="text-xs"
            style={{ color: (store as any)?.verified ? "#3b82f6" : "#b45309" }}
          >
            {(store as any)?.verified
              ? "Your shop is verified! Your products are publicly visible to all customers."
              : "Your shop is pending verification. Products are only visible to you until an admin approves your shop."}
          </p>
        </div>

        {/* Shop Profile */}
        <div className="bg-white rounded-xl border border-black/[0.06]">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-black/[0.05]">
            <div
              className="h-8 w-8 rounded-xl flex items-center justify-center"
              style={{ background: "#f0faf5" }}
            >
              <Store
                className="h-4 w-4"
                style={{ color: "#29a366" }}
                strokeWidth={1.8}
              />
            </div>
            <p className="text-sm font-semibold text-[#111]">Shop Profile</p>
          </div>
          <div className="p-6 space-y-5">
            {/* Logo upload */}
            <div
              className="flex items-center gap-4 cursor-pointer"
              onClick={() => logoInputRef.current?.click()}
            >
              <div className="w-16 h-16 rounded-xl border border-black/[0.08] bg-[#f2f2f0] flex items-center justify-center relative group overflow-hidden shrink-0">
                {form.imageUrl ? (
                  <img
                    src={form.imageUrl}
                    alt="Shop logo"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Store className="h-6 w-6 text-[#ccc]" />
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  {uploadingLogo ? (
                    <Loader2 className="h-4 w-4 text-white animate-spin" />
                  ) : (
                    <Camera className="h-4 w-4 text-white" />
                  )}
                </div>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoUpload}
                  disabled={uploadingLogo}
                />
              </div>
              <div>
                <p className="text-sm font-medium text-[#333]">Shop Logo</p>
                <p className="text-xs text-[#888]">
                  {uploadingLogo
                    ? "Uploading…"
                    : "Click to upload · 200×200px recommended"}
                </p>
              </div>
            </div>

            {/* QR PH upload */}
            <div
              className="flex items-center gap-4 cursor-pointer"
              onClick={() => qrInputRef.current?.click()}
            >
              <div className="w-16 h-16 rounded-xl border border-black/[0.08] bg-[#f2f2f0] flex items-center justify-center relative group overflow-hidden shrink-0">
                {form.qrphUrl ? (
                  <img
                    src={form.qrphUrl}
                    alt="QR PH"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-[10px] font-bold text-[#bbb]">
                    QR PH
                  </span>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  {uploadingQR ? (
                    <Loader2 className="h-4 w-4 text-white animate-spin" />
                  ) : (
                    <Camera className="h-4 w-4 text-white" />
                  )}
                </div>
                <input
                  ref={qrInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleQRUpload}
                  disabled={uploadingQR}
                />
              </div>
              <div>
                <p className="text-sm font-medium text-[#333]">QR PH Code</p>
                <p className="text-xs text-[#888]">
                  {uploadingQR
                    ? "Uploading…"
                    : form.qrphUrl
                      ? "Click to change QR code"
                      : "Click to upload QR PH code"}
                </p>
              </div>
            </div>

            <div className="border-t border-black/[0.04]" />

            <div>
              <label className={labelClass}>Shop Name</label>
              <input
                className={inputClass}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <label className={labelClass}>Description</label>
              <textarea
                className={`${inputClass} min-h-[80px] resize-none`}
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
              />
            </div>
            <div>
              <label className={labelClass}>Category</label>
              <Select
                value={form.category}
                onValueChange={(v) => setForm({ ...form, category: v })}
              >
                <SelectTrigger className="mt-0 rounded-md bg-[#f2f2f0] border-black/[0.08] focus:border-[#29a366] focus:bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[
                    "General",
                    "Jewelry",
                    "Clothing",
                    "Accessories",
                    "Home & Living",
                    "Food & Beverages",
                    "Vegetables",
                    "Fruits",
                  ].map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Fulfillment Options */}
        <div className="bg-white rounded-xl border border-black/[0.06]">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-black/[0.05]">
            <div
              className="h-8 w-8 rounded-xl flex items-center justify-center"
              style={{ background: "#f5f3ff" }}
            >
              <Truck
                className="h-4 w-4"
                style={{ color: "#7c3aed" }}
                strokeWidth={1.8}
              />
            </div>
            <p className="text-sm font-semibold text-[#111]">
              Fulfillment Options
            </p>
          </div>
          <div className="p-6 space-y-4">
            <p className="text-xs text-[#888]">
              Choose how customers can receive their orders. At least one option
              must be enabled.
            </p>

            <div className="flex items-center justify-between py-3 border-b border-black/[0.04]">
              <div className="flex items-center gap-3">
                <div
                  className="h-8 w-8 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: "#eff6ff" }}
                >
                  <Truck className="h-4 w-4 text-blue-600" strokeWidth={1.8} />
                </div>
                <div>
                  <p className="text-sm font-medium text-[#333]">Delivery</p>
                  <p className="text-xs text-[#888]">
                    Orders delivered to customer's address
                  </p>
                </div>
              </div>
              <Switch
                checked={form.offersDelivery}
                onCheckedChange={(checked) => {
                  if (!checked && !form.offersPickup) return;
                  setForm({ ...form, offersDelivery: checked });
                }}
              />
            </div>

            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <div
                  className="h-8 w-8 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: "#fff7ed" }}
                >
                  <MapPin
                    className="h-4 w-4 text-orange-600"
                    strokeWidth={1.8}
                  />
                </div>
                <div>
                  <p className="text-sm font-medium text-[#333]">Pickup</p>
                  <p className="text-xs text-[#888]">
                    Customers pick up orders at your shop
                  </p>
                </div>
              </div>
              <Switch
                checked={form.offersPickup}
                onCheckedChange={(checked) => {
                  if (!checked && !form.offersDelivery) return;
                  setForm({ ...form, offersPickup: checked });
                }}
              />
            </div>

            {!form.offersDelivery && form.offersPickup && (
              <p className="text-xs text-orange-600 bg-orange-50 rounded-xl px-3 py-2">
                Customers will only see "Pickup" as a fulfillment option.
              </p>
            )}
            {form.offersDelivery && !form.offersPickup && (
              <p className="text-xs text-blue-600 bg-blue-50 rounded-xl px-3 py-2">
                Customers will only see "Delivery" as a fulfillment option.
              </p>
            )}
          </div>
        </div>

        {/* Business Information */}
        <div className="bg-white rounded-xl border border-black/[0.06]">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-black/[0.05]">
            <div
              className="h-8 w-8 rounded-xl flex items-center justify-center"
              style={{ background: "#eff6ff" }}
            >
              <Globe className="h-4 w-4 text-blue-600" strokeWidth={1.8} />
            </div>
            <p className="text-sm font-semibold text-[#111]">
              Business Information
            </p>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className={labelClass}>City</label>
              <input
                className={inputClass}
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Barangay</label>
                <input
                  className={inputClass}
                  value={form.barangay}
                  onChange={(e) =>
                    setForm({ ...form, barangay: e.target.value })
                  }
                />
              </div>
              <div>
                <label className={labelClass}>Street</label>
                <input
                  className={inputClass}
                  value={form.street}
                  onChange={(e) => setForm({ ...form, street: e.target.value })}
                />
              </div>
            </div>

            <div className="border-t border-black/[0.04] pt-4">
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="h-8 w-8 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: "#fdf2f8" }}
                >
                  <Map className="h-4 w-4 text-pink-600" strokeWidth={1.8} />
                </div>
                <div>
                  <p className="text-sm font-medium text-[#333]">
                    Pin Your Store Location
                  </p>
                  <p className="text-xs text-[#888]">
                    Tap on the map to set your exact location for the Map tab.
                  </p>
                </div>
              </div>
              <LocationPickerMap
                latitude={form.latitude}
                longitude={form.longitude}
                onLocationChange={(lat, lng) =>
                  setForm({ ...form, latitude: lat, longitude: lng })
                }
              />
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-white rounded-xl border border-black/[0.06]">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-black/[0.05]">
            <div
              className="h-8 w-8 rounded-xl flex items-center justify-center"
              style={{ background: "#fefce8" }}
            >
              <Bell className="h-4 w-4 text-yellow-600" strokeWidth={1.8} />
            </div>
            <p className="text-sm font-semibold text-[#111]">Notifications</p>
          </div>
          <div className="divide-y divide-black/[0.04]">
            {[
              {
                label: "New Orders",
                desc: "Get notified when a new order is placed",
                defaultChecked: true,
              },
              {
                label: "Order Updates",
                desc: "Receive updates when order status changes",
                defaultChecked: true,
              },
              {
                label: "Product Reviews",
                desc: "Get notified about new product reviews",
                defaultChecked: true,
              },
              {
                label: "Marketing Emails",
                desc: "Receive promotional tips and offers",
                defaultChecked: false,
              },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between px-6 py-4"
              >
                <div>
                  <p className="text-sm font-medium text-[#333]">
                    {item.label}
                  </p>
                  <p className="text-xs text-[#888]">{item.desc}</p>
                </div>
                <Switch defaultChecked={item.defaultChecked} />
              </div>
            ))}
          </div>
        </div>

        {/* Privacy */}
        <div className="bg-white rounded-xl border border-black/[0.06]">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-black/[0.05]">
            <div
              className="h-8 w-8 rounded-xl flex items-center justify-center"
              style={{ background: "#f0faf5" }}
            >
              <Shield
                className="h-4 w-4"
                style={{ color: "#29a366" }}
                strokeWidth={1.8}
              />
            </div>
            <p className="text-sm font-semibold text-[#111]">
              Privacy & Visibility
            </p>
          </div>
          <div className="divide-y divide-black/[0.04]">
            {[
              {
                label: "Show Address",
                desc: "Display your business address publicly",
                defaultChecked: false,
              },
              {
                label: "Allow Messages",
                desc: "Let customers message you directly",
                defaultChecked: true,
              },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between px-6 py-4"
              >
                <div>
                  <p className="text-sm font-medium text-[#333]">
                    {item.label}
                  </p>
                  <p className="text-xs text-[#888]">{item.desc}</p>
                </div>
                <Switch defaultChecked={item.defaultChecked} />
              </div>
            ))}
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-white rounded-xl border border-red-100">
          <div className="px-6 py-4 border-b border-red-100">
            <p className="text-sm font-semibold text-red-600">Danger Zone</p>
          </div>
          <div className="divide-y divide-red-50">
            <div className="flex items-center justify-between px-6 py-4">
              <div>
                <p className="text-sm font-medium text-[#333]">
                  Deactivate Shop
                </p>
                <p className="text-xs text-[#888]">
                  Temporarily hide your shop from customers
                </p>
              </div>
              <button
                className="h-8 px-4 rounded-xl text-xs font-semibold border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                onClick={() => {
                  if (
                    !user ||
                    !confirm("Are you sure you want to deactivate your shop?")
                  )
                    return;
                  updateDocumentNonBlocking(supabase, "stores", user.uid, {
                    status: "inactive",
                    updatedAt: new Date().toISOString(),
                  });
                }}
              >
                Deactivate
              </button>
            </div>
            <div className="flex items-center justify-between px-6 py-4">
              <div>
                <p className="text-sm font-medium text-[#333]">Delete Shop</p>
                <p className="text-xs text-[#888]">
                  Permanently delete your shop and all data
                </p>
              </div>
              <button className="h-8 px-4 rounded-xl text-xs font-semibold border border-red-200 text-red-600 hover:bg-red-50 transition-colors">
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>
    </SellerLayout>
  );
}
