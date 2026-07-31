"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";

export type Lang = "en" | "tl" | "ceb";

const translations: Record<Lang, Record<string, string>> = {
  en: {
    // Topbar
    "topbar.feedback": "Feedback",
    "topbar.sell": "Sell on Emoorm",
    "topbar.care": "Customer Care",
    "topbar.signin": "Sign In",
    "topbar.signup": "Sign Up",

    // Profile dropdown
    "nav.profile": "My Profile",
    "nav.orders": "My Orders",
    "nav.wishlist": "My Wishlist",
    "nav.logout": "Log Out",

    // Search
    "search.placeholder": "Search in Emoorm",

    // Homepage sections
    "home.shopByCategory": "Shop by Category",
    "home.suggestedForYou": "Suggested for You",
    "home.storesNearYou": "Stores Near You",
    "home.newArrivals": "New Arrivals",
    "home.discoverProducts": "Discover Products",
    "home.searchResultsFor": "Search results for",
    "home.noProducts": "No products found.",
    "home.sold": "Sold",

    // Sort
    "sort.label": "Sort by:",
    "sort.relevant": "Most Relevant",
    "sort.priceAsc": "Price: Low to High",
    "sort.priceDesc": "Price: High to Low",
    "sort.rating": "Best Rated",
    "sort.sold": "Best Selling",

    // Filters
    "filter.filters": "Filters",
    "filter.category": "Category",
    "filter.priceRange": "Price Range",
    "filter.municipality": "Municipality",
    "filter.auctionOnly": "Auction only",
    "filter.all": "All",

    // Product details
    "product.addToCart": "Add to Cart",
    "product.buyNow": "Buy Now",
    "product.quantity": "Quantity",
    "product.available": "available",
    "product.outOfStock": "Out of stock",
    "product.placeBid": "Place Bid",
    "product.inStock": "in stock",
    "product.sold": "Sold",
    "product.description": "Product Description",
    "product.reviews": "Reviews",
    "product.youMightLike": "You might also like",
    "product.seller": "Seller",
    "product.addedToCart": "Added to Cart!",
    "product.bidHistory": "Bid History",

    // Profile page
    "profile.editProfile": "Edit Profile",
    "profile.myPurchase": "My Purchase",
    "profile.services": "Services",
    "profile.myWishlist": "My Wishlist",
    "profile.seeAll": "See All",
    "profile.ordersCount": "Orders",
    "profile.wishlistCount": "Wishlist",
    "profile.reviewsCount": "Reviews",
    "profile.toPay": "To Pay",
    "profile.toShip": "To Ship",
    "profile.toReceive": "To Receive",
    "profile.toPickUp": "To Pick Up",
    "profile.notifications": "Notifications",
    "profile.messages": "Messages",
    "profile.vouchers": "Vouchers",
    "profile.myShop": "My Shop",
    "profile.dashboard": "Dashboard",
    "profile.becomeSeller": "Become a Seller",
    "profile.registerNow": "Register Now",
    "profile.helpCenter": "Help Center",
    "profile.contactUs": "Contact Us",
    "profile.settings": "Settings",
    "profile.privacy": "Privacy & Security",
    "profile.wishlistEmpty": "Your wishlist is empty",
    "profile.browseProducts": "Browse Products",
    "profile.manageProducts": "Manage your products and orders",
    "profile.startStore": "Start your own store on Emoorm",
    "profile.getSupport": "Get support and find answers",

    // Common
    "common.addToCart": "Add to Cart",
    "common.seeAll": "See All",
  },

  tl: {
    // Topbar
    "topbar.feedback": "Feedback",
    "topbar.sell": "Magbenta sa Emoorm",
    "topbar.care": "Serbisyo sa Customer",
    "topbar.signin": "Mag-sign In",
    "topbar.signup": "Mag-sign Up",

    // Profile dropdown
    "nav.profile": "Aking Profile",
    "nav.orders": "Aking mga Order",
    "nav.wishlist": "Aking Wishlist",
    "nav.logout": "Mag-logout",

    // Search
    "search.placeholder": "Maghanap sa Emoorm",

    // Homepage sections
    "home.shopByCategory": "Mamili ayon sa Kategorya",
    "home.suggestedForYou": "Para sa Iyo",
    "home.storesNearYou": "Mga Tindahan sa Malapit",
    "home.newArrivals": "Mga Bagong Dating",
    "home.discoverProducts": "Tuklasin ang mga Produkto",
    "home.searchResultsFor": "Mga resulta para sa",
    "home.noProducts": "Walang nahanap na produkto.",
    "home.sold": "Nabenta",

    // Sort
    "sort.label": "Ayusin ayon sa:",
    "sort.relevant": "Pinaka-Angkop",
    "sort.priceAsc": "Presyo: Mababa hanggang Mataas",
    "sort.priceDesc": "Presyo: Mataas hanggang Mababa",
    "sort.rating": "Pinakamataas na Rating",
    "sort.sold": "Pinakamahusay na Benta",

    // Filters
    "filter.filters": "Mga Filter",
    "filter.category": "Kategorya",
    "filter.priceRange": "Hanay ng Presyo",
    "filter.municipality": "Munisipalidad",
    "filter.auctionOnly": "Auction lamang",
    "filter.all": "Lahat",

    // Product details
    "product.addToCart": "Idagdag sa Cart",
    "product.buyNow": "Bilhin Ngayon",
    "product.quantity": "Dami",
    "product.available": "available",
    "product.outOfStock": "Wala sa stock",
    "product.placeBid": "Mag-bid",
    "product.inStock": "naiwan",
    "product.sold": "Nabenta",
    "product.description": "Paglalarawan ng Produkto",
    "product.reviews": "Mga Review",
    "product.youMightLike": "Maaaring gusto mo rin",
    "product.seller": "Nagbebenta",
    "product.addedToCart": "Naidagdag sa Cart!",
    "product.bidHistory": "Kasaysayan ng Bid",

    // Profile page
    "profile.editProfile": "I-edit ang Profile",
    "profile.myPurchase": "Aking mga Binili",
    "profile.services": "Mga Serbisyo",
    "profile.myWishlist": "Aking Wishlist",
    "profile.seeAll": "Tingnan Lahat",
    "profile.ordersCount": "Mga Order",
    "profile.wishlistCount": "Wishlist",
    "profile.reviewsCount": "Mga Review",
    "profile.toPay": "Babayaran",
    "profile.toShip": "Ipapadala",
    "profile.toReceive": "Matatanggap",
    "profile.toPickUp": "Kukunin",
    "profile.notifications": "Mga Abiso",
    "profile.messages": "Mga Mensahe",
    "profile.vouchers": "Mga Voucher",
    "profile.myShop": "Aking Tindahan",
    "profile.dashboard": "Dashboard",
    "profile.becomeSeller": "Maging Nagbebenta",
    "profile.registerNow": "Mag-register Ngayon",
    "profile.helpCenter": "Sentro ng Tulong",
    "profile.contactUs": "Makipag-ugnayan",
    "profile.settings": "Mga Setting",
    "profile.privacy": "Privacy at Seguridad",
    "profile.wishlistEmpty": "Walang laman ang iyong wishlist",
    "profile.browseProducts": "I-browse ang mga Produkto",
    "profile.manageProducts": "Pamahalaan ang iyong mga produkto at order",
    "profile.startStore": "Simulan ang iyong tindahan sa Emoorm",
    "profile.getSupport": "Kumuha ng tulong at mga sagot",

    // Common
    "common.addToCart": "Idagdag sa Cart",
    "common.seeAll": "Tingnan Lahat",
  },

  ceb: {
    // Topbar
    "topbar.feedback": "Feedback",
    "topbar.sell": "Magbaligya sa Emoorm",
    "topbar.care": "Serbisyo sa Kustomer",
    "topbar.signin": "Mag-sign In",
    "topbar.signup": "Mag-sign Up",

    // Profile dropdown
    "nav.profile": "Akong Profile",
    "nav.orders": "Akong mga Order",
    "nav.wishlist": "Akong Wishlist",
    "nav.logout": "Mag-logout",

    // Search
    "search.placeholder": "Pangitaa sa Emoorm",

    // Homepage sections
    "home.shopByCategory": "Palit Pinaagi sa Kategorya",
    "home.suggestedForYou": "Para Nimo",
    "home.storesNearYou": "Mga Tindahan Duol Nimo",
    "home.newArrivals": "Bag-ong Abot",
    "home.discoverProducts": "Tuklasin ang mga Produkto",
    "home.searchResultsFor": "Mga resulta alang sa",
    "home.noProducts": "Walay nakit-ang produkto.",
    "home.sold": "Nabaligya",

    // Sort
    "sort.label": "I-sort pinaagi sa:",
    "sort.relevant": "Pinaka-Angay",
    "sort.priceAsc": "Presyo: Ubos ngadto sa Taas",
    "sort.priceDesc": "Presyo: Taas ngadto sa Ubos",
    "sort.rating": "Pinakataas nga Rating",
    "sort.sold": "Pinakadaghan nga Nabaligya",

    // Filters
    "filter.filters": "Mga Filter",
    "filter.category": "Kategorya",
    "filter.priceRange": "Kilo-kiloon sa Presyo",
    "filter.municipality": "Munisipyo",
    "filter.auctionOnly": "Auction lamang",
    "filter.all": "Tanan",

    // Product details
    "product.addToCart": "Idugang sa Cart",
    "product.buyNow": "Palita Karon",
    "product.quantity": "Kantidad",
    "product.available": "available",
    "product.outOfStock": "Wala sa stock",
    "product.placeBid": "Mag-bid",
    "product.inStock": "nahibilin",
    "product.sold": "Nabaligya",
    "product.description": "Deskripsyon sa Produkto",
    "product.reviews": "Mga Review",
    "product.youMightLike": "Basin ganahan ka usab",
    "product.seller": "Magbabaligya",
    "product.addedToCart": "Naidugang sa Cart!",
    "product.bidHistory": "Kasaysayan sa Bid",

    // Profile page
    "profile.editProfile": "I-edit ang Profile",
    "profile.myPurchase": "Akong mga Gipalit",
    "profile.services": "Mga Serbisyo",
    "profile.myWishlist": "Akong Wishlist",
    "profile.seeAll": "Tan-awa Tanan",
    "profile.ordersCount": "Mga Order",
    "profile.wishlistCount": "Wishlist",
    "profile.reviewsCount": "Mga Review",
    "profile.toPay": "Bayaran",
    "profile.toShip": "Ipadala",
    "profile.toReceive": "Madawat",
    "profile.toPickUp": "Kuhaon",
    "profile.notifications": "Mga Pahibalo",
    "profile.messages": "Mga Mensahe",
    "profile.vouchers": "Mga Voucher",
    "profile.myShop": "Akong Tindahan",
    "profile.dashboard": "Dashboard",
    "profile.becomeSeller": "Mahimong Magbabaligya",
    "profile.registerNow": "Mag-rehistro Karon",
    "profile.helpCenter": "Sentro sa Tabang",
    "profile.contactUs": "Kontaka Kami",
    "profile.settings": "Mga Setting",
    "profile.privacy": "Privacy ug Seguridad",
    "profile.wishlistEmpty": "Walay sulod ang imong wishlist",
    "profile.browseProducts": "I-browse ang mga Produkto",
    "profile.manageProducts": "Pagdumala sa imong mga produkto ug order",
    "profile.startStore": "Sugdi ang imong tindahan sa Emoorm",
    "profile.getSupport": "Kuhaon ang tabang ug mga tubag",

    // Common
    "common.addToCart": "Idugang sa Cart",
    "common.seeAll": "Tan-awa Tanan",
  },
};

interface LanguageContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  lang: "en",
  setLang: () => {},
  t: (key) => key,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("emoorm_lang") as Lang;
      if (saved === "en" || saved === "tl" || saved === "ceb")
        setLangState(saved);
    } catch {}
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem("emoorm_lang", l);
    } catch {}
  }, []);

  const t = useCallback(
    (key: string): string => {
      return translations[lang]?.[key] ?? translations["en"][key] ?? key;
    },
    [lang],
  );

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
