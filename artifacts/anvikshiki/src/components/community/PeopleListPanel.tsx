import { useEffect, useState } from "react";
import { Link } from "wouter";
import { X } from "lucide-react";

const base = () => import.meta.env.BASE_URL.replace(/\/$/, "");

type Person = { id: string; name: string; handle?: string | null; avatarUrl: string | null; bio: string | null };

/**
 * The people behind a follower count.
 *
 * Names, pictures and bios only — the same public shape the members directory
 * uses. No email address appears here, because none is ever sent to a browser.
 */
export function PeopleListPanel({
  userId, kind, onClose,
}: {
  userId: string;
  kind: "followers" | "following";
  onClose: () => void;
}) {
  const [people, setPeople] = useState<Person[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch(`${base()}/api/users/${userId}/${kind}`, { credentials: "include" })
      .then(async res => {
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Could not load that list");
        return res.json();
      })
      .then(data => { if (!cancelled) setPeople(data.people || []); })
      .catch(err => { if (!cancelled) { setError(err.message); setPeople([]); } });
    return () => { cancelled = true; };
  }, [userId, kind]);

  // Escape closes, as it should for anything that covers the page.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 cursor-default"
        style={{ background: "rgba(0,0,0,0.55)" }}
      />
      {/* Sits at the bottom on a phone, where a thumb can reach it, and
          centres on a larger screen. */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={kind === "followers" ? "Followers" : "Following"}
        className="relative z-10 max-h-[80vh] w-full max-w-md overflow-hidden rounded-t-[10px] border sm:rounded-[2px]"
        style={{ background: "var(--surface)", borderColor: "var(--hairline)" }}
      >
        <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: "var(--hairline)" }}>
          <p className="font-display text-lg text-[var(--ink)]">
            {kind === "followers" ? "Followers" : "Following"}
          </p>
          <button type="button" onClick={onClose} className="editor-tool" aria-label="Close"><X size={15} /></button>
        </div>

        <div className="max-h-[calc(80vh-3.5rem)] overflow-y-auto p-2">
          {people === null ? (
            <div className="space-y-2 p-2" aria-hidden="true">
              {[0, 1, 2].map(i => (
                <div key={i} className="flex items-center gap-3">
                  <div className="h-10 w-10 animate-pulse rounded-full bg-[var(--surface-2)]" />
                  <div className="h-4 flex-1 animate-pulse rounded bg-[var(--surface-2)]" />
                </div>
              ))}
            </div>
          ) : error ? (
            <p className="p-4 text-center font-body text-sm text-[var(--muted)]">{error}</p>
          ) : people.length === 0 ? (
            <p className="p-6 text-center font-body text-sm text-[var(--muted)]">
              {kind === "followers" ? "Nobody yet." : "Not following anyone yet."}
            </p>
          ) : (
            <ul>
              {people.map(person => (
                <li key={person.id}>
                  <Link
                    href={person.handle ? `/profile/@${person.handle}` : `/profile/${person.id}`}
                    onClick={onClose}
                    className="flex items-center gap-3 rounded-[2px] p-2 transition-colors hover:bg-[var(--surface-2)]"
                  >
                    {person.avatarUrl ? (
                      <img src={person.avatarUrl} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" />
                    ) : (
                      <span
                        aria-hidden="true"
                        className="grid h-10 w-10 shrink-0 place-items-center rounded-full font-ui text-sm font-semibold"
                        style={{ background: "var(--surface-2)", border: "1px solid var(--hairline)", color: "var(--ink-meta)" }}
                      >
                        {(person.name || "?").trim().charAt(0).toUpperCase()}
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5 flex-wrap">
                        <span className="truncate font-body text-sm font-semibold text-[var(--ink)]">{person.name}</span>
                        {person.handle ? (
                          <span className="font-mono text-xs font-semibold text-[var(--gold)]">@{person.handle}</span>
                        ) : null}
                      </span>
                      {person.bio ? (
                        <span className="block truncate font-body text-[12px] text-[var(--ink-meta)]">{person.bio}</span>
                      ) : null}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
