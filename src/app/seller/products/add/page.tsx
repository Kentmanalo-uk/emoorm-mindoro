"use client";

import React, { useState, useEffect, Suspense } from "react";
import { SellerLayout } from "@/components/layout/seller-layout";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  ImageIcon,
  Loader2,
  Package,
  DollarSign,
  Tag,
  FileText,
  Layers,
  Upload,
  X,
  Save,
  Gavel,
  CalendarClock,
  ShoppingCart,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useSupabaseAuth,
  useSupabase,
  useStableMemo,
  useDoc,
  addDocumentNonBlocking,
  updateDocumentNonBlocking,
} from "@/supabase";
import { uploadImage } from "@/lib/upload-image";

const categories = [
  "Jewelry",
  "Clothing",
  "Accessories",
  "Home & Living",
  "Food & Beverages",
  "Vegetables",
  "Fruits",
  "Seafood",
  "Handicrafts",
  "Health & Beauty",
  "Electronics",
  "General",
];

const inputClass =
  "w-full bg-[#f2f2f0] border border-black/[0.08] rounded-md px-3 py-2 text-sm text-[#111] outline-none focus:border-[#29a366] focus:bg-white transition-all";
const labelClass = "block text-xs font-medium text-[#555] mb-1.5";

const TABS = [
  { id: "regular", label: "Regular", icon: ShoppingCart },
  { id: "wholesale", label: "Wholesale", icon: Package },
  { id: "bidding", label: "Bidding", icon: Gavel },
] as const;

function AddProductPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  const isEditing = Boolean(editId);

  const { user } = useSupabaseAuth();
  const supabase = useSupabase();

  const storeRef = useStableMemo(() => {
    if (!user) return null;
    return { table: "stores", id: user.uid };
  }, [user]);
  const { data: store } = useDoc(storeRef);

  const productRef = useStableMemo(() => {
    if (!editId) return null;
    return { table: "facilities", id: editId };
  }, [editId]);
  const { data: existingProduct, isLoading: productLoading } =
    useDoc(productRef);

  const [form, setForm] = useState({
    name: "",
    price: "",
    stock: "",
    category: "",
    description: "",
    imageUrl: "",
    isAuction: false,
    startingBid: "",
    auctionEndDate: "",
    productType: "normal",
    minimumBulkQuantity: "",
    bulkPricePerUnit: "",
  });
  const [formLoaded, setFormLoaded] = useState(false);
  const [adding, setAdding] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "regular" | "wholesale" | "bidding"
  >("regular");
  const imageInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && existingProduct && !formLoaded) {
      const p = existingProduct as any;
      setForm({
        name: p.name || "",
        price: p.price?.toString() || "",
        stock: p.stock?.toString() || "",
        category: p.category || p.type || "",
        description: p.description || "",
        imageUrl: p.imageUrl || "",
        isAuction: p.isAuction || false,
        startingBid: p.startingBid?.toString() || "",
        auctionEndDate: p.auctionEndDate ? p.auctionEndDate.slice(0, 16) : "",
        productType: p.productType || "normal",
        minimumBulkQuantity: p.minimumBulkQuantity?.toString() || "",
        bulkPricePerUnit: p.bulkPricePerUnit?.toString() || "",
      });
      setActiveTab(
        p.isAuction
          ? "bidding"
          : p.productType === "wholesale"
            ? "wholesale"
            : "regular",
      );
      setFormLoaded(true);
    }
  }, [isEditing, existingProduct, formLoaded]);

  const updateField = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploadingImage(true);
    try {
      const url = await uploadImage(
        supabase,
        "products",
        file,
        `${user.uid}/${form.name || "product"}`,
      );
      setForm((prev) => ({ ...prev, imageUrl: url }));
    } catch {
      alert("Failed to upload image.");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async () => {
    if (!user || !form.name) return;
    if (activeTab === "regular" && !form.price) return;
    if (
      activeTab === "wholesale" &&
      (!form.price || !form.minimumBulkQuantity || !form.bulkPricePerUnit)
    )
      return;
    if (activeTab === "bidding" && !form.startingBid) return;
    setAdding(true);

    const isAuctionMode = activeTab === "bidding";
    const isWholesaleMode = activeTab === "wholesale";

    const productData: Record<string, any> = {
      name: form.name,
      price: isAuctionMode ? 0 : Number(form.price) || 0,
      stock: isAuctionMode ? 1 : Number(form.stock) || 0,
      category: form.category || "General",
      description: form.description,
      imageUrl: form.imageUrl || "",
      sellerId: user.uid,
      sellerName: (store as any)?.name || "",
      storeId: user.uid,
      status: "Available",
      rating: 5.0,
      type: form.category || "General",
      sold:
        isEditing &&
        existingProduct &&
        typeof (existingProduct as any).sold === "number"
          ? (existingProduct as any).sold
          : 0,
      updatedAt: new Date().toISOString(),
      isAuction: isAuctionMode,
      startingBid: isAuctionMode ? Number(form.startingBid) || 0 : 0,
      currentBid:
        isEditing && existingProduct
          ? (existingProduct as any).currentBid || 0
          : 0,
      currentBidderId:
        isEditing && existingProduct
          ? (existingProduct as any).currentBidderId || null
          : null,
      bidCount:
        isEditing && existingProduct
          ? (existingProduct as any).bidCount || 0
          : 0,
      auctionEndDate:
        isAuctionMode && form.auctionEndDate
          ? new Date(form.auctionEndDate).toISOString()
          : null,
      productType: isWholesaleMode ? "wholesale" : "normal",
      minimumBulkQuantity: isWholesaleMode
        ? Number(form.minimumBulkQuantity) || 0
        : 0,
      bulkPricePerUnit: isWholesaleMode
        ? Number(form.bulkPricePerUnit) || 0
        : 0,
    };

    if (isEditing && editId) {
      await updateDocumentNonBlocking(
        supabase,
        "facilities",
        editId,
        productData,
      );
    } else {
      await addDocumentNonBlocking(supabase, "facilities", {
        ...productData,
        createdAt: new Date().toISOString(),
      });
    }
    setAdding(false);
    router.push("/seller/products");
  };

  const isValid = () => {
    if (!form.name.trim() || !form.category.trim()) return false;
    if (activeTab === "regular") return form.price.trim() !== "";
    if (activeTab === "wholesale")
      return (
        form.price.trim() !== "" &&
        form.minimumBulkQuantity.trim() !== "" &&
        form.bulkPricePerUnit.trim() !== ""
      );
    if (activeTab === "bidding") return form.startingBid.trim() !== "";
    return false;
  };

  return (
    <SellerLayout>
      <div className="max-w-[1280px] mx-auto px-4 md:px-6 pt-6 pb-8 space-y-4">
        {/* Header */}
        <div className="bg-white rounded-xl border border-black/[0.06] px-6 py-5 flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="h-8 w-8 rounded-xl border border-black/[0.08] bg-[#f2f2f0] flex items-center justify-center text-[#555] hover:bg-[#e8e8e6] transition-colors shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-lg font-semibold text-[#111]">
              {isEditing ? "Edit Product" : "Add Product"}
            </h1>
            <p className="text-sm text-[#888]">
              {isEditing
                ? "Update your product details"
                : "Fill in the details to list a new product"}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left: Image + Basic Info */}
          <div className="lg:col-span-1 space-y-4">
            {/* Image Upload */}
            <div className="bg-white rounded-xl border border-black/[0.06] overflow-hidden">
              <p className="text-xs font-semibold text-[#555] px-4 pt-4 pb-3 border-b border-black/[0.05]">
                Product Image
              </p>
              <div
                className="aspect-square bg-[#f2f2f0] relative flex items-center justify-center overflow-hidden cursor-pointer group"
                onClick={() => imageInputRef.current?.click()}
              >
                {form.imageUrl ? (
                  <>
                    <img
                      src={form.imageUrl}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs font-semibold flex items-center gap-1.5 bg-black/40 px-3 py-1.5 rounded-xl">
                        <Upload className="h-3.5 w-3.5" /> Change Image
                      </span>
                    </div>
                    <button
                      type="button"
                      className="absolute top-2 right-2 p-1 rounded-xl bg-white/90 border border-black/[0.08] text-[#555] hover:bg-red-50 hover:text-red-600 transition-colors z-10"
                      onClick={(e) => {
                        e.stopPropagation();
                        setForm((prev) => ({ ...prev, imageUrl: "" }));
                      }}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-[#ccc] group-hover:text-[#aaa] transition-colors">
                    {uploadingImage ? (
                      <>
                        <Loader2 className="h-8 w-8 animate-spin" />
                        <span className="text-xs">Uploading…</span>
                      </>
                    ) : (
                      <>
                        <Upload className="h-8 w-8" />
                        <span className="text-xs font-medium">
                          Click to upload
                        </span>
                        <span className="text-[10px]">
                          JPG, PNG, WebP up to 5MB
                        </span>
                      </>
                    )}
                  </div>
                )}
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                  disabled={uploadingImage}
                />
              </div>
            </div>
          </div>

          {/* Right: Form */}
          <div className="lg:col-span-2 space-y-4">
            {/* Basic Info */}
            <div className="bg-white rounded-xl border border-black/[0.06]">
              <div className="flex items-center gap-3 px-5 py-4 border-b border-black/[0.05]">
                <Package className="h-4 w-4 text-[#888]" strokeWidth={1.8} />
                <p className="text-sm font-semibold text-[#111]">
                  Product Info
                </p>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className={labelClass}>
                    Product Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    className={inputClass}
                    placeholder="e.g. Fresh Calamansi"
                    value={form.name}
                    onChange={(e) => updateField("name", e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelClass}>
                    Category <span className="text-red-500">*</span>
                  </label>
                  <Select
                    value={form.category}
                    onValueChange={(v) => updateField("category", v)}
                  >
                    <SelectTrigger className="rounded-md bg-[#f2f2f0] border-black/[0.08]">
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className={labelClass}>Description</label>
                  <textarea
                    className={`${inputClass} min-h-[100px] resize-none`}
                    placeholder="Describe your product — quality, origin, size, etc."
                    value={form.description}
                    onChange={(e) => updateField("description", e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Listing Type */}
            <div className="bg-white rounded-xl border border-black/[0.06]">
              <div className="flex items-center gap-3 px-5 py-4 border-b border-black/[0.05]">
                <Tag className="h-4 w-4 text-[#888]" strokeWidth={1.8} />
                <p className="text-sm font-semibold text-[#111]">
                  Listing Type
                </p>
              </div>
              <div className="p-5 space-y-4">
                {/* Tab pills */}
                <div className="flex gap-2">
                  {TABS.map((t) => {
                    const Icon = t.icon;
                    const active = activeTab === t.id;
                    return (
                      <button
                        key={t.id}
                        onClick={() => setActiveTab(t.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                        style={
                          active
                            ? { background: "#29a366", color: "#fff" }
                            : { background: "#f2f2f0", color: "#555" }
                        }
                      >
                        <Icon className="h-3.5 w-3.5" /> {t.label}
                      </button>
                    );
                  })}
                </div>

                {/* Regular */}
                {activeTab === "regular" && (
                  <div className="space-y-4">
                    <div
                      className="text-xs text-[#888] px-3 py-2 rounded-xl"
                      style={{ background: "#eff6ff", color: "#2563eb" }}
                    >
                      <strong>Regular Product</strong> — Customers buy directly
                      at your set price
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={labelClass}>
                          Price (₱) <span className="text-red-500">*</span>
                        </label>
                        <input
                          className={inputClass}
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          value={form.price}
                          onChange={(e) => updateField("price", e.target.value)}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Stock</label>
                        <input
                          className={inputClass}
                          type="number"
                          min="0"
                          placeholder="0"
                          value={form.stock}
                          onChange={(e) => updateField("stock", e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Wholesale */}
                {activeTab === "wholesale" && (
                  <div className="space-y-4">
                    <div
                      className="text-xs px-3 py-2 rounded-xl"
                      style={{ background: "#fffbeb", color: "#92400e" }}
                    >
                      <strong>Wholesale/Bulk Product</strong> — For bulk buyers
                      with minimum quantity requirements
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={labelClass}>Regular Price (₱)</label>
                        <input
                          className={inputClass}
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          value={form.price}
                          onChange={(e) => updateField("price", e.target.value)}
                        />
                        <p className="text-[11px] text-[#aaa] mt-1">
                          Price per regular unit
                        </p>
                      </div>
                      <div>
                        <label className={labelClass}>Total Stock</label>
                        <input
                          className={inputClass}
                          type="number"
                          min="0"
                          placeholder="0"
                          value={form.stock}
                          onChange={(e) => updateField("stock", e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-3 border-t border-black/[0.04]">
                      <div>
                        <label className={labelClass}>
                          Minimum Quantity{" "}
                          <span className="text-red-500">*</span>
                        </label>
                        <input
                          className={inputClass}
                          type="number"
                          min="1"
                          placeholder="e.g. 10"
                          value={form.minimumBulkQuantity}
                          onChange={(e) =>
                            updateField("minimumBulkQuantity", e.target.value)
                          }
                        />
                        <p className="text-[11px] text-[#aaa] mt-1">
                          Minimum units per order
                        </p>
                      </div>
                      <div>
                        <label className={labelClass}>
                          Bulk Price/Unit (₱){" "}
                          <span className="text-red-500">*</span>
                        </label>
                        <input
                          className={inputClass}
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          value={form.bulkPricePerUnit}
                          onChange={(e) =>
                            updateField("bulkPricePerUnit", e.target.value)
                          }
                        />
                        <p className="text-[11px] text-[#aaa] mt-1">
                          Discounted bulk rate
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Bidding */}
                {activeTab === "bidding" && (
                  <div className="space-y-4">
                    <div
                      className="text-xs px-3 py-2 rounded-xl"
                      style={{ background: "#f0faf5", color: "#166534" }}
                    >
                      <strong>Auction / Bidding</strong> — Let buyers place
                      bids. Highest bidder wins
                    </div>
                    <div>
                      <label className={labelClass}>
                        Starting Bid (₱) <span className="text-red-500">*</span>
                      </label>
                      <input
                        className={inputClass}
                        type="number"
                        min="1"
                        step="0.01"
                        placeholder="0.00"
                        value={form.startingBid}
                        onChange={(e) =>
                          updateField("startingBid", e.target.value)
                        }
                      />
                      <p className="text-[11px] text-[#aaa] mt-1">
                        The minimum bid amount to start
                      </p>
                    </div>
                    <div>
                      <label className={labelClass}>
                        Auction End Date & Time
                      </label>
                      <input
                        className={inputClass}
                        type="datetime-local"
                        value={form.auctionEndDate}
                        min={new Date().toISOString().slice(0, 16)}
                        onChange={(e) =>
                          updateField("auctionEndDate", e.target.value)
                        }
                      />
                      <p className="text-[11px] text-[#aaa] mt-1">
                        Leave empty for no end date (manual close)
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => router.back()}
                className="flex-1 h-10 rounded-xl border border-black/[0.08] bg-white text-sm font-semibold text-[#555] hover:bg-[#f2f2f0] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={adding || !isValid()}
                className="flex-1 h-10 rounded-xl text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                style={{ background: "#29a366" }}
              >
                {adding ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />{" "}
                    {isEditing ? "Saving…" : "Adding…"}
                  </>
                ) : (
                  <>
                    {isEditing ? (
                      <Save className="h-4 w-4" />
                    ) : (
                      <Package className="h-4 w-4" />
                    )}{" "}
                    {isEditing ? "Save Changes" : "Add Product"}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </SellerLayout>
  );
}

export default function AddProductPage() {
  return (
    <Suspense
      fallback={
        <SellerLayout>
          <div className="flex items-center justify-center min-h-[60vh]">
            <Loader2
              className="h-8 w-8 animate-spin"
              style={{ color: "#29a366" }}
            />
          </div>
        </SellerLayout>
      }
    >
      <AddProductPageInner />
    </Suspense>
  );
}
