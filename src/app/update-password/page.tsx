import Link from 'next/link';
import { UpdatePasswordForm } from '@/components/UpdatePasswordForm';
import { ArrowLeft } from 'lucide-react';

export default function UpdatePasswordPage() {
  return <main className="simple-auth"><Link href="/login" className="back-home"><ArrowLeft size={16}/> Back to sign in</Link><div className="simple-auth-card"><div className="brand-mark">G<span>.</span></div><p className="eyebrow">ACCOUNT RECOVERY</p><h1>Choose a new password</h1><p className="muted">Set a secure password for your school account.</p><UpdatePasswordForm/></div></main>;
}
