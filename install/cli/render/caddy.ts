// The Caddyfile: the website, the static client and register site, routes to every service, HTTPS in domain mode.
import type { Config } from '../config';
import { HOSTS, PORTS } from '../stack';
import { MAIL_PORTS, mailHost, mailOn } from './mail';
import { MODULES_PATH } from './manifest';

const CLIENT_ROOT = '/srv/client';
const REGISTER_ROOT = '/srv/register';
const SITE_ROOT = '/srv/site';
/** Caddy's own loopback door to the site, which forward_auth asks; it has no host so the forwarded Host matches. */
const SITE_AUTH = `127.0.0.1:${PORTS.siteAuth}`;

/** The shop and the marketplace share `/api`; the more specific route goes first. */
function apiRoutes(): string {
  return [
    `\thandle /api/market* {\n\t\treverse_proxy ${HOSTS.marketplace}:${PORTS.marketplace}\n\t}`,
    `\thandle /api/* {\n\t\treverse_proxy ${HOSTS.cashshop}:${PORTS.cashshop}\n\t}`,
  ].join('\n');
}

/**
 * server.json and the modules it lists, readable from any page: a client served elsewhere fetches them
 * next to the proxy. A module is pinned by its hash, so its file needs no cache rule.
 */
function manifestRoute(): string {
  return [
    `\thandle /server.json {\n\t\troot * ${CLIENT_ROOT}\n\t\theader Access-Control-Allow-Origin *\n\t\theader Cache-Control no-cache\n\t\tfile_server\n\t}`,
    `\thandle ${MODULES_PATH}* {\n\t\troot * ${CLIENT_ROOT}\n\t\theader Access-Control-Allow-Origin *\n\t\tfile_server\n\t}`,
  ].join('\n');
}

/**
 * A catch-all handle. With the client gated it asks the site first (`route` keeps that order): 204 for a player
 * logged in on the site, else the login page (kind=page) or a 401 (kind=ws).
 */
function guarded(c: Config, kind: 'page' | 'ws', body: string[], matcher = ''): string {
  if (!c.clientGated) return `\thandle {\n${body.map(l => `\t\t${l}`).join('\n')}\n\t}`;
  const gate = [`forward_auth ${matcher}${SITE_AUTH} {`, `\turi /auth/play?kind=${kind}`, '}'];
  return `\thandle {\n\t\troute {\n${[...gate, ...body].map(l => `\t\t\t${l}`).join('\n')}\n\t\t}\n\t}`;
}

/** The proxy's host: server.json, then the websocket for everything else. */
function proxySite(c: Config): string {
  return [manifestRoute(), guarded(c, 'ws', [`reverse_proxy ${HOSTS.openmu}:${PORTS.proxy}`])].join('\n');
}

/**
 * A missing `.gz` sidecar must 404, never fall back to index.html (see compressedAssets.ts). Gated, only the page
 * itself asks the site: the assets stay cacheable and the socket is gated on its own.
 */
function clientSite(c: Config, registerOrigin: string): string {
  return [
    ...(c.clientGated ? ['\t@doc path / /index.html'] : []),
    manifestRoute(),
    apiRoutes(),
    guarded(c, 'page', [`root * ${CLIENT_ROOT}`, `header /Data/* Access-Control-Allow-Origin ${registerOrigin}`, 'file_server'], '@doc '),
  ].join('\n');
}

function registerSite(): string {
  return [
    `\thandle /api/register* {\n\t\treverse_proxy ${HOSTS.register}:${PORTS.register}\n\t}`,
    `\thandle {\n\t\troot * ${REGISTER_ROOT}\n\t\tfile_server\n\t}`,
  ].join('\n');
}

/** Every request reaches index.php, the site's router; only the public resources and the landing's art are files. */
const php = `\thandle {\n\t\troot * ${SITE_ROOT}\n\t\trewrite * /index.php\n\t\tphp_fastcgi ${HOSTS.site}:${PORTS.site}\n\t}`;

function webSite(): string {
  return [
    `\thandle /config/resources/* {\n\t\troot * ${SITE_ROOT}\n\t\tfile_server\n\t}`,
    `\t@shared path /fonts/* /icons/* /ui/world_select/*\n\thandle @shared {\n\t\troot * ${SITE_ROOT}/shared\n\t\tfile_server\n\t}`,
    php,
  ].join('\n');
}

const block = (address: string, body: string) => `${address} {\n${body}\n}\n`;
const proxyTo = (port: number) => `\treverse_proxy ${HOSTS.openmu}:${port}`;
const authDoor = (c: Config) => (c.clientGated ? [block(`http://:${PORTS.siteAuth}`, `\tbind 127.0.0.1\n${php}`)] : []);

/** OpenMU's admin panel has no login of its own in the releases we run; Caddy asks for one. */
const adminSite = (c: Config) => `\tbasic_auth {\n\t\t${c.adminUser} ${c.adminHash}\n\t}\n${proxyTo(PORTS.admin)}`;

export function caddyfile(c: Config): string {
  if (c.mode === 'domain') {
    const d = c.domain;
    return [
      // Let's Encrypt needs no e-mail; without one Caddy just sends no expiry warnings.
      ...(c.email ? [`{\n\temail ${c.email}\n}\n`] : []),
      block(d, webSite()),
      block(`www.${d}`, `\tredir https://${d}{uri}`),
      block(`${c.clientSubdomain}.${d}`, clientSite(c, `https://register.${d}`)),
      block(`api.${d}`, apiRoutes()),
      block(`ws.${d}`, proxySite(c)),
      block(`register.${d}`, registerSite()),
      block(`admin.${d}`, adminSite(c)),
      // Let's Encrypt only, so the mail server finds the certificate at a known path (mail.ts certFiles).
      ...(mailOn(c) ? [block(mailHost(c), `\ttls {\n\t\tissuer acme\n\t}\n\treverse_proxy ${HOSTS.webmail}:${PORTS.webmail}`)] : []),
      ...authDoor(c),
    ].join('\n');
  }
  return [
    `{\n\tauto_https off\n}\n`,
    block(':80', clientSite(c, `http://${c.publicIp}:${PORTS.registerSite}`)),
    block(`:${PORTS.proxy}`, proxySite(c)),
    block(`:${PORTS.registerSite}`, registerSite()),
    block(`:${PORTS.siteWeb}`, webSite()),
    block(`:${PORTS.admin}`, adminSite(c)),
    ...authDoor(c),
  ].join('\n');
}

/** Ports the firewall opens. SSH stays open so the installer never locks you out. */
export function publicPorts(c: Config): number[] {
  if (c.mode !== 'domain') return [22, 80, PORTS.proxy, PORTS.registerSite, PORTS.siteWeb, PORTS.admin];
  return [22, 80, 443, ...(mailOn(c) ? MAIL_PORTS : [])];
}
