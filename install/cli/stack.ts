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
  firstGame: 55901,
  gameServers: 6,
  /** IP mode only: the register site on its own port. */
  registerSite: 8081,
} as const;

/** Service names on the Compose network; the proxy shares OpenMU's namespace, so both answer on `openmu-startup`. */
export const HOSTS = {
  openmu: 'openmu-startup',
  database: 'database',
  register: 'register',
  cashshop: 'cashshop',
  marketplace: 'marketplace',
} as const;

export type Service = 'database' | 'openmu' | 'proxy' | 'register' | 'cashshop' | 'marketplace' | 'ops' | 'web';

/** Every service's data lives under one volume mounted at /data. */
export const DATA = {
  track: '/data/proxy/track.sqlite',
  register: '/data/register/signups.sqlite',
  cashshop: '/data/cashshop/shop.sqlite',
  marketplace: '/data/marketplace/market.sqlite',
  ops: '/data/ops/ops.sqlite',
  openmuLogs: '/openmu-logs',
} as const;
