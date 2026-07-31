"use client";

import React, { useState } from "react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { useUser, useSupabase } from "@/supabase";
import {
  MessageSquare,
  Bug,
  Lightbulb,
  Star,
  Heart,
  Check,
  Loader2,
  ChevronRight,
  Mail,
  Phone,
  MapPin,
} from "lucide-react";
import Link from "next/link";

const FEEDBACK_TYPES = [
  {
    id: "general",
    label: "General Feedback",
    icon: MessageSquare,
    color: "#29a366",
    bg: "#f0faf5",
  },
  {
    id: "bug",
    label: "Bug Report",
    icon: Bug,
    color: "#e53e3e",
    bg: "#fff5f5",
  },
  {
    id: "suggestion",
    label: "Suggestion",
    icon: Lightbulb,
    color: "#f6ad55",
    bg: "#fffaf0",
  },
  {
    id: "compliment",
    label: "Compliment",
    icon: Heart,
    color: "#ed64a6",
    bg: "#fff5f9",
  },
];

const RATINGS = [1, 2, 3, 4, 5];

export default function FeedbackPage() {
  const { user } = useUser();
  const supabase = useSupabase();

  const [type, setType] = useState("general");
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState(user?.email || "");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const selectedType = FEEDBACK_TYPES.find((t) => t.id === type)!;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      setError("Please write your feedback message.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await supabase.from("feedback").insert({
        type,
        rating: rating || null,
        subject: subject.trim() || null,
        message: message.trim(),
        email: email.trim() || (user?.email ?? null),
        userId: user?.uid ?? null,
        createdAt: new Date().toISOString(),
        status: "new",
      });
      setDone(true);
    } catch (err: any) {
      setError(err?.message || "Failed to submit. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setDone(false);
    setType("general");
    setRating(0);
    setSubject("");
    setMessage("");
    setError("");
  };

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
            <span className="text-[#555]">Feedback</span>
          </nav>

          <div className="flex flex-col lg:flex-row gap-4 items-start">
            {/* ── Left: Form ─────────────────────────────────────────── */}
            <div className="flex-1 min-w-0 space-y-3">
              {/* Header card */}
              <div className="bg-white rounded-[5px] border border-black/[0.06] px-6 py-5">
                <h1 className="text-lg font-semibold text-[#111] mb-0.5">
                  Share your feedback
                </h1>
                <p className="text-sm text-[#888]">
                  Help us improve Emoorm. Every message is read by our team.
                </p>
              </div>

              {done ? (
                /* ── Success state ── */
                <div className="bg-white rounded-[5px] border border-black/[0.06] p-10 flex flex-col items-center text-center gap-4">
                  <div
                    className="h-16 w-16 rounded-full flex items-center justify-center"
                    style={{ background: "#29a366" }}
                  >
                    <Check className="h-8 w-8 text-white" strokeWidth={2.5} />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-[#111] mb-1">
                      Thank you!
                    </h2>
                    <p className="text-sm text-[#777] leading-relaxed max-w-xs">
                      Your feedback has been submitted. We'll review it and use
                      it to make Emoorm better.
                    </p>
                  </div>
                  <button
                    onClick={reset}
                    className="px-6 py-2.5 text-sm font-semibold text-white rounded-[5px]"
                    style={{ background: "#29a366" }}
                  >
                    Send more feedback
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-3">
                  {/* Feedback type */}
                  <div className="bg-white rounded-[5px] border border-black/[0.06] p-5">
                    <p className="text-xs font-semibold text-[#555] mb-3">
                      Feedback type
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {FEEDBACK_TYPES.map((ft) => {
                        const Icon = ft.icon;
                        const active = type === ft.id;
                        return (
                          <button
                            key={ft.id}
                            type="button"
                            onClick={() => setType(ft.id)}
                            className="flex flex-col items-center gap-2 p-3 rounded-[5px] border-2 transition-all text-center"
                            style={{
                              borderColor: active
                                ? ft.color
                                : "rgba(0,0,0,0.06)",
                              background: active ? ft.bg : "white",
                            }}
                          >
                            <Icon
                              className="h-5 w-5"
                              style={{ color: ft.color }}
                              strokeWidth={1.8}
                            />
                            <span
                              className="text-xs font-semibold leading-tight"
                              style={{ color: active ? ft.color : "#555" }}
                            >
                              {ft.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Rating */}
                  <div className="bg-white rounded-[5px] border border-black/[0.06] p-5">
                    <p className="text-xs font-semibold text-[#555] mb-3">
                      Overall experience
                    </p>
                    <div className="flex items-center gap-2">
                      {RATINGS.map((n) => (
                        <button
                          key={n}
                          type="button"
                          onMouseEnter={() => setHoverRating(n)}
                          onMouseLeave={() => setHoverRating(0)}
                          onClick={() => setRating(n === rating ? 0 : n)}
                          className="transition-transform hover:scale-110 active:scale-95"
                        >
                          <Star
                            className="h-8 w-8 transition-colors"
                            style={{
                              color:
                                n <= (hoverRating || rating)
                                  ? "#f6ad55"
                                  : "#e0e0e0",
                              fill:
                                n <= (hoverRating || rating)
                                  ? "#f6ad55"
                                  : "#e0e0e0",
                            }}
                          />
                        </button>
                      ))}
                      {rating > 0 && (
                        <span className="text-sm text-[#888] ml-1">
                          {
                            [
                              "",
                              "Poor",
                              "Fair",
                              "Good",
                              "Very good",
                              "Excellent",
                            ][rating]
                          }
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Subject + Message */}
                  <div className="bg-white rounded-[5px] border border-black/[0.06] p-5 space-y-4">
                    <div>
                      <label className="text-xs font-semibold text-[#555] mb-1.5 block">
                        Subject{" "}
                        <span className="text-[#bbb] normal-case font-normal">
                          (optional)
                        </span>
                      </label>
                      <input
                        type="text"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder={`e.g. "${selectedType.label} about checkout"`}
                        className="w-full bg-[#f2f2f0] border border-black/[0.08] rounded-md px-4 py-2.5 text-sm text-[#111] placeholder:text-[#bbb] outline-none focus:border-[#29a366] focus:bg-white transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-[#555] mb-1.5 block">
                        Your message <span className="text-red-400">*</span>
                      </label>
                      <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Tell us what's on your mind…"
                        rows={5}
                        required
                        className="w-full bg-[#f2f2f0] border border-black/[0.08] rounded-md px-4 py-2.5 text-sm text-[#111] placeholder:text-[#bbb] outline-none focus:border-[#29a366] focus:bg-white transition-all resize-none"
                      />
                      <p className="text-[11px] text-[#bbb] mt-1 text-right">
                        {message.length} characters
                      </p>
                    </div>
                  </div>

                  {/* Email (only if not logged in) */}
                  {!user && (
                    <div className="bg-white rounded-[5px] border border-black/[0.06] p-5">
                      <label className="text-xs font-semibold text-[#555] mb-1.5 block">
                        Your email{" "}
                        <span className="text-[#bbb] normal-case font-normal">
                          (so we can follow up)
                        </span>
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

                  {/* Error */}
                  {error && (
                    <div className="bg-red-50 border border-red-100 rounded-[5px] px-4 py-3 text-sm text-red-600">
                      {error}
                    </div>
                  )}

                  {/* Submit */}
                  <div className="bg-white rounded-[5px] border border-black/[0.06] p-5 flex items-center justify-between gap-4">
                    <p className="text-xs text-[#aaa] leading-relaxed">
                      Your feedback is anonymous unless you share your email or
                      are signed in.
                    </p>
                    <button
                      type="submit"
                      disabled={loading}
                      className="shrink-0 h-10 px-6 rounded-[5px] text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-60 transition-opacity"
                      style={{ background: "#29a366" }}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" /> Sending…
                        </>
                      ) : (
                        "Submit Feedback"
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* ── Right: Info sidebar ─────────────────────────────────── */}
            <div className="w-full lg:w-[280px] shrink-0 space-y-3">
              {/* What happens next */}
              <div className="bg-white rounded-[5px] border border-black/[0.06] p-5">
                <p className="text-xs font-semibold text-[#555] mb-3">
                  What happens next
                </p>
                <div className="space-y-3">
                  {[
                    {
                      step: "1",
                      text: "Your message is sent directly to our team",
                    },
                    {
                      step: "2",
                      text: "We review and categorize it within 48 hours",
                    },
                    {
                      step: "3",
                      text: "If you left an email, we'll follow up",
                    },
                  ].map((s) => (
                    <div key={s.step} className="flex items-start gap-3">
                      <div
                        className="h-5 w-5 rounded-full text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5"
                        style={{ background: "#29a366" }}
                      >
                        {s.step}
                      </div>
                      <p className="text-sm text-[#555] leading-snug">
                        {s.text}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Other ways to reach us */}
              <div className="bg-white rounded-[5px] border border-black/[0.06] p-5">
                <p className="text-xs font-semibold text-[#555] mb-3">
                  Other ways to reach us
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

              {/* Quick links */}
              <div className="bg-white rounded-[5px] border border-black/[0.06] overflow-hidden">
                <p className="text-xs font-semibold text-[#555] px-5 pt-4 pb-3">
                  Quick links
                </p>
                {[
                  { href: "/customer-care", label: "Customer Care" },
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
