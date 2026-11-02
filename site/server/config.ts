// The public site's configuration, all from the environment the installer renders.
import os from 'node:os';
import path from 'node:path';

const trimSlash = (value: string) => value.replace(/\/+$/, '');

export const PORT = Number(process.env.PORT || 3400);
export const HOSTNAME = process.env.HOSTNAME || '0.0.0.0';

/** The site's own SQLite database. Never OpenMU's Postgres schema. */
export const DB_PATH =
  process.env.SITE_DB || path.join(os.homedir(), '.mu-site', 'site.sqlite');

/** OpenMU's Postgres: accounts, characters and rankings. Account creation goes through openmu.ts. */
export const DATABASE_URL =
  process.env.DATABASE_URL || 'postgres://postgres:admin@127.0.0.1:5432/openmu';

/** The proxy's internal presence server. Loopback only; never exposed by Caddy. */
export const PRESENCE_URL = trimSlash(
  process.env.PRESENCE_URL || 'http://127.0.0.1:3001'
);

/** Shared with the proxy; guards the internal player-status and warp routes. */
export const PLAYER_CONTROL_SECRET = process.env.PLAYER_CONTROL_SECRET || '';

/** The public origin players use, e.g. https://site.example.com. */
export const SITE_BASE_URL = trimSlash(
  process.env.SITE_BASE_URL || `http://localhost:${PORT}`
);

export const ADMIN_USER = process.env.SITE_ADMIN_USER || 'admin';
export const ADMIN_HASH = process.env.SITE_ADMIN_HASH || '';
export const SESSION_SECRET = process.env.SITE_SESSION_SECRET || '';

/** The client origin, allowed to read the public VIP status endpoint. */
export const CORS_ORIGINS = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map(value => value.trim())
  .filter(Boolean);

/** Set to `off` only for a preview without OpenMU; production must validate accounts. */
export const ACCOUNT_CHECK = process.env.SITE_ACCOUNT_CHECK !== 'off';

export const SERVER_NAME = process.env.SERVER_NAME || 'MUCURA';
export const SERVER_DESCRIPTION =
  process.env.SERVER_DESCRIPTION || '97d, played in the browser';
export const SERVER_VERSION = process.env.SERVER_VERSION || '0.9.10';
export const SERVER_LANGUAGE = process.env.SERVER_LANGUAGE || 'pt';

/** Where the client and the register page live, so default links can point at them. */
function defaultClientUrl(): string {
  const site = process.env.SITE_BASE_URL?.trim();
  if (!site) return '';
  try {
    const url = new URL(site);
    if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') return '';
    if (url.hostname.startsWith('play.')) return url.origin;
    // IP mode: the site is on :8082, the client on port 80 of the same host.
    if (url.port === '8082') return `${url.protocol}//${url.hostname}`;
    if (/^\d+\.\d+\.\d+\.\d+$/.test(url.hostname)) return '';
    // Domain mode: the client is play.<domain>, even if the site was opened on www./site.
    return `${url.protocol}//play.${url.hostname.replace(/^(www|site)\./, '')}`;
  } catch {
    return '';
  }
}

export const CLIENT_URL = trimSlash(process.env.CLIENT_URL || defaultClientUrl());
export const REGISTER_URL = trimSlash(process.env.REGISTER_URL || '');

/** How long a signed admin session lives. */
export const SESSION_MS = 8 * 60 * 60 * 1000;
