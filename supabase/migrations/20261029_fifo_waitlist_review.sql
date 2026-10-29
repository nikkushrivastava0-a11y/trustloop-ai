-- Reviewed for TrustLoop AI hackathon; installed on production Supabase database.
-- Allows owner to approve or reject waitlisted requests; prioritises older overlapping waitlist requests.
CREATE OR REPLACE FUNCTION public.review_booking(p_booking_id uuid, p_decision text, p_reason text DEFAULT NULL::text)
 RETURNS bookings
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
 b public.bookings;
 v_owner uuid;
 v_training boolean;
 v_required boolean;
 v_conflicts integer;
 v_earlier_waitlist uuid;
 v_reason text; v_previous_status text;
begin
 if auth.uid() is null then raise exception 'Sign in required'; end if;
 if p_decision not in ('approved','rejected','waitlisted') then raise exception 'Invalid decision'; end if;
 if p_reason is not null and length(p_reason) > 500 then raise exception 'Reason too long'; end if;
 select * into b from public.bookings where id = p_booking_id for update;
 if not found then raise exception 'Booking not found'; end if;
 select owner_id,requires_training into v_owner,v_required from public.resources where id=b.resource_id;
 if v_owner is distinct from auth.uid() then raise exception 'Only resource owner can review'; end if;
 if b.status not in ('requested','waitlisted') then raise exception 'Booking already reviewed'; end if;
 if p_decision='waitlisted' and b.status='waitlisted' then raise exception 'Already waitlisted'; end if;
 if p_decision='approved' then
   if b.ends_at <= pg_catalog.now() then raise exception 'Booking window has expired'; end if;
   select training_verified into v_training from public.profiles where id=b.requester_id;
   if v_required and not coalesce(v_training,false) then raise exception 'Training verification required'; end if;
   -- Serialise reviews of requests against the same equipment.
   perform 1 from public.resources where id=b.resource_id for update;
   select count(*) into v_conflicts from public.bookings
   where resource_id=b.resource_id and id<>b.id
     and status in ('approved','checked_out')
     and starts_at < b.ends_at and ends_at > b.starts_at;
   if v_conflicts>0 then raise exception 'Time conflict: approve after availability opens, or keep waitlisted'; end if;
   -- FIFO applies to competing, overlapping waiting-list requests.
   select id into v_earlier_waitlist from public.bookings
    where resource_id=b.resource_id and id<>b.id and status='waitlisted'
      and starts_at < b.ends_at and ends_at > b.starts_at
      and (created_at < b.created_at or (created_at=b.created_at and id<b.id))
    order by created_at,id limit 1;
   if v_earlier_waitlist is not null then
     raise exception 'Fair access: an earlier overlapping waitlisted request must be considered first';
   end if;
 end if;
 v_reason := coalesce(nullif(trim(p_reason),''),case p_decision
   when 'approved' then 'Owner approved after eligibility and availability checks'
   when 'waitlisted' then 'Awaiting availability or owner review'
   else 'Owner rejected the request' end);
 v_previous_status := b.status;
 update public.bookings set status=p_decision,decision_reason=v_reason
 where id=b.id returning * into b;
 insert into public.audit_logs(booking_id,actor_id,action,details)
 values (b.id,auth.uid(),p_decision,pg_catalog.jsonb_build_object('reason',v_reason,'previous_status',v_previous_status));
 return b;
end $function$
;
