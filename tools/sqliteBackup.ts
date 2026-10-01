// Copies every SQLite database under <from> into <to>, consistent while the services keep running (VACUUM INTO).
// Usage: bun tools/sqliteBackup.ts <from> <to>   (the installer runs it in a services container)
import { Database } from 'bun:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';

const [from, to] = process.argv.slice(2);
if (!from || !to) throw new Error('usage: sqliteBackup.ts <from> <to>');

for await (const file of new Bun.Glob('**/*.sqlite').scan({ cwd: from, absolute: true })) {
  const out = join(to, relative(from, file));
  mkdirSync(dirname(out), { recursive: true });
  const db = new Database(file, { readonly: true });
  db.run(`VACUUM INTO '${out.replace(/'/g, "''")}'`);
  db.close();
  console.log(relative(from, file));
}
