import { describe, expect, it } from 'vitest';
import { DEFAULTS, type Config } from '../config';
import { parseAllowTargets } from '../../../proxy/allowTargets';
import { caddyfile, publicPorts } from './caddy';
import { allowTargets, clientBuildArgs, databaseUrl, openmuImage, serviceEnv, stackEnv } from './env';
import { serverList } from './serverList';
import { serverManifest } from './manifest';
import { ORIGINAL_SETTINGS, parseServerManifest } from '../../../src/modules/servers/serverManifest';
import { WEB_IP } from '../stack';

const domain: Config = {
  ...DEFAULTS,
  domain: 'example.com',
  email: 'ops@example.com',
  postgresPassword: 'Db/pass@12345!',
  adminHash: '$2b$12$abcdefghijklmnopqrstuuF7Z5f1o2PqNnSx0nqGkqk8YxqvQ7H5a',
  escrowSecret: 'escrow-secret',
  marketTicketSecret: 'market-secret',
  shopTicketSecret: 'shop-secret',
};
const ip: Config = { ...domain, mode: 'ip', publicIp: '203.0.113.7' };

describe('service env', () => {
  const env = serviceEnv(domain);

  it('pins the proxy to OpenMU and turns the dev switches off', () => {
    expect(env.proxy).toMatchObject({ LOG_PACKETS: 'off', ADMIN_OPEN: 'off', ADMIN_DEMO: 'off', HOSTNAME: '0.0.0.0' });
    const rules = parseAllowTargets(allowTargets());
    expect(rules).toHaveLength(7);
    expect(rules.every(r => r.host === '127.0.0.1' && r.port !== null)).toBe(true);
  });

  it('gives each secret only to the services that use it', () => {
    expect(env.marketplace?.MARKETPLACE_ESCROW_SECRET).toBe('escrow-secret');
    expect(env.openmu?.MARKETPLACE_ESCROW_SECRET).toBe('escrow-secret');
    expect(env.cashshop?.CASHSHOP_TICKET_SECRET).toBe('shop-secret');
    expect(JSON.stringify(env.proxy)).not.toMatch(/secret|Db\//);
    expect(JSON.stringify(env.ops)).not.toMatch(/secret|Db\//);
  });

  it('url-encodes the database password', () => {
    expect(databaseUrl(domain)).toBe('postgres://postgres:Db%2Fpass%4012345!@database:5432/openmu');
    expect(env.openmu?.DB_ADMIN_PW).toBe('Db/pass@12345!');
  });

  it('lets the services believe Caddy and nobody else', () => {
    for (const s of [env.register, env.cashshop, env.marketplace]) expect(s?.TRUSTED_PROXIES).toBe(WEB_IP);
  });

  it('allows the client origin for CORS', () => {
    expect(env.marketplace?.MARKETPLACE_CORS_ORIGIN).toBe('https://play.example.com');
    expect(serviceEnv(ip).register?.CORS_ORIGIN).toBe('http://203.0.113.7');
  });

  it('follows the feature switches', () => {
    expect(serviceEnv({ ...domain, band: false, shopDelivery: true }).proxy?.BAND).toBe('off');
    expect(serviceEnv({ ...domain, shopDelivery: true }).cashshop?.CASHSHOP_FULFIL).toBe('on');
  });
});

describe('compose interpolation', () => {
  it('runs the official OpenMU release unless a source ref is set', () => {
    expect(openmuImage(domain)).toBe('munique/openmu:0.9.10');
    expect(openmuImage({ ...domain, openmuSourceRef: '15c2705' })).toBe('mu-openmu-base:local');
  });

  it('carries paths, the database password and the build args', () => {
    const env = stackEnv(domain, { repo: '/opt/mu', state: '/etc/mu-server' });
    expect(env).toMatchObject({ MU_REPO: '/opt/mu', MU_STATE: '/etc/mu-server', POSTGRES_PASSWORD: 'Db/pass@12345!' });
    expect(JSON.stringify(env)).not.toContain('$2b');
    expect(env.VITE_WS_HOST).toBe('wss://ws.example.com');
    expect(JSON.stringify(env)).not.toMatch(/secret/);
  });

  it('has OpenMU advertise loopback, where the proxy dials it', () => {
    expect(serviceEnv(domain).openmu?.RESOLVE_IP).toBe('loopback');
  });
});

describe('client build', () => {
  it('bakes the server in', () => {
    expect(clientBuildArgs(domain)).toMatchObject({ VITE_WS_HOST: 'wss://ws.example.com', VITE_WS_PORT: '443' });
    expect(clientBuildArgs(ip)).toMatchObject({ VITE_WS_HOST: 'ws://203.0.113.7', VITE_WS_PORT: '3000' });
  });

  it('lists this server as the only world', () => {
    expect(serverList(domain)).toContain('[S6EP3:My MU:Season 6 Episode 3, played in the browser:en](example.com)');
    expect(serverList(ip)).toContain('](127.0.0.1:44405@ws://203.0.113.7:3000)');
  });
});

describe('server.json', () => {
  it('holds the original behaviour by default, and offers login tokens: the plugin is in every image', () => {
    expect(JSON.parse(serverManifest(domain))).toEqual({ version: 1, settings: ORIGINAL_SETTINGS, modulesOff: [], loginTokens: true });
    expect(parseServerManifest(JSON.parse(serverManifest(domain)))?.loginTokens).toBe(true);
  });

  it('turns off the modules the config lists, and band when its relay is off', () => {
    expect(JSON.parse(serverManifest({ ...domain, modulesOff: ' events, marketplace ', band: false })).modulesOff).toEqual(['band', 'events', 'marketplace']);
    expect(parseServerManifest(JSON.parse(serverManifest({ ...domain, modulesOff: 'events' })))?.modulesOff).toEqual(['events']);
  });

  it('follows the config', () => {
    expect(JSON.parse(serverManifest({ ...domain, heldHitRequest: true })).settings.heldHitRequest).toBe(true);
    expect(JSON.parse(serverManifest({ ...domain, retryLoginWhenConnected: true })).settings.retryLoginWhenConnected).toBe(true);
    expect(JSON.parse(serverManifest({ ...domain, muHelperAfterReconnect: true })).settings.muHelperAfterReconnect).toBe(true);
    expect(JSON.parse(serverManifest({ ...domain, autoManaPotion: true })).settings.autoManaPotion).toBe(true);
    expect(JSON.parse(serverManifest({ ...domain, autoQuiver: true })).settings.autoQuiver).toBe(true);
  });

  // The client is the reader: what the installer writes must pass its strict check.
  it('is what the client accepts', () => {
    for (const on of [false, true]) {
      const settings = { heldHitRequest: on, retryLoginWhenConnected: on, muHelperAfterReconnect: on, autoManaPotion: on, autoQuiver: on };
      expect(parseServerManifest(JSON.parse(serverManifest({ ...domain, ...settings })))?.settings).toEqual(settings);
    }
  });

  it('is served next to the client and the proxy, to any origin', () => {
    const route = 'handle /server.json {\n\t\troot * /srv/client\n\t\theader Access-Control-Allow-Origin *';
    for (const [c, sites] of [[domain, ['play.example.com {', 'ws.example.com {']], [ip, [':80 {', ':3000 {']]] as const) {
      const text = caddyfile(c);
      for (const site of sites) {
        const start = text.indexOf(site);
        expect(text.slice(start, text.indexOf('\n}\n', start)), site).toContain(route);
      }
    }
  });

  it('still sends everything else on the proxy host to the proxy', () => {
    const text = caddyfile(domain);
    const start = text.indexOf('ws.example.com {');
    expect(text.slice(start, text.indexOf('\n}\n', start))).toMatch(/\thandle \{\n\t\treverse_proxy openmu-startup:\d+\n\t\}$/);
  });
});

describe('caddyfile', () => {
  it('serves every subdomain over HTTPS in domain mode', () => {
    const text = caddyfile(domain);
    for (const host of ['play', 'api', 'ws', 'register', 'admin']) expect(text).toContain(`${host}.example.com {`);
    expect(text).toContain('email ops@example.com');
    expect(text.indexOf('/api/market*')).toBeLessThan(text.indexOf('/api/*'));
    expect(text).not.toContain('auto_https off');
  });

  it('leaves the e-mail block out when no e-mail was given', () => {
    const text = caddyfile({ ...domain, email: '' });
    expect(text).not.toContain('email');
    expect(text).toContain('play.example.com {');
  });

  it('puts the admin panel behind a login', () => {
    for (const c of [domain, ip]) expect(caddyfile(c)).toContain(`basic_auth {\n\t\tadmin ${domain.adminHash}\n\t}`);
  });

  it('uses plain ports in IP mode', () => {
    const text = caddyfile(ip);
    expect(text).toContain('auto_https off');
    for (const port of [':80 {', ':3000 {', ':8081 {', ':8080 {']) expect(text).toContain(port);
  });

  it('balances its braces', () => {
    for (const c of [domain, ip]) {
      const text = caddyfile(c);
      expect(text.split('{').length - text.split('{uri}').length).toBe(text.split('}').length - text.split('{uri}').length);
    }
  });

  it('opens only what is served', () => {
    expect(publicPorts(domain)).toEqual([22, 80, 443]);
    expect(publicPorts(ip)).not.toContain(5432);
  });
});
