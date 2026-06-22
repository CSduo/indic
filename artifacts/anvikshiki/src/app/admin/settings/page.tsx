import { useLocation } from 'wouter';
import { useEffect } from "react";
import { Settings, Lock, Globe, Mail } from "lucide-react";

export default function AdminSettingsPage() {
  const [, navigate] = useLocation();

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL.replace(/\/$/, "")}/api/admin/me`, { credentials: "include" })
      .then((r) => { if (r.status === 401) navigate("/admin/login"); });
  }, [navigate]);

  return (
    <div className="min-h-[100dvh]" style={{ background: "var(--bg)" }}>
      <div className="container-anv py-8 max-w-2xl">
        <h1 className="font-display text-2xl mb-6" style={{ color: "var(--ink)" }}>Settings</h1>

        <div className="space-y-4">
          <div className="card-anv p-5">
            <div className="flex items-center gap-3 mb-4">
              <Globe size={20} style={{ color: "var(--gold)" }} />
              <h2 className="font-ui text-sm font-semibold" style={{ color: "var(--ink)" }}>Site Information</h2>
            </div>
            <div className="space-y-3">
              <div><label className="font-ui text-xs" style={{ color: "var(--muted)" }}>Site Name</label>
                <input type="text" defaultValue="Anvikshiki" className="input-anv mt-1" readOnly /></div>
              <div><label className="font-ui text-xs" style={{ color: "var(--muted)" }}>Description</label>
                <input type="text" defaultValue="Journal & Research Platform" className="input-anv mt-1" readOnly /></div>
            </div>
          </div>

          <div className="card-anv p-5">
            <div className="flex items-center gap-3 mb-4">
              <Mail size={20} style={{ color: "var(--peacock)" }} />
              <h2 className="font-ui text-sm font-semibold" style={{ color: "var(--ink)" }}>Email Configuration</h2>
            </div>
            <p className="font-body text-sm" style={{ color: "var(--muted)" }}>
              Configure email provider settings via environment variables:
              RESEND_API_KEY, EMAIL_FROM
            </p>
          </div>

          <div className="card-anv p-5">
            <div className="flex items-center gap-3 mb-4">
              <Lock size={20} style={{ color: "var(--rose)" }} />
              <h2 className="font-ui text-sm font-semibold" style={{ color: "var(--ink)" }}>Security</h2>
            </div>
            <p className="font-body text-sm" style={{ color: "var(--muted)" }}>
              Admin credentials are configured via environment variables.
              Update ADMIN_EMAIL and ADMIN_PASSWORD_HASH for production.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
