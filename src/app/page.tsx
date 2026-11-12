import Link from 'next/link';
import { ArrowDown, ArrowRight } from 'lucide-react';

export default function Home() {
  return <main className="landing">
    <div className="landing-top"><div className="brand-mark small-mark">G<span>.</span></div><Link href="/login" className="top-login">Portal login <ArrowRight size={15}/></Link></div>
    <div className="wave-field" aria-hidden="true"><svg className="waves" viewBox="0 0 1440 500" preserveAspectRatio="none">
      <path className="wave wave-one" d="M0 250 C220 130 330 370 570 250 S920 130 1140 250 1320 340 1440 250 V500 H0Z"/>
      <path className="wave wave-two" d="M0 290 C220 410 380 170 620 290 S1000 410 1220 290 1370 190 1440 290 V500 H0Z"/>
      <path className="wave wave-three" d="M0 340 C260 250 420 430 680 340 S1020 250 1260 340 1380 410 1440 340 V500 H0Z"/>
    </svg></div>
    <section className="hero-content">
      <div className="crest-wrap"><div className="crest-halo"/><div className="brand-mark crest">G<span>.</span></div><div className="crest-caption">G · I · S</div></div>
      <p className="eyebrow reveal reveal-1">A place to become</p>
      <h1 className="school-title"><span className="genesis-word">GENESIS</span><span className="school-subtitle">INTERNATIONAL SCHOOL</span></h1>
      <p className="welcome reveal reveal-3">Welcome to a world of possibility.</p>
      <p className="tagline reveal reveal-4">Excellence. Knowledge. Future.</p>
      <Link href="/login" className="enter-button reveal reveal-5">ENTER PORTAL <ArrowRight size={17}/></Link>
    </section>
    <div className="scroll-note"><span>Discover your school</span><ArrowDown size={14}/></div>
    <footer className="landing-foot"><span>GENESIS INTERNATIONAL SCHOOL</span><span>Learning without limits</span></footer>
  </main>;
}
