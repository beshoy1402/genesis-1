-- Bind student-specific records to the student's current class, even for direct API requests.
alter table public.grades add constraint grades_score_within_max check(score <= max_score);
alter table public.exam_results add constraint exam_results_score_within_max check(score <= max_score);

create or replace function private.validate_student_class_record() returns trigger
language plpgsql security definer set search_path = '' as $$
declare student_class uuid;
begin
  if new.student_id is not null then
    select s.class_id into student_class from public.students s where s.id=new.student_id;
    if student_class is distinct from new.class_id then
      raise exception 'Student is not enrolled in this record class' using errcode='23514';
    end if;
  end if;
  return new;
end $$;
revoke execute on function private.validate_student_class_record() from public, anon, authenticated;
create trigger grade_student_class_guard before insert or update of student_id,class_id on public.grades
for each row execute function private.validate_student_class_record();
create trigger attendance_student_class_guard before insert or update of student_id,class_id on public.attendance
for each row execute function private.validate_student_class_record();
create trigger material_student_class_guard before insert or update of student_id,class_id on public.learning_materials
for each row execute function private.validate_student_class_record();

create or replace function private.validate_assignment_submission() returns trigger
language plpgsql security definer set search_path = '' as $$
declare assigned_class uuid; student_class uuid;
begin
  select a.class_id into assigned_class from public.assignments a where a.id=new.assignment_id;
  select s.class_id into student_class from public.students s where s.id=new.student_id;
  if assigned_class is null or student_class is distinct from assigned_class then
    raise exception 'Student is not enrolled in the assignment class' using errcode='23514';
  end if;
  return new;
end $$;
revoke execute on function private.validate_assignment_submission() from public, anon, authenticated;
create trigger assignment_submission_class_guard before insert or update of assignment_id,student_id
on public.assignment_submissions for each row execute function private.validate_assignment_submission();

create or replace function private.validate_exam_result_student() returns trigger
language plpgsql security definer set search_path = '' as $$
declare exam_class uuid; student_class uuid;
begin
  select e.class_id into exam_class from public.exams e where e.id=new.exam_id;
  select s.class_id into student_class from public.students s where s.id=new.student_id;
  if exam_class is null or student_class is distinct from exam_class then
    raise exception 'Student is not enrolled in the exam class' using errcode='23514';
  end if;
  return new;
end $$;
revoke execute on function private.validate_exam_result_student() from public, anon, authenticated;
create trigger exam_result_class_guard before insert or update of exam_id,student_id
on public.exam_results for each row execute function private.validate_exam_result_student();

create or replace function private.student_can_submit(target_assignment uuid,target_student uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.assignments a join public.students s on s.class_id=a.class_id
    where a.id=target_assignment and s.id=target_student and s.profile_id=(select auth.uid()))
$$;
grant execute on function private.student_can_submit(uuid,uuid) to authenticated;
revoke execute on function private.student_can_submit(uuid,uuid) from public, anon;
drop policy submissions_student_write on public.assignment_submissions;
create policy submissions_student_write on public.assignment_submissions for insert to authenticated
with check(private.student_can_submit(assignment_id,student_id) and status in('pending','submitted','late'));
