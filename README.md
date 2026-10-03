# GOREGAONMEDS

Medicine ordering for Goregaon East, Mumbai. Customers type medicines or upload a prescription, pay at delivery, and track orders with a random Order ID. The pharmacy manages orders, billing and the first-order gift from a protected admin dashboard.

```
goregaonmeds/
├── backend/    Node.js + Express + MongoDB (Mongoose) API
└── frontend/   Next.js 15 (App Router, TypeScript, Tailwind CSS, Framer Motion)
```

## Two rules this codebase enforces

**1. The ₹500 gift threshold counts medicines only.**
`backend/src/services/offerService.js` is the single place eligibility is decided. Its functions take `medicineSubtotal` and nothing else that carries money, so `finalAmount`, `nonMedicineSubtotal` and `deliveryCharge` cannot reach the check. The billing API (`PATCH /api/admin/orders/:id/billing`) accepts only the two subtotals and the gift checkbox, rejects any other field, reads the delivery charge from Settings, computes the final amount, and refuses to include the gift (HTTP 422) when the order is not eligible. Marking an order delivered with the gift claims it through a conditional update, so a customer can only ever claim it once.

**2. MongoDB first, Telegram second.**
`POST /api/orders/create` saves the order, then notifies Telegram with a 6-second timeout. Any Telegram failure (not configured, network down, API error, timeout, even an unexpected exception) still returns `201` with `telegramNotificationSent: false`, and the customer sees the "Notification Delay" message with the support number. Prescription orders use `sendPhoto` and fall back to a text message with the image link if Telegram can't fetch the photo.

Both rules are covered by tests, including the two examples from the blueprint (₹420 + ₹150 + ₹30 = ₹600 is **not** eligible; ₹520 + ₹100 + ₹30 = ₹650 **is**).

## Running locally

Requirements: Node.js 20.12+, a MongoDB connection (Atlas or local).

```bash
# Backend
cd backend
npm install
cp .env.example .env          # fill in values
npm run hash-password         # prints ADMIN_PASSWORD_HASH for .env
npm run dev                   # http://localhost:5000

# Frontend (second terminal)
cd frontend
npm install
cp .env.example .env.local    # NEXT_PUBLIC_API_URL=http://localhost:5000
npm run dev                   # http://localhost:3000, admin at /admin
```

Tests need a MongoDB instance (default `mongodb://127.0.0.1:27017/goregaonmeds_test`, override with `MONGODB_TEST_URI`):

```bash
cd backend && npm test
cd frontend && npm run typecheck && npm run lint && npm run build
```

## Deployment notes

- **Same-origin API.** The browser only calls `/api/*` on the Next.js site, which `next.config.mjs` proxies to `NEXT_PUBLIC_API_URL`. This keeps the admin cookie first-party, so it can be `HttpOnly; Secure; SameSite=Strict` with no cross-site CORS credentials. Set `FRONTEND_URL` on the backend to the exact public origin of the site.
- **`TRUST_PROXY`** must equal the number of proxies in front of Express (the Next.js rewrite plus any load balancer) so rate limits see the real client IP.
- **`NODE_ENV=production`** turns on the `Secure` cookie flag and requires an `Origin` header on admin writes.
- **Indexes** (`orderId`, `clientRequestId`, `mobileNumber`, all unique) are created at startup.
- **Cloudinary.** Uploads go straight from the browser to Cloudinary with a signature from `GET /api/uploads/signature`; Express never handles image bytes. The order API accepts only `https://res.cloudinary.com/<your cloud>/image/upload/.../<CLOUDINARY_UPLOAD_FOLDER>/...` URLs.
- **Telegram** is optional at boot. Without a token the API logs a warning and every order reports `telegramNotificationSent: false`.

## API

| Method | Path | Notes |
|---|---|---|
| POST | `/api/orders/create` | Idempotent on `clientRequestId`. Pricing fields from the browser are ignored. |
| POST | `/api/orders/track` | `{ orderId, mobileLast4 }`. Returns status only, never address or phone. |
| GET | `/api/settings/public` | Delivery charge and offer settings. |
| GET | `/api/uploads/signature` | Signed Cloudinary upload parameters. |
| POST | `/api/admin/login` · `/logout` | Sets / clears the HttpOnly JWT cookie. |
| GET | `/api/admin/session` | 401 when not signed in. |
| GET | `/api/admin/orders?status=Pending\|Delivered&page=&limit=` | |
| GET | `/api/admin/orders/:id` | |
| PATCH | `/api/admin/orders/:id/billing` | `{ medicineSubtotal, nonMedicineSubtotal, offerApplied? }` only. |
| PATCH | `/api/admin/orders/:id/deliver` | Requires a saved bill. Claims the gift if included. |
| GET | `/api/admin/customers?q=&page=` | Customer history (an addition for blueprint section 29). |
| GET / PATCH | `/api/admin/settings` | `deliveryCharge`, `firstOrderOfferEnabled`, `firstOrderMinimumMedicineAmount`. |

Order status is strictly `Pending` or `Delivered`.

## Decisions worth knowing

- **Extra order fields.** `offerOptIn` records the customer's banner choice (shown to the admin, never used for eligibility), `customerOrderNumber` drives "Previous Orders" on the admin card, and `billedAt` gates delivery until a bill is saved.
- **Order IDs** are `GMED-` plus 6 characters from a 31-character alphabet without look-alikes (0/O, 1/I/L), generated with `crypto.randomInt` and retried on the rare collision.
- **Mobile numbers** are stored as 10 digits (`+91 98200-18771` → `9820018771`).
- **Saved checkout details** stay only in the browser's localStorage for 180 days (name, number, address). Prescriptions and auth are never stored there.
- **Image compression** runs on the device: at most 2400 px and about 1.2 MB, never below 1600 px so handwriting stays legible. HEIC files a browser can't decode are uploaded as-is when under 10 MB.
- **GSAP and React Icons are not included.** Framer Motion and Lucide cover every animation and icon here, so adding them would only increase bundle size.
