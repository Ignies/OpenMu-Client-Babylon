/**
 * Who is knocking, and how often: the burst limit the loopback services share.
 *
 * `register/server/main.ts` and `cashshop/server/main.ts` both listen on
 * loopback behind Caddy and both need "this network, so many attempts per
 * window". The part that matters is `clientIp`: it decides whether a
 * forwarded header can be believed, and a limit is only as good as that
 * decision. It lives here once, because a fix to it that lands in one
 * service and not the other leaves the other counting an address the caller
 * chose - which is no limit at all.
 *
 * Engine-free on purpose: nothing here may drag Babylon or a store into a
 * server process.
 */

/** Without the `[...]` an IPv6 literal may wear, or a `%zone` suffix. */
function bareAddress(address: string): string {
  return address.replace(/^\[|\]$/g, '').split('%')[0];
}

/**
 * Expand an IPv6 address and return its first four groups - the /64.
 *
 * A single IPv6 address is worthless as an identity: a residential allocation
 * is a /64 and every one of its 18 quintillion addresses is free to use, so
 * counting per-address counts nobody. The /64 is the unit actually handed to a
 * subscriber, so that is the unit that gets counted.
 */
function ipv6Prefix(address: string): string {
  const [head, tail = ''] = address.split('::');
  const headGroups = head ? head.split(':') : [];
  const tailGroups = tail ? tail.split(':') : [];
  const gap = Math.max(8 - headGroups.length - tailGroups.length, 0);

  return [...headGroups, ...Array(gap).fill('0'), ...tailGroups]
    .slice(0, 4)
    .map(group => group.padStart(4, '0'))
    .join(':');
}

/** What counts as "one network" for a limit. */
export function bucketFor(ip: string): string {
  const bare = bareAddress(ip);

  // Plain IPv4, or IPv4-mapped IPv6 (`::ffff:1.2.3.4`) - which must not fall
  // through to the prefix path, or every mapped client shares one all-zero
  // bucket. IPv4 is scarce enough to count whole.
  if (bare.includes('.')) return bare.slice(bare.lastIndexOf(':') + 1);
  if (!bare.includes(':')) return bare;

  return `${ipv6Prefix(bare)}::/64`;
}

/** `127.0.0.0/8`, `::1`, or the mapped form of the first. */
export function isLoopback(address: string): boolean {
  const bare = bareAddress(address);

  if (bare.includes('.')) return bare.slice(bare.lastIndexOf(':') + 1).startsWith('127.');

  return bare === '::1';
}

/** `TRUSTED_PROXIES`: exact addresses of reverse proxies that are not on loopback (a Caddy container). */
export function trustedProxies(env: Record<string, string | undefined> = process.env): string[] {
  return (env.TRUSTED_PROXIES ?? '').split(',').map(s => s.trim()).filter(Boolean);
}

const TRUSTED = typeof process === 'undefined' ? [] : trustedProxies();

function isTrustedPeer(peer: string, trusted: readonly string[]): boolean {
  const bare = bareAddress(peer);
  return isLoopback(bare) || trusted.includes(bare.replace(/^::ffff:/, ''));
}

/**
 * The caller's address, as far as it can be trusted: the last
 * `X-Forwarded-For` entry, believed only from a loopback or trusted peer. See core/readme.md.
 */
// Structurally typed rather than `Bun.Server`: the pinned `bun-types` does not
// export that name, and this is the only member needed.
export function clientIp(
  req: Request,
  server: { requestIP(req: Request): { address: string } | null },
  trusted: readonly string[] = TRUSTED
): string {
  const peer = server.requestIP(req)?.address;
  const forwarded = req.headers.get('x-forwarded-for');

  if (forwarded && peer && isTrustedPeer(peer, trusted)) {
    const hops = forwarded.split(',');
    const nearest = hops[hops.length - 1]?.trim();

    if (nearest) return nearest;
  }

  return peer || 'unknown';
}

/**
 * Attempts per bucket inside a sliding window, in memory. Forgetting it on a
 * restart costs nothing that matters: whatever a burst limit protects is
 * bounded elsewhere, on disk, by the thing it fronts (register's daily quota,
 * the shop's daily caps).
 */
export class BurstLimit {
  /** bucket -> attempt timestamps inside the window. */
  private readonly bursts = new Map<string, number[]>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number
  ) {}

  /** Records the attempt and says whether it was one too many. */
  hammering(bucket: string, now = Date.now()): boolean {
    const recent = (this.bursts.get(bucket) ?? []).filter(at => now - at < this.windowMs);

    recent.push(now);
    this.bursts.set(bucket, recent);

    // Buckets that stopped knocking would otherwise accumulate forever.
    if (this.bursts.size > 10_000) {
      for (const [key, times] of this.bursts) {
        if (!times.some(at => now - at < this.windowMs)) this.bursts.delete(key);
      }
    }

    return recent.length > this.limit;
  }
}
