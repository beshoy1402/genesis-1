import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...cors, "Content-Type": "application/json" },
});

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);
  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anonKey || !serviceKey) return json({ error: "Server configuration is incomplete." }, 500);
  try {
    const body = await req.json();
    const username = typeof body.username === "string" ? body.username.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (!/^[a-z0-9._-]{3,40}$/.test(username) || !password) {
      return json({ error: "Invalid sign-in details." }, 400);
    }
    const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const userClient = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: profile } = await admin.from("profiles").select("id,is_active").eq("username", username).maybeSingle();
    if (!profile || profile.is_active !== true) return json({ error: "Invalid sign-in details." }, 401);
    const { data: authUser, error: lookupError } = await admin.auth.admin.getUserById(profile.id);
    if (lookupError || !authUser.user?.email) return json({ error: "Invalid sign-in details." }, 401);
    const { data, error } = await userClient.auth.signInWithPassword({ email: authUser.user.email, password });
    if (error || !data.session) return json({ error: "Invalid sign-in details." }, 401);
    return json({ session: data.session });
  } catch {
    return json({ error: "Invalid sign-in details." }, 400);
  }
});
