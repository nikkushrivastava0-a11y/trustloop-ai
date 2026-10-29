# TrustLoop Backend API — v0.1

All endpoints require an authenticated Supabase session. Use Supabase Auth in the frontend; server routes use SSR cookies.

## GET /api/resources
List resources. Response: array of resources.

## POST /api/resources
Body: `{ "title": "DSLR Camera", "category": "camera", "location": "Media Lab", "description": "...", "rules": "...", "requires_training": false }`
Requires signed-in user with profile row. Returns created resource.

## GET /api/bookings
List bookings involving signed-in student or owner (RLS-controlled), newest first.

## POST /api/bookings
Body: `{ "resource_id": "<uuid>", "starts_at": "2026-10-29T10:00:00+05:30", "ends_at": "2026-10-29T11:00:00+05:30", "purpose": "Student demo" }`
Initial status is always `requested`. Owner may not request their own resource.

## POST /api/bookings/review
Body: `{ "booking_id": "<uuid>", "decision": "approved", "reason": "Training complete" }`
Other decisions: rejected, waitlisted. Checks owner identity, training eligibility, and schedule overlap on approval. Approval actions are logged.

## Critical pending work
- Frontend auth and profile provisioning (profiles.id = auth.users.id).
- Dedicated check-in/check-out transitions with condition records.
- Atomic booking concurrency guard and stronger fair-use/waitlist rules.
- End-to-end tests for two signed-in accounts.

Do not mark the application as end-to-end working until pending work is completed and tested.
