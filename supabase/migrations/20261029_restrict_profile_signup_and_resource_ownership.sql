-- Applied to Supabase project on 2026-10-29.
-- New accounts cannot grant themselves owner role on profile creation.
alter policy "profile own create" on public.profiles
to authenticated
with check (
  id = (select auth.uid())
  and role = 'student'
  and training_verified = false
);

-- Provisioned owners and owners of existing demo inventory retain listing rights.
-- New students cannot create their first institutional resource themselves.
alter policy "resource owner create" on public.resources
to authenticated
with check (
  owner_id = (select auth.uid())
  and (
    exists (select 1 from public.profiles p
            where p.id = (select auth.uid()) and p.role in ('owner','manager'))
    or exists (select 1 from public.resources existing
               where existing.owner_id = (select auth.uid()))
  )
);
