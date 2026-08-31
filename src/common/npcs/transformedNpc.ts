import type { Entity, World } from '../../ecs/world';
import { PlayerAction } from '../objects/enum';
import { loadGLTF } from '../modelLoader';
import { PlayerObject } from '../playerObject';
import { CharacterClassNumber } from '../types';

const cache = new Map<string, typeof PlayerObject>();

/**
 * `CreateCharacter(Key, MODEL_PLAYER, …)` with `c->Object.SubType = MODEL_X`:
 * a player rig whose whole body is one part file drawn by
 * `RenderPartObject(&c->Object, o->SubType, …)` (ZzzCharacter.cpp:9321)
 * instead of the helm/armor/… slots. The transform ring NPCs, the event
 * mascots and the Cursed Temple side avatars are all this shape; the
 * Skill/Skeleton0N monsters are the same mechanism with a weapon kit
 * (see `monsters/skeletonWarrior.ts`, which predates this factory).
 *
 * The part rides the Armor slot, every other slot stays empty, and the player
 * state machine (`playerAnimation`) picks the idle / walk clips.
 */
export function transformedNpcFactory(
  dir: string,
  part: string,
  scale: number
): typeof PlayerObject {
  const key = `${dir}${part}:${scale}`;
  const cached = cache.get(key);
  if (cached) return cached;

  class TransformedNpc extends PlayerObject {
    /** The transforms all pose on the male knight rig (`c->Class` is never set). */
    static NpcClass = CharacterClassNumber.DarkKnight;

    static {
      TransformedNpc.OverrideScale = scale;
    }

    async init(world: World, entity: Entity) {
      this.load(await loadGLTF('Player/player.glb', world));
      this.Ready = false;

      await this.loadTransformPart();

      world.addComponent(entity, 'charAppearance', {
        charClass: CharacterClassNumber.DarkKnight,
        helm: null,
        armor: null,
        pants: null,
        gloves: null,
        boots: null,
        leftHand: null,
        rightHand: null,
        wings: null,
        pet: null,
        changed: true,
      });

      this.startNpcIdle();
      world.removeComponent(entity, 'monsterAnimation');
      if (!entity.playerAnimation) {
        world.addComponent(entity, 'playerAnimation', {
          action: PlayerAction.PLAYER_SET,
          run: 0,
        });
      }

      this.Ready = true;
    }

    private loadTransformPart() {
      return this.loadPartAsync(dir, this.Armor, part);
    }

    // The body is the transform part alone: AppearanceSystem's "no item →
    // class default" fallbacks must not dress it in the default knight kit.
    override async updateBodyPartClassesAsync() {
      await this.loadTransformPart();
    }
    override async setDefaultArmor() {
      await this.loadTransformPart();
    }
    override async setDefaultHelm() {
      this.Helm.Unload();
    }
    override async setDefaultMask() {
      this.HelmMask.Unload();
    }
    override async setDefaultPants() {
      this.Pants.Unload();
    }
    override async setDefaultGloves() {
      this.Gloves.Unload();
    }
    override async setDefaultBoots() {
      this.Boots.Unload();
    }
  }

  Object.defineProperty(TransformedNpc, 'name', { value: part.replace(/\.glb$/, '') });

  cache.set(key, TransformedNpc);

  return TransformedNpc;
}
