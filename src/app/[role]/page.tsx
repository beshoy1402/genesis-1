import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isRole, roleRoutes, type Role } from '@/lib/roles';
import { PortalDashboard } from '@/components/PortalDashboard';

export const dynamic = 'force-dynamic';

export default async function RolePage({ params }: { params: Promise<{ role: string }> }) {
  const { role: requested } = await params;
  if (!isRole(requested)) notFound();
  const role = requested as Role;
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) redirect('/login');
  const { data: profile } = await supabase.from('profiles').select('id,role,full_name,is_active').eq('id', claims.sub).maybeSingle();
  if (!profile?.is_active || !isRole(profile.role)) redirect('/login?error=account');
  if (profile.role !== role) redirect(roleRoutes[profile.role]);
  return <PortalDashboard role={role} name={profile.full_name || 'School member'} />;
}
