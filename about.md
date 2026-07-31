# About E-Moorm

## What the System Is

**E-Moorm** is a hyperlocal digital marketplace web application focused on the province of **Oriental Mindoro, Philippines**. It connects local merchants, farmers, fishermen, and artisans with consumers seeking authentic, locally produced goods. The platform operates as a Progressive Web App (PWA), with a mobile-first responsive design.

> Note: The repository folder is named `BellasParadise-emoorm` and the original `docs/blueprint.md` references an earlier resort-booking concept ("Bella's Booking Bliss"). The codebase has since been transformed/repurposed into the **E-Moorm** marketplace, while still re-using legacy table names (e.g., `facilities` for products, `bookings` for orders).

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router, Turbopack), React 19 |
| Language | TypeScript |
| Backend / DB | Supabase (PostgreSQL, Auth, Storage, Realtime, RLS) |
| Styling | Tailwind CSS, Radix UI primitives, `tailwindcss-animate` |
| Forms / Validation | React Hook Form + Zod |
| AI | Google Genkit (`@genkit-ai/google-genai`), HuggingFace Transformers |
| Maps | Leaflet + react-leaflet |
| Animation | GSAP, canvas-confetti |
| PWA | `@ducanh2912/next-pwa` |
| QR | `qrcode.react`, `html5-qrcode` |
| Charts | Recharts |
| Dev port | `9002` (`npm run dev`) |

---

## Core User Roles

1. **Buyer (Consumer)** — Browses products/stores, places orders, bids on auctions, leaves reviews, follows stores, chats with sellers.
2. **Seller (Merchant)** — Registers a store, manages products, processes orders, views analytics, communicates with buyers.
3. **Admin** — Approves/verifies sellers, oversees the entire marketplace, moderates content, views platform-wide analytics.

---

## Key Features & Processes

### 1. Authentication & User Management
- Supabase email/password auth with email confirmation flow (`/confirm-email`, `/auth/callback`).
- User profile with QR code generation for identity/check-in.
- Role-based access via the `roles_admin` collection and `useIsAdmin` hook.
- Routes: `/login`, `/signup`, `/profile`, `/settings`.

### 2. Storefront / Marketplace Browsing
- Home page (`/`) with three browse modes: **Products**, **Stores**, **Map**.
- Filtering by category, municipality (15 Oriental Mindoro municipalities), price range, auction-only.
- Featured sections: Suggested Products, New Arrivals, Popular Stores.
- Only **verified sellers'** products/stores appear in the public feed.
- Categories: Vegetables, Fruits, Seafood, Meat, Snacks, Rice & Grains, Beverages, Condiments, Handicrafts, Wellness, Delicacies.

### 3. Seller Registration & Verification (`/seller/register`)
A multi-step verification flow requiring:
- Store details (name, description, category, logo, profile image)
- Address (city, barangay, full address) with map location picker
- Owner contact info
- Government ID upload (front + back)
- Selfie for face verification
- Image clarity check via AI (`/api/check-image-clarity`)

Stores are gated by an admin **verification flag** (`stores.verified`, `verified_at`, `verified_by_admin_id`, `verification_notes`). Products from unverified stores are hidden from the public feed.

### 4. Product Management (`/seller/products`)
- Sellers add/edit/delete listings (`/seller/products/add`).
- Stock, price, sold count, images, categories.
- **Auction support**: products can be listed as auctions with starting bid, current bid, bid count, end date.

### 5. Bidding / Auctions
- `bids` table with realtime updates via Supabase Realtime.
- Public bid history; users place/delete their own bids; admins have full access.

### 6. Orders & Checkout
- Cart (`/cart`) → Checkout (`/checkout`) → Order tracking (`/orders/[id]`, `/my-bookings`).
- **Fulfillment options** per store: delivery and/or pickup.
- **Payment methods**: Cash on Delivery and **GCash** (with QRPH URL, payment proof upload, GCash reference number).
- Bookings/orders are stored in the `bookings` table.

### 7. Reviews & Ratings
- Two review types: **product** and **seller** (1–5 stars + title + comment).
- Aggregated views: `review_ratings` (per product) and `seller_review_ratings` (per store).
- Helpful/unhelpful voting on reviews.
- API at `/api/reviews` (and `/api/reviews/[id]`).

### 8. Wishlist & Store Followers
- Buyers favorite products to a wishlist.
- Buyers follow stores; followers count is tracked per store.

### 9. Messaging & Notifications
- Direct chat between buyers and sellers (`/messages`, `/admin/messages`).
- Privacy-aware chat policies (see `supabase-migration-chat-privacy.sql`).
- Per-user notifications subcollection (booking, system, promo types).
- Auto-message helper (`src/lib/auto-message.ts`).

### 10. Map & Location
- Interactive Leaflet map showing stores across Oriental Mindoro.
- Location picker for sellers during registration.
- Municipality-level filtering.

### 11. Admin Dashboard (`/admin/*`)
Admin is an **oversight role**, not a seller — it cannot create or edit products. Capabilities:
- `/admin/dashboard` — platform overview, revenue chart, recent orders, quick actions to oversight pages
- `/admin/users` — track buyers, sellers, admins (search, filter, role toggle, delete via `/api/admin/delete-user`)
- `/admin/sellers` — verify/suspend/delete stores; gates which sellers appear in the public feed
- `/admin/products` — **moderation only**: search, filter, view listing, deactivate/reactivate, take down. Shows seller attribution (verified badge). No add/edit.
- `/admin/orders` — marketplace-wide order oversight
- `/admin/messages` — admin messaging
- `/admin/reports`, `/admin/analytics`, `/admin/settings`
- `/admin/test-verification` — internal verification tool (not in nav)

Admin access is enforced two ways:
- `useIsAdmin` hook reads `users.role === 'admin'` from the DB (no hardcoded email list).
- `AdminRouteGuard` redirects admin accounts away from buyer/seller pages back to `/admin/dashboard`.

### 12. AI Features (Google Genkit)
Located in `src/ai/flows/`:
- **Moormy Bot** (`bellas-bot-flow.ts`) — Conversational AI shopping assistant for buyers; aware of E-Moorm's categories, location, and policies. Exposed via `/api/chat`.
- **Optimize Facility Availability** — Analyzes order patterns to suggest discount/promotion strategies for low-demand periods.
- **Suggest Optimal Pricing** — Suggests optimal prices using historical data, competitor pricing, and seasonal trends.
- **Image Clarity Check** (`/api/check-image-clarity`) — Validates uploaded ID/selfie photos using HuggingFace Transformers locally.
- **Local Assistant** (`src/ai/local-assistant.ts`) — On-device AI helper.

### 13. PWA & Offline
- Installable as a PWA (`pwa-install-prompt.tsx`).
- Offline fallback page at `/offline`.
- Service worker via `next-pwa`.

### 14. First-Time User Experience
- `first-time-intro.tsx` onboarding component.
- Cookie consent banner.

---

## Data Model (Supabase / Postgres)

Primary tables (some retain legacy names from the resort-booking origin):

| Table | Purpose |
|---|---|
| `users` | User profiles, role (`admin`/buyer/seller), QR code |
| `stores` | Seller stores with verification, fulfillment options, GCash QRPH URL, location, follower count |
| `facilities` | **Products** (legacy name); supports auction columns and `sold` counter |
| `bookings` | **Orders** (legacy name); fulfillment method, GCash proof |
| `bids` | Auction bids (realtime-enabled) |
| `reviews` | Product & seller reviews with helpful/unhelpful counts |
| `wishlist` | Buyer's saved products |
| `messages` | Buyer↔seller chat |
| `notifications` | Per-user notifications subcollection |
| `roles_admin` | Admin user IDs |
| `store_followers` | Store follow relationships |

Migrations are tracked as individual `supabase-migration-*.sql` files at the repo root, plus storage policies (`supabase-storage-policies.sql`) and RLS fixes (`supabase-fix-stores-rls.sql`).

Row Level Security (RLS) is enabled on sensitive tables (e.g., `bids`, `reviews`) with policies restricting writes to the owning user and granting full access to admins.

---

## Project Structure (high level)

```
src/
├── app/                  # Next.js App Router pages & API routes
│   ├── api/              # /chat, /reviews, /admin/delete-user, /check-image-clarity
│   ├── admin/            # Admin dashboard, sellers, products, orders, etc.
│   ├── seller/           # Seller dashboard, products, orders, register
│   ├── book/[id]/        # Product detail page
│   ├── stores/[id]/      # Store detail page
│   ├── explore/[slug]/   # Category/location exploration
│   └── (buyer pages)     # cart, checkout, wishlist, messages, profile, etc.
├── ai/
│   ├── flows/            # Genkit flows (Moormy Bot, pricing, availability)
│   ├── genkit.ts         # Genkit config
│   └── local-assistant.ts
├── components/
│   ├── ui/               # Radix-based UI kit (shadcn-style)
│   ├── layout/           # header, footer, admin-layout, seller-layout
│   └── (feature comps)   # maps, reviews, intro, PWA prompt
├── supabase/             # Custom Supabase wrapper: provider, useDoc, useCollection, auth
├── hooks/                # use-mobile, use-toast, use-is-admin
└── lib/                  # utils, upload-image, auto-message, mindoro-cities-data

docs/
├── blueprint.md          # Original project blueprint (legacy resort concept)
└── backend.json          # Entity schemas (legacy)

supabase-*.sql            # Schema and migration files
```

---

## Brand & Design
- **Primary color**: Rausch `#FF385C` (Airbnb-style red)
- **Background**: White `#FFFFFF`
- **Accent**: Black `#000000`
- **Headings**: Playfair Display (serif)
- **Body**: Inter (sans-serif)
- Mobile-first with subtle GSAP animations on scroll/transitions

---

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start Next.js dev server on port 9002 (Turbopack) |
| `npm run build` | Production build |
| `npm run start` | Run production server |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript check (`tsc --noEmit`) |
| `npm run genkit:dev` | Start Genkit AI dev server |
| `npm run genkit:watch` | Genkit dev with file watching |

---

## Summary

E-Moorm is a full-featured, AI-augmented local-commerce platform tailored to Oriental Mindoro. It supports the complete buyer journey (browse → cart → pay via COD/GCash → review), the complete seller journey (register → verify → list → fulfill → analyze), and an admin verification & moderation layer — all underpinned by Supabase realtime data, Genkit-powered AI assistance, Leaflet-based mapping, and a PWA-ready Next.js 15 frontend.
