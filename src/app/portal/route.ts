import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isRole, roleRoutes } from '@/lib/roles';

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return NextResponse.redirect(new URL('/login', request.url));
  const { data: profile } = await supabase.from('profiles').select('role,is_active').eq('id', claims.sub).maybeSingle();
  if (!profile?.is_active || !isRole(profile.role)) {
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL('/login?error=account', request.url));
  }
  return NextResponse.redirect(new URL(roleRoutes[profile.role], request.url));
}
