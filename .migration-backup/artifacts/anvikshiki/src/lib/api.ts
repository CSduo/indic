const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export async function apiFetch(path: string, opts?: RequestInit) {
  const url = `${BASE}/api${path}`;
  const res = await fetch(url, { credentials: "include", ...opts });
  return res;
}

export async function apiJson<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await apiFetch(path, opts);
  if (!res.ok) {
    let msg = `${res.status} ${res.statusText}`;
    try { const d = await res.json(); msg = d.error || msg; } catch {}
    throw new Error(msg);
  }
  return res.json();
}
