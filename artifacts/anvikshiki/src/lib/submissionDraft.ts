/**
 * The in-progress submission, shared across the multi-step submit flow.
 *
 * This used to live in sessionStorage, which is scoped to a single tab and is
 * discarded the moment that tab is closed — and on mobile, whenever the browser
 * decides to reclaim a backgrounded tab. Someone who filled in the details,
 * moved on to the upload or write step and then reloaded could find the earlier
 * step blank, with no way back: the submit button rejected them for details
 * they could no longer see, while everything they had typed sat in front of
 * them with nowhere to go.
 *
 * It now lives in localStorage so it survives a reload, a closed tab, and a
 * second tab. A timestamp keeps it from following someone around forever: a
 * draft older than DRAFT_TTL_MS is treated as abandoned and cleared, so
 * returning after a break starts fresh rather than resurrecting a stale essay.
 */

const DETAILS_KEY = "anvikshiki_submit_details";
const TYPE_KEY = "anvikshiki_submit_type";
const STAMP_KEY = "anvikshiki_submit_saved_at";

/** How long an untouched draft is kept before it is considered abandoned. */
export const DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type SubmissionDetails = Record<string, any>;

function readRaw(key: string): string | null {
  try {
    // Prefer localStorage, but fall back to anything an older session left in
    // sessionStorage so a draft in flight during this change is not lost.
    return localStorage.getItem(key) ?? sessionStorage.getItem(key);
  } catch {
    try { return sessionStorage.getItem(key); } catch { return null; }
  }
}

function writeRaw(key: string, value: string) {
  try { localStorage.setItem(key, value); } catch { /* quota or private mode */ }
  try { sessionStorage.setItem(key, value); } catch { /* best effort */ }
}

function removeRaw(key: string) {
  try { localStorage.removeItem(key); } catch { /* ignore */ }
  try { sessionStorage.removeItem(key); } catch { /* ignore */ }
}

/** True when the stored draft is older than the retention window. */
function isExpired(): boolean {
  const stamp = Number.parseInt(readRaw(STAMP_KEY) || "", 10);
  if (!Number.isFinite(stamp)) return false;
  return Date.now() - stamp > DRAFT_TTL_MS;
}

function touch() {
  writeRaw(STAMP_KEY, String(Date.now()));
}

export function loadSubmissionDetails(): SubmissionDetails {
  if (isExpired()) {
    clearSubmissionDraft();
    return {};
  }
  const raw = readRaw(DETAILS_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function saveSubmissionDetails(details: SubmissionDetails) {
  writeRaw(DETAILS_KEY, JSON.stringify(details));
  touch();
}

export function loadSubmissionType(fallback = "essay"): string {
  if (isExpired()) {
    clearSubmissionDraft();
    return fallback;
  }
  return readRaw(TYPE_KEY) || fallback;
}

export function saveSubmissionType(type: string) {
  writeRaw(TYPE_KEY, type);
  touch();
}

/** Called once a submission has actually been sent. */
export function clearSubmissionDraft() {
  removeRaw(DETAILS_KEY);
  removeRaw(TYPE_KEY);
  removeRaw(STAMP_KEY);
}

/**
 * Which required details are still missing, as human-readable labels.
 * Returning the specific gaps lets a step say what to go back and fix instead
 * of the flat "details are missing" that gave no clue which ones.
 */
export function missingSubmissionDetails(details: SubmissionDetails): string[] {
  const missing: string[] = [];
  if (!details.fullName && !details.name) missing.push("your name");
  if (!details.email) missing.push("your email address");
  if (!details.title) missing.push("a title");
  if (!details.domain) missing.push("a domain");
  return missing;
}
