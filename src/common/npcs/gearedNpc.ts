import type { Entity, Item, World } from '../../ecs/world';
import { PlayerAction, ItemGroups } from '../objects/enum';
import { Scene, TransformNode } from '../../libs/babylon/exports';
import { loadGLTF } from '../modelLoader';
import { PlayerObject } from '../playerObject';
import { CharacterClassNumber, PlayerClass } from '../types';

/**
 * `CreateCharacter(Key, MODEL_PLAYER, …)` followed by a fixed
 * `c->BodyPart[]` / `c->Weapon[]` kit — the guards, doppelgangers and helper
 * NPCs the original dresses inline. Every one of them wears a single armour
 * set across all five slots, so the kit names it once by its items.json
 * index.
 */
export type NpcGear = {
  /** `c->Class`; also the rig `updateBodyPartClassesAsync` falls back to. */
  readonly charClass: CharacterClassNumber;
  readonly playerClass: PlayerClass;
  /** items.json index shared by helm/armor/pants/gloves/boots. */
  readonly set: number;
  /** `c->BodyPart[].Level`. */
  readonly level?: number;
  /**
   * Set when the original reaches the helm model directly rather than through
   * a named item (`MODEL_BODY_HELM + n`) and items.json has no such row.
   */
  readonly noHelm?: boolean;
  /** `c->Weapon[0]` — the main hand (AppearanceSystem's `leftHand` slot). */
  readonly mainHand?: Item | null;
  /** `c->Weapon[1]` — the off hand. */
  readonly offHand?: Item | null;
  /** `c->Wing` (group 12). */
  readonly wings?: Item | null;
  /** `c->Helper` (group 13): the Dark Lord's mount. */
  readonly pet?: Item | null;
  readonly scale?: number;
};

const cache = new Map<NpcGear, typeof PlayerObject>();

export function gearedNpcFactory(gear: NpcGear): typeof PlayerObject {
  const cached = cache.get(gear);
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

  cache.set(gear, GearedNpc);

  return GearedNpc;
}
