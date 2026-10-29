-- Incident resolution: owner-only update with immutable incident evidence and an audit entry.
create policy "incident owner resolution" on public.incidents for update to authenticated
using (
 resolution is null and exists (
  select 1 from public.bookings b join public.resources r on r.id=b.resource_id
  where b.id=incidents.booking_id and r.owner_id=(select auth.uid())
 )
)
with check (
 exists (
  select 1 from public.bookings b join public.resources r on r.id=b.resource_id
  where b.id=incidents.booking_id and r.owner_id=(select auth.uid())
 )
);
create or replace function public.audit_incident_resolution()
returns trigger language plpgsql set search_path='' as $$
begin
  if new.id is distinct from old.id
     or new.booking_id is distinct from old.booking_id
     or new.reporter_id is distinct from old.reporter_id
     or new.kind is distinct from old.kind
     or new.details is distinct from old.details
     or new.created_at is distinct from old.created_at then
    raise exception 'Incident reports are immutable; only resolution may change';
  end if;
  if old.resolution is not null then
    raise exception 'Incident already resolved';
  end if;
  if length(trim(coalesce(new.resolution,''))) < 5 or length(new.resolution)>2000 then
    raise exception 'Resolution must be 5 to 2000 characters';
  end if;
  insert into public.audit_logs(booking_id,actor_id,action,details)
  values (new.booking_id,auth.uid(),'incident_resolved',
    pg_catalog.jsonb_build_object('incident_id',new.id,'resolution',new.resolution));
  return new;
end $$;
create trigger incident_resolution_audit before update on public.incidents
for each row execute function public.audit_incident_resolution();
