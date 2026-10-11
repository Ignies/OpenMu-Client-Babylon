// The optional mail server (docker-mailserver) and webmail (Roundcube) at mail.<domain>: switch, env, mailboxes.
import type { Config } from '../config';
import { PORTS } from '../stack';

type Env = Record<string, string>;
export type CertEmail = 'none' | 'own' | 'host';

/** Mail runs only with a domain: it needs MX records and a certificate. */
export function mailOn(c: Config): boolean {
  return c.mail && c.mode === 'domain' && !!c.domain;
}

export function mailHost(c: Config): string {
  return c.domain ? `mail.${c.domain}` : 'mail.localhost';
}

export function adminMailbox(c: Config): string {
  return `admin@${c.domain}`;
}

/** The ports the mail server publishes, in the firewall's order. */
export const MAIL_PORTS = [PORTS.smtp, PORTS.submissions, PORTS.submission, PORTS.imaps];

export function certEmailKind(c: Config): CertEmail {
  return c.mail ? 'host' : c.email ? 'own' : 'none';
}

/** The certificate e-mail question's answer: none, the owner's address, or the hosted admin mailbox. */
export function withCertEmail(c: Config, kind: CertEmail, own = ''): Config {
  if (kind === 'host') return { ...c, mail: true, email: adminMailbox(c) };
  return { ...c, mail: false, email: kind === 'own' ? own.trim() : '' };
}

/**
 * Caddy gets the certificate for mail.<domain> (the webmail site) and the mail server reads it from Caddy's
 * volume, mounted at /caddy: no second ACME client fighting Caddy for port 80. The site pins Let's Encrypt
 * so the path is known.
 */
export function certFiles(c: Config): { cert: string; key: string } {
  const host = mailHost(c);
  const dir = `/caddy/caddy/certificates/acme-v02.api.letsencrypt.org-directory/${host}`;
  return { cert: `${dir}/${host}.crt`, key: `${dir}/${host}.key` };
}

export function mailserverEnv(c: Config): Env {
  const { cert, key } = certFiles(c);
  return {
    SSL_TYPE: 'manual',
    SSL_CERT_PATH: cert,
    SSL_KEY_PATH: key,
    POSTMASTER_ADDRESS: adminMailbox(c),
    // A mailbox may only send as itself.
    SPOOF_PROTECTION: '1',
    // The DKIM key `mu mail dns` prints is OpenDKIM's (the image's default signer).
    ENABLE_OPENDKIM: '1',
  };
}

/** Roundcube reaches the mail server by its public name (a network alias), so the certificate matches. */
export function webmailEnv(c: Config): Env {
  const host = mailHost(c);
  return {
    ROUNDCUBEMAIL_DEFAULT_HOST: `ssl://${host}`,
    ROUNDCUBEMAIL_DEFAULT_PORT: String(PORTS.imaps),
    ROUNDCUBEMAIL_SMTP_SERVER: `tls://${host}`,
    ROUNDCUBEMAIL_SMTP_PORT: String(PORTS.submission),
    ROUNDCUBEMAIL_USERNAME_DOMAIN: c.domain,
    ROUNDCUBEMAIL_DB_TYPE: 'sqlite',
  };
}

export type DnsRecord = { type: 'A' | 'MX' | 'TXT' | 'PTR'; name: string; value: string };

/** What the owner adds at the DNS provider: the web hosts, and with mail what delivery needs. */
export function dnsRecords(c: Config, dkim?: string): DnsRecord[] {
  const d = c.domain;
  const web: DnsRecord[] = ['play', 'ws', 'register', 'api', 'admin'].map(s => ({ type: 'A', name: `${s}.${d}`, value: 'this server' }));
  if (!mailOn(c)) return web;
  const host = mailHost(c);
  return [
    ...web,
    { type: 'A', name: host, value: 'this server' },
    { type: 'MX', name: d, value: `10 ${host}` },
    { type: 'TXT', name: d, value: 'v=spf1 mx -all' },
    { type: 'TXT', name: `mail._domainkey.${d}`, value: dkim ?? '(the DKIM key is not made yet: the mail server makes it on its first start)' },
    { type: 'TXT', name: `_dmarc.${d}`, value: `v=DMARC1; p=quarantine; rua=mailto:${adminMailbox(c)}` },
    { type: 'PTR', name: "this server's IP", value: host },
  ];
}

export function dnsNote(rows: DnsRecord[]): string {
  const width = Math.max(...rows.map(r => r.name.length)) + 2;
  return rows.map(r => `${r.type.padEnd(5)} ${r.name.padEnd(width)}${r.value}`).join('\n');
}

/** `postfix-accounts.cf`: one `address|{BLF-CRYPT}<bcrypt>` line per mailbox (Dovecot checks bcrypt itself). */
export function mailboxes(text: string): string[] {
  return text.split(/\r?\n/).map(line => line.split('|')[0].trim()).filter(Boolean);
}

export function removeMailbox(text: string, address: string): string {
  const lower = address.toLowerCase();
  const kept = text.split(/\r?\n/).filter(line => line.trim() && line.split('|')[0].trim().toLowerCase() !== lower);
  return kept.length ? kept.join('\n') + '\n' : '';
}

export function setMailbox(text: string, address: string, bcrypt: string): string {
  return removeMailbox(text, address) + `${address.toLowerCase()}|{BLF-CRYPT}${bcrypt}\n`;
}
