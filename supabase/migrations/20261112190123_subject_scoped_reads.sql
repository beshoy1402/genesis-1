-- Prevent an assigned teacher from reading a different teacher's subject records in the same class.
drop policy grades_scoped_read on public.grades;
create policy grades_scoped_read on public.grades for select to authenticated using(
  private.is_admin() or private.teacher_can_manage_subject(class_id,subject_id,teacher_id)
  or (published and (
    exists(select 1 from public.students s where s.id=student_id and s.profile_id=(select auth.uid()))
    or exists(select 1 from public.parent_students ps join public.parents p on p.id=ps.parent_id
      where ps.student_id=grades.student_id and p.profile_id=(select auth.uid()))
  ))
);

drop policy attendance_scoped_read on public.attendance;
create policy attendance_scoped_read on public.attendance for select to authenticated using(
  private.is_admin() or (subject_id is not null and private.teacher_can_manage_subject(class_id,subject_id,teacher_id))
  or exists(select 1 from public.students s where s.id=student_id and s.profile_id=(select auth.uid()))
  or exists(select 1 from public.parent_students ps join public.parents p on p.id=ps.parent_id
    where ps.student_id=attendance.student_id and p.profile_id=(select auth.uid()))
);

drop policy assignments_scoped_read on public.assignments;
create policy assignments_scoped_read on public.assignments for select to authenticated using(
  private.is_admin() or private.teacher_can_manage_subject(class_id,subject_id,teacher_id)
  or private.student_can_access_class(class_id) or private.parent_can_access_class(class_id)
);

drop policy exams_scoped_read on public.exams;
create policy exams_scoped_read on public.exams for select to authenticated using(
  private.is_admin() or (teacher_id is not null and private.teacher_can_manage_subject(class_id,subject_id,teacher_id))
  or (published and (private.student_can_access_class(class_id) or private.parent_can_access_class(class_id)))
);

drop policy results_scoped_read on public.exam_results;
create policy results_scoped_read on public.exam_results for select to authenticated using(
  private.is_admin()
  or exists(select 1 from public.exams e where e.id=exam_id and e.teacher_id is not null and private.teacher_can_manage_subject(e.class_id,e.subject_id,e.teacher_id))
  or (exists(select 1 from public.exams e where e.id=exam_id and e.published) and (
    exists(select 1 from public.students s where s.id=student_id and s.profile_id=(select auth.uid()))
    or exists(select 1 from public.parent_students ps join public.parents p on p.id=ps.parent_id
      where ps.student_id=exam_results.student_id and p.profile_id=(select auth.uid()))
  ))
);

drop policy submissions_scoped on public.assignment_submissions;
create policy submissions_scoped on public.assignment_submissions for select to authenticated using(
  private.is_admin()
  or exists(select 1 from public.students s where s.id=student_id and s.profile_id=(select auth.uid()))
  or exists(select 1 from public.parent_students ps join public.parents p on p.id=ps.parent_id
    where ps.student_id=assignment_submissions.student_id and p.profile_id=(select auth.uid()))
  or exists(select 1 from public.assignments a where a.id=assignment_id and private.teacher_can_manage_subject(a.class_id,a.subject_id,a.teacher_id))
);

drop policy timetable_scoped_read on public.timetables;
create policy timetable_scoped_read on public.timetables for select to authenticated using(
  private.is_admin() or private.teacher_can_manage_subject(class_id,subject_id,teacher_id)
  or private.student_can_access_class(class_id) or private.parent_can_access_class(class_id)
);
