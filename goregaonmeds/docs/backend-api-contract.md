# GOREGAONMEDS — Complete Backend Architecture & Frontend API Contract

## Document Purpose

This document describes the current backend implementation of **GoregaonMeds** so that a Next.js frontend can be developed against the backend without guessing API contracts, database fields, authentication behavior, billing logic, order workflows, uploads, or integrations.

This document is based strictly on the supplied backend source code.

---

# 1. Backend Technology Stack

The backend currently uses:

- **Node.js**
- **Express.js**
- **MongoDB**
- **Mongoose**
- **Zod** for request validation
- **JWT** for admin authentication
- **HTTP-only cookies** for admin session storage
- **bcryptjs** for admin password verification
- **Cloudinary** for prescription image uploads
- **Telegram Bot API** for pharmacy/admin notifications
- **express-rate-limit** for rate limiting
- **Helmet** for security headers
- **CORS**
- **cookie-parser**

There is no separate customer login/authentication system.

There is no pharmacist login/authentication system.

There is currently only one authenticated role:

```text
admin
```

---

# 2. API Base Structure

Public API routes are mounted under:

```text
/api
```

Admin API routes are mounted under:

```text
/api/admin
```

Health check:

```text
/api/health
```

Therefore the API structure is:

```text
/api/health

/api/orders/create
/api/orders/track
/api/orders/history
/api/orders/recover
/api/settings/public
/api/uploads/signature

/api/admin/login
/api/admin/logout
/api/admin/session
/api/admin/orders
/api/admin/orders/:id
/api/admin/orders/:id/billing
/api/admin/orders/:id/deliver
/api/admin/orders/:id/cancel
/api/admin/customers
/api/admin/settings
/api/admin/analytics/overview
```

Only these HTTP methods are currently used:

```text
GET
POST
PATCH
```

There are currently no application routes using:

```text
PUT
DELETE
```

---

# 3. Global API Configuration

## JSON Body Limit

Express JSON requests are limited to:

```text
32 KB
```

Configured as:

```text
express.json({ limit: '32kb' })
```

If exceeded:

```http
413 Payload Too Large
```

Response:

```json
{
  "success": false,
  "error": {
    "code": "PAYLOAD_TOO_LARGE",
    "message": "Request is too large"
  }
}
```

---

# 4. CORS Configuration

The backend accepts requests from exactly:

```text
env.FRONTEND_URL origin
```

The actual origin is extracted using:

```text
new URL(FRONTEND_URL).origin
```

Example:

```env
FRONTEND_URL=https://goregaonmeds.in
```

Allowed origin becomes:

```text
https://goregaonmeds.in
```

Credentials are enabled:

```text
credentials: true
```

Allowed methods:

```text
GET
POST
PATCH
```

The Next.js frontend must therefore use credentials when calling authenticated admin APIs.

Example frontend configuration:

```text
credentials: "include"
```

This is required because the admin JWT is stored in a cookie.

---

# 5. Environment Variables

The backend requires the following environment configuration.

## NODE_ENV

Type:

```text
development | production | test
```

Default:

```text
development
```

---

## PORT

Type:

```text
positive integer
```

Default:

```text
5000
```

---

## MONGODB_URI

Required:

```text
yes
```

Must be a non-empty string.

Example:

```env
MONGODB_URI=mongodb+srv://...
```

---

## JWT_SECRET

Required:

```text
yes
```

Minimum length:

```text
32 characters
```

Used for admin JWT signing.

---

## ADMIN_USERNAME

Required.

Non-empty string.

---

## ADMIN_PASSWORD_HASH

Required.

Must be a bcrypt hash matching:

```text
$2a$
$2b$
$2y$
```

Expected regex:

```text
^\$2[aby]\$\d{2}\$.{53}$
```

The backend never stores or compares a plaintext configured password.

---

## CLOUDINARY_CLOUD_NAME

Required.

Cloudinary account name.

---

## CLOUDINARY_API_KEY

Required.

---

## CLOUDINARY_API_SECRET

Required.

Never expose this value to the frontend.

The backend exposes only a temporary upload signature.

---

## CLOUDINARY_UPLOAD_FOLDER

Default:

```text
goregaonmeds/prescriptions
```

Allowed pattern:

```text
letters
numbers
_
-
/
```

Example:

```text
goregaonmeds/prescriptions
```

---

## TELEGRAM_BOT_TOKEN

Optional.

Default:

```text
""
```

Failure or missing configuration does not prevent orders from being created.

---

## TELEGRAM_ADMIN_CHAT_ID

Optional.

Default:

```text
""
```

---

## FRONTEND_URL

Required.

Must be a complete valid URL.

Example:

```text
https://goregaonmeds.in
```

---

## TRUST_PROXY

Type:

```text
integer >= 0
```

Default:

```text
1
```

Used through:

```text
app.set('trust proxy', TRUST_PROXY)
```

This is relevant when deployed behind services such as Render/proxies.

---

# 6. Database Connection

MongoDB is connected using Mongoose:

```text
serverSelectionTimeoutMS = 10000 ms
```

Mongoose strict query behavior:

```text
strictQuery = true
```

After connecting, the backend explicitly calls:

```text
model.createIndexes()
```

for every registered Mongoose model.

Therefore declared indexes are created before the application starts serving traffic.

---

# 7. Database Models Overview

Current database models are:

```text
Order
User
Settings
```

There is no standalone:

```text
Medicine model
Branch model
Pharmacy model
Admin model
Customer authentication model
Payment model
Invoice model
```

Medicines exist only as embedded subdocuments inside an Order.

---

# 8. Order Model

MongoDB/Mongoose model:

```text
Order
```

## Order Status ENUM

Exact supported values:

```text
Pending
Delivered
Cancelled
```

Constant:

```text
ORDER_STATUSES
```

---

## Order Type ENUM

Exact supported values:

```text
manual_text
prescription_image
```

Constant:

```text
ORDER_TYPES
```

---

## Payment Method

The backend currently hardcodes:

```text
Pay at Delivery (Cash/UPI)
```

Constant:

```text
PAYMENT_METHOD
```

There is currently no online payment gateway.

---

# 9. Order Schema — Complete Fields

## `_id`

Generated automatically by MongoDB.

Type:

```text
ObjectId
```

Used internally and by admin route:

```text
/api/admin/orders/:id
```

Important:

`:id` is the MongoDB `_id`, not the public `GMED-XXXXXX` order ID.

---

## `orderId`

Type:

```text
String
```

Required:

```text
yes
```

Unique:

```text
yes
```

Indexed:

```text
yes
```

Format:

```text
GMED-XXXXXX
```

The suffix is 6 characters.

Allowed characters deliberately exclude ambiguous characters such as:

```text
0
O
1
I
L
```

Alphabet:

```text
ABCDEFGHJKMNPQRSTUVWXYZ23456789
```

Example:

```text
GMED-X8P2K7
```

---

## `clientRequestId`

Type:

```text
String
```

Required.

Unique.

Frontend must generate a UUID for every newly initiated order request.

This is used for idempotency / duplicate submission protection.

---

## `mobileNumber`

Type:

```text
String
```

Required.

Indexed.

Stored in normalized Indian 10-digit format.

Example:

```text
8433818771
```

Accepted incoming formats can include:

```text
8433818771
+91 8433818771
08433818771
```

After normalization it must match:

```text
^[6-9]\d{9}$
```

---

## `customerName`

Type:

```text
String
```

Required.

Trimmed.

Maximum:

```text
80 characters
```

---

## `orderType`

Type:

```text
String
```

Required.

ENUM:

```text
manual_text
prescription_image
```

---

## `medicines`

Type:

```text
Array<MedicineSubdocument>
```

Default:

```json
[]
```

Maximum during order creation:

```text
30 medicines
```

---

# 10. Medicine Embedded Subdocument

Every medicine entry has an automatically generated MongoDB `_id`.

That `_id` should be preserved by the frontend because admin billing can identify individual medicine lines using it.

Fields:

## `_id`

Type:

```text
ObjectId
```

Automatically created by Mongoose.

---

## `name`

Type:

```text
String
```

Required.

Trimmed.

Maximum:

```text
120 characters
```

---

## `quantity`

Type:

```text
String
```

Required.

Trimmed.

Maximum:

```text
60 characters
```

Examples:

```text
1 strip
2 boxes
10 tablets
1 bottle
```

Quantity is intentionally text, not numeric.

---

## `isAvailable`

Type:

```text
Boolean
```

Default:

```text
true
```

Used during pharmacy billing.

---

## `price`

Type:

```text
Number
```

Default:

```text
0
```

Minimum:

```text
0
```

### Important billing interpretation

The backend calculates medicine subtotal as:

```text
sum of medicine.price for every available medicine
```

It does NOT multiply price by `quantity`.

Therefore the current backend effectively treats:

```text
medicine.price
```

as the **complete billed amount for that medicine line**, not necessarily a per-unit price.

Example:

```json
{
  "name": "Dolo 650",
  "quantity": "2 strips",
  "price": 60
}
```

Backend subtotal contribution:

```text
₹60
```

not:

```text
₹60 × 2
```

The frontend should therefore label this field appropriately, for example:

```text
Line Price
```

or:

```text
Amount
```

unless backend logic is later changed.

---

# 11. Order Prescription Field

## `prescriptionUrl`

Type:

```text
String
```

Default:

```text
null
```

Used when:

```text
orderType = prescription_image
```

The URL is verified before order creation.

It must:

- use HTTPS
- have hostname `res.cloudinary.com`
- belong to configured Cloudinary account
- point into configured Cloudinary prescription folder
- contain no username
- contain no password
- contain no custom port
- contain no `..`

---

# 12. Order Address

Embedded object:

```json
{
  "flat": "...",
  "area": "...",
  "landmark": "..."
}
```

## `address.flat`

String.

Required.

Maximum:

```text
120
```

---

## `address.area`

String.

Required.

Maximum:

```text
120
```

---

## `address.landmark`

String.

Optional from client.

Database default:

```text
""
```

Maximum:

```text
120
```

---

# 13. Order Billing Fields

## `paymentMethod`

String.

Default:

```text
Pay at Delivery (Cash/UPI)
```

---

## `medicineSubtotal`

Number.

Default:

```text
0
```

Minimum:

```text
0
```

Calculated by backend from available medicine line prices during billing.

---

## `nonMedicineSubtotal`

Number.

Default:

```text
0
```

Minimum:

```text
0
```

Used for non-medicine products.

---

## `deliveryCharge`

Number.

Default:

```text
0
```

Minimum:

```text
0
```

Important:

The admin frontend does NOT directly send delivery charge while billing.

The backend loads the authoritative value from `Settings`.

---

## `discount`

Number.

Default:

```text
0
```

Minimum:

```text
0
```

Applied globally to the complete bill.

---

## `finalAmount`

Number.

Default:

```text
0
```

Minimum:

```text
0
```

Formula:

```text
medicineSubtotal
+ nonMedicineSubtotal
+ deliveryCharge
- discount
```

The backend prevents the final amount from going negative.

If:

```text
discount > grossAmount
```

the backend silently clamps the discount to:

```text
grossAmount
```

Therefore:

```text
finalAmount >= 0
```

---

## `billedAt`

Type:

```text
Date | null
```

Default:

```text
null
```

Set whenever admin saves billing.

---

# 14. First Order Offer Fields

## `offerOptIn`

Boolean.

Default:

```text
false
```

Represents whether the customer requested the free gift.

---

## `firstOrderAtCreation`

Boolean.

Required.

Determined by server during order creation.

---

## `customerOrderNumber`

Number.

Required.

Minimum:

```text
1
```

Example:

```text
1
2
3
```

---

## `offerEligible`

Boolean.

Default:

```text
false
```

Calculated during billing.

---

## `offerApplied`

Boolean.

Default:

```text
false
```

Determines whether admin actually included the gift.

---

# 15. Gift Configuration

Gift:

```text
Dr. Morepen GlucoOne BG-03
```

Reference MRP:

```text
₹650
```

Gift eligibility requires all of:

```text
firstOrderOfferEnabled === true

firstOrderAtCreation === true

medicineSubtotal >= firstOrderMinimumMedicineAmount

customer has not previously claimed gift
```

Only the **medicine subtotal** counts toward the threshold.

These do not count:

```text
nonMedicineSubtotal
deliveryCharge
finalAmount
```

### Important backend detail

`offerOptIn` is stored, but the current `evaluateOfferEligibility()` logic does not check `offerOptIn`.

Therefore technically the admin API can submit:

```json
{
  "offerApplied": true
}
```

for an eligible order even if:

```text
offerOptIn = false
```

The frontend should probably respect `offerOptIn`, but that restriction is not enforced in the current backend.

---

# 16. Order Status Fields

## `status`

ENUM:

```text
Pending
Delivered
Cancelled
```

Default:

```text
Pending
```

Indexed.

---

## `cancelReason`

String or null.

Default:

```text
null
```

---

## `telegramNotificationSent`

Boolean.

Default:

```text
false
```

---

## `deliveredAt`

Date or null.

Default:

```text
null
```

Set when order is successfully marked Delivered.

---

## MongoDB Automatic Timestamps

Orders use:

```text
timestamps: true
```

Therefore MongoDB also stores:

```text
createdAt
updatedAt
```

---

# 17. Order Indexes

Unique/indexed fields:

```text
orderId
clientRequestId
```

Indexed:

```text
mobileNumber
status
```

Compound index:

```text
status ASC
createdAt DESC
```

---

# 18. User Model

MongoDB model:

```text
User
```

This is not an authenticated website user account.

It is essentially a customer profile/statistics record keyed by mobile number.

---

# 19. User Schema

## `_id`

MongoDB ObjectId.

---

## `mobileNumber`

String.

Required.

Unique.

Must match:

```text
^[6-9]\d{9}$
```

---

## `fullName`

String.

Required.

Trimmed.

Maximum:

```text
80
```

---

## `totalOrders`

Number.

Default:

```text
0
```

Minimum:

```text
0
```

Incremented when an order is created.

---

## `deliveredOrders`

Number.

Default:

```text
0
```

Minimum:

```text
0
```

Incremented after successful delivery.

---

## `offerClaimed`

Boolean.

Default:

```text
false
```

---

## `offerClaimedOrderId`

String or null.

Default:

```text
null
```

---

## Automatic timestamps

User contains:

```text
createdAt
updatedAt
```

---

## User Indexes

Unique:

```text
mobileNumber
```

Index:

```text
fullName
```

---

# 20. Settings Model

MongoDB model:

```text
Settings
```

Implemented as a singleton configuration document.

Singleton ID:

```text
config
```

---

## `singletonId`

String.

Default:

```text
config
```

Unique.

---

## `deliveryCharge`

Number.

Default:

```text
0
```

Minimum:

```text
0
```

---

## `firstOrderOfferEnabled`

Boolean.

Default:

```text
true
```

---

## `firstOrderMinimumMedicineAmount`

Number.

Default:

```text
500
```

Minimum:

```text
0
```

---

## Timestamp

The Settings model has:

```text
updatedAt
```

but no `createdAt`.

---

# 21. Branch Model / Multi-Branch Architecture

## Critical frontend warning

Although GoregaonMeds is described as a multi-branch pharmacy platform, the supplied backend currently contains **no branch architecture**.

There is no:

```text
Branch model
branchId field
branchName field
branch selection field
assignedBranch field
pharmacy branch relation
branch API
branch settings
branch-specific inventory
branch-specific order queue
branch-specific admin role
```

Orders do not store a branch.

Users do not store a branch.

Settings are global.

Admin orders are global.

Telegram notifications use one configured chat ID.

### Therefore the frontend must NOT invent backend-supported branch functionality.

There is currently no backend mechanism to distinguish orders among the three Goregaon branches.

If the frontend displays branches such as:

```text
Apple Pharmacy
Lotus Pharmacy
Healthzone & Cosmetic
```

that would currently be frontend-only/static behavior unless the backend is extended.

---

# 22. Medicine Catalog / Inventory Model

There is no medicine catalog database.

There is no endpoint such as:

```text
GET /api/medicines
GET /api/search/medicines
GET /api/inventory
```

There is no:

```text
stock quantity
SKU
brand
MRP
inventory count
branch stock
medicine description
category
```

The only medicine information stored is inside each order:

```text
name
quantity
isAvailable
price
```

---

# 23. Authentication Architecture

Authentication applies only to admin routes.

Authentication mechanism:

```text
JWT + HTTP-only cookie
```

JWT is not returned to frontend JavaScript.

There is no Bearer token.

Do NOT use:

```http
Authorization: Bearer ...
```

---

# 24. Admin Cookie

Cookie name:

```text
gm_admin
```

Properties:

```text
httpOnly: true
secure: true in production
secure: false outside production
sameSite: strict
path: /
```

Maximum age:

```text
12 hours
```

---

# 25. Admin JWT

Algorithm:

```text
HS256
```

Expiration:

```text
12 hours
```

Payload contains:

```json
{
  "role": "admin"
}
```

JWT subject:

```text
ADMIN_USERNAME
```

The backend verifies both:

```text
payload.role === "admin"
payload.sub === env.ADMIN_USERNAME
```

---

# 26. Available Roles

Only:

```text
admin
```

There are no backend roles such as:

```text
customer
pharmacist
manager
branch_manager
delivery_agent
super_admin
```

Customers are public/un-authenticated.

---

# 27. CSRF / Trusted Origin Protection

Admin state-changing routes use additional trusted-origin protection.

Safe methods:

```text
GET
HEAD
OPTIONS
```

do not require an Origin check.

For state-changing routes such as POST and PATCH:

If an Origin header exists:

```text
origin must equal env.frontendOrigin
```

Otherwise:

```http
403
```

In production, if no Origin header is present:

```http
403
```

Response:

```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Request origin required"
  }
}
```

or:

```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Request origin not allowed"
  }
}
```

---

# 28. Frontend Admin Fetch Configuration

Admin requests should use:

```text
credentials: include
```

Conceptually:

```text
fetch(API_URL + "/api/admin/orders", {
  credentials: "include"
})
```

This is necessary because authentication is cookie-based.

---

# 29. PUBLIC API ENDPOINTS

---

# 30. GET `/api/health`

Authentication:

```text
Public
```

Request body:

```text
none
```

Query:

```text
none
```

Success:

```http
200
```

Response:

```json
{
  "success": true,
  "status": "ok"
}
```

Use this for backend health/status checks.

---

# 31. POST `/api/orders/create`

Creates a new customer order.

Authentication:

```text
Public
```

Rate limit:

```text
10 requests / 10 minutes / network
```

---

## Request Body

```json
{
  "clientRequestId": "UUID",
  "customerName": "Customer Name",
  "mobileNumber": "8433818771",
  "orderType": "manual_text",
  "medicines": [
    {
      "name": "Dolo 650",
      "quantity": "1 strip"
    }
  ],
  "address": {
    "flat": "Flat 101",
    "area": "Goregaon East",
    "landmark": "Near station"
  },
  "offerOptIn": true
}
```

For prescription orders:

```json
{
  "clientRequestId": "UUID",
  "customerName": "Customer Name",
  "mobileNumber": "8433818771",
  "orderType": "prescription_image",
  "medicines": [],
  "prescriptionUrl": "https://res.cloudinary.com/...",
  "address": {
    "flat": "Flat 101",
    "area": "Goregaon East",
    "landmark": ""
  },
  "offerOptIn": false
}
```

---

## `clientRequestId`

Required.

Must be a UUID.

Used to prevent duplicate orders from repeated frontend submissions.

---

## `customerName`

Required.

Minimum:

```text
2
```

Maximum:

```text
80
```

Text is cleaned before storage.

---

## `mobileNumber`

Required.

Must normalize to valid Indian 10-digit mobile number.

---

## `orderType`

Required.

ENUM:

```text
manual_text
prescription_image
```

---

## `medicines`

Array.

Default:

```json
[]
```

Maximum:

```text
30
```

For each item:

```json
{
  "name": "string",
  "quantity": "string"
}
```

For:

```text
manual_text
```

at least one medicine is mandatory.

For:

```text
prescription_image
```

medicines can be empty.

---

## `prescriptionUrl`

Optional generally.

Required when:

```text
orderType = prescription_image
```

Maximum:

```text
500 characters
```

Must pass Cloudinary URL verification.

---

## `address.flat`

Required.

1–120 characters.

---

## `address.area`

Required.

2–120 characters.

---

## `address.landmark`

Optional.

Default:

```text
""
```

Maximum 120.

---

## `offerOptIn`

Boolean.

Default:

```text
false
```

---

## Success Response

Status:

```http
201 Created
```

Response:

```json
{
  "success": true,
  "orderId": "GMED-X8P2K7",
  "status": "Pending",
  "telegramNotificationSent": true
}
```

Telegram failure does NOT cause order failure.

Possible response:

```json
{
  "success": true,
  "orderId": "GMED-X8P2K7",
  "status": "Pending",
  "telegramNotificationSent": false
}
```

---

# 32. Order Creation Idempotency

If the same `clientRequestId` is submitted again with the same mobile number:

The existing order is returned instead of creating another one.

If the same `clientRequestId` is reused with a different mobile number:

```http
409 Conflict
```

Example:

```json
{
  "success": false,
  "error": {
    "code": "DUPLICATE_REQUEST",
    "message": "This order request was already used. Please refresh and try again."
  }
}
```

---

# 33. POST `/api/orders/track`

Tracks one order using public Order ID and last four mobile digits.

Authentication:

```text
Public
```

Rate limit:

```text
30 requests / 10 minutes / network
```

---

## Request

```json
{
  "orderId": "GMED-X8P2K7",
  "mobileLast4": "8771"
}
```

---

## `orderId`

Required.

Converted to:

```text
trimmed uppercase
```

Must match valid GoregaonMeds order ID format.

---

## `mobileLast4`

Required.

Exactly four digits:

```text
^\d{4}$
```

---

## Success

```http
200
```

Example:

```json
{
  "success": true,
  "order": {
    "orderId": "GMED-X8P2K7",
    "status": "Pending",
    "statusLabel": "Order Received & Processing",
    "orderType": "manual_text",
    "itemCount": 2,
    "placedAt": "2026-10-06T07:00:00.000Z",
    "deliveredAt": null,
    "paymentMethod": "Pay at Delivery (Cash/UPI)",
    "medicines": [
      {
        "_id": "MongoObjectId",
        "name": "Dolo 650",
        "quantity": "1 strip",
        "isAvailable": true,
        "price": 30
      }
    ],
    "medicineSubtotal": 30,
    "nonMedicineSubtotal": 0,
    "deliveryCharge": 0,
    "discount": 0,
    "finalAmount": 30
  }
}
```

Before billing:

```json
"finalAmount": null
```

The implementation specifically returns:

```text
order.billedAt ? order.finalAmount : null
```

---

# 34. Public Status Labels

Backend maps:

```text
Pending
→ Order Received & Processing
```

```text
Delivered
→ Delivered
```

```text
Cancelled
→ Cancelled
```

---

## Track Failure

If either:

- Order ID does not exist
- last four mobile digits do not match

Response:

```http
404
```

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "No order matches that Order ID and mobile number."
  }
}
```

---

# 35. POST `/api/orders/history`

Retrieves multiple orders using previously known Order IDs.

Authentication:

```text
Public
```

Rate limit:

```text
30 / 10 minutes
```

---

## Request

```json
{
  "orderIds": [
    "GMED-X8P2K7",
    "GMED-A3R7N9"
  ]
}
```

Maximum:

```text
100 order IDs
```

Default:

```json
[]
```

Each is normalized to uppercase.

---

## Response

```json
{
  "success": true,
  "orders": [
    {
      "orderId": "GMED-X8P2K7",
      "status": "Delivered",
      "statusLabel": "Delivered",
      "orderType": "manual_text",
      "itemCount": 2,
      "placedAt": "2026-10-05T10:00:00.000Z",
      "deliveredAt": "2026-10-05T12:00:00.000Z",
      "finalAmount": 570,
      "medicines": [
        {
          "_id": "...",
          "name": "Medicine A",
          "quantity": "1 strip",
          "isAvailable": true,
          "price": 500
        }
      ],
      "medicineSubtotal": 500,
      "nonMedicineSubtotal": 50,
      "deliveryCharge": 40,
      "discount": 20,
      "cancelReason": null
    }
  ]
}
```

Orders are sorted:

```text
createdAt descending
```

Newest first.

### Security behavior to understand

This endpoint does not validate a mobile number.

Anyone possessing valid Order IDs can request their history details.

The frontend should not treat this endpoint as authenticated customer history.

---

# 36. POST `/api/orders/recover`

Used to recover all known order IDs associated with a mobile number.

Authentication:

```text
Public
```

Rate limit:

```text
30 / 10 minutes
```

---

## Request

```json
{
  "mobileNumber": "8433818771",
  "orderId": "GMED-X8P2K7"
}
```

Both must correspond to an existing order.

---

## Success

```json
{
  "success": true,
  "orderIds": [
    "GMED-X8P2K7",
    "GMED-A3R7N9",
    "GMED-H7T5M2"
  ]
}
```

Sorted newest first.

---

## Failure

```http
404
```

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "No matching order found for this mobile number and Order ID combination."
  }
}
```

---

# 37. GET `/api/settings/public`

Retrieves storefront-safe settings.

Authentication:

```text
Public
```

Cache:

```http
Cache-Control: public, max-age=30
```

---

## Response

```json
{
  "success": true,
  "settings": {
    "deliveryCharge": 0,
    "firstOrderOfferEnabled": true,
    "firstOrderMinimumMedicineAmount": 500
  }
}
```

The frontend should retrieve this instead of hardcoding delivery charge or gift threshold.

---

# 38. GET `/api/uploads/signature`

Creates a signed direct-upload configuration for Cloudinary.

Authentication:

```text
Public
```

Rate limit:

```text
20 / 10 minutes
```

Cache:

```http
Cache-Control: no-store
```

---

## Response

```json
{
  "success": true,
  "upload": {
    "cloudName": "your-cloud-name",
    "apiKey": "cloudinary-public-api-key",
    "folder": "goregaonmeds/prescriptions",
    "timestamp": 1791260000,
    "signature": "generated-signature",
    "uploadUrl": "https://api.cloudinary.com/v1_1/cloud-name/image/upload"
  }
}
```

---

# 39. Prescription Upload Workflow

The Express backend does **not receive image bytes**.

There is no backend multipart endpoint such as:

```text
POST /api/upload
```

There is no Multer configuration.

Correct workflow:

```text
1. Frontend requests GET /api/uploads/signature
2. Backend generates Cloudinary signature
3. Frontend uploads image directly to Cloudinary
4. Cloudinary returns secure image URL
5. Frontend submits that URL as prescriptionUrl in POST /api/orders/create
6. Backend verifies URL belongs to expected Cloudinary account/folder
```

---

# 40. Cloudinary Direct Upload Form Fields

The frontend will generally send multipart/form-data directly to:

```text
upload.uploadUrl
```

Using values returned by the signature endpoint.

Expected Cloudinary parameters are:

```text
file
api_key
timestamp
signature
folder
```

Corresponding values:

```text
file = selected/compressed image
api_key = upload.apiKey
timestamp = upload.timestamp
signature = upload.signature
folder = upload.folder
```

---

# 41. Upload File Size Limit

Important:

The supplied backend code does **not configure a prescription image file-size limit**.

Because image bytes bypass Express entirely, the Express:

```text
32kb JSON body limit
```

does not apply to the image.

Any 2 MB / 5 MB frontend compression rules are not enforced by this backend source.

If the frontend currently compresses images to a target size, that is frontend behavior rather than an API-enforced backend limit.

---

# 42. ADMIN API

All admin API responses use:

```http
Cache-Control: no-store
```

---

# 43. POST `/api/admin/login`

Authentication:

```text
Public
```

But protected by trusted-Origin rules.

Rate limit:

```text
5 attempts / 15 minutes
```

---

## Request

```json
{
  "username": "admin",
  "password": "password"
}
```

Username:

```text
1–100 characters
```

Password:

```text
1–200 characters
```

---

## Success

```http
200
```

```json
{
  "success": true,
  "admin": {
    "username": "configured-admin-username"
  }
}
```

Also sets cookie:

```text
gm_admin
```

Frontend JavaScript does not receive the JWT.

---

## Invalid credentials

```http
401
```

```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid username or password"
  }
}
```

The backend uses a dummy bcrypt hash when username is invalid to reduce username timing leaks.

---

# 44. POST `/api/admin/logout`

Clears admin cookie.

Current route does not apply `requireAdmin`.

Therefore it can technically be called without already having a valid admin session.

It still requires trusted Origin protection because it is a POST route.

Success:

```json
{
  "success": true
}
```

The backend clears:

```text
gm_admin
```

---

# 45. GET `/api/admin/session`

Requires:

```text
Admin authentication
```

Request:

```text
no body
```

Response:

```json
{
  "success": true,
  "authenticated": true,
  "admin": {
    "username": "admin"
  }
}
```

If session is missing:

```http
401
```

```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

If JWT is invalid/expired:

```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Session expired. Please log in again."
  }
}
```

---

# 46. GET `/api/admin/orders`

Returns paginated orders.

Requires:

```text
Admin
```

---

## Query Parameters

### `status`

Optional.

Default:

```text
Pending
```

Allowed:

```text
Pending
Delivered
Cancelled
```

---

### `page`

Optional.

Default:

```text
1
```

Constraints:

```text
integer
1–10000
```

---

### `limit`

Optional.

Default:

```text
20
```

Constraints:

```text
1–50
```

---

## Example

```text
GET /api/admin/orders?status=Pending&page=1&limit=20
```

---

# 47. Admin Order Sorting

For:

```text
Pending
```

sort:

```text
createdAt DESC
_id DESC
```

For:

```text
Delivered
Cancelled
```

sort:

```text
updatedAt DESC
_id DESC
```

---

# 48. Admin Orders Response

```json
{
  "success": true,
  "orders": [
    {
      "id": "MongoDBObjectId",
      "orderId": "GMED-X8P2K7",
      "customerName": "Customer",
      "mobileNumber": "8433818771",
      "orderType": "manual_text",
      "medicines": [],
      "prescriptionUrl": null,
      "address": {
        "flat": "...",
        "area": "...",
        "landmark": "..."
      },
      "paymentMethod": "Pay at Delivery (Cash/UPI)",
      "medicineSubtotal": 500,
      "nonMedicineSubtotal": 0,
      "deliveryCharge": 40,
      "discount": 20,
      "finalAmount": 520,
      "billedAt": "2026-10-06T10:00:00.000Z",
      "offerOptIn": true,
      "firstOrderAtCreation": true,
      "previousOrders": 0,
      "offerEligible": true,
      "offerApplied": true,
      "offer": {
        "eligible": true,
        "checks": {
          "offerEnabled": true,
          "firstOrder": true,
          "meetsMedicineThreshold": true,
          "giftNotPreviouslyClaimed": true
        },
        "requiredMedicineAmount": 500,
        "eligibleMedicineSubtotal": 500
      },
      "status": "Pending",
      "cancelReason": null,
      "telegramNotificationSent": true,
      "createdAt": "2026-10-06T09:00:00.000Z",
      "deliveredAt": null,
      "customer": {
        "fullName": "Customer",
        "mobileNumber": "8433818771",
        "totalOrders": 1,
        "deliveredOrders": 0,
        "offerClaimed": false,
        "offerClaimedOrderId": null
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 25,
    "totalPages": 2
  }
}
```

---

# 49. Admin Order `customer`

Can be:

```text
object
```

or:

```text
null
```

Shape:

```json
{
  "fullName": "Name",
  "mobileNumber": "8433818771",
  "totalOrders": 4,
  "deliveredOrders": 3,
  "offerClaimed": true,
  "offerClaimedOrderId": "GMED-X8P2K7"
}
```

---

# 50. GET `/api/admin/orders/:id`

Requires:

```text
Admin
```

`:id` means:

```text
MongoDB Order _id
```

NOT:

```text
GMED-X8P2K7
```

Example:

```text
GET /api/admin/orders/6704e7f87...
```

---

## Success

```json
{
  "success": true,
  "order": {
    "...": "same AdminOrder structure described above"
  }
}
```

---

## Invalid / nonexistent MongoDB ID

```http
404
```

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Order not found"
  }
}
```

---

# 51. PATCH `/api/admin/orders/:id/billing`

Saves/updates an order bill.

Requires:

```text
Admin
```

Only Pending orders can be billed.

---

## Request Body

```json
{
  "medicines": [
    {
      "_id": "medicine-subdocument-id",
      "price": 120,
      "isAvailable": true
    },
    {
      "_id": "another-id",
      "price": 0,
      "isAvailable": false
    }
  ],
  "nonMedicineSubtotal": 100,
  "discount": 30,
  "offerApplied": true
}
```

The schema is strict.

Unknown properties are rejected.

---

# 52. Billing Request — `medicines`

Optional at schema level.

Default:

```json
[]
```

Each entry:

```json
{
  "_id": "optional string",
  "price": 0,
  "isAvailable": true
}
```

`_id`:

```text
optional
```

`price`:

```text
number >= 0
```

Default:

```text
0
```

`isAvailable`:

```text
boolean
```

Default:

```text
true
```

---

# 53. Critical Billing Frontend Rule

Even though `medicines` is technically optional, the frontend should send **every medicine line every time billing is saved**.

Reason:

The service calculates:

```text
price = inputMed exists ? inputMed.price : 0
```

If a medicine is omitted from the billing payload, its saved price can become:

```text
0
```

Therefore never send only modified medicines.

Always send the complete current medicine billing state.

---

# 54. Medicine Matching During Billing

Backend tries to match medicines using:

```text
medicine _id
```

When IDs are unavailable, it falls back to array index.

Therefore frontend should preserve medicine order and `_id`.

Preferred request:

```json
{
  "_id": "existingMongoSubdocumentId",
  "price": 85,
  "isAvailable": true
}
```

---

# 55. Unavailable Medicine Behavior

If:

```json
{
  "isAvailable": false,
  "price": 500
}
```

backend saves:

```text
isAvailable = false
price = 0
```

Unavailable medicines do not contribute to medicine subtotal.

---

# 56. Medicine Subtotal Calculation

The frontend does not send `medicineSubtotal`.

Backend calculates it:

```text
medicineSubtotal =
sum(price of all medicines where isAvailable === true)
```

This is intentionally server-controlled.

---

# 57. `nonMedicineSubtotal`

Required in billing request.

Number.

Minimum:

```text
0
```

Maximum:

```text
1,000,000
```

Maximum 2 decimal places.

---

# 58. `discount`

Optional.

Default:

```text
0
```

Minimum:

```text
0
```

Maximum:

```text
1,000,000
```

Backend clamps excessive discount to gross bill amount.

---

# 59. `offerApplied`

Boolean.

Default:

```text
false
```

If admin attempts to apply gift when not eligible:

```http
422
```

Example:

```json
{
  "success": false,
  "error": {
    "code": "OFFER_NOT_ELIGIBLE",
    "message": "The free GlucoOne cannot be included: this order is not eligible."
  }
}
```

---

# 60. Billing Success

```json
{
  "success": true,
  "order": {
    "...": "complete AdminOrder"
  }
}
```

Backend also sets:

```text
billedAt = current time
```

---

# 61. Billing Locked Order Error

Billing is allowed only when:

```text
status = Pending
```

Otherwise:

```http
409
```

```json
{
  "success": false,
  "error": {
    "code": "ORDER_LOCKED",
    "message": "Only pending orders can be billed"
  }
}
```

Concurrency can also produce:

```json
{
  "success": false,
  "error": {
    "code": "ORDER_LOCKED",
    "message": "Order was modified while you were billing it"
  }
}
```

---

# 62. PATCH `/api/admin/orders/:id/deliver`

Marks an order Delivered.

Requires:

```text
Admin
```

Request body:

```text
none
```

---

## Preconditions

Order must:

```text
status === Pending
```

and:

```text
billedAt != null
```

---

## No Bill Error

```http
422
```

```json
{
  "success": false,
  "error": {
    "code": "BILL_REQUIRED",
    "message": "Save the bill before marking the order as delivered."
  }
}
```

---

## Already modified/delivered/cancelled

Possible:

```http
409
```

```json
{
  "success": false,
  "error": {
    "code": "ALREADY_DELIVERED",
    "message": "Order is already delivered or cancelled"
  }
}
```

or:

```json
{
  "success": false,
  "error": {
    "code": "ALREADY_DELIVERED",
    "message": "Order is already modified"
  }
}
```

---

# 63. Gift Claim During Delivery

If:

```text
offerApplied = true
```

backend atomically attempts to mark the customer's gift as claimed.

It sets:

```text
offerClaimed = true
offerClaimedOrderId = current order ID
```

If already claimed:

```http
409
```

```json
{
  "success": false,
  "error": {
    "code": "OFFER_ALREADY_CLAIMED",
    "message": "This customer has already claimed the free gift. Re-save the bill without the gift."
  }
}
```

---

# 64. Successful Delivery

Backend updates:

```text
status = Delivered
deliveredAt = now
```

and increments:

```text
User.deliveredOrders += 1
```

Response:

```json
{
  "success": true,
  "order": {
    "...": "complete AdminOrder"
  }
}
```

---

# 65. PATCH `/api/admin/orders/:id/cancel`

Cancels a Pending order.

Requires:

```text
Admin
```

---

## Request

```json
{
  "cancelReason": "Medicine unavailable"
}
```

`cancelReason`:

```text
required
1–300 characters
```

Text is cleaned.

---

## Success

```json
{
  "success": true,
  "order": {
    "...": "complete AdminOrder",
    "status": "Cancelled",
    "cancelReason": "Medicine unavailable"
  }
}
```

---

## Cancellation behavior

Backend updates:

```text
status = Cancelled
cancelReason = submitted reason
```

and explicitly sets:

```text
updatedAt = now
```

---

## Telegram Cancellation Notification

After cancellation succeeds, backend attempts to send Telegram notification.

Telegram failure does not fail cancellation.

---

## Non-Pending Cancellation

Returns:

```http
400
```

```json
{
  "success": false,
  "error": {
    "code": "BAD_REQUEST",
    "message": "Only pending orders can be cancelled"
  }
}
```

---

# 66. GET `/api/admin/customers`

Returns customer records.

Requires:

```text
Admin
```

---

## Query Parameters

### `q`

Optional search string.

Maximum:

```text
80
```

If it contains at least 3 digits after non-digits are removed, search is done against:

```text
mobileNumber
```

Otherwise it searches:

```text
fullName
```

case-insensitively.

---

### `page`

Default:

```text
1
```

Range:

```text
1–10000
```

---

### `limit`

Default:

```text
20
```

Range:

```text
1–50
```

---

## Example

```text
GET /api/admin/customers?q=843&page=1&limit=20
```

or:

```text
GET /api/admin/customers?q=Jyoti&page=1
```

---

# 67. Customer List Response

```json
{
  "success": true,
  "customers": [
    {
      "fullName": "Customer Name",
      "mobileNumber": "8433818771",
      "totalOrders": 3,
      "deliveredOrders": 2,
      "offerClaimed": true,
      "offerClaimedOrderId": "GMED-X8P2K7",
      "isFirstTimeCustomer": false
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

`isFirstTimeCustomer` is calculated as:

```text
totalOrders <= 1
```

---

# 68. GET `/api/admin/settings`

Requires:

```text
Admin
```

Response:

```json
{
  "success": true,
  "settings": {
    "deliveryCharge": 0,
    "firstOrderOfferEnabled": true,
    "firstOrderMinimumMedicineAmount": 500,
    "updatedAt": "2026-10-06T10:00:00.000Z"
  }
}
```

---

# 69. PATCH `/api/admin/settings`

Requires:

```text
Admin
```

The request is partial.

At least one setting must be supplied.

---

## Supported Fields

```json
{
  "deliveryCharge": 50,
  "firstOrderOfferEnabled": true,
  "firstOrderMinimumMedicineAmount": 500
}
```

You can send only one:

```json
{
  "deliveryCharge": 40
}
```

---

## `deliveryCharge`

Minimum:

```text
0
```

Additional maximum:

```text
2000
```

---

## `firstOrderOfferEnabled`

Boolean.

---

## `firstOrderMinimumMedicineAmount`

Number:

```text
0–1,000,000
```

Maximum 2 decimal places.

---

## Empty request

Rejected because:

```text
at least one property must change
```

---

## Success

```json
{
  "success": true,
  "settings": {
    "deliveryCharge": 40,
    "firstOrderOfferEnabled": true,
    "firstOrderMinimumMedicineAmount": 500,
    "updatedAt": "2026-10-06T10:20:00.000Z"
  }
}
```

---

# 70. GET `/api/admin/analytics/overview`

Requires:

```text
Admin
```

Current endpoint:

```text
GET /api/admin/analytics/overview?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
```

---

## Required Query Parameters

```text
startDate
endDate
```

There is currently no Zod schema on this endpoint.

---

## Missing dates

Returns directly from the controller:

```http
400
```

```json
{
  "success": false,
  "error": "startDate and endDate are required."
}
```

Notice this error shape is different from the standard API error object.

---

# 71. Analytics Current Logic

The backend constructs:

```text
start = startDate at 00:00:00.000
end = endDate at 23:59:59.999
```

Then finds orders where:

```text
createdAt >= start
createdAt <= end
```

---

## `totalOrders`

Count of all orders created inside the selected range.

Includes:

```text
Pending
Delivered
Cancelled
```

---

## `breakdown.pending`

Count of orders:

```text
created inside range
AND current status = Pending
```

---

## `breakdown.delivered`

Count of orders:

```text
created inside range
AND current status = Delivered
```

Cancelled orders are currently not returned in the analytics breakdown.

---

# 72. Current Sales Analytics Formula

Current implementation calculates sales from:

```text
status = Delivered
AND createdAt within selected date range
```

Then sums:

```text
finalAmount
```

This is important.

It does **not currently use `deliveredAt` for sales attribution**.

Example:

Order created October 1:

```text
createdAt = Oct 1
```

Delivered October 3:

```text
deliveredAt = Oct 3
```

Current analytics counts its revenue for October 1, not October 3.

Therefore frontend developers must not assume analytics represents "sales delivered on selected date."

---

# 73. Analytics Response

```json
{
  "success": true,
  "totalSales": 15500,
  "totalOrders": 30,
  "breakdown": {
    "pending": 8,
    "delivered": 20
  }
}
```

Potentially:

```text
30 total
8 pending
20 delivered
```

means two remaining orders could be Cancelled because cancellations are omitted from the breakdown.

---

# 74. Analytics Timezone Warning

The backend does:

```text
new Date(startDate)
start.setHours(0,0,0,0)
```

and similarly for end date.

There is no explicit:

```text
Asia/Kolkata
```

timezone conversion.

Therefore date boundaries depend partly on runtime/server timezone behavior.

The frontend should not assume that this endpoint provides guaranteed IST calendar-day semantics.

---

# 75. Pagination Standard

Two list APIs currently use standardized pagination:

```text
GET /api/admin/orders
GET /api/admin/customers
```

Parameters:

```text
page
limit
```

Defaults:

```text
page = 1
limit = 20
```

Maximum:

```text
limit = 50
```

Response:

```json
{
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

`totalPages` always has a minimum value of:

```text
1
```

even when `total = 0`.

---

# 76. Available Backend Filters

## Orders

Supported:

```text
status
page
limit
```

Not supported:

```text
search
customer
mobileNumber
orderId search
dateFrom
dateTo
branch
amount range
orderType
```

---

## Customers

Supported:

```text
q
page
limit
```

---

## Analytics

Supported:

```text
startDate
endDate
```

---

## No Branch Filter

There is no:

```text
branch
branchId
storeId
```

query parameter anywhere in the current backend.

---

# 77. Rate Limits

## Create order

```text
10 requests / 10 minutes
```

Message:

```text
Too many orders from this network. Please call +91 84338 18771.
```

Response structure generated by limiter:

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMITED",
    "message": "Too many orders from this network. Please call +91 84338 18771."
  }
}
```

---

## Track/history/recovery

```text
30 requests / 10 minutes
```

Message:

```text
Too many tracking attempts. Please try again in a few minutes.
```

---

## Upload signature

```text
20 requests / 10 minutes
```

Message:

```text
Too many uploads. Please try again in a few minutes.
```

---

## Admin login

```text
5 attempts / 15 minutes
```

Message:

```text
Too many login attempts. Please wait 15 minutes.
```

---

# 78. Standard Validation Error Format

Zod errors return:

```http
400
```

Structure:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "First validation error message",
    "fields": [
      {
        "path": "field.path",
        "message": "Validation message"
      }
    ]
  }
}
```

Example:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Enter a valid 10-digit Indian mobile number",
    "fields": [
      {
        "path": "mobileNumber",
        "message": "Enter a valid 10-digit Indian mobile number"
      }
    ]
  }
}
```

Frontend should preferably read:

```text
error.error.message
```

and optionally render:

```text
error.error.fields
```

for field-specific messages.

---

# 79. Standard Application Errors

The normal AppError response is:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message"
  }
}
```

Possible statuses include:

```text
400 Bad Request
401 Unauthorized
403 Forbidden
404 Not Found
409 Conflict
422 Unprocessable Entity
```

---

# 80. Invalid JSON

Malformed JSON returns:

```http
400
```

```json
{
  "success": false,
  "error": {
    "code": "INVALID_JSON",
    "message": "Malformed JSON body"
  }
}
```

---

# 81. Unknown API Route

Returns:

```http
404
```

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Route not found"
  }
}
```

---

# 82. Internal Server Error

Unexpected backend exceptions return:

```http
500
```

```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "Something went wrong. Please try again."
  }
}
```

Internal error details are not exposed to the frontend.

---

# 83. Text Sanitization

Most customer free-text input is cleaned before persistence.

The backend:

- strips control characters
- strips zero-width characters
- strips Unicode line/paragraph separators
- collapses consecutive whitespace
- trims surrounding whitespace

This affects fields such as:

```text
customerName
medicine name
medicine quantity
address
cancelReason
search query
```

---

# 84. Money Rules

Global maximum bill amount constant:

```text
1,000,000
```

Money values are rounded to two decimal places using:

```text
Math.round((value + Number.EPSILON) * 100) / 100
```

Relevant fields:

```text
medicineSubtotal
nonMedicineSubtotal
deliveryCharge
discount
finalAmount
```

---

# 85. Customer Creation Workflow

When an order is created:

```text
1. Backend checks clientRequestId replay.
2. Settings are loaded.
3. Customer record is found/upserted using mobileNumber.
4. User.totalOrders increments by 1.
5. Backend determines how many previous orders existed.
6. firstOrderAtCreation = previousOrders === 0.
7. customerOrderNumber = previousOrders + 1.
8. Order is inserted.
9. Telegram notification is attempted.
10. API response is returned.
```

If order insertion fails after customer order count was incremented:

```text
totalOrders is decremented again
```

---

# 86. Order ID Generation

Public Order ID format:

```text
GMED-XXXXXX
```

Uses cryptographically secure:

```text
crypto.randomInt()
```

Backend attempts up to:

```text
5
```

times in the unlikely event of an order ID collision.

---

# 87. First-Order Detection

First-order eligibility is determined using `User.totalOrders` before the new order increment.

Therefore:

```text
firstOrderAtCreation = true
```

only when the customer had no previous order recorded under that normalized mobile number.

---

# 88. Delivery Workflow

Recommended frontend/admin workflow:

```text
Pending order
↓
Open order
↓
Set item availability
↓
Enter each available medicine's line amount
↓
Enter non-medicine subtotal if applicable
↓
Enter discount if applicable
↓
Apply first-order gift if eligible
↓
Save Billing
↓
billedAt created
↓
Mark Delivered
↓
status becomes Delivered
↓
deliveredAt created
```

The backend prevents:

```text
Pending → Delivered
```

without saved billing.

---

# 89. Cancellation Workflow

```text
Pending
↓
Admin enters cancellation reason
↓
PATCH /api/admin/orders/:id/cancel
↓
status = Cancelled
↓
cancelReason stored
↓
Telegram cancellation notification attempted
```

There is no endpoint to:

```text
restore cancelled order
reopen order
undo delivery
change Delivered back to Pending
```

---

# 90. Telegram Integration

The backend integrates directly with:

```text
https://api.telegram.org
```

Configured through:

```text
TELEGRAM_BOT_TOKEN
TELEGRAM_ADMIN_CHAT_ID
```

Telegram is optional.

---

# 91. New Order Telegram Message

Telegram receives information including:

```text
Order ID
Customer name
Mobile number
Address
Order type
Medicines
Payment method
First-order status
Gift threshold information
Customer gift opt-in
```

---

# 92. Prescription Telegram Behavior

For a prescription order:

If message fits Telegram caption length:

```text
sendPhoto with full caption
```

If too large:

```text
sendPhoto
then sendMessage
```

If `sendPhoto` fails:

```text
send text containing prescription URL link
```

---

# 93. Telegram Limits

Caption:

```text
1024 characters
```

Message:

```text
4096 characters
```

Messages are sliced if necessary.

---

# 94. Cancellation Telegram Notification

Cancellation sends:

```text
ORDER CANCELLED
Order ID
Customer
Mobile
Reason
```

Failure is logged but cancellation remains successful.

---

# 95. WhatsApp Integration

There is no WhatsApp integration in the supplied backend.

There is no:

```text
WhatsApp Business API
Twilio WhatsApp
Meta webhook
WhatsApp gateway
WhatsApp webhook route
```

All messaging integration shown here is:

```text
Telegram
```

---

# 96. External APIs

Current external service:

```text
Telegram Bot API
Cloudinary
MongoDB
```

There are no integrations shown for:

```text
Stripe
Razorpay
PhonePe
Google Maps
WhatsApp
Firebase
SMS OTP
email
inventory provider
medicine catalog API
delivery API
```

---

# 97. Public vs Admin Route Matrix

| Endpoint | Method | Authentication |
|---|---|---|
| `/api/health` | GET | Public |
| `/api/orders/create` | POST | Public |
| `/api/orders/track` | POST | Public |
| `/api/orders/history` | POST | Public |
| `/api/orders/recover` | POST | Public |
| `/api/settings/public` | GET | Public |
| `/api/uploads/signature` | GET | Public |
| `/api/admin/login` | POST | Public + trusted origin |
| `/api/admin/logout` | POST | No admin requirement, trusted origin |
| `/api/admin/session` | GET | Admin |
| `/api/admin/orders` | GET | Admin |
| `/api/admin/orders/:id` | GET | Admin |
| `/api/admin/orders/:id/billing` | PATCH | Admin |
| `/api/admin/orders/:id/deliver` | PATCH | Admin |
| `/api/admin/orders/:id/cancel` | PATCH | Admin |
| `/api/admin/customers` | GET | Admin |
| `/api/admin/settings` | GET | Admin |
| `/api/admin/settings` | PATCH | Admin |
| `/api/admin/analytics/overview` | GET | Admin |

---

# 98. Recommended Next.js API Type — Order Status

Frontend should use exactly:

```text
"Pending" | "Delivered" | "Cancelled"
```

Do not convert backend payload status values to lowercase when communicating with API.

---

# 99. Recommended Next.js API Type — Order Type

Use:

```text
"manual_text" | "prescription_image"
```

---

# 100. Frontend AdminOrder Shape

Conceptually:

```text
AdminOrder {
  id: string
  orderId: string
  customerName: string
  mobileNumber: string

  orderType:
    | "manual_text"
    | "prescription_image"

  medicines: Medicine[]

  prescriptionUrl: string | null

  address: {
    flat: string
    area: string
    landmark: string
  }

  paymentMethod: string

  medicineSubtotal: number
  nonMedicineSubtotal: number
  deliveryCharge: number
  discount: number
  finalAmount: number
  billedAt: string | null

  offerOptIn: boolean
  firstOrderAtCreation: boolean
  previousOrders: number
  offerEligible: boolean
  offerApplied: boolean

  offer: {
    eligible: boolean

    checks: {
      offerEnabled: boolean
      firstOrder: boolean
      meetsMedicineThreshold: boolean
      giftNotPreviouslyClaimed: boolean
    }

    requiredMedicineAmount: number
    eligibleMedicineSubtotal: number
  }

  status:
    | "Pending"
    | "Delivered"
    | "Cancelled"

  cancelReason: string | null

  telegramNotificationSent: boolean

  createdAt: string
  deliveredAt: string | null

  customer: CustomerSummary | null
}
```

---

# 101. Frontend Medicine Shape

```text
Medicine {
  _id: string
  name: string
  quantity: string
  isAvailable: boolean
  price: number
}
```

---

# 102. Customer Summary Shape

```text
CustomerSummary {
  fullName: string
  mobileNumber: string
  totalOrders: number
  deliveredOrders: number
  offerClaimed: boolean
  offerClaimedOrderId: string | null
}
```

---

# 103. Public Settings Shape

```text
PublicSettings {
  deliveryCharge: number
  firstOrderOfferEnabled: boolean
  firstOrderMinimumMedicineAmount: number
}
```

---

# 104. Admin Settings Shape

```text
AdminSettings {
  deliveryCharge: number
  firstOrderOfferEnabled: boolean
  firstOrderMinimumMedicineAmount: number
  updatedAt: string
}
```

---

# 105. Frontend CreateOrder Payload

```text
CreateOrderPayload {
  clientRequestId: string
  customerName: string
  mobileNumber: string

  orderType:
    | "manual_text"
    | "prescription_image"

  medicines: Array<{
    name: string
    quantity: string
  }>

  prescriptionUrl?: string

  address: {
    flat: string
    area: string
    landmark?: string
  }

  offerOptIn: boolean
}
```

---

# 106. Frontend Billing Payload

```text
BillingPayload {
  medicines: Array<{
    _id?: string
    price: number
    isAvailable: boolean
  }>

  nonMedicineSubtotal: number
  discount?: number
  offerApplied?: boolean
}
```

Recommended frontend behavior:

Always send:

```text
medicines
nonMedicineSubtotal
discount
offerApplied
```

explicitly.

---

# 107. Frontend Authentication Boot Flow

Recommended admin frontend startup:

```text
Admin application loads
↓
GET /api/admin/session
with credentials: include
↓
200
→ authenticated admin UI

401
→ redirect/show admin login
```

After login:

```text
POST /api/admin/login
credentials: include
```

After logout:

```text
POST /api/admin/logout
credentials: include
```

---

# 108. Customer-Facing Order Tracking Flow

Recommended:

```text
Customer enters:
Order ID
Last 4 digits mobile
↓
POST /api/orders/track
↓
Render status and bill
```

For local profile/history functionality:

```text
Frontend stores known order IDs locally
↓
POST /api/orders/history
↓
Backend returns those orders
```

For history recovery:

```text
Customer enters complete mobile number
+
one valid Order ID
↓
POST /api/orders/recover
↓
Backend returns all Order IDs belonging to mobile
↓
POST /api/orders/history
```

---

# 109. Public Order Status UI Mapping

Backend status:

```text
Pending
```

Recommended customer text from backend:

```text
Order Received & Processing
```

Backend:

```text
Delivered
```

Text:

```text
Delivered
```

Backend:

```text
Cancelled
```

Text:

```text
Cancelled
```

For cancelled orders, frontend can additionally render:

```text
cancelReason
```

because history responses expose it.

---

# 110. Important Missing Backend Features

The Next.js frontend AI should understand that these features are not available in the supplied backend.

## No branch management

No branch APIs or branch field.

## No medicine inventory/catalog

Medicines are only embedded in orders.

## No customer authentication

Tracking uses Order ID + mobile digits.

## No pharmacist role

Only admin exists.

## No delivery-agent role

None exists.

## No online payments

Payment method is fixed to Cash/UPI at delivery.

## No order editing endpoint

There is no endpoint to edit customer/address/medicine names after creation.

## No undo cancellation

Cancelled is effectively terminal.

## No undo delivery

Delivered is effectively terminal.

## No billing history/versioning

Saving billing replaces current bill values.

## No dedicated invoice object

Bill values exist directly on Order.

## No search endpoint for admin orders

Filtering only supports status.

## No order date pagination/filter endpoint

Analytics accepts dates, regular order listing does not.

---

# 111. Important Backend Caveat — Analytics Sales Definition

Frontend must not label current `totalSales` as:

```text
Revenue delivered on selected date
```

because current backend uses:

```text
Delivered orders whose createdAt is in range
```

not:

```text
deliveredAt in range
```

If the intended business rule is actual sales by delivery date, backend needs modification before frontend relies on this endpoint.

---

# 112. Important Backend Caveat — Analytics Breakdown

Analytics provides only:

```text
pending
delivered
```

It does not provide:

```text
cancelled
```

even though `totalOrders` includes cancelled orders.

Therefore:

```text
pending + delivered
```

may be lower than:

```text
totalOrders
```

This is expected with the current implementation.

---

# 113. Important Backend Caveat — Branches

Do not build API calls such as:

```text
/api/branches
/api/admin/branches
/api/orders?branch=...
```

because none exist.

Do not put `branchId` into create-order payload because the strict/validated schema does not accept it.

Branch support must be added to backend before real multi-branch order routing can work.

---

# 114. Important Backend Caveat — Billing Medicines

The frontend billing form should never submit only changed items.

Send every medicine on every Save Bill request.

Otherwise unsent medicines can receive:

```text
price = 0
```

during the service calculation.

---

# 115. Important Backend Caveat — Order IDs vs Mongo IDs

There are two IDs.

Public order identifier:

```text
orderId
GMED-X8P2K7
```

Internal admin identifier:

```text
id
MongoDB ObjectId
```

Admin mutation endpoints require the internal ID:

```text
PATCH /api/admin/orders/{order.id}/billing
PATCH /api/admin/orders/{order.id}/deliver
PATCH /api/admin/orders/{order.id}/cancel
```

Do not send:

```text
GMED-X8P2K7
```

in `:id` for those routes.

---

# 116. Important Backend Caveat — `finalAmount`

Public track/history APIs intentionally return:

```text
finalAmount = null
```

until `billedAt` exists.

Therefore the frontend should support:

```text
"Bill pending"
```

rather than interpreting `null` as ₹0.

---

# 117. Important Backend Caveat — Delivery Charge

Delivery charge is authoritative on the server.

Frontend should obtain it from:

```text
GET /api/settings/public
```

for display.

During admin billing, backend reads the latest setting itself.

The billing request does not include `deliveryCharge`.

---

# 118. Important Backend Caveat — Gift Threshold

Gift eligibility checks:

```text
medicineSubtotal only
```

Do not calculate eligibility from:

```text
finalAmount
grossAmount
medicine + cosmetics
medicine + delivery
```

---

# 119. Important Backend Caveat — Status Values

Backend uses case-sensitive exact values:

```text
Pending
Delivered
Cancelled
```

Avoid API payload/query values such as:

```text
pending
delivered
cancelled
```

because Zod ENUM validation expects exact values.

---

# 120. Important Source-Code Issue to Verify

The supplied `orderService.js` imports:

```text
../utils/mongoErrors.js
```

but the supplied utility file was labelled:

```text
src/utils/mongoError.js
```

singular.

If the actual filesystem also uses:

```text
mongoError.js
```

while the import says:

```text
mongoErrors.js
```

Node ESM will fail with a module-not-found error.

The actual repository should be checked and filenames/import paths made identical.

---

# 121. HTTP Status Summary

| Scenario | Status |
|---|---:|
| Health success | 200 |
| Normal GET success | 200 |
| Order create success | 201 |
| Validation error | 400 |
| Malformed JSON | 400 |
| Invalid cancellation state | 400 |
| Missing admin authentication | 401 |
| Wrong admin login | 401 |
| Invalid Origin | 403 |
| Missing resource | 404 |
| Unknown API route | 404 |
| Concurrency/order conflict | 409 |
| Gift already claimed | 409 |
| Gift not eligible | 422 |
| Bill required | 422 |
| JSON too large | 413 |
| Rate limit exceeded | 429 |
| Unexpected server error | 500 |

---

# 122. Complete Endpoint Summary

| Method | Endpoint | Purpose | Auth |
|---|---|---|---|
| GET | `/api/health` | Backend health | Public |
| POST | `/api/orders/create` | Create order | Public |
| POST | `/api/orders/track` | Track one order | Public |
| POST | `/api/orders/history` | Fetch known order history | Public |
| POST | `/api/orders/recover` | Recover order IDs | Public |
| GET | `/api/settings/public` | Storefront settings | Public |
| GET | `/api/uploads/signature` | Cloudinary signature | Public |
| POST | `/api/admin/login` | Admin login | Public |
| POST | `/api/admin/logout` | Clear admin session | Origin-protected |
| GET | `/api/admin/session` | Validate admin session | Admin |
| GET | `/api/admin/orders` | List admin orders | Admin |
| GET | `/api/admin/orders/:id` | Get one admin order | Admin |
| PATCH | `/api/admin/orders/:id/billing` | Save bill | Admin |
| PATCH | `/api/admin/orders/:id/deliver` | Deliver order | Admin |
| PATCH | `/api/admin/orders/:id/cancel` | Cancel order | Admin |
| GET | `/api/admin/customers` | Customer list/search | Admin |
| GET | `/api/admin/settings` | Get settings | Admin |
| PATCH | `/api/admin/settings` | Update settings | Admin |
| GET | `/api/admin/analytics/overview` | Sales/order analytics | Admin |

---

# 123. Recommended Frontend Architecture Based on Current Backend

A Next.js application can safely structure API areas as:

```text
Public Storefront
├── Homepage
├── Place Order
├── Upload Prescription
├── Track Order
├── Order History / Profile
└── Public Settings

Admin
├── Login
├── Session Guard
├── Orders
│   ├── Pending
│   ├── Delivered
│   └── Cancelled
├── Order Detail
│   ├── Medicines
│   ├── Availability
│   ├── Billing
│   ├── Offer
│   ├── Delivery
│   └── Cancellation
├── Customers
├── Analytics
└── Settings
```

Do not create server-dependent branch dashboards until branch support is added to the backend.

---

# 124. Final Backend Contract Summary

The current GoregaonMeds backend is fundamentally an:

```text
Order-management
+
customer-history
+
admin-billing
+
first-order promotion
+
Cloudinary prescription upload
+
Telegram notification
```

system.

The primary order lifecycle is:

```text
Customer submits order
→ Pending
→ Pharmacy reviews medicines
→ Pharmacy marks item availability
→ Pharmacy prices individual lines
→ Backend calculates totals
→ Admin saves bill
→ Admin delivers or cancels
→ Delivered / Cancelled
```

Authentication is:

```text
Admin only
JWT
HTTP-only cookie
12-hour session
```

Customer features are public and use order/mobile verification rather than accounts.

Current persistence is:

```text
MongoDB
├── Orders
├── Users
└── Settings
```

Current external services are:

```text
Cloudinary
Telegram
```

The most important frontend integration rules are:

1. Use `credentials: "include"` for admin APIs.
2. Use MongoDB `order.id` for admin mutation endpoints.
3. Use `orderId` (`GMED-XXXXXX`) only for customer-facing tracking/recovery.
4. Upload prescriptions directly to Cloudinary using `/api/uploads/signature`.
5. Never upload image bytes through Express.
6. Always submit the complete medicine array when saving billing.
7. Do not calculate medicine subtotal client-side as authoritative; backend calculates it.
8. Do not send delivery charge in billing; backend reads Settings.
9. Treat medicine `price` as the current line amount because quantity is not multiplied server-side.
10. Use exact statuses `Pending`, `Delivered`, and `Cancelled`.
11. Treat `finalAmount: null` as "billing pending."
12. Fetch `/api/settings/public` rather than hardcoding delivery and offer values.
13. Do not assume any backend branch functionality exists.
14. Do not assume a medicine inventory/catalog API exists.
15. Be aware current analytics attributes revenue using `createdAt`, not `deliveredAt`.
16. Be aware analytics currently omits Cancelled from the returned breakdown.
17. Telegram is non-blocking; failed Telegram delivery does not mean failed customer order.
18. There is no WhatsApp integration in this backend.
19. There are no Customer/Pharmacist/Branch Manager authentication roles.
20. Preserve all field names and ENUM capitalization exactly as documented above.