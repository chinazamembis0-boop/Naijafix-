// Reusable inner-page chrome (header + back link + logo) used by every
// standalone page that is not the main app shell.
export function InnerHeader({ onBack, title }) {
  return (
    <header className="inner-header">
      {onBack ? (
        <button className="back-link" onClick={onBack}>
          ← Back
        </button>
      ) : (
        <span />
      )}
      <Logo />
      {title ? <span style={{ fontWeight: 700, color: 'var(--nf-navy)' }}>{title}</span> : <span />}
    </header>
  )
}

export function Logo() {
  return (
    <div className="brand">
      <div className="brand-icon">🇳🇬</div>
      <div>
        <div style={{ fontWeight: 800, fontSize: 18, lineHeight: 1.1 }}>NaijaFix</div>
        <div style={{ fontSize: 10, color: 'var(--nf-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Local services
        </div>
      </div>
    </div>
  )
}

export function PageShell({ onBack, title, children }) {
  return (
    <div className="inner-page">
      <InnerHeader onBack={onBack} title={title} />
      <main className="inner-content">
        {children}
      </main>
      <Footer />
    </div>
  )
}

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="site-footer-brand">
          <div className="brand">
            <div className="brand-icon">🇳🇬</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 16 }}>NaijaFix</div>
              <div style={{ fontSize: 10, color: 'var(--nf-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Built for Nigeria
              </div>
            </div>
          </div>
          <p style={{ margin: '10px 0 0', fontSize: 12, color: 'var(--nf-text-muted)', maxWidth: 320 }}>
            Connecting customers with trusted independent service providers across Nigeria.
          </p>
        </div>
        <div className="site-footer-cols">
          <div>
            <h4>Product</h4>
            <a href="#/" data-route="home">Browse services</a>
            <a href="#/providers" data-route="providers">Providers</a>
            <a href="#/food" data-route="food">Food delivery</a>
          </div>
          <div>
            <h4>Company</h4>
            <a href="#/terms" data-route="terms">Terms of Service</a>
            <a href="#/privacy" data-route="privacy">Privacy Policy</a>
            <a href="#/cancellation" data-route="cancellation">Cancellation Policy</a>
          </div>
          <div>
            <h4>Support</h4>
            <a href="#/acceptable-use" data-route="acceptable-use">Acceptable use</a>
            <a href="#/dispute-policy" data-route="dispute-policy">Dispute policy</a>
            <a href="#/support" data-route="support">Help & support</a>
          </div>
        </div>
      </div>
      <div className="site-footer-bottom">
        <span>© {new Date().getFullYear()} NaijaFix. All rights reserved.</span>
        <span>Made in Nigeria 🇳🇬</span>
      </div>
    </footer>
  )
}

export function LoadingState({ text = 'Loading...', detail }) {
  return (
    <div className="empty-box large-empty">
      <span style={{ fontSize: 28, opacity: 0.6 }}>⏳</span>
      <h4>{text}</h4>
      {detail && <p style={{ fontSize: 13, color: 'var(--nf-text-muted)' }}>{detail}</p>}
    </div>
  )
}

export function EmptyState({ icon = '📭', title, description, action }) {
  return (
    <div className="empty-box large-empty">
      <span style={{ fontSize: 32 }}>{icon}</span>
      <h4>{title}</h4>
      {description && <p style={{ color: 'var(--nf-text-muted)', fontSize: 13, maxWidth: 360 }}>{description}</p>}
      {action && <div style={{ marginTop: 14 }}>{action}</div>}
    </div>
  )
}

export function ErrorState({ title = 'Something went wrong', message, onRetry }) {
  return (
    <div className="empty-box large-empty">
      <span style={{ fontSize: 32 }}>⚠️</span>
      <h4>{title}</h4>
      <p style={{ color: 'var(--nf-text-muted)', fontSize: 13, maxWidth: 380, lineHeight: 1.5 }}>
        {message || 'We could not load this information. Please try again.'}
      </p>
      {onRetry && (
        <button className="primary-button" style={{ marginTop: 14 }} onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  )
}

export function PolicyPage({ title, children }) {
  return (
    <div className="inner-page">
      <header className="inner-header">
        <a href="#/" className="back-link" onClick={(e) => { e.preventDefault(); window.dispatchEvent(new CustomEvent('naijafix-navigate', { detail: 'home' })) }}>
          ← Back
        </a>
        <Logo />
      </header>
      <main className="inner-content">
        <span className="section-label">Legal</span>
        <h1 style={{ marginBottom: 8 }}>{title}</h1>
        <p style={{ color: 'var(--nf-text-muted)', marginBottom: 24, fontSize: 13 }}>
          Last updated: September 2026
        </p>
        <div className="policy-body">
          {children}
        </div>
      </main>
      <Footer />
    </div>
  )
}

export function PolicySection({ title, children }) {
  return (
    <section style={{ marginBottom: 28 }}>
      <h3 style={{ marginBottom: 8, color: 'var(--nf-navy)' }}>{title}</h3>
      <p style={{ color: 'var(--nf-text)', lineHeight: 1.6, fontSize: 14, margin: 0 }}>{children}</p>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Public policy pages
// ---------------------------------------------------------------------------

export function TermsOfService() {
  return (
    <PolicyPage title="Terms of Service">
      <PolicySection title="1. About NaijaFix">
        <p>
          NaijaFix is a marketplace platform that connects customers with independent
          service providers across Nigeria. We do not employ, own, or operate the
          businesses listed on this platform. Each provider is an independent
          contractor responsible for the quality of their own work.
        </p>
      </PolicySection>
      <PolicySection title="2. Using the platform">
        <p>
          By using NaijaFix you agree to use the platform only for lawful purposes
          and in a way that does not infringe the rights of others. You must provide
          accurate information when creating an account.
        </p>
      </PolicySection>
      <PolicySection title="3. Bookings and provider work">
        <p>
          When you book a service through NaijaFix, you enter into an agreement
          directly with the provider. NaijaFix is not responsible for the quality,
          timing, or completion of any service. Providers set their own prices,
          availability, and terms.
        </p>
      </PolicySection>
      <PolicySection title="4. Changes to these terms">
        <p>
          We may update these terms from time to time. Continued use of NaijaFix
          after changes means you accept the updated terms.
        </p>
      </PolicySection>
    </PolicyPage>
  )
}

export function PrivacyPolicy() {
  return (
    <PolicyPage title="Privacy Policy">
      <PolicySection title="1. What we collect">
        <p>
          We collect the information you provide when creating an account, such as
          your name, email, phone number, and location. We also collect information
          about how you use the platform.
        </p>
      </PolicySection>
      <PolicySection title="2. How we use your information">
        <p>
          We use your information to provide and improve NaijaFix, to show you
          relevant providers and services, to process bookings, and to keep you
          informed about your account and platform updates.
        </p>
      </PolicySection>
      <PolicySection title="3. Sharing your information">
        <p>
          We share only the information needed to connect you with providers you
          book with, and to keep the platform safe. We do not sell your personal
          information to third parties.
        </p>
      </PolicySection>
      <PolicySection title="4. Your choices">
        <p>
          You can control notifications from your account settings. You may request
          correction of your personal information by contacting support.
        </p>
      </PolicySection>
    </PolicyPage>
  )
}

export function CancellationPolicy() {
  return (
    <PolicyPage title="Cancellation Policy">
      <PolicySection title="1. Customer cancellations">
        <p>
          You may cancel a booking before it is accepted by the provider. Once a
          provider has accepted, cancellation terms depend on the provider and how
          far along the booking has progressed.
        </p>
      </PolicySection>
      <PolicySection title="2. Provider cancellations">
        <p>
          Providers may cancel a booking before work begins. If a provider cancels
          after accepting, you will be notified and may book with another provider.
        </p>
      </PolicySection>
      <PolicySection title="3. Refunds">
        <p>
          Refund handling depends on the payment status of the booking. Because
          payment processing is currently being set up, please contact support for
          assistance with any refund request.
        </p>
      </PolicySection>
    </PolicyPage>
  )
}

export function AcceptableUsePolicy() {
  return (
    <PolicyPage title="Acceptable Use Policy">
      <PolicySection title="1. Acceptable use">
        <p>
          You must use NaijaFix to connect with providers for lawful services only.
          You must not use the platform to harass, scam, or harm other users.
        </p>
      </PolicySection>
      <PolicySection title="2. Prohibited conduct">
        <p>
          Prohibited conduct includes fake accounts, misleading provider information,
          abuse of support features, and any attempt to interfere with the platform.
        </p>
      </PolicySection>
      <PolicySection title="3. Enforcement">
        <p>
          We may suspend or remove accounts that violate this policy. Serious
          concerns should be reported through the support flow.
        </p>
      </PolicySection>
    </PolicyPage>
  )
}

export function DisputePolicy() {
  return (
    <PolicyPage title="Dispute & Support Policy">
      <PolicySection title="1. Reporting a problem">
        <p>
          If something goes wrong with a booking, you can report it from the
          relevant booking or through the support flow. Include as much detail as
          possible, including photos or messages where relevant.
        </p>
      </PolicySection>
      <PolicySection title="2. How disputes are handled">
        <p>
          Our support team reviews each report, may contact both parties, and works
          to resolve the issue fairly. We keep you informed about the status of
          your report.
        </p>
      </PolicySection>
      <PolicySection title="3. Statuses">
        <p>
          Reports can be pending, under review, resolved, or closed. You can check
          the status from your dashboard.
        </p>
      </PolicySection>
    </PolicyPage>
  )
}