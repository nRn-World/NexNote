import { Check, Cloud, Code2, FileText, Sparkles } from 'lucide-react';

export default function LoginShowcase() {
  return (
    <div className="login-showcase" aria-hidden="true">
      <div className="login-showcase__grid" />
      <div className="login-showcase__orb login-showcase__orb--cyan" />
      <div className="login-showcase__orb login-showcase__orb--violet" />
      <div className="login-showcase__orb login-showcase__orb--lime" />
      <div className="login-showcase__noise" />

      <div className="login-showcase__brand">
        <div className="login-showcase__brand-mark">
          <img src="./favicon.png" alt="" />
        </div>
        <span>NexNote</span>
      </div>

      <div className="login-showcase__content">
        <div className="login-showcase__intro">
          <div className="login-showcase__eyebrow">
            <Sparkles size={13} strokeWidth={1.8} />
            <span>Your creative workspace</span>
          </div>
          <h1>
            Ideas that <span>take shape.</span>
          </h1>
          <p>Notes, code and creative projects — all in one elegant flow.</p>
        </div>

        <div className="login-showcase__scene">
          <div className="login-showcase__orbit login-showcase__orbit--outer">
            <span />
          </div>
          <div className="login-showcase__orbit login-showcase__orbit--inner" />

          <div className="login-showcase__note-card">
            <div className="login-showcase__note-icon"><FileText size={16} /></div>
            <span>Project idea</span>
            <div className="login-showcase__note-line login-showcase__note-line--long" />
            <div className="login-showcase__note-line" />
            <div className="login-showcase__note-line login-showcase__note-line--short" />
          </div>

          <div className="login-showcase__editor">
            <div className="login-showcase__editor-glow" />
            <div className="login-showcase__editor-header">
              <div className="login-showcase__window-dots"><i /><i /><i /></div>
              <div className="login-showcase__file-name"><Code2 size={13} /> my-idea.tsx</div>
              <div className="login-showcase__live"><i /> Live</div>
            </div>

            <div className="login-showcase__code">
              <div className="login-showcase__code-row login-showcase__code-row--1">
                <span className="login-showcase__line-number">01</span>
                <code><b>const</b> <em>idea</em> = <q>&quot;Something extra&quot;</q>;</code>
              </div>
              <div className="login-showcase__code-row login-showcase__code-row--2">
                <span className="login-showcase__line-number">02</span>
                <code>&nbsp;</code>
              </div>
              <div className="login-showcase__code-row login-showcase__code-row--3">
                <span className="login-showcase__line-number">03</span>
                <code><strong>create</strong>(idea)</code>
              </div>
              <div className="login-showcase__code-row login-showcase__code-row--4">
                <span className="login-showcase__line-number">04</span>
                <code>&nbsp;&nbsp;.<strong>with</strong>(<q>&quot;code&quot;</q>)</code>
              </div>
              <div className="login-showcase__code-row login-showcase__code-row--5">
                <span className="login-showcase__line-number">05</span>
                <code>&nbsp;&nbsp;.<strong>and</strong>(<q>&quot;notes&quot;</q>)<span className="login-showcase__cursor" /></code>
              </div>
            </div>

            <div className="login-showcase__editor-footer">
              <span><Check size={12} /> All changes saved</span>
              <span>NexNote / 01</span>
            </div>
          </div>

          <div className="login-showcase__floating-pill login-showcase__floating-pill--sync">
            <span><Cloud size={15} /></span>
            <div><small>Cloud sync</small><strong>Everything is up to date</strong></div>
            <i />
          </div>

          <div className="login-showcase__floating-pill login-showcase__floating-pill--note">
            <span><FileText size={15} /></span>
            <div><small>Note</small><strong>Markdown ready</strong></div>
          </div>
        </div>

        <div className="login-showcase__features">
          <span><i /> Write without distractions</span>
          <span><i /> Code with colors</span>
          <span><i /> Share when you are ready</span>
        </div>
      </div>

      <div className="login-showcase__footer">
        <span>Create. Organize. Share.</span>
        <div><i /><i /><i /></div>
      </div>
    </div>
  );
}
