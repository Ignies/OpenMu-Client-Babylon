// Moves an existing, hand-made server into this setup: its OpenMU database, its roles and every
// service's SQLite file are staged as a backup, then restored into the new stack. The old server is
// only stopped, never deleted, so it can be started again if anything goes wrong.
import { Database } from 'bun:sqlite';
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { restore, stamp, withoutPostgresRole } from '../backup';
import { DEFAULTS, type Config } from '../config';
import { Stack } from '../docker';
import { must, run } from '../exec';
import { checkoutOpenMu } from '../openmu';
import { isWindows, type Paths } from '../paths';
import { saveState } from '../state';
import { ui, pc } from '../ui';
import { newSecret } from '../validate';
import { buildAll, ensurePortsFree, finish, lockTestAccounts, logFile, preflight } from './install';
import { ask, type Group } from './questions';

/** Where the hand-made setup kept each service's SQLite file, and where it goes in the new data volume. */
function sqliteFiles(): { from: string; to: string }[] {
  const homes = isWindows ? [homedir()] : ['/root', ...(existsSync('/home') ? readdirSync('/home').map(u => join('/home', u)) : [])];
  const found = [
    ...homes.flatMap(h => [
      { from: join(h, '.mu-cashshop', 'shop.sqlite'), to: 'cashshop/shop.sqlite' },
      { from: join(h, '.mu-marketplace', 'market.sqlite'), to: 'marketplace/market.sqlite' },
      { from: join(h, '.mu-proxy', 'track.sqlite'), to: 'proxy/track.sqlite' },
    ]),
    { from: '/var/lib/mu-register/signups.sqlite', to: 'register/signups.sqlite' },
    { from: '/var/lib/mu-ops/ops.sqlite', to: 'ops/ops.sqlite' },
  ];
  return found.filter(f => existsSync(f.from));
}

async function postgresContainers(): Promise<string[]> {
  const r = await run('docker', ['ps', '--format', '{{.Names}}\t{{.Image}}']);
  return r.out.split('\n').filter(l => /\tpostgres/.test(l)).map(l => l.split('\t')[0]).filter(n => !n.startsWith('mu-'));
}

/** The newest EF migration the old database has applied. */
async function lastMigration(container: string): Promise<string> {
  return must('docker', ['exec', container, 'psql', '-U', 'postgres', '-d', 'openmu', '-tAc', 'SELECT max("MigrationId") FROM "__EFMigrationsHistory"']);
}

function knownMigration(p: Paths, id: string): boolean {
  const dir = join(p.openmu, 'src', 'Persistence', 'EntityFramework', 'Migrations');
  return existsSync(dir) && readdirSync(dir).some(f => f.startsWith(id));
}

export async function adopt(p: Paths): Promise<void> {
  ui.intro('Adopt an existing server');
  await preflight();

  const containers = await postgresContainers();
  if (!containers.length) {
    ui.error('No running Postgres container found. Start the old OpenMU (its database at least) and run this again.');
    process.exit(1);
  }
  const old = await ui.select('Which container holds the OpenMU database?', containers.map(n => ({ value: n, label: n })), containers.includes('database') ? 'database' : undefined);
  const migration = await lastMigration(old);
  const sqlite = sqliteFiles();
  ui.note([`Database: ${old} (migration ${migration})`, ...sqlite.map(f => `${f.from}  ->  ${f.to}`)].join('\n'), 'Found');

  let c: Config = { ...DEFAULTS, escrowSecret: newSecret(), marketTicketSecret: newSecret(), shopTicketSecret: newSecret() };
  for (const group of ['address', 'listing', 'passwords', 'features'] as Group[]) c = await ask(c, group);

  // The OpenMU we run must know the database's last migration, or it refuses to start.
  for (;;) {
    await ui.task(`Getting OpenMU ${c.openmuSourceRef || c.openmuVersion}`, () => checkoutOpenMu(c, p));
    if (knownMigration(p, migration)) break;
    ui.warn(`OpenMU ${c.openmuSourceRef || c.openmuVersion} does not know ${migration}; the database is newer. Pick the latest main branch, or the commit the old server ran.`);
    c = await ask(c, 'openmu');
  }

  const stage = join(p.backups, `${stamp()}-adopted`);
  await ui.task('Copying the old data', async () => {
    mkdirSync(join(stage, 'data'), { recursive: true, mode: 0o700 });
    const dump = Bun.spawn(['docker', 'exec', old, 'pg_dump', '-U', 'postgres', '-Fc', 'openmu'], { stdout: Bun.file(join(stage, 'openmu.dump')), stderr: 'pipe' });
    if ((await dump.exited) !== 0) throw new Error(`pg_dump failed: ${await new Response(dump.stderr).text()}`);
    writeFileSync(join(stage, 'roles.sql'), withoutPostgresRole(await must('docker', ['exec', old, 'pg_dumpall', '-U', 'postgres', '--roles-only'])));
    for (const f of sqlite) {
      const out = join(stage, 'data', f.to);
      mkdirSync(join(out, '..'), { recursive: true });
      const db = new Database(f.from, { readonly: true });
      db.run(`VACUUM INTO '${out.replace(/'/g, "''")}'`);
      db.close();
    }
  });

  ui.warn('The old server must stop now: the new one takes over ports 80 and 443. It is stopped, not deleted.');
  if (!(await ui.confirm('Stop the old server?', true))) return;
  const openmuNames = new Set([old, 'database', 'openmu-startup', 'nginx-80', 'nginx-443', 'certbot']);
  const oldNames = (await run('docker', ['ps', '--format', '{{.Names}}'])).out.split('\n').filter(n => openmuNames.has(n));
  if (oldNames.length) await run('docker', ['stop', ...oldNames]);
  if (!isWindows) {
    const units = (await run('sh', ['-c', "systemctl list-units --type=service --state=running --plain --no-legend 'mu-*' caddy nginx 2>/dev/null | cut -d' ' -f1"])).out.split('\n').filter(Boolean);
    for (const unit of units) await run('systemctl', ['disable', '--now', unit]);
    if (units.length) ui.info(`Stopped: ${units.join(', ')}`);
  }

  await ensurePortsFree(c);
  saveState(c, p);
  const stack = new Stack(c, p);
  await buildAll(stack, logFile(p, 'adopt'));
  await ui.task('Moving the data in (OpenMU then upgrades it if needed)', () => restore(stack, stage));
  await lockTestAccounts(stack);
  await finish(stack);
  ui.note(`Old containers: ${oldNames.join(', ') || 'none'}\nStart them again with: docker start <name>`, 'The old server is stopped, not deleted');
  ui.outro(`Adopted. The imported data is also kept as a backup in ${pc.bold(stage)}.`);
}
