# TODO: Fix Vercel Build Error - useSearchParams Suspense Boundary

## Problem
`useSearchParams()` must be wrapped in a `<Suspense>` boundary during static prerendering. The Vercel build fails on `/login` page.

## Steps

- [x] `src/app/login/page.tsx` — Renamed component to `LoginForm`, wrapped in `<Suspense>` boundary via new default export `LoginPage`
- [x] `src/app/signup/page.tsx` — Renamed component to `SignUpForm`, wrapped in `<Suspense>` boundary via new default export `SignUpPage`
- [x] `src/app/reset-password/page.tsx` — Already wrapped in Suspense (no changes needed)
- [x] `src/app/admin/messages/page.tsx` — Already wrapped in Suspense (no changes needed)
- [x] `src/app/auth/callback/page.tsx` — Already wrapped in Suspense (no changes needed)
- [ ] `src/app/auth/callback-popup/page.tsx` — Apply Suspense fix
- [ ] `src/app/cart/page.tsx` — Apply Suspense fix
- [ ] `src/app/messages/page.tsx` — Apply Suspense fix
- [ ] `src/app/page.tsx` — Apply Suspense fix
- [ ] `src/app/seller/products/add/page.tsx` — Apply Suspense fix
- [ ] `src/components/auth-modal.tsx` — Review if Suspense needed
- [ ] `src/components/layout/header.tsx` — Review if Suspense needed
- [ ] Verify: Run `npm run build` locally to confirm fix
