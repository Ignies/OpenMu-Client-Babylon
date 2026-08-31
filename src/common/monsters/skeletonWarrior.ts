import type { Entity, World } from '../../ecs/world';
import type { Item } from '../../ecs/world';
import { PlayerAction } from '../objects/enum';
import {
  GROUP_AXE,
  GROUP_BOW,
  GROUP_SHIELD,
  GROUP_SPEAR,
  GROUP_SWORD,
} from '../weaponClass';
import { loadGLTF } from '../modelLoader';
import { PlayerObject } from '../playerObject';
import { CharacterClassNumber } from '../types';
import { skeletonShatter } from '../deathVisuals';

/**
 * The Skill/Skeleton01..03 monsters (Skeleton Warrior, Skeleton Archer, Elite
 * Skeleton, Death King, Death Bone) are *player-rig* characters in the
 * original: `CreateCharacter(Key, MODEL_PLAYER, …)` with `Object.SubType =
 * MODEL_SKELETON1..3` (ZzzCharacter.cpp:13910-13950), drawn by
 * `RenderPartObject(&c->Object, o->SubType, …)` (:9321) on the Player.bmd
 * bones instead of the helm/armor/… parts. `Skeleton0N.bmd` is a body part
 * file exactly like `ArmorClass01.bmd` — the player's `Bip01` bone list, one
 * single-key bind-pose action, vertices skinned to bones 2..39 — so it has no
 * animation of its own. Loading it standalone and driving it with the
 * monster action table left the mesh posed by whatever clip index happened to
 * exist: the stretched, splayed limbs of the bug report.
 *
 * Here the part rides the player rig in the Armor slot, every other body slot
 * stays empty, the weapons come from the same `c->Weapon[]` kit, and the
 * player state machine (`playerAnimation`) chooses the weapon-class idle /
 * walk / attack clips the way `SetPlayerStop` / `SetPlayerAttack` do for the
 * original's MODEL_PLAYER monsters.
 */
export abstract class SkeletonMonster extends PlayerObject {
  /** Skeleton monsters pose as a male knight (`c->Class` is never set). */
  static NpcClass = CharacterClassNumber.DarkKnight;

  /** `o->SubType` in MODEL_SKELETON1..3 dies as a bone shatter (:1383-1390). */
  static DeathShatter = skeletonShatter;

  /** The Skill/Skeleton0N part rendered in place of the body. */
  protected abstract readonly part: string;
  /** `c->Weapon[0]` (Weapon1, right hand). */
  protected readonly mainHand: Item | null = null;
  /** `c->Weapon[1]` (Weapon2, left hand). */
  protected readonly offHand: Item | null = null;

  async init(world: World, entity: Entity) {
    this.load(await loadGLTF('Player/player.glb', world));
    this.Ready = false;

    await this.loadSkeletonPart();

    world.addComponent(entity, 'charAppearance', {
      charClass: CharacterClassNumber.DarkKnight,
      helm: null,
      armor: null,
      pants: null,
      gloves: null,
      boots: null,
      leftHand: this.mainHand,
      rightHand: this.offHand,
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

  private loadSkeletonPart() {
    return this.loadPartAsync('Skill/', this.Armor, this.part);
  }

  // The body is the skeleton part alone: AppearanceSystem's "no item → class
  // default" fallbacks must not dress it in the default knight kit.
  override async updateBodyPartClassesAsync() {
    await this.loadSkeletonPart();
  }
  override async setDefaultArmor() {
    await this.loadSkeletonPart();
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

// c->Weapon[] kits (ZzzCharacter.cpp:13910-13950); items.json indices.
const GLADIUS: Item = { group: GROUP_SWORD, num: 6 };
const BUCKLER: Item = { group: GROUP_SHIELD, num: 4 };
const GREAT_SCYTHE: Item = { group: GROUP_SPEAR, num: 8 };
const BILL_OF_BALROG: Item = { group: GROUP_SPEAR, num: 9 };
const ELVEN_BOW: Item = { group: GROUP_BOW, num: 2 };
const TOMAHAWK: Item = { group: GROUP_AXE, num: 3 };
const SKULL_SHIELD: Item = { group: GROUP_SHIELD, num: 6 };

// [NpcInfo(14, "Skeleton Warrior")]
export class SkeletonWarrior extends SkeletonMonster {
  static {
    SkeletonWarrior.OverrideScale = 0.95;
  }
  protected readonly part = 'Skeleton01.glb';
  protected override readonly mainHand = GLADIUS;
  protected override readonly offHand = BUCKLER;
}

// [NpcInfo(55, "Death King")] — MONSTER_DEATH_KING shares MODEL_SKELETON1.
export class DeathKing extends SkeletonMonster {
  static {
    DeathKing.OverrideScale = 1.4;
  }
  protected readonly part = 'Skeleton01.glb';
  protected override readonly mainHand = BILL_OF_BALROG;
}

// [NpcInfo(56, "Death Bone")] — MONSTER_DEATH_BONE shares MODEL_SKELETON1.
export class DeathBone extends SkeletonMonster {
  static {
    DeathBone.OverrideScale = 0.8;
  }
  protected readonly part = 'Skeleton01.glb';
  protected override readonly mainHand = GREAT_SCYTHE;
}

// [NpcInfo(15, "Skeleton Archer")]
export class SkeletonArcher extends SkeletonMonster {
  static {
    SkeletonArcher.OverrideScale = 1.1;
  }
  protected readonly part = 'Skeleton02.glb';
  protected override readonly offHand = ELVEN_BOW;
}

// [NpcInfo(16, "Elite Skeleton")]
export class EliteSkeleton extends SkeletonMonster {
  static {
    EliteSkeleton.OverrideScale = 1.2;
  }
  protected readonly part = 'Skeleton03.glb';
  protected override readonly mainHand = TOMAHAWK;
  protected override readonly offHand = SKULL_SHIELD;
}
