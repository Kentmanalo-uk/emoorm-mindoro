"use client";

import React from "react";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { ArrowLeft } from "lucide-react";

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-[#f2f2f0]">
      <Header />
      <main className="max-w-[860px] mx-auto px-4 md:px-8 py-10 pb-20">

        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-[#29a366] hover:underline mb-6">
          <ArrowLeft className="h-4 w-4" /> Back to Home
        </Link>

        <div className="bg-white px-8 py-10">
          <p className="text-xs text-gray-400 mb-1">Last updated: June 10, 2026</p>
          <h1 className="text-3xl font-semibold text-[#111] mb-2">Terms of Service</h1>
          <p className="text-sm text-gray-500 mb-8">
            Welcome to <strong>Emoorm</strong>. By accessing or using our platform, you agree to be bound by these Terms of
            Service ("Terms"). Please read them carefully before using any Emoorm services. If you do not agree to these Terms,
            do not use the Platform.
          </p>

          {[
            {
              title: "1. Acceptance of Terms",
              body: [
                "By creating an account, browsing, purchasing, or selling on Emoorm, you agree to these Terms of Service and our Privacy Policy. These Terms apply to all users of the Platform, including buyers, sellers, and guests.",
                "We reserve the right to update these Terms at any time. Continued use of the Platform after changes constitutes acceptance of the updated Terms.",
              ],
            },
            {
              title: "2. About Emoorm",
              body: [
                "Emoorm is a hyperlocal digital marketplace connecting buyers with local farmers, fishers, artisans, and food producers in Oriental Mindoro, Philippines. Emoorm acts as a platform intermediary — we do not own or warehouse any products listed on the Platform.",
                "Emoorm operates as a Progressive Web App (PWA) accessible via web browsers on any device.",
              ],
            },
            {
              title: "3. User Accounts",
              body: [
                "To access most features of the Platform, you must create an account. You agree to:",
                "• Provide accurate, current, and complete information during registration\n• Maintain the security of your password and account\n• Notify us immediately of any unauthorized use of your account\n• Be responsible for all activity that occurs under your account",
                "You must be at least 18 years old to create an account. By creating an account, you confirm that you meet this requirement.",
              ],
            },
            {
              title: "4. Buyer Terms",
              body: [
                "As a buyer on Emoorm, you agree to:",
                "• Provide accurate delivery information when placing orders\n• Make payment as agreed (Cash on Delivery or GCash)\n• Not initiate chargebacks or disputes in bad faith\n• Only submit honest and accurate product reviews\n• Not engage in fraudulent orders or fictitious transactions",
                "Orders placed on Emoorm constitute a binding agreement between you and the seller. Emoorm facilitates but is not a party to the sale contract.",
              ],
            },
            {
              title: "5. Seller Terms",
              body: [
                "To sell on Emoorm, you must complete the seller verification process, which includes submitting a government-issued ID, selfie, and store details. Approval is at Emoorm's sole discretion.",
                "As a seller, you agree to:",
                "• List only products you own and have the right to sell\n• Provide accurate descriptions, prices, and stock levels\n• Fulfill orders promptly and communicate with buyers\n• Not list prohibited items (see Section 7)\n• Maintain professional conduct with buyers\n• Honor Emoorm's 7-day return policy for eligible items\n• Not circumvent the Platform to conduct transactions outside Emoorm",
              ],
            },
            {
              title: "6. Product Listings",
              body: [
                "All product listings must be accurate and not misleading. Emoorm reserves the right to remove any listing that violates these Terms, contains prohibited content, or is deemed unsuitable for the Platform.",
                "Sellers are solely responsible for the accuracy of their listings. Emoorm is not liable for inaccurate product descriptions.",
              ],
            },
            {
              title: "7. Prohibited Items and Conduct",
              body: [
                "The following are strictly prohibited on Emoorm:",
                "• Counterfeit, stolen, or illegally obtained goods\n• Dangerous substances, weapons, or illegal items\n• Products that infringe on intellectual property rights\n• Adult content or services\n• Items that violate Philippine law\n• Spam, fake reviews, or manipulated ratings\n• Creating multiple accounts to circumvent suspensions",
              ],
            },
            {
              title: "8. Payments",
              body: [
                "Emoorm currently supports two payment methods: Cash on Delivery (COD) and GCash digital payment. Payments are made directly between buyers and sellers. Emoorm does not process or hold funds on behalf of either party.",
                "For GCash payments, buyers must upload proof of payment and provide the GCash reference number. Sellers are responsible for verifying payment before shipping.",
              ],
            },
            {
              title: "9. Returns and Refunds",
              body: [
                "Buyers may request a return within 7 days of delivery for eligible items. Items must be unopened, unused, and in their original condition. The following are not eligible for return:",
                "• Perishable goods (fresh produce, seafood, meat)\n• Customized or personalized items\n• Items damaged due to buyer misuse",
                "Return and refund arrangements are handled directly between buyers and sellers. Emoorm may mediate disputes at its discretion.",
              ],
            },
            {
              title: "10. Intellectual Property",
              body: [
                "All content on the Emoorm Platform — including logos, graphics, software, and text — is owned by Emoorm or its licensors and is protected by Philippine and international copyright law. You may not reproduce, distribute, or create derivative works without written permission.",
                "By uploading content to the Platform (product photos, descriptions, reviews), you grant Emoorm a non-exclusive, royalty-free license to use, display, and distribute that content in connection with the Platform.",
              ],
            },
            {
              title: "11. Limitation of Liability",
              body: [
                "Emoorm is a marketplace platform and is not liable for:",
                "• The quality, safety, legality, or availability of products listed by sellers\n• Disputes between buyers and sellers\n• Delivery delays or failures caused by sellers or third parties\n• Loss or damage arising from your use of the Platform",
                "To the maximum extent permitted by Philippine law, Emoorm's total liability shall not exceed the amount paid by you for the transaction giving rise to the claim.",
              ],
            },
            {
              title: "12. Disclaimer of Warranties",
              body: [
                'The Platform is provided "as is" and "as available" without warranties of any kind. Emoorm does not guarantee that the Platform will be uninterrupted, error-free, or free of viruses or other harmful components.',
              ],
            },
            {
              title: "13. Governing Law",
              body: [
                "These Terms are governed by the laws of the Republic of the Philippines. Any disputes arising from or related to these Terms shall be subject to the exclusive jurisdiction of the courts of Oriental Mindoro, Philippines.",
              ],
            },
            {
              title: "14. Termination",
              body: [
                "Emoorm reserves the right to suspend or terminate your account at any time for violation of these Terms, fraudulent activity, or any conduct deemed harmful to the Platform or its users. You may also delete your account at any time by contacting support.",
              ],
            },
            {
              title: "15. Contact Us",
              body: [
                "For questions about these Terms of Service, please contact us:",
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
              By using Emoorm, you agree to these Terms of Service. See also our{" "}
              <Link href="/privacy" className="text-[#29a366] hover:underline">Privacy Policy</Link>.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
