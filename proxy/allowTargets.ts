/**
 * Which servers the proxy is allowed to dial.
 *
 * The proxy turns a websocket into a raw TCP connection to whatever `host:port`
 * the client names, so the rule set here is the only thing between the public
 * websocket and every TCP service the proxy's host can reach. Unset means any
 * host the client asks for, which is what a local dev box wants; a proxy on the
 * internet must be pinned or it is an open relay.
 *
 * Comma-separated `host` or `host:port`, `*.` allowed as a leading label:
 * `ALLOW_TARGETS="play.example.com,*.example.net:55901"`.
 *
 * Internal address space (loopback, private, link-local) is special: it is
 * reachable from where the proxy runs even when firewalled from the outside, so
 * a bare-host rule must never open every port on it. Reaching one arbitrary
 * loopback port is enough to read a service that was only ever meant to answer
 * on localhost. Rules for these hosts therefore have to name an exact port -
 * `127.0.0.1:44405`, not `127.0.0.1` - and a `*.` wildcard never matches them.
 */

export interface AllowRule {
  host: string;
  /** null when the rule names a host with no port (matches any port). */
  port: number | null;
  wildcard: boolean;
}

export function parseAllowTargets(raw: string): AllowRule[] {
  return raw
    .split(",")
    .map(rule => rule.trim().toLowerCase())
    .filter(Boolean)
    .map(rule => {
      const [pattern, rulePort] = rule.split(":");
      return {
        host: pattern,
        port: rulePort ? Number(rulePort) : null,
        wildcard: pattern.startsWith("*."),
      };
    });
}

/**
 * True for hosts that resolve into address space the proxy can reach privately:
 * loopback, RFC1918, CGNAT and link-local (which includes the cloud metadata
 * address 169.254.169.254). Only literal IPs and `localhost` are classified
 * here; a hostname that resolves to one of these ranges is not caught, which is
 * why the game server's own port must also be firewalled to loopback rather
 * than relying on this alone.
 */
export function isInternalHost(host: string): boolean {
  const h = host.trim().toLowerCase().replace(/^\[/, "").replace(/\]$/, "");

  if (h === "localhost" || h.endsWith(".localhost")) return true;

  const v4 = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const a = Number(v4[1]);
    const b = Number(v4[2]);
    if (a === 0 || a === 127) return true; // unspecified, loopback
    if (a === 10) return true; // private
    if (a === 172 && b >= 16 && b <= 31) return true; // private
    if (a === 192 && b === 168) return true; // private
    if (a === 169 && b === 254) return true; // link-local incl. cloud metadata
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
    return false;
  }

  if (h.includes(":")) {
    if (h === "::1" || h === "::") return true; // loopback, unspecified
    if (h.startsWith("::ffff:")) return isInternalHost(h.slice(7)); // v4-mapped
    if (/^fe[89ab]/.test(h)) return true; // fe80::/10 link-local
    if (h.startsWith("fc") || h.startsWith("fd")) return true; // fc00::/7 ULA
    return false;
  }

  return false;
}

/** A `host:port` the relay refuses whatever the rules say. */
export interface ReservedTarget {
  host: string;
  port: number;
}

/**
 * Whether `host:port` lands on a reserved socket.
 *
 * The presence server is the one that is reserved (see `presence.ts`): it
 * answers `/ticket/<nonce>` with the account behind the nonce to whoever can
 * reach it, and being loopback-only is its entire authentication. An unset
 * `ALLOW_TARGETS` - right on a dev box, one forgotten variable on a public
 * one - or a rule that happened to name its port would otherwise let a
 * browser speak HTTP to it through the relay, and the shop's identity would
 * be anyone's for the asking.
 *
 * An internal reservation covers every internal host at that port, not just
 * the literal it binds: `localhost`, `::1` and `::ffff:127.0.0.1` all reach a
 * socket bound to `127.0.0.1`, and a server bound to `0.0.0.0` answers on
 * every address the box has.
 */
export function targetReserved(reserved: ReservedTarget[], host: string, port: number): boolean {
  const wanted = host.trim().toLowerCase();

  return reserved.some(target => {
    if (target.port !== port) return false;

    const bound = target.host.trim().toLowerCase();

    return bound === wanted || (isInternalHost(bound) && isInternalHost(wanted));
  });
}

export function targetAllowed(
  rules: AllowRule[],
  host: string,
  port: number,
  reserved: ReservedTarget[] = []
): boolean {
  if (targetReserved(reserved, host, port)) return false;
  if (!rules.length) return true;

  const internal = isInternalHost(host);

  return rules.some(rule => {
    if (rule.port !== null && rule.port !== port) return false;

    if (internal) {
      return !rule.wildcard && rule.port !== null && rule.host === host;
    }

    return rule.wildcard
      ? host === rule.host.slice(2) || host.endsWith(rule.host.slice(1))
      : host === rule.host;
  });
}
