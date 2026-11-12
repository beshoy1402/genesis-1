'use client';

import { useState, type FormEvent } from 'react';
import { createClient } from '@/lib/supabase/client';
import { LoaderCircle, MailCheck } from 'lucide-react';

export function ResetPasswordForm() {
  const [done, setDone] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('');
    const email = String(new FormData(event.currentTarget).get('email') || '').trim();
    const { error: requestError } = await createClient().auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/auth/callback?next=/update-password` });
    setBusy(false);
    if (requestError) setError('We couldn’t send the reset link right now. Please contact the school office.'); else setDone(true);
  }
  if (done) return <div className="success-card"><MailCheck size={23}/><div><strong>Check your inbox</strong><p>If that address is registered, a secure reset link is on its way.</p></div></div>;
  return <form className="auth-form" onSubmit={submit}><label htmlFor="reset-email">School email</label><input id="reset-email" name="email" type="email" autoComplete="email" required placeholder="name@school.edu"/>{error && <div className="form-error">{error}</div>}<button className="submit-button" disabled={busy}>{busy ? <><LoaderCircle size={17} className="spin"/> Sending…</> : 'Send reset link'}</button></form>;
}
