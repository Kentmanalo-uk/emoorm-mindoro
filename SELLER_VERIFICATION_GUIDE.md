# Seller Verification System - Complete Guide

## Overview
The seller verification system controls product visibility. Only verified sellers' products are visible to customers on the home page and explore sections.

## System Flow

```
Seller Registration
  ↓
Seller Creates Store Profile & Products
  ↓
Products created but NOT visible (verified = false by default)
  ↓
Admin Reviews Seller in "Manage Sellers"
  ↓
Admin Clicks "Verify Seller" ✓
  ↓
stores.verified = true (database updated)
  ↓
Real-time subscription triggers
  ↓
Home page filters refresh automatically
  ↓
Products NOW VISIBLE to all customers
```

## For Sellers

### Before Verification
- Can access seller dashboard at `/seller`
- Can see their own products in "My Products"
- Can edit and manage their store profile
- **Products NOT visible** to customers browsing

### After Verification  
- All of the above
- **Products ARE visible** on home page, search results, explore
- Badge shows "✓ Seller Verified" in seller settings
- Store appears in "Popular Stores" section

### Seller Dashboard View
The seller can always see the verification status in **Settings** > **Shop Settings**:
- **Blue card** = "✓ Seller Verified" - Products are PUBLIC
- **Orange card** = "⚠ Seller Unverified" - Products PRIVATE (you only)

## For Admins

### Managing Sellers (`/admin/sellers`)

#### Verification Button
1. Click **Menu** (⋮) on any seller card
2. Select "Verify Seller" or "Revoke Verification"
3. Confirm in dialog
4. Toast notification shows status
5. Seller card updates immediately

#### What Gets Updated
- ✅ `stores.verified` column = true/false
- ✅ `stores.verified_at` = timestamp or null
- ✅ Products automatically show/hide in customer view
- ✅ Seller notification (real-time via subscription)

#### Stats Dashboard
Shows at top:
- Total Sellers: Count of all registered sellers
- **Verified Sellers**: Only `verified = true` stores
- Total Products: All products across all sellers
- Suspended: Only `status = 'suspended'` stores

#### Filtering Options
- **Store Status**: Active / Suspended / All
- **Verification Status**: Verified / Unverified / All
- **Search**: By store name or category

### Steps to Verify a New Seller

1. Go to `/admin/sellers`
2. Find the seller in the list (use search if needed)
3. Look for "Unverified" badge (orange shield icon)
4. Click menu (⋮) → "Verify Seller"
5. Confirm in dialog
6. See toast: "✓ Seller verified - This seller is now verified. Their products will be visible to customers immediately."
7. Seller's verification status updates in real-time

### Revoke Verification
Same process, but select "Revoke Verification". Products will immediately hide from customers (except in order history).

## Database Schema

### stores table
```sql
- id (text, PK) - User ID of the store owner
- verified (BOOLEAN DEFAULT FALSE) - Visible to customers?
- verified_at (TIMESTAMP) - When admin verified
- verified_by_admin_id (TEXT) - Which admin verified
- status (text) - 'active' or 'suspended'
- ... other fields (name, description, etc.)
```

### facilities table (Products)
```sql
- id (UUID, PK)
- sellerId (TEXT) - Links to stores.id
- storeId (TEXT) - Links to stores.id (same as sellerId)
- status (text) - 'active', 'draft', etc.
- ... product fields
```

**Note**: Products DON'T have their own `verified` field. Visibility is determined by checking the linked store's `verified` status.

## Visibility Rules

### Home Page (`/`)
Products show if:
```
product.sellerId or product.storeId 
  → lookup store with that ID
    → store.verified === true
      → SHOW product
    → store.verified === false
      → HIDE product
```

### Product Detail (`/book/[id]`)
- If seller is NOT verified AND user is NOT the owner: Show "not available" message
- If verification passes: Show full product details

### Seller Dashboard (`/seller/products`)
- Shows ALL of seller's products regardless of verification status
- Seller can see their pending products

### Export/API
When fetching from database:
- `useCollection` hooks real-time subscribe to changes
- When admin changes `verified` status, ALL collection hooks refresh
- UI automatically updates without page reload

## Verification Database Updates (Fixed)

### Before Fix
```typescript
// Non-blocking - might not complete!
updateDocumentNonBlocking(supabase, "stores", storeId, {
  verified: true
});
// Show success immediately (might fail)
```

### After Fix
```typescript
// Blocking - waits for completion
const { error } = await supabase
  .from("stores")
  .update({ verified: true })
  .eq("id", storeId);

if (error) {
  // Handle error
} else {
  // Show success - guaranteed to have worked
}
```

## Testing Checklist

### Test 1: Verify a New Seller
1. Create new seller account
2. Add store profile & products
3. Go to `/` (home) - products should NOT appear
4. Go to `/admin/sellers` 
5. Verify the seller
6. Go back to `/` - products should NOW appear ✓

### Test 2: Revoke Verification
1. Take a verified seller
2. Revoke verification from admin panel
3. Go to `/` - products should hide immediately ✓
4. Products still appear in seller's own dashboard ✓

### Test 3: Error Handling
1. In browser DevTools, disable network
2. Try to verify a seller
3. Should see error toast: "Failed to update seller verification" ✓
4. Seller status should NOT change ✓

### Test 4: Real-time Updates
1. Open `/admin/sellers` in one window
2. Open home page in another
3. Verify a seller in admin panel
4. Watch home page - products appear in real-time ✓

### Test 5: Multiple Stores
1. Create 3 sellers
2. Verify only 1st and 3rd
3. Home page shows products from sellers 1 & 3, not 2 ✓

## Troubleshooting

### Problem: Products still don't show after verification
**Solution**: 
- Check browser cache - hard refresh (Ctrl+Shift+R)
- Check if seller has `status = 'suspended'` (suspend/reactivate overwrites verify)
- Check storeId / sellerId matches between products and store
- Verify verified field exists in database: `SELECT verified FROM stores WHERE id = '...'`

### Problem: Error "Failed to update seller verification"
**Solution**:
- Check Supabase connection
- Check user has admin role
- Check store ID is correct
- Check database isn't rate-limited

### Problem: Seller can't see their own products
**Solution**:
- This is a bug! Sellers should see their products regardless of verification
- Check `sellerId` field is set correctly on product creation
- In seller dashboard, it queries: `WHERE sellerId = user.uid`

## Key Files Modified

- ✅ `src/app/admin/sellers/page.tsx` - Fixed verification update
- ✅ `src/app/page.tsx` - Home page filtering (already correct)
- ✅ `src/app/explore/[slug]/page.tsx` - City explore page
- ✅ Type definitions for `StoreItem.verified`

## Monitoring

### Check Verification Status in Database
```sql
-- Show all sellers and verification status
SELECT id, name, verified, verified_at, status 
FROM stores 
ORDER BY verified DESC, created_at DESC;

-- Show unverified sellers
SELECT id, name, status 
FROM stores 
WHERE verified = false
ORDER BY created_at DESC;
```

### Monitor Real-time Updates
Logs in browser console (admin panel):
```
[Supabase] Update error on stores: ...
```

If you see this, verification failed and wasn't persisted!
