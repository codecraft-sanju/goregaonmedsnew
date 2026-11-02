# Backend integration actions

1. Supply an HTTPS staging API base URL including `/api`. `NEXT_PUBLIC_API_BASE_URL` is public configuration, never a secret. Rebuild after changing it.
2. Confirm browser cookie topology. The supplied backend's Strict SameSite cookies will not authenticate requests from an unrelated site domain. Use an approved same-site deployment or review backend cookie, CORS, and CSRF protections together. Credentialed CORS must allow the exact frontend origin.
3. Test customer OTP, session expiry, guest cart, cart merge, signed prescription uploads, checkout retries, human order IDs, and invoice generation with staging accounts. Verify admin access separately and test billingVersion conflicts, delivery/cancellation rules, product edits, and settings.
4. Confirm Cloudinary signing and private prescription access. The UI does not expose an unsupported admin prescription-download operation or repurpose customer upload signing for product images.
5. Resolve the supplied backend's offer opt-out behavior before adding such a control. Trending product ID editing also needs a supported readable contract.
6. Approve legal pages, pharmacy registration/license details, contact details, hours, delivery/refund policies, and grievance information before public release. Draft pages do not invent these facts.
7. Review the supplied backend for duplicate optionalCustomerAuth declarations before deployment.

Order retries preserve a client request ID and frozen payload after an uncertain response. This still requires staging validation of server idempotency and stock reconciliation. Payment collection and unsupported customer cancellation/deletion APIs are not invented.
