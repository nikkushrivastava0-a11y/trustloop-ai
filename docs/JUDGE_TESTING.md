# TrustLoop AI — Judge testing guide
**Code Conqueror India 2026 | AGENTVERSE | 29 October 2026**

## URLs
- Live product: https://trustloop-ai-pi.vercel.app/
- Source: https://github.com/nikkushrivastava0-a11y/trustloop-ai
- Official problem: Unlock Underused Equipment and Spaces

## Recommended setup
Two authenticated accounts are required: an existing **student** account and a pre-provisioned **owner** account owning the sample resources. Do not publish passwords inside the repository or PDF. Provide judge credentials to organisers via their approved private channel. The live sample inventory is synthetic; no institutional resources are being offered for actual lending.

Open a regular browser window as student and a private/incognito window as owner. Date/time slots must start in the future. Use distinct, non-overlapping timeslots; booking duration is limited to seven days.

## Full user journey
1. Student: browse **Discover resources**. Explore seven sample categories, search by use case; camera is recommended for film/documentary language. Resource recommendations are deterministic keyword/capability matches with explainable reasons, without a paid LLM API or autonomous booking decisions.
2. Student: select **Canon DSLR Camera — Demo**, submit a future booking request with a sample project purpose. Status: **Requested**.
3. Owner: open **Owner workspace**, approve the request; status becomes **Approved**. Test **Waitlist** and **Reject** on separate requests. An older overlapping waitlisted request has priority.
4. Student: open **My bookings → booking → Check out resource** and display the **student handover pass** (QR containing an opaque, per-booking random value). Keep this pass private.
5. Owner: **Owner workspace → Manage handover**, enter the student's private pass, record initial condition notes, optionally attach one JPG/PNG/WebP photo under 5 MB, check confirmation, click **Confirm check-out**. Status: **Checked Out**.
6. Owner: return with the same student pass, add final condition notes and optional condition photo, confirm return. Status: **Returned**. The pass is invalidated on return.
7. Student and owner: inspect **View history** for approval, checkout, return and before/after condition reports. Photo evidence is privately stored and opened via temporary signed URLs.
8. Optional: open **Report an incident** and submit a clearly labelled **fictional test incident**. Verify it appears among incident reports. Resource owners can enter a written resolution for an incident from booking history; this resolution is audit-logged. Multi-party dispute appeals and automated notifications are not complete.

## Security/fairness tests
- Resource owner is the only account authorised to approve/reject/waitlist and confirm physical handover.
- A student can view a private QR but cannot complete checkout or return.
- A booking ID alone does not confirm handover; the owner needs the student-issued private pass.
- Postgres exclusion constraint blocks overlapping **approved/checked_out** reservations for the same resource.
- Database approval trigger limits each student to **two currently active approved/checked-out bookings**.
- For overlapping waitlisted requests, the owner cannot approve a newer request before an older outstanding waitlisted request.
- Owner/student may cancel pending or approved bookings before checkout, with an optional written reason recorded in the audit history.
- A training-required resource (sample 3D Printer) must not be approved without verified training. Booking purpose must contain at least 10 characters, enforced by the server.
- Booking list, owner workspace and history poll every 12 seconds and refresh on tab focus; not websocket realtime.
- Overdue checked-out bookings show an overdue badge; automated email/SMS reminder delivery is not implemented.

## Observed demonstration evidence
On 29 October 2026 a test Canon DSLR booking was visibly approved, checked out and returned; the booking history rendered two condition reports, both with private photo links, and approval/check-out/return audit events. These checks demonstrate one complete lifecycle, **not** exhaustive concurrency or authorization testing.

## Limitations and disclosures
- Fictional resources, synthetic demo notes and generated illustrative image assets; not authentic asset condition evidence.
- The deployed resource matcher is a deterministic keyword/capability algorithm, **not** an autonomous agent, RAG pipeline, generative AI model or booking decision-maker.
- Owner account provisioning, granular resource-specific training certificates, physical identity checks, revocation/rotation of exposed passes, incident resolution, and instant notifications remain areas for improvement.
- This is a hackathon prototype, not approved for unsupervised lending of hazardous or restricted equipment.
- AI coding assistants, open-source libraries/frameworks, existing assets/templates and each member's exact contributions must be disclosed in the final form. Keep those details accurate to development history.

## Release safeguards
- GitHub Actions is configured to run lint, unit tests, production build, and a separate demo-mode Chromium test of student QR → owner checkout/return → incident → owner resolution. CI passing still does not validate real Supabase two-account access; check actual workflow status in the repository Actions tab.
- Judge login is still required for private booking actions; do not put account passwords in public source or reports.
