/**
 * Dev-only URL seams (lighting_polish ARCHITECTURE §5). Every reader returns
 * null outside the dev build, so a seam can never reach production.
 */
export function devQuery(key: string): string | null {
  if (!import.meta.env.DEV) return null;

  try {
    return new URLSearchParams(location.search).get(key);
  } catch {
    return null;
  }
}

export function devQueryNumber(key: string): number | null {
  const raw = devQuery(key);
  const n = raw === null ? NaN : Number(raw);

  return Number.isFinite(n) ? n : null;
}

/** A comma-separated list of exactly `count` numbers, or null. */
export function devQueryNumbers(key: string, count: number): number[] | null {
  const raw = devQuery(key);
  if (!raw) return null;

  const parts = raw.split(',').map(Number);

  return parts.length === count && parts.every(Number.isFinite) ? parts : null;
}
