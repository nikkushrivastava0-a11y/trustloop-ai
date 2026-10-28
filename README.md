# TrustLoop AI — Campus Resource Sharing

A campus equipment-sharing platform that helps students discover available tools, request reservations, and return equipment with a verifiable condition history.

## Why it matters

Cameras, lab equipment, microphones, projectors and prototyping tools are expensive and often underused. TrustLoop helps campus teams share those resources more transparently.

## Working MVP

- Student and owner accounts with Supabase Auth
- Resource listings, category filtering and full-text search
- Explainable project-to-equipment matching (keyword/capability-based; **not** LLM-powered)
- Booking requests and owner decisions: approve, reject, waitlist
- Booking statuses, check-out and return confirmation
- Written handover condition reports, incident history, audit trail
- Responsive frontend with light and dark mode
- Database row-level security and server-side authorization for relevant actions

## Tech stack

Next.js App Router, React, TypeScript, Supabase Auth + PostgreSQL + RLS, Vercel. Demo mode is available for UI tests; real Supabase is the default.

## Live demo

https://trustloop-ai-pi.vercel.app/

Test credentials are shared privately with judges where appropriate. Do not publish passwords.

## Demo walkthrough

1. Sign in as the student and discover a resource.
2. Describe a project in the resource match panel (it returns explainable, rules-based matches).
3. Request an available resource for a future timeslot.
4. Sign in as its owner and approve the request.
5. Open the booking, record check-out condition notes, then record its return.
6. View history and condition evidence. The signed-in session and resource ownership determine what each account can do.

## Run locally

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in `.env.local` (never commit your actual keys). Open http://localhost:3000.

```bash
npm run lint
npm test
npm run build
```

The existing `npm run test:e2e` script exercises demo mode, **not** real Supabase end-to-end access.

## Architecture

Browser UI → Next.js API routes → Supabase Auth + PostgreSQL/RLS → booking review/handover functions and audit data.

The resource match engine scores resource-title, category and description keyword overlap, expands a small set of related terms, and explains the results. It is deterministic and does not call an LLM.

## Known limitations / honest scope

- The resource matcher is **rules-based**, not generative AI.
- Handover QR currently encodes booking ID, not a cryptographic proof; it should not be described as secure identity verification.
- Live handovers store written notes; photo uploads to private storage are not yet implemented.
- Owner/institution provisioning and training verification are still limited.
- Need further concurrent booking, access-control and browser E2E testing before production use.
- Availability must be verified by owner approval; displayed slots may omit other students' private bookings.
- Never enter confidential personal data into demo accounts.

## Suggested judging demonstration

Show one complete workflow on the live URL and emphasize **measured** effects: one booking requested, approved, checked out and returned, with both condition reports saved. Discuss upcoming secure verification and fair allocation as roadmap rather than completed features.

## Team workflow

`feature/frontend` — UI work; `feature/integration` — tested merged application; `main` — final submission branch after checks. Do not merge frontend alone into main, as it may omit the live backend.

## AI-tool disclosure

If required by hackathon rules, accurately disclose coding assistants and any AI services used during development. The application resource matching in this repo is currently an explainable deterministic algorithm.
