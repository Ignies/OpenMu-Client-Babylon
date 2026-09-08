import { Database } from 'bun:sqlite';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Apply the `.sql` files in a service's `migrations/` folder, in name order.
 *
 * The point is that the schema exists in exactly one place: a committed file
 * an operator can run against the production database by hand, and the same
 * file the service applies on a fresh box. A `CREATE TABLE` written inline in
 * TypeScript works, but it is invisible to whoever has to reproduce it, which
 * is how a live database and a repository drift apart.
 *
 * What has been applied is recorded, so a re-run is cheap; the statements are
 * written to be idempotent anyway, so applying one by hand and letting the
 * service apply it too is harmless.
 */
export function migrate(db: Database, migrationsDir: string): string[] {
  db.run(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name       TEXT PRIMARY KEY,
      applied_at INTEGER NOT NULL
    )
  `);

  const applied = new Set(
    db
      .query<{ name: string }, []>('SELECT name FROM schema_migrations')
      .all()
      .map(row => row.name)
  );

  const pending = readdirSync(migrationsDir)
    .filter(name => name.endsWith('.sql'))
    .sort()
    .filter(name => !applied.has(name));

  const record = db.query<unknown, [string, number]>(
    'INSERT INTO schema_migrations (name, applied_at) VALUES (?, ?)'
  );

  for (const name of pending) {
    const sql = readFileSync(join(migrationsDir, name), 'utf8');
    // One transaction per file: a half-applied migration is worse than none.
    db.transaction(() => {
      db.run(sql);
      record.run(name, Date.now());
    })();
  }

  return pending;
}

