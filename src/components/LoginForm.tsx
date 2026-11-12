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
    const identifier = String(form.get('identifier') || '').trim();
    const password = String(form.get('password') || '');
    try {
      const supabase = createClient();
      if (identifier.includes('@')) {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email: identifier.toLowerCase(), password });
        if (signInError) throw signInError;
      } else {
        const { data, error: usernameError } = await supabase.functions.invoke('username-login', { body: { username: identifier, password } });
        if (usernameError || data?.error || !data?.session) throw new Error('Invalid sign-in details.');
        const { error: sessionError } = await supabase.auth.setSession(data.session);
        if (sessionError) throw sessionError;
      }
      window.location.assign('/portal');
    } catch (cause) {
      setError('We couldn’t sign you in. Check your email or username and password, then try again.');
      setLoading(false);
    }
  }

  return <form className="auth-form" onSubmit={handleSubmit}>
    <label htmlFor="identifier">School email or username</label><input id="identifier" name="identifier" autoComplete="username" required placeholder="name@school.edu or username" />
    <div className="password-label"><label htmlFor="password">Password</label><Link href="/forgot-password">Forgot password?</Link></div>
    <div className="password-wrap"><input id="password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" required placeholder="Enter your password"/><button type="button" className="password-toggle" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}</button></div>
    {error && <div className="form-error" role="alert">{error}</div>}
    <button className="submit-button" type="submit" disabled={loading}>{loading ? <><LoaderCircle size={17} className="spin"/> Signing in…</> : <>Sign in securely <ArrowRight size={17}/></>}</button>
    <p className="form-privacy">Your school account is protected with secure authentication.</p>
  </form>;
}
