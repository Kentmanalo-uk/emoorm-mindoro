"use client";

import React, { useState } from "react";
import { SellerLayout } from "@/components/layout/seller-layout";
import {
  BookOpen,
  Sprout,
  TrendingUp,
  Lock,
  ChevronRight,
  ChevronDown,
  PlayCircle,
  CheckCircle,
  Users,
  Award,
  Leaf,
  Clock,
} from "lucide-react";
import { useSupabase, useStableMemo, useCollection } from "@/supabase";
import { cn } from "@/lib/utils";

// ── Curriculum ─────────────────────────────────────────────────────────────

interface Lesson {
  title: string;
  body: string;
}
interface Module {
  id: number;
  track: string;
  title: string;
  description: string;
  duration: string;
  available: boolean;
  lessons: Lesson[];
}

const TRACKS = [
  {
    id: "foundations",
    label: "Foundations",
    icon: Sprout,
    color: "#29a366",
    bg: "#f0fdf4",
    description:
      "Everything you need to open and run your first store on Emoorm.",
  },
  {
    id: "products",
    label: "Products & Pricing",
    icon: Leaf,
    color: "#0ea5e9",
    bg: "#f0f9ff",
    description:
      "Price your harvest fairly, write great listings, and take compelling photos.",
  },
  {
    id: "growth",
    label: "Growing Your Shop",
    icon: TrendingUp,
    color: "#f59e0b",
    bg: "#fffbeb",
    description:
      "Attract more buyers, earn reviews, and scale your local agri business.",
  },
];

const MODULES: Module[] = [
  {
    id: 1,
    track: "foundations",
    available: true,
    title: "Welcome to Emoorm",
    description:
      "Learn what Emoorm is, who your buyers are, and how the marketplace works for Oriental Mindoro sellers.",
    duration: "15 min",
    lessons: [
      {
        title: "What is Emoorm?",
        body: "Emoorm is a hyperlocal eCommerce marketplace built for Oriental Mindoro. It connects local farmers, fisherfolk, and agri-entrepreneurs directly with buyers in their communities — no middlemen, no mall space needed. You list your products online, buyers order and pay, and you deliver or arrange pick-up.",
      },
      {
        title: "Who buys on Emoorm?",
        body: "Your buyers are households, small restaurants, local businesses, and individuals in municipalities like Calapan, San Jose, Victoria, Naujan, and Puerto Galera who want fresh, locally sourced products. They trust Emoorm because they know the sellers are from their own community.",
      },
      {
        title: "How orders and payments work",
        body: "Buyers browse your products, add to cart, and check out. They pay via Cash on Delivery (COD) — they hand you cash when they receive the item — or GCash, which transfers money directly to your GCash account. Emoorm does not hold your money; payment goes straight to you.",
      },
      {
        title: "Getting started checklist",
        body: "Before you list your first product, make sure you have: (1) a clear photo of your product, (2) a GCash number if you want to offer it as a payment method, (3) a rough idea of your delivery area and how you will bring orders to customers, and (4) your store name and a short description of what you sell.",
      },
    ],
  },
  {
    id: 2,
    track: "foundations",
    available: true,
    title: "Setting Up Your Store",
    description:
      "Create a compelling store profile — name, logo, description, and location — that builds trust with local buyers.",
    duration: "20 min",
    lessons: [
      {
        title: "Choosing your store name",
        body: "Your store name is the first thing buyers see. Keep it short, memorable, and related to what you sell. Good examples: 'Mindoro Fresh Harvest', 'Ate Lina's Vegetables', 'San Jose Seafood'. Avoid generic names like 'Online Store 1' — buyers won't remember you.",
      },
      {
        title: "Writing your store description",
        body: "Write 2–3 sentences that tell buyers what you sell, where you are from, and what makes you different. Example: 'We are a family farm in Naujan selling freshly harvested organic vegetables every Monday and Friday. All produce is chemical-free and picked the same day it is listed.' This builds trust immediately.",
      },
      {
        title: "Adding your store logo",
        body: "Use a clear photo — it can be a photo of your produce, your farm, or yourself smiling. Avoid logos with too much text or dark backgrounds. A 500×500 pixel image works best. Buyers who can see the person behind the store buy with more confidence.",
      },
      {
        title: "Setting your location",
        body: "Always fill in your municipality and barangay. Buyers filter by location to find sellers near them. If you are in Calapan but deliver to Naujan, mention that in your description. Accurate location helps buyers trust that you are a real, local seller.",
      },
      {
        title: "Choosing your store category",
        body: "Pick the category that best describes most of what you sell: Vegetables, Fruits, Seafood, Meat, Rice & Grains, Handicrafts, Wellness, Delicacies, Beverages, or Condiments. If you sell multiple types, pick your main product and mention the rest in your description.",
      },
    ],
  },
  {
    id: 3,
    track: "foundations",
    available: true,
    title: "Your First Order",
    description:
      "Walk through the full order cycle from listing to delivery. Know exactly what to do when a buyer checks out.",
    duration: "25 min",
    lessons: [
      {
        title: "When a buyer places an order",
        body: "You will receive a notification as soon as a buyer checks out. Go to My Orders in your Seller Center dashboard. You will see the order with status 'To Ship'. Review the order — product, quantity, buyer address, and payment method — before confirming.",
      },
      {
        title: "Confirming and preparing the order",
        body: "Only confirm an order when you are sure you have the item ready. If the product is out of stock or unavailable, contact the buyer immediately through Messages. Never leave a buyer waiting without communication — this is the fastest way to get a bad review.",
      },
      {
        title: "Cash on Delivery (COD) explained",
        body: "With COD, you collect payment when you hand over the product. Bring exact change in case the buyer pays with a large bill. Do not release the product until you have received full payment. If a buyer refuses to pay on delivery, report it through Customer Care.",
      },
      {
        title: "GCash — receiving payments",
        body: "When a buyer pays via GCash, the amount is sent to the GCash number on your store profile. Check your GCash balance before delivering to confirm the payment went through. Never deliver a GCash order without seeing the credit on your phone first.",
      },
      {
        title: "Handing over the order",
        body: "Pack your products cleanly and securely — use old newspapers, banana leaves, or plastic bags to protect fresh produce. For deliveries, use a clean container. When you meet the buyer, be friendly and professional. A good first impression leads to repeat orders.",
      },
      {
        title: "After delivery — closing the order",
        body: "Once the buyer receives the order, the status updates to Completed. Buyers can then leave a rating and review. Aim for 5 stars by delivering on time, communicating clearly, and ensuring product quality. After completing an order, list your next batch of products right away to keep momentum.",
      },
    ],
  },
  {
    id: 4,
    track: "products",
    available: true,
    title: "Listing Local Produce",
    description:
      "Write product listings that help buyers find your vegetables, fruits, seafood, and other local goods.",
    duration: "20 min",
    lessons: [
      {
        title: "Writing a clear product name",
        body: "Be specific with your product name. Instead of 'Vegetables', write 'Fresh Pechay (per bundle)' or 'Organic Sweet Kamote – 1 kilo'. Include the unit so buyers know exactly what they are getting. Specific names rank higher in search and reduce order confusion.",
      },
      {
        title: "Choosing the right category",
        body: "Accurate categories help buyers browsing by product type find you. Misclassifying a product — for example, listing dried fish under Snacks instead of Seafood — means buyers looking for dried fish will never see your listing. When in doubt, think about what section a palengke would put your product in.",
      },
      {
        title: "Writing a description that sells",
        body: "Answer these three questions in your description: (1) Where is it from? ('Harvested from our farm in Bansud'), (2) How fresh is it? ('Picked every Tuesday and Friday morning'), (3) How should the buyer use or store it? ('Best cooked within 2 days, keep refrigerated'). Three honest sentences outperform a long paragraph of marketing words.",
      },
      {
        title: "Setting your unit correctly",
        body: "Set your price per the unit you actually sell — per kilo, per bundle, per piece, per pack. If you sell bananas per hand (around 10–14 pieces), say so. Vague units like 'per serving' confuse buyers and lead to disputes. Clear units build trust and reduce returns.",
      },
      {
        title: "Keywords buyers search for",
        body: "Think about what your buyer types when they are hungry and need your product. 'Malunggay leaves Calapan', 'fresh tilapia San Jose', 'homemade bagoong'. Add your location and product variety in your title or description so your listing appears in these searches.",
      },
    ],
  },
  {
    id: 5,
    track: "products",
    available: true,
    title: "Pricing Your Harvest",
    description:
      "Understand market pricing in Oriental Mindoro, cover your costs, and stay competitive without underselling yourself.",
    duration: "18 min",
    lessons: [
      {
        title: "Know your real costs",
        body: "Before pricing, list every cost involved: seeds or feeds, water and electricity, transport to pack or deliver, packaging materials, and your own time and labor. Many local sellers forget to include transport and packaging, and end up selling at a loss. Your price must cover all of these and still leave you profit.",
      },
      {
        title: "Check local market prices",
        body: "Visit your nearest palengke or tiangge and note what similar products sell for. Check other Emoorm sellers in your municipality. Your price on Emoorm can be slightly higher than the wet market because buyers are paying for convenience — you deliver to them. A 10–20% premium above palengke price is generally accepted.",
      },
      {
        title: "Setting a fair and profitable price",
        body: "Add your total cost per unit + a profit margin of at least 20–30%. If your pechay costs you ₱12 per bundle to grow, pack, and deliver, price it at ₱15–₱16. Do not race to be the cheapest seller — buyers on Emoorm value freshness and reliability over rock-bottom prices.",
      },
      {
        title: "When and how to offer discounts",
        body: "Discounts work best for bulk orders (e.g., 'Buy 3 kilos, get ₱10 off') or for products near their freshness limit. Do not offer discounts just because sales are slow — instead, check if your photos or description need improvement. A better listing will outperform a discount every time.",
      },
    ],
  },
  {
    id: 6,
    track: "products",
    available: false,
    title: "Phone Photography for Sellers",
    description:
      "Take clear, appetizing photos of your products using only your phone — no fancy equipment needed.",
    duration: "22 min",
    lessons: [],
  },
  {
    id: 7,
    track: "products",
    available: false,
    title: "Managing Stock & Freshness",
    description:
      "Keep your inventory accurate and handle perishable goods to avoid disputes.",
    duration: "15 min",
    lessons: [],
  },
  {
    id: 8,
    track: "growth",
    available: false,
    title: "Earning Your First Reviews",
    description:
      "Build a 5-star reputation early by delivering on time, communicating well, and going the extra mile.",
    duration: "15 min",
    lessons: [],
  },
  {
    id: 9,
    track: "growth",
    available: false,
    title: "Understanding Your Analytics",
    description:
      "Read your dashboard data to learn which products sell best and where to focus.",
    duration: "20 min",
    lessons: [],
  },
  {
    id: 10,
    track: "growth",
    available: false,
    title: "Building a Loyal Customer Base",
    description:
      "Turn one-time buyers into repeat customers through great service and consistent quality.",
    duration: "25 min",
    lessons: [],
  },
];

// ── Component ───────────────────────────────────────────────────────────────

export default function SellerUniversityPage() {
  const supabase = useSupabase();
  const [activeTrack, setActiveTrack] = useState("foundations");
  const [expandedMod, setExpandedMod] = useState<number | null>(1);
  const [expandedLesson, setExpandedLesson] = useState<number | null>(0);

  // Real seller count from DB
  const storesConfig = useStableMemo(() => ({ table: "stores" }), []);
  const { data: stores } = useCollection(storesConfig);
  const sellerCount = stores?.length ?? 0;

  const trackModules = MODULES.filter((m) => m.track === activeTrack);
  const activeTrackInfo = TRACKS.find((t) => t.id === activeTrack)!;
  const TrackIcon = activeTrackInfo.icon;
  const totalModules = MODULES.length;
  const availableCount = MODULES.filter((m) => m.available).length;

  return (
    <SellerLayout>
      <div className="px-4 md:px-6 pt-6 pb-10 space-y-4">
        {/* Hero */}
        <div
          className="rounded-2xl p-8 md:p-10 relative overflow-hidden"
          style={{
            background:
              "linear-gradient(135deg, #064e3b 0%, #065f46 60%, #047857 100%)",
          }}
        >
          <div className="relative z-10">
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
              Emoorm Seller University
            </h1>
            <p className="text-sm text-white max-w-lg leading-relaxed mb-6">
              A free learning program for farmers, fisherfolk, and
              agri-entrepreneurs in Oriental Mindoro. Learn to sell online,
              reach more buyers, and grow a business that supports your
              community.
            </p>
            <div className="flex flex-wrap gap-5">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-white" strokeWidth={1.5} />
                <span className="text-sm font-bold text-white">
                  {availableCount}
                </span>
                <span className="text-xs text-white">Modules available</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-white" strokeWidth={1.5} />
                <span className="text-sm font-bold text-white">
                  {sellerCount > 0 ? sellerCount.toLocaleString() : "—"}
                </span>
                <span className="text-xs text-white">Sellers on Emoorm</span>
              </div>
              <div className="flex items-center gap-2">
                <Award className="h-4 w-4 text-white" strokeWidth={1.5} />
                <span className="text-sm font-bold text-white">Free</span>
                <span className="text-xs text-white">Always</span>
              </div>
            </div>
          </div>
          <div className="absolute -right-6 -bottom-6 opacity-[0.04]">
            <Leaf className="h-56 w-56 text-white" strokeWidth={0.5} />
          </div>
        </div>

        {/* Track tabs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {TRACKS.map((track) => {
            const Icon = track.icon;
            const isActive = activeTrack === track.id;
            const count = MODULES.filter((m) => m.track === track.id).length;
            return (
              <button
                key={track.id}
                onClick={() => {
                  setActiveTrack(track.id);
                  setExpandedMod(null);
                  setExpandedLesson(null);
                }}
                className="text-left p-4 rounded-2xl border transition-all"
                style={
                  isActive
                    ? { background: track.bg, borderColor: track.color + "50" }
                    : { background: "#fff", borderColor: "rgba(0,0,0,0.06)" }
                }
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Icon
                      className="h-4 w-4 shrink-0"
                      style={{ color: isActive ? track.color : "#ccc" }}
                      strokeWidth={1.8}
                    />
                    <span
                      className="text-sm font-bold"
                      style={{ color: isActive ? track.color : "#555" }}
                    >
                      {track.label}
                    </span>
                  </div>
                  <span
                    className="text-[11px] font-semibold"
                    style={{ color: isActive ? track.color : "#bbb" }}
                  >
                    {count} modules
                  </span>
                </div>
                <p className="text-xs text-[#aaa] leading-relaxed">
                  {track.description}
                </p>
              </button>
            );
          })}
        </div>

        {/* Modules */}
        <div>
          <div className="flex items-center gap-2 mb-3 px-1">
            <TrackIcon
              className="h-4 w-4 shrink-0"
              style={{ color: activeTrackInfo.color }}
              strokeWidth={1.8}
            />
            <h2 className="text-sm font-bold text-[#111]">
              {activeTrackInfo.label}
            </h2>
            <span className="text-xs text-[#bbb]">
              · {trackModules.length} modules
            </span>
          </div>

          <div className="bg-white rounded-2xl border border-black/[0.06] overflow-hidden divide-y divide-black/[0.04]">
            {trackModules.map((mod) => {
              const isExpanded = expandedMod === mod.id;
              return (
                <div
                  key={mod.id}
                  className={cn(!mod.available && "opacity-55")}
                >
                  {/* Module header */}
                  <button
                    disabled={!mod.available}
                    onClick={() => {
                      setExpandedMod(isExpanded ? null : mod.id);
                      setExpandedLesson(null);
                    }}
                    className="w-full flex items-start gap-4 px-5 py-4 text-left transition-colors hover:bg-[#fafafa] disabled:cursor-default"
                  >
                    <div
                      className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                      style={
                        mod.available
                          ? {
                              background: activeTrackInfo.bg,
                              color: activeTrackInfo.color,
                            }
                          : { background: "#f5f5f5", color: "#ccc" }
                      }
                    >
                      {mod.available ? (
                        <PlayCircle className="h-4 w-4" />
                      ) : (
                        <Lock className="h-4 w-4" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-sm font-semibold text-[#111]">
                          {mod.title}
                        </p>
                        {!mod.available && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#f5f5f5] text-[#bbb] shrink-0">
                            Coming Soon
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#888] leading-relaxed mb-1.5">
                        {mod.description}
                      </p>
                      <div className="flex items-center gap-2 text-[11px] text-[#bbb]">
                        <Clock className="h-3 w-3" />
                        <span>{mod.duration}</span>
                        <span>·</span>
                        <span>{mod.lessons.length} lessons</span>
                      </div>
                    </div>

                    {mod.available && (
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 text-[#ccc] shrink-0 mt-1 transition-transform duration-200",
                          isExpanded && "rotate-180",
                        )}
                      />
                    )}
                  </button>

                  {/* Expanded lessons */}
                  <div
                    className="grid transition-all duration-200 ease-in-out"
                    style={{ gridTemplateRows: isExpanded ? "1fr" : "0fr" }}
                  >
                    <div className="overflow-hidden">
                      <div className="border-t border-black/[0.04] bg-[#fafafa]">
                        {mod.lessons.map((lesson, li) => {
                          const isLessonOpen =
                            expandedLesson === li && isExpanded;
                          return (
                            <div
                              key={li}
                              className="border-b border-black/[0.04] last:border-0"
                            >
                              <button
                                onClick={() =>
                                  setExpandedLesson(isLessonOpen ? null : li)
                                }
                                className="w-full flex items-center gap-3 px-6 py-3 text-left hover:bg-[#f5f5f5] transition-colors"
                              >
                                <div
                                  className="h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0"
                                  style={{
                                    borderColor: activeTrackInfo.color + "50",
                                  }}
                                >
                                  <span
                                    className="text-[9px] font-bold"
                                    style={{ color: activeTrackInfo.color }}
                                  >
                                    {li + 1}
                                  </span>
                                </div>
                                <span className="flex-1 text-sm font-medium text-[#333]">
                                  {lesson.title}
                                </span>
                                <ChevronDown
                                  className={cn(
                                    "h-3.5 w-3.5 text-[#ccc] shrink-0 transition-transform duration-150",
                                    isLessonOpen && "rotate-180",
                                  )}
                                />
                              </button>

                              {/* Lesson body */}
                              <div
                                className="grid transition-all duration-150 ease-in-out"
                                style={{
                                  gridTemplateRows: isLessonOpen
                                    ? "1fr"
                                    : "0fr",
                                }}
                              >
                                <div className="overflow-hidden">
                                  <p className="text-sm text-[#555] leading-relaxed px-6 pb-4 pt-1">
                                    {lesson.body}
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Support CTA */}
        <div className="bg-white rounded-2xl border border-black/[0.06] px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-[#111] mb-0.5">
              Have questions about selling?
            </p>
            <p className="text-xs text-[#aaa]">
              Our support team is here to help local sellers in Oriental Mindoro
              succeed.
            </p>
          </div>
          <a
            href="/customer-care"
            className="shrink-0 flex items-center gap-1.5 h-9 px-5 rounded-xl text-white text-xs font-semibold transition-opacity hover:opacity-90"
            style={{ background: "#29a366" }}
          >
            Contact Support <ChevronRight className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
    </SellerLayout>
  );
}
