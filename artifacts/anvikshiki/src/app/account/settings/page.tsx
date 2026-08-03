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
  
  const [emailNotifs, setEmailNotifs] = useState(() => localStorage.getItem("anv-email-notifs") !== "false");
  const [fontSize, setFontSize] = useState(() => Number(localStorage.getItem("anv-font-size")) || 16);

  const toggleEmailNotifs = () => {
    const val = !emailNotifs;
    setEmailNotifs(val);
    localStorage.setItem("anv-email-notifs", String(val));
    toast.success(`Email notifications ${val ? 'enabled' : 'disabled'}`);
  };

  const handleFontSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setFontSize(val);
    localStorage.setItem("anv-font-size", String(val));
    document.documentElement.style.setProperty('--user-font-size', `${val}px`);
  };

  const handleExportData = () => {
    if (!user) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(user, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "anvikshiki-profile-data.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    toast.success("Data exported successfully");
  };

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

        {/* Preferences */}
        <ParchmentCard className="p-6 mb-5">
          <h2 className="font-display text-xl text-[var(--ink)] mb-4">Preferences</h2>
          <div className="grid gap-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-ui text-sm font-bold text-[var(--ink)]">Email Notifications</p>
                <p className="font-body text-xs text-[var(--muted)] mt-1">Receive updates on your submissions and digest.</p>
              </div>
              <button 
                type="button" 
                role="switch" 
                aria-checked={emailNotifs}
                onClick={toggleEmailNotifs}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${emailNotifs ? 'bg-[var(--gold)]' : 'bg-[var(--border)]'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${emailNotifs ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
            
            <div className="pt-4 border-t border-[var(--border)]">
              <label className="font-ui text-sm font-bold text-[var(--ink)] block mb-1">Reading Font Size: {fontSize}px</label>
              <p className="font-body text-xs text-[var(--muted)] mb-3">Adjust the default reading size for articles and papers.</p>
              <div className="flex items-center gap-4">
                <span className="font-body text-sm text-[var(--ink)]">A</span>
                <input 
                  type="range" 
                  min="14" 
                  max="24" 
                  step="1" 
                  value={fontSize} 
                  onChange={handleFontSizeChange}
                  className="flex-1 accent-[var(--gold)]" 
                />
                <span className="font-body text-xl text-[var(--ink)]">A</span>
              </div>
            </div>
          </div>
        </ParchmentCard>
        
        {/* Data Export */}
        <ParchmentCard className="p-6 mb-5">
          <h2 className="font-display text-xl text-[var(--ink)] mb-3">Your Data</h2>
          <p className="font-body text-sm text-[var(--ink-soft)] mb-4">Download a copy of your profile data as a JSON file.</p>
          <button type="button" onClick={handleExportData} className="btn-ink w-full justify-center">
            Export My Data
          </button>
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
