# GoregaonMeds frontend

Responsive Next.js App Router and TypeScript frontend for the supplied GoregaonMeds API contract. Customer shopping, OTP sign-in, prescription/manual checkout, order history, invoice polling, profile, notifications, and protected admin workflows are implemented.

## Development

Run `npm ci`, then `npm run dev`. Validate with `npm test`, `npm run typecheck`, and `npm run build`. The build exports static pages to `out/`.

Set `NEXT_PUBLIC_API_BASE_URL` to the backend HTTPS URL including `/api`, then rebuild. The default preview deliberately has no invented catalog, orders, sessions, or successful transactions. Without an API URL it displays unavailable states.

## Integration and release

See BACKEND_ACTIONS.md. Authentication, uploads, billing, and mutations have not been tested against a running backend. Legal pages are drafts requiring pharmacy approval. Do not treat this preview as a production pharmacy launch.

Private data is not cached by the service worker. Offline navigation shows a minimal offline page. Session cookies remain server managed; the frontend does not store auth tokens.
