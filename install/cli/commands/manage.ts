// Everything after install: change settings, update from git, status, logs, backup, restore, uninstall.
import { join } from 'node:path';
import { rmSync } from 'node:fs';
import { backup, listBackups, restore } from '../backup';
import type { Config } from '../config';
import { Stack } from '../docker';
import { must, run } from '../exec';
import { checks } from '../health';
import { isWindows, type Paths } from '../paths';
import { mailOn } from '../render/mail';
import { saveState } from '../state';
import { ui, pc } from '../ui';
import { buildAll, logFile, preflight } from './install';
import { ensureDkim, printMailDns } from './mail';
import { GROUPS, ask } from './questions';

/** Changes that are baked into the client or OpenMU image need a rebuild; the rest only a restart. */
function needsBuild(a: Config, b: Config): boolean {
  return a.mode !== b.mode || a.domain !== b.domain || a.publicIp !== b.publicIp || a.openmuVersion !== b.openmuVersion || a.openmuSourceRef !== b.openmuSourceRef || a.moduleSigningKey !== b.moduleSigningKey || a.liteAssets !== b.liteAssets;
}

export async function configure(c: Config, p: Paths): Promise<void> {
  ui.intro('Change settings');
  const group = await ui.select('What do you want to change?', GROUPS);
  const next = await ask(c, group);
  const stack = new Stack(next, p);

  if (next.postgresPassword !== c.postgresPassword) {
    // The database keeps its first password; change it inside, then everything reconnects with the new one.
    const r = await new Stack(c, p).exec('database', ['psql', '-U', 'postgres', '-c', `ALTER USER postgres PASSWORD '${next.postgresPassword}'`]);
    if (r.code !== 0) throw new Error(`Could not change the database password: ${r.err}`);
  }
  saveState(next, p);
  // Turned off: its containers go (the old config still names the profile); the mail volumes stay.
  if (mailOn(c) && !mailOn(next)) await new Stack(c, p).compose(['rm', '-sf', 'mailserver', 'webmail']);
  if (needsBuild(c, next)) await buildAll(stack, logFile(p, 'config'));
  if (mailOn(next)) await ui.task('Checking the mail server\'s DKIM key', () => ensureDkim(stack));
  await ui.task('Applying', async () => {
    await stack.up();
    await stack.compose(['restart', 'web']);
  });
  if (mailOn(next) && !mailOn(c)) printMailDns(next, p);
  ui.outro('Saved and applied.');
}

export async function update(c: Config, p: Paths): Promise<void> {
  ui.intro('Update');
  await preflight();
  const git = (...args: string[]) => must('git', ['-C', p.repo, ...args]);
  if (await git('status', '--porcelain', '--untracked-files=no')) {
    ui.error(`There are local changes in ${p.repo}. Commit or discard them first (git status shows them).`);
    process.exit(1);
  }
  await ui.task('Checking GitHub', () => git('fetch', '-q', 'origin', c.branch));
  const news = await git('log', '--oneline', `HEAD..origin/${c.branch}`);
  if (!news) {
    ui.outro('Already up to date.');
    return;
  }
  ui.note(news, 'New');
  if (!(await ui.confirm('Install these?', true))) return;

  const stack = new Stack(c, p);
  const saved = await ui.task('Backing up first', () => backup(stack, 'before-update'));
  const before = await git('rev-parse', 'HEAD');
  try {
    await git('merge', '--ff-only', '-q', `origin/${c.branch}`);
    saveState(c, p);
    await buildAll(stack, logFile(p, 'update'));
    await ui.task('Restarting', () => stack.up());
    const failed = (await checks(stack)).filter(r => !r.ok);
    if (failed.length) throw new Error(`Not answering after the update: ${failed.map(f => f.name).join(', ')}`);
    ui.outro('Updated.');
  } catch (e) {
    ui.error(String((e as Error).message));
    ui.warn('Going back to the previous version.');
    await git('reset', '--hard', '-q', before);
    saveState(c, p);
    await buildAll(stack, logFile(p, 'rollback'));
    await stack.up();
    ui.note(`If the data needs to go back too: ${pc.bold(`mu restore ${saved}`)}`, 'Rolled back');
    process.exit(1);
  }
}

export async function status(c: Config, p: Paths): Promise<void> {
  const stack = new Stack(c, p);
  const states = await stack.states();
  ui.note(states.map(s => `${s.state === 'running' ? pc.green('running') : pc.red(s.state.padEnd(7))}  ${s.service}${s.health ? pc.dim(` (${s.health})`) : ''}`).join('\n') || 'Nothing is running.', 'Containers');
  const results = await checks(stack);
  ui.note(results.map(r => `${r.ok ? pc.green('ok  ') : pc.red('DOWN')}  ${r.name}`).join('\n'), 'Services');
  if (mailOn(c)) printMailDns(c, p);
}

export async function logs(c: Config, p: Paths, service?: string): Promise<void> {
  await new Stack(c, p).logs(service);
}

export async function backupNow(c: Config, p: Paths): Promise<void> {
  const dir = await ui.task('Backing up', () => backup(new Stack(c, p)));
  ui.outro(`Saved to ${dir}`);
}

export async function restoreBackup(c: Config, p: Paths, wanted?: string): Promise<void> {
  ui.intro('Restore');
  const all = listBackups(p.backups);
  if (!all.length) {
    ui.outro('No backups yet.');
    return;
  }
  const name = wanted ?? (await ui.select('Which backup?', all.map(b => ({ value: b, label: b }))));
  if (!(await ui.confirm(`Replace the current data with ${name}? Players are disconnected while it runs.`, false))) return;
  await ui.task('Restoring', () => restore(new Stack(c, p), wanted && wanted.includes('/') ? wanted : join(p.backups, name)));
  ui.outro('Restored.');
}

export async function uninstall(c: Config, p: Paths): Promise<void> {
  ui.intro('Uninstall');
  if (!(await ui.confirm('Stop and remove the server containers?', false))) return;
  const wipe = (await ui.text(`Type ${pc.bold('DELETE')} to also erase the database and all data (anything else keeps it)`, { initial: '' })) === 'DELETE';
  const stack = new Stack(c, p);
  if (wipe) await backup(stack, 'before-uninstall').catch(() => undefined);
  await stack.compose(['down', ...(wipe ? ['--volumes'] : [])]);
  if (!isWindows) await run('rm', ['-f', '/usr/local/bin/mu']);
  if (wipe) rmSync(join(p.state, 'openmu'), { recursive: true, force: true });
  ui.outro(wipe ? `Removed. A last backup is in ${p.backups}.` : `Containers removed; data and settings kept in ${p.state}.`);
}
