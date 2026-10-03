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
const RESOLVE_HASH = '709a7f80d67c32fb865822572997b8a1309e3778686981bd1691274ad8400efd';
const TABLES_HASH = 'c27e1d9bcaf72d4be16330a37da6651dfd22e21b1e65e636c4be469c98855b65';

const hash = (v: unknown) => createHash('sha256').update(JSON.stringify(v)).digest('hex');

async function load() {
  const resolve = await import('./modelFactoryPerId');
  await import('@versions/shared/monsters/models');
  const { PlayerObject } = await import('./playerObject');
  const { MonsterObject } = await import('./monsterObject');
  const { NPC_MODEL_TABLE } = await import('./npcModelTable');
  const { GEARED_NPC_TABLE, TRANSFORMED_NPC_TABLE } = await import('./playerNpcTables');
  const { CHARACTER_SKIN_PARTS } = await import('./transformedBody');
  const { TRAP_MODEL_TABLE } = await import('@versions/shared/npcs/trap_npc');
  return { ...resolve, PlayerObject, MonsterObject, NPC_MODEL_TABLE, GEARED_NPC_TABLE, TRANSFORMED_NPC_TABLE, CHARACTER_SKIN_PARTS, TRAP_MODEL_TABLE };
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

    expect(tables.map(t => Object.keys(t).length)).toEqual([88, 12, 8, 6, 9]);
    expect(hash(tables)).toBe(TABLES_HASH);
  }, 120_000);
});
