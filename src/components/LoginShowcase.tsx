import { Code2, FileText, Sparkles } from 'lucide-react';
import BrandLogo from './BrandLogo';

export default function LoginShowcase() {
  return (
    <section className="login-showcase relative hidden min-h-screen overflow-hidden md:flex md:w-[54%] md:flex-col">
      <div className="showcase-grid" aria-hidden="true" />
      <div className="showcase-glow showcase-glow-cyan" aria-hidden="true" />
      <div className="showcase-glow showcase-glow-violet" aria-hidden="true" />

      <div className="relative z-10 px-8 pt-8">
        <BrandLogo className="justify-start" />
      </div>

      <div className="showcase-orbit-scene" aria-hidden="true">
        <div className="showcase-orbit showcase-orbit-outer" />
        <div className="showcase-orbit showcase-orbit-inner" />
        <div className="showcase-orbit-dot showcase-dot-one" />
        <div className="showcase-orbit-dot showcase-dot-two" />
        <div className="showcase-core-glow" />
        <div className="showcase-core">
          <img src="./nexnote-mark.png" alt="" />
        </div>

        <div className="showcase-card showcase-card-note">
          <div className="showcase-card-icon note-icon"><FileText size={17} /></div>
          <div><strong>A new idea</strong><span>Ready to take shape</span></div>
          <span className="showcase-live-dot" />
        </div>

        <div className="showcase-card showcase-card-code">
          <div className="showcase-code-head"><Code2 size={15} /><span>quick-note.ts</span><i /></div>
          <div className="showcase-code-line"><b>const</b> idea = <em>"something great"</em></div>
          <div className="showcase-code-line muted-code">save(idea); <span>↵</span></div>
        </div>

        <div className="showcase-float-label"><Sparkles size={14} /> Everything on your mind, in one place</div>
      </div>

      <div className="relative z-10 mt-auto max-w-xl px-10 pb-12 lg:px-14 lg:pb-16">
        <div className="showcase-eyebrow"><span /> YOUR DIGITAL WORKSPACE</div>
        <h1 className="mt-5 text-4xl font-semibold leading-tight tracking-[-0.04em] text-white lg:text-5xl">
          Capture your flow.<br />
          <span className="showcase-gradient-text">Create without limits.</span>
        </h1>
        <p className="mt-5 max-w-md text-base leading-7 text-slate-300/75">
          Notes, code, and inspiration — all in one place, ready when you are.
        </p>
      </div>
    </section>
  );
}
