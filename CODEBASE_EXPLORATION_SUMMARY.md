# Bella's Paradise - Codebase Exploration Summary

**Generated:** April 26, 2026  
**Project Type:** Next.js E-commerce Platform with Booking System

---

## 1. DATABASE SCHEMA & RELATIONSHIPS

### 1.1 Core Tables

#### **users**
- **Primary Key:** `id` (text, auto-generated)
- **Key Fields:**
  - `firstName`, `lastName` (string)
  - `email`, `mobile` (string)
  - `address` (string)
  - `profilePictureUrl` (string/URI)
  - `qrCode` (string)
  - `role` (string: 'admin', 'user', etc.)
- **Location:** Supabase Auth integration
- **File References:** [src/supabase/provider.tsx](src/supabase/provider.tsx)

#### **facilities** (Products/Items)
- **Primary Key:** `id` (uuid)
- **Key Fields:**
  - `name`, `description` (string)
  - `capacity` (number) - guest count
  - `pricePerNight` (number)
  - `imageUrl` (string/URI)
  - `status` (string: 'Available', 'Under Maintenance')
  - `storeId` / `sellerId` (text) - FK to stores
  - `rating` (number, optional - denormalized)
  - `sold` (integer) - product sold count
  - **Auction Fields:**
    - `isAuction` (boolean, default: false)
    - `startingBid`, `currentBid` (numeric)
    - `currentBidderId` (text)
    - `auctionEndDate` (timestamptz)
  - `category`, `type` (string)
- **Migration Files:** [supabase-migration-add-bidding.sql](supabase-migration-add-bidding.sql), [supabase-migration-add-sold.sql](supabase-migration-add-sold.sql)

#### **bookings** (Orders)
- **Primary Key:** `id` (uuid)
- **Key Fields:**
  - `userId` (text) - FK to users
  - `facilityId` (text/uuid) - FK to facilities
  - `storeId` (text) - FK to stores
  - `startDate`, `endDate` (timestamptz)
  - `numberOfGuests` (number)
  - `quantity` (number)
  - `totalPrice` (number)
  - `status` (string: 'To Pay', 'Pending', 'Confirmed', 'To Ship', 'To Receive', 'Completed', 'Cancelled')
  - `bookingDate`, `createdAt` (timestamptz)
  - `specialRequests` (string, optional)
  - `paymentMethod` (string: 'onsite', 'gcash')
  - `fulfillmentMethod` (string: 'delivery', 'pickup')
  - `shippingAddress` (string)
  - `gcashProofUrl`, `gcashRef` (string, optional) - GCash payment proof
- **File References:** [src/app/my-bookings/page.tsx](src/app/my-bookings/page.tsx#L43), [src/app/orders/[id]/page.tsx](src/app/orders/[id]/page.tsx#L35)

#### **stores** (Seller Profiles)
- **Primary Key:** `id` (text, user.uid)
- **Key Fields:**
  - `name`, `description` (string)
  - `sellerId` (text) - FK to users
  - `imageUrl` (string)
  - `rating` (number, optional - denormalized)
  - `followerCount` (integer, default: 0)
  - `verified` (boolean, default: false) - admin approval
  - `verified_at`, `verified_by_admin_id` (timestamptz/text)
  - `verification_notes` (text)
  - `latitude`, `longitude` (double precision) - location
  - `qrphUrl` (text) - QR PH payment URL
- **Migration Files:** [supabase-migration-add-seller-verification.sql](supabase-migration-add-seller-verification.sql), [supabase-migration-add-store-location.sql](supabase-migration-add-store-location.sql), [supabase-migration-add-qrphUrl.sql](supabase-migration-add-qrphUrl.sql)

#### **reviews** (Product/Service Reviews)
- **Status:** ✅ Table referenced but NO schema migration provided
- **Inferred Structure** (from code usage):
  - `id` (uuid, primary key)
  - `storeId` (text) - FK to stores
  - `userId` (text) - FK to users
  - `rating` (number, 1-5)
  - `text` / `comment` (string)
  - `createdAt` (timestamptz)
- **File References:** [src/app/seller/analytics/page.tsx](src/app/seller/analytics/page.tsx#L54-L61)
- **Note:** Currently using mock reviews in [src/app/book/[id]/page.tsx](src/app/book/[id]/page.tsx#L125)

#### **bids** (Auction Bids)
- **Primary Key:** `id` (uuid)
- **Key Fields:**
  - `productId` (text) - FK to facilities
  - `bidderId` (text) - FK to users
  - `amount` (numeric)
  - `createdAt` (timestamptz)
- **Migration File:** [supabase-migration-add-bidding.sql](supabase-migration-add-bidding.sql#L15-L19)

#### **store_followers** (Follow System)
- **Primary Key:** `id` (uuid)
- **Key Fields:**
  - `storeId` (text) - FK to stores
  - `userId` (text) - FK to users
  - `createdAt` (timestamptz)
  - **Constraint:** UNIQUE(`storeId`, `userId`)
- **Migration File:** [supabase-migration-add-store-followers.sql](supabase-migration-add-store-followers.sql#L7-L13)

#### **messages** (Chat System)
- **Key Fields:**
  - `id`, `senderId`, `recipientId` (text)
  - `content` (string)
  - `timestamp` (timestamptz)
  - `isRead` (boolean)
- **File References:** [supabase-migration-chat-privacy.sql](supabase-migration-chat-privacy.sql)

#### **conversations** (Chat Conversations)
- **Key Fields:**
  - `id`, `userId` (text)
  - **RLS Enabled:** Users only see own conversations
- **File References:** [supabase-migration-chat-privacy.sql](supabase-migration-chat-privacy.sql)

#### **notifications**
- **Key Fields:**
  - `id` (uuid)
  - `userId`, `title`, `content` (string)
  - `type` (string: 'booking', 'system', 'promo', 'order')
  - `timestamp` (timestamptz)
  - `isRead` (boolean)

#### **wishlist** (User Wishlist)
- **Key Fields:**
  - `userId`, `productId` (text)
- **File References:** [src/app/wishlist/page.tsx](src/app/wishlist/page.tsx#L18)

#### **cart_items** (Shopping Cart)
- **Key Fields:**
  - `userId`, `productId` (text)
  - `quantity` (number)
  - **Constraint:** UNIQUE(`userId`, `productId`)
- **File References:** [src/app/checkout/page.tsx](src/app/checkout/page.tsx#L117)

### 1.2 Relationships Diagram

```
users (1) ─── (N) bookings
users (1) ─── (N) wishlist
users (1) ─── (N) cart_items
users (1) ─── (N) messages
users (1) ─── (N) bids
users (1) ─── (N) store_followers
users (1) ─── (1) stores (as sellerId)

stores (1) ─── (N) facilities
stores (1) ─── (N) bookings
stores (1) ─── (N) reviews
stores (1) ─── (N) store_followers

facilities (1) ─── (N) bookings
facilities (1) ─── (N) bids
facilities (1) ─── (N) reviews (implied)
```

---

## 2. API ENDPOINTS STRUCTURE

### 2.1 Current API Endpoints

#### **POST /api/chat**
- **Purpose:** AI assistant endpoint using HuggingFace Inference API
- **Runtime:** Node.js (maxDuration: 60s)
- **Features:**
  - Uses Qwen2.5-72B-Instruct model
  - Fetches relevant context from Supabase
  - Supports language parameter
- **File:** [src/app/api/chat/route.ts](src/app/api/chat/route.ts)
- **Dependencies:**
  - `@/ai/local-assistant` - askAssistant, getRelevantData functions
  - Environment: `HF_TOKEN` required

#### **GET /api/chat** (Diagnostic)
- **Purpose:** Check HF_TOKEN availability
- **Returns:** Token status, environment info

#### **POST /api/admin/delete-user**
- **Purpose:** Admin user deletion endpoint
- **Authentication:** Bearer token required
- **Authorization:** Admin role only (checked via users.role = 'admin')
- **File:** [src/app/api/admin/delete-user/route.ts](src/app/api/admin/delete-user/route.ts)
- **Dependencies:** Supabase service role key

#### **POST /api/check-image-clarity**
- **Purpose:** Blur detection for uploaded images
- **Method:** Multipart form with "image" field
- **Returns:** `{ isClear: boolean, score: number }`
- **Algorithm:** Laplacian variance calculation (3×3 kernel)
- **File:** [src/app/api/check-image-clarity/route.ts](src/app/api/check-image-clarity/route.ts)
- **Dependencies:** `sharp` library

### 2.2 API Structure Hierarchy

```
src/app/api/
├── admin/
│   └── delete-user/
│       └── route.ts (POST)
├── chat/
│   └── route.ts (GET, POST)
└── check-image-clarity/
    └── route.ts (POST)
```

### 2.3 Supabase Client Access Pattern

**File:** [src/supabase/client.ts](src/supabase/client.ts)
- **Method:** Singleton pattern with lazy initialization
- **Configuration:** [src/supabase/config.ts](src/supabase/config.ts)
  - Reads: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - Service role key: `SUPABASE_SERVICE_ROLE_KEY` (backend only)

### 2.4 Data Access Utilities

**File:** [src/supabase/index.ts](src/supabase/index.ts) - Main exports:
- `useSupabase()` - Hook to access Supabase client
- `useUser()` - Hook for current user
- `useStableMemo()` - Optimized memo for query configs
- `useCollection()` - Fetch multiple rows with filtering/ordering
- `useDoc()` - Fetch single document
- `addDocumentNonBlocking()` - Insert non-blocking
- `updateDocumentNonBlocking()` - Update non-blocking
- `deleteDocumentNonBlocking()` - Delete non-blocking
- `setDocumentNonBlocking()` - Upsert non-blocking

**File:** [src/supabase/use-collection.ts](src/supabase/use-collection.ts)
```typescript
SupabaseQueryConfig {
  table: string;
  filters?: Array<{ column: string; op: FilterOp; value: any }>;
  order?: { column: string; ascending: boolean };
}
```

---

## 3. ORDER/BOOKING SYSTEM IMPLEMENTATION

### 3.1 Booking Flow

#### **Stage 1: Browsing & Selection**
- **File:** [src/app/book/[id]/page.tsx](src/app/book/[id]/page.tsx)
- **Actions:**
  - Browse facility details
  - Select date range (using date picker)
  - Calculate nightstays via `differenceInDays()`
  - Calculate total price: `pricePerNight × nights`
  - Add to cart or proceed to checkout

#### **Stage 2: Cart Management**
- **File:** [src/app/cart/page.tsx](src/app/cart/page.tsx)
- **Table:** `cart_items` with structure:
  - `userId`, `productId`, `quantity`
  - Upsert on conflict: `userId,productId`
- **Operations:** Add, remove, update quantity

#### **Stage 3: Checkout**
- **File:** [src/app/checkout/page.tsx](src/app/checkout/page.tsx)
- **Key Features:**
  - Group items by `storeId`
  - Support multiple payment methods: 'onsite', 'gcash'
  - Support multiple fulfillment: 'delivery', 'pickup'
  - Fetch store data for grouped items
  - Generate booking records in `bookings` table
  - Auto-send messages to sellers via [src/lib/auto-message.ts](src/lib/auto-message.ts)
  - Create notifications for buyer & seller

#### **Stage 4: Order Tracking**
- **Files:**
  - User view: [src/app/my-bookings/page.tsx](src/app/my-bookings/page.tsx)
  - Order details: [src/app/orders/[id]/page.tsx](src/app/orders/[id]/page.tsx)
  - Seller view: [src/app/seller/orders/page.tsx](src/app/seller/orders/page.tsx)
- **Status Flow:**
  ```
  To Pay → Confirmed → To Ship → To Receive → Completed
           ↓
        (Cancelled)
  ```
- **Features:**
  - Status filtering and search
  - QR code scanning for order verification
  - Payment proof upload (GCash)
  - Seller can update status (non-blocking)
  - Notification system on status changes

### 3.2 Booking Data Model

**Core Structure (in `bookings` table):**
```typescript
interface Order/Booking {
  id: string;
  userId: string;                    // Buyer
  facilityId: string;                // Product/Facility
  storeId: string;                   // Seller's Store
  startDate: Date;                   // Check-in
  endDate: Date;                     // Check-out
  numberOfGuests: number;            // Quantity/Guest count
  quantity: number;                  // Also used for item qty
  totalPrice: number;
  paymentMethod: 'onsite' | 'gcash';
  fulfillmentMethod: 'delivery' | 'pickup';
  status: 'To Pay' | 'Pending' | 'Confirmed' | 'To Ship' | 'To Receive' | 'Completed' | 'Cancelled';
  bookingDate: Date;                 // When booked
  createdAt: Date;
  shippingAddress?: string;
  specialRequests?: string;
  gcashProofUrl?: string;            // Payment proof
  gcashRef?: string;
}
```

### 3.3 Booking Pages & Components

| Page | File | Purpose |
|------|------|---------|
| Browse/Book | [src/app/book/[id]/page.tsx](src/app/book/[id]/page.tsx) | Facility details, date selection, booking initiation |
| Cart | [src/app/cart/page.tsx](src/app/cart/page.tsx) | View/manage cart items |
| Checkout | [src/app/checkout/page.tsx](src/app/checkout/page.tsx) | Multi-step checkout, payment selection, order creation |
| My Orders | [src/app/my-bookings/page.tsx](src/app/my-bookings/page.tsx) | User view all their bookings |
| Order Detail | [src/app/orders/[id]/page.tsx](src/app/orders/[id]/page.tsx) | View single order, payment verification, status tracking |
| Seller Orders | [src/app/seller/orders/page.tsx](src/app/seller/orders/page.tsx) | Seller view customer orders, update status, QR scan |
| Admin Orders | [src/app/admin/orders/page.tsx](src/app/admin/orders/page.tsx) | Admin view all orders platform-wide |
| Admin Bookings | [src/app/admin-bookings/page.tsx](src/app/admin-bookings/page.tsx) | Resort admin view facility bookings |

### 3.4 Availability Checking

**File:** [src/app/book/[id]/page.tsx](src/app/book/[id]/page.tsx#L185-L193)

```typescript
// Fetch bookings for facility to show availability
const bookingsQuery = useStableMemo(() => {
  if (!id) return null;
  return {
    table: "bookings",
    filters: [{ column: "facilityId", op: "eq" as const, value: id }]
  };
}, [id]);

const { data: facilityBookings } = useCollection<Booking>(bookingsQuery);
```

**Usage:** Compare booked dates with selected date range to prevent conflicts

---

## 4. REVIEW/RATING SYSTEM

### 4.1 Current Implementation Status

#### ✅ **Implemented:**
1. **Mock Reviews Display** - Product detail page shows sample reviews
2. **Review Tab UI** - [src/app/book/[id]/page.tsx](src/app/book/[id]/page.tsx#L657-L1053)
3. **Reviews Table Reference** - Seller analytics fetches from reviews table
4. **Rating Fields** - Facilities & stores have `rating` fields (denormalized)
5. **Rating Display** - Homepage shows product/store ratings

#### ⚠️ **Partially Implemented:**
1. **Reviews Table** - Referenced in code but NO CREATE TABLE migration provided
2. **Review Creation** - No UI/API for submitting reviews
3. **Review Moderation** - No admin interface for review management

### 4.2 Review Data References

**Mock Reviews Example:**
```typescript
const MOCK_REVIEWS = [
  {
    name: "Maria S.",
    date: "Oct 2025",
    text: "Super fresh po yung mga gulay!...",
    avatar: "https://i.pravatar.cc/150?u=maria",
    stars: 5,
  },
  // ... more mock reviews
];
```
**File:** [src/app/book/[id]/page.tsx](src/app/book/[id]/page.tsx#L125-L145)

### 4.3 Review Analytics

**Seller Dashboard Usage:**
- **File:** [src/app/seller/analytics/page.tsx](src/app/seller/analytics/page.tsx#L54-L68)
- **Query:**
  ```typescript
  const reviewsConfig = useStableMemo(() => {
    if (!user) return null;
    return {
      table: "reviews",
      filters: [{ column: "storeId", op: "eq" as const, value: user.uid }],
    };
  }, [user]);
  const { data: reviews } = useCollection(reviewsConfig);
  ```
- **Metrics:**
  - Recent activity timeline (last 3 reviews surfaced)
  - Review count in overview stats
  - Star rating visualization (⭐ `rating` displayed)

### 4.4 Rating Fields in Tables

#### **Facilities Table:**
```sql
ALTER TABLE facilities ADD COLUMN rating integer;
```
- Used for product ratings
- Displayed on homepage: `{product.rating || 5.0}`
- Filter logic: `(p.rating ?? 0) >= 4` for quality products

#### **Stores Table:**
```sql
ALTER TABLE stores ADD COLUMN rating integer;
```
- Used for seller ratings
- Displayed on homepage: `{store.rating || 5.0}`

**File References:** [src/app/page.tsx](src/app/page.tsx#L252)

### 4.5 Missing Review Infrastructure

**⚠️ TODO Items:**
1. **Create Reviews Table Migration:**
   ```sql
   CREATE TABLE IF NOT EXISTS reviews (
     id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
     storeId text NOT NULL,
     facilityId text,
     userId text NOT NULL,
     rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
     text text,
     createdAt timestamptz DEFAULT now(),
     FOREIGN KEY (storeId) REFERENCES stores(id) ON DELETE CASCADE,
     FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
   );
   ```

2. **Review Submission UI** - Add to order completion page

3. **Review API Endpoint** - POST `/api/reviews` for submission

4. **Rating Aggregation Logic** - Update store/facility rating when review posted

5. **Review Moderation Views** - Admin/seller interfaces for managing reviews

---

## 5. ADMIN DASHBOARD & MANAGEMENT PAGES

### 5.1 Admin Structure

**Location:** [src/app/admin/](src/app/admin/)

| Module | File | Purpose |
|--------|------|---------|
| Products | [src/app/admin/products/page.tsx](src/app/admin/products/page.tsx) | Manage all products/facilities (CRUD) |
| Orders | [src/app/admin/orders/page.tsx](src/app/admin/orders/page.tsx) | View all platform orders with export |
| Users | [src/app/admin/users/page.tsx](src/app/admin/users/page.tsx) | Manage user accounts |
| Bookings | [src/app/admin-bookings/page.tsx](src/app/admin-bookings/page.tsx) | Resort admin - manage facility bookings |

**Features:**
- Role-based access control via `useIsAdmin()`
- Protected routes redirect to `/admin` if not admin
- Search, filter, CRUD operations
- CSV export for orders
- Status management

### 5.2 Seller Dashboard

**Location:** [src/app/seller/](src/app/seller/)

| Module | File | Purpose |
|--------|------|---------|
| Dashboard | [src/app/seller/dashboard/page.tsx](src/app/seller/dashboard/page.tsx) | Overview & quick stats |
| Analytics | [src/app/seller/analytics/page.tsx](src/app/seller/analytics/page.tsx) | Detailed analytics, revenue, reviews |
| Products | [src/app/seller/products/page.tsx](src/app/seller/products/page.tsx) | Manage own products |
| Orders | [src/app/seller/orders/page.tsx](src/app/seller/orders/page.tsx) | View customer orders, update status |

### 5.3 User Management

- **Delete User API:** [src/app/api/admin/delete-user/route.ts](src/app/api/admin/delete-user/route.ts)
  - Only admins can delete users
  - Prevents self-deletion
  - Uses service role for backend operations
  - Returns 401 if unauthorized, 403 if forbidden

---

## 6. KEY FEATURES IMPLEMENTED

### 6.1 Payment Integration
- **Methods Supported:** On-site, GCash
- **GCash Features:** 
  - QR code proof upload
  - Reference number tracking
  - `gcashProofUrl`, `gcashRef` fields in bookings

### 6.2 Fulfillment Options
- **Delivery** - Ship to address
- **Pickup** - Self-pickup
- Field: `fulfillmentMethod` in bookings table
- Multiple fulfillment options selectable per order

### 6.3 Notifications System
```sql
Type: 'booking', 'system', 'promo', 'order'
Fields: title, content, timestamp, isRead
Auto-sent on:
- Order placement (buyer + seller)
- Order status changes
- Review submissions
- Seller verification
```

### 6.4 Seller Verification System
```sql
stores table additions:
- verified (boolean, default: false)
- verified_at (timestamptz)
- verified_by_admin_id (text)
- verification_notes (text)
```
**File:** [supabase-migration-add-seller-verification.sql](supabase-migration-add-seller-verification.sql)

### 6.5 Auction/Bidding System
- **Facility Fields:**
  - `isAuction`, `startingBid`, `currentBid`, `currentBidderId`
  - `bidCount`, `auctionEndDate`
- **Bids Table:** Tracks individual bids with amounts
- **File:** [supabase-migration-add-bidding.sql](supabase-migration-add-bidding.sql)

### 6.6 Store Location Mapping
```sql
stores table additions:
- latitude (double precision)
- longitude (double precision)
Geographic index for map features
```
**File:** [supabase-migration-add-store-location.sql](supabase-migration-add-store-location.sql)

### 6.7 Payment Gateway Integration
- **QR PH Support:** `qrphUrl` field in stores table
- **File:** [supabase-migration-add-qrphUrl.sql](supabase-migration-add-qrphUrl.sql)

### 6.8 Chat System
- **Tables:** `conversations`, `messages`
- **Privacy:** Full RLS enabled with user-scoped access
- **Bot:** 'bella-bot' special sender for AI responses
- **File:** [supabase-migration-chat-privacy.sql](supabase-migration-chat-privacy.sql)

### 6.9 Follow System
- **Table:** `store_followers`
- **Features:** Follow/unfollow stores, follower count tracking
- **File:** [supabase-migration-add-store-followers.sql](supabase-migration-add-store-followers.sql)

---

## 7. SUPABASE FEATURES & SECURITY

### 7.1 Row Level Security (RLS)

**Enabled Tables:**
- `bookings` - Users see own bookings
- `wishlist` - Users see own wishlist
- `cart_items` - Users see own cart
- `messages`, `conversations` - Users see own messages
- `store_followers` - Users can only follow themselves
- `bids` - Users create own bids, all can view
- `reviews` - (When created) similar pattern expected

### 7.2 Storage Configuration

**Buckets:**
- `products` - Public bucket for product/facility images
- Policies for upload, download, delete

**File:** [supabase-storage-policies.sql](supabase-storage-policies.sql)

### 7.3 Realtime Subscriptions

**Enabled Tables:**
- `bids` - Live bid updates for auctions
- `store_followers` - Live follower count updates
- `messages` (likely) - Live chat messages

### 7.4 Authentication

**Methods:**
- Password-based email/password
- Anonymous auth (for signed-out users)
- `auth.uid()` for RLS policies

---

## 8. FILE ORGANIZATION

### 8.1 Project Structure

```
src/
├── app/
│   ├── admin/                          # Admin dashboard
│   │   ├── orders/page.tsx
│   │   ├── products/page.tsx
│   │   ├── users/page.tsx
│   │   └── ...
│   ├── seller/                         # Seller portal
│   │   ├── analytics/page.tsx
│   │   ├── dashboard/page.tsx
│   │   ├── orders/page.tsx
│   │   └── ...
│   ├── book/[id]/                      # Facility booking
│   ├── my-bookings/                    # User orders view
│   ├── orders/[id]/                    # Order details
│   ├── checkout/                       # Checkout flow
│   ├── cart/                           # Shopping cart
│   ├── api/
│   │   ├── admin/delete-user/
│   │   ├── chat/
│   │   └── check-image-clarity/
│   └── ...other pages...
├── supabase/
│   ├── client.ts                       # Singleton Supabase instance
│   ├── config.ts                       # Configuration
│   ├── provider.tsx                    # React context provider
│   ├── use-collection.ts               # Multi-row fetching hook
│   ├── use-doc.ts                      # Single document hook
│   ├── non-blocking-updates.ts         # CRUD operations
│   ├── auth.ts                         # Auth functions
│   └── index.ts                        # Main exports
├── components/
│   ├── admin-route-guard.tsx           # Admin protection
│   ├── layout/
│   │   └── header.tsx                  # Cart/notification badge
│   └── ui/                             # Shadcn components
├── lib/
│   ├── auto-message.ts                 # Order auto-messaging
│   ├── upload-image.ts
│   └── utils.ts
├── hooks/
│   ├── use-is-admin.ts                 # Admin role check
│   └── use-toast.ts
├── ai/
│   ├── genkit.ts
│   ├── local-assistant.ts              # Chat AI
│   └── flows/
└── types/
    └── xenova-transformers.d.ts
```

### 8.2 Key Database Migration Files

```
supabase-schema.sql                           # Base schema
supabase-storage-policies.sql                 # Storage RLS
supabase-migration-add-bidding.sql            # Auction system
supabase-migration-add-fulfillment-options.sql # Payment/delivery
supabase-migration-add-qrphUrl.sql            # QR PH
supabase-migration-add-seller-verification.sql # Seller approval
supabase-migration-add-sold.sql               # Sold count
supabase-migration-add-store-followers.sql    # Follow system
supabase-migration-add-store-location.sql     # Map locations
supabase-migration-chat-privacy.sql           # Chat RLS
```

---

## 9. ENVIRONMENT CONFIGURATION

### 9.1 Required Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...           # Backend only

# AI Chat
HF_TOKEN=hf_xxx                             # HuggingFace API token

# Image Processing
# (Image clarity API handles internally)
```

**Configuration File:** [src/supabase/config.ts](src/supabase/config.ts)

---

## 10. TECHNOLOGY STACK

- **Frontend Framework:** Next.js 14+ (App Router)
- **Database:** Supabase (PostgreSQL)
- **Authentication:** Supabase Auth
- **UI Framework:** Shadcn/ui with Tailwind CSS
- **State Management:** React Hooks + Supabase Context
- **Chat AI:** HuggingFace Inference API (Qwen2.5-72B)
- **Image Processing:** Sharp.js
- **Icons:** Lucide React
- **Date Handling:** date-fns

---

## 11. KEY INSIGHTS & RECOMMENDATIONS

### 11.1 Architecture Patterns

✅ **Strengths:**
- Clean separation between admin, seller, buyer interfaces
- Non-blocking operations prevent UI freezing
- Row Level Security for multi-tenant data isolation
- Singleton Supabase client pattern
- Reusable query hooks (useCollection, useDoc)

⚠️ **Observations:**
1. **Reviews table exists in code but no schema** - Migration needed
2. **Mock reviews hardcoded** - Should be dynamic from DB
3. **Rating fields denormalized** - Consider calculated field or materialized view
4. **No form validation visible** - Consider Zod/React Hook Form

### 11.2 Missing Components

- [ ] Review submission endpoint & UI
- [ ] Review moderation interface
- [ ] Rating aggregation logic
- [ ] Review schema migration
- [ ] Image upload progress tracking
- [ ] Bulk order export enhancement (currently CSV only)
- [ ] Booking conflict detection UI
- [ ] Payment gateway error handling improvement

### 11.3 Testing Considerations

- Booking availability conflict scenarios
- Multi-currency cart recalculation
- Seller notification delivery reliability
- Image clarity threshold tuning
- Auction bid increment validation
- Store follower count accuracy

---

**End of Exploration Summary**  
*Last Updated: April 26, 2026*
