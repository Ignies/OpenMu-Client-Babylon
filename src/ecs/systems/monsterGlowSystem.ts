import type { Entity, ISystemFactory } from '../world';
import { glowMonster, monsterGlowFor } from '../../effects/monsterGlow';
import type { EffectHandle } from '../../effects';

/**
 * Consumer of the effects layer's `monsterGlow` entry: walks the entities
 * that have an `npcType` and gives the ones its table names their own body
 * glow once the model is posed, drops it when they die or leave. Owns no
 * visual state — `effects/monsterGlow.ts` does.
 *
 * The light these monsters throw on the floor is a separate seam entirely:
 * `CharacterLightSystem` reads `lighting/characters.ts`, which carries the
 * matching rows.
 */
export const MonsterGlowSystem: ISystemFactory = world => {
  const characters = world.with('npcType', 'modelObject', 'transform');
  const glows = new Map<Entity, EffectHandle>();

  function snuff(e: Entity): void {
    glows.get(e)?.stop();
    glows.delete(e);
  }

  characters.onEntityRemoved.subscribe(snuff);

  return {
    update: () => {
      for (const e of characters) {
        const glow = monsterGlowFor(e.npcType);
        if (!glow) continue;

        if (e.dying) {
          snuff(e);
          continue;
        }

        // A map change ends every glow underneath us; `alive` is then false
        // and the next frame rebuilds it.
        if (glows.get(e)?.alive) continue;
        // Out of scope the entry drops the glow on its own, so re-lighting
        // here would rebuild 39 sprites a frame until the monster is back.
        if (e.objOutOfScope) continue;
        if (!e.modelObject.Ready || !e.modelObject.gltf?.skeleton) continue;

        glows.set(e, glowMonster(world.scene, e, glow));
      }
    },
  };
};
