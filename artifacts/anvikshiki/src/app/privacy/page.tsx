export default function PrivacyPage() {
  return (
    <div className="min-h-[100dvh] pb-24" style={{ background: "var(--bg)" }}>
      <div className="container-anv py-8 max-w-2xl">
        <h1 className="font-display text-3xl md:text-4xl" style={{ color: "var(--ink)" }}>Privacy Policy</h1>
        <div className="mt-6 space-y-4 font-body" style={{ color: "var(--muted)" }}>
          <p>Last updated: June 2026</p>
          <p>Anvikshiki is committed to protecting your privacy.</p>
          <h2 className="font-display text-xl" style={{ color: "var(--ink)" }}>1. Information We Collect</h2>
          <p>We collect email addresses for newsletter subscriptions and account creation. Submission forms collect name, email, and work details.</p>
          <h2 className="font-display text-xl" style={{ color: "var(--ink)" }}>2. How We Use Information</h2>
          <p>We use your information to provide the service, communicate about submissions, and send newsletters (if subscribed).</p>
          <h2 className="font-display text-xl" style={{ color: "var(--ink)" }}>3. Data Security</h2>
          <p>We implement reasonable security measures to protect your data. Passwords are hashed and sessions use secure cookies.</p>
          <h2 className="font-display text-xl" style={{ color: "var(--ink)" }}>4. Third Parties</h2>
          <p>We do not sell your data. We use Supabase for data storage.</p>
        </div>
      </div>
    </div>
  );
}
