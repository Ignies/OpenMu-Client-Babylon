import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { DEFAULTS, type Config } from '../config';
import { composeArgs } from '../compose';
import { caddyfile, publicPorts } from './caddy';
import { serviceEnv, stackEnv } from './env';
import { MAIL_ARCHIVE, MAIL_DIRS, adminMailbox, certEmailKind, certFiles, dkimFile, dkimRecord, dnsNote, dnsRecords, mailHost, mailOn, mailBackupCommand, mailRestoreScript, mailboxes, removeMailbox, setMailbox, withCertEmail } from './mail';

const base: Config = {
  ...DEFAULTS,
  domain: 'example.com',
  postgresPassword: 'Db/pass@12345!',
  adminHash: '$2b$12$abcdefghijklmnopqrstuuF7Z5f1o2PqNnSx0nqGkqk8YxqvQ7H5a',
};
const hash = '$2b$12$zyxwvutsrqponmlkjihgfeF7Z5f1o2PqNnSx0nqGkqk8YxqvQ7H5a';
const mail: Config = { ...base, mail: true, email: 'admin@example.com', mailAdminHash: hash };
const paths = { repo: '/opt/mu', state: '/etc/mu-server', openmu: '/etc/mu-server/openmu', backups: '/etc/mu-server/backups' };

/** One site block of a Caddyfile, from its address to its closing brace. */
function site(text: string, address: string): string {
  const start = text.indexOf(`${address} {`);
  return start < 0 ? '' : text.slice(start, text.indexOf('\n}\n', start));
}

describe('mail server switch', () => {
  it('is off by default and only runs with a domain', () => {
    expect(DEFAULTS.mail).toBe(false);
    expect(mailOn(base)).toBe(false);
    expect(mailOn(mail)).toBe(true);
    expect(mailOn({ ...mail, mode: 'ip', publicIp: '203.0.113.7' })).toBe(false);
  });

  it('reads the certificate e-mail choice back from the config', () => {
    expect(certEmailKind(base)).toBe('none');
    expect(certEmailKind({ ...base, email: 'me@else.net' })).toBe('own');
    expect(certEmailKind(mail)).toBe('host');
  });

  it('applies the choice: none, an address, or the hosted admin mailbox', () => {
    expect(withCertEmail(mail, 'none')).toMatchObject({ mail: false, email: '' });
    expect(withCertEmail(mail, 'own', ' me@else.net ')).toMatchObject({ mail: false, email: 'me@else.net' });
    expect(withCertEmail(base, 'host')).toMatchObject({ mail: true, email: 'admin@example.com' });
    // Turning it off keeps the hash, so turning it back on later keeps the password.
    expect(withCertEmail(mail, 'none').mailAdminHash).toBe(hash);
  });

  it('names the host and the admin mailbox after the domain', () => {
    expect(mailHost(mail)).toBe('mail.example.com');
    expect(adminMailbox(mail)).toBe('admin@example.com');
  });
});

describe('mail render', () => {
  it('adds nothing while off', () => {
    expect(caddyfile(base)).not.toContain('mail.example.com');
    expect(publicPorts(base)).toEqual([22, 80, 443]);
    expect(composeArgs(base, paths)).not.toContain('--profile');
  });

  it('serves the webmail at mail.<domain>, with a Let\'s Encrypt certificate the mail server reads', () => {
    const block = site(caddyfile(mail), 'mail.example.com');
    expect(block).toContain('tls {\n\t\tissuer acme\n\t}');
    expect(block).toContain('reverse_proxy webmail:80');
    expect(certFiles(mail)).toEqual({
      cert: '/caddy/caddy/certificates/acme-v02.api.letsencrypt.org-directory/mail.example.com/mail.example.com.crt',
      key: '/caddy/caddy/certificates/acme-v02.api.letsencrypt.org-directory/mail.example.com/mail.example.com.key',
    });
  });

  it('opens the mail ports and starts the mail profile only when on', () => {
    expect(publicPorts(mail)).toEqual([22, 80, 443, 25, 465, 587, 993]);
    const args = composeArgs(mail, paths);
    expect(args.slice(args.indexOf('--profile'), args.indexOf('--profile') + 2)).toEqual(['--profile', 'mail']);
    expect(composeArgs({ ...mail, mode: 'ip', publicIp: '203.0.113.7' }, paths)).not.toContain('--profile');
  });

  it('points the mail server at the certificate and the webmail at the mail server by its public name', () => {
    const env = serviceEnv(mail);
    expect(env.mailserver).toMatchObject({
      SSL_TYPE: 'manual',
      SSL_CERT_PATH: certFiles(mail).cert,
      SSL_KEY_PATH: certFiles(mail).key,
      POSTMASTER_ADDRESS: 'admin@example.com',
      SPOOF_PROTECTION: '1',
    });
    expect(env.webmail).toMatchObject({
      ROUNDCUBEMAIL_DEFAULT_HOST: 'ssl://mail.example.com',
      ROUNDCUBEMAIL_DEFAULT_PORT: '993',
      ROUNDCUBEMAIL_SMTP_SERVER: 'tls://mail.example.com',
      ROUNDCUBEMAIL_SMTP_PORT: '587',
      ROUNDCUBEMAIL_USERNAME_DOMAIN: 'example.com',
    });
    expect(stackEnv(mail, paths).MU_MAIL_HOST).toBe('mail.example.com');
  });

  it('keeps every password and hash out of the mail env', () => {
    const env = serviceEnv(mail);
    for (const s of [env.mailserver, env.webmail]) expect(JSON.stringify(s)).not.toMatch(/\$2b|Db\/|secret/);
    expect(JSON.stringify(stackEnv(mail, paths))).not.toContain('$2b');
  });

  it('always renders both env files, so compose reads the same files with mail on or off', () => {
    expect(serviceEnv(base).mailserver).toBeDefined();
    expect(serviceEnv(base).webmail).toBeDefined();
    expect(stackEnv(base, paths).MU_MAIL_HOST).toBe('mail.example.com');
    expect(stackEnv({ ...base, mode: 'ip', domain: '' }, paths).MU_MAIL_HOST).toBe('mail.localhost');
  });
});

describe('mail compose', () => {
  const compose = readFileSync(`${import.meta.dirname}/../../stack/compose.yml`, 'utf8').replace(/\r\n/g, '\n');
  /** A service's block: from its name to the next service at the same indent. */
  const service = (name: string) => {
    const start = compose.indexOf(`\n  ${name}:\n`);
    const rest = compose.slice(start + 1);
    const end = rest.search(/\n {2}[a-z-]+:\n|\n[a-z]+:\n/);
    return rest.slice(0, end);
  };

  it('runs a pinned mail server and webmail under the mail profile', () => {
    expect(service('mailserver')).toMatch(/image: mailserver\/docker-mailserver:\d+\.\d+\.\d+\n/);
    expect(service('webmail')).toMatch(/image: roundcube\/roundcubemail:\d+\.\d+\.\d+-apache\n/);
    for (const s of ['mailserver', 'webmail']) expect(service(s)).toContain('profiles: [mail]');
  });

  it('publishes the mail ports from the mail server only', () => {
    const ports = service('mailserver');
    for (const p of [25, 465, 587, 993]) expect(ports).toContain(`"${p}:${p}"`);
    expect(service('webmail')).not.toContain('ports:');
  });

  it('keeps mail, its state and the accounts in volumes and the state folder, and reads Caddy\'s certificates', () => {
    const s = service('mailserver');
    for (const v of ['mail-data:/var/mail', 'mail-state:/var/mail-state', '${MU_STATE}/mail:/tmp/docker-mailserver', 'caddy-data:/caddy:ro']) expect(s).toContain(v);
    expect(s).toContain('hostname: ${MU_MAIL_HOST}');
    expect(s).toContain('- ${MU_MAIL_HOST}');
  });
});

describe('DNS records', () => {
  it('lists the web hosts, and mail.<domain> only with mail on', () => {
    expect(dnsRecords(base).map(r => r.name)).toEqual(['play', 'ws', 'register', 'api', 'admin'].map(s => `${s}.example.com`));
    expect(dnsRecords(base).every(r => r.type === 'A')).toBe(true);
  });

  it('adds what mail needs: A, MX, SPF, DKIM (once known), DMARC and the PTR advice', () => {
    const rows = dnsRecords(mail, 'v=DKIM1; k=rsa; p=KEY');
    const find = (type: string, name: string) => rows.find(r => r.type === type && r.name === name)?.value;
    expect(find('A', 'mail.example.com')).toBeDefined();
    expect(find('MX', 'example.com')).toBe('10 mail.example.com');
    expect(find('TXT', 'example.com')).toBe('v=spf1 mx -all');
    expect(find('TXT', 'mail._domainkey.example.com')).toBe('v=DKIM1; k=rsa; p=KEY');
    expect(find('TXT', '_dmarc.example.com')).toBe('v=DMARC1; p=quarantine; rua=mailto:admin@example.com');
    expect(find('PTR', 'this server\'s IP')).toBe('mail.example.com');
    expect(dnsRecords(mail).find(r => r.name === 'mail._domainkey.example.com')?.value).toMatch(/not made yet/);
  });

  it('prints one aligned line per record', () => {
    const text = dnsNote(dnsRecords(mail, 'v=DKIM1; p=K'));
    expect(text.split('\n')).toHaveLength(dnsRecords(mail).length);
    expect(text).toMatch(/^A +play\.example\.com +this server$/m);
  });
});

describe('mailboxes', () => {
  it('adds a mailbox with its bcrypt hash, in the format Dovecot reads', () => {
    expect(setMailbox('', 'admin@example.com', hash)).toBe(`admin@example.com|{BLF-CRYPT}${hash}\n`);
  });

  it('replaces the same mailbox and keeps the others', () => {
    const two = setMailbox(setMailbox('', 'admin@example.com', hash), 'bob@example.com', hash);
    const changed = setMailbox(two, 'Admin@Example.com', '$2b$12$new');
    expect(mailboxes(changed)).toEqual(['bob@example.com', 'admin@example.com']);
    expect(changed).toContain('admin@example.com|{BLF-CRYPT}$2b$12$new');
    expect(changed).toContain(`bob@example.com|{BLF-CRYPT}${hash}`);
  });

  it('removes one mailbox', () => {
    const two = setMailbox(setMailbox('', 'admin@example.com', hash), 'bob@example.com', hash);
    expect(mailboxes(removeMailbox(two, 'bob@example.com'))).toEqual(['admin@example.com']);
    expect(mailboxes('')).toEqual([]);
  });
});

describe('DKIM key', () => {
  // What `setup config dkim` writes (docker-mailserver 16), key shortened.
  const txt = [
    'mail._domainkey\tIN\tTXT\t( "v=DKIM1; h=sha256; k=rsa; "',
    '\t  "p=MIIBIjANBgkq+HJGRD4r/"',
    '\t  "CAKF6IvETeXKmEJcvrC1AQAB" )  ; ----- DKIM key mail for example.com',
  ].join('\n');

  it('joins the quoted parts of the key file into one TXT value', () => {
    expect(dkimRecord(txt)).toBe('v=DKIM1; h=sha256; k=rsa; p=MIIBIjANBgkq+HJGRD4r/CAKF6IvETeXKmEJcvrC1AQAB');
  });

  it('gives nothing for a file without a key', () => {
    expect(dkimRecord('')).toBeUndefined();
    expect(dkimRecord('garbage')).toBeUndefined();
  });

  it('lives in the mail folder of the state folder, under the domain', () => {
    expect(dkimFile(mail, '/etc/mu-server/mail').replace(/\\/g, '/')).toBe('/etc/mu-server/mail/opendkim/keys/example.com/mail.txt');
  });
});

describe('mail backup', () => {
  const compose = readFileSync(`${import.meta.dirname}/../../stack/compose.yml`, 'utf8');

  it('archives every mail folder the mail server mounts', () => {
    for (const dir of MAIL_DIRS) expect(compose).toContain(`:/${dir}`);
    expect(mailBackupCommand()).toEqual(['tar', '-czf', `/backup/${MAIL_ARCHIVE}`, '-C', '/', ...MAIL_DIRS]);
    expect(MAIL_DIRS).toEqual(['var/mail', 'var/mail-state', 'tmp/docker-mailserver']);
  });

  it('empties the folders before it unpacks, so a restore leaves no newer mailbox behind', () => {
    const script = mailRestoreScript();
    expect(script.indexOf('find /var/mail /var/mail-state /tmp/docker-mailserver -mindepth 1 -delete')).toBe(0);
    expect(script).toContain(`tar -xzf /backup/${MAIL_ARCHIVE} -C /`);
  });
});
