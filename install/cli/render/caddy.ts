// The Caddyfile: static client and register site, routes to every service, HTTPS in domain mode.
import type { Config } from '../config';
import { HOSTS, PORTS } from '../stack';

const CLIENT_ROOT = '/srv/client';
const REGISTER_ROOT = '/srv/register';

/** The shop and the marketplace share `/api`; the more specific route goes first. */
function apiRoutes(): string {
  return [
    `\thandle /api/market* {\n\t\treverse_proxy ${HOSTS.marketplace}:${PORTS.marketplace}\n\t}`,
    `\thandle /api/* {\n\t\treverse_proxy ${HOSTS.cashshop}:${PORTS.cashshop}\n\t}`,
  ].join('\n');
}

/** A missing `.gz` sidecar must 404, never fall back to index.html (see compressedAssets.ts). */
function clientSite(registerOrigin: string): string {
  return [
    apiRoutes(),
    `\thandle {\n\t\troot * ${CLIENT_ROOT}\n\t\theader /Data/* Access-Control-Allow-Origin ${registerOrigin}\n\t\tfile_server\n\t}`,
  ].join('\n');
}

function registerSite(): string {
  return [
    `\thandle /api/register* {\n\t\treverse_proxy ${HOSTS.register}:${PORTS.register}\n\t}`,
    `\thandle {\n\t\troot * ${REGISTER_ROOT}\n\t\tfile_server\n\t}`,
  ].join('\n');
}

const block = (address: string, body: string) => `${address} {\n${body}\n}\n`;
const proxyTo = (port: number) => `\treverse_proxy ${HOSTS.openmu}:${port}`;

/** OpenMU's admin panel has no login of its own in the releases we run; Caddy asks for one. */
const adminSite = (c: Config) => `\tbasic_auth {\n\t\t${c.adminUser} ${c.adminHash}\n\t}\n${proxyTo(PORTS.admin)}`;

export function caddyfile(c: Config): string {
  if (c.mode === 'domain') {
    const d = c.domain;
    return [
      `{\n\temail ${c.email}\n}\n`,
      block(d, `\tredir https://play.${d}{uri}`),
      block(`play.${d}`, clientSite(`https://register.${d}`)),
      block(`api.${d}`, apiRoutes()),
      block(`ws.${d}`, proxyTo(PORTS.proxy)),
      block(`register.${d}`, registerSite()),
      block(`admin.${d}`, adminSite(c)),
    ].join('\n');
  }
  return [
    `{\n\tauto_https off\n}\n`,
    block(':80', clientSite(`http://${c.publicIp}:${PORTS.registerSite}`)),
    block(`:${PORTS.proxy}`, proxyTo(PORTS.proxy)),
    block(`:${PORTS.registerSite}`, registerSite()),
    block(`:${PORTS.admin}`, adminSite(c)),
  ].join('\n');
}

/** Ports the firewall opens. SSH stays open so the installer never locks you out. */
export function publicPorts(c: Config): number[] {
  return c.mode === 'domain' ? [22, 80, 443] : [22, 80, PORTS.proxy, PORTS.registerSite, PORTS.admin];
}
