import { LoginForm } from '@/components/LoginForm';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function LoginPage() {
  return <main className="login-page">
    <div className="login-image-panel"><div className="login-image-grain"/><Link href="/" className="back-home"><ArrowLeft size={16}/> Back to school</Link>
      <div className="login-brand"><div className="brand-mark">G<span>.</span></div><p className="eyebrow">GENESIS INTERNATIONAL SCHOOL</p><h1>Every day is a beginning.</h1><p>One school. One community. A future full of possibility.</p></div>
      <span className="login-panel-footer">EXCELLENCE · KNOWLEDGE · FUTURE</span>
    </div>
    <section className="login-form-panel"><div className="login-form-inner">
      <div className="mobile-brand"><div className="brand-mark">G<span>.</span></div><span>GENESIS</span></div>
      <p className="eyebrow">YOUR SCHOOL, CONNECTED</p><h2>Welcome back</h2><p className="muted">Sign in with your school email or username to continue.</p>
      <LoginForm />
      <p className="login-help">Need help accessing your account? <a href="mailto:portal@genesis.edu">Contact the school office</a></p>
    </div></section>
  </main>;
}
