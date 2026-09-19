import type { Entity, ISystemFactory } from '../world';
import { GameOptions } from '../../common/gameOptions';
import { monsterVisualFor, visualMonster } from '../../effects/monsterVisuals';
import type { EffectHandle } from '../../effects';

/**
 * Consumer of the effects layer's `monsterVisuals` entry: walks the entities
 * that have an `npcType` and starts the body effects its table names once
 * the model is posed - the dust, the breath, the fire, the sand - and drops
 * them when the monster leaves or the option goes off. Owns no visual state;
 * `effects/monsterVisuals.ts` does.
 */
export const MonsterVisualSystem: ISystemFactory = world => {
  const characters = world.with('npcType', 'modelObject', 'transform');
  const handles = new Map<Entity, EffectHandle>();

  function snuff(e: Entity): void {
    handles.get(e)?.stop();
    handles.delete(e);
  }

  characters.onEntityRemoved.subscribe(snuff);

  return {
    update: () => {
      const on = GameOptions.monsterEffects;
      for (const e of characters) {
        const row = monsterVisualFor(e.npcType);
        if (!row) continue;

        // The toggle takes effect at once, and out of scope the entry would
        // otherwise be restarted every frame until the monster is back.
        if (!on || e.objOutOfScope) {
          snuff(e);
          continue;
        }

        // A map change ends every effect underneath us; `alive` is then false
        // and the next frame rebuilds it.
        if (handles.get(e)?.alive) continue;
        if (!e.modelObject.Ready || !e.modelObject.gltf?.skeleton) continue;

        handles.set(e, visualMonster(world.scene, e, row));
      }
    },
  };
};
