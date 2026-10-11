// End-to-end run of the install steps without questions, in IP mode on this machine. Needs Docker.
// Usage: MU_STATE=<empty folder> bun install/cli/e2e.ts [all|config|build|start|check|backup|down]
// `config` only checks out OpenMU and validates the merged compose files (no images; what CI runs).
// `check` also plays the game through the proxy as the test GM (loginCheck.ts).
// Ports 80, 3000, 8080, 8081 must be free. `down` removes the containers and volumes again.
import { backup } from './backup';
import { createGm, buildAll, lockTestAccounts, logFile } from './commands/install';
import { DEFAULTS, type Config } from './config';
import { Stack } from './docker';
import { checks, waitForOpenMu, type Check } from './health';
import { loginCheck } from './loginCheck';
import { checkoutOpenMu } from './openmu';
import { paths } from './paths';
import { PORTS } from './stack';
import { loadConfig, saveState } from './state';
import { newSecret } from './validate';

/** The test Game Master the run creates; OpenMU's public test accounts are locked. */
const GM = { login: 'e2egm', password: 'E2e-gm1' };
const p = paths();
if (!process.env.MU_STATE) throw new Error('Set MU_STATE to a scratch folder; this must not touch a real install.');

const c: Config = loadConfig(p) ?? {
  ...DEFAULTS,
  mode: 'ip',
  publicIp: '127.0.0.1',
  postgresPassword: 'E2e-pass-1234',
  adminHash: await Bun.password.hash('E2e-admin-123', { algorithm: 'bcrypt', cost: 12 }),
  escrowSecret: newSecret(),
  marketTicketSecret: newSecret(),
  shopTicketSecret: newSecret(),
};
saveState(c, p);
const stack = new Stack(c, p);

/** One line per check; any failure ends the run with exit code 1. */
function report(results: Check[], failed: string): void {
  for (const r of results) console.log(`${r.ok ? 'ok  ' : failed}  ${r.name}`);
  if (!results.every(r => r.ok)) process.exit(1);
}

const step = process.argv[2] ?? 'all';
const all = step === 'all';

if (step === 'config') {
  await checkoutOpenMu(c, p);
  await stack.validate();
  console.log('compose files valid');
}
if (all || step === 'build') await buildAll(stack, logFile(p, 'e2e'));
if (all || step === 'start') {
  await stack.up('database', 'openmu-startup');
  await waitForOpenMu(stack);
  await lockTestAccounts(stack);
  await createGm(stack, GM);
  await stack.up();
}
if (all || step === 'check') {
  let results = await checks(stack);
  for (let i = 0; i < 40 && !results.every(r => r.ok); i++) {
    await Bun.sleep(3000);
    results = await checks(stack);
  }
  report(results, 'DOWN');
  // The game itself, as a client plays it: logins and what our plugins do with a session's packets.
  const game = await loginCheck({
    url: `ws://127.0.0.1:${PORTS.proxy}/?host=127.0.0.1&port=${PORTS.firstGame}`,
    ...GM,
    logsSince: async since => (await stack.compose(['logs', '--no-color', '--since', since, 'openmu-startup'])).out,
  });
  report(game, 'FAIL');
}
if (step === 'backup') console.log(await backup(stack, 'e2e'));
if (step === 'down') await stack.compose(['down', '--volumes']);
