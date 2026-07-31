import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Facebook, Instagram, Twitter, Youtube, MapPin, Phone, Mail, Headphones } from "lucide-react";

export function Footer() {
  return (
    <footer
      className="hidden md:block w-full text-[#111] mt-10"
      style={{ backgroundColor: "#f5f5f3" }}
      role="contentinfo"
      aria-label="Footer"
    >

      {/* Row 1: Main nav columns */}
      <div className="border-b border-black/[0.08]" style={{ backgroundColor: "#fff" }}>
        <div className="max-w-[1280px] mx-auto px-8 py-6 grid grid-cols-5 gap-6">

          {/* Customer Care */}
          <div>
            <h4 className="text-[13px] font-bold text-[#111] mb-3 pb-2 border-b border-black/[0.07]">Customer Care</h4>
            <ul className="space-y-1.5">
              {[
                { label: "Help Centre", href: "/customer-care" },
                { label: "How to Buy", href: "/how-to-order" },
                { label: "How to Sell", href: "/sell" },
                { label: "Returns & Refunds", href: "/returns" },
                { label: "Shipping & Delivery", href: "/delivery" },
                { label: "Payment Methods", href: "/payments" },
                { label: "Track My Order", href: "/my-bookings" },
                { label: "Report a Problem", href: "/feedback" },
                { label: "Contact Support", href: "/customer-care" },
              ].map((item, idx) => (
                <li key={`cc-${idx}`}>
                  <Link href={item.href} className="text-[12px] text-[#666] hover:text-[#29a366] transition-colors">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* About Emoorm */}
          <div>
            <h4 className="text-[13px] font-bold text-[#111] mb-3 pb-2 border-b border-black/[0.07]">Emoorm</h4>
            <ul className="space-y-1.5">
              {[
                { label: "About Emoorm", href: "/about" },
                { label: "How Emoorm Works", href: "/how-it-works" },
                { label: "Seller Registration", href: "/seller/register" },
                { label: "Become a Seller", href: "/sell" },
                { label: "Seller University", href: "/seller/university" },
                { label: "Affiliate Programs", href: "/affiliate" },
                { label: "Flash Deals", href: "/flash-deals" },
                { label: "Privacy Policy", href: "/privacy" },
                { label: "Terms of Service", href: "/terms" },
                { label: "Careers at Emoorm", href: "/careers" },
              ].map((item, idx) => (
                <li key={`em-${idx}`}>
                  <Link href={item.href} className="text-[12px] text-[#666] hover:text-[#29a366] transition-colors">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* My Account */}
          <div>
            <h4 className="text-[13px] font-bold text-[#111] mb-3 pb-2 border-b border-black/[0.07]">My Account</h4>
            <ul className="space-y-1.5">
              {[
                { label: "Sign In", href: "/login" },
                { label: "Create Account", href: "/signup" },
                { label: "My Profile", href: "/profile" },
                { label: "My Orders", href: "/my-bookings" },
                { label: "My Wishlist", href: "/wishlist" },
                { label: "My Reviews", href: "/my-reviews" },
                { label: "My Addresses", href: "/my-addresses" },
                { label: "Notifications", href: "/notifications" },
                { label: "Messages", href: "/messages" },
                { label: "Settings", href: "/settings" },
              ].map((item) => (
                <li key={item.label}>
                  <Link href={item.href} className="text-[12px] text-[#666] hover:text-[#29a366] transition-colors">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Shop by Category */}
          <div>
            <h4 className="text-[13px] font-bold text-[#111] mb-3 pb-2 border-b border-black/[0.07]">Shop by Category</h4>
            <ul className="space-y-1.5">
              {[
                "Vegetables", "Fruits", "Seafood", "Meat & Poultry",
                "Rice & Grains", "Snacks", "Delicacies", "Beverages",
                "Condiments", "Handicrafts", "Wellness", "Natural Products",
              ].map((cat) => (
                <li key={cat}>
                  <Link href={`/?cat=${encodeURIComponent(cat)}`} className="text-[12px] text-[#666] hover:text-[#29a366] transition-colors">
                    {cat}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact + Payment */}
          <div>
            <h4 className="text-[13px] font-bold text-[#111] mb-3 pb-2 border-b border-black/[0.07]">Contact Us</h4>
            <div className="space-y-2 mb-4">
              <div className="flex items-start gap-2 text-[12px] text-[#666]">
                <MapPin className="h-3.5 w-3.5 text-[#29a366] shrink-0 mt-0.5" />
                <span>Oriental Mindoro, Philippines</span>
              </div>
              <div className="flex items-center gap-2 text-[12px] text-[#666]">
                <Phone className="h-3.5 w-3.5 text-[#29a366] shrink-0" />
                <span>+63 915 193 1262</span>
              </div>
              <div className="flex items-center gap-2 text-[12px] text-[#666]">
                <Mail className="h-3.5 w-3.5 text-[#29a366] shrink-0" />
                <span>supportemoorm@gmail.com</span>
              </div>
              <div className="flex items-start gap-2 text-[12px] text-[#666]">
                <Headphones className="h-3.5 w-3.5 text-[#29a366] shrink-0 mt-0.5" />
                <span>Mon-Sat, 8AM-6PM PHT</span>
              </div>
            </div>

            <h4 className="text-[13px] font-bold text-[#111] mb-3">Payment Methods</h4>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {["GCash", "Cash on Delivery", "Maya", "QR Ph"].map((m) => (
                <span key={m} className="text-[10px] font-semibold border border-black/[0.12] rounded-[4px] px-2 py-1 text-[#555] bg-[#fafafa]">
                  {m}
                </span>
              ))}
            </div>

            <h4 className="text-[13px] font-bold text-[#111] mb-3">Fulfillment</h4>
            <div className="flex flex-wrap gap-1.5">
              {["Home Delivery", "Store Pickup", "Cash on Pickup"].map((m) => (
                <span key={m} className="text-[10px] font-semibold border border-black/[0.12] rounded-[4px] px-2 py-1 text-[#555] bg-[#fafafa]">
                  {m}
                </span>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* Row 2: SEO content */}
      <div className="border-b border-black/[0.08]" style={{ backgroundColor: "#f5f5f3" }}>
        <div className="max-w-[1280px] mx-auto px-8 py-6">

          <div className="grid grid-cols-3 gap-6 mb-4">
            <div>
              <h3 className="text-[12px] font-bold text-[#111] mb-2">Buy &amp; Sell on Emoorm</h3>
              <p className="text-[11px] text-[#888] leading-relaxed">
                Emoorm is the trusted hyperlocal marketplace connecting buyers with farmers, fishers, artisans, and food producers from Oriental Mindoro, Philippines. Browse freshly harvested vegetables, locally caught seafood, handcrafted goods, and traditional Mindoreno delicacies all in one place.
              </p>
            </div>
            <div>
              <h3 className="text-[12px] font-bold text-[#111] mb-2">Shop with Confidence</h3>
              <p className="text-[11px] text-[#888] leading-relaxed">
                Every seller on Emoorm is verified so you always buy from trusted local producers. Browse shop ratings and customer reviews to find the best sellers across the province. Every purchase directly supports a hardworking Mindoro family.
              </p>
            </div>
            <div>
              <h3 className="text-[12px] font-bold text-[#111] mb-2">Sell Your Products on Emoorm</h3>
              <p className="text-[11px] text-[#888] leading-relaxed">
                Are you a local farmer, fisher, artisan, or food producer in Oriental Mindoro? Emoorm gives you the tools to reach more customers online. List your products in minutes, manage orders through the Seller Center, and grow your business across the province.
              </p>
            </div>
          </div>

          <div className="mb-4">
            <h3 className="text-[12px] font-bold text-[#111] mb-2">
              Discover Authentic Products from Every Corner of Oriental Mindoro
            </h3>
            <p className="text-[11px] text-[#888] leading-relaxed">
              Emoorm serves all sixteen municipalities of Oriental Mindoro: Baco, Bansud, Bongabong, Bulalacao, Calapan City, Gloria, Mansalay, Naujan, Pinamalayan, Pola, Puerto Galera, Roxas, San Teodoro, Socorro, and Victoria. Shop local, eat fresh, and help Mindoro thrive.
            </p>
          </div>

          <div className="grid grid-cols-4 gap-6 pt-4 border-t border-black/[0.07]">
            <div>
              <p className="text-[11px] font-bold text-[#444] mb-2">Fresh Produce</p>
              <p className="text-[11px] text-[#888] leading-relaxed">
                {["Vegetables", "Fruits", "Meat & Poultry", "Seafood", "Rice & Grains", "Organic Produce"].map((c, i, a) => (
                  <React.Fragment key={c}>
                    <Link href={`/?cat=${encodeURIComponent(c)}`} className="hover:text-[#29a366] transition-colors">{c}</Link>
                    {i < a.length - 1 && " · "}
                  </React.Fragment>
                ))}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-bold text-[#444] mb-2">Food &amp; Snacks</p>
              <p className="text-[11px] text-[#888] leading-relaxed">
                {["Delicacies", "Snacks", "Beverages", "Condiments", "Pasalubong", "Dried Fish", "Coconut Products"].map((c, i, a) => (
                  <React.Fragment key={c}>
                    <Link href={`/?cat=${encodeURIComponent(c)}`} className="hover:text-[#29a366] transition-colors">{c}</Link>
                    {i < a.length - 1 && " · "}
                  </React.Fragment>
                ))}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-bold text-[#444] mb-2">Lifestyle &amp; Crafts</p>
              <p className="text-[11px] text-[#888] leading-relaxed">
                {["Handicrafts", "Wellness", "Natural Products", "Woven Items", "Bamboo Crafts", "Herbal Products", "Gift Sets"].map((c, i, a) => (
                  <React.Fragment key={c}>
                    <Link href={`/?cat=${encodeURIComponent(c)}`} className="hover:text-[#29a366] transition-colors">{c}</Link>
                    {i < a.length - 1 && " · "}
                  </React.Fragment>
                ))}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-bold text-[#444] mb-2">Municipalities</p>
              <p className="text-[11px] text-[#888] leading-relaxed">
                {["Calapan City", "Puerto Galera", "Naujan", "Pinamalayan", "Roxas", "Bongabong", "Gloria", "Mansalay", "Pola", "Bansud", "Victoria", "Socorro"].map((c, i, a) => (
                  <React.Fragment key={c}>
                    <span>{c}</span>
                    {i < a.length - 1 && " · "}
                  </React.Fragment>
                ))}
              </p>
            </div>
          </div>

        </div>
      </div>

      {/* Bottom bar */}
      <div style={{ backgroundColor: "#fff" }}>
        <div className="max-w-[1280px] mx-auto px-8 py-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Image src="/brand-icon.png" alt="Emoorm" width={22} height={22} className="object-contain opacity-50" />
            <p className="text-[11px] text-[#aaa]">
              &copy; {new Date().getFullYear()} Emoorm Mindoro &mdash; Oriental Mindoro, Philippines
            </p>
          </div>

          <div className="flex items-center gap-4">
            {[
              { label: "Privacy", href: "/privacy" },
              { label: "Terms", href: "/terms" },
              { label: "Sitemap", href: "/sitemap" },
              { label: "Feedback", href: "/feedback" },
              { label: "Careers", href: "/careers" },
            ].map((l) => (
              <Link key={l.label} href={l.href} className="text-[11px] text-[#bbb] hover:text-[#555] transition-colors">
                {l.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-[#bbb] mr-1">Follow Us</span>
            {[
              { href: "https://facebook.com", icon: <Facebook className="h-3.5 w-3.5" />, bg: "#1877f2" },
              { href: "https://instagram.com", icon: <Instagram className="h-3.5 w-3.5" />, bg: "#e1306c" },
              { href: "https://twitter.com", icon: <Twitter className="h-3.5 w-3.5" />, bg: "#1da1f2" },
              { href: "https://youtube.com", icon: <Youtube className="h-3.5 w-3.5" />, bg: "#ff0000" },
            ].map((s, i) => (
              <a
                key={i}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                className="h-7 w-7 rounded-full flex items-center justify-center text-white hover:opacity-80 transition-opacity"
                style={{ background: s.bg }}
              >
                {s.icon}
              </a>
            ))}
          </div>
        </div>
      </div>

    </footer>
  );
}
