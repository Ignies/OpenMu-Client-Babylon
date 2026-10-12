// `mu mail`: the hosted mail server's mailboxes and DNS records. See install/readme.md.
import { existsSync, readFileSync } from 'node:fs';
import type { Config } from '../config';
import { Stack } from '../docker';
import { files, type Paths } from '../paths';
import { adminMailbox, dkimFile, dkimRecord, dnsNote, dnsRecords, mailOn, mailboxes, removeMailbox, setMailbox } from '../render/mail';
import { readMailAccounts, saveState, writeMailAccounts } from '../state';
import { ui, pc } from '../ui';
import * as check from '../validate';

const MAIL_HELP =`mu mail [add|remove|passwd <address> | list | dns]`;

/** The DKIM TXT value, once the key exists. */
export function readDkim(c: Config, p: Paths): string | undefined {
  const file = dkimFile(c, files(p).mail);
  return existsSync(file) ? dkimRecord(readFileSync(file, 'utf8')) : undefined;
}

/**
 * Makes the DKIM key the first time, in a one-off container of the mail server's image (no start needed).
 * OpenDKIM reads keys when it starts, so a running mail server is restarted.
 */
export async function ensureDkim(stack: Stack): Promise<void> {
  const c = stack.config;
  if (!mailOn(c) || readDkim(c, stack.paths)) return;
  const r = await stack.once('mailserver', ['setup', 'config', 'dkim', 'domain', c.domain]);
  if (r.code !== 0) throw new Error(`Could not make the DKIM key: ${r.err || r.out}`);
  if ((await stack.states()).some(s => s.service === 'mailserver' && s.state === 'running')) await stack.compose(['restart', 'mailserver']);
}

export function printMailDns(c: Config, p: Paths): void {
  ui.note(dnsNote(dnsRecords(c, readDkim(c, p))), 'DNS records (A records point at this server; PTR is set at your VPS provider)');
}

async function newHash(address: string): Promise<string> {
  ui.info(`Mailbox password: ${pc.dim(check.PASSWORD_RULE)}`);
  const password = await ui.password(`Password for ${address}`, v => check.password(v, address.split('@')[0]));
  return Bun.password.hash(password, { algorithm: 'bcrypt', cost: 12 });
}

export async function mail(c: Config, p: Paths, action?: string, arg?: string): Promise<void> {
  if (!mailOn(c)) {
    ui.error(`No mail server here. Turn it on with ${pc.bold('mu config')} > Address (needs a domain).`);
    process.exit(1);
  }
  ui.intro('Mail');
  const what = action ?? (await ui.select('What do you want to do?', [
    { value: 'list', label: 'List the mailboxes' },
    { value: 'add', label: 'Add a mailbox' },
    { value: 'passwd', label: 'Reset a mailbox password' },
    { value: 'remove', label: 'Remove a mailbox' },
    { value: 'dns', label: 'Print the DNS records' },
  ]));
  const accounts = readMailAccounts(p);
  const address = async () => (arg ?? (await ui.text('Address', { placeholder: `bob@${c.domain}`, validate: v => check.mailbox(v, c.domain) }))).toLowerCase();

  switch (what) {
    case 'list':
      ui.note(mailboxes(accounts).join('\n') || 'None.', 'Mailboxes');
      break;
    case 'dns':
      await ui.task('Checking the DKIM key', () => ensureDkim(new Stack(c, p)));
      printMailDns(c, p);
      break;
    case 'add': {
      const a = await address();
      const bad = check.mailbox(a, c.domain) ?? (mailboxes(accounts).includes(a) ? `${a} already exists; use mu mail passwd.` : undefined);
      if (bad) throw new Error(bad);
      writeMailAccounts(p, setMailbox(accounts, a, await newHash(a)));
      ui.outro(`${a} added; it can log in at https://mail.${c.domain} in a few seconds.`);
      break;
    }
    case 'passwd': {
      const a = await address();
      if (!mailboxes(accounts).includes(a)) throw new Error(`No mailbox ${a}.`);
      const hash = await newHash(a);
      // The admin mailbox follows the config, so a later save keeps the new password.
      if (a === adminMailbox(c)) saveState({ ...c, mailAdminHash: hash }, p);
      else writeMailAccounts(p, setMailbox(accounts, a, hash));
      ui.outro(`Password of ${a} changed.`);
      break;
    }
    case 'remove': {
      const a = await address();
      if (a === adminMailbox(c)) throw new Error(`${a} receives the certificate notices; turn the mail server off in mu config instead.`);
      if (!mailboxes(accounts).includes(a)) throw new Error(`No mailbox ${a}.`);
      if (!(await ui.confirm(`Remove ${a}? It can no longer log in (its stored mail stays in the mail volume).`, false))) return;
      writeMailAccounts(p, removeMailbox(accounts, a));
      ui.outro(`${a} removed.`);
      break;
    }
    default:
      ui.info(MAIL_HELP);
  }
}
