-- TrustLoop AI: audited, requester-issued opaque handover passes
-- Applied to live Supabase on 2026-10-29.
create table if not exists public.handover_passes(
 booking_id uuid primary key references public.bookings(id) on delete cascade,
 passcode uuid not null default gen_random_uuid(),
 created_at timestamptz not null default now()
);
alter table public.handover_passes enable row level security;
revoke all on public.handover_passes from anon,authenticated;
create or replace function public.get_handover_pass(p_booking_id uuid)
returns text language plpgsql security definer set search_path='' as $$
declare v_status text; v_pass uuid;
begin
 if auth.uid() is null then raise exception 'Sign in required'; end if;
 select status into v_status from public.bookings
 where id=p_booking_id and requester_id=auth.uid();
 if not found then raise exception 'Only the booking requester can show the handover pass'; end if;
 if v_status not in ('approved','checked_out') then raise exception 'No active handover pass'; end if;
 insert into public.handover_passes(booking_id) values(p_booking_id)
 on conflict (booking_id) do nothing;
 select passcode into v_pass from public.handover_passes where booking_id=p_booking_id;
 return v_pass::text;
end $$;
revoke all on function public.get_handover_pass(uuid) from public,anon;
grant execute on function public.get_handover_pass(uuid) to authenticated;
create or replace function public.record_handover(
 p_booking_id uuid,p_stage text,p_notes text,p_photo_url text default null,p_passcode text default null
) returns public.bookings language plpgsql security definer set search_path='' as $$
declare b public.bookings; v_owner uuid; v_pass uuid;
begin
 if auth.uid() is null then raise exception 'Sign in required'; end if;
 if p_stage not in ('checkout','return') then raise exception 'Invalid stage'; end if;
 if p_notes is null or length(trim(p_notes))<3 or length(p_notes)>2000 then raise exception 'Condition notes required'; end if;
 if p_passcode is null or p_passcode !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then raise exception 'Valid student pass required'; end if;
 select * into b from public.bookings where id=p_booking_id for update;
 if not found then raise exception 'Booking not found'; end if;
 select owner_id into v_owner from public.resources where id=b.resource_id;
 if v_owner is distinct from auth.uid() then raise exception 'Only the resource owner can confirm handover'; end if;
 if p_stage='checkout' and b.status<>'approved' then raise exception 'Booking must be approved first'; end if;
 if p_stage='return' and b.status<>'checked_out' then raise exception 'Resource must be checked out first'; end if;
 select passcode into v_pass from public.handover_passes where booking_id=b.id;
 if v_pass is distinct from p_passcode::uuid then raise exception 'Incorrect student handover pass'; end if;
 insert into public.condition_reports(booking_id,author_id,stage,notes,photo_url)
 values(b.id,auth.uid(),p_stage,p_notes,nullif(p_photo_url,''));
 if p_stage='checkout' then
  update public.bookings set status='checked_out',checked_out_at=now() where id=b.id returning * into b;
 else
  update public.bookings set status='returned',returned_at=now() where id=b.id returning * into b;
  delete from public.handover_passes where booking_id=b.id;
 end if;
 insert into public.audit_logs(booking_id,actor_id,action,details)
 values(b.id,auth.uid(),p_stage,pg_catalog.jsonb_build_object('condition_notes',p_notes,'pass_verified',true));
 return b;
end $$;
drop function if exists public.record_handover(uuid,text,text,text);
revoke all on function public.record_handover(uuid,text,text,text,text) from public,anon;
grant execute on function public.record_handover(uuid,text,text,text,text) to authenticated;
