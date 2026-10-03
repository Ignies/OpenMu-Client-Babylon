import { MonsterRegistry, type MonsterDef } from '@/controllers/monsters';

/**
 * Every monster folder's data (`<name>/index.ts`), found by glob in the client build and in tests,
 * and read from disk by the Bun servers (no Vite there). Adding a monster is adding a folder.
 */
function monsterFiles(): MonsterDef[] {
  try {
    return Object.values(import.meta.glob<MonsterDef>('./*/index.ts', { eager: true, import: 'default' }));
  } catch {
    // Bun only: `require` loads TypeScript synchronously, and node:fs never reaches the browser bundle.
    const { existsSync, readdirSync } = require('node:fs') as typeof import('node:fs');
    const here = import.meta.dir;
    return readdirSync(here, { withFileTypes: true })
      .filter(d => d.isDirectory() && existsSync(`${here}/${d.name}/index.ts`))
      .map(d => require(`${here}/${d.name}/index.ts`).default as MonsterDef);
  }
}

export const monsters = new MonsterRegistry(monsterFiles());
