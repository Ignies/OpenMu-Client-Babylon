import type { Entity, World } from '../../ecs/world';
import { loadGLTF } from '../modelLoader';
import { ModelObject } from '../modelObject';
import { assetWorldNum } from '../worldAssets';

/**
 * Traps (`MONSTER_LANCE_TRAP` .. `MONSTER_LASER_TRAP`, 100-106) are the one
 * group of server-spawned characters that does not carry a model of its own:
 * `CreateCharacter(Key, 39, ...)` and friends (ZzzCharacter.cpp:14273-14287,
 * GMBattleCastle.cpp:1285) pass a *world object* index, so a trap is drawn
 * with whatever `Data/Object<world+1>/Object<index+1>.bmd` the map it stands
 * on happens to hold - the spike row in Dungeon and the floor grate in Lost
 * Tower are the same three lines of client code.
 *
 * `Setting_Monster` never reaches these: they have no monster model, no
 * voice and no ID string. Without the mapping they fall through
 * `resolveModelFactory` to the Bull Fighter fallback, which is how Lost
 * Tower 7's meteorite traps came to be a herd of cattle.
 *
 * 105 (`MONSTER_CANON_TRAP`) is deliberately absent: it is Kanturu 2nd's
 * `g_TrapCanon.Create_TrapCanon` (GM_Kanturu_2nd.cpp:134), a real NPC model
 * with its own rig, and it already resolves through NPC_MODEL_TABLE.
 */
export const TRAP_MODEL_TABLE: Readonly<
  Record<number, readonly [modelIndex: number, castsShadow: boolean]>
> = {
  /** MONSTER_LANCE_TRAP (ZzzCharacter.cpp:14273). */
  100: [39, true],
  /** MONSTER_IRON_STICK_TRAP (:14276). */
  101: [40, true],
  /** MONSTER_FIRE_TRAP (:14279). */
  102: [51, true],
  /** MONSTER_METEORITE_TRAP (:14282). */
  103: [25, true],
  /** MONSTER_TRAP - Castle Siege, `m_bRenderShadow = false` (GMBattleCastle.cpp:1285-1289). */
  104: [11, false],
  /** MONSTER_LASER_TRAP (ZzzCharacter.cpp:14285). */
  106: [51, true],
};

const cache = new Map<number, typeof ModelObject>();

export function trapFactoryFor(npcType: number): typeof ModelObject {
  const cached = cache.get(npcType);
  if (cached) return cached;

  const [modelIndex, castsShadow] = TRAP_MODEL_TABLE[npcType]!;

  class TrapNpc extends ModelObject {
    async init(world: World, _entity: Entity) {
      this.CastsShadow = castsShadow;

      const dir = `Object${assetWorldNum(this.WorldIndex)}/`;
      const file = `${dir}Object${(modelIndex + 1)
        .toString()
        .padStart(2, '0')}.glb`;

      this.load(await loadGLTF(file, world));
    }
  }

  Object.defineProperty(TrapNpc, 'name', { value: `Trap${npcType}` });

  cache.set(npcType, TrapNpc);

  return TrapNpc;
}
