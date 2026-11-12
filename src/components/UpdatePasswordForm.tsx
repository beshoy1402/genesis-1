'use client';

import { useState, type FormEvent } from 'react';
import { createClient } from '@/lib/supabase/client';
import { LoaderCircle } from 'lucide-react';
import Link from 'next/link';

export function UpdatePasswordForm() {
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [done, setDone] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('');
    const password = String(new FormData(event.currentTarget).get('password') || '');
    const { error: updateError } = await createClient().auth.updateUser({ password });
    setBusy(false); if (updateError) setError('The reset link may have expired. Request a new one and try again.'); else setDone(true);
  }
  if (done) return <div className="success-card"><strong>Password updated</strong><p>You can now sign in with your new password.</p><Link href="/login">Return to sign in →</Link></div>;
  return <form className="auth-form" onSubmit={submit}><label htmlFor="new-password">New password</label><input id="new-password" name="password" type="password" minLength={8} autoComplete="new-password" required placeholder="At least 8 characters"/>{error && <div className="form-error">{error}</div>}<button className="submit-button" disabled={busy}>{busy ? <><LoaderCircle size={17} className="spin"/> Saving…</> : 'Set new password'}</button></form>;
}
