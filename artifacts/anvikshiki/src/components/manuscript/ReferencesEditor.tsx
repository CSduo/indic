import { Plus, Trash2 } from "lucide-react";

/** One editable reference row. Every field is optional except the title of a filled row. */
export interface ReferenceRow {
  title: string;
  authors: string;
  year: string;
  publisher: string;
  url: string;
  doi: string;
}

export const EMPTY_REFERENCE: ReferenceRow = { title: "", authors: "", year: "", publisher: "", url: "", doi: "" };

/** At most this many references in one submission (the server allows 60). */
const MAX_ROWS = 60;

const isBlank = (row: ReferenceRow) => Object.values(row).every(value => !value.trim());

/** Filled rows only, trimmed, in the shape the API takes ({ title, url?, authors?, ... }). */
export function referencesPayload(rows: ReferenceRow[] | undefined): Record<string, string>[] {
  return (rows || [])
    .filter(row => !isBlank(row))
    .map(row => {
      const out: Record<string, string> = { title: row.title.trim() };
      for (const key of ["authors", "year", "publisher", "url", "doi"] as const) {
        const value = row[key].trim();
        if (value) out[key] = value;
      }
      return out;
    });
}

/** Rows from a stored list (the API's shape), for resuming a draft. */
export function referenceRowsFrom(raw: unknown): ReferenceRow[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(item => item && typeof item === "object")
    .map((item: any) => ({
      title: String(item.title || ""),
      authors: String(item.authors || ""),
      year: String(item.year || ""),
      publisher: String(item.publisher || ""),
      url: String(item.url || ""),
      doi: String(item.doi || ""),
    }));
}

/** A message for the first row the server would reject, or "" when all rows are fine. */
export function referencesProblem(rows: ReferenceRow[] | undefined): string {
  const list = rows || [];
  for (let i = 0; i < list.length; i++) {
    const row = list[i];
    if (isBlank(row)) continue;
    if (!row.title.trim()) return `Reference ${i + 1}: please add a title, or remove the row.`;
    const url = row.url.trim();
    if (url && !/^https?:\/\/\S+$/i.test(url)) return `Reference ${i + 1}: the link must be a full address starting with http:// or https://.`;
    const doi = row.doi.trim().replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, "").replace(/^doi:\s*/i, "");
    if (doi && !/^10\.\d{4,9}\/\S+$/.test(doi)) return `Reference ${i + 1}: the DOI should look like 10.1234/abcd.`;
  }
  return "";
}

/**
 * Optional "References & Sources" for a submission: books, articles, websites
 * and other works the piece draws on. Shown at the end of the published work.
 */
export function ReferencesEditor({
  value,
  onChange,
  label = "References & Sources",
}: {
  value: ReferenceRow[] | undefined;
  onChange: (rows: ReferenceRow[]) => void;
  label?: string;
}) {
  const rows = value || [];
  const update = (index: number, key: keyof ReferenceRow, next: string) =>
    onChange(rows.map((row, i) => (i === index ? { ...row, [key]: next } : row)));
  const remove = (index: number) => onChange(rows.filter((_, i) => i !== index));
  const add = () => rows.length < MAX_ROWS && onChange([...rows, { ...EMPTY_REFERENCE }]);

  return (
    <div className="card-sacred p-5">
      <div className="section-label mb-1">{label}</div>
      <p className="font-body text-[11px] mb-4" style={{ color: "var(--ink-faint)" }}>
        Optional. List the books, articles, websites or other works your piece draws on or quotes. They appear in a
        References &amp; Sources section at the end of the published piece.
      </p>

      {rows.length > 0 ? (
        <ol className="space-y-4 mb-4">
          {rows.map((row, index) => (
            <li key={index} className="rounded-lg border border-[var(--border-gold)] p-3.5" style={{ background: "var(--surface-3)" }}>
              <div className="flex items-center justify-between mb-2.5">
                <span className="font-ui text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--gold)" }}>
                  Reference {index + 1}
                </span>
                <button
                  type="button"
                  onClick={() => remove(index)}
                  className="inline-flex items-center gap-1 font-ui text-[11px] text-[var(--ink-faint)] hover:text-red-400 transition-colors"
                  aria-label={`Remove reference ${index + 1}`}
                >
                  <Trash2 size={13} /> Remove
                </button>
              </div>
              <div className="grid gap-2.5 sm:grid-cols-2">
                <input
                  className="input-sacred sm:col-span-2"
                  type="text"
                  placeholder="Title of the work *"
                  aria-label={`Reference ${index + 1} title`}
                  maxLength={500}
                  value={row.title}
                  onChange={e => update(index, "title", e.target.value)}
                />
                <input
                  className="input-sacred"
                  type="text"
                  placeholder="Author(s)"
                  aria-label={`Reference ${index + 1} authors`}
                  maxLength={500}
                  value={row.authors}
                  onChange={e => update(index, "authors", e.target.value)}
                />
                <input
                  className="input-sacred"
                  type="text"
                  inputMode="numeric"
                  placeholder="Year"
                  aria-label={`Reference ${index + 1} year`}
                  maxLength={20}
                  value={row.year}
                  onChange={e => update(index, "year", e.target.value)}
                />
                <input
                  className="input-sacred sm:col-span-2"
                  type="text"
                  placeholder="Journal, publisher or website"
                  aria-label={`Reference ${index + 1} publisher`}
                  maxLength={300}
                  value={row.publisher}
                  onChange={e => update(index, "publisher", e.target.value)}
                />
                <input
                  className="input-sacred"
                  type="url"
                  placeholder="Link (https://…)"
                  aria-label={`Reference ${index + 1} link`}
                  maxLength={2000}
                  value={row.url}
                  onChange={e => update(index, "url", e.target.value)}
                />
                <input
                  className="input-sacred"
                  type="text"
                  placeholder="DOI (10.1234/…)"
                  aria-label={`Reference ${index + 1} DOI`}
                  maxLength={200}
                  value={row.doi}
                  onChange={e => update(index, "doi", e.target.value)}
                />
              </div>
            </li>
          ))}
        </ol>
      ) : null}

      <button
        type="button"
        onClick={add}
        disabled={rows.length >= MAX_ROWS}
        className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-gold)] px-3.5 py-2 font-ui text-xs font-semibold text-[var(--ink-soft)] hover:border-[var(--gold)] hover:text-[var(--ink)] transition-colors disabled:opacity-50"
      >
        <Plus size={14} /> {rows.length ? "Add another reference" : "Add a reference"}
      </button>
    </div>
  );
}
