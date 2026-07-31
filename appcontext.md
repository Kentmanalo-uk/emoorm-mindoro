# App Context — E-Moorm

> Auto-generated context document. Contains all system-level information gathered from the codebase.

---

## 1. Project Overview

| Field | Value |
|---|---|
| App Name | **E-Moorm** (a.k.a. Emoorm Mindoro) |
| App Title (metadata) | `Emoorm Mindoro ︱Agriculture Marketplace` |
| Description | Hyperlocal digital marketplace for **Oriental Mindoro, Philippines** |
| Repository Folder | `BellasParadise-emoorm` |
| Origin | Repurposed from "Bella's Booking Bliss" resort-booking app (legacy table names remain) |
| Dev Port | `9002` |
| App Type | Progressive Web App (PWA), Mobile-first |
| Version | `0.1.0` |

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15.5.9 (App Router, Turbopack) |
| React | React 19.2.1 |
| Language | TypeScript 5 |
| Backend / DB | Supabase (PostgreSQL, Auth, Storage, Realtime, RLS) |
| Styling | Tailwind CSS 3.4.1, Radix UI, `tailwindcss-animate` |
| Component Library | shadcn/ui (via `components.json`, Radix primitives) |
| Forms & Validation | React Hook Form 7.54.2 + Zod 3.24.2 |
| AI (Cloud) | Google Genkit 1.20.0 (`@genkit-ai/google-genai`, Gemini 2.5 Flash) |
| AI (Local/Edge) | HuggingFace Transformers 3.8.1 |
| AI (Chat API) | HuggingFace Inference API — models: Qwen2.5-72B, Llama-3.3-70B, Mistral-7B |
| Maps | Leaflet 1.9.4 + react-leaflet 5.0.0 |
| Animation | GSAP 3.12.5, canvas-confetti 1.9.4 |
| Carousel | embla-carousel-react 8.6.0 |
| Charts | Recharts 2.15.1 |
| PWA | `@ducanh2912/next-pwa` 10.2.9 |
| QR | `qrcode.react` 4.2.0, `html5-qrcode` 2.3.8 |
| Image Processing | sharp 0.34.5 |
| Date Utilities | date-fns 3.6.0 |

---

## 3. Environment Variables (Keys)

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous/public key |
| `HF_TOKEN` | HuggingFace API token for Moormy Bot chat inference |
| `GOOGLE_GENAI_API_KEY` | (implied) Google AI key used by Genkit flows |

Supabase Project Ref: `ypnoqmkjpvqiddfiapys`

---

## 4. User Roles

| Role | Description |
|---|---|
| **Buyer (Consumer)** | Browses products/stores, places orders, bids on auctions, leaves reviews, follows stores, chats with sellers |
| **Seller (Merchant)** | Registers a store, manages products, processes orders, views analytics, communicates with buyers |
| **Admin** | Approves/verifies sellers, moderates content, manages users, views platform analytics |

Admin role is database-driven (`users.role === 'admin'`). No hardcoded email lists. The `useIsAdmin` hook queries the `users` table. `AdminRouteGuard` enforces routing boundaries.

---

## 5. Application Routes

### Public / Buyer Routes
| Route | Purpose |
|---|---|
| `/` | Home — product feed, category filter, banner, store listings, map tab |
| `/login` | Login page |
| `/signup` | Sign-up page |
| `/confirm-email` | Email confirmation flow |
| `/auth/callback` | OAuth/email redirect callback |
| `/book/[id]` | Product detail page |
| `/stores/[id]` | Store detail page |
| `/explore/[slug]` | Category/location exploration |
| `/cart` | Shopping cart |
| `/checkout` | Checkout (address, payment) |
| `/orders/[id]` | Order detail / tracking |
| `/my-bookings` | All orders |
| `/wishlist` | Saved / favourited products |
| `/my-addresses` | Manage delivery addresses |
| `/my-reviews` | Buyer's submitted reviews |
| `/notifications` | User notifications |
| `/messages` | Buyer ↔ Seller chat |
| `/profile` | User profile |
| `/settings` | App settings (theme, language, address) |
| `/sell` | Seller landing / info page |
| `/sell/signup` | Start seller registration flow |
| `/customer-care` | Customer support page |
| `/feedback` | Feedback form |
| `/offline` | PWA offline fallback page |

### Seller Routes (`/seller/*`)
| Route | Purpose |
|---|---|
| `/seller/register` | Multi-step store registration + verification |
| `/seller/dashboard` | Seller dashboard home |
| `/seller/products` | Manage product listings |
| `/seller/products/add` | Add new product |
| `/seller/orders` | View and manage orders |
| `/seller/messages` | Seller ↔ Buyer chat |
| `/seller/analytics` | Sales analytics |
| `/seller/finance` | Finance / payout info |
| `/seller/reviews` | Customer reviews for store |
| `/seller/profile` | Store profile management |
| `/seller/settings` | Seller settings |
| `/seller/university` | Seller learning resources |

### Admin Routes (`/admin/*`)
| Route | Purpose |
|---|---|
| `/admin` | Admin entry redirect |
| `/admin/dashboard` | Platform overview, revenue chart, recent orders |
| `/admin/users` | User management (search, filter, role toggle, delete) |
| `/admin/sellers` | Seller verification — approve, suspend, delete stores |
| `/admin/products` | Product moderation — view, deactivate/reactivate, take down |
| `/admin/messages` | Admin messaging |
| `/admin/orders` | Platform-wide order oversight |
| `/admin/analytics` | Platform analytics |
| `/admin/reports` | Reports |
| `/admin/reviews` | Review moderation |
| `/admin/bidding` | Auction / bidding oversight |
| `/admin/audit-log` | Admin action audit log |
| `/admin/settings` | Admin settings |
| `/admin/vouchers` | Voucher management |
| `/admin/test-verification` | Internal verification tool (not in nav) |

### API Routes (`/api/*`)
| Route | Method | Purpose |
|---|---|---|
| `/api/chat` | GET, POST | Moormy Bot — HuggingFace-backed AI chat assistant |
| `/api/reviews` | GET, POST | Review CRUD |
| `/api/reviews/[id]` | GET, PUT, DELETE | Single review operations |
| `/api/check-image-clarity` | POST | AI image clarity validation (ID/selfie uploads) |
| `/api/admin/delete-user` | DELETE | Admin-only user deletion |

---

## 6. Data Model (Supabase / PostgreSQL)

### Core Tables

| Table | Purpose | Legacy Note |
|---|---|---|
| `users` | User profiles, `role` field (`admin`/buyer/seller), QR code | — |
| `stores` | Seller stores — verification status, fulfillment options, GCash QRPH URL, geo-location, follower count | — |
| `facilities` | **Products** (legacy resort facility name) — supports auction columns, `sold` counter | Renamed from resort concept |
| `bookings` | **Orders** (legacy name) — fulfillment method, GCash payment proof | Renamed from resort concept |
| `bids` | Auction bids — realtime-enabled | — |
| `reviews` | Product & seller reviews (1–5 stars, title, comment, helpful/unhelpful counts) | — |
| `wishlist` | Buyer saved products | — |
| `messages` | Buyer ↔ Seller chat threads | — |
| `conversations` | Chat conversation threads between users | — |
| `notifications` | Per-user notifications (booking, system, promo types) | — |
| `roles_admin` | Admin user IDs collection | — |
| `store_followers` | Store follow relationships | — |

### Key Column Details

**`stores` table additions (via migrations):**
- `verified`, `verified_at`, `verified_by_admin_id`, `verification_notes`
- `fulfillment_options` (delivery, pickup)
- `qrph_url` (GCash QR)
- `latitude`, `longitude`
- `follower_count`

**`facilities` table additions:**
- `isAuction`, `auctionEndDate`, `currentBid`, `startingBid`, `bidCount`
- `sold` (sales counter)
- `city`, `municipality`
- `sellerId`, `storeId`

**`bookings` table additions:**
- `fulfillmentMethod`
- GCash payment proof fields

### Supabase Migration Files (at repo root)
- `supabase-migration-add-bidding.sql`
- `supabase-migration-add-fulfillment-options.sql`
- `supabase-migration-add-fulfillmentMethod.sql`
- `supabase-migration-add-qrphUrl.sql`
- `supabase-migration-add-reviews.sql`
- `supabase-migration-add-seller-verification.sql`
- `supabase-migration-add-sold.sql`
- `supabase-migration-add-store-followers.sql`
- `supabase-migration-add-store-location.sql`
- `supabase-migration-add-admin-features.sql`
- `supabase-migration-chat-privacy.sql`
- `supabase-migration-review-functions.sql`
- `supabase-fix-stores-rls.sql`
- `supabase-storage-policies.sql`

---

## 7. Source File Structure

```
src/
├── ai/
│   ├── flows/
│   │   ├── bellas-bot-flow.ts          — Moormy Bot (Genkit Gemini 2.5 Flash)
│   │   ├── optimize-facility-availability.ts — AI discount/promo strategy
│   │   └── suggest-optimal-pricing.ts  — AI pricing suggestions
│   ├── dev.ts                          — Genkit dev server entry
│   ├── genkit.ts                       — Genkit config (googleAI plugin, Gemini 2.5 Flash)
│   └── local-assistant.ts             — Moormy Bot via HuggingFace Inference API
│
├── app/
│   ├── globals.css                     — Tailwind base + full CSS design system
│   ├── layout.tsx                      — Root layout (SupabaseProvider, LanguageProvider, AdminRouteGuard, AuthModal, FloatingChat, Toaster, ThemeColorMeta)
│   ├── page.tsx                        — Home page (product feed, categories, banner, store cards, map)
│   ├── not-found.tsx                   — 404 page
│   ├── favicon.ico
│   ├── admin/                          — All admin pages
│   ├── api/                            — API route handlers
│   ├── auth/callback/                  — Auth redirect handler
│   ├── book/[id]/                      — Product detail
│   ├── cart/                           — Shopping cart
│   ├── checkout/                       — Checkout flow
│   ├── confirm-email/                  — Email confirmation
│   ├── customer-care/                  — Support page
│   ├── explore/[slug]/                 — City/category exploration
│   ├── feedback/                       — Feedback form
│   ├── lib/placeholder-images.json     — Placeholder image URLs
│   ├── login/                          — Login
│   ├── messages/                       — Messaging
│   ├── my-addresses/                   — Address management
│   ├── my-bookings/                    — Order history
│   ├── my-reviews/                     — Reviews
│   ├── notifications/                  — Notifications
│   ├── offline/                        — PWA offline fallback
│   ├── orders/[id]/                    — Order tracking
│   ├── profile/                        — User profile
│   ├── sell/                           — Seller landing + signup
│   ├── seller/                         — Seller dashboard pages
│   ├── settings/                       — App settings
│   ├── signup/                         — Registration
│   ├── stores/[id]/                    — Store page
│   └── wishlist/                       — Wishlist
│
├── components/
│   ├── layout/
│   │   ├── header.tsx                  — Desktop + mobile header with search, nav, top bar
│   │   ├── footer.tsx                  — Site footer
│   │   ├── admin-layout.tsx            — Admin panel layout wrapper
│   │   └── seller-layout.tsx           — Seller dashboard layout wrapper
│   ├── ui/                             — shadcn/Radix UI components
│   │   ├── accordion, alert, alert-dialog, avatar, badge
│   │   ├── button, calendar, card, carousel, chart
│   │   ├── checkbox, collapsible, dialog, dropdown-menu
│   │   ├── form, input, label, menubar, popover
│   │   ├── progress, radio-group, scroll-area, select
│   │   ├── seller-info-stepper.tsx     — Step indicator for seller registration
│   │   ├── seller-registration-form.tsx — Full multi-step seller reg form
│   │   ├── separator, sheet, sidebar, skeleton
│   │   ├── slider, switch, table, tabs, textarea
│   │   ├── toast, toaster, tooltip
│   ├── admin-route-guard.tsx           — Redirects admin users away from buyer/seller pages
│   ├── auth-modal.tsx                  — Login/signup modal overlay
│   ├── explore-mindoro-carousel.tsx    — City exploration carousel
│   ├── first-time-intro.tsx            — First-time user onboarding
│   ├── floating-chat.tsx               — Moormy Bot floating chat widget
│   ├── location-picker-map.tsx         — Leaflet map for seller location
│   ├── mindoro-store-map.tsx           — Map showing all stores
│   ├── pwa-install-prompt.tsx          — PWA install banner
│   ├── rating-stars.tsx                — Star rating display
│   ├── review-form.tsx                 — Write a review form
│   ├── review-modal.tsx                — Review modal wrapper
│   ├── reviews-list.tsx                — Display list of reviews
│   └── theme-color-meta.tsx            — Dynamic theme-color meta tag
│
├── contexts/
│   └── language-context.tsx           — Language provider (English / Filipino / Bisaya) + t() translation hook
│
├── fonts-assets/
│   ├── css/clash-display.css          — ClashDisplay font CSS
│   ├── fonts/ClashDisplay-*.{eot,ttf,woff,woff2}  — All ClashDisplay weights
│   └── Satoshi_Font_Family/           — Satoshi font (OTF, TTF, WEB)
│
├── hooks/
│   ├── use-is-admin.ts                — Checks DB if current user is admin
│   ├── use-mobile.tsx                 — Mobile breakpoint detection hook
│   └── use-toast.ts                   — Toast notification hook
│
├── lib/
│   ├── admin-audit.ts                 — Admin action audit log helper
│   ├── auto-message.ts               — Sends automated order/GCash messages to seller
│   ├── mindoro-cities-data.ts        — 15 Oriental Mindoro municipalities data (lat/lng, description, highlights, products)
│   ├── placeholder-images.json       — Fallback image URL map
│   ├── placeholder-images.ts         — Placeholder image utility
│   ├── upload-image.ts               — Image upload to Supabase Storage
│   └── utils.ts                      — `cn()` utility (clsx + tailwind-merge)
│
├── supabase/
│   ├── auth.ts                        — Auth helpers: signUp, signIn, Google OAuth, Phone OTP
│   ├── client.ts                      — Singleton Supabase client factory
│   ├── config.ts                      — Supabase URL + anon key config
│   ├── index.ts                       — Re-exports all supabase module exports
│   ├── non-blocking-updates.ts        — Fire-and-forget CRUD helpers
│   ├── provider.tsx                   — SupabaseContext, SupabaseProvider, useUser, useSupabase, useSupabaseAuth, useStableMemo
│   ├── use-collection.ts              — Realtime collection query hook
│   └── use-doc.ts                     — Realtime single document hook
│
└── types/
    └── xenova-transformers.d.ts       — Type definitions for HuggingFace Transformers
```

---

## 8. Key Features

### Authentication
- Email/password with email confirmation (`/confirm-email`, `/auth/callback`)
- Google OAuth (redirect-based)
- Phone OTP (SMS)
- Stale refresh-token auto sign-out
- User profile with QR code identity

### Marketplace Home (`/`)
- Animated banner carousel (4 slides, infinite loop, GSAP transitions)
- Category grid: Vegetables, Fruits, Seafood, Meat, Snacks, Rice & Grains, Beverages, Condiments, Handicrafts, Wellness, Delicacies
- Three browse modes: Products | Stores | Map
- Filters: category, municipality (15), price range (min/max), auction-only
- Sort: relevant, price asc/desc, best rated, best selling
- Feed sections: Suggested For You, New Arrivals, Popular Stores
- Only verified sellers appear in the public feed
- Municipality filter: All + 15 Oriental Mindoro municipalities

### Seller Verification Flow (`/seller/register`)
Multi-step registration requiring:
1. Store details (name, description, category, logo)
2. Address with map location picker
3. Owner contact info
4. Government ID front + back upload
5. Selfie upload
6. AI image clarity check (`/api/check-image-clarity`)

Gate: `stores.verified` must be `true` for products to appear publicly.

### Bidding / Auctions
- `bids` table with Supabase Realtime updates
- Public bid history, user can place/delete bids
- Admin full access to all bids

### Orders & Checkout
- Cart → Checkout → Order tracking
- Fulfillment options per store: delivery and/or pickup
- Payment methods: Cash on Delivery (COD), GCash (with QRPH URL, payment proof upload, reference number)
- Auto-message to seller on order placement
- GCash proof auto-message with full payment details

### Reviews & Ratings
- Two review types: product and seller (1–5 stars + title + comment)
- Helpful/unhelpful voting
- Aggregated via `review_ratings` and `seller_review_ratings` DB views
- API: `GET/POST /api/reviews`, `GET/PUT/DELETE /api/reviews/[id]`

### AI Features
| Feature | Technology | Endpoint |
|---|---|---|
| Moormy Bot (chat) | HuggingFace Inference API (Qwen, Llama, Mistral) | `POST /api/chat` |
| Moormy Bot (Genkit) | Google Genkit + Gemini 2.5 Flash | `bellas-bot-flow.ts` |
| Image clarity check | HuggingFace Transformers (local) | `POST /api/check-image-clarity` |
| Pricing suggestions | Google Genkit | `suggest-optimal-pricing.ts` |
| Availability optimization | Google Genkit | `optimize-facility-availability.ts` |

Moormy Bot system features:
- Prompt injection defense (6+ regex patterns)
- Intent detection (orders, products, stores, reviews, auctions, payment, etc.)
- Keyword extraction with stop-word filtering
- Live Supabase context injection (real products, stores, stats)
- Language support: English, Tagalog (Filipino), Cebuano (Bisaya)
- Model fallback chain: Qwen2.5-72B → Llama-3.3-70B → Mistral-7B

### Map & Location
- Interactive Leaflet map of all stores across Oriental Mindoro
- Seller location picker during registration
- Municipality-level filtering

### Internationalization
Three supported languages via `LanguageProvider`:
- `en` — English (default)
- `tl` — Filipino/Tagalog
- `ceb` — Cebuano/Bisaya

Keys cover: topbar, nav, search, home sections, sorting, filters, product details, profile, common UI. Stored in `localStorage` as `emoorm_lang`.

### PWA
- Installable as PWA (`pwa-install-prompt.tsx`)
- Offline fallback at `/offline`
- Service worker via `@ducanh2912/next-pwa`
- Manifest at `public/manifest.json`
- Multiple icon sizes: 72, 96, 128, 144, 152, 192, 384, 512 (normal + maskable)
- Workbox caching strategy:
  - Google Fonts: CacheFirst, 1 year
  - Next.js static: CacheFirst, 1 year
  - Supabase Storage: CacheFirst, 7 days
  - Supabase REST: NetworkFirst, 1 day
  - Supabase Auth: NetworkOnly (no cache)
  - External images: CacheFirst, 7 days
  - Local images: StaleWhileRevalidate, 30 days

### Theme
- Light and dark mode support (toggled via `localStorage` `theme` key)
- Dark mode uses CSS class strategy (`.dark` on `<html>`)
- Inline script in `<head>` prevents FOUC

---

## 9. Design System

### Colors (CSS Variables)
| Token | Light Mode | Dark Mode |
|---|---|---|
| `--primary` | `hsl(152 60% 40%)` = `#29a366` | same |
| `--background` | white | `hsl(0 0% 3%)` = `#050505` |
| `--foreground` | black | white |
| `--primary-color` | `#29a366` | — |
| `--nav-bg-glass` | `rgba(255,255,255,1)` | — |
| `--text-main` | `#1a1a1a` | — |
| `--text-muted` | `#555` | — |
| Top bar background | `#1e8a52` | — |

### Typography
| Font | Usage |
|---|---|
| Inter | Body (`--base-font`), headlines |
| Playfair Display | Logo/display (`--logo-font`), decorative headings |
| Ubuntu 700 | (loaded, available) |
| ClashDisplay | All weights (Extralight → Bold + Variable), bundled locally |
| Satoshi | Bundled locally (OTF, TTF, WEB) |

### Layout Constants
| Variable | Value |
|---|---|
| `--nav-height` | 90px (desktop) |
| `--top-bar-height` | 36px (desktop only) |
| `--mobile-nav-height` | 70px |
| `--bottom-nav-height` | 84px |
| `--radius` | 25px |
| Max content width | 1280px |

### Responsive Strategy
- Desktop nav: fixed top bar + site nav
- Mobile: hidden desktop nav, mobile bottom nav (fixed)
- Breakpoint: 768px

---

## 10. Supabase Module Architecture

Exports from `@/supabase`:
- `SupabaseProvider` — React context provider
- `useSupabase()` — raw Supabase client
- `useSupabaseAuth()` — client + signOut + user
- `useAuth()` — Supabase `auth` interface
- `useUser()` — `{ user, isUserLoading, userError }`
- `useStableMemo()` — stable memoization helper
- `useCollection<T>(config)` — realtime collection query
- `useDoc<T>(config)` — realtime single document
- `setDocumentNonBlocking`, `addDocumentNonBlocking`, `updateDocumentNonBlocking`, `deleteDocumentNonBlocking` — fire-and-forget CRUD
- `initiateEmailSignUp`, `initiateEmailSignIn` — auth helpers

---

## 11. Mindoro Municipalities (15)

All municipalities with data in `mindoro-cities-data.ts`:

| Municipality | Lat | Lng | Known For |
|---|---|---|---|
| Calapan City | 12.7556 | 121.1869 | Provincial capital, markets, commerce |
| Puerto Galera | 13.8131 | 120.9624 | Diving, beaches, tourism |
| Bongabong | 12.4833 | 121.3167 | Coastal, coconuts |
| Roxas | 12.6 | 121.25 | Fishing, seafood |
| San Teodoro | 12.8667 | 121.5167 | Agriculture, rural |
| Mansalay | 12.4 | 121.3833 | Pristine beaches |
| Naujan | 12.7167 | 121.4167 | Naujan Lake, bird sanctuary |
| Pinamalayan | 12.65 | 121.35 | Agriculture, rice |
| Pola | 12.5 | 121.35 | Fishing community |
| Bansud | 12.3 | 121.4 | Southern agriculture |
| Bulalacao | 12.6 | 121.55 | Eastern coast |
| Gloria | 12.75 | 121.6 | Mountain + coastal |
| Socorro | 12.9 | 121.4 | Historical sites |
| Baco | 12.6 | 121.1 | Western, coconut, fishing |
| Victoria | 12.35 | 121.3 | Southern coastal, maritime |

---

## 12. Scripts & Commands

| Command | Action |
|---|---|
| `npm run dev` | Next.js dev server on port 9002 (Turbopack) |
| `npm run build` | Production build |
| `npm run start` | Run production server |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript check (`tsc --noEmit`) |
| `npm run genkit:dev` | Start Genkit AI dev server |
| `npm run genkit:watch` | Genkit dev with file watching |

---

## 13. Public Assets

```
public/
├── manifest.json                      — PWA manifest
├── sw.js                              — Service worker
├── workbox-*.js                       — Workbox runtime
├── fallback-*.js                      — Offline fallback bundle
├── brand-icon.png                     — App logo/favicon
├── icon-{72,96,128,144,152,192,384,512}x{...}.png  — PWA icons (normal + maskable)
├── icons/
│   ├── icon-192x192{-maskable}.png
│   ├── icon-512x512{-maskable}.png
│   ├── icon-base.png
│   ├── icon.svg
│   ├── moormy-bot.jpg                 — Moormy Bot avatar
│   └── moormy-bot-v2.jpg              — Moormy Bot avatar v2
└── assets/
    ├── banners/
    │   ├── discover-mindoro.png
    │   ├── banner-qoute.png
    │   ├── season-banner.png
    │   └── buy-now-qoute.png
    ├── stickers/
    │   └── welcome-sticker.png        — First-time visit welcome overlay
    ├── delicacies.jpg
    ├── fruits.jpg
    ├── handicrafts.jpg
    ├── meat.jpg
    ├── rice and grains.jpg
    ├── seafood.jpg
    ├── snacks.jpg
    ├── vegetables.jpg
    └── wellness.jpg
```

---

## 14. Configuration Files

### `next.config.ts`
- PWA enabled (disabled in dev mode)
- Offline document fallback: `/offline`
- Aggressive front-end nav caching
- Cache headers: `/_next/static/*` — immutable 1 year; `/assets/*` — 7 days SWR
- `serverExternalPackages: ['sharp']`
- TypeScript and ESLint build errors ignored
- Allowed image hostnames: `placehold.co`, `images.unsplash.com`, `picsum.photos`, `lh3.googleusercontent.com`, `i.pinimg.com`, `i.pravatar.cc`, `shutterstock.com`, `nujddmdrhlvaqzszjnkt.supabase.co`, `ypnoqmkjpvqiddfiapys.supabase.co`

### `tailwind.config.ts`
- Dark mode: class strategy
- Content: `src/pages`, `src/components`, `src/app`
- Fonts: Inter (body/headline), Playfair Display (display), monospace (code)
- All colors driven by CSS HSL variables
- Custom border radius: `--radius` variable (25px base)
- Custom box shadows: sm → 2xl scale
- Plugin: `tailwindcss-animate`

### `tsconfig.json`
- Target: ES2017
- Strict: true
- Path alias: `@/*` → `./src/*`
- Module: esnext, bundler resolution
- JSX: preserve (Next.js handles it)

### `components.json` (shadcn/ui)
- Style: default
- RSC: true
- Tailwind config: `tailwind.config.ts`
- CSS: `src/app/globals.css`
- Base color: neutral
- CSS variables: enabled
- Icon library: lucide
- Aliases: `@/components`, `@/lib/utils`, `@/components/ui`, `@/lib`, `@/hooks`

### `postcss.config.mjs`
- Plugins: Tailwind CSS + Autoprefixer

---

## 15. Product Categories

| Category | Image Asset |
|---|---|
| Vegetables | `vegetables.jpg` |
| Fruits | `fruits.jpg` |
| Seafood | `seafood.jpg` |
| Meat | `meat.jpg` |
| Snacks | `snacks.jpg` |
| Rice & Grains | `rice and grains.jpg` |
| Handicrafts | `handicrafts.jpg` |
| Wellness | `wellness.jpg` |
| Delicacies | `delicacies.jpg` |
| Beverages | (no dedicated image) |
| Condiments | (no dedicated image) |

---

## 16. Workspace Structure

The repository contains **two projects** — the primary active app at the root, and a legacy/reference copy inside `mindoro-emoorm/`:

```
BellasParadise-emoorm/       ← ACTIVE project (this codebase)
├── src/
├── public/
├── node_modules/
├── package.json
└── ...

mindoro-emoorm/              ← Older/reference copy (same structure, no node_modules)
├── src/
├── public/
├── package.json
└── ...
```

Both folders share the same codebase lineage. The root project is the one with `node_modules` installed and is the active development target.

---

## 17. Order Flow

```
Buyer places order
    ↓
To Pay (pending payment confirmation)
    ↓
To Ship (seller preparing)
    ↓
To Receive / Ready to Pick Up
    ↓
Completed
    ↓ (optional)
Cancelled / Return (7-day window, unopened items)
```

**Payment methods:**
- Cash on Delivery (COD)
- GCash — buyer scans store's QRPH QR code, uploads proof screenshot, enters GCash reference number

---

## 18. Legacy / Notes

- Repository was originally "Bella's Paradise Farm Resort" booking system
- `facilities` table = products; `bookings` table = orders
- `docs/blueprint.md` describes the original resort-booking concept
- `docs/backend.json` contains original entity schemas (User, Facility, Booking, Message, Notification)
- The codebase has been fully repurposed into the E-Moorm marketplace
- `SELLER_VERIFICATION_GUIDE.md` documents the seller verification process
- `CODEBASE_EXPLORATION_SUMMARY.md` is a previous AI-generated exploration summary

---

*Generated: June 9, 2026*
