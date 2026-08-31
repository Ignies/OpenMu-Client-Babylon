import type { Entity, World } from '../../ecs/world';
import { loadGLTF } from '../modelLoader';
import { MonsterObject } from '../monsterObject';
import { monsterModelFile } from './monsterModelTable';

/** `MODEL_BUDGE_DRAGON`'s model index — the one monster model that hovers. */
export const BUDGE_DRAGON_MODEL = 2;

const cache = new Map<string, typeof MonsterObject>();

export function monsterFactoryFor(
  modelType: number,
  scale: number,
  hiddenMesh = -1
): typeof MonsterObject {
  const key = `${modelType}:${scale}:${hiddenMesh}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const file = monsterModelFile(modelType);

  class GenericMonster extends MonsterObject {
    static {
      GenericMonster.OverrideScale = scale;
    }

    // Golden Budge Dragon (npc 43) shares the model and so shares the bob.
    BobsWhileMoving = modelType === BUDGE_DRAGON_MODEL;

    HiddenMesh = hiddenMesh;

    async init(world: World, entity: Entity) {
      await super.init(world, entity);

      this.load(await loadGLTF(file, world));
    }
  }

  Object.defineProperty(GenericMonster, 'name', {
    value: `Monster${(modelType + 1).toString().padStart(2, '0')}`,
  });

  cache.set(key, GenericMonster);

  return GenericMonster;
}
