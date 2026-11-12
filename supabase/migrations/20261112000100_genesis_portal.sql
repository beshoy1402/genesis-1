-- Genesis International School Portal. Apply once to a new Supabase project.
create extension if not exists pgcrypto;
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create type public.school_role as enum ('student', 'parent', 'teacher', 'admin');
create type public.attendance_status as enum ('present', 'absent', 'late', 'excused');
create type public.material_category as enum ('lecture_notes', 'worksheets', 'homework', 'revision', 'presentations', 'exam_papers', 'study_guides', 'other');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.school_role not null,
  username text unique,
  full_name text not null default '',
  phone text,
  avatar_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint username_format check (username is null or username ~ '^[a-zA-Z0-9._-]{3,40}$')
);
create index profiles_role_idx on public.profiles(role);

create table public.school_classes (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  grade_level text not null,
  academic_year text not null,
  room text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.students (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles(id) on delete cascade,
  admission_number text unique not null,
  date_of_birth date,
  class_id uuid references public.school_classes(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index students_class_idx on public.students(class_id);
create table public.parents (
  id uuid primary key default gen_random_uuid(), profile_id uuid not null unique references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);
create table public.parent_students (
  parent_id uuid not null references public.parents(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  relationship text not null default 'Parent', primary key (parent_id, student_id)
);
create index parent_students_student_idx on public.parent_students(student_id);
create table public.teachers (
  id uuid primary key default gen_random_uuid(), profile_id uuid not null unique references public.profiles(id) on delete cascade,
  employee_number text unique, department text, created_at timestamptz not null default now()
);
create table public.subjects (
  id uuid primary key default gen_random_uuid(), name text not null unique, code text unique,
  created_at timestamptz not null default now()
);
create table public.teacher_class_subjects (
  id uuid primary key default gen_random_uuid(), teacher_id uuid not null references public.teachers(id) on delete cascade,
  class_id uuid not null references public.school_classes(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  created_at timestamptz not null default now(), unique(teacher_id,class_id,subject_id)
);
create index teacher_assignments_class_idx on public.teacher_class_subjects(class_id, subject_id);
create table public.grades (
  id uuid primary key default gen_random_uuid(), student_id uuid not null references public.students(id) on delete cascade,
  subject_id uuid not null references public.subjects(id), class_id uuid not null references public.school_classes(id),
  teacher_id uuid not null references public.teachers(id), title text not null, score numeric(6,2) not null check(score >= 0),
  max_score numeric(6,2) not null check(max_score > 0), term text, published boolean not null default false,
  recorded_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index grades_student_idx on public.grades(student_id, subject_id, recorded_at desc);
create table public.grade_history (
  id uuid primary key default gen_random_uuid(), grade_id uuid not null references public.grades(id) on delete cascade,
  changed_by uuid references public.profiles(id) on delete set null, old_score numeric(6,2), new_score numeric(6,2) not null,
  changed_at timestamptz not null default now()
);
create table public.attendance (
  id uuid primary key default gen_random_uuid(), student_id uuid not null references public.students(id) on delete cascade,
  class_id uuid not null references public.school_classes(id), subject_id uuid references public.subjects(id),
  teacher_id uuid not null references public.teachers(id), attendance_date date not null,
  status public.attendance_status not null, note text, created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(), unique(student_id, class_id, subject_id, attendance_date)
);
create index attendance_student_date_idx on public.attendance(student_id, attendance_date desc);
create table public.timetables (
  id uuid primary key default gen_random_uuid(), class_id uuid not null references public.school_classes(id) on delete cascade,
  subject_id uuid not null references public.subjects(id), teacher_id uuid not null references public.teachers(id),
  weekday smallint not null check(weekday between 1 and 7), starts_at time not null, ends_at time not null,
  room text, created_at timestamptz not null default now(), check(ends_at > starts_at)
);
create table public.assignments (
  id uuid primary key default gen_random_uuid(), class_id uuid not null references public.school_classes(id) on delete cascade,
  subject_id uuid not null references public.subjects(id), teacher_id uuid not null references public.teachers(id),
  title text not null, description text, due_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.assignment_submissions (
  id uuid primary key default gen_random_uuid(), assignment_id uuid not null references public.assignments(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade, submission_text text, submitted_at timestamptz,
  status text not null default 'pending' check(status in ('pending','submitted','late','graded')),
  score numeric(6,2), feedback text, unique(assignment_id,student_id)
);
create table public.exams (
  id uuid primary key default gen_random_uuid(), class_id uuid not null references public.school_classes(id) on delete cascade,
  subject_id uuid not null references public.subjects(id), teacher_id uuid references public.teachers(id),
  title text not null, starts_at timestamptz not null, duration_minutes integer check(duration_minutes > 0),
  room text, published boolean not null default false, created_at timestamptz not null default now()
);
create table public.exam_results (
  id uuid primary key default gen_random_uuid(), exam_id uuid not null references public.exams(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade, score numeric(6,2) not null check(score >= 0),
  max_score numeric(6,2) not null check(max_score > 0), recorded_at timestamptz not null default now(), unique(exam_id,student_id)
);
create table public.announcements (
  id uuid primary key default gen_random_uuid(), author_id uuid not null references public.profiles(id),
  class_id uuid references public.school_classes(id) on delete cascade, title text not null, body text not null,
  published_at timestamptz, created_at timestamptz not null default now()
);
create table public.notifications (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null, body text not null, href text, material_id uuid,
  read_at timestamptz, created_at timestamptz not null default now(), unique(user_id, material_id)
);
create index notifications_user_date_idx on public.notifications(user_id, created_at desc);
create table public.school_fees (
  id uuid primary key default gen_random_uuid(), student_id uuid not null references public.students(id) on delete cascade,
  description text not null, amount numeric(10,2) not null check(amount >= 0), due_date date, academic_year text not null,
  created_at timestamptz not null default now()
);
create table public.payment_records (
  id uuid primary key default gen_random_uuid(), fee_id uuid not null references public.school_fees(id) on delete cascade,
  amount numeric(10,2) not null check(amount > 0), paid_at timestamptz not null default now(), reference text,
  recorded_by uuid references public.profiles(id)
);
create table public.messages (
  id uuid primary key default gen_random_uuid(), sender_id uuid not null references public.profiles(id),
  recipient_id uuid not null references public.profiles(id), student_id uuid references public.students(id),
  body text not null, created_at timestamptz not null default now(), read_at timestamptz
);
create index messages_thread_idx on public.messages(sender_id, recipient_id, created_at desc);
create table public.learning_materials (
  id uuid primary key default gen_random_uuid(), title text not null, description text,
  storage_path text not null unique, original_filename text not null, file_type text not null,
  file_size bigint not null check(file_size > 0 and file_size <= 52428800),
  category public.material_category not null default 'other', subject_id uuid not null references public.subjects(id),
  class_id uuid not null references public.school_classes(id) on delete cascade,
  teacher_id uuid references public.teachers(id), student_id uuid references public.students(id) on delete cascade,
  folder text, topic text, week_label text, assignment_id uuid references public.assignments(id) on delete set null,
  uploaded_at timestamptz not null default now(), published_at timestamptz, available_until timestamptz,
  is_published boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index materials_class_publish_idx on public.learning_materials(class_id, subject_id, category, published_at desc) where is_published;
create index materials_student_idx on public.learning_materials(student_id) where student_id is not null;
alter table public.notifications add constraint notifications_material_fk foreign key(material_id) references public.learning_materials(id) on delete cascade;

-- Authorization helpers live outside the exposed public schema. Role claims from user_metadata are never trusted.
create or replace function private.current_role() returns public.school_role
language sql stable security definer set search_path = '' as $$
  select p.role from public.profiles p where p.id = (select auth.uid()) and p.is_active
$$;
create or replace function private.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$ select coalesce(private.current_role() = 'admin', false) $$;
create or replace function private.teacher_can_access_class(target_class uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.teacher_class_subjects a join public.teachers t on t.id=a.teacher_id
    where a.class_id=target_class and t.profile_id=(select auth.uid()))
$$;
create or replace function private.student_can_access_class(target_class uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.students s where s.class_id=target_class and s.profile_id=(select auth.uid()))
$$;
create or replace function private.parent_can_access_class(target_class uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.parent_students ps join public.parents p on p.id=ps.parent_id
    join public.students s on s.id=ps.student_id where p.profile_id=(select auth.uid()) and s.class_id=target_class)
$$;
create or replace function private.can_view_material(target_material uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.learning_materials m where m.id=target_material and m.is_published
    and (m.available_until is null or m.available_until > now())
    and (private.is_admin() or private.teacher_can_access_class(m.class_id)
      or exists(select 1 from public.students s where s.profile_id=(select auth.uid()) and s.class_id=m.class_id
        and (m.student_id is null or m.student_id=s.id))
      or exists(select 1 from public.parent_students ps join public.parents p on p.id=ps.parent_id
        join public.students s on s.id=ps.student_id where p.profile_id=(select auth.uid()) and s.class_id=m.class_id
        and (m.student_id is null or m.student_id=s.id))))
$$;
create or replace function private.can_upload_material(target_class uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select private.is_admin() or private.teacher_can_access_class(target_class)
$$;

grant execute on function private.current_role(), private.is_admin(), private.teacher_can_access_class(uuid), private.student_can_access_class(uuid), private.parent_can_access_class(uuid), private.can_view_material(uuid), private.can_upload_material(uuid) to authenticated;
revoke execute on all functions in schema private from public, anon;

-- Generic policies: each table has an explicit row scope; writes are limited to teachers assigned to a class or admins.
alter table public.profiles enable row level security;
create policy profiles_self_or_admin on public.profiles for select to authenticated using(id=(select auth.uid()) or private.is_admin());
create policy profiles_staff_roster on public.profiles for select to authenticated using(private.is_admin() or
  (private.current_role()='teacher' and exists(select 1 from public.students s where s.profile_id=profiles.id and private.teacher_can_access_class(s.class_id))));
create policy profiles_self_update on public.profiles for update to authenticated using(id=(select auth.uid()) and not private.is_admin()) with check(id=(select auth.uid()) and role=(select private.current_role()) and is_active);
create policy profiles_admin_all on public.profiles for all to authenticated using(private.is_admin()) with check(private.is_admin());

alter table public.school_classes enable row level security;
create policy classes_visible_to_school_roles on public.school_classes for select to authenticated using(private.current_role() is not null);
create policy classes_admin_write on public.school_classes for all to authenticated using(private.is_admin()) with check(private.is_admin());
alter table public.students enable row level security;
create policy students_scoped_read on public.students for select to authenticated using(profile_id=(select auth.uid()) or private.is_admin() or private.teacher_can_access_class(class_id) or exists(select 1 from public.parent_students ps join public.parents p on p.id=ps.parent_id where ps.student_id=students.id and p.profile_id=(select auth.uid())));
create policy students_admin_write on public.students for all to authenticated using(private.is_admin()) with check(private.is_admin());
alter table public.parents enable row level security;
create policy parents_self_admin on public.parents for select to authenticated using(profile_id=(select auth.uid()) or private.is_admin());
create policy parents_admin_write on public.parents for all to authenticated using(private.is_admin()) with check(private.is_admin());
alter table public.parent_students enable row level security;
create policy parent_links_scoped on public.parent_students for select to authenticated using(private.is_admin() or exists(select 1 from public.parents p where p.id=parent_id and p.profile_id=(select auth.uid())) or exists(select 1 from public.students s where s.id=student_id and private.teacher_can_access_class(s.class_id)));
create policy parent_links_admin_write on public.parent_students for all to authenticated using(private.is_admin()) with check(private.is_admin());
alter table public.teachers enable row level security;
create policy teachers_school_read on public.teachers for select to authenticated using(private.current_role() is not null);
create policy teachers_admin_write on public.teachers for all to authenticated using(private.is_admin()) with check(private.is_admin());
alter table public.subjects enable row level security;
create policy subjects_school_read on public.subjects for select to authenticated using(private.current_role() is not null);
create policy subjects_admin_write on public.subjects for all to authenticated using(private.is_admin()) with check(private.is_admin());
alter table public.teacher_class_subjects enable row level security;
create policy assignments_visible_scope on public.teacher_class_subjects for select to authenticated using(private.is_admin() or private.teacher_can_access_class(class_id) or private.student_can_access_class(class_id) or private.parent_can_access_class(class_id));
create policy assignments_admin_write on public.teacher_class_subjects for all to authenticated using(private.is_admin()) with check(private.is_admin());

-- Grades and results: own student / linked child / assigned class, and only after publication for families.
alter table public.grades enable row level security;
create policy grades_scoped_read on public.grades for select to authenticated using(private.is_admin() or private.teacher_can_access_class(class_id) or (published and (exists(select 1 from public.students s where s.id=student_id and s.profile_id=(select auth.uid())) or exists(select 1 from public.parent_students ps join public.parents p on p.id=ps.parent_id where ps.student_id=grades.student_id and p.profile_id=(select auth.uid())))));
create policy grades_teacher_write on public.grades for all to authenticated using(private.is_admin() or (teacher_id in (select t.id from public.teachers t where t.profile_id=(select auth.uid())) and private.teacher_can_access_class(class_id))) with check(private.is_admin() or (teacher_id in (select t.id from public.teachers t where t.profile_id=(select auth.uid())) and private.teacher_can_access_class(class_id)));
alter table public.grade_history enable row level security;
create policy grade_history_scoped_read on public.grade_history for select to authenticated using(private.is_admin() or exists(select 1 from public.grades g where g.id=grade_id and (private.teacher_can_access_class(g.class_id) or (g.published and (exists(select 1 from public.students s where s.id=g.student_id and s.profile_id=(select auth.uid())) or exists(select 1 from public.parent_students ps join public.parents p on p.id=ps.parent_id where ps.student_id=g.student_id and p.profile_id=(select auth.uid())))))));
create policy grade_history_admin_write on public.grade_history for all to authenticated using(private.is_admin()) with check(private.is_admin());
alter table public.attendance enable row level security;
create policy attendance_scoped_read on public.attendance for select to authenticated using(private.is_admin() or private.teacher_can_access_class(class_id) or exists(select 1 from public.students s where s.id=student_id and s.profile_id=(select auth.uid())) or exists(select 1 from public.parent_students ps join public.parents p on p.id=ps.parent_id where ps.student_id=attendance.student_id and p.profile_id=(select auth.uid())));
create policy attendance_teacher_write on public.attendance for all to authenticated using(private.is_admin() or (private.teacher_can_access_class(class_id) and teacher_id in(select t.id from public.teachers t where t.profile_id=(select auth.uid())))) with check(private.is_admin() or (private.teacher_can_access_class(class_id) and teacher_id in(select t.id from public.teachers t where t.profile_id=(select auth.uid()))));

alter table public.timetables enable row level security;
create policy timetable_scoped_read on public.timetables for select to authenticated using(private.is_admin() or private.teacher_can_access_class(class_id) or private.student_can_access_class(class_id) or private.parent_can_access_class(class_id));
create policy timetable_admin_write on public.timetables for all to authenticated using(private.is_admin()) with check(private.is_admin());
alter table public.assignments enable row level security;
create policy assignments_scoped_read on public.assignments for select to authenticated using(private.is_admin() or private.teacher_can_access_class(class_id) or private.student_can_access_class(class_id) or private.parent_can_access_class(class_id));
create policy assignments_teacher_write on public.assignments for all to authenticated using(private.is_admin() or (private.teacher_can_access_class(class_id) and teacher_id in(select t.id from public.teachers t where t.profile_id=(select auth.uid())))) with check(private.is_admin() or (private.teacher_can_access_class(class_id) and teacher_id in(select t.id from public.teachers t where t.profile_id=(select auth.uid()))));
alter table public.assignment_submissions enable row level security;
create policy submissions_scoped on public.assignment_submissions for select to authenticated using(private.is_admin() or exists(select 1 from public.students s where s.id=student_id and s.profile_id=(select auth.uid())) or exists(select 1 from public.parent_students ps join public.parents p on p.id=ps.parent_id where ps.student_id=assignment_submissions.student_id and p.profile_id=(select auth.uid())) or exists(select 1 from public.assignments a where a.id=assignment_id and private.teacher_can_access_class(a.class_id)));
create policy submissions_student_write on public.assignment_submissions for insert to authenticated with check(exists(select 1 from public.students s where s.id=student_id and s.profile_id=(select auth.uid())) and status in('pending','submitted','late'));
create policy submissions_teacher_update on public.assignment_submissions for update to authenticated using(private.is_admin() or exists(select 1 from public.assignments a where a.id=assignment_id and private.teacher_can_access_class(a.class_id))) with check(private.is_admin() or exists(select 1 from public.assignments a where a.id=assignment_id and private.teacher_can_access_class(a.class_id)));
alter table public.exams enable row level security;
create policy exams_scoped_read on public.exams for select to authenticated using(private.is_admin() or private.teacher_can_access_class(class_id) or ((published) and (private.student_can_access_class(class_id) or private.parent_can_access_class(class_id))));
create policy exams_teacher_write on public.exams for all to authenticated using(private.is_admin() or (private.teacher_can_access_class(class_id) and teacher_id in(select t.id from public.teachers t where t.profile_id=(select auth.uid())))) with check(private.is_admin() or (private.teacher_can_access_class(class_id) and teacher_id in(select t.id from public.teachers t where t.profile_id=(select auth.uid()))));
alter table public.exam_results enable row level security;
create policy results_scoped_read on public.exam_results for select to authenticated using(private.is_admin() or exists(select 1 from public.exams e where e.id=exam_id and private.teacher_can_access_class(e.class_id)) or (exists(select 1 from public.exams e where e.id=exam_id and e.published) and (exists(select 1 from public.students s where s.id=student_id and s.profile_id=(select auth.uid())) or exists(select 1 from public.parent_students ps join public.parents p on p.id=ps.parent_id where ps.student_id=exam_results.student_id and p.profile_id=(select auth.uid())))));
create policy results_teacher_write on public.exam_results for all to authenticated using(private.is_admin() or exists(select 1 from public.exams e where e.id=exam_id and private.teacher_can_access_class(e.class_id))) with check(private.is_admin() or exists(select 1 from public.exams e where e.id=exam_id and private.teacher_can_access_class(e.class_id)));
alter table public.announcements enable row level security;
create policy announcements_read on public.announcements for select to authenticated using(private.is_admin() or (published_at is not null and (class_id is null or private.student_can_access_class(class_id) or private.parent_can_access_class(class_id) or private.teacher_can_access_class(class_id))));
create policy announcements_write on public.announcements for all to authenticated using(private.is_admin() or (author_id=(select auth.uid()) and private.current_role()='teacher' and (class_id is null or private.teacher_can_access_class(class_id)))) with check(private.is_admin() or (author_id=(select auth.uid()) and private.current_role()='teacher' and (class_id is null or private.teacher_can_access_class(class_id))));
alter table public.notifications enable row level security;
create policy notifications_self_read on public.notifications for select to authenticated using(user_id=(select auth.uid()) or private.is_admin());
create policy notifications_self_update on public.notifications for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
alter table public.school_fees enable row level security;
create policy fees_scoped_read on public.school_fees for select to authenticated using(private.is_admin() or exists(select 1 from public.students s where s.id=student_id and s.profile_id=(select auth.uid())) or exists(select 1 from public.parent_students ps join public.parents p on p.id=ps.parent_id where ps.student_id=school_fees.student_id and p.profile_id=(select auth.uid())));
create policy fees_admin_write on public.school_fees for all to authenticated using(private.is_admin()) with check(private.is_admin());
alter table public.payment_records enable row level security;
create policy payments_scoped_read on public.payment_records for select to authenticated using(private.is_admin() or exists(select 1 from public.school_fees f join public.students s on s.id=f.student_id where f.id=fee_id and s.profile_id=(select auth.uid())) or exists(select 1 from public.school_fees f join public.parent_students ps on ps.student_id=f.student_id join public.parents p on p.id=ps.parent_id where f.id=fee_id and p.profile_id=(select auth.uid())));
create policy payments_admin_write on public.payment_records for all to authenticated using(private.is_admin()) with check(private.is_admin());
alter table public.messages enable row level security;
create policy messages_participant_read on public.messages for select to authenticated using(private.is_admin() or sender_id=(select auth.uid()) or recipient_id=(select auth.uid()));
create policy messages_sender_insert on public.messages for insert to authenticated with check(sender_id=(select auth.uid()) and (recipient_id=(select auth.uid()) or private.is_admin() or private.current_role() in('teacher','parent')));

alter table public.learning_materials enable row level security;
create policy materials_scoped_read on public.learning_materials for select to authenticated using(private.is_admin() or (private.teacher_can_access_class(class_id) and teacher_id in(select t.id from public.teachers t where t.profile_id=(select auth.uid()))) or private.can_view_material(id));
create policy materials_teacher_insert on public.learning_materials for insert to authenticated with check(private.is_admin() or (teacher_id in(select a.teacher_id from public.teacher_class_subjects a join public.teachers t on t.id=a.teacher_id where a.class_id=learning_materials.class_id and a.subject_id=learning_materials.subject_id and t.profile_id=(select auth.uid()))));
create policy materials_teacher_update on public.learning_materials for update to authenticated using(private.is_admin() or (teacher_id in(select t.id from public.teachers t where t.profile_id=(select auth.uid())) and private.teacher_can_access_class(class_id))) with check(private.is_admin() or (teacher_id in(select a.teacher_id from public.teacher_class_subjects a join public.teachers t on t.id=a.teacher_id where a.class_id=learning_materials.class_id and a.subject_id=learning_materials.subject_id and t.profile_id=(select auth.uid()))));
create policy materials_teacher_delete on public.learning_materials for delete to authenticated using(private.is_admin() or (teacher_id in(select t.id from public.teachers t where t.profile_id=(select auth.uid())) and private.teacher_can_access_class(class_id)));

-- Private Storage bucket: max file size 50 MiB, common school formats only.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
('learning-materials','learning-materials',false,52428800,array['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.ms-powerpoint','application/vnd.openxmlformats-officedocument.presentationml.presentation','application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','image/jpeg','image/png','text/plain','application/zip','application/x-zip-compressed'])
on conflict (id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
create policy materials_storage_read on storage.objects for select to authenticated using(bucket_id='learning-materials' and exists(select 1 from public.learning_materials m where m.storage_path=name and private.can_view_material(m.id)));
create policy materials_storage_teacher_upload on storage.objects for insert to authenticated with check(bucket_id='learning-materials' and (private.is_admin() or (split_part(name,'/',1) ~* '^[0-9a-f-]{36}$' and private.teacher_can_access_class(split_part(name,'/',1)::uuid))));
create policy materials_storage_teacher_update on storage.objects for update to authenticated using(bucket_id='learning-materials' and (private.is_admin() or exists(select 1 from public.learning_materials m where m.storage_path=name and m.teacher_id in(select t.id from public.teachers t where t.profile_id=(select auth.uid()))))) with check(bucket_id='learning-materials' and private.is_admin());
create policy materials_storage_teacher_delete on storage.objects for delete to authenticated using(bucket_id='learning-materials' and (private.is_admin() or exists(select 1 from public.learning_materials m where m.storage_path=name and m.teacher_id in(select t.id from public.teachers t where t.profile_id=(select auth.uid())))));

-- Material publication creates one in-app notice for class students and their linked parents.
create or replace function private.notify_material_audience() returns trigger
language plpgsql security definer set search_path = '' as $$
declare subject_name text;
begin
  if new.is_published and (tg_op='INSERT' or not old.is_published) then
    select s.name into subject_name from public.subjects s where s.id=new.subject_id;
    insert into public.notifications(user_id,title,body,href,material_id)
      select distinct p.id, 'New learning material', new.title || ' · ' || coalesce(subject_name,'Subject'), '/learning-materials/' || new.id, new.id
      from public.students st join public.profiles p on p.id=st.profile_id
      where st.class_id=new.class_id and (new.student_id is null or new.student_id=st.id)
      union
      select distinct pp.id, 'New learning material', new.title || ' · ' || coalesce(subject_name,'Subject'), '/learning-materials/' || new.id, new.id
      from public.parent_students ps join public.parents pr on pr.id=ps.parent_id join public.profiles pp on pp.id=pr.profile_id
      join public.students st on st.id=ps.student_id where st.class_id=new.class_id and (new.student_id is null or new.student_id=st.id)
    on conflict do nothing;
  end if;
  return new;
end $$;
create trigger learning_material_publish_notice after insert or update of is_published on public.learning_materials for each row execute function private.notify_material_audience();
revoke execute on function private.notify_material_audience() from public, anon, authenticated;

-- Only the trusted project owner should grant the initial admin role. Create the Auth user first,
-- then run: update public.profiles set role='admin' where id=(select id from auth.users where email='OWNER_EMAIL');
