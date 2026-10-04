import { ServerConfig, effective, type ServerProfile } from './serverConfig';

/** The rest of a world, worked out from its domain: `ws.`, `register.` and `api.<domain>`, and the
 * `server.json` next to its proxy.
 * The convention: readme.md. */

const env = import.meta.env;

/**
 * Where a convention world's connect server is, as its proxy reaches it. The
 * proxy dials on the browser's behalf and shares a machine with the game
 * server, so this is loopback and not the world's own address - the same thing
 * the published `host:port` form says out loud.
 */
export const CONVENTION_CS_HOST = '127.0.0.1';
export const CONVENTION_CS_PORT = 44405;

/** Hostname of one of the world's services. */
function serviceHost(label: string, domain: string): string {
  return `${label}.${domain}`;
}

/** The proxy a convention world is reached through. */
export function conventionProxyUrl(domain: string): string {
  return `wss://${serviceHost('ws', domain)}`;
}

/**
 * True while this page is being served by the world it is asking about, which
 * is the case that is allowed to stay same-origin.
 */
function servedByWorld(domain: string): boolean {
  if (typeof location === 'undefined') return false;

  const host = location.hostname.toLowerCase();
  const lower = domain.toLowerCase();

  return host === lower || host.endsWith(`.${lower}`);
}

/**
 * Where the login window's "Create account" link goes, or empty for a world
 * that has not said. The world's own page wins over the build's: a client that
 * ships with one server's address still has to send a player registering for
 * a different world to that world's page.
 */
export function registerUrl(
  profile: ServerProfile = ServerConfig.active
): string {
  if (profile.domain) return `https://${serviceHost('register', profile.domain)}`;

  return (env.VITE_REGISTER_URL as string) || '';
}

/**
 * Where the login window's own register form posts, or empty when this world
 * has no signup service the client may talk to.
 *
 * The signup page and the endpoint behind it are published together, so a
 * world that has the one has the other. Note what this is *not*: a relative
 * path, even for a world serving this very page. `/api` on the client's host
 * is the cash shop, and a signup posted there lands on its 404 - the register
 * service answers on `register.<domain>` and is reached by name from anywhere,
 * which is what `CORS_ORIGIN` on that service exists to allow.
 *
 * A build that names a signup page but no endpoint gets nothing here on
 * purpose: the window falls back to linking out to that page, which is what
 * it did before it could ask itself.
 */
export function registerApiUrl(
  profile: ServerProfile = ServerConfig.active
): string {
  if (profile.domain) {
    return `https://${serviceHost('register', profile.domain)}/api/register`;
  }

  return (env.VITE_REGISTER_API as string) || '';
}

/**
 * Where the marketplace window asks for its listings.
 *
 * A world played from its own site keeps the relative path: that deployment
 * publishes the service under `/api` on the client's host, which costs no CORS
 * allowlist and no second certificate. Only somebody else's marketplace has to
 * be addressed by name. It shares `api.<domain>` with the cash shop service
 * because a world publishes one service host, not one per window.
 */
export function marketApiUrl(profile: ServerProfile = ServerConfig.active): string {
  if (profile.domain && !servedByWorld(profile.domain)) {
    return `https://${serviceHost('api', profile.domain)}/api/market`;
  }

  return (env.VITE_MARKETPLACE_API as string) || '/api/market';
}

/**
 * Where a world publishes its `server.json` (serverManifest.ts): the root of
 * its proxy's host, over http(s). Every profile has a proxy, so this works for
 * a domain world (`https://ws.<domain>/server.json`) and for one published as
 * an address. Empty when the proxy address does not parse.
 */
export function serverManifestUrl(profile: ServerProfile = ServerConfig.active): string {
  const ws = effective(profile).wsUrl;

  try {
    const url = new URL(ws);
    const scheme = url.protocol === 'wss:' ? 'https' : url.protocol === 'ws:' ? 'http' : '';

    return scheme && url.host ? `${scheme}://${url.host}/server.json` : '';
  } catch {
    return '';
  }
}
