// The installer's single source of truth, persisted as KEY=VALUE in the state folder (see readme.md).
export type Mode = 'domain' | 'ip';

export type Config = {
  mode: Mode;
  domain: string;
  publicIp: string;
  email: string;
  branch: string;
  openmuVersion: string;
  openmuSourceRef: string;
  serverName: string;
  serverDescription: string;
  serverLanguage: string;
  postgresPassword: string;
  adminUser: string;
  /** bcrypt of the admin panel password; the password itself is never stored. */
  adminHash: string;
  escrowSecret: string;
  marketTicketSecret: string;
  shopTicketSecret: string;
  band: boolean;
  ping: boolean;
  weather: boolean;
  shopDelivery: boolean;
  marketFee: number;
  marketCommission: number;
  /** The world's `server.json` setting: hold the hit request until the blow lands (off = the original). */
  heldHitRequest: boolean;
};

const KEYS: Record<keyof Config, string> = {
  mode: 'MU_MODE',
  domain: 'MU_DOMAIN',
  publicIp: 'MU_PUBLIC_IP',
  email: 'MU_EMAIL',
  branch: 'MU_BRANCH',
  openmuVersion: 'MU_OPENMU_VERSION',
  openmuSourceRef: 'MU_OPENMU_SOURCE_REF',
  serverName: 'MU_SERVER_NAME',
  serverDescription: 'MU_SERVER_DESCRIPTION',
  serverLanguage: 'MU_SERVER_LANGUAGE',
  postgresPassword: 'POSTGRES_PASSWORD',
  adminUser: 'MU_ADMIN_USER',
  adminHash: 'MU_ADMIN_HASH',
  escrowSecret: 'MARKETPLACE_ESCROW_SECRET',
  marketTicketSecret: 'MARKETPLACE_TICKET_SECRET',
  shopTicketSecret: 'CASHSHOP_TICKET_SECRET',
  band: 'MU_BAND',
  ping: 'MU_PING',
  weather: 'MU_WEATHER',
  shopDelivery: 'MU_SHOP_DELIVERY',
  marketFee: 'MU_MARKET_FEE',
  marketCommission: 'MU_MARKET_COMMISSION',
  heldHitRequest: 'MU_HELD_HIT_REQUEST',
};

export const DEFAULTS: Config = {
  mode: 'domain',
  domain: '',
  publicIp: '',
  email: '',
  branch: 'main',
  openmuVersion: '0.9.10',
  openmuSourceRef: '',
  serverName: 'My MU',
  serverDescription: 'Season 6 Episode 3, played in the browser',
  serverLanguage: 'en',
  postgresPassword: '',
  adminUser: 'admin',
  adminHash: '',
  escrowSecret: '',
  marketTicketSecret: '',
  shopTicketSecret: '',
  band: true,
  ping: true,
  weather: true,
  shopDelivery: false,
  marketFee: 0,
  marketCommission: 0,
  heldHitRequest: false,
};

/** Where players open the client. */
export function clientOrigin(c: Config): string {
  return c.mode === 'domain' ? `https://play.${c.domain}` : `http://${c.publicIp}`;
}

export function parseEnvFile(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (!m) continue;
    const raw = m[2];
    out[m[1]] = /^'.*'$|^".*"$/.test(raw) ? raw.slice(1, -1) : raw;
  }
  return out;
}

/** Single-quoted, so Compose and shells read every value literally. Values never hold a quote (see validate.ts). */
export function toEnvFile(vars: Record<string, string>): string {
  return Object.entries(vars).map(([k, v]) => `${k}='${v}'`).join('\n') + '\n';
}

export function configToEnv(c: Config): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [field, key] of Object.entries(KEYS) as [keyof Config, string][]) {
    const v = c[field];
    out[key] = typeof v === 'boolean' ? (v ? 'on' : 'off') : String(v);
  }
  return out;
}

export function envToConfig(env: Record<string, string>): Config {
  const c = { ...DEFAULTS } as Record<keyof Config, unknown>;
  for (const [field, key] of Object.entries(KEYS) as [keyof Config, string][]) {
    const v = env[key];
    if (v === undefined) continue;
    const d = DEFAULTS[field];
    c[field] = typeof d === 'boolean' ? v === 'on' : typeof d === 'number' ? Number(v) || 0 : v;
  }
  return c as Config;
}
