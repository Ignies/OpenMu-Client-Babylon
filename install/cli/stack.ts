// Names, ports and addresses shared by the renderers and install/stack/compose.yml. Change both together.
export const PROJECT = 'mu';
export const WEB_IP = '172.30.77.10';

export const PORTS = {
  proxy: 3000,
  presence: 3001,
  register: 3100,
  cashshop: 3200,
  marketplace: 3300,
  admin: 8080,
  connect: 44405,
  /** OpenMU's first game server since 0.10.1 (MUnique/OpenMU#1164 moved it out of the dynamic port range). */
  firstGame: 45901,
  /** The first game server before that. A database seeded earlier keeps it unless its owner applies OpenMU's optional port update. */
  legacyFirstGame: 55901,
  gameServers: 6,
  /** IP mode only: the register site on its own port. */
  registerSite: 8081,
  /** The webmail behind Caddy, and the mail server's public ports (the `mail` profile only). */
  webmail: 80,
  smtp: 25,
  submissions: 465,
  submission: 587,
  imaps: 993,
} as const;

/** The first game port of each OpenMU port scheme, newest first; which one a box runs depends on when its database was seeded. */
export const GAME_PORTS: number[] = [PORTS.firstGame, PORTS.legacyFirstGame];

/** Every game server port of both schemes. */
export const ALL_GAME_PORTS = GAME_PORTS.flatMap(first => Array.from({ length: PORTS.gameServers }, (_, i) => first + i));

/** Service names on the Compose network; the proxy shares OpenMU's namespace, so both answer on `openmu-startup`. */
export const HOSTS = {
  openmu: 'openmu-startup',
  database: 'database',
  register: 'register',
  cashshop: 'cashshop',
  marketplace: 'marketplace',
  webmail: 'webmail',
} as const;

export type Service = 'database' | 'openmu' | 'proxy' | 'register' | 'cashshop' | 'marketplace' | 'ops' | 'web' | 'mailserver' | 'webmail';

/** The Compose profile the mail server and webmail run under. */
export const MAIL_PROFILE = 'mail';

/** Every service's data lives under one volume mounted at /data. */
export const DATA = {
  track: '/data/proxy/track.sqlite',
  register: '/data/register/signups.sqlite',
  cashshop: '/data/cashshop/shop.sqlite',
  marketplace: '/data/marketplace/market.sqlite',
  ops: '/data/ops/ops.sqlite',
  openmuLogs: '/openmu-logs',
} as const;
