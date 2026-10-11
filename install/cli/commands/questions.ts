// The questions, grouped so install asks all of them and `mu config` asks one group.
import type { Config } from '../config';
import { run } from '../exec';
import { ui, pc } from '../ui';
import * as check from '../validate';

export type Group = 'address' | 'listing' | 'passwords' | 'features' | 'openmu';

export const GROUPS: { value: Group; label: string; hint: string }[] = [
  { value: 'address', label: 'Address', hint: 'domain or IP, certificate e-mail' },
  { value: 'listing', label: 'Server list entry', hint: 'name, description, language' },
  { value: 'passwords', label: 'Passwords', hint: 'database, admin panel' },
  { value: 'features', label: 'Features', hint: 'band, map ping, weather, shop delivery, marketplace fees, hit timing' },
  { value: 'openmu', label: 'OpenMU version', hint: 'release, or a source ref' },
];

async function publicIp(): Promise<string> {
  const r = await run('curl', ['-fsS', '-m', '5', 'https://api.ipify.org']);
  return r.code === 0 && !check.ipv4(r.out) ? r.out : '';
}

export async function ask(c: Config, group: Group): Promise<Config> {
  const next = { ...c };
  switch (group) {
    case 'address': {
      next.mode = await ui.select('How will players reach the server?', [
        { value: 'domain', label: 'A domain I own', hint: 'HTTPS on play., ws., register., api., admin.<domain>' },
        { value: 'ip', label: 'Just the IP address', hint: 'plain HTTP, for testing' },
      ], c.mode);
      if (next.mode === 'domain') {
        next.domain = (await ui.text('Domain', { initial: c.domain, placeholder: 'example.com', validate: check.domain })).toLowerCase();
        ui.note(['play', 'ws', 'register', 'api', 'admin'].map(s => `${s}.${next.domain}`).join('\n'), 'Point these DNS A records at this server');
        next.email = await ui.text('E-mail for certificate notices', { initial: c.email, validate: check.email });
      } else {
        next.publicIp = await ui.text('Public IP address', { initial: c.publicIp || (await publicIp()), validate: check.ipv4 });
      }
      break;
    }
    case 'listing':
      next.serverName = await ui.text('Server name', { initial: c.serverName, validate: check.listField });
      next.serverDescription = await ui.text('Description', { initial: c.serverDescription, validate: check.listField });
      next.serverLanguage = await ui.text('Language code', { initial: c.serverLanguage, validate: v => (/^[a-z]{2}$/.test(v) ? undefined : 'Two letters, like en or es.') });
      break;
    case 'passwords':
      ui.info(`Passwords: ${pc.dim(check.PASSWORD_RULE)}`);
      next.postgresPassword = await ui.password('Database password', check.password);
      next.adminUser = await ui.text('Admin panel login', { initial: c.adminUser, validate: check.login });
      next.adminHash = await Bun.password.hash(await ui.password('Admin panel password', v => check.password(v, next.adminUser)), { algorithm: 'bcrypt', cost: 12 });
      break;
    case 'features':
      next.band = await ui.confirm('Band system (players play music together)?', c.band);
      next.ping = await ui.confirm('Map ping?', c.ping);
      next.weather = await ui.confirm('Shared weather?', c.weather);
      next.shopDelivery = await ui.confirm('Cash shop delivers purchases into the game? (off = rehearsal only)', c.shopDelivery);
      next.marketFee = Number(await ui.text('Marketplace listing fee (Zen)', { initial: String(c.marketFee), validate: v => (/^\d+$/.test(v) ? undefined : 'A whole number.') }));
      next.marketCommission = Number(await ui.text('Marketplace commission (%)', { initial: String(c.marketCommission), validate: v => (/^\d+$/.test(v) && Number(v) <= 100 ? undefined : '0 to 100.') }));
      next.heldHitRequest = await ui.confirm('Send a hit when the swing lands instead of on the click? (off = the original; the uneven timing can trip the OpenMU speed check)', c.heldHitRequest);
      next.retryLoginWhenConnected = await ui.confirm('Retry a login refused as "account already connected"? (off = the original; only useful if this server drops the old session on that refusal)', c.retryLoginWhenConnected);
      next.muHelperAfterReconnect = await ui.confirm('Start the MU Helper again after an automatic reconnect if it was running? (off = it stays off; botting policy)', c.muHelperAfterReconnect);
      next.autoManaPotion = await ui.confirm('Let players turn on drinking a mana potion by itself when mana runs low? (off = the original; gameplay automation)', c.autoManaPotion);
      next.autoQuiver = await ui.confirm('Let players turn on putting the next quiver in as soon as one runs out? (off = the original reloads at the next shot; gameplay automation)', c.autoQuiver);
      next.modulesOff = await ui.text('Client modules to turn off (comma separated, like events,marketplace; blank for none)', { initial: c.modulesOff, validate: v => (/^\s*([a-z_]+\s*(,\s*[a-z_]+\s*)*)?$/.test(v) ? undefined : 'Module names separated by commas.') });
      next.moduleSigningKey = (await ui.text('Public key that signs your first-party streamed modules (tools/modules/sign.ts pubkey; blank: every module runs sandboxed)', { initial: c.moduleSigningKey, validate: v => check.moduleSigningKey(v.trim()) })).trim();
      break;
    case 'openmu': {
      const source = await ui.select('Which OpenMU?', [
        { value: 'release', label: 'An official release', hint: 'munique/openmu image' },
        { value: 'source', label: 'OpenMU source at a commit or tag', hint: 'built with OpenMU\'s own Dockerfile; for a database newer than the last release' },
      ], c.openmuSourceRef ? 'source' : 'release');
      if (source === 'release') {
        next.openmuSourceRef = '';
        next.openmuVersion = await ui.text('Release', { initial: c.openmuVersion, validate: v => (/^\d+\.\d+\.\d+$/.test(v) ? undefined : 'Like 0.9.10.') });
      } else {
        next.openmuSourceRef = await ui.text('Commit or tag', { initial: c.openmuSourceRef, validate: v => (/^[\w.\-/]+$/.test(v) ? undefined : 'A commit hash or tag.') });
      }
      break;
    }
  }
  return next;
}

/** The game GM account: MU logins are 4-10 letters or digits, passwords 4-10 printable characters. */
export async function askGm(): Promise<{ login: string; password: string }> {
  const login = await ui.text('Game Master account login', { validate: check.login });
  const password = await ui.password('Game Master password (4-10 characters, the game limit)', v =>
    /^[!-~]{4,10}$/.test(v) ? (v.toLowerCase() === login.toLowerCase() ? 'Not the login name.' : undefined) : '4 to 10 characters, no spaces.',
  );
  return { login, password };
}
