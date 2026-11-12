import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const fail = (message: string, status = 400) => json({ error: message }, status);

function text(value: unknown, max = 160): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return fail("Method not allowed.", 405);

  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) return fail("Sign in is required.", 401);

  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anonKey || !serviceKey) return fail("Server configuration is incomplete.", 500);

  const userClient = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: authData, error: authError } = await userClient.auth.getUser(token);
  if (authError || !authData.user) return fail("Your session is invalid or expired.", 401);

  const { data: actor, error: actorError } = await admin
    .from("profiles").select("role,is_active").eq("id", authData.user.id).maybeSingle();
  if (actorError || actor?.role !== "developer" || actor?.is_active !== true) {
    return fail("Developer permission is required.", 403);
  }

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return fail("Invalid request body."); }
  const action = text(body.action, 50);

  try {
    if (action === "list") {
      const [
        { data: profiles, error: profileError },
        { data: authUsers, error: usersError },
        { data: classes, error: classError },
        { data: subjects, error: subjectError },
        { data: teachers, error: teacherError },
        { data: students, error: studentError },
        { data: teacherLinks, error: linksError },
      ] = await Promise.all([
        admin.from("profiles").select("id,role,username,full_name,is_active,created_at").order("created_at", { ascending: false }).limit(1000),
        admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
        admin.from("school_classes").select("id,name,grade_level,academic_year,room").order("name"),
        admin.from("subjects").select("id,name,code").order("name"),
        admin.from("teachers").select("id,profile_id,employee_number,department"),
        admin.from("students").select("id,profile_id,admission_number,date_of_birth,class_id"),
        admin.from("teacher_class_subjects").select("id,teacher_id,class_id,subject_id"),
      ]);
      const issue = profileError || usersError || classError || subjectError || teacherError || studentError || linksError;
      if (issue) return fail(issue.message || "Could not load management data.", 500);
      const emails = new Map((authUsers?.users || []).map((u) => [u.id, u.email || ""]));
      const names = new Map((profiles || []).map((p) => [p.id, p.full_name]));
      return json({
        accounts: (profiles || []).map((p) => ({ ...p, email: emails.get(p.id) || "" })),
        classes: classes || [],
        subjects: subjects || [],
        teachers: (teachers || []).map((t) => ({ ...t, full_name: names.get(t.profile_id) || "", email: emails.get(t.profile_id) || "", is_active: (profiles || []).find((p) => p.id === t.profile_id)?.is_active ?? false })),
        students: (students || []).map((s) => ({ ...s, full_name: names.get(s.profile_id) || "", email: emails.get(s.profile_id) || "", is_active: (profiles || []).find((p) => p.id === s.profile_id)?.is_active ?? false })),
        teacherLinks: teacherLinks || [],
      });
    }

    if (action === "create_class") {
      const name = text(body.name, 100), grade_level = text(body.grade_level, 60), academic_year = text(body.academic_year, 30), room = text(body.room, 40);
      if (!name || !grade_level || !academic_year) return fail("Class name, grade level, and academic year are required.");
      const { data, error } = await admin.from("school_classes")
        .insert({ name, grade_level, academic_year, room: room || null })
        .select("id,name,grade_level,academic_year,room").single();
      return error ? fail(error.message, 400) : json({ class: data });
    }

    if (action === "update_class") {
      const id = text(body.id, 80), name = text(body.name, 100), grade_level = text(body.grade_level, 60), academic_year = text(body.academic_year, 30), room = text(body.room, 40);
      if (!id || !name || !grade_level || !academic_year) return fail("Complete all required class fields.");
      const { data, error } = await admin.from("school_classes").update({ name, grade_level, academic_year, room: room || null })
        .eq("id", id).select("id,name,grade_level,academic_year,room").maybeSingle();
      return error ? fail(error.message) : !data ? fail("Class not found.", 404) : json({ class: data });
    }

    if (action === "delete_class") {
      const id = text(body.id, 80);
      if (!id) return fail("Class ID is required.");
      const refs = ["students","teacher_class_subjects","grades","attendance","timetables","assignments","exams","announcements","learning_materials"];
      const checks = await Promise.all(refs.map(async (table) => {
        const { count, error } = await admin.from(table).select("id", { count: "exact", head: true }).eq("class_id", id);
        return { table, count: count || 0, error };
      }));
      const failed = checks.find((item) => item.error);
      if (failed) return fail(`Could not verify linked records in ${failed.table}.`, 500);
      const linked = checks.filter((item) => item.count > 0);
      if (linked.length) return fail(`This class has linked records (${linked.map((x) => `${x.table}: ${x.count}`).join(", ")}). Reassign or remove those records before deleting the class.`, 409);
      const { error } = await admin.from("school_classes").delete().eq("id", id);
      return error ? fail(error.message, 409) : json({ success: true });
    }

    if (action === "create_account") {
      const email = text(body.email, 254).toLowerCase();
      const full_name = text(body.full_name, 120);
      const role = text(body.role, 20);
      const admission_number = text(body.admission_number, 60);
      const username = text(body.username, 40).toLowerCase();
      const password = typeof body.password === "string" ? body.password : "";
      const employee_number = text(body.employee_number, 60);
      const department = text(body.department, 100);
      const class_id = text(body.class_id, 80);
      const subject_id = text(body.subject_id, 80);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !full_name) return fail("Enter a valid email and full name.");
      if (role !== "student" && role !== "teacher") return fail("Only student and teacher accounts can be created here.");
      if (role === "student" && !admission_number) return fail("Admission number is required for students.");
      if (role === "teacher" && Boolean(class_id) !== Boolean(subject_id)) return fail("Choose both a class and a subject, or leave both empty.");

      const { data: existingUsername } = await admin.from("profiles").select("id").eq("username", username).maybeSingle();
      if (existingUsername) return fail("That username is already in use. Choose another one.", 409);
      const { data: created, error: createError } = await admin.auth.admin.createUser({
        email, password, email_confirm: true, user_metadata: { full_name },
      });
      if (createError || !created.user) return fail(createError?.message || "Could not create the account.", 400);
      const userId = created.user.id;
      const { error: profileError } = await admin.from("profiles").insert({ id: userId, role, full_name, username, is_active: true });
      if (profileError) {
        await admin.auth.admin.deleteUser(userId);
        return fail(profileError.message, 400);
      }
      let detailError: { message: string } | null = null;
      if (role === "student") {
        const { error } = await admin.from("students").insert({
          profile_id: userId, admission_number, class_id: class_id || null,
          date_of_birth: text(body.date_of_birth, 20) || null,
        });
        detailError = error;
      } else {
        const { data: teacher, error } = await admin.from("teachers").insert({
          profile_id: userId, employee_number: employee_number || null, department: department || null,
        }).select("id").single();
        detailError = error;
        if (!error && teacher && class_id && subject_id) {
          const { error: assignmentError } = await admin.from("teacher_class_subjects").insert({
            teacher_id: teacher.id, class_id, subject_id,
          });
          detailError = assignmentError;
        }
      }
      if (detailError) {
        await admin.from("profiles").delete().eq("id", userId);
        await admin.auth.admin.deleteUser(userId);
        return fail(detailError.message, 400);
      }
      return json({ success: true, message: `${role === "teacher" ? "Teacher" : "Student"} account created for ${full_name}. They can sign in using their email or username.` });
    }

    if (action === "assign_student_class") {
      const student_id = text(body.student_id, 80), class_id = text(body.class_id, 80);
      if (!student_id) return fail("Student is required.");
      const { error } = await admin.from("students").update({ class_id: class_id || null }).eq("id", student_id);
      return error ? fail(error.message) : json({ success: true });
    }

    if (action === "assign_teacher") {
      const teacher_id = text(body.teacher_id, 80), class_id = text(body.class_id, 80), subject_id = text(body.subject_id, 80);
      if (!teacher_id || !class_id || !subject_id) return fail("Teacher, class, and subject are required.");
      const { error } = await admin.from("teacher_class_subjects").upsert({ teacher_id, class_id, subject_id }, { onConflict: "teacher_id,class_id,subject_id", ignoreDuplicates: true });
      return error ? fail(error.message) : json({ success: true });
    }

    if (action === "remove_teacher_assignment") {
      const id = text(body.id, 80);
      if (!id) return fail("Assignment ID is required.");
      const { error } = await admin.from("teacher_class_subjects").delete().eq("id", id);
      return error ? fail(error.message) : json({ success: true });
    }

    if (action === "set_account") {
      const id = text(body.id, 80);
      const role = text(body.role, 20);
      const is_active = body.is_active;
      if (!id) return fail("Account ID is required.");
      if (id === authData.user.id) return fail("You cannot change your own developer account here.", 403);
      if (!["student","parent","teacher","admin"].includes(role) || typeof is_active !== "boolean") return fail("Invalid role or account status.");
      const { data: target } = await admin.from("profiles").select("role").eq("id", id).maybeSingle();
      if (!target || target.role === "developer") return fail("Developer accounts cannot be modified from this screen.", 403);
      const { error } = await admin.from("profiles").update({ role, is_active }).eq("id", id);
      if (error) return fail(error.message);
      if (role === "teacher") {
        const { data: existing } = await admin.from("teachers").select("id").eq("profile_id", id).maybeSingle();
        if (!existing) {
          const { error: detailError } = await admin.from("teachers").insert({ profile_id: id });
          if (detailError) return fail("Role updated, but teacher profile setup failed: " + detailError.message, 500);
        }
      } else if (role === "student") {
        const { data: existing } = await admin.from("students").select("id").eq("profile_id", id).maybeSingle();
        if (!existing) {
          const { error: detailError } = await admin.from("students").insert({ profile_id: id, admission_number: "GEN-" + id.replaceAll("-", "").slice(0, 10).toUpperCase() });
          if (detailError) return fail("Role updated, but student profile setup failed: " + detailError.message, 500);
        }
      } else if (role === "parent") {
        const { data: existing } = await admin.from("parents").select("id").eq("profile_id", id).maybeSingle();
        if (!existing) {
          const { error: detailError } = await admin.from("parents").insert({ profile_id: id });
          if (detailError) return fail("Role updated, but parent profile setup failed: " + detailError.message, 500);
        }
      }
      return json({ success: true });
    }

    if (action === "remove_member") {
      const id = text(body.id, 80);
      const role = text(body.role, 20);
      if (!id || !["student","teacher"].includes(role)) return fail("Invalid member.");
      const { data: target } = await admin.from("profiles").select("role").eq("id", id).maybeSingle();
      if (!target || target.role !== role) return fail("Account not found for that role.", 404);
      const { error } = await admin.from("profiles").update({ is_active: false }).eq("id", id);
      return error ? fail(error.message) : json({ success: true, message: "Account deactivated. Academic records were preserved." });
    }

    if (action === "set_password") {
      const id = text(body.id, 80);
      const password = typeof body.password === "string" ? body.password : "";
      if (!id) return fail("Choose an account first.");
      if (id === authData.user.id) return fail("You cannot change your own developer password here.", 403);
      if (password.length < 8 || password.length > 72) return fail("Password must be between 8 and 72 characters.");
      const { data: target, error: targetError } = await admin.from("profiles").select("role").eq("id", id).maybeSingle();
      if (targetError || !target) return fail("Account not found.", 404);
      if (target.role === "developer") return fail("Developer passwords cannot be changed from this screen.", 403);
      const { error } = await admin.auth.admin.updateUserById(id, { password });
      return error ? fail(error.message) : json({ success: true, message: "Password updated. The user can keep using this password." });
    }

    if (action === "password_reset") {
      const id = text(body.id, 80);
      const { data: target, error: targetError } = await admin.from("profiles").select("id").eq("id", id).maybeSingle();
      if (targetError || !target) return fail("Account not found.", 404);
      const { data: authUser, error: userError } = await admin.auth.admin.getUserById(id);
      if (userError || !authUser.user?.email) return fail("No email address is available for this account.", 400);
      const { error } = await admin.auth.resetPasswordForEmail(authUser.user.email, { redirectTo: "https://genesis-international-school-pi.vercel.app/auth/callback?next=/update-password" });
      return error ? fail(error.message) : json({ success: true, message: "Password reset email requested. The existing password is never displayed." });
    }

    return fail("Unknown management action.");
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Unexpected server error.", 500);
  }
});