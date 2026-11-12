-- Let school members see only the display names of teachers connected to their authorized classes.
create policy profiles_assigned_teachers on public.profiles for select to authenticated using(
  exists(
    select 1 from public.teachers t
    join public.teacher_class_subjects a on a.teacher_id=t.id
    where t.profile_id=profiles.id and (
      private.is_admin() or private.teacher_can_access_class(a.class_id)
      or private.student_can_access_class(a.class_id) or private.parent_can_access_class(a.class_id)
    )
  )
);
