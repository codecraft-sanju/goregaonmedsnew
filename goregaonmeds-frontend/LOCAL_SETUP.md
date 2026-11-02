# GoregaonMeds local setup

This package contains the frontend source from published commit 24fc3dff1e7d500ed264f4f0351dde49502627e0. Application code is unchanged. ChatGPT hosting identity is omitted so this is an independent local project.

## 1. Install and open

Install Node.js 24 and npm. Extract the ZIP, open the goregaonmeds-frontend folder in VS Code, then open its terminal.

```sh
npm ci
```

## 2. Configure the API

Copy `.env.example` to `.env.local`. On Windows PowerShell:

```powershell
Copy-Item .env.example .env.local
```

On macOS/Linux:

```sh
cp .env.example .env.local
```

Edit `.env.local`:

```dotenv
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000/api
```

This is an example only: replace port 5000 with your Express backend port. Use the same hostname (localhost) for frontend and backend in local development. Leave the variable empty to view the design with honest unavailable states. Never put passwords, JWT secrets, or Cloudinary secrets into NEXT_PUBLIC variables.

The backend must separately be running and allow http://localhost:3000 in credentialed CORS and trusted-origin validation. Its development cookie settings must support the chosen HTTP/HTTPS setup. Do not weaken production security settings to make local testing work. See BACKEND_ACTIONS.md for the same-site cookie constraint in deployment.

## 3. Run

```sh
npm run dev
```

Open http://localhost:3000. The admin sign-in page is /admin/login/. There are no hardcoded demo credentials; use an admin account configured by your backend. Customer OTP needs your backend email service.

To choose another port: `npm run dev -- --port 3001`. Restart the dev server whenever environment variables change. The development script binds to 0.0.0.0; use only on a trusted local network.

## 4. Validate and build

```sh
npm test
npm run build
npm run typecheck
```

Build runs TypeScript validation and emits static files into `out/`. This project uses Next.js static export; it intentionally has no `next start` production command. Deploy `out/` to a static host supporting directory index files and 404.html. API configuration is embedded at build time: rebuild after changing it. Configure HTTPS and security headers at the host. The private ChatGPT preview's access gate is a hosting feature, not included in this source; protect any new staging deployment separately.

To inspect the exported build locally with Python installed:

```sh
python -m http.server 3000 --bind 127.0.0.1 --directory out
```

The production service worker provides only an offline fallback; it does not cache private API data. If switching between dev and exported builds on one origin, unregister an older service worker in browser DevTools if stale offline behavior appears.

## Project map

- src/app/: routes, global styles, layout, providers
- src/components/: shared UI, navigation, home design
- src/features/: catalog, auth, cart, checkout, orders, admin, legal pages
- src/lib/: API client, schemas, shared queries
- public/: icons, manifest, offline page, service worker
- tests/: API/checkout boundary tests

## Release status

Production build, TypeScript checks, and 8 boundary tests passed for this source. Desktop and 390px mobile home layouts were reviewed. This is a complete source handoff, not a certification of production readiness. Live backend authentication, checkout, upload, admin mutations, and invoice flows still need end-to-end staging tests. No backend or private credentials are bundled. Legal pages are drafts. Follow BACKEND_ACTIONS.md before accepting real orders.
