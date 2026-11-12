-- Scope teacher uploads and deletes to files stored in their own class/user path.
drop policy materials_storage_teacher_upload on storage.objects;
create policy materials_storage_teacher_upload on storage.objects for insert to authenticated with check(
  bucket_id='learning-materials' and (
    private.is_admin() or (
      split_part(name,'/',1) ~* '^[0-9a-f-]{36}$'
      and split_part(name,'/',2)=(select auth.uid())::text
      and private.teacher_can_access_class(split_part(name,'/',1)::uuid)
    )
  )
);
drop policy materials_storage_teacher_delete on storage.objects;
create policy materials_storage_teacher_delete on storage.objects for delete to authenticated using(
  bucket_id='learning-materials' and (
    private.is_admin() or (
      split_part(name,'/',1) ~* '^[0-9a-f-]{36}$'
      and split_part(name,'/',2)=(select auth.uid())::text
      and private.teacher_can_access_class(split_part(name,'/',1)::uuid)
    )
  )
);
