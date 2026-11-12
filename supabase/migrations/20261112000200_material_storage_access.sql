-- Allow the school administrator to upload on behalf of the school and teachers to retrieve their own drafts.
alter table public.learning_materials alter column teacher_id drop not null;

create policy materials_storage_owner_read on storage.objects for select to authenticated using(
  bucket_id='learning-materials' and exists(
    select 1 from public.learning_materials m
    where m.storage_path=name and (
      private.is_admin() or (
        m.teacher_id in(select t.id from public.teachers t where t.profile_id=(select auth.uid()))
        and private.teacher_can_access_class(m.class_id)
      )
    )
  )
);
