// A fresh server, start to finish. `adopt.ts` reuses the same steps around an imported database.
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { DEFAULTS, clientOrigin, type Config } from '../config';
import { Stack, dockerProblem } from '../docker';
import { checks, waitForOpenMu } from '../health';
import { installLauncher } from '../launcher';
import { openFirewall } from '../firewall';
import { busyPorts, holder } from '../ports';
import { buildOpenMuFromSource, checkoutOpenMu } from '../openmu';
import type { Paths } from '../paths';
import { saveState } from '../state';
import { stamp } from '../backup';
import { ui, pc } from '../ui';
import { newSecret } from '../validate';
import { ask, askGm, type Group } from './questions';

export async function preflight(): Promise<void> {
  const problem = await dockerProblem();
  if (problem) {
    ui.error(problem);
    process.exit(1);
  }
}

/** Stops with a clear message when another program already holds a port the stack publishes. */
export async function ensurePortsFree(c: Config): Promise<void> {
  const busy = await busyPorts(c);
  if (!busy.length) return;
  for (const port of busy) ui.error(`Port ${port} is taken by ${await holder(port)}.`);
  ui.info('Stop that program (or move it to another port) and run the installer again.');
  process.exit(1);
}

export function logFile(p: Paths, name: string): string {
  mkdirSync(join(p.state, 'logs'), { recursive: true });
  return join(p.state, 'logs', `${name}-${stamp()}.log`);
}

/** Gets OpenMU, builds every image. Throws with the log's path when a build fails. */
export async function buildAll(stack: Stack, log: string): Promise<void> {
  const { config: c, paths: p } = stack;
  await ui.task(`Getting OpenMU ${c.openmuSourceRef || c.openmuVersion}`, () => checkoutOpenMu(c, p));
  if (c.openmuSourceRef) await ui.task('Building OpenMU from source', line => buildOpenMuFromSource(c, p, log, line));
  await stack.validate();
  await ui.task('Building the server and the client (the first time takes 10-20 minutes)', async line => {
    if ((await stack.build(log, line)) !== 0) throw new Error(`The build failed; see ${log}`);
  });
}

export async function lockTestAccounts(stack: Stack): Promise<void> {
  const r = await stack.once('register', ['bun', 'register/server/accountsCli.ts', 'lock-test-accounts']);
  if (r.code !== 0) throw new Error(r.err);
  ui.ok(`OpenMU's public test accounts: ${r.out}`);
}

export async function createGm(stack: Stack, gm: { login: string; password: string }): Promise<void> {
  const r = await stack.once('register', ['bun', 'register/server/accountsCli.ts', 'gm', gm.login], { input: gm.password });
  if (r.code !== 0) throw new Error(`Could not create ${gm.login}: ${r.err}`);
  ui.ok(`Game Master account ${pc.bold(gm.login)} created`);
}

export async function finish(stack: Stack): Promise<void> {
  const c = stack.config;
  await ui.task('Starting everything', () => stack.up());
  const results = await ui.task('Checking every service', async () => {
    const until = Date.now() + 120_000;
    let r = await checks(stack);
    while (!r.every(x => x.ok) && Date.now() < until) {
      await Bun.sleep(3000);
      r = await checks(stack);
    }
    return r;
  });
  ui.note(results.map(r => `${r.ok ? pc.green('ok  ') : pc.red('DOWN')}  ${r.name}`).join('\n'), 'Health');

  if (await ui.confirm('Open the firewall for the web ports (and keep SSH open)?', true)) await openFirewall(c);
  await installLauncher(stack.paths);

  const admin = c.mode === 'domain' ? `https://admin.${c.domain}` : `http://${c.publicIp}:8080`;
  ui.note(
    [
      `Play:         ${pc.cyan(clientOrigin(c))}`,
      `Admin panel:  ${pc.cyan(admin)}  (login ${c.adminUser})`,
      `Settings:     ${stack.paths.state}`,
      '',
      `Manage it with ${pc.bold('mu')}: mu status, mu update, mu config, mu logs, mu backup`,
    ].join('\n'),
    'Your server is up',
  );
}

export async function install(p: Paths): Promise<void> {
  ui.intro('MU server installer');
  await preflight();

  let c: Config = {
    ...DEFAULTS,
    escrowSecret: newSecret(),
    marketTicketSecret: newSecret(),
    shopTicketSecret: newSecret(),
  };
  for (const group of ['address', 'listing', 'passwords', 'features'] as Group[]) c = await ask(c, group);
  const gm = await askGm();
  ui.warn(`${pc.bold('Write your passwords down now.')} They are not shown again and cannot be recovered.`);
  await ui.confirm('Written down?', true);
  await ensurePortsFree(c);

  saveState(c, p);
  const stack = new Stack(c, p);
  const log = logFile(p, 'install');
  await buildAll(stack, log);

  await ui.task('Starting OpenMU (the first start creates the database)', async line => {
    await stack.up('database', 'openmu-startup');
    await waitForOpenMu(stack, undefined, line);
  });
  await lockTestAccounts(stack);
  await createGm(stack, gm);
  await finish(stack);
  ui.outro('Done. Have fun!');
}
