import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const claims = claimsData?.claims;
  if (!claims?.sub) return NextResponse.redirect(new URL('/login', request.url));
  const { data: material } = await supabase.from('learning_materials').select('storage_path').eq('id',id).maybeSingle();
  if (!material) return new NextResponse('This learning material is unavailable for your account.',{status:404});
  const { data, error } = await supabase.storage.from('learning-materials').createSignedUrl(material.storage_path,60);
  if (error || !data?.signedUrl) return new NextResponse('This file is unavailable for your account.',{status:403});
  return NextResponse.redirect(data.signedUrl);
}
