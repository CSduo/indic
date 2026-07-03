import { useState } from "react";
import { Link, useLocation } from "wouter";
import { ArrowLeft, Check, LogOut, Shield, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { OrnamentDivider } from "@/components/manuscript/OrnamentDivider";
import { ParchmentCard } from "@/components/manuscript/ParchmentCard";
import { EmptyState } from "@/components/sacred/EmptyState";
import { useAuthContext } from "@/contexts/AuthContext";

const base = () => import.meta.env.BASE_URL.replace(/\/$/, "");

export default function SettingsPage() {
  const [, navigate] = useLocation();
  const { user, logout } = useAuthContext();

  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");

  if (!user) {
    return (
      <EmptyState
        title="Sign in to manage settings"
        description="You need to be logged in to view this page."
        action={<Link href="/login" className="btn-terracotta">Sign In</Link>}
      />
    );
  }

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPw.length < 8) { toast.error("New password must be at least 8 characters"); return; }
    if (newPw !== confirmPw) { toast.error("Passwords do not match"); return; }
    setPwSaving(true);
    try {
      const r = await fetch(`${base()}/api/auth/change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      });
      if (!r.ok) { const d = await r.json(); throw new Error(d.error || "Failed"); }
      toast.success("Password changed successfully");
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
    } catch (err: any) {
      toast.error(err.message || "Failed to change password");
    }
    setPwSaving(false);
  };

  const handleLogout = async () => {
    await logout();
    toast.success("Signed out");
    navigate("/");
  };

  return (
    <div className="bg-[var(--bg)]">
      <div className="container-anv py-10 max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Link href="/account" className="btn-ink p-2"><ArrowLeft size={16} /></Link>
          <div>
            <p className="type-section-label">Account</p>
            <h1 className="font-display text-3xl text-[var(--ink)]">Settings</h1>
          </div>
        </div>

        <OrnamentDivider className="mb-8" />

        {/* Account info */}
        <ParchmentCard className="p-6 mb-5">
          <div className="flex items-center gap-2 mb-4">
            <Shield size={16} className="text-[var(--gold)]" />
            <h2 className="font-display text-xl text-[var(--ink)]">Account Details</h2>
          </div>
          <div className="grid gap-3">
            <div className="flex items-center justify-between py-2 border-b border-[var(--border)]">
              <span className="font-ui text-xs text-[var(--muted)]">Email</span>
              <span className="font-ui text-sm text-[var(--ink-soft)]">{user.email}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-[var(--border)]">
              <span className="font-ui text-xs text-[var(--muted)]">Role</span>
              <span className="badge badge-received text-[0.65rem]">{user.role === "ADMIN" ? "Admin" : "Member"}</span>
            </div>
          </div>
        </ParchmentCard>

        {/* Change password */}
        <ParchmentCard className="p-6 mb-5">
          <h2 className="font-display text-xl text-[var(--ink)] mb-4">Change Password</h2>
          <form onSubmit={changePassword} className="space-y-3">
            <div>
              <label className="form-label mb-1" htmlFor="current-pw">Current password</label>
              <input id="current-pw" className="input-sacred" type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)} required />
            </div>
            <div>
              <label className="form-label mb-1" htmlFor="new-pw">New password</label>
              <input id="new-pw" className="input-sacred" type="password" value={newPw} onChange={e => setNewPw(e.target.value)} minLength={8} required />
              <p className="font-ui text-[10px] text-[var(--muted)] mt-1">Minimum 8 characters</p>
            </div>
            <div>
              <label className="form-label mb-1" htmlFor="confirm-pw">Confirm new password</label>
              <input id="confirm-pw" className="input-sacred" type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} required />
            </div>
            <button type="submit" disabled={pwSaving} className="btn-terracotta w-full justify-center">
              <Check size={14} /> {pwSaving ? "Saving…" : "Update Password"}
            </button>
          </form>
        </ParchmentCard>

        {/* Session */}
        <ParchmentCard className="p-6 mb-5">
          <h2 className="font-display text-xl text-[var(--ink)] mb-3">Session</h2>
          <button type="button" onClick={handleLogout} className="btn-ink w-full justify-center">
            <LogOut size={14} /> Sign Out of All Devices
          </button>
        </ParchmentCard>

        {/* Danger zone */}
        <ParchmentCard className="p-6 border-[var(--border-rose)]">
          <div className="flex items-center gap-2 mb-4">
            <Trash2 size={16} className="text-[var(--lotus)]" />
            <h2 className="font-display text-xl text-[var(--ink)]">Danger Zone</h2>
          </div>
          <p className="font-body text-sm leading-6 text-[var(--ink-soft)] mb-4">
            Deleting your account is permanent. All your submissions and data will be removed.
          </p>
          <div className="space-y-2">
            <label className="form-label" htmlFor="delete-confirm">Type your email to confirm</label>
            <input
              id="delete-confirm"
              className="input-sacred border-[var(--border-rose)]"
              type="email"
              placeholder={user.email}
              value={deleteConfirm}
              onChange={e => setDeleteConfirm(e.target.value)}
            />
            <button
              type="button"
              disabled={deleteConfirm !== user.email}
              onClick={() => toast.error("Account deletion is not yet available. Contact support.")}
              className="btn-sacred w-full justify-center text-sm"
              style={{ background: "rgba(139,26,74,0.15)", border: "1px solid var(--border-rose)", color: "var(--lotus)", opacity: deleteConfirm !== user.email ? 0.4 : 1 }}
            >
              <Trash2 size={14} /> Delete My Account
            </button>
          </div>
        </ParchmentCard>
      </div>
    </div>
  );
}
