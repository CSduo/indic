export function parsePagination(
  rawLimit: unknown,
  rawOffset: unknown,
  options: { defaultLimit?: number; maxLimit?: number } = {},
) {
  const defaultLimit = options.defaultLimit ?? 20;
  const maxLimit = options.maxLimit ?? 50;
  const parsedLimit = Number.parseInt(String(rawLimit ?? ""), 10);
  const parsedOffset = Number.parseInt(String(rawOffset ?? ""), 10);
  return {
    limit: Number.isFinite(parsedLimit)
      ? Math.min(Math.max(parsedLimit, 1), maxLimit)
      : defaultLimit,
    offset: Number.isFinite(parsedOffset) ? Math.max(parsedOffset, 0) : 0,
  };
}

export function toLikePattern(value: string, maxLength = 200): string {
  const escaped = value.trim().slice(0, maxLength).replace(/[\\%_]/g, "\\$&");
  return `%${escaped}%`;
}
