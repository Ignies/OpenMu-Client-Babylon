// Is everything answering? Checked from inside the web (Caddy) container, over the same paths Caddy uses.
import type { Stack } from './docker';
import { mailOn } from './render/mail';
import { HOSTS, PORTS } from './stack';

export type Check = { name: string; ok: boolean };

const TCP: [string, string, number][] = [
  ['OpenMU connect server', HOSTS.openmu, PORTS.connect],
  ['OpenMU game server', HOSTS.openmu, PORTS.firstGame],
  ['OpenMU admin panel', HOSTS.openmu, PORTS.admin],
  ['Proxy (websocket)', HOSTS.openmu, PORTS.proxy],
  ['Register', HOSTS.register, PORTS.register],
  ['Website (PHP)', HOSTS.site, PORTS.site],
];

const HTTP: [string, string][] = [
  ['Cash shop', `http://${HOSTS.cashshop}:${PORTS.cashshop}/api/catalog`],
  ['Marketplace', `http://${HOSTS.marketplace}:${PORTS.marketplace}/api/market/listings`],
];

export async function checks(stack: Stack): Promise<Check[]> {
  // IMAPS answers once the mail server has its certificate (DNS for mail.<domain> must be in place).
  const tcp = mailOn(stack.config) ? [...TCP, ['Mail server (IMAPS)', 'mailserver', PORTS.imaps] as [string, string, number]] : TCP;
  const script = [
    ...tcp.map(([, host, port]) => `nc -z -w 3 ${host} ${port} && echo 1 || echo 0`),
    // Any HTTP answer counts: the marketplace says 401 to a caller without a player session.
    ...HTTP.map(([, url]) => `wget -S -T 5 -O /dev/null ${url} 2>&1 | grep -q 'HTTP/' && echo 1 || echo 0`),
  ].join('; ');
  const r = await stack.exec('web', ['sh', '-c', script]);
  const results = r.out.split('\n');
  return [...tcp.map(t => t[0]), ...HTTP.map(h => h[0])].map((name, i) => ({ name, ok: results[i]?.trim() === '1' }));
}

/** Waits until OpenMU has seeded (or migrated) its database and its connect server listens. */
export async function waitForOpenMu(stack: Stack, timeoutMs = 10 * 60_000, onLine?: (l: string) => void): Promise<void> {
  const until = Date.now() + timeoutMs;
  while (Date.now() < until) {
    const logs = await stack.compose(['logs', '--no-color', '--tail', '400', 'openmu-startup']);
    const last = logs.out.split('\n').filter(Boolean).pop();
    if (last) onLine?.(last.replace(/^\S+\s+\|\s*/, ''));
    if (/Client Listener started, Port 44405/.test(logs.out)) return;
    await Bun.sleep(3000);
  }
  throw new Error('OpenMU did not start in time; see `mu logs openmu-startup`.');
}
