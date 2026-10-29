# TrustLoop integration status (2026-10-28)

Branch: `feature/integration` (created from teammate's `feature/frontend`).

## Integrated in code
- Next.js UI screens from frontend branch (kept intact).
- Supabase SDK client and SSR server-side cookies.
- Database-backed profile, resources, bookings, owner review, handover, history and incident API routes from backend branch.
- `src/lib/real-api.ts`: translates backend database fields/errors into frontend types. Login/signup goes through Supabase Auth. The real backend is the default.
- Demo localStorage mode remains available only when `NEXT_PUBLIC_DEMO_MODE=true`.
- Photo upload is NOT available in real mode; handover uses written evidence. Booking QR encodes a booking ID, NOT an authorization token.
- Resource owner role in the UI is based on stored role or existence of a resource owned by the logged-in account. Backend authorizes approval and handovers by owner_id, not UI role.

## How to test locally (required before merge)
On your machine with `.env.local` containing valid NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
1. `git fetch origin && git switch feature/integration && npm install && npm run build`
2. Run `npm run dev`; sign in with demo owner and demo student accounts made in Supabase.
3. Confirm owner opens /owner and sees seeded Canon DSLR resource.
4. Student browses DSLR, makes a future booking; owner approves it.
5. Owner checks out and returns with condition notes; both see booking record/history.
6. File incident and verify history; test unauthorized review and overlapping bookings.
7. Run `npm run lint`, `npm test`, and `npm run test:e2e` as applicable. Existing e2e scripts may be demo-mode-only: set `NEXT_PUBLIC_DEMO_MODE=true` in a separate test environment; never interpret those as live system tests.

## Outstanding blockers
- Live build and browser workflow have NOT been executed by this GitHub-connected environment.
- Fairness usage limits, concurrency-safe slot allocation, private photo evidence, notifications, secure QR token verification are NOT finished.
- Existing demo tests may need adaptation for live mode.
- Vercel deployment and live smoke testing are not yet done.
- Owners without preexisting resources require institutional provisioning; signup alone cannot elevate privileges.
- Reconcile dependency lockfile with `npm install` and commit updated `package-lock.json` if necessary.

Do not submit before completing core workflow tests and deployment.
