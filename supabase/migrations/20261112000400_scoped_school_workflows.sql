-- Tighten teacher writes to the exact class/subject assignment and expose linked child display names.
create or replace function private.teacher_can_manage_subject(target_class uuid, target_subject uuid, target_teacher uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(
    select 1 from public.teacher_class_subjects a join public.teachers t on t.id=a.teacher_id
    where a.class_id=target_class and a.subject_id=target_subject and a.teacher_id=target_teacher
      and t.profile_id=(select auth.uid()) and private.current_role()='teacher'
  )
$$;
grant execute on function private.teacher_can_manage_subject(uuid,uuid,uuid) to authenticated;
revoke execute on function private.teacher_can_manage_subject(uuid,uuid,uuid) from public, anon;

create policy profiles_linked_children on public.profiles for select to authenticated using(
  exists(select 1 from public.students s join public.parent_students ps on ps.student_id=s.id
    join public.parents p on p.id=ps.parent_id where s.profile_id=profiles.id and p.profile_id=(select auth.uid()))
);

drop policy grades_teacher_write on public.grades;
create policy grades_teacher_write on public.grades for all to authenticated
using(private.is_admin() or private.teacher_can_manage_subject(class_id,subject_id,teacher_id))
with check(private.is_admin() or private.teacher_can_manage_subject(class_id,subject_id,teacher_id));

drop policy attendance_teacher_write on public.attendance;
create policy attendance_teacher_write on public.attendance for all to authenticated
using(private.is_admin() or (subject_id is not null and private.teacher_can_manage_subject(class_id,subject_id,teacher_id)))
with check(private.is_admin() or (subject_id is not null and private.teacher_can_manage_subject(class_id,subject_id,teacher_id)));

drop policy assignments_teacher_write on public.assignments;
create policy assignments_teacher_write on public.assignments for all to authenticated
using(private.is_admin() or private.teacher_can_manage_subject(class_id,subject_id,teacher_id))
with check(private.is_admin() or private.teacher_can_manage_subject(class_id,subject_id,teacher_id));

drop policy exams_teacher_write on public.exams;
create policy exams_teacher_write on public.exams for all to authenticated
using(private.is_admin() or (teacher_id is not null and private.teacher_can_manage_subject(class_id,subject_id,teacher_id)))
with check(private.is_admin() or (teacher_id is not null and private.teacher_can_manage_subject(class_id,subject_id,teacher_id)));

drop policy results_teacher_write on public.exam_results;
create policy results_teacher_write on public.exam_results for all to authenticated
using(private.is_admin() or exists(select 1 from public.exams e where e.id=exam_id and e.teacher_id is not null and private.teacher_can_manage_subject(e.class_id,e.subject_id,e.teacher_id)))
with check(private.is_admin() or exists(select 1 from public.exams e where e.id=exam_id and e.teacher_id is not null and private.teacher_can_manage_subject(e.class_id,e.subject_id,e.teacher_id)));

drop policy submissions_teacher_update on public.assignment_submissions;
create policy submissions_teacher_update on public.assignment_submissions for update to authenticated
using(private.is_admin() or exists(select 1 from public.assignments a where a.id=assignment_id and private.teacher_can_manage_subject(a.class_id,a.subject_id,a.teacher_id)))
with check(private.is_admin() or exists(select 1 from public.assignments a where a.id=assignment_id and private.teacher_can_manage_subject(a.class_id,a.subject_id,a.teacher_id)));

create or replace function private.record_grade_history() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.grade_history(grade_id,changed_by,old_score,new_score)
  values(new.id,(select auth.uid()),case when tg_op='UPDATE' then old.score else null end,new.score);
  return new;
end $$;
revoke execute on function private.record_grade_history() from public, anon, authenticated;
create trigger grades_history_after_change after insert or update of score on public.grades
for each row execute function private.record_grade_history();
