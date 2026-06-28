import { useEffect, useState, useCallback } from "react";
import { useLocation } from "wouter";
import { Settings, Edit3, Check, X, Info } from "lucide-react";
import { AdminSidebar } from "@/components/sacred/AdminSidebar";
import { LotusDivider, LotusIcon } from "@/components/sacred/LotusIcon";
import { toast } from "sonner";

const base = () => import.meta.env.BASE_URL.replace(/\/$/, "");

const DEFAULT_SETTINGS = [
  { key: "homepage_tagline",        label: "Homepage Tagline",        description: "Main tagline shown on the homepage hero section." },
  { key: "homepage_subtitle",       label: "Homepage Subtitle",       description: "Secondary line below the tagline." },
  { key: "about_intro",             label: "About Page Intro",        description: "Opening paragraph on the About page." },
  { key: "submit_intro",            label: "Submit Page Intro",       description: "Introductory text on the submission portal." },
  { key: "community_intro",         label: "Community Intro",         description: "Welcome text on the Community page." },
  { key: "newsletter_callout",      label: "Newsletter Callout",      description: "Short text above the newsletter signup form." },
  { key: "empty_state_essays",      label: "Empty State — Essays",    description: "Message shown when no essays are published yet." },
  { key: "empty_state_papers",      label: "Empty State — Papers",    description: "Message shown when no papers are published yet." },
  { key: "footer_tagline",          label: "Footer Tagline",          description: "Tagline in the footer brand column." },
  { key: "admin_welcome_message",   label: "Admin Welcome Message",   description: "Message shown on the admin dashboard." },
];

function SettingRow({ setting, saved, onSave }: {
  setting: { key: string; label: string; description: string };
  saved: string;
  onSave: (key: string, value: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(saved);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setVal(saved); }, [saved]);

  const save = async () => {
    setSaving(true);
    await onSave(setting.key, val);
    setEditing(false);
    setSaving(false);
  };

  return (
    <div className="card-sacred p-5">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <div className="font-ui text-xs font-semibold" style={{ color: "var(--gold-bright)" }}>{setting.label}</div>
          <div className="font-body text-xs mt-0.5" style={{ color: "var(--ink-faint)" }}>{setting.description}</div>
        </div>
        {!editing && (
          <button type="button" onClick={() => setEditing(true)} className="shrink-0 opacity-50 hover:opacity-100 transition-opacity" style={{ color: "var(--gold)" }}>
            <Edit3 size={14} />
          </button>
        )}
      </div>
      {editing ? (
        <div className="mt-3">
          <textarea
            autoFocus
            className="textarea-sacred w-full text-sm"
            rows={3}
            value={val}
            onChange={e => setVal(e.target.value)}
          />
          <div className="flex gap-2 mt-2">
            <button type="button" onClick={save} disabled={saving} className="btn-sacred btn-gold text-xs py-1 px-3 inline-flex items-center gap-1">
              <Check size={12} /> {saving ? "Saving…" : "Save"}
            </button>
            <button type="button" onClick={() => { setEditing(false); setVal(saved); }} className="btn-sacred btn-ghost text-xs py-1 px-3 inline-flex items-center gap-1">
              <X size={12} /> Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-2 px-3 py-2 rounded-lg font-body text-sm" style={{ background: "var(--surface-3)", color: saved ? "var(--ink-soft)" : "var(--muted)", fontStyle: saved ? "normal" : "italic", minHeight: 36 }}>
          {saved || "Not set — click edit to add a value"}
        </div>
      )}
    </div>
  );
}

export default function AdminSettingsPage() {
  const [, navigate] = useLocation();
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const loadSettings = useCallback(async () => {
    try {
      const r = await fetch(`${base()}/api/admin/site-settings`, { credentials: "include" });
      if (r.status === 401) { navigate("/admin/login"); return; }
      const d = await r.json();
      const map: Record<string, string> = {};
      for (const s of (d.settings || [])) map[s.key] = s.value;
      setSettings(map);
    } catch {}
    setLoading(false);
  }, [navigate]);

  useEffect(() => { loadSettings(); }, [loadSettings]);

  const saveSetting = async (key: string, value: string) => {
    try {
      const r = await fetch(`${base()}/api/admin/site-settings/${encodeURIComponent(key)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ value }),
      });
      if (!r.ok) throw new Error("Failed");
      setSettings(s => ({ ...s, [key]: value }));
      toast.success("Setting saved");
    } catch {
      toast.error("Failed to save setting");
    }
  };

  return (
    <div className="admin-layout">
      <AdminSidebar active="/admin/settings" />
      <main className="admin-main">
        <div className="mb-6">
          <h1 className="font-display text-2xl" style={{ color: "var(--gold-bright)" }}>Settings</h1>
          <p className="font-ui text-xs mt-1" style={{ color: "var(--muted)" }}>Platform configuration &amp; site content management</p>
        </div>

        {/* Site Content CMS */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="section-label">Site Content</div>
          </div>
          <div className="card-sacred p-3 mb-4 flex items-start gap-2" style={{ background: "rgba(201,152,58,0.06)" }}>
            <Info size={14} style={{ color: "var(--gold)", flexShrink: 0, marginTop: 1 }} />
            <p className="font-body text-xs" style={{ color: "var(--ink-faint)" }}>
              Edit visible text across the site. Changes are stored in the database and take effect immediately. Leave empty to use the default built-in text.
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center py-10">
              <div style={{ width: 28, height: 28, border: "2px solid var(--border-gold)", borderTop: "2px solid var(--gold)", borderRadius: "50%", animation: "rotateSlow 0.8s linear infinite" }} />
            </div>
          ) : (
            <div className="space-y-3">
              {DEFAULT_SETTINGS.map(s => (
                <SettingRow key={s.key} setting={s} saved={settings[s.key] || ""} onSave={saveSetting} />
              ))}
            </div>
          )}
        </div>

        <LotusDivider className="my-6" />

        {/* Technical settings */}
        <div className="space-y-4 max-w-lg">
          <div className="section-label mb-3">Technical Configuration</div>
          {[
            { title: "Admin Access", desc: "Admin login is at /admin/login. Set ADMIN_EMAIL and ADMIN_PASSWORD in environment secrets to control access. The first login auto-creates the admin record." },
            { title: "Database", desc: "PostgreSQL connected via DATABASE_URL. Schema managed with Drizzle ORM. 11 tables: users, admins, articles, papers, categories, submissions, newsletter_subscribers, saved_items, audit_logs, site_settings, media_assets." },
            { title: "Auth Secrets", desc: "Set AUTH_SECRET (user JWT signing) and ADMIN_SECRET (admin JWT signing) as environment secrets. These must be set for sessions to work correctly." },
            { title: "Google Login", desc: "Prepared architecture. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to enable." },
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
            <p className="font-body text-xs text-center mt-3" style={{ color: "var(--ink-faint)" }}>Additional configuration options will be available in future updates.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
