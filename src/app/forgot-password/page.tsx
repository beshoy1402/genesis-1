import Link from 'next/link';
import { ResetPasswordForm } from '@/components/ResetPasswordForm';
import { ArrowLeft } from 'lucide-react';

export default function ForgotPasswordPage() {
  return <main className="simple-auth"><Link href="/login" className="back-home"><ArrowLeft size={16}/> Back to sign in</Link><div className="simple-auth-card"><div className="brand-mark">G<span>.</span></div><p className="eyebrow">ACCOUNT RECOVERY</p><h1>Reset your password</h1><p className="muted">Enter your school email and we’ll send you a secure reset link.</p><ResetPasswordForm/></div></main>;
}
