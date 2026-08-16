import { useEffect, useState } from "react";
import { BellRing, X } from "lucide-react";
import { toast } from "sonner";
import { useAuthContext } from "@/contexts/AuthContext";
import {
  currentPermission,
  describePushSupport,
  enableNotifications,
  isSubscribedOnThisDevice,
} from "@/lib/pushNotifications";

const DISMISSED_KEY = "anv_notification_invite_dismissed";
const DISMISS_DAYS = 30;

/**
 * Offers notifications to a signed-in reader shortly after they arrive.
 *
 * The browser's own permission dialog is never triggered on arrival. It is
 * shown only when this card's button is pressed, and that ordering matters
 * more than it looks: a browser prompt that appears unasked is dismissed most
 * of the time, and a dismissal is close to permanent — the browser stops
 * asking and the only route back is a settings menu almost nobody opens. One
 * unprompted appearance can therefore cost the reader's notifications forever.
 *
 * So this card asks first, in the site's own voice, and only calls the browser
 * once the answer is yes. Saying "not now" hides it for a month rather than
 * spending the one chance the browser allows.
 */
export function NotificationInvite() {
  const { user, loading } = useAuthContext();
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (loading || !user) return;

    let cancelled = false;
    const decide = async () => {
      const support = describePushSupport();
      if (!support.supported) return;
      // Already answered, either way — never ask again.
      if (currentPermission() !== "default") return;

      try {
        const raw = localStorage.getItem(DISMISSED_KEY);
        if (raw) {
          const until = Number.parseInt(raw, 10);
          if (Number.isFinite(until) && Date.now() < until) return;
        }
      } catch { /* private mode — show it */ }

      if (await isSubscribedOnThisDevice()) return;

      // A short delay so it does not compete with the page appearing.
      window.setTimeout(() => { if (!cancelled) setVisible(true); }, 2500);
    };

    void decide();
    return () => { cancelled = true; };
  }, [user, loading]);

  const dismiss = () => {
    setVisible(false);
    try {
      localStorage.setItem(DISMISSED_KEY, String(Date.now() + DISMISS_DAYS * 24 * 60 * 60 * 1000));
    } catch { /* nothing to do */ }
  };

  const accept = async () => {
    setBusy(true);
    const result = await enableNotifications();
    setBusy(false);
    setVisible(false);
    if (result.ok) {
      toast.success("Notifications are on. We'll let you know about replies and messages.");
    } else {
      toast.error(result.reason);
      if (result.permissionDenied) dismiss();
    }
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Enable notifications"
      className="fixed bottom-4 right-4 z-[130] w-[min(24rem,calc(100vw-2rem))] rounded-[2px] border border-[var(--hairline)] bg-[var(--surface)] p-4 shadow-lg"
      style={{ animation: "notificationInviteIn 260ms cubic-bezier(0.16,1,0.3,1)" }}
    >
      <div className="flex items-start gap-3">
        <span
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full"
          style={{ background: "var(--accent-wash)", color: "var(--accent)" }}
          aria-hidden="true"
        >
          <BellRing size={15} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="mono-label">Stay in the conversation</p>
          <p className="mt-1.5 font-body text-sm leading-6 text-[var(--ink-body)]">
            Get told when someone replies to your work or sends you a message. You can turn this off
            at any time in your account.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <button type="button" onClick={accept} disabled={busy} className="btn-terracotta">
              {busy ? <><span className="spinner-editorial" aria-hidden="true" /> Enabling…</> : "Turn on"}
            </button>
            <button type="button" onClick={dismiss} className="btn-ink">Not now</button>
          </div>
        </div>
        <button type="button" onClick={dismiss} className="editor-tool shrink-0" aria-label="Dismiss">
          <X size={13} />
        </button>
      </div>
    </div>
  );
}
