'use client';

import { useState, type FormEvent } from 'react';
import { Eye, EyeOff, LoaderCircle, ArrowRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

export function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setLoading(true);
    const form = new FormData(event.currentTarget);
    const email = String(form.get('email') || '').trim();
    const password = String(form.get('password') || '');
    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) throw signInError;
      window.location.assign('/portal');
    } catch (cause) {
      setError(cause instanceof Error ? 'We couldn’t sign you in. Check your school email and password, then try again.' : 'Sign in is unavailable. Please try again shortly.');
      setLoading(false);
    }
  }

  return <form className="auth-form" onSubmit={handleSubmit}>
    <label htmlFor="email">School email</label><input id="email" name="email" type="email" autoComplete="username" required placeholder="name@school.edu" />
    <div className="password-label"><label htmlFor="password">Password</label><Link href="/forgot-password">Forgot password?</Link></div>
    <div className="password-wrap"><input id="password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" required placeholder="Enter your password"/><button type="button" className="password-toggle" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}</button></div>
    {error && <div className="form-error" role="alert">{error}</div>}
    <button className="submit-button" type="submit" disabled={loading}>{loading ? <><LoaderCircle size={17} className="spin"/> Signing in…</> : <>Sign in securely <ArrowRight size={17}/></>}</button>
    <p className="form-privacy">Your school account is protected with secure authentication.</p>
  </form>;
}
