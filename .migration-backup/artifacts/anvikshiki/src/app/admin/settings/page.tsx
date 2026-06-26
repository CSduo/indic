import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Settings } from "lucide-react";
import { AdminSidebar } from "@/components/sacred/AdminSidebar";
import { LotusDivider, LotusIcon } from "@/components/sacred/LotusIcon";

const base = () => import.meta.env.BASE_URL.replace(/\/$/, "");

export default function AdminSettingsPage() {
  const [, navigate] = useLocation();

  useEffect(() => {
    fetch(`${base()}/api/admin/me`, { credentials: "include" })
      .then(r => { if (r.status === 401) navigate("/admin/login"); })
      .catch(() => {});
  }, []);

  return (
    <div className="admin-layout">
      <AdminSidebar active="/admin/settings" />
      <main className="admin-main">
        <div className="mb-6">
          <h1 className="font-display text-2xl" style={{ color: "var(--gold-bright)" }}>Settings</h1>
          <p className="font-ui text-xs mt-1" style={{ color: "var(--muted)" }}>Platform configuration</p>
        </div>

        <div className="space-y-4 max-w-lg">
          {[
            { title: "Authentication", desc: "Admin login is managed via environment variables ADMIN_EMAIL and ADMIN_PASSWORD. Set these in your environment secrets to control admin access." },
            { title: "Google Login", desc: "Google OAuth requires GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET. These are prepared placeholders — configure when ready." },
            { title: "Notifications", desc: "WhatsApp/SMS notifications require TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN. Architecture is prepared — configure when ready." },
            { title: "Database", desc: "PostgreSQL is connected via DATABASE_URL. Schema is managed with Drizzle ORM." },
          ].map(s => (
            <div key={s.title} className="card-sacred p-5">
              <div className="flex items-center gap-2 mb-2">
                <Settings size={16} style={{ color: "var(--gold)" }} />
                <div className="section-label">{s.title}</div>
              </div>
              <p className="font-body text-sm" style={{ color: "var(--ink-faint)" }}>{s.desc}</p>
            </div>
          ))}

          <div className="card-sacred p-5">
            <LotusDivider className="mb-4" />
            <div className="flex justify-center">
              <LotusIcon size={32} style={{ color: "var(--gold)", opacity: 0.3 }} />
            </div>
            <p className="font-body text-xs text-center mt-3" style={{ color: "var(--ink-faint)" }}>Additional settings will be available in future updates.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
