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
  /**
   * A character wearing a monster's appearance draws the same body effects
   * as the monster - a game master in the ring stands on the same mark as
   * the game master NPC. It has a `skin`, not an `npcType`, so it needs a
   * query of its own rather than a wider walk of every entity.
   */
  const skinned = world.with('skin', 'modelObject', 'transform');
  const handles = new Map<Entity, EffectHandle>();

  function snuff(e: Entity): void {
    handles.get(e)?.stop();
    handles.delete(e);
  }

  characters.onEntityRemoved.subscribe(snuff);
  skinned.onEntityRemoved.subscribe(snuff);

  function step(e: Entity, type: number, on: boolean): void {
    const row = monsterVisualFor(type);
    if (!row) return;

    // The toggle takes effect at once, and out of scope the entry would
    // otherwise be restarted every frame until the monster is back.
    if (!on || e.objOutOfScope) {
      snuff(e);
      return;
    }

    // A map change ends every effect underneath us; `alive` is then false
    // and the next frame rebuilds it.
    if (handles.get(e)?.alive) return;
    if (!e.modelObject?.Ready || !e.modelObject.gltf?.skeleton) return;

    handles.set(e, visualMonster(world.scene, e, row));
  }

  return {
    update: () => {
      const on = GameOptions.monsterEffects;
      for (const e of characters) step(e, e.npcType, on);
      // A skinned NPC is in both queries; its npcType has already answered.
      for (const e of skinned) {
        if (e.npcType === undefined) step(e, e.skin, on);
      }
    },
  };
};
