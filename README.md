# GENESIS INTERNATIONAL SCHOOL portal

Next.js, React, TypeScript, and Supabase portal foundation for students, parents, teachers, and administrators. The public landing page comes first; all roles use one sign-in flow and are routed from the trusted `profiles.role` value.

## Supabase project

The Supabase project has been created in the `genesis org test1` organization, in Frankfurt (`eu-central-1`). Its project ref is `fdcfoeupbjqtkidkchpa`.

### Configure a local environment

Copy `.env.example` to `.env.local` and set the project URL and publishable key. These are the only browser configuration values required:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Never place a Supabase secret or service-role key in a `NEXT_PUBLIC_` variable or browser bundle. The checked-out workspace has a local `.env.local` for this project; it is ignored by Git.

### Apply the database migration

`supabase/migrations/` contains the relational school records, private Storage bucket, role helpers, RLS policies, material access policies, teacher display-name access, class/subject-scoped teacher workflows, student/class integrity guards, publication notifications, and the additional `developer` enum value present in the connected project. The nine checked-in migrations match the migration history currently applied to the created Supabase project. The `developer` role is reserved and is not one of the four school dashboard roles.

For another project, run the migration from the Supabase SQL Editor as the project owner, or install the Supabase CLI and link the project before pushing migrations. Verify the schema, migration history, and Storage bucket afterward. Do not apply this initial migration a second time to the existing project.

### Set up the first administrator

1. In Supabase Authentication, create the trusted school-owner account and confirm its email.
2. In the SQL Editor, run the following statement after replacing the email with that exact account address:

   ```sql
   insert into public.profiles (id, role, full_name, is_active)
   select id, 'admin', 'School Administrator', true
   from auth.users where email = 'owner@school.example'
   on conflict (id) do update set role = 'admin', is_active = true;
   ```

3. For each other account, create the Auth user from the trusted Supabase dashboard, then insert its `profiles` row and matching student, parent, or teacher record. Add parent-child and teacher-class-subject links through the admin tools or trusted SQL.

The public application has no sign-up flow. Ordinary users cannot create accounts or grant themselves roles. Keep the SQL Editor owner account restricted to trusted operators.

## Run locally

Install dependencies with `pnpm install`, then start the app with `pnpm dev`. Use `pnpm typecheck` and `pnpm build` before deployment.

## Current scope

- Public cinematic landing page with animated waves, floating Genesis monogram, exact school name, entrance reveal, portal link, and reduced-motion support.
- One email-and-password Supabase login and password-recovery flow; server role routing and per-role protected pages.
- Four dashboards with role-specific navigation, Supabase-backed summary counts, school announcements, notifications, mobile navigation, and sign-out.
- Private learning-material uploads for assigned classes/subjects, folders, file validation up to 50 MB, draft or immediate publishing, title/description edits, replacement and deletion, signed downloads, and database notifications to enrolled students and their linked parents.
- PostgreSQL tables and RLS for profiles, role records, classes, enrollments, subjects, assignments, grades and history, attendance, timetable, exams/results, announcements, notifications, fees/payments, messages, and learning materials.
- Basic administrator actions for creating classes and subjects and publishing school announcements.

## Current limitations

- Login uses school email and password. Although profiles can store a username, username aliases are not enabled because a safe username lookup requires a trusted server-side identity flow.
- User invitations, parent/child linking, teacher assignments, bulk imports, full grade/attendance/fee CRUD screens, charts, message threads, and admin account lifecycle tools still need implementation.
- No sample school accounts or records are created. Authentication, role routing between real accounts, file upload/download, and cross-role authorization tests require provisioned users and linked school data.
- Deployment is not configured or claimed. Set the production environment variables and Supabase Auth redirect URLs after choosing a host/domain.
