// Per-service environment, rendered from the config. Secrets go only to the services that use them.
import { clientOrigin, type Config } from '../config';
import { DATA, HOSTS, PORTS, WEB_IP, type Service } from '../stack';
import { moduleSigningKey } from '../validate';
import { mailHost, mailserverEnv, webmailEnv } from './mail';

type Env = Record<string, string>;
const onOff = (v: boolean) => (v ? 'on' : 'off');

export function databaseUrl(c: Config): string {
  return `postgres://postgres:${encodeURIComponent(c.postgresPassword)}@${HOSTS.database}:5432/openmu`;
}

/** The OpenMU ports the proxy may dial: connect server and game servers, on loopback only. */
export function allowTargets(): string {
  const ports = [PORTS.connect, ...Array.from({ length: PORTS.gameServers }, (_, i) => PORTS.firstGame + i)];
  return ports.map(p => `127.0.0.1:${p}`).join(',');
}

/** Where the cash shop gate checks that the game port is closed to the internet. */
function probeHost(c: Config): string {
  return c.mode === 'domain' ? c.domain : c.publicIp;
}

export function serviceEnv(c: Config): Partial<Record<Service, Env>> {
  const origin = clientOrigin(c);
  const presence = `http://${HOSTS.openmu}:${PORTS.presence}`;
  const db = databaseUrl(c);
  return {
    openmu: {
      DB_ADMIN_PW: c.postgresPassword,
      ASPNETCORE_ENVIRONMENT: 'Production',
      // The proxy dials OpenMU on loopback, so that is the address it advertises; no public IP lookup.
      RESOLVE_IP: 'loopback',
      MARKETPLACE_ESCROW_SECRET: c.escrowSecret,
    },
    proxy: {
      PORT: String(PORTS.proxy),
      HOSTNAME: '0.0.0.0',
      ALLOW_TARGETS: allowTargets(),
      LOG_PACKETS: 'off',
      TRACK: 'on',
      TRACK_DB_PATH: DATA.track,
      BAND: onOff(c.band),
      PING: onOff(c.ping),
      WEATHER: onOff(c.weather),
      ADMIN_OPEN: 'off',
      ADMIN_DEMO: 'off',
      ADMIN_ORIGINS: origin,
      PRESENCE_HOST: '0.0.0.0',
      PRESENCE_PORT: String(PORTS.presence),
    },
    register: {
      PORT: String(PORTS.register),
      HOSTNAME: '0.0.0.0',
      DATABASE_URL: db,
      CORS_ORIGIN: origin,
      RATE_DB_PATH: DATA.register,
      TRUSTED_PROXIES: WEB_IP,
    },
    cashshop: {
      PORT: String(PORTS.cashshop),
      HOSTNAME: '0.0.0.0',
      DATABASE_URL: db,
      CORS_ORIGIN: origin,
      CASHSHOP_DB: DATA.cashshop,
      CASHSHOP_TICKET_SECRET: c.shopTicketSecret,
      CASHSHOP_FULFIL: onOff(c.shopDelivery),
      CASHSHOP_PREVIEW: 'off',
      PRESENCE_URL: presence,
      GAME_PROBE_HOST: probeHost(c),
      GAME_PROBE_PORT: String(PORTS.firstGame),
      TRUSTED_PROXIES: WEB_IP,
    },
    marketplace: {
      MARKETPLACE_API_PORT: String(PORTS.marketplace),
      MARKETPLACE_API_HOST: '0.0.0.0',
      DATABASE_URL: db,
      MARKETPLACE_DB: DATA.marketplace,
      MARKETPLACE_CORS_ORIGIN: origin,
      MARKETPLACE_ESCROW_SECRET: c.escrowSecret,
      MARKETPLACE_TICKET_SECRET: c.marketTicketSecret,
      MARKETPLACE_LISTING_FEE: String(c.marketFee),
      MARKETPLACE_COMMISSION_PERCENT: String(c.marketCommission),
      PRESENCE_URL: presence,
      TRUSTED_PROXIES: WEB_IP,
    },
    ops: {
      OPENMU_LOG_DIR: DATA.openmuLogs,
      OPS_DB_PATH: DATA.ops,
      RATE_DB_PATH: DATA.register,
    },
    // Rendered with mail off too: compose reads every service's env file.
    mailserver: mailserverEnv(c),
    webmail: webmailEnv(c),
  };
}

/** The OpenMU image our plugin layer sits on: the official release, or one built from OpenMU's source at a ref. */
export function openmuImage(c: Config): string {
  return c.openmuSourceRef ? 'mu-openmu-base:local' : `munique/openmu:${c.openmuVersion}`;
}

/** What Compose interpolates into both compose files (`--env-file`). */
export function stackEnv(c: Config, paths: { repo: string; state: string }): Env {
  return {
    MU_REPO: paths.repo,
    MU_STATE: paths.state,
    OPENMU_IMAGE: openmuImage(c),
    POSTGRES_PASSWORD: c.postgresPassword,
    MU_MAIL_HOST: mailHost(c),
    ...clientBuildArgs(c),
  };
}

/** Build arguments for the client and register images: the server's own defaults baked in. */
export function clientBuildArgs(c: Config): Env {
  return {
    ...siteBuildArgs(c),
    VITE_MODULE_SIGNING_KEY: moduleSigningKey(c.moduleSigningKey) ? '' : c.moduleSigningKey,
    // tools/liteAssets.ts writes the lighter copies only when this is on.
    MU_LITE_ASSETS: c.liteAssets ? 'on' : 'off',
  };
}

function siteBuildArgs(c: Config): Env {
  if (c.mode === 'domain') {
    return {
      VITE_WS_HOST: `wss://ws.${c.domain}`,
      VITE_WS_PORT: '443',
      VITE_SERVER_LIST_URL: './serverlist.md',
      VITE_REGISTER_URL: `https://register.${c.domain}`,
      VITE_REGISTER_API: `https://register.${c.domain}/api/register`,
      VITE_DATA_URL_REGISTER: `https://play.${c.domain}/Data/`,
    };
  }
  return {
    VITE_WS_HOST: `ws://${c.publicIp}`,
    VITE_WS_PORT: String(PORTS.proxy),
    VITE_SERVER_LIST_URL: './serverlist.md',
    VITE_REGISTER_URL: `http://${c.publicIp}:${PORTS.registerSite}`,
    VITE_REGISTER_API: `http://${c.publicIp}:${PORTS.registerSite}/api/register`,
    VITE_DATA_URL_REGISTER: `http://${c.publicIp}/Data/`,
  };
}
