export default function TermsPage() {
  return (
    <div className="min-h-[100dvh] pb-24" style={{ background: "var(--bg)" }}>
      <div className="container-anv py-8 max-w-2xl">
        <h1 className="font-display text-3xl md:text-4xl" style={{ color: "var(--ink)" }}>Terms of Service</h1>
        <div className="mt-6 space-y-4 font-body" style={{ color: "var(--muted)" }}>
          <p>Last updated: June 2026</p>
          <p>Welcome to Anvikshiki. By accessing or using our platform, you agree to these terms.</p>
          <h2 className="font-display text-xl" style={{ color: "var(--ink)" }}>1. Acceptance of Terms</h2>
          <p>By using Anvikshiki, you agree to be bound by these Terms of Service. If you do not agree, please do not use the platform.</p>
          <h2 className="font-display text-xl" style={{ color: "var(--ink)" }}>2. User Accounts</h2>
          <p>You are responsible for maintaining the confidentiality of your account credentials.</p>
          <h2 className="font-display text-xl" style={{ color: "var(--ink)" }}>3. Submissions</h2>
          <p>By submitting content, you confirm that the work is original or that you have permission to submit it.</p>
          <h2 className="font-display text-xl" style={{ color: "var(--ink)" }}>4. Intellectual Property</h2>
          <p>Authors retain ownership of their work. By publishing on Anvikshiki, you grant us a license to display the content.</p>
        </div>
      </div>
    </div>
  );
}
