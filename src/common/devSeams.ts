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

/**
 * `?hp=` / `?mp=`: stage the hero's health or mana at a percentage on the
 * offline route, so a warning state can be looked at without being hit.
 */
export function devVitalPercent(key: 'hp' | 'mp'): number | null {
  const percent = devQueryNumber(key);
  if (percent === null) return null;

  return Math.max(0, Math.min(100, percent));
}

/** A comma-separated list of exactly `count` numbers, or null. */
export function devQueryNumbers(key: string, count: number): number[] | null {
  const raw = devQuery(key);
  if (!raw) return null;

  const parts = raw.split(',').map(Number);

  return parts.length === count && parts.every(Number.isFinite) ? parts : null;
}
