import { useEffect, useState } from "react";
import { BellRing, BellOff } from "lucide-react";
import { toast } from "sonner";
import {
  currentPermission,
  describePushSupport,
  disableNotifications,
  enableNotifications,
  isSubscribedOnThisDevice,
} from "@/lib/pushNotifications";

/**
 * The switch for browser notifications.
 *
 * Deliberately a control the reader operates rather than a prompt that appears
 * on its own: a permission request shown unasked is usually dismissed, and a
 * dismissal is close to irreversible — the browser stops asking and the only
 * way back is a settings menu most people never open.
 */
export function NotificationSettings({ compact = false }: { compact?: boolean }) {
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [checked, setChecked] = useState(false);

  const support = describePushSupport();
  const permission = currentPermission();
  const blocked = permission === "denied";

  useEffect(() => {
    let cancelled = false;
    isSubscribedOnThisDevice().then(value => {
      if (!cancelled) { setSubscribed(value); setChecked(true); }
    });
    return () => { cancelled = true; };
  }, []);

  const turnOn = async () => {
    setBusy(true);
    const result = await enableNotifications();
    setBusy(false);
    if (result.ok) {
      setSubscribed(true);
      toast.success("Notifications are on for this browser.");
    } else {
      toast.error(result.reason);
    }
  };

  const turnOff = async () => {
    setBusy(true);
    await disableNotifications();
    setBusy(false);
    setSubscribed(false);
    toast.success("Notifications are off for this browser.");
  };

  if (!support.supported) {
    return (
      <div className={compact ? "" : "confirm-card"}>
        <p className="font-ui text-[11px] leading-relaxed text-[var(--muted)]">{support.reason}</p>
      </div>
    );
  }

  return (
    <div className={compact ? "" : "confirm-card"}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="mono-label">Browser notifications</p>
          <p className="mt-1.5 font-body text-sm leading-6 text-[var(--ink-body)]">
            {subscribed
              ? "This browser will let you know when someone comments on your work, or when a submission changes status."
              : "Be told when someone comments on your work, or when a submission changes status."}
          </p>
          <p className="mt-1 font-ui text-[11px] text-[var(--muted)]">
            Tied to your account — signing out stops them, signing back in resumes them.
          </p>
          {blocked ? (
            <p className="mt-2 font-ui text-[11px] text-[var(--state-error,#9B1C1C)]">
              Your browser is currently blocking notifications for this site. Allow them from the padlock
              menu beside the address bar, then switch this on.
            </p>
          ) : null}
        </div>

        <button
          type="button"
          onClick={subscribed ? turnOff : turnOn}
          disabled={busy || !checked || (blocked && !subscribed)}
          className={subscribed ? "btn-ink shrink-0" : "btn-terracotta shrink-0"}
        >
          {busy ? (
            <>
              <span className="spinner-editorial" aria-hidden="true" /> Working…
            </>
          ) : subscribed ? (
            <>
              <BellOff size={14} /> Turn off
            </>
          ) : (
            <>
              <BellRing size={14} /> Turn on
            </>
          )}
        </button>
      </div>
    </div>
  );
}
