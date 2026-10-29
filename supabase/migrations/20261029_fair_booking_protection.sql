-- TrustLoop AI: prevent double-booking and limit resource monopolisation.
-- Applied to hackathon Supabase project on 2026-10-29.
-- Run once on a database that does not yet have these objects.
create extension if not exists btree_gist with schema extensions;
alter table public.bookings
  add constraint bookings_no_overlapping_approved
  exclude using gist (
    resource_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  )
  where (status in ('approved','checked_out'));

create or replace function public.enforce_fair_booking_limit()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare v_active integer;
begin
  if new.status = 'approved' and old.status is distinct from 'approved' then
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.requester_id::text, 48271));
    select count(*) into v_active from public.bookings
    where requester_id = new.requester_id and id <> new.id
      and status in ('approved','checked_out')
      and ends_at > pg_catalog.now();
    if v_active >= 2 then
      raise exception 'Fair-use limit: maximum 2 active reservations per student. Please return or finish an existing booking before requesting another approval.';
    end if;
  end if;
  return new;
end;
$$;
create trigger trg_fair_booking_limit
before update of status on public.bookings
for each row execute function public.enforce_fair_booking_limit();
revoke all on function public.enforce_fair_booking_limit() from public, anon, authenticated;
