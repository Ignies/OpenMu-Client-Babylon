import {
  registerAnimations,
  registerMonsterCasts,
  registerMonsterSwings,
  type AnimationDef,
  type MonsterCastDef,
  type MonsterSwingDef,
} from '@/controllers/anim';

/**
 * Every animation file, found by glob in the client build and in tests, and read from disk under Bun
 * (no Vite there): the player clips (`<action>.ts`), the monster swing rules (`monster_swings/`) and
 * what a monster's cast plays per skill (`monster_casts/`). Adding a clip is adding a file.
 */
function files<T>(glob: () => Record<string, T>, dir: string, skip: string[] = []): T[] {
  try {
    return Object.values(glob());
  } catch {
    // Bun only: `require` loads TypeScript synchronously, and node:fs never reaches the browser bundle.
    const { readdirSync } = require('node:fs') as typeof import('node:fs');
    const here = `${import.meta.dir}/${dir}`;
    return readdirSync(here)
      .filter(f => f.endsWith('.ts') && !f.endsWith('.test.ts') && !skip.includes(f))
      .map(f => require(`${here}/${f}`).default as T);
  }
}

registerAnimations(
  files<AnimationDef>(
    () => import.meta.glob<AnimationDef>(['./*.ts', '!./all.ts', '!./write_enum.ts', '!./*.test.ts'], { eager: true, import: 'default' }),
    '.',
    ['all.ts', 'write_enum.ts']
  )
);
registerMonsterSwings(
  files<MonsterSwingDef>(() => import.meta.glob<MonsterSwingDef>('./monster_swings/*.ts', { eager: true, import: 'default' }), 'monster_swings')
);
registerMonsterCasts(
  files<MonsterCastDef>(() => import.meta.glob<MonsterCastDef>('./monster_casts/*.ts', { eager: true, import: 'default' }), 'monster_casts')
);
