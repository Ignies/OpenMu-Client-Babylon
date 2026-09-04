import { ServerConfig, type ServerProfile } from './serverConfig';

/**
 * The rest of a world, worked out from its domain.
 *
 * A world is one domain, and its pieces sit on fixed labels beneath it:
 *
 *     play.<domain>      the browser client
 *     ws.<domain>        the ws-to-TCP proxy every connection goes through
 *     register.<domain>  the signup page the login window links to
 *     api.<domain>       the cash shop service
 *
 * That convention is what lets one build play any world. This client is
 * compiled once and published for everyone, so a world it has never heard of
 * has to be able to say where its own pieces are - and a line in
 * `serverlist.md` naming `example.net` says all of it at once.
 *
 * `play.` is the one label nothing here derives: a client asking the question
 * is already being served from it.
 *
 * A world that does not follow the convention publishes its addresses in full
 * instead (`host:port@wss://proxy`), and gets no services it did not name. The
 * build-time variables are the other way out, for a client published beside
 * exactly one server.
 */

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
 * Where the cash shop asks for its catalogue.
 *
 * A world being played from its own site keeps the relative path: that
 * deployment publishes the service under `/api` on the client's host, which
 * costs no CORS allowlist and no second certificate. It is only somebody
 * else's shop that has to be addressed by name.
 */
export function shopApiUrl(profile: ServerProfile = ServerConfig.active): string {
  if (profile.domain && !servedByWorld(profile.domain)) {
    return `https://${serviceHost('api', profile.domain)}/api`;
  }

  return (env.VITE_CASHSHOP_API as string) || '/api';
}
