import type { Entity, Item, World } from '@/ecs/world';
import { PlayerAction, ItemGroups } from '@versions/shared/objects/enum';
import { Scene, TransformNode } from '../render/babylon/exports';
import { loadGLTF } from '@/controllers/assets';
import type { NpcGear } from '@/controllers/monsters';
import { PlayerObject } from './playerObject';
import { transformedBodyFactory } from './transformedBody';
import { CharacterClassNumber } from '@/core/types';
import { CHARACTER_DEFAULT_SCALE } from './monsterModelTable';

/**
 * The two player-rig NPC shapes the original builds inline, from a monster folder's `gear` or
 * `transformed`. Engine defaults, like `genericMonster.ts`.
 */

const gearCache = new Map<NpcGear, typeof PlayerObject>();

/**
 * `CreateCharacter(Key, MODEL_PLAYER, …)` followed by a fixed
 * `c->BodyPart[]` / `c->Weapon[]` kit - the guards, doppelgangers and helper
 * NPCs the original dresses inline.
 */
export function gearedNpcFactory(gear: NpcGear): typeof PlayerObject {
  const cached = gearCache.get(gear);
  if (cached) return cached;

  const { charClass, set, level: lvl, noHelm } = gear;
  const part = (group: number): Item => ({ group, num: set, lvl });

  class GearedNpc extends PlayerObject {
    static NpcClass = charClass;

    static {
      GearedNpc.OverrideScale = gear.scale ?? -1;
    }

    constructor(scene: Scene, parent: TransformNode) {
      super(scene, parent);

      this.playerClass = gear.playerClass;
    }

    async init(world: World, entity: Entity) {
      this.load(await loadGLTF('Player/player.glb', world));
      this.Ready = false;

      world.addComponent(entity, 'charAppearance', {
        charClass,
        helm: noHelm ? null : part(ItemGroups.Helm),
        armor: part(ItemGroups.Armor),
        pants: part(ItemGroups.Pants),
        gloves: part(ItemGroups.Gloves),
        boots: part(ItemGroups.Boots),
        leftHand: gear.mainHand ?? null,
        rightHand: gear.offHand ?? null,
        wings: gear.wings ?? null,
        pet: gear.pet ?? null,
        changed: true,
      });

      this.startNpcIdle();
      world.removeComponent(entity, 'monsterAnimation');
      // A player rig walks with the player state machine (AnimationSystem's
      // SetPlayerStop / SetPlayerWalk port): idle here, PLAYER_WALK_* when the
      // server walks the NPC, back to idle when the path ends.
      if (!entity.playerAnimation) {
        world.addComponent(entity, 'playerAnimation', {
          action: PlayerAction.PLAYER_SET,
          run: 0,
        });
      }

      this.Ready = true;
    }
  }

  gearCache.set(gear, GearedNpc);

  return GearedNpc;
}

const transformedCache = new Map<string, typeof PlayerObject>();

/**
 * `CreateCharacter(Key, MODEL_PLAYER, …)` with `c->Object.SubType = MODEL_X`:
 * a player rig whose whole body is one part file drawn by
 * `RenderPartObject(&c->Object, o->SubType, …)` (ZzzCharacter.cpp:9321)
 * instead of the helm/armor/… slots. The transform ring NPCs, the event
 * mascots and the Cursed Temple side avatars are all this shape; the
 * Skill/Skeleton0N monsters are the same mechanism with a weapon kit
 * (see `versions/shared/monsters/_skeleton_line/model.ts`).
 *
 * The body swap itself is `transformedBodyFactory` - the same one the hero
 * wears when a transformation ring puts it in one of these. What is added
 * here is only what an NPC needs on top: the knight rig it poses on, its
 * scale, and an idle to stand in.
 */
export function transformedNpcFactory(dir: string, part: string, scale = CHARACTER_DEFAULT_SCALE): typeof PlayerObject {
  const key = `${dir}${part}:${scale}`;
  const cached = transformedCache.get(key);
  if (cached) return cached;

  class TransformedNpc extends transformedBodyFactory(dir, part) {
    /** The transforms all pose on the male knight rig (`c->Class` is never set). */
    static NpcClass = CharacterClassNumber.DarkKnight;

    static {
      TransformedNpc.OverrideScale = scale;
    }

    async init(world: World, entity: Entity) {
      this.load(await loadGLTF('Player/player.glb', world));
      this.Ready = false;

      await this.updateBodyPartClassesAsync();

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
  }

  Object.defineProperty(TransformedNpc, 'name', { value: part.replace(/\.glb$/, '') });

  transformedCache.set(key, TransformedNpc);

  return TransformedNpc;
}
