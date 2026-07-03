import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { ArrowLeft, Camera, Check, Loader2, Mail, User, X } from "lucide-react";
import { toast } from "sonner";
import { OrnamentDivider } from "@/components/manuscript/OrnamentDivider";
import { ParchmentCard } from "@/components/manuscript/ParchmentCard";
import { EmptyState } from "@/components/sacred/EmptyState";
import { useAuthContext } from "@/contexts/AuthContext";

const base = () => import.meta.env.BASE_URL.replace(/\/$/, "");

export default function ProfilePage() {
  const [, navigate] = useLocation();
  const { user, refresh } = useAuthContext();

  const [name, setName] = useState(user?.name || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [institution, setInstitution] = useState(user?.institution || "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || "");
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setBio(user.bio || "");
      setInstitution(user.institution || "");
      setAvatarUrl(user.avatarUrl || "");
    }
  }, [user]);

  if (!user) {
    return (
      <EmptyState
        title="Sign in to edit your profile"
        description="You need to be logged in to view this page."
        action={<Link href="/login" className="btn-terracotta">Sign In</Link>}
      />
    );
  }

  const pickAvatar = () => avatarInputRef.current?.click();

  const uploadAvatar = async (file: File) => {
    if (!file.type.startsWith("image/")) { toast.error("Please choose an image file"); return; }
    if (file.size > 8 * 1024 * 1024) { toast.error("Image must be under 8 MB"); return; }
    setUploadingAvatar(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("context", "avatar");
      const r = await fetch(`${base()}/api/media/upload`, { method: "POST", credentials: "include", body: fd });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Upload failed");
      setAvatarUrl(data.url);
      const putRes = await fetch(`${base()}/api/auth/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ avatarUrl: data.url }),
      });
      if (!putRes.ok) throw new Error("Failed to save avatar");
      await refresh();
      toast.success("Avatar updated");
    } catch (err: any) {
      toast.error(err.message || "Failed to upload avatar");
    }
    setUploadingAvatar(false);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.error("Name cannot be empty"); return; }
    setSaving(true);
    try {
      const r = await fetch(`${base()}/api/auth/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: name.trim(), bio, institution }),
      });
      if (!r.ok) throw new Error("Failed");
      await refresh();
      toast.success("Profile updated");
    } catch {
      toast.error("Failed to update profile");
    }
    setSaving(false);
  };

  return (
    <div className="bg-[var(--bg)]">
      <div className="container-anv py-10 max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Link href="/account" className="btn-ink p-2">
            <ArrowLeft size={16} />
          </Link>
          <div>
            <p className="type-section-label">Account</p>
            <h1 className="font-display text-3xl text-[var(--ink)]">Edit Profile</h1>
          </div>
        </div>

        <OrnamentDivider className="mb-8" />

        <form onSubmit={save} className="space-y-6">
          {/* Avatar section */}
          <ParchmentCard className="p-6 flex items-center gap-6">
            <div className="relative shrink-0">
              <div className="h-20 w-20 overflow-hidden rounded-full border-2 border-[var(--border-gold)] bg-[var(--terracotta-pale)] grid place-items-center text-[var(--terracotta)]">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Your avatar" className="h-full w-full object-cover" />
                ) : (
                  <User size={32} />
                )}
              </div>
              <button
                type="button"
                className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-[var(--gold)] grid place-items-center text-white hover:bg-[var(--gold-light)] transition-colors disabled:opacity-60"
                title="Change avatar"
                onClick={pickAvatar}
                disabled={uploadingAvatar}
              >
                {uploadingAvatar ? <Loader2 size={13} className="animate-spin" /> : <Camera size={13} />}
              </button>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="sr-only"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadAvatar(f); e.target.value = ""; }}
              />
            </div>
            <div>
              <p className="font-ui text-sm font-semibold text-[var(--ink)]">{user.name || "Anonymous Scholar"}</p>
              <div className="flex items-center gap-1.5 mt-1 font-ui text-xs text-[var(--muted)]">
                <Mail size={12} /> {user.email}
              </div>
              <span className="badge badge-received mt-2 text-[0.6rem]">{user.role === "ADMIN" ? "Admin" : "Member"}</span>
            </div>
          </ParchmentCard>

          {/* Name */}
          <ParchmentCard className="p-6 space-y-4">
            <div>
              <label className="form-label mb-1" htmlFor="profile-name">Display Name</label>
              <input
                id="profile-name"
                className="input-sacred"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name as it appears in the journal"
                required
              />
            </div>
            <div>
              <label className="form-label mb-1" htmlFor="profile-institution">Institution or Affiliation</label>
              <input
                id="profile-institution"
                className="input-sacred"
                type="text"
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                placeholder="University, research centre, or independent"
              />
            </div>
            <div>
              <label className="form-label mb-1" htmlFor="profile-bio">Short Bio</label>
              <textarea
                id="profile-bio"
                className="input-sacred min-h-[96px] resize-y"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="A brief note about your scholarly interests and work…"
                maxLength={500}
              />
              <p className="font-ui text-[10px] text-[var(--muted)] mt-1 text-right">{bio.length}/500</p>
            </div>
          </ParchmentCard>

          <div className="flex items-center justify-between">
            <Link href="/account" className="btn-ink">
              <X size={14} /> Cancel
            </Link>
            <button type="submit" disabled={saving} className="btn-terracotta">
              <Check size={14} /> {saving ? "Saving…" : "Save Profile"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
