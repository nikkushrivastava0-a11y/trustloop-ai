-- The incident resolution trigger must insert audit logs that clients cannot write directly.
-- SECURITY DEFINER is limited to this trigger and independently re-checks resource ownership.
CREATE OR REPLACE FUNCTION public.audit_incident_resolution()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE v_owner uuid;
BEGIN
  SELECT r.owner_id INTO v_owner FROM public.bookings b
  JOIN public.resources r ON r.id=b.resource_id WHERE b.id=old.booking_id;
  IF auth.uid() IS NULL OR auth.uid() IS DISTINCT FROM v_owner THEN
    RAISE EXCEPTION 'Only the resource owner can resolve an incident';
  END IF;
  IF new.id IS DISTINCT FROM old.id OR new.booking_id IS DISTINCT FROM old.booking_id
    OR new.reporter_id IS DISTINCT FROM old.reporter_id OR new.kind IS DISTINCT FROM old.kind
    OR new.details IS DISTINCT FROM old.details OR new.created_at IS DISTINCT FROM old.created_at THEN
    RAISE EXCEPTION 'Incident evidence is immutable';
  END IF;
  IF old.resolution IS NOT NULL THEN RAISE EXCEPTION 'Incident already resolved'; END IF;
  IF length(trim(coalesce(new.resolution,''))) < 5 OR length(new.resolution) > 2000 THEN
    RAISE EXCEPTION 'Resolution must contain 5 to 2000 characters';
  END IF;
  INSERT INTO public.audit_logs (booking_id,actor_id,action,details)
  VALUES (old.booking_id,auth.uid(),'incident_resolved',
    pg_catalog.jsonb_build_object('incident_id',old.id,'resolution',new.resolution));
  RETURN new;
END $function$;
REVOKE ALL ON FUNCTION public.audit_incident_resolution() FROM PUBLIC, anon, authenticated;
