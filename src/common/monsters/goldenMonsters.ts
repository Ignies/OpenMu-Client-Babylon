import type { Entity, World } from '../../ecs/world';
import { effects } from '../../effects';
import { bonePos, tmpA } from '../../effects/core';
import { FLAME_TONGUES } from '../../effects/recipes';
import { loadGLTF } from '../modelLoader';
import { MonsterObject } from '../monsterObject';
import { MonsterActionType } from '../objects/enum';
import { BUDGE_DRAGON_MODEL } from './genericMonster';
import {
  MONSTER_MODEL_TABLE,
  monsterModelFile,
  monsterScaleOf,
} from './monsterModelTable';

/**
 * The golden invasion line. The original draws every golden monster with
 * extra RENDER_METAL / RENDER_CHROME | RENDER_BRIGHT passes over the body
 * (ZzzCharacter.cpp:8505-8580 for 43, 78-83 and 493-502; :8715-8718 for the
 * Golden Titan and Golden Soldier). The clone's monster materials have no
 * chrome pass, so the gold reads through `SelfLight` instead - the S4 set's
 * golden body light (1, 0.6, 0.3) (:8517) at half strength, additive over
 * the terrain light.
 *
 * Not ported here (noted in the PR): the chrome/shiny texture passes
 * themselves (materials work), the BITMAP_JOINT_ENERGY mesh wraps of the
 * Golden Titan / Tantallos / Wheel (no mesh-wrap ribbon primitive), and the
 * `c->Weapon[]` kits - monster-rig weapons are deferred with the rest of the
 * Setting_Monster weapon work (see monsterModelTable.ts).
 */
const GOLD_SHINE = [0.5, 0.3, 0.15] as const;

abstract class GoldenMonster extends MonsterObject {
  protected abstract readonly npcType: number;

  async init(world: World, entity: Entity) {
    await super.init(world, entity);

    const model = MONSTER_MODEL_TABLE[this.npcType]?.[0] ?? 0;
    // Golden Budge Dragon shares MODEL_BUDGE_DRAGON and so shares the bob.
    this.BobsWhileMoving = model === BUDGE_DRAGON_MODEL;
    this.SelfLight.set(GOLD_SHINE[0], GOLD_SHINE[1], GOLD_SHINE[2]);

    this.load(await loadGLTF(monsterModelFile(model), world));
  }
}

// [NpcInfo(43, "Golden Budge Dragon")] (ZzzCharacter.cpp:13555-13560)
export class GoldenBudgeDragon extends GoldenMonster {
  static {
    GoldenBudgeDragon.OverrideScale = monsterScaleOf(43);
  }
  protected readonly npcType = 43;
}

// [NpcInfo(53, "Golden Titan")] (ZzzCharacter.cpp:13978-13988)
export class GoldenTitan extends GoldenMonster {
  static {
    GoldenTitan.OverrideScale = monsterScaleOf(53);
  }
  protected readonly npcType = 53;
  BlendMesh = 2;
}

// [NpcInfo(54, "Golden Soldier")] (ZzzCharacter.cpp:13989-13999)
export class GoldenSoldier extends GoldenMonster {
  static {
    GoldenSoldier.OverrideScale = monsterScaleOf(54);
  }
  protected readonly npcType = 54;
}

// [NpcInfo(78, "Golden Goblin")] (ZzzCharacter.cpp:13244-13251)
export class GoldenGoblin extends GoldenMonster {
  static {
    GoldenGoblin.OverrideScale = monsterScaleOf(78);
  }
  protected readonly npcType = 78;
}

// [NpcInfo(79, "Golden Derkon")] (ZzzCharacter.cpp:13252-13257)
export class GoldenDerkon extends GoldenMonster {
  static {
    GoldenDerkon.OverrideScale = monsterScaleOf(79);
  }
  protected readonly npcType = 79;
}

// [NpcInfo(80, "Golden Vepar")] (ZzzCharacter.cpp:13265-13269)
export class GoldenVepar extends GoldenMonster {
  static {
    GoldenVepar.OverrideScale = monsterScaleOf(80);
  }
  protected readonly npcType = 80;
}

// [NpcInfo(81, "Golden Lizard King")] (ZzzCharacter.cpp:13258-13264)
export class GoldenLizardKing extends GoldenMonster {
  static {
    GoldenLizardKing.OverrideScale = monsterScaleOf(81);
  }
  protected readonly npcType = 81;
}

// [NpcInfo(82, "Golden Tantallos")] (ZzzCharacter.cpp:13270-13281)
export class GoldenTantallos extends GoldenMonster {
  static {
    GoldenTantallos.OverrideScale = monsterScaleOf(82);
  }
  protected readonly npcType = 82;
  BlendMesh = 2;
}

// [NpcInfo(83, "Golden Wheel")] (ZzzCharacter.cpp:13282-13292)
export class GoldenWheel extends GoldenMonster {
  static {
    GoldenWheel.OverrideScale = monsterScaleOf(83);
  }
  protected readonly npcType = 83;
}

// [NpcInfo(493, "Golden Dark Knight")] (ZzzCharacter.cpp:14584-14591)
export class GoldenDarkKnight extends GoldenMonster {
  static {
    GoldenDarkKnight.OverrideScale = monsterScaleOf(493);
  }
  protected readonly npcType = 493;
}

// [NpcInfo(494, "Golden Devil")] (ZzzCharacter.cpp:14593-14598)
export class GoldenDevil extends GoldenMonster {
  static {
    GoldenDevil.OverrideScale = monsterScaleOf(494);
  }
  protected readonly npcType = 494;
}

// [NpcInfo(495, "Golden Stone Golem")] (ZzzCharacter.cpp:14599-14608)
export class GoldenStoneGolem extends GoldenMonster {
  static {
    GoldenStoneGolem.OverrideScale = monsterScaleOf(495);
  }
  protected readonly npcType = 495;

  async init(world: World, entity: Entity) {
    await super.init(world, entity);
    // ZzzOpenData.cpp:2452-2454
    this.setActionSpeed(MonsterActionType.Die, 0.2);
  }
}

// [NpcInfo(496, "Golden Crust")] (ZzzCharacter.cpp:14609-14619)
export class GoldenCrust extends GoldenMonster {
  static {
    GoldenCrust.OverrideScale = monsterScaleOf(496);
  }
  protected readonly npcType = 496;
  BlendMesh = 1;
}

// [NpcInfo(497, "Golden Satyros")] (ZzzCharacter.cpp:14620-14627)
export class GoldenSatyros extends GoldenMonster {
  static {
    GoldenSatyros.OverrideScale = monsterScaleOf(497);
  }
  protected readonly npcType = 497;
}

// [NpcInfo(498, "Golden Twin Tail")] (ZzzCharacter.cpp:14628-14639)
export class GoldenTwinTail extends GoldenMonster {
  static {
    GoldenTwinTail.OverrideScale = monsterScaleOf(498);
  }
  protected readonly npcType = 498;
}

// [NpcInfo(499, "Golden Iron Knight")] (ZzzCharacter.cpp:14640-14647)
export class GoldenIronKnight extends GoldenMonster {
  static {
    GoldenIronKnight.OverrideScale = monsterScaleOf(499);
  }
  protected readonly npcType = 499;

  async init(world: World, entity: Entity) {
    await super.init(world, entity);
    // MONSTER_MODEL_IRON_KNIGHT (ZzzOpenData.cpp:2769-2773)
    this.setActionSpeed(MonsterActionType.Walk, 0.25);
    this.setActionSpeed(MonsterActionType.Attack1, 0.21);
    this.setActionSpeed(MonsterActionType.Die, 0.23);
  }
}

// [NpcInfo(500, "Golden Napin")] (ZzzCharacter.cpp:14648-14655)
export class GoldenNapin extends GoldenMonster {
  static {
    GoldenNapin.OverrideScale = monsterScaleOf(500);
  }
  protected readonly npcType = 500;
}

/** Wing / neck bones the mono flames burn from (ZzzCharacter.cpp:8548-8561). */
const GREAT_DRAGON_FLAME_BONES = [57, 60, 66, 78, 91] as const;

/** The original burns per 25 Hz tick; throttled to keep the particle budget. */
const GREAT_DRAGON_FLAME_INTERVAL = 0.12;

/** Bones sit high on the dragon; fallback when the skeleton is not posed yet. */
const GREAT_DRAGON_FLAME_HEIGHT = 1.2;

// [NpcInfo(501, "Great Golden Dragon")] (ZzzCharacter.cpp:14656-14663) - the
// one golden that burns: red body light (1, 0, 0) plus FIRE_HIK3_MONO flames
// off the wing and neck bones (:8520-8563).
export class GreatGoldenDragon extends GoldenMonster {
  static {
    GreatGoldenDragon.OverrideScale = monsterScaleOf(501);
  }
  protected readonly npcType = 501;

  #world: World | null = null;
  #entity: Entity | null = null;
  #nextFlame = 0;

  async init(world: World, entity: Entity) {
    this.#world = world;
    this.#entity = entity;
    await super.init(world, entity);
    this.SelfLight.set(0.5, 0.05, 0.05);
  }

  Update(gameTime: World['gameTime']): void {
    super.Update(gameTime);

    const world = this.#world;
    const entity = this.#entity;
    if (!this.Ready || this.OutOfView || !world || !entity || entity.dying) {
      return;
    }

    const now = gameTime.TotalGameTime.TotalSeconds;
    if (now < this.#nextFlame) return;
    this.#nextFlame = now + GREAT_DRAGON_FLAME_INTERVAL;

    for (const bone of GREAT_DRAGON_FLAME_BONES) {
      bonePos(entity, bone, tmpA, GREAT_DRAGON_FLAME_HEIGHT);
      effects.spawn('particles', world.scene, tmpA, {
        recipe: FLAME_TONGUES,
        count: 1,
      });
    }
  }
}

// [NpcInfo(502, "Golden Rabbit")] (ZzzCharacter.cpp:14576-14583)
export class GoldenRabbit extends GoldenMonster {
  static {
    GoldenRabbit.OverrideScale = monsterScaleOf(502);
  }
  protected readonly npcType = 502;
}
