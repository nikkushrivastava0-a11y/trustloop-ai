# Auth & handover integration

Supabase Auth is enabled through the Supabase project. The database trigger now automatically creates `public.profiles` when a user signs up. No frontend manual profile insert is required. Every new signup receives the student role. A resource owner is identified by `resources.owner_id`; do not trust client-selected roles for permissions.

Frontend auth example with `createClient` from `@/lib/supabase/client`:
```ts
const db = createClient();
await db.auth.signUp({email,password,options:{data:{full_name}}});
await db.auth.signInWithPassword({email,password});
await db.auth.signOut();
```

If email confirmations are enabled, signup may require email verification before login. Use `GET /api/profile` to display current profile. The frontend must keep the session stored by Supabase browser client; SSR server routes read its cookies.

## Physical handover
`POST /api/bookings/handover`
```json
{"booking_id":"<uuid>","stage":"checkout","notes":"Camera body clean, lens inspected"}
```
Use `"stage":"return"` and final inspection notes to record return. Only the **resource owner** can confirm physical handover. Database checks valid state transitions, inserts condition report and audit log transactionally.

Photo URL is optional. **Do not send private or unverified third-party photo URLs as evidence.** Secure evidence upload requires private Supabase Storage and verified file ownership; not yet implemented.

## Still needed before demo
- Auth screens and real sign-up/login tests with 2 accounts
- Frontend session integration and check-in/out interface
- Conflicting-booking concurrency protections and fairness limits
- Audit history UI and incident reporting UI
- Two-account end-to-end test, deploy and smoke test
