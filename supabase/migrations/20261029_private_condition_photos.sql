-- TrustLoop AI private condition evidence storage.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('trustloop-conditions','trustloop-conditions',false,5242880,
array['image/jpeg','image/png','image/webp'])
on conflict(id) do nothing;
create policy "TrustLoop condition photo owner upload"
on storage.objects for insert to authenticated
with check(bucket_id='trustloop-conditions' and exists(
 select 1 from public.bookings b join public.resources r on r.id=b.resource_id
 where b.id::text=(storage.foldername(name))[1] and r.owner_id=(select auth.uid())
 and b.status in ('approved','checked_out')
));
create policy "TrustLoop condition photo booking parties read"
on storage.objects for select to authenticated
using(bucket_id='trustloop-conditions' and exists(
 select 1 from public.bookings b join public.resources r on r.id=b.resource_id
 where b.id::text=(storage.foldername(name))[1]
 and (b.requester_id=(select auth.uid()) or r.owner_id=(select auth.uid()))
));
create policy "TrustLoop condition photo owner delete"
on storage.objects for delete to authenticated
using(bucket_id='trustloop-conditions' and exists(
 select 1 from public.bookings b join public.resources r on r.id=b.resource_id
 where b.id::text=(storage.foldername(name))[1] and r.owner_id=(select auth.uid())
));
