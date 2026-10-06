# GoregaonMeds — premium app-style frontend

Complete Next.js App Router frontend built against the attached 124-section backend contract. This is a standalone frontend replacement, not a patch merged into the previous frontend repository. The backend was not modified. No demo data, fake authentication, product catalogue or fabricated order stages are used in the application.

## Start locally

Requirements: Node.js 22 LTS or newer; the existing Express backend running separately.

1. Open a terminal inside this `goregaonmeds` folder.
2. Run `npm ci`.
3. Copy `.env.example` to `.env.local`.
4. Set `NEXT_PUBLIC_API_URL` to your backend origin, e.g. `http://localhost:5000`. Do **not** append `/api`.
5. On your backend, set `FRONTEND_URL=http://localhost:3000`.
6. Run `npm run dev` and visit `http://localhost:3000`.
7. Visit `/admin/login` using the existing backend admin credentials.

For production: `npm run build`, then `npm start`. The public API origin is embedded at build time; rebuild after changing it. `npm run typecheck` performs strict TypeScript checks. The lockfile records the exact dependency versions used.

## Production cookie configuration

The supplied backend uses an HTTP-only `gm_admin` cookie with `SameSite=Strict`. `credentials: "include"` is used on every API request but does not override SameSite restrictions.

Use HTTPS and same-site frontend/API origins, for example `https://goregaonmeds.in` and `https://api.goregaonmeds.in`. Set the backend's `FRONTEND_URL` to the exact frontend origin. A `vercel.app` frontend and unrelated `onrender.com` backend will not support this existing Strict-cookie flow. A same-site custom domain or a correctly configured same-origin proxy is needed; this project does not weaken or rewrite backend cookie security.

## Consolidated architecture

```text
app/
├── layout.tsx                 Server metadata, native SF/system font stack, global shell
├── shell.tsx                  Responsive navigation, public settings context, motion config
├── template.tsx               Route entry transitions
├── ui.tsx                     Shared accessible controls, sheets, receipt and loading states
├── globals.css                Tailwind theme, shared utilities, reduced motion and print rules
├── loading.tsx
├── error.tsx
├── not-found.tsx
├── page.tsx                   Home, quick actions, live delivery and offer settings
├── order/
│   ├── page.tsx               Order wizard, schema, image upload, safe retries, review
│   └── success/page.tsx       Order reference, copy and tracking
├── track/page.tsx             Order lookup and item-level confirmed bill
├── profile/page.tsx           Device history, recovery, receipt sheet, clear device
└── admin/
    ├── login/page.tsx         Cookie-based login
    └── (panel)/
        ├── layout.tsx        Session boot, expired session handling, logout
        ├── page.tsx          Orders, detail panel, billing, delivery and cancellation
        ├── customers/page.tsx
        ├── analytics/page.tsx
        └── settings/page.tsx
lib/
└── api.ts                    Shared contract types, request/error handling, money and IDs
```

Small route-specific components, schemas and state stay in their feature file. Only cross-route controls and API concerns are shared. `(panel)` is a route group; the orders URL is `/admin`, preserving the existing frontend route convention.

The root layout is a Server Component. Interactive providers live in `shell.tsx`, following the Next.js server/client boundary. SF Pro is selected through the native Apple system font stack, with Windows/Linux system fallbacks; no proprietary font is distributed and no remote font download is required. Reference: https://nextjs.org/docs/app/getting-started/server-and-client-components

## Experience

- Mobile: frosted bottom navigation, safe-area spacing, large touch targets and animated bottom sheets.
- Desktop: floating glass sidebar, spacious cards and right-side detail sheets.
- Framer Motion: page entrances, sheet appearance, active navigation indicator, tactile buttons and drawn success checkmark.
- Radix Dialog: focus trap, Escape dismissal, focus restoration, modal semantics and background scroll lock.
- Reduced-motion support, skip link, labelled fields, inline errors and live notices.
- Skeletons, empty states, request failures, disabled mutation controls and retry actions.
- Tailwind-only styling with a teal, mint and warm amber palette; no external imagery dependency.

Framer Motion handles all required motion; GSAP and scroll hijacking are deliberately not installed because these transactional pages have no complex scroll sequence. Native scrolling stays intact. `AnimatePresence` is included in the transition wrapper; App Router templates remount on navigation, so route entry animations are guaranteed while cross-route exit animations are not promised. Dialog exits animate normally.

## Endpoint coverage

| Feature                    | Endpoint                                              |
| -------------------------- | ----------------------------------------------------- |
| Home and order settings    | `GET /api/settings/public`                            |
| Prescription signature     | `GET /api/uploads/signature`                          |
| Signed image upload        | Cloudinary `upload.uploadUrl` from signature response |
| Create order               | `POST /api/orders/create`                             |
| Track                      | `POST /api/orders/track`                              |
| Device history             | `POST /api/orders/history`                            |
| Recover IDs                | `POST /api/orders/recover`                            |
| Admin login/logout/session | `/api/admin/login`, `/logout`, `/session`             |
| Orders and detail          | `GET /api/admin/orders`, `GET /api/admin/orders/:id`  |
| Billing                    | `PATCH /api/admin/orders/:id/billing`                 |
| Delivery/cancellation      | `PATCH /api/admin/orders/:id/deliver`, `/cancel`      |
| Customers                  | `GET /api/admin/customers`                            |
| Analytics                  | `GET /api/admin/analytics/overview`                   |
| Settings                   | `GET/PATCH /api/admin/settings`                       |

The backend `/api/health` endpoint can be checked directly during deployment; it is not polled by the UI.

## Contract rules preserved

- Only `Pending`, `Delivered`, `Cancelled` are submitted and displayed. There is no fabricated live location or delivery-stage progress.
- Create requests use a UUID. Ambiguous failures retain the exact payload and UUID in component state and session storage for safe retry. A reload restores the pending request. Validation failures allow editing. The payload is retained until success; clearing browser data can remove this protection.
- Phone formats are normalized to ten Indian mobile digits; medicine quantity stays text.
- Admin paths use `order.id` (MongoDB identity), not public `GMED-XXXXXX` IDs.
- Every billing save submits every medicine with its `_id`, `price` and `isAvailable`. It does not submit medicine names, quantities, computed totals or delivery charge.
- Medicine price is the **whole line amount**, not unit price. Quantity is never multiplied into it.
- Unavailable lines are explicitly submitted with zero price.
- Server-returned totals, discount, delivery fee and eligibility are authoritative. A null public final amount is “not billed”; a billed zero remains a legitimate zero bill.
- Gift display uses fetched settings. Eligibility excludes non-medicine products and delivery. The admin UI respects customer opt-in, while the backend remains authoritative.
- Delivery requires a saved bill with no unsaved changes. Terminal orders cannot be modified. Delivery and cancellation have explicit confirmation sheets.
- Order and customer pagination use only supported filters. Analytics uses `startDate`/`endDate`, attributes delivered-order sales by order creation date, and labels calculated cancellation counts.
- Auth tokens never enter local storage. Device history stores at most 100 public Order IDs. Profile is explicitly device history, not an authenticated account.
- The pending order payload temporarily contains customer and address details in session storage. Successful creation removes it. Users should not clear storage or move to another browser while resolving an ambiguous creation result.
- Application error objects, string-form analytics errors, 401 expiry, 409 conflicts, 429 rate limits, network errors and request timeouts are handled. Admin writes are not automatically retried.

## Prescription uploads and backend limitations

The browser accepts JPG, PNG and WebP up to 10 MB, resizes the longest edge to at most 2,000px, and creates a JPEG at 85% quality. Prepared images above 2 MB are rejected. These are **frontend rules**, not backend-enforced limits. HEIC/HEIF must be converted before selection. No API secret is included; upload credentials come from the signed backend endpoint. The form uses `file`, `api_key`, `timestamp`, `signature`, and `folder`.

**Prescription billing gap:** prescription-only orders are created with an empty `medicines` array. The provided billing contract updates existing lines and has no way to add lines/names. The admin UI therefore cannot enter medicine charges for such orders and clearly explains this. It never disguises them as non-medicine charges. Full prescription billing requires a backend enhancement to add medicine lines; no invented endpoint is called.

Other omitted capabilities reflect the supplied backend: no customer login/OTP, product catalogue, branch selection or management, online payment, prescription-line editing, order editing, undo delivery/cancellation, invoice upload or order-list server search.

The backend document also flags a possible `mongoError.js` vs `mongoErrors.js` import mismatch. Confirm that the existing backend boots independently.

## Verification

`npm run typecheck` and `npm run build` passed in the delivery environment. Production pages were rendered in Chromium. The contract smoke test uses intercepted, deterministic API responses and never contacts a real pharmacy or creates real orders.

Verified flows: mobile order wizard, phone normalization, identical payload/UUID on retry, success navigation, unbilled tracking, device history, order recovery, sheet keyboard dismissal, session boot, complete item billing payload, server-confirmed totals, delivery confirmation and terminal lock, customers, analytics and settings. No browser exceptions occurred. Mobile order/tracking and home layouts had no horizontal overflow at 390px. The screenshots in `verification/` use test fixtures; fixtures are not imported by application code.

Run the checks yourself:

```sh
npm run build
npx playwright install chromium
npm run test:contract
```

The test starts a temporary production server on port 3007. Optional `CHROMIUM_EXECUTABLE_PATH` points at an already installed Chromium. The server is stopped after the test.

**Not live-verified:** your backend deployment, actual HTTP-only cookies across your domains, actual Cloudinary uploads, Telegram delivery, concurrent admin behavior and production records. Complete one real end-to-end order and admin billing test with your backend before releasing publicly. The UI is complete for the supplied contract; these environment checks and the prescription billing gap must not be confused with verified production operation.
