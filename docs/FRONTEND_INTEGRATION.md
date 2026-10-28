# TrustLoop frontend integration

The existing shared Next.js app is used on `feature/frontend`. No backend routes were added.

## Run

```sh
npm ci
npm run dev
```

Without `NEXT_PUBLIC_API_BASE_URL`, the app uses a versioned localStorage demo. Log in with any email and a password of at least eight characters. Student and owner roles simulate sessions; this is not real authentication. The shared demo student starts with one requested booking. Switch to the owner role at `/login` to review it. Demo data survives refresh and role switching in the same browser. Demo photos retain filenames only, not file contents. Clear `trustloop.demo.v1` in browser storage to reset.

For real integration, copy `.env.example` to `.env.local`, set the backend base URL (including `/api` if appropriate), and restart/rebuild. `src/lib/api.ts` is the only HTTP adapter. It does not silently fall back to demo data on failures. All requests use `credentials: include`; configure cookie and CORS settings accordingly. The paths below are a proposed contract to align with the backend, not existing backend endpoints. Change the adapter if your backend differs.

## Proposed API contract

Responses are unwrapped JSON. Errors should be `{ "message": "User-visible explanation" }` with an appropriate non-2xx HTTP status. Lists return arrays, not envelopes. IDs are strings. Datetimes are ISO 8601 UTC; local form input is converted to UTC on submit. Resource `rules` is a string array.

| Method | Path                              | Body / response                                                                                    |
| ------ | --------------------------------- | -------------------------------------------------------------------------------------------------- |
| GET    | `/auth/session`                   | `User` or `null` for an anonymous session (200)                                                    |
| POST   | `/auth/login`, `/auth/signup`     | `{ name, email, password, role }` → `User`; establishes secure session cookie                      |
| POST   | `/auth/logout`                    | clears cookie; 204 accepted                                                                        |
| GET    | `/resources`                      | `Resource[]`; in owner sessions, return manageable resources or adapt to a separate owner endpoint |
| POST   | `/resources`                      | resource fields except `id` → created `Resource`                                                   |
| GET    | `/resources/:id/slots`            | reserved windows `{id, starts_at, ends_at, status}[]`; exclude personal booking details            |
| GET    | `/bookings`                       | session-scoped `Booking[]`: student’s own requests or owner’s manageable bookings                  |
| POST   | `/bookings`                       | `{resource_id, starts_at, ends_at, purpose}` → created `Booking`                                   |
| PATCH  | `/bookings/:id/status`            | `{status}` → updated `Booking`                                                                     |
| GET    | `/bookings/:id/history`           | `{events: BookingEvent[], reports: ConditionReport[]}`                                             |
| POST   | `/bookings/:id/condition-reports` | multipart `kind`, `notes`, `handover_code`, repeated `photos` file fields → `ConditionReport`      |

Exact types are in `src/lib/types.ts`. `Booking` preserves the requested fields and permits `student_id`/`student_name` for the owner queue. User shape: `{id,name,email,role,trained_resource_ids:string[]}`. The UI role is a navigation convenience; the backend must authenticate sessions and enforce ownership, training, resource availability, valid transitions and concurrency-safe slot conflict checks.

Statuses: `requested`, `approved`, `rejected`, `waitlisted`, `checked_out`, `returned`, `cancelled`.

Allowed transitions: requested → approved/rejected/waitlisted/cancelled; waitlisted → approved/rejected/cancelled; approved → checked_out/cancelled; checked_out → returned. Others are terminal. Demo validation is for interaction testing; the backend is authoritative in API mode.

Condition-report kinds: `checkout`, `return`, `incident`. Checkout/return submission must atomically save the report and update booking status. Incident reports preserve booking status. Return the report only after both writes succeed. The UI requires notes, condition images for checkout/return, explicit confirmation and images up to 5 MB each. Enforce these constraints and file validation on the server too.

Current QR encodes the public booking ID, and the form accepts a manually entered/scanned code. It identifies a booking; it does not authorize a handover. There is no in-browser camera scanner. For production, align with a server-issued short-lived handover token and validate it under the authenticated session. Replace QR payload and `handover_code` mapping in `src/components/handover.tsx` / `src/lib/api.ts` together. Student and owner may submit reports in the demo; define the real handover policy on the server.

Resource artwork is optional presentation data, keyed separately in `src/lib/fixtures.ts`. The API resource contract is unchanged; new resources use a neutral equipment placeholder. Add image metadata to the presentation mapping or agree an API extension when real photos are available.

## Routes

- `/`: landing page
- `/login`, `/signup`: role-aware authentication forms
- `/student`: resource discovery, search, filters and sorting
- `/resources/:id`: details, guidelines, training status and reserved windows
- `/bookings/new?resource=:id`: booking request
- `/bookings`: status filters, cancellation and handover links
- `/bookings/:id`: timeline and condition/incident reports
- `/bookings/:id/handover`: QR/manual code, photos, checkout/return
- `/bookings/:id/handover?kind=incident`: incident reporting
- `/owner`: booking review, approval/rejection/waitlist, add resources

## Checks

`npm run lint`, `npm run build`, `npm test` (Node 22.18+ or Node 24 for native TypeScript stripping). Domain tests cover eligibility, time validation, overlapping requests, double approval and lifecycle transitions. Browser tests cover search, mobile layout, booking submission, owner decisions, checkout, return and incident reporting.

Run the production browser flow with:

```sh
npx playwright install chromium
npm run build
npm run test:e2e
```

The browser test starts its own local production server on port 3015 and uses a fresh isolated browser context. Keep `NEXT_PUBLIC_API_BASE_URL` unset for this demo test. Optional `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` and `PLAYWRIGHT_CHROMIUM_ARGS` (JSON array) support a preinstalled Chromium runtime.

## Frontend readiness review · October 28, 2026

All listed routes are implemented. Frontend data access remains centralized in `src/lib/api.ts`; no API routes, database setup, Supabase configuration or backend branch changes are part of this work. Demo mode is identified inside the workspace content on desktop and mobile, as well as on authentication forms.

The frontend includes loading, empty and request-error states, session retry, route error recovery and a custom 404. Authentication navigation uses the role returned by the adapter; role selection does not grant production permissions. Booking forms validate future time ranges and trimmed purpose length before API submission.

### Backend handoff still required

The contract above is proposed, not confirmed by the backend developer. Before integration, agree session/unauthenticated response behavior, response envelopes, owner resource scoping, training verification, allowed actions, image URLs and handover-token policy. The current QR/manual-code interface is complete for the documented demo; a camera scanner and server-issued token flow are not implemented. Real authentication, authorization, persistence and photo storage require the backend. No real-backend end-to-end result is claimed.

Expanded browser coverage includes mobile landing/login/signup/404, the visible demo notice, and session failure/retry, alongside the complete booking and owner approval lifecycle.
