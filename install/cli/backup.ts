// Backups: the OpenMU database (pg_dump) and every service's SQLite file, into one dated folder.
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Stack } from './docker';
import { files } from './paths';

const KEEP = 10;
const DUMP = 'openmu.dump';
/** OpenMU's own login roles (config, account, guild, friend): cluster-wide, so not in the dump. */
const ROLES = 'roles.sql';
const DATA = 'data';

/** Our `postgres` password stays ours: an imported role file never sets it. */
export function withoutPostgresRole(sql: string): string {
  return sql.split('\n').filter(line => !/\bROLE postgres\b/.test(line)).join('\n');
}

export function stamp(now = new Date()): string {
  return now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
}

/** Writes a backup and returns its folder. Services keep running. */
export async function backup(stack: Stack, label = ''): Promise<string> {
  const dir = join(stack.paths.backups, stamp() + (label ? `-${label}` : ''));
  mkdirSync(join(dir, DATA), { recursive: true, mode: 0o700 });

  const dump = Bun.spawn(['docker', ...stack.command(), 'exec', '-T', 'database', 'pg_dump', '-U', 'postgres', '-Fc', 'openmu'], {
    stdout: Bun.file(join(dir, DUMP)),
    stderr: 'pipe',
  });
  if ((await dump.exited) !== 0) throw new Error(`pg_dump failed: ${await new Response(dump.stderr).text()}`);

  const roles = await stack.exec('database', ['pg_dumpall', '-U', 'postgres', '--roles-only']);
  if (roles.code !== 0) throw new Error(`pg_dumpall failed: ${roles.err}`);
  writeFileSync(join(dir, ROLES), withoutPostgresRole(roles.out));

  const copy = await stack.once('register', ['bun', 'tools/sqliteBackup.ts', '/data', '/backup'], { binds: [`${join(dir, DATA)}:/backup`] });
  if (copy.code !== 0) throw new Error(`SQLite backup failed: ${copy.err}`);

  copyFileSync(files(stack.paths).config, join(dir, 'mu.env'));
  prune(stack.paths.backups);
  return dir;
}

/** Puts a backup back. Everything but the database stops while it happens. */
export async function restore(stack: Stack, dir: string): Promise<void> {
  if (!existsSync(join(dir, DUMP))) throw new Error(`${dir} has no ${DUMP}.`);
  const others = ['web', 'ops', 'marketplace', 'cashshop', 'register', 'proxy', 'openmu-startup'];
  await stack.stop(...others);
  await stack.up('database');

  const psql = (sql: string) => stack.exec('database', ['psql', '-U', 'postgres', '-d', 'postgres', '-c', sql]);
  // Roles that already exist just report so; the rest are created with their original passwords.
  if (existsSync(join(dir, ROLES))) await stack.exec('database', ['psql', '-U', 'postgres', '-d', 'postgres'], readFileSync(join(dir, ROLES), 'utf8'));
  await psql('DROP DATABASE IF EXISTS openmu WITH (FORCE)');
  await psql('CREATE DATABASE openmu');
  const load = Bun.spawn(['docker', ...stack.command(), 'exec', '-T', 'database', 'pg_restore', '-U', 'postgres', '-d', 'openmu'], {
    stdin: Bun.file(join(dir, DUMP)),
    stderr: 'pipe',
  });
  if ((await load.exited) !== 0) throw new Error(`pg_restore failed: ${await new Response(load.stderr).text()}`);

  const put = await stack.once('register', ['sh', '-c', 'find /data -name "*.sqlite*" -delete && cp -r /backup/. /data/'], {
    binds: [`${join(dir, DATA)}:/backup:ro`],
  });
  if (put.code !== 0) throw new Error(`Restoring the SQLite files failed: ${put.err}`);
  await stack.up();
}

export function listBackups(root: string): string[] {
  return existsSync(root) ? readdirSync(root).filter(d => existsSync(join(root, d, DUMP))).sort().reverse() : [];
}

function prune(root: string): void {
  for (const old of listBackups(root).slice(KEEP)) rmSync(join(root, old), { recursive: true, force: true });
}
