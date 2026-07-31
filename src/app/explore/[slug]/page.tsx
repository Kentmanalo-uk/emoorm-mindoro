"use client";

import React, { useState } from "react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { useUser, useSupabase } from "@/supabase";
import {
  ChevronRight,
  ChevronDown,
  Mail,
  Phone,
  MapPin,
  ShoppingBag,
  RefreshCcw,
  CreditCard,
  Truck,
  Shield,
  MessageSquare,
  Check,
  Loader2,
  Search,
  HelpCircle,
  Clock,
  Users,
  Headphones,
} from "lucide-react";
import Link from "next/link";

const FAQS = [
  {
    category: "Orders",
    icon: ShoppingBag,
    color: "#29a366",
    items: [
      {
        q: "How do I track my order?",
        a: "After placing an order, go to My Orders in your profile. Each order shows its current status and tracking details once the seller ships your item.",
      },
      {
        q: "Can I cancel or modify my order?",
        a: "You can request a cancellation within 1 hour of placing an order if the seller hasn't accepted it yet. Go to My Orders, select the order, and tap 'Cancel Order'. Modifications aren't supported — cancel and re-order instead.",
      },
      {
        q: "Why hasn't my order been accepted?",
        a: "Sellers typically respond within a few hours. If your order hasn't been accepted after 24 hours, contact the seller directly through Messages or cancel and choose another seller.",
      },
    ],
  },
  {
    category: "Returns & Refunds",
    icon: RefreshCcw,
    color: "#ed8936",
    items: [
      {
        q: "What is the return policy?",
        a: "Most items can be returned within 7 days of delivery if they arrive damaged, defective, or significantly different from the listing. Each seller may have their own return policy listed on their product page.",
      },
      {
        q: "How long does a refund take?",
        a: "Once a return is approved by the seller, refunds are processed within 3–5 business days back to your original payment method.",
      },
      {
        q: "What if the seller rejects my return?",
        a: "If a seller rejects a valid return, contact our support team. We'll review the case and step in if the item doesn't match the listing or arrived damaged.",
      },
    ],
  },
  {
    category: "Payments",
    icon: CreditCard,
    color: "#4299e1",
    items: [
      {
        q: "What payment methods are accepted?",
        a: "We accept GCash, Maya, cash on delivery (for eligible areas), and major credit/debit cards through our secure payment gateway.",
      },
      {
        q: "Is my payment information secure?",
        a: "Yes. All payment transactions are encrypted and processed through PCI-DSS compliant payment providers. We never store your full card details.",
      },
      {
        q: "Why was my payment declined?",
        a: "Payments may be declined due to insufficient funds, incorrect card details, or your bank's fraud protection. Try another payment method or contact your bank.",
      },
    ],
  },
  {
    category: "Delivery",
    icon: Truck,
    color: "#9f7aea",
    items: [
      {
        q: "What are the delivery areas?",
        a: "Delivery coverage depends on each seller's location. Most sellers serve Calapan City and nearby areas in Oriental Mindoro. Check the product listing for available delivery zones.",
      },
      {
        q: "How long does delivery take?",
        a: "Standard delivery typically takes 1–3 days within the city. Inter-municipality delivery may take 3–7 days depending on the seller and courier.",
      },
      {
        q: "Who handles the delivery?",
        a: "Delivery is managed by the seller, either through their own rider or a third-party courier. Tracking details are provided once the item is shipped.",
      },
    ],
  },
  {
    category: "Account & Safety",
    icon: Shield,
    color: "#ed64a6",
    items: [
      {
        q: "How do I reset my password?",
        a: "On the sign-in screen, tap 'Forgot password?' and enter your email. You'll receive a reset link within a few minutes. Check your spam folder if you don't see it.",
      },
      {
        q: "How do I report a suspicious seller?",
        a: "Tap the flag icon on any seller profile or listing. Our trust and safety team reviews all reports within 24 hours.",
      },
      {
        q: "Is my personal information safe?",
        a: "Yes. We follow strict data privacy practices and never sell your information to third parties. Read our Privacy Policy for full details.",
      },
    ],
  },
];

function FaqSection() {
  const [openMap, setOpenMap] = useState<Record<string, boolean>>({});

  const toggle = (key: string) =>
    setOpenMap((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="space-y-3">
      {FAQS.map((section) => {
        const Icon = section.icon;
        return (
          <div
            key={section.category}
            className="bg-white rounded-[5px] border border-black/[0.06] overflow-hidden"
          >
            <div className="flex items-center gap-3 px-5 py-4 border-b border-black/[0.05]">
              <div
                className="h-8 w-8 rounded-[5px] flex items-center justify-center shrink-0"
                style={{ background: section.color + "18" }}
              >
                <Icon
                  className="h-4 w-4"
                  style={{ color: section.color }}
                  strokeWidth={1.8}
                />
              </div>
              <span className="text-sm font-semibold text-[#111]">
                {section.category}
              </span>
            </div>
            {section.items.map((item, i) => {
              const key = `${section.category}-${i}`;
              const open = !!openMap[key];
              return (
                <div
                  key={i}
                  className="border-b border-black/[0.04] last:border-0"
                >
                  <button
                    onClick={() => toggle(key)}
                    className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left hover:bg-[#f9f9f8] transition-colors"
                  >
                    <span className="text-sm text-[#222] font-medium leading-snug">
                      {item.q}
                    </span>
                    <ChevronDown
                      className="h-4 w-4 text-[#bbb] shrink-0 transition-transform"
                      style={{
                        transform: open ? "rotate(180deg)" : "rotate(0deg)",
                      }}
                    />
                  </button>
                  {open && (
                    <div className="px-5 pb-4">
                      <p className="text-sm text-[#666] leading-relaxed">
                        {item.a}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

function ContactForm() {
  const { user } = useUser();
  const supabase = useSupabase();

  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState(user?.email || "");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      setError("Please describe your issue.");
      return;
    }
    if (!email.trim() && !user) {
      setError("Please enter your email so we can follow up.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await supabase.from("support_tickets").insert({
        subject: subject.trim() || null,
        message: message.trim(),
        email: email.trim() || (user?.email ?? null),
        userId: user?.uid ?? null,
        createdAt: new Date().toISOString(),
        status: "open",
      });
      setDone(true);
    } catch (err: any) {
      setError(err?.message || "Failed to send. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="bg-white rounded-[5px] border border-black/[0.06] p-10 flex flex-col items-center text-center gap-4">
        <div
          className="h-16 w-16 rounded-full flex items-center justify-center"
          style={{ background: "#29a366" }}
        >
          <Check className="h-8 w-8 text-white" strokeWidth={2.5} />
        </div>
        <div>
          <h3 className="text-base font-semibold text-[#111] mb-1">
            Ticket submitted!
          </h3>
          <p className="text-sm text-[#777] leading-relaxed max-w-xs">
            We've received your message and will reply to your email within
            24–48 hours.
          </p>
        </div>
        <button
          onClick={() => {
            setDone(false);
            setSubject("");
            setMessage("");
            setError("");
          }}
          className="px-6 py-2.5 text-sm font-semibold text-white rounded-[5px]"
          style={{ background: "#29a366" }}
        >
          Submit another
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-[5px] border border-black/[0.06] p-5 space-y-4"
    >
      <p className="text-xs font-semibold text-[#555] ">Send us a message</p>

      {!user && (
        <div>
          <label className="text-xs font-medium text-[#666] mb-1.5 block">
            Your email <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#bbb]" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full bg-[#f2f2f0] border border-black/[0.08] rounded-md pl-10 pr-4 py-2.5 text-sm text-[#111] placeholder:text-[#bbb] outline-none focus:border-[#29a366] focus:bg-white transition-all"
            />
          </div>
        </div>
      )}

      <div>
        <label className="text-xs font-medium text-[#666] mb-1.5 block">
          Subject <span className="text-[#bbb] font-normal">(optional)</span>
        </label>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="e.g. Order not received"
          className="w-full bg-[#f2f2f0] border border-black/[0.08] rounded-md px-4 py-2.5 text-sm text-[#111] placeholder:text-[#bbb] outline-none focus:border-[#29a366] focus:bg-white transition-all"
        />
      </div>

      <div>
        <label className="text-xs font-medium text-[#666] mb-1.5 block">
          Describe your issue <span className="text-red-400">*</span>
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Tell us what happened and how we can help…"
          rows={5}
          required
          className="w-full bg-[#f2f2f0] border border-black/[0.08] rounded-md px-4 py-2.5 text-sm text-[#111] placeholder:text-[#bbb] outline-none focus:border-[#29a366] focus:bg-white transition-all resize-none"
        />
        <p className="text-[11px] text-[#bbb] mt-1 text-right">
          {message.length} characters
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 rounded-[5px] px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full h-10 rounded-[5px] text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60 transition-opacity"
        style={{ background: "#29a366" }}
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Sending…
          </>
        ) : (
          "Send Message"
        )}
      </button>
    </form>
  );
}

export default function CustomerCarePage() {
  const [search, setSearch] = useState("");

  const filteredFaqs = search.trim()
    ? FAQS.map((section) => ({
        ...section,
        items: section.items.filter(
          (item) =>
            item.q.toLowerCase().includes(search.toLowerCase()) ||
            item.a.toLowerCase().includes(search.toLowerCase()),
        ),
      })).filter((s) => s.items.length > 0)
    : FAQS;

  return (
    <div
      className="flex min-h-screen flex-col"
      style={{ backgroundColor: "#f2f2f0" }}
    >
      <Header />
      <main className="flex-grow pt-6">
        <div className="max-w-[1280px] mx-auto px-4 md:px-8 pb-16">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1 text-xs text-[#999] mb-4 flex-wrap">
            <Link href="/" className="hover:text-[#29a366] transition-colors">
              Home
            </Link>
            <ChevronRight className="h-3 w-3 shrink-0" />
            <span className="text-[#555]">Customer Care</span>
          </nav>

          {/* Hero */}
          <div className="bg-white rounded-[5px] border border-black/[0.06] px-6 py-8 mb-4 text-center">
            <div className="flex justify-center mb-3">
              <div
                className="h-14 w-14 rounded-full flex items-center justify-center"
                style={{ background: "#29a36615" }}
              >
                <Headphones
                  className="h-7 w-7"
                  style={{ color: "#29a366" }}
                  strokeWidth={1.8}
                />
              </div>
            </div>
            <h1 className="text-xl font-bold text-[#111] mb-1">
              How can we help you?
            </h1>
            <p className="text-sm text-[#888] mb-5">
              Browse common topics below or send us a message directly.
            </p>
            <div className="relative max-w-md mx-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#bbb]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search for answers…"
                className="w-full bg-[#f2f2f0] border border-black/[0.08] rounded-md pl-10 pr-4 py-2.5 text-sm text-[#111] placeholder:text-[#bbb] outline-none focus:border-[#29a366] focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[
              {
                icon: Clock,
                label: "Response time",
                value: "< 24 hrs",
                color: "#29a366",
              },
              {
                icon: Users,
                label: "Happy customers",
                value: "10,000+",
                color: "#4299e1",
              },
              {
                icon: HelpCircle,
                label: "Issues resolved",
                value: "98%",
                color: "#ed8936",
              },
            ].map((stat) => {
              const Icon = stat.icon;
              return (
                <div
                  key={stat.label}
                  className="bg-white rounded-[5px] border border-black/[0.06] p-4 flex flex-col items-center text-center gap-1.5"
                >
                  <Icon
                    className="h-5 w-5 shrink-0"
                    style={{ color: stat.color }}
                    strokeWidth={1.8}
                  />
                  <p className="text-lg font-bold text-[#111] leading-none">
                    {stat.value}
                  </p>
                  <p className="text-[11px] text-[#999]">{stat.label}</p>
                </div>
              );
            })}
          </div>

          <div className="flex flex-col lg:flex-row gap-4 items-start">
            {/* Left: FAQs */}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-[#555] mb-3">
                {search.trim()
                  ? `Results for "${search}"`
                  : "Frequently Asked Questions"}
              </p>

              {filteredFaqs.length === 0 ? (
                <div className="bg-white rounded-[5px] border border-black/[0.06] p-10 flex flex-col items-center text-center gap-3">
                  <HelpCircle
                    className="h-10 w-10 text-[#ddd]"
                    strokeWidth={1.5}
                  />
                  <p className="text-sm text-[#888]">
                    No results found for "{search}".
                  </p>
                  <button
                    onClick={() => setSearch("")}
                    className="text-sm font-semibold"
                    style={{ color: "#29a366" }}
                  >
                    Clear search
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredFaqs.map((section) => {
                    const Icon = section.icon;
                    return (
                      <div
                        key={section.category}
                        className="bg-white rounded-[5px] border border-black/[0.06] overflow-hidden"
                      >
                        <div className="flex items-center gap-3 px-5 py-4 border-b border-black/[0.05]">
                          <div
                            className="h-8 w-8 rounded-[5px] flex items-center justify-center shrink-0"
                            style={{ background: section.color + "18" }}
                          >
                            <Icon
                              className="h-4 w-4"
                              style={{ color: section.color }}
                              strokeWidth={1.8}
                            />
                          </div>
                          <span className="text-sm font-semibold text-[#111]">
                            {section.category}
                          </span>
                        </div>
                        <FaqItems
                          items={section.items}
                          sectionKey={section.category}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right sidebar */}
            <div className="w-full lg:w-[300px] shrink-0 space-y-3">
              {/* Contact form */}
              <ContactForm />

              {/* Contact info */}
              <div className="bg-white rounded-[5px] border border-black/[0.06] p-5">
                <p className="text-xs font-semibold text-[#555] mb-3">
                  Contact us directly
                </p>
                <div className="space-y-3">
                  <a
                    href="mailto:support@emoorm.com"
                    className="flex items-center gap-3 text-sm text-[#444] hover:text-[#29a366] transition-colors group"
                  >
                    <div className="h-8 w-8 rounded-[5px] bg-[#f2f2f0] flex items-center justify-center group-hover:bg-[#29a366]/10 transition-colors shrink-0">
                      <Mail className="h-3.5 w-3.5 text-[#29a366]" />
                    </div>
                    support@emoorm.com
                  </a>
                  <div className="flex items-center gap-3 text-sm text-[#444]">
                    <div className="h-8 w-8 rounded-[5px] bg-[#f2f2f0] flex items-center justify-center shrink-0">
                      <Phone className="h-3.5 w-3.5 text-[#29a366]" />
                    </div>
                    +63 912 345 6789
                  </div>
                  <div className="flex items-start gap-3 text-sm text-[#444]">
                    <div className="h-8 w-8 rounded-[5px] bg-[#f2f2f0] flex items-center justify-center shrink-0 mt-0.5">
                      <MapPin className="h-3.5 w-3.5 text-[#29a366]" />
                    </div>
                    Calapan City, Oriental Mindoro, Philippines
                  </div>
                </div>
              </div>

              {/* Operating hours */}
              <div className="bg-white rounded-[5px] border border-black/[0.06] p-5">
                <p className="text-xs font-semibold text-[#555] mb-3">
                  Support hours
                </p>
                <div className="space-y-2 text-sm text-[#555]">
                  {[
                    { day: "Monday – Friday", hours: "8:00 AM – 6:00 PM" },
                    { day: "Saturday", hours: "9:00 AM – 4:00 PM" },
                    { day: "Sunday", hours: "Closed" },
                  ].map((r) => (
                    <div key={r.day} className="flex justify-between gap-2">
                      <span className="text-[#888]">{r.day}</span>
                      <span className="font-medium text-[#333]">{r.hours}</span>
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-[#bbb] mt-3">
                  All times are Philippine Standard Time (PST).
                </p>
              </div>

              {/* Quick links */}
              <div className="bg-white rounded-[5px] border border-black/[0.06] overflow-hidden">
                <p className="text-xs font-semibold text-[#555] px-5 pt-4 pb-3">
                  Quick links
                </p>
                {[
                  { href: "/feedback", label: "Send Feedback" },
                  { href: "/my-bookings", label: "My Orders" },
                  { href: "/messages", label: "Message a Seller" },
                ].map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="flex items-center justify-between px-5 py-3 text-sm text-[#444] hover:bg-[#f2f2f0] hover:text-[#29a366] transition-colors border-t border-black/[0.04]"
                  >
                    {link.label}
                    <ChevronRight className="h-3.5 w-3.5 text-[#bbb]" />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function FaqItems({
  items,
  sectionKey,
}: {
  items: { q: string; a: string }[];
  sectionKey: string;
}) {
  const [openMap, setOpenMap] = useState<Record<string, boolean>>({});
  const toggle = (key: string) =>
    setOpenMap((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <>
      {items.map((item, i) => {
        const key = `${sectionKey}-${i}`;
        const open = !!openMap[key];
        return (
          <div key={i} className="border-b border-black/[0.04] last:border-0">
            <button
              onClick={() => toggle(key)}
              className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left hover:bg-[#f9f9f8] transition-colors"
            >
              <span className="text-sm text-[#222] font-medium leading-snug">
                {item.q}
              </span>
              <ChevronDown
                className="h-4 w-4 text-[#bbb] shrink-0 transition-transform"
                style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
              />
            </button>
            {open && (
              <div className="px-5 pb-4">
                <p className="text-sm text-[#666] leading-relaxed">{item.a}</p>
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}
