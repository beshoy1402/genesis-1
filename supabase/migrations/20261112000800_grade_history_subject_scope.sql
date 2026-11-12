drop policy grade_history_scoped_read on public.grade_history;
create policy grade_history_scoped_read on public.grade_history for select to authenticated using(
  private.is_admin() or exists(
    select 1 from public.grades g where g.id=grade_id and (
      private.teacher_can_manage_subject(g.class_id,g.subject_id,g.teacher_id)
      or (g.published and (
        exists(select 1 from public.students s where s.id=g.student_id and s.profile_id=(select auth.uid()))
        or exists(select 1 from public.parent_students ps join public.parents p on p.id=ps.parent_id
          where ps.student_id=g.student_id and p.profile_id=(select auth.uid()))
      ))
    )
  )
);
