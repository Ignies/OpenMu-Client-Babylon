import { describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';

// PlayerObject reaches the Store, which needs a browser; nothing here reads it.
vi.mock('@/app/store', () => ({ Store: {}, UIState: {} }));

/**
 * What every object type 0..600 is drawn with: the class `resolveModelFactory` hands out (its name,
 * `OverrideScale`, base, `NpcClass`, `NpcAlwaysFly`, and which types share it), whether
 * `isKnownObjectType` knows it, and the NPC tables the generic factories read (file and scale).
 * Moving NPC content must leave these hashes alone; update them on purpose.
 */
const RESOLVE_HASH = 'bd56c238c83a15d84b030879bbfc3d3ec21953c6f8a35836857ec721b1549c09';
const TABLES_HASH = '0e27e0c3cde4e241cf2dfa54d66b3e9c8267533e17d31266b9f1e9cd8337ade8';

const hash = (v: unknown) => createHash('sha256').update(JSON.stringify(v)).digest('hex');

async function load() {
  const resolve = await import('./modelFactoryPerId');
  await import('@versions/shared/monsters/models');
  const { PlayerObject } = await import('./playerObject');
  const { MonsterObject } = await import('./monsterObject');
  const { NPC_MODEL_TABLE } = await import('./npcModelTable');
  const { GEARED_NPC_TABLE, TRANSFORMED_NPC_TABLE } = await import('./playerNpcTables');
  const { characterSkinParts } = await import('./transformedBody');
  const { TRAP_MODEL_TABLE } = await import('@/controllers/actors');
  return { ...resolve, PlayerObject, MonsterObject, NPC_MODEL_TABLE, GEARED_NPC_TABLE, TRANSFORMED_NPC_TABLE, CHARACTER_SKIN_PARTS: characterSkinParts(), TRAP_MODEL_TABLE };
}

describe('model resolution', () => {
  it('draws every type 0..600 as it did', async () => {
    const m = await load();
    const firstOf = new Map<unknown, number>();
    const rows = Array.from({ length: 601 }, (_, type) => {
      const f = m.resolveModelFactory(type) as typeof m.PlayerObject;
      if (!firstOf.has(f)) firstOf.set(f, type);
      const proto: object = f.prototype;
      const base = proto instanceof m.PlayerObject ? 'player' : proto instanceof m.MonsterObject ? 'monster' : 'model';
      return [type, m.isKnownObjectType(type), f.name, f.OverrideScale, base, f.NpcClass ?? null, f.NpcAlwaysFly ?? false, firstOf.get(f)];
    });

    expect(rows.filter(r => r[1]).length).toBe(529);
    expect(hash(rows)).toBe(RESOLVE_HASH);
  }, 120_000);

  it('keeps the NPC tables the generic factories read', async () => {
    const m = await load();
    const tables = [m.NPC_MODEL_TABLE, m.GEARED_NPC_TABLE, m.TRANSFORMED_NPC_TABLE, m.TRAP_MODEL_TABLE, m.CHARACTER_SKIN_PARTS];

    expect(tables.map(t => Object.keys(t).length)).toEqual([89, 13, 8, 6, 9]);
    expect(hash(tables)).toBe(TABLES_HASH);
  }, 120_000);
});
