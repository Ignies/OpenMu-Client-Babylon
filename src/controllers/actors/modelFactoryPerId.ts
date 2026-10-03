import type { Entity, World } from '@/ecs/world';
import { monsterRegistry } from '@/controllers/monsters';
import { loadGLTF } from '@/controllers/assets';
import { monsterFactoryFor } from './genericMonster';
import {
  FALLBACK_MODEL_TYPE,
  FALLBACK_SCALE,
  hasMonsterModel,
  monsterHiddenMesh,
  monsterModelTypeOfNpc,
  monsterScaleOf,
} from './monsterModelTable';
import { ModelObject } from '../render/modelObject';
import { registeredModelClass } from './modelClasses';
import { npcModelFile } from './npcModelTable';
import { gearedNpcFactory, transformedNpcFactory } from './playerNpc';

// The model content draws plain NPC classes on (the render door exports it as a type only).
export { ModelObject };

/**
 * Which class draws an object type: a class content registered for it (`registerModelClass`), else
 * the engine default its monster folder's data asks for. See readme.md.
 */
export function resolveModelFactory(typeNumber: number): typeof ModelObject {
  const registered = registeredModelClass(typeNumber);
  if (registered) return registered;

  const def = monsterRegistry.def(typeNumber);
  if (def?.hidden) return HiddenNpc;

  // Before the monster model: a trap's model is the map's, not its own.
  if (def?.trap) return trapFactoryFor(typeNumber, def.trap.object, def.trap.shadow);

  if (hasMonsterModel(typeNumber)) {
    return monsterFactoryFor(
      monsterModelTypeOfNpc(typeNumber),
      monsterScaleOf(typeNumber),
      monsterHiddenMesh(typeNumber)
    );
  }

  if (def?.npcModel) return npcFactoryFor(def.npcModel.file, def.npcModel.scale);

  if (def?.gear) return gearedNpcFactory(def.gear);

  if (def?.transformed) return transformedNpcFactory(def.transformed.dir, def.transformed.part, def.transformed.scale);

  return monsterFactoryFor(FALLBACK_MODEL_TYPE, FALLBACK_SCALE);
}

export function isKnownObjectType(typeNumber: number): boolean {
  if (registeredModelClass(typeNumber) !== undefined || hasMonsterModel(typeNumber)) return true;
  const def = monsterRegistry.def(typeNumber);
  return !!(def && (def.hidden || def.trap || def.npcModel || def.gear || def.transformed));
}

// ---- the plain-model NPC defaults -------------------------------------------

const npcCache = new Map<string, typeof ModelObject>();

/** An NPC drawn from its own model file (`npcModel`), at its scale. */
export function npcFactoryFor(file: string, scale: number): typeof ModelObject {
  const key = `${file}:${scale}`;
  const cached = npcCache.get(key);
  if (cached) return cached;

  const path = npcModelFile(file);

  class GenericNpc extends ModelObject {
    static {
      GenericNpc.OverrideScale = scale;
    }

    async init(world: World) {
      this.load(await loadGLTF(path, world));
    }
  }

  Object.defineProperty(GenericNpc, 'name', { value: file });

  npcCache.set(key, GenericNpc);

  return GenericNpc;
}

/**
 * An NPC the server spawns but the original never draws (`hidden`): the five Crywolf altars are
 * created with `Object.Visible = false` and `HiddenMesh = -2` (ZzzCharacter.cpp:14266-14313) and
 * only the event turns them on. Loading no model and reporting `Ready` keeps ModelLoaderSystem from
 * standing a missing-model placeholder there.
 */
export class HiddenNpc extends ModelObject {
  override init(_world: World, _entity: Entity): Promise<void> {
    this.Ready = true;
    return Promise.resolve();
  }
}

const trapCache = new Map<number, typeof ModelObject>();

/**
 * Traps (`MONSTER_LANCE_TRAP` .. `MONSTER_LASER_TRAP`, 100-106) are the one
 * group of server-spawned characters that does not carry a model of its own:
 * `CreateCharacter(Key, 39, ...)` and friends (ZzzCharacter.cpp:14273-14287,
 * GMBattleCastle.cpp:1285) pass a *world object* index, so a trap is drawn
 * with whatever `Data/Object<world+1>/Object<index+1>.bmd` the map it stands
 * on happens to hold - the spike row in Dungeon and the floor grate in Lost
 * Tower are the same three lines of client code. 105 (the Kanturu canon) is a
 * real NPC model and is not a trap here.
 */
export function trapFactoryFor(npcType: number, modelIndex: number, castsShadow: boolean): typeof ModelObject {
  const cached = trapCache.get(npcType);
  if (cached) return cached;

  class TrapNpc extends ModelObject {
    async init(world: World, _entity: Entity) {
      this.CastsShadow = castsShadow;

      const dir = this.objectDir;
      const file = `${dir}Object${(modelIndex + 1).toString().padStart(2, '0')}.glb`;

      this.load(await loadGLTF(file, world));
    }
  }

  Object.defineProperty(TrapNpc, 'name', { value: `Trap${npcType}` });

  trapCache.set(npcType, TrapNpc);

  return TrapNpc;
}
