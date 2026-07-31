"use client";

import React from "react";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[#f2f2f0]">
      <Header />
      <main className="max-w-[860px] mx-auto px-4 md:px-8 py-10 pb-20">

        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-[#29a366] hover:underline mb-6">
          <ArrowLeft className="h-4 w-4" /> Back to Home
        </Link>

        <div className="bg-white px-8 py-10">
          <p className="text-xs text-gray-400 mb-1">Last updated: June 10, 2026</p>
          <h1 className="text-3xl font-semibold text-[#111] mb-2">Privacy Policy</h1>
          <p className="text-sm text-gray-500 mb-8">
            This Privacy Policy describes how <strong>Emoorm</strong> ("we," "us," or "our") collects, uses, and protects
            your personal information when you use our marketplace platform at <strong>emoorm.com</strong> and any related
            services (collectively, the "Platform").
          </p>

          {[
            {
              title: "1. Information We Collect",
              body: [
                "We collect information you provide directly to us when you create an account, make a purchase, list a product, or contact us. This includes:",
                "• Full name, email address, phone number, and delivery address\n• Profile photo and government-issued ID (for seller verification)\n• Payment information (GCash reference numbers, proof of payment screenshots)\n• Product listings, descriptions, and images you upload\n• Messages you send through the platform",
                "We also automatically collect certain information when you use our Platform, including IP address, browser type, device identifiers, pages viewed, and time spent on pages.",
              ],
            },
            {
              title: "2. How We Use Your Information",
              body: [
                "We use the information we collect to:",
                "• Create and manage your account\n• Process orders, payments, and delivery arrangements\n• Verify seller identity and business legitimacy\n• Send order confirmations, updates, and support messages\n• Personalize your shopping experience and show relevant products\n• Detect and prevent fraud, abuse, and policy violations\n• Improve the Platform through analytics and performance monitoring\n• Comply with legal obligations",
              ],
            },
            {
              title: "3. Sharing of Information",
              body: [
                "We do not sell your personal information to third parties. We may share your information with:",
                "• Sellers — when you place an order, your delivery address and contact information are shared with the seller to fulfill your order.\n• Buyers — your store name, city, and product listings are publicly visible on the Platform.\n• Service providers — we use Supabase for database and authentication services, and HuggingFace for AI-powered features. These providers process data on our behalf under strict data protection agreements.\n• Law enforcement — when required by law or to protect the safety of our users.",
              ],
            },
            {
              title: "4. Data Storage and Security",
              body: [
                "Your data is stored securely on Supabase servers. We implement industry-standard security measures including encryption in transit (HTTPS/TLS), row-level security policies on our database, and access controls to limit who can view sensitive information.",
                "However, no method of transmission over the internet is 100% secure. While we strive to protect your data, we cannot guarantee absolute security.",
              ],
            },
            {
              title: "5. Cookies and Tracking",
              body: [
                "We use cookies and similar technologies to maintain your session, remember your preferences (such as language and theme), and analyze Platform usage. You can control cookie settings through your browser, though disabling cookies may affect Platform functionality.",
              ],
            },
            {
              title: "6. Your Rights",
              body: [
                "You have the right to:",
                "• Access the personal information we hold about you\n• Correct inaccurate or incomplete information\n• Request deletion of your account and associated data\n• Withdraw consent for marketing communications\n• Data portability — receive a copy of your data in a structured format",
                "To exercise any of these rights, contact us at supportemoorm@gmail.com.",
              ],
            },
            {
              title: "7. Children's Privacy",
              body: [
                "Emoorm is not intended for use by individuals under the age of 18. We do not knowingly collect personal information from minors. If you believe a minor has provided us with personal information, please contact us immediately.",
              ],
            },
            {
              title: "8. Third-Party Links",
              body: [
                "The Platform may contain links to third-party websites. We are not responsible for the privacy practices of those websites and encourage you to review their privacy policies before providing any personal information.",
              ],
            },
            {
              title: "9. Changes to This Policy",
              body: [
                "We may update this Privacy Policy from time to time. We will notify you of significant changes by posting the new policy on this page with an updated effective date. Your continued use of the Platform after changes are posted constitutes your acceptance of the updated policy.",
              ],
            },
            {
              title: "10. Contact Us",
              body: [
                "If you have any questions or concerns about this Privacy Policy, please contact us:",
                "Email: supportemoorm@gmail.com\nPhone: +63 915 193 1262\nAddress: Oriental Mindoro, Philippines",
              ],
            },
          ].map((section) => (
            <section key={section.title} className="mb-8">
              <h2 className="text-lg font-semibold text-[#111] mb-3">{section.title}</h2>
              {section.body.map((para, i) => (
                <p key={i} className="text-sm text-[#555] leading-relaxed mb-2 whitespace-pre-line">
                  {para}
                </p>
              ))}
            </section>
          ))}

          <div className="border-t border-gray-100 pt-6 mt-8">
            <p className="text-xs text-gray-400">
              By using Emoorm, you acknowledge that you have read and understood this Privacy Policy.
              See also our{" "}
              <Link href="/terms" className="text-[#29a366] hover:underline">Terms of Service</Link>.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
