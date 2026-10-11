import { registerMonsterModels, type MonsterModelDef } from '@/controllers/monsters';

/**
 * Every monster body file (`<body>.ts`), found by glob in the client build and in tests, and read
 * from disk by the Bun servers. Adding a body is adding a file.
 */
function modelFiles(): MonsterModelDef[] {
  try {
    return Object.values(import.meta.glob<MonsterModelDef>(['./*.ts', '!./all.ts', '!./*.test.ts'], { eager: true, import: 'default' }));
  } catch {
    // Bun only: `require` loads TypeScript synchronously, and node:fs never reaches the browser bundle.
    const { readdirSync } = require('node:fs') as typeof import('node:fs');
    const here = import.meta.dir;
    return readdirSync(here)
      .filter(f => f.endsWith('.ts') && f !== 'all.ts' && !f.endsWith('.test.ts'))
      .map(f => require(`${here}/${f}`).default as MonsterModelDef);
  }
}

registerMonsterModels(modelFiles());
