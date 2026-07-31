"use client";

import React, { useState, useMemo, useRef, useCallback } from "react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import {
  MapPin,
  CreditCard,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  Store,
  Package,
  Upload,
  Clock,
  QrCode,
  Download,
  MessageSquare,
} from "lucide-react";
import { FirstTimeIntro } from "@/components/first-time-intro";
import { QRCodeCanvas } from "qrcode.react";
import { cn } from "@/lib/utils";
import {
  useUser,
  useSupabase,
  useCollection,
  useStableMemo,
  useDoc,
  addDocumentNonBlocking,
  updateDocumentNonBlocking,
} from "@/supabase";
import {
  sendOrderAutoMessage,
  sendGcashProofMessage,
} from "@/lib/auto-message";
import type { FilterOp } from "@/supabase/use-collection";
import Image from "next/image";
import { useRouter } from "next/navigation";
import confetti from "canvas-confetti";
import { Skeleton } from "@/components/ui/skeleton";

interface CartItem {
  id: string;
  productId: string;
  quantity: number;
}

interface Product {
  id: string;
  name: string;
  price: number;
  pricePerNight?: number;
  imageUrl: string;
  stock: number;
  storeId?: string;
  sellerId?: string;
  sellerName?: string;
}

interface UserProfile {
  firstName: string;
  lastName: string;
  mobile: string;
  province: string;
  city: string;
  barangay: string;
  street: string;
  addresses?: Array<{
    label: string;
    fullName: string;
    mobile: string;
    province: string;
    city: string;
    barangay: string;
    street: string;
  }>;
}

type Step = 1 | 2 | 3;

export default function CheckoutPage() {
  const { user, isUserLoading } = useUser();
  const supabase = useSupabase();
  const router = useRouter();

  const [paymentMethod, setPaymentMethod] = useState<string>("cod");
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [codOrderIds, setCodOrderIds] = useState<string[]>([]);
  const [fulfillmentMethod, setFulfillmentMethod] =
    useState<string>("delivery");
  // Address book
  const [selectedAddressIdx, setSelectedAddressIdx] = useState<number>(0);
  const [newAddress, setNewAddress] = useState({
    label: "",
    fullName: "",
    mobile: "",
    province: "Oriental Mindoro",
    city: "",
    barangay: "",
    street: "",
  });
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrTimeout, setQRTimeout] = useState(600); // 10 min in seconds
  const [qrProof, setQRProof] = useState<File | null>(null);
  const [qrProofUrl, setQRProofUrl] = useState<string>("");
  const [qrRef, setQRRef] = useState("");
  const [qrUploading, setQRUploading] = useState(false);
  const [gcashStep, setGcashStep] = useState<"scan" | "proof">("scan");
  // Timer effect
  React.useEffect(() => {
    if (!showQRModal || qrTimeout <= 0) return;
    const timer = setInterval(() => setQRTimeout((t) => t - 1), 1000);
    return () => clearInterval(timer);
  }, [showQRModal, qrTimeout]);
  const [showAddAddress, setShowAddAddress] = useState(false);

  // PSGC API: Oriental Mindoro cities & barangays
  const ORIENTAL_MINDORO_CODE = "175200000";
  const [addrCities, setAddrCities] = useState<any[]>([]);
  const [addrBarangays, setAddrBarangays] = useState<any[]>([]);
  const [addrCityCode, setAddrCityCode] = useState("");

  React.useEffect(() => {
    fetch(
      `https://psgc.gitlab.io/api/provinces/${ORIENTAL_MINDORO_CODE}/municipalities.json`,
    )
      .then((res) => res.json())
      .then((data) =>
        setAddrCities(
          data.sort((a: any, b: any) => a.name.localeCompare(b.name)),
        ),
      )
      .catch(() => { });
  }, []);

  React.useEffect(() => {
    if (!addrCityCode) {
      setAddrBarangays([]);
      return;
    }
    fetch(
      `https://psgc.gitlab.io/api/municipalities/${addrCityCode}/barangays.json`,
    )
      .then((res) => res.json())
      .then((data) =>
        setAddrBarangays(
          data.sort((a: any, b: any) => a.name.localeCompare(b.name)),
        ),
      )
      .catch(() => { });
  }, [addrCityCode]);

  const cartQuery = useStableMemo(() => {
    if (!user) return null;
    return {
      table: "cart_items",
      filters: [{ column: "userId", op: "eq" as FilterOp, value: user.uid }],
    };
  }, [user]);

  const { data: cartData } = useCollection<CartItem>(cartQuery);

  const productsQuery = useStableMemo(() => {
    return { table: "facilities" };
  }, []);

  const { data: productsData } = useCollection<Product>(productsQuery);

  const userProfileRef = useStableMemo(() => {
    if (!user) return null;
    return { table: "users", id: user.uid };
  }, [user]);

  const { data: userProfile } = useDoc<UserProfile>(userProfileRef);

  // Address book logic
  const [addressBook, setAddressBook] = useState<UserProfile["addresses"]>([]);
  React.useEffect(() => {
    if (userProfile) {
      // Use addresses array if exists, else fallback to profile address
      if (userProfile.addresses && userProfile.addresses.length > 0) {
        setAddressBook(userProfile.addresses);
      } else {
        setAddressBook([
          {
            label: "Default",
            fullName:
              `${userProfile.firstName || ""} ${userProfile.lastName || ""}`.trim(),
            mobile: userProfile.mobile || "",
            province: userProfile.province || "Oriental Mindoro",
            city: userProfile.city || "",
            barangay: userProfile.barangay || "",
            street: userProfile.street || "",
          },
        ]);
      }
    }
  }, [userProfile]);

  // Get selected item IDs from localStorage (set by cart page)
  const [checkoutSelectedIds, setCheckoutSelectedIds] = useState<
    string[] | null
  >(null);
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem("checkout_selected_ids");
      if (raw) {
        setCheckoutSelectedIds(JSON.parse(raw));
      }
    } catch { }
  }, []);

  // Group cart items by storeId — filtered to selected items only
  const cartItems = useMemo(() => {
    if (!cartData || !productsData) return [];
    const all = cartData
      .map((c) => {
        const product = productsData.find((p) => p.id === c.productId);
        return product ? { ...c, product } : null;
      })
      .filter(Boolean) as (CartItem & { product: Product })[];
    // If we have a selection, filter to only those items
    if (checkoutSelectedIds && checkoutSelectedIds.length > 0) {
      const idSet = new Set(checkoutSelectedIds);
      return all.filter((item) => idSet.has(item.id));
    }
    return all;
  }, [cartData, productsData, checkoutSelectedIds]);

  // Group items by storeId
  const itemsByStore = useMemo(() => {
    const groups: Record<
      string,
      { storeId: string; items: (CartItem & { product: Product })[] }
    > = {};
    for (const item of cartItems) {
      const storeId = item.product.storeId || "unknown";
      if (!groups[storeId]) {
        groups[storeId] = { storeId, items: [] };
      }
      groups[storeId].items.push(item);
    }
    return Object.values(groups);
  }, [cartItems]);

  // Fetch all unique storeIds
  const storeIds = useMemo(
    () => itemsByStore.map((g) => g.storeId).filter((id) => id !== "unknown"),
    [itemsByStore],
  );

  // Fetch store data for all storeIds
  const storesQuery = useStableMemo(() => {
    if (!storeIds.length) return null;
    return {
      table: "stores",
      filters: [
        {
          column: "id",
          op: "in" as FilterOp,
          value: `(${storeIds.join(",")})`,
        },
      ],
    };
  }, [storeIds]);
  const { data: storesData } = useCollection<any>(storesQuery);

  // Helper to get store name by id
  const getStoreName = (storeId: string) => {
    if (!storesData) return "Shop";
    const store = storesData.find((s: any) => s.id === storeId);
    return store?.name || "Shop";
  };

  // Determine fulfillment options available across all stores in cart
  const fulfillmentAvailability = useMemo(() => {
    if (!storesData || storesData.length === 0)
      return { delivery: true, pickup: true };
    // All stores must offer delivery for delivery to be available
    // All stores must offer pickup for pickup to be available
    let allOfferDelivery = true;
    let allOfferPickup = true;
    for (const group of itemsByStore) {
      const store = storesData.find((s: any) => s.id === group.storeId);
      if (store) {
        if (store.offersDelivery === false) allOfferDelivery = false;
        if (store.offersPickup === false) allOfferPickup = false;
      }
    }
    // Fallback: if somehow both are false, allow both (safety net)
    if (!allOfferDelivery && !allOfferPickup)
      return { delivery: true, pickup: true };
    return { delivery: allOfferDelivery, pickup: allOfferPickup };
  }, [storesData, itemsByStore]);

  // Auto-select a valid fulfillment method when availability changes
  React.useEffect(() => {
    if (!fulfillmentAvailability.delivery && fulfillmentMethod === "delivery") {
      setFulfillmentMethod("pickup");
    } else if (
      !fulfillmentAvailability.pickup &&
      fulfillmentMethod === "pickup"
    ) {
      setFulfillmentMethod("delivery");
    }
  }, [fulfillmentAvailability, fulfillmentMethod]);

  const totalPrice = useMemo(() => {
    return cartItems.reduce(
      (sum, item) =>
        sum +
        (item.product.price || item.product.pricePerNight || 0) * item.quantity,
      0,
    );
  }, [cartItems]);

  const shippingFee = 50;
  const grandTotal = totalPrice + shippingFee;

  const selectedAddress =
    (addressBook && addressBook[selectedAddressIdx]) || newAddress;
  const formattedAddress = [
    selectedAddress.street,
    selectedAddress.barangay,
    selectedAddress.city,
    selectedAddress.province,
  ]
    .filter(Boolean)
    .join(", ");

  const canPlaceOrder = () => {
    return (
      selectedAddress.fullName &&
      selectedAddress.mobile &&
      selectedAddress.city &&
      paymentMethod
    );
  };

  const handlePlaceOrder = async () => {
    if (!user || isProcessing) return;

    // If GCash selected, show QR modal instead of placing order directly
    if (paymentMethod === "gcash") {
      setShowQRModal(true);
      setGcashStep("scan");
      setQRTimeout(600);
      setQRProof(null);
      setQRProofUrl("");
      setQRRef("");
      return;
    }

    setIsProcessing(true);
    try {
      const createdIds: string[] = [];
      // Create order for each cart item
      for (const item of cartItems) {
        const orderData = {
          userId: user.uid,
          facilityId: item.product.id,
          storeId: item.product.storeId || null,
          quantity: item.quantity,
          totalPrice:
            (item.product.price || item.product.pricePerNight || 0) *
            item.quantity,
          paymentMethod,
          fulfillmentMethod,
          status: "To Pay",
          shippingAddress: formattedAddress,
          bookingDate: new Date().toISOString(),
          startDate: new Date().toISOString(),
          endDate: new Date().toISOString(),
          numberOfGuests: item.quantity,
          createdAt: new Date().toISOString(),
        };
        const bookingId = await addDocumentNonBlocking(
          supabase,
          "bookings",
          orderData,
        );
        if (bookingId?.id) createdIds.push(bookingId.id);
        // Auto-message seller after order placed
        if (item.product.storeId && storesData) {
          const store = storesData.find(
            (s: any) => s.id === item.product.storeId,
          );
          if (store && store.sellerId) {
            sendOrderAutoMessage({
              buyerId: user.uid,
              sellerId: store.sellerId,
              storeName: store.name,
              orderId: bookingId?.id || "",
            });
            // Notify seller about the new order
            supabase.from("notifications").insert({
              userId: store.sellerId,
              title: "New order received!",
              content: `Order for "${item.product.name}" (x${item.quantity}) — ₱${((item.product.price || item.product.pricePerNight || 0) * item.quantity).toLocaleString()}`,
              type: "order",
              timestamp: new Date().toISOString(),
              isRead: false,
            });
          }
        }
      }
      // Notify buyer about order confirmation
      supabase.from("notifications").insert({
        userId: user.uid,
        title: "Order placed successfully!",
        content: `Your order of ${cartItems.length} item(s) has been placed. Total: ₱${cartItems.reduce((sum, i) => sum + (i.product.price || i.product.pricePerNight || 0) * i.quantity, 0).toLocaleString()}`,
        type: "order",
        timestamp: new Date().toISOString(),
        isRead: false,
      });
      // Clear cart
      for (const item of cartItems) {
        await supabase.from("cart_items").delete().eq("id", item.id);
      }
      localStorage.removeItem("checkout_selected_ids");
      if (paymentMethod === "cod" && createdIds.length > 0) {
        setCodOrderIds(createdIds);
      }
      setOrderSuccess(true);
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch (error) {
      console.error("Order error:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle GCash order submit (after proof upload)
  const handleGcashSubmit = async () => {
    if (!user || !qrProofUrl || !qrRef) return;
    setIsProcessing(true);
    try {
      const orderIds: string[] = [];
      for (const item of cartItems) {
        const orderData = {
          userId: user.uid,
          facilityId: item.product.id,
          storeId: item.product.storeId || null,
          quantity: item.quantity,
          totalPrice:
            (item.product.price || item.product.pricePerNight || 0) *
            item.quantity,
          paymentMethod: "gcash",
          status: "To Pay",
          fulfillmentMethod,
          shippingAddress: formattedAddress,
          bookingDate: new Date().toISOString(),
          startDate: new Date().toISOString(),
          endDate: new Date().toISOString(),
          numberOfGuests: item.quantity,
          createdAt: new Date().toISOString(),
          gcashProofUrl: qrProofUrl,
          gcashRef: qrRef,
        };
        const bookingId = await addDocumentNonBlocking(
          supabase,
          "bookings",
          orderData,
        );
        if (bookingId?.id) orderIds.push(bookingId.id);
        // Send proof + details to seller via message
        if (item.product.storeId && storesData) {
          const store = storesData.find(
            (s: any) => s.id === item.product.storeId,
          );
          if (store && store.sellerId) {
            sendGcashProofMessage({
              buyerId: user.uid,
              sellerId: store.sellerId,
              storeName: store.name,
              orderId: bookingId?.id || "",
              gcashRef: qrRef,
              gcashProofUrl: qrProofUrl,
              amount:
                (item.product.price || item.product.pricePerNight || 0) *
                item.quantity,
              date: new Date().toLocaleString(),
            });
            // Notify seller about the GCash order
            supabase.from("notifications").insert({
              userId: store.sellerId,
              title: "New GCash order received!",
              content: `Order for "${item.product.name}" (x${item.quantity}) — ₱${((item.product.price || item.product.pricePerNight || 0) * item.quantity).toLocaleString()}. GCash Ref: ${qrRef}`,
              type: "order",
              timestamp: new Date().toISOString(),
              isRead: false,
            });
          }
        }
      }
      // Notify buyer about GCash order confirmation
      supabase.from("notifications").insert({
        userId: user.uid,
        title: "GCash order placed!",
        content: `Your order of ${cartItems.length} item(s) has been placed via GCash. Ref: ${qrRef}`,
        type: "order",
        timestamp: new Date().toISOString(),
        isRead: false,
      });
      for (const item of cartItems) {
        await supabase.from("cart_items").delete().eq("id", item.id);
      }
      setShowQRModal(false);
      localStorage.removeItem("checkout_selected_ids");
      setOrderSuccess(true);
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch (error) {
      console.error("GCash Order error:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle QR proof upload
  const handleQRProofUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setQRUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const filePath = `gcash-proofs/${user.uid}_${Date.now()}.${ext}`;
      const { data, error } = await supabase.storage
        .from("products")
        .upload(filePath, file, { upsert: true });
      if (error) throw error;
      const { data: urlData } = supabase.storage
        .from("products")
        .getPublicUrl(data.path);
      setQRProofUrl(urlData.publicUrl);
      setQRProof(file);
    } catch (err) {
      alert("Failed to upload payment proof.");
    } finally {
      setQRUploading(false);
    }
  };

  // Save new address to address book
  const handleSaveNewAddress = async () => {
    if (!user) return;
    const updatedAddresses = [...(addressBook || []), newAddress];
    await supabase
      .from("users")
      .update({ addresses: updatedAddresses })
      .eq("id", user.uid);
    setAddressBook(updatedAddresses);
    setShowAddAddress(false);
    setNewAddress({
      label: "",
      fullName: "",
      mobile: "",
      province: "Oriental Mindoro",
      city: "",
      barangay: "",
      street: "",
    });
    setAddrCityCode("");
    setAddrBarangays([]);
    setSelectedAddressIdx(updatedAddresses.length - 1);
  };

  // Download QR as image
  const handleDownloadQR = useCallback((orderId: string) => {
    const canvas = document.getElementById(
      `cod-qr-${orderId}`,
    ) as HTMLCanvasElement | null;
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `order-${orderId.slice(0, 8)}-qr.png`;
    a.click();
  }, []);

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (isUserLoading)
    return (
      <div className="flex min-h-screen flex-col bg-[#f2f2f0]">
        <Header />
        <main className="flex-grow max-w-[1280px] mx-auto px-4 md:px-8 pt-8 pb-24 w-full">
          <div className="mb-6">
            <Skeleton className="h-6 w-28 mb-2" />
            <Skeleton className="h-4 w-40" />
          </div>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="flex gap-4 p-4 bg-white border border-black/[0.06]"
              >
                <Skeleton className="h-20 w-20 shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-5 w-20" />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 bg-white border border-black/[0.06] p-5 space-y-4">
            <Skeleton className="h-5 w-32" />
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
            <Skeleton className="h-12 w-full mt-4" />
          </div>
        </main>
        <Footer />
      </div>
    );

  if (!user) {
    router.push("/login");
    return null;
  }

  // ── Order success — COD with QR codes ─────────────────────────────────────
  if (orderSuccess) {
    if (codOrderIds.length > 0) {
      const baseUrl =
        typeof window !== "undefined" ? window.location.origin : "";
      return (
        <div className="flex min-h-screen flex-col bg-[#f2f2f0]">
          <Header />
          <main className="flex-grow max-w-[1280px] mx-auto px-4 md:px-8 py-12 w-full">
            <div className="max-w-lg mx-auto">
              <div className="bg-white border border-black/[0.06] p-8 text-center">
                <div className="h-16 w-16 bg-green-100 mx-auto mb-5 flex items-center justify-center">
                  <CheckCircle2 className="h-8 w-8 text-green-600" />
                </div>
                <h2 className="text-2xl font-semibold text-[#111] mb-2">
                  Order Placed!
                </h2>
                <p className="text-sm text-gray-500 mb-1">
                  Cash on Delivery selected. Show this QR code to the seller when
                  paying.
                </p>
                <p className="text-xs text-gray-400 mb-8">
                  The seller can scan this QR to view your order and confirm your
                  payment.
                </p>

                <div className="space-y-4">
                  {codOrderIds.map((orderId, idx) => (
                    <div
                      key={orderId}
                      className="bg-[#f2f2f0] border border-black/[0.06] p-5"
                    >
                      {codOrderIds.length > 1 && (
                        <p className="text-xs font-semibold text-gray-500 mb-2">
                          Order {idx + 1} of {codOrderIds.length}
                        </p>
                      )}
                      <p className="text-xs font-mono text-gray-400 mb-4">
                        ID: {orderId.slice(0, 12)}...
                      </p>
                      <div className="bg-white border border-black/[0.06] p-4 inline-block mb-4">
                        <QRCodeCanvas
                          id={`cod-qr-${orderId}`}
                          value={`${baseUrl}/orders/${orderId}`}
                          size={200}
                          level="H"
                          includeMargin
                        />
                      </div>
                      <div className="flex gap-3 justify-center">
                        <button
                          onClick={() => handleDownloadQR(orderId)}
                          className="border border-gray-200 text-gray-700 font-semibold px-4 py-2 rounded-md hover:bg-gray-50 transition-colors flex items-center gap-2 text-sm"
                        >
                          <Download className="h-4 w-4" /> Save QR
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex flex-col md:flex-row gap-3 justify-center mt-8">
                  <button
                    onClick={() => router.push("/my-bookings")}
                    className="bg-[#29a366] text-white font-semibold px-6 py-3 rounded-md hover:bg-[#23905a] transition-colors"
                  >
                    View Orders
                  </button>
                  <button
                    onClick={() => router.push("/")}
                    className="border border-gray-200 text-gray-700 font-semibold px-6 py-3 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    Continue Shopping
                  </button>
                </div>
              </div>
            </div>
          </main>
          <Footer />
        </div>
      );
    }

    // ── Order success — default (non-COD) ─────────────────────────────────
    return (
      <div className="flex min-h-screen flex-col bg-[#f2f2f0]">
        <Header />
        <main className="flex-grow max-w-[1280px] mx-auto px-4 md:px-8 py-12 w-full">
          <div className="max-w-md mx-auto bg-white border border-black/[0.06] p-10 text-center">
            <div className="h-16 w-16 bg-green-100 mx-auto mb-5 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-semibold text-[#111] mb-2">
              Order Placed!
            </h2>
            <p className="text-sm text-gray-500 mb-8">
              Your order has been placed successfully. You can track it in My
              Orders.
            </p>
            <div className="flex flex-col md:flex-row gap-3 justify-center">
              <button
                onClick={() => router.push("/my-bookings")}
                className="bg-[#29a366] text-white font-semibold px-6 py-3 rounded-md hover:bg-[#23905a] transition-colors"
              >
                View Orders
              </button>
              <button
                onClick={() => router.push("/")}
                className="border border-gray-200 text-gray-700 font-semibold px-6 py-3 rounded-md hover:bg-gray-50 transition-colors"
              >
                Continue Shopping
              </button>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // ── GCash / QR Payment Modal ───────────────────────────────────────────────
  const qrStore =
    storesData && itemsByStore.length === 1
      ? storesData.find((s: any) => s.id === itemsByStore[0].storeId)
      : null;
  const qrphUrl = qrStore?.qrphUrl;

  const QRModal = showQRModal && (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-black/[0.06] p-6 w-full max-w-md relative shadow-2xl max-h-[90vh] overflow-y-auto">
        <button
          className="absolute top-4 right-4 text-gray-400 hover:text-black text-2xl leading-none"
          onClick={() => setShowQRModal(false)}
        >
          &times;
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-blue-50 text-blue-600">
            <QrCode className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-[#111]">
              Pay via GCash
            </h2>
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <Clock className="h-3 w-3" />
              <span>
                Time remaining:{" "}
                <span className="font-bold text-black">
                  {Math.floor(qrTimeout / 60)}:
                  {(qrTimeout % 60).toString().padStart(2, "0")}
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* Amount */}
        <div className="bg-[#f2f2f0] border border-black/[0.06] p-4 mb-4 text-center">
          <p className="text-xs text-gray-500 mb-1">Amount to Pay</p>
          <p className="text-3xl font-bold text-[#29a366]">
            ₱{grandTotal.toLocaleString()}
          </p>
        </div>

        {gcashStep === "scan" ? (
          <>
            {/* QR Code display */}
            <div className="text-center mb-4">
              <p className="text-sm font-medium mb-3">
                Scan this QR code with your GCash app
              </p>
              {qrphUrl ? (
                <div className="bg-white border border-blue-100 p-4 inline-block">
                  <img
                    src={qrphUrl}
                    alt="GCash QR Code"
                    className="w-52 h-52 object-contain mx-auto"
                  />
                </div>
              ) : (
                <div className="w-52 h-52 flex items-center justify-center bg-gray-100 mx-auto text-sm text-gray-500 border-2 border-dashed border-gray-200">
                  <div className="text-center">
                    <QrCode className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                    <p>
                      No QR code uploaded
                      <br />
                      by seller
                    </p>
                  </div>
                </div>
              )}
            </div>
            <div className="bg-blue-50 p-3 mb-4">
              <p className="text-xs text-blue-700">
                <strong>Steps:</strong> 1. Open GCash app → 2. Scan QR code → 3.
                Pay ₱{grandTotal.toLocaleString()} → 4. Take a screenshot → 5.
                Click button below
              </p>
            </div>
            <button
              onClick={() => setGcashStep("proof")}
              className="w-full bg-blue-600 text-white font-semibold px-6 py-3 rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
            >
              <Upload className="h-4 w-4" /> I&apos;ve Paid — Send Proof
            </button>
          </>
        ) : (
          <>
            {/* Proof upload step */}
            <p className="text-sm font-medium mb-3">
              Upload your GCash payment proof
            </p>

            <div className="space-y-4">
              {/* Proof image upload */}
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-2 block uppercase tracking-wide">
                  Payment Screenshot
                </label>
                {qrProofUrl ? (
                  <div className="relative">
                    <img
                      src={qrProofUrl}
                      alt="Payment Proof"
                      className="w-full max-h-48 object-contain border border-green-200 bg-green-50 p-2"
                    />
                    <div className="absolute top-2 right-2 bg-green-500 text-white p-1">
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-blue-200 cursor-pointer hover:bg-blue-50/50 transition-colors">
                    <Upload className="h-8 w-8 text-blue-400 mb-2" />
                    <span className="text-sm text-gray-500">
                      {qrUploading
                        ? "Uploading..."
                        : "Tap to upload screenshot"}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleQRProofUpload}
                      disabled={qrUploading}
                    />
                  </label>
                )}
                {qrProofUrl && (
                  <label className="text-xs text-blue-600 cursor-pointer mt-1 inline-block hover:underline">
                    Change image
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleQRProofUpload}
                      disabled={qrUploading}
                    />
                  </label>
                )}
              </div>

              {/* Reference number */}
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-2 block uppercase tracking-wide">
                  GCash Reference Number
                </label>
                <input
                  type="text"
                  className="w-full border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#29a366] transition-colors font-mono tracking-wider"
                  value={qrRef}
                  onChange={(e) => setQRRef(e.target.value)}
                  placeholder="e.g. 1234 5678 9012"
                />
              </div>

              {/* Info box */}
              <div className="bg-orange-50 border border-orange-100 p-3">
                <p className="text-xs text-orange-700">
                  <strong>Note:</strong> Your payment proof and reference number
                  will be sent to the seller for verification. The seller will
                  confirm your payment once verified.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setGcashStep("scan")}
                  className="flex-1 border border-gray-200 text-gray-700 font-semibold px-4 py-2.5 rounded-md hover:bg-gray-50 transition-colors text-sm"
                >
                  Back
                </button>
                <button
                  onClick={handleGcashSubmit}
                  disabled={
                    !qrProofUrl ||
                    !qrRef ||
                    qrTimeout <= 0 ||
                    qrUploading ||
                    isProcessing
                  }
                  className="flex-1 bg-blue-600 text-white font-semibold px-4 py-2.5 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 text-sm"
                >
                  {isProcessing ? "Submitting..." : "Send Proof & Place Order"}
                </button>
              </div>
            </div>
          </>
        )}

        {qrTimeout <= 0 && (
          <div className="mt-3 text-center">
            <p className="text-xs text-red-500 font-medium">
              Time expired. Please close and try again.
            </p>
          </div>
        )}
      </div>
    </div>
  );

  // ── Main checkout layout ───────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: "#f5f5f3" }}>
      <Header />
      <main className="flex-grow max-w-[1280px] mx-auto px-4 md:px-8 pt-6 pb-40 w-full">

        {/* Breadcrumb + title */}
        <div className="flex items-center gap-2 text-xs text-gray-400 mb-5">
          <button onClick={() => router.push("/cart")} className="hover:text-[#29a366] transition-colors flex items-center gap-1">
            <ArrowLeft className="h-3.5 w-3.5" /> Cart
          </button>
          <span>/</span>
          <span className="text-[#111] font-semibold">Checkout</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">

          {/* ── Left column ─────────────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-3">

            {/* ── STEP 1: Delivery Address ── */}
            <div className="bg-white border border-black/[0.06] overflow-hidden">
              {/* Section header */}
              <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
                <div className="h-7 w-7 rounded-full bg-[#29a366] flex items-center justify-center text-white text-xs font-bold shrink-0">1</div>
                <div className="flex-1">
                  <h2 className="text-sm font-semibold text-[#111]">Delivery Address</h2>
                  {selectedAddressIdx >= 0 && addressBook?.[selectedAddressIdx] && (
                    <p className="text-xs text-gray-400 truncate">
                      {addressBook[selectedAddressIdx].fullName} · {[addressBook[selectedAddressIdx].city, addressBook[selectedAddressIdx].province].filter(Boolean).join(", ")}
                    </p>
                  )}
                </div>
                <MapPin className="h-4 w-4 text-gray-300 shrink-0" />
              </div>

              <div className="px-5 py-4">
                {addressBook && addressBook.length > 0 && (
                  <div className="space-y-2 mb-4">
                    {addressBook.map((addr, idx) => (
                      <div
                        key={idx}
                        className={cn(
                          "flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all",
                          selectedAddressIdx === idx
                            ? "border-[#29a366] bg-[#f0fdf4]"
                            : "border-gray-100 hover:border-gray-300 bg-gray-50",
                        )}
                        onClick={() => { setSelectedAddressIdx(idx); setShowAddAddress(false); }}
                      >
                        <div className={cn(
                          "h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5",
                          selectedAddressIdx === idx ? "border-[#29a366]" : "border-gray-300",
                        )}>
                          {selectedAddressIdx === idx && <div className="h-2 w-2 rounded-full bg-[#29a366]" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-0.5">
                            {addr.label && (
                              <span className="text-[10px] font-bold bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded uppercase tracking-wide">
                                {addr.label}
                              </span>
                            )}
                            <span className="font-semibold text-sm text-[#111]">{addr.fullName}</span>
                            <span className="text-sm text-gray-400">|</span>
                            <span className="text-sm text-gray-600">{addr.mobile}</span>
                          </div>
                          <p className="text-xs text-gray-500 leading-relaxed">
                            {[addr.street, addr.barangay, addr.city, addr.province].filter(Boolean).join(", ")}
                          </p>
                        </div>
                        {selectedAddressIdx === idx && (
                          <CheckCircle2 className="h-4 w-4 text-[#29a366] shrink-0 mt-0.5" />
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <button
                  className="text-sm font-semibold text-[#29a366] hover:underline flex items-center gap-1.5"
                  onClick={() => { setShowAddAddress(!showAddAddress); setSelectedAddressIdx(-1); }}
                >
                  <span className="text-lg leading-none">+</span> Add New Address
                </button>

                {showAddAddress && (
                  <div className="mt-4 border border-dashed border-[#29a366]/40 bg-[#f0fdf4] rounded-lg p-4 space-y-3">
                    <p className="text-xs font-bold text-[#29a366] uppercase tracking-wide mb-1">New Address</p>
                    <div className="flex gap-2">
                      {["Home", "Office", "Other"].map((lbl) => (
                        <button key={lbl} type="button" onClick={() => setNewAddress({ ...newAddress, label: lbl })}
                          className={cn("flex-1 py-2 rounded-lg text-xs font-bold transition-all",
                            newAddress.label === lbl ? "bg-[#29a366] text-white" : "bg-white border border-gray-200 text-gray-600 hover:border-[#29a366]/50")}>
                          {lbl}
                        </button>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <input type="text" placeholder="Full Name *" value={newAddress.fullName}
                        onChange={(e) => setNewAddress({ ...newAddress, fullName: e.target.value })}
                        className="w-full border border-gray-200 bg-white rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#29a366] transition-colors" />
                      <div className="flex items-center border border-gray-200 bg-white rounded-lg focus-within:border-[#29a366] transition-colors overflow-hidden">
                        <span className="pl-3 pr-1 text-sm font-semibold text-gray-400 select-none whitespace-nowrap">+63</span>
                        <input type="tel" placeholder="9XX XXX XXXX *" value={newAddress.mobile}
                          onChange={(e) => { const v = e.target.value.replace(/\D/g, "").slice(0, 10); setNewAddress({ ...newAddress, mobile: v }); }}
                          maxLength={10} className="flex-1 bg-transparent border-none py-2.5 pr-3 text-sm outline-none" />
                      </div>
                    </div>
                    <div className="bg-gray-100 border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-400 cursor-not-allowed">
                      Oriental Mindoro (Province)
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <select value={newAddress.city} onChange={(e) => {
                        const selected = addrCities.find((c: any) => c.name === e.target.value);
                        setNewAddress({ ...newAddress, city: e.target.value, barangay: "" });
                        setAddrCityCode(selected?.code || "");
                      }}
                        className="w-full border border-gray-200 bg-white rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#29a366] transition-colors appearance-none cursor-pointer">
                        <option value="" disabled>City / Municipality *</option>
                        {addrCities.map((c: any) => <option key={c.code} value={c.name}>{c.name}</option>)}
                      </select>
                      <select value={newAddress.barangay} onChange={(e) => setNewAddress({ ...newAddress, barangay: e.target.value })}
                        disabled={!addrCityCode}
                        className="w-full border border-gray-200 bg-white rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#29a366] transition-colors disabled:opacity-40 appearance-none cursor-pointer">
                        <option value="" disabled>Barangay</option>
                        {addrBarangays.map((b: any) => <option key={b.code || b.name} value={b.name}>{b.name}</option>)}
                      </select>
                    </div>
                    <input type="text" placeholder="Street / House No. / Landmark" value={newAddress.street}
                      onChange={(e) => setNewAddress({ ...newAddress, street: e.target.value })}
                      className="w-full border border-gray-200 bg-white rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#29a366] transition-colors" />
                    <div className="flex gap-2">
                      <button onClick={handleSaveNewAddress} disabled={!newAddress.fullName || !newAddress.city}
                        className="flex-1 bg-[#29a366] text-white font-semibold py-2.5 rounded-lg hover:bg-[#23905a] transition-colors disabled:opacity-40 text-sm">
                        Save Address
                      </button>
                      <button onClick={() => { setShowAddAddress(false); setAddrCityCode(""); setAddrBarangays([]); }}
                        className="flex-1 border border-gray-200 text-gray-600 font-semibold py-2.5 rounded-lg hover:bg-gray-50 transition-colors text-sm">
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ── STEP 2: Order Items ── */}
            <div className="bg-white border border-black/[0.06] overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
                <div className="h-7 w-7 rounded-full bg-[#29a366] flex items-center justify-center text-white text-xs font-bold shrink-0">2</div>
                <h2 className="text-sm font-semibold text-[#111] flex-1">Order Items</h2>
                <span className="text-xs text-gray-400">{cartItems.length} item{cartItems.length !== 1 ? "s" : ""}</span>
              </div>

              <div className="divide-y divide-gray-50">
                {itemsByStore.map((storeGroup) => (
                  <div key={storeGroup.storeId} className="px-5 py-4">
                    {/* Store header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Store className="h-4 w-4 text-[#29a366]" />
                        <span className="text-sm font-semibold text-[#111]">{getStoreName(storeGroup.storeId)}</span>
                      </div>
                      <button
                        className="text-xs text-[#29a366] font-semibold hover:underline flex items-center gap-1"
                        onClick={() => router.push(`/messages?id=${storeGroup.storeId}`)}
                      >
                        <MessageSquare className="h-3 w-3" /> Chat Seller
                      </button>
                    </div>
                    {/* Items */}
                    <div className="space-y-3">
                      {storeGroup.items.map((item) => (
                        <div key={item.id} className="flex gap-3 items-start">
                          <div className="h-16 w-16 rounded-lg overflow-hidden shrink-0 bg-gray-100 border border-gray-100">
                            {item.product.imageUrl && (
                              <Image src={item.product.imageUrl} alt={item.product.name} width={64} height={64} className="object-cover h-full w-full" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-[#111] line-clamp-2 leading-snug">{item.product.name}</p>
                            <p className="text-xs text-gray-400 mt-0.5">Qty: {item.quantity}</p>
                          </div>
                          <p className="text-sm font-bold text-[#29a366] shrink-0">
                            ₱{((item.product.price || item.product.pricePerNight || 0) * item.quantity).toLocaleString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── STEP 3: Fulfillment + Payment side by side ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

              {/* Fulfillment */}
              <div className="bg-white border border-black/[0.06] overflow-hidden">
                <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
                  <div className="h-7 w-7 rounded-full bg-[#29a366] flex items-center justify-center text-white text-xs font-bold shrink-0">3</div>
                  <h2 className="text-sm font-semibold text-[#111]">Fulfillment</h2>
                  <Package className="h-4 w-4 text-gray-300 ml-auto" />
                </div>
                <div className="px-5 py-4 space-y-2">
                  {[
                    { value: "delivery", label: "Home Delivery", desc: "Delivered to your address", icon: "", available: fulfillmentAvailability.delivery },
                    { value: "pickup", label: "Store Pickup", desc: "Pick up at the store", icon: "", available: fulfillmentAvailability.pickup },
                  ].filter((m) => m.available).map((method) => (
                    <div key={method.value}
                      className={cn("flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all",
                        fulfillmentMethod === method.value ? "border-[#29a366] bg-[#f0fdf4]" : "border-gray-100 hover:border-gray-200")}
                      onClick={() => setFulfillmentMethod(method.value)}>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[#111]">{method.label}</p>
                        <p className="text-xs text-gray-400">{method.desc}</p>
                      </div>
                      <div className={cn("h-4 w-4 rounded-full border-2 shrink-0 flex items-center justify-center",
                        fulfillmentMethod === method.value ? "border-[#29a366]" : "border-gray-300")}>
                        {fulfillmentMethod === method.value && <div className="h-2 w-2 rounded-full bg-[#29a366]" />}
                      </div>
                    </div>
                  ))}
                  {!fulfillmentAvailability.delivery && (
                    <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2 border border-amber-100">Delivery not available for this store</p>
                  )}
                  {!fulfillmentAvailability.pickup && (
                    <p className="text-xs text-blue-600 bg-blue-50 rounded-lg px-3 py-2 border border-blue-100">Pickup not available for this store</p>
                  )}
                </div>
              </div>

              {/* Payment */}
              <div className="bg-white border border-black/[0.06] overflow-hidden">
                <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
                  <div className="h-7 w-7 rounded-full bg-[#29a366] flex items-center justify-center text-white text-xs font-bold shrink-0">4</div>
                  <h2 className="text-sm font-semibold text-[#111]">Payment</h2>
                  <CreditCard className="h-4 w-4 text-gray-300 ml-auto" />
                </div>
                <div className="px-5 py-4 space-y-2">
                  {[
                    { value: "cod", label: "Cash on Delivery", desc: "Pay when you receive", icon: "" },
                    { value: "gcash", label: "GCash", desc: "Pay via GCash e-wallet", icon: "" },
                  ].map((method) => (
                    <div key={method.value}
                      className={cn("flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all",
                        paymentMethod === method.value ? "border-[#29a366] bg-[#f0fdf4]" : "border-gray-100 hover:border-gray-200")}
                      onClick={() => setPaymentMethod(method.value)}>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[#111]">{method.label}</p>
                        <p className="text-xs text-gray-400">{method.desc}</p>
                      </div>
                      <div className={cn("h-4 w-4 rounded-full border-2 shrink-0 flex items-center justify-center",
                        paymentMethod === method.value ? "border-[#29a366]" : "border-gray-300")}>
                        {paymentMethod === method.value && <div className="h-2 w-2 rounded-full bg-[#29a366]" />}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── Right column: Order Summary ─────────────────────────────── */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <div className="bg-white border border-black/[0.06] overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 bg-[#f9fdf9]">
                  <h2 className="text-sm font-bold text-[#111]">Order Summary</h2>
                </div>

                <div className="px-5 py-4 space-y-4">

                  {/* Delivery destination */}
                  <div className="flex items-start gap-2.5 p-3 bg-gray-50 rounded-lg">
                    <MapPin className="h-4 w-4 text-[#29a366] shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-[#111] mb-0.5">Delivering to</p>
                      {selectedAddress.fullName ? (
                        <>
                          <p className="text-xs text-gray-600 font-medium">{selectedAddress.fullName} · {selectedAddress.mobile}</p>
                          <p className="text-xs text-gray-400 leading-relaxed mt-0.5">{formattedAddress || "No address set"}</p>
                        </>
                      ) : (
                        <p className="text-xs text-gray-400">No address selected</p>
                      )}
                    </div>
                  </div>

                  {/* Items list */}
                  <div className="space-y-3">
                    {itemsByStore.map((storeGroup) =>
                      storeGroup.items.map((item) => (
                        <div key={item.id} className="flex items-center gap-2.5">
                          <div className="h-10 w-10 rounded-md overflow-hidden bg-gray-100 shrink-0 border border-gray-100">
                            {item.product.imageUrl && (
                              <Image src={item.product.imageUrl} alt={item.product.name} width={40} height={40} className="object-cover h-full w-full" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-[#111] line-clamp-1">{item.product.name}</p>
                            <p className="text-[11px] text-gray-400">×{item.quantity}</p>
                          </div>
                          <p className="text-xs font-semibold text-[#111] shrink-0">
                            ₱{((item.product.price || item.product.pricePerNight || 0) * item.quantity).toLocaleString()}
                          </p>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Price breakdown */}
                  <div className="border-t border-gray-100 pt-3 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Subtotal</span>
                      <span className="text-[#111]">₱{totalPrice.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Shipping fee</span>
                      <span className="text-[#111]">₱{shippingFee.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Payment</span>
                      <span className="text-[#111]">{paymentMethod === "cod" ? "COD" : "GCash"}</span>
                    </div>
                    <div className="border-t border-gray-100 pt-2.5 flex justify-between items-center">
                      <span className="text-sm font-bold text-[#111]">Total Payment</span>
                      <span className="text-xl font-bold text-[#29a366]">₱{grandTotal.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Place order button */}
                  <button
                    onClick={handlePlaceOrder}
                    disabled={isProcessing || !canPlaceOrder()}
                    className="w-full bg-[#29a366] text-white font-bold py-3.5 rounded-lg hover:bg-[#23905a] transition-colors disabled:opacity-40 text-sm shadow-sm"
                  >
                    {isProcessing ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        Processing...
                      </span>
                    ) : "Place Order →"}
                  </button>

                  {!canPlaceOrder() && (
                    <p className="text-[11px] text-red-400 text-center">
                      {!selectedAddress.fullName ? "Please select or add a delivery address" : "Please fill in all required fields"}
                    </p>
                  )}

                  <p className="text-[10px] text-gray-400 text-center leading-relaxed">
                    By placing your order, you agree to Emoorm's{" "}
                    <a href="/terms" className="text-[#29a366] hover:underline">Terms of Service</a>
                    {" "}and{" "}
                    <a href="/privacy" className="text-[#29a366] hover:underline">Privacy Policy</a>.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {QRModal}
      <FirstTimeIntro storageKey="checkout" title="Checkout" description="Review your order, enter your delivery address, and choose your payment method." icon={<CreditCard className="h-7 w-7" />} />
      <Footer />
    </div>
  );
}
