import { type Entity } from '@/ecs/world';
import { IMPACT_HEIGHT, SkillContext, Step, TICK, baseSkill, cm, currentSkill, perTick, ticks, toward } from '@/controllers/skills/visuals';
import { ItemsDatabase } from '../../items/itemsDatabase';
import { delay, entityGone, entityPos, fxNow, type ParticleRecipe, type RGB } from '@/controllers/fx/core';
import { PlayerAction } from '../../objects/enum';
import { RGBS, TEX } from '@/controllers/fx/recipes';
import { Vector3, type Scene } from '@/controllers/render/babylon/exports';
import { type Sounds } from '@/controllers/sound/recipes';
import { effects } from '@/controllers/fx';
import { lighting } from '@/controllers/lighting';
import { playCombat } from '@/controllers/sound/combat';
import { storeRef } from '@/app/storeRef';

// ---- dk2 steps

export const rand = (min: number, max: number): number => min + Math.random() * (max - min);

/** The original's `Angle` (MU Z-up; pitch, roll, yaw in radians) as a node rotation: `(-a0, -a2, -a1)` (common/renderAngles.ts). */
export const muAngles = (out: Vector3, pitch: number, roll: number, yaw: number): Vector3 => out.set(-pitch, -yaw, -roll);
/** `VectorRotate((0, -1, 0), AngleMatrix(pitch, 0, yaw))`: the way a JOINT_SPARK's `Velocity` carries its head. */
export const sparkHeading = (pitch: number, yaw: number): Vector3 =>
  new Vector3(Math.sin(yaw) * Math.cos(pitch), -Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch));

/** `RequestTerrainLight` at a point, as the grey level the original's BodyLight adds `o->Light` to. */
export function terrainLevel(x: number, z: number): number {
  const l = storeRef().world?.getTerrainLight(x, z);
  return l ? 0.2126 * l.x + 0.7152 * l.y + 0.0722 * l.z : 1;
}

/** Play one of the original's `PlayBuffer`s at the caster. */
export const sayAt = (c: SkillContext, key: Sounds): void => {
  const t = c.caster.transform;
  if (t) playCombat(key, { x: t.pos.x, z: t.pos.z });
};

/** `c->Weapon[0]` - appearance slot 0 (`leftHand`), drawn in the right hand on bone 33 - with the level and tier it is drawn at. */
export function wieldedWeapon(e: Entity): { file: string; group: number; num: number; stamp: Record<string, unknown> } | null {
  const part = e.charAppearance?.leftHand;
  if (!part) return null;
  const item = ItemsDatabase.getItem(part.group, part.num);
  if (!item) return null;
  const meta = (e.modelObject as { Weapon1?: { getMeshes(all: boolean): { metadata?: Record<string, unknown> }[] } } | undefined)?.Weapon1?.getMeshes(true)[0]?.metadata;
  return {
    file: item.szModelFolder + item.szModelName,
    group: part.group,
    num: part.num,
    stamp: { itemTier: meta?.itemTier ?? null, itemLvl: meta?.itemLvl ?? 0, isExcellent: meta?.isExcellent ?? false },
  };
}
/** `ItemObjectAttribute`'s scale: 0.8, and 0.7 from MODEL_SPEAR to MODEL_PLATINA_STAFF (spears, bows, staffs; ZzzObject.cpp:5175-5178). */
export const itemScale = (w: { group: number; num: number }): number => (w.group === 3 || w.group === 4 || (w.group === 5 && w.num <= 13) ? 0.7 : 0.8);
/** `ItemObjectAttribute` overwrites `o->Light` with 0.3 grey before `RequestTerrainLight` is added to it (ZzzObject.cpp:5157). */
export const ITEM_LIGHT: RGB = [0.3, 0.3, 0.3];

/**
 * BITMAP_JOINT_SPARK sub0 (ZzzEffectJoint.cpp:950-959): Spark01, white, 6-25 cm a tick along its `Angle`,
 * LT 8-15, two tails. Drawn as a stretched particle rather than a two-point ribbon: a Twisting Slash throws
 * twenty a tick. 2 cm wide and one tick of travel long, 6-25 cm with its speed.
 */
export const JOINT_SPARKS: ParticleRecipe = {
  texture: TEX.spark,
  colour: RGBS.white,
  size: 0.02,
  sizeJitter: 0,
  stretch: 12.5,
  stretchBySpeed: true,
  aimed: true,
  life: ticks(15),
  lifeJitter: 7 / 15,
  box: [0.1, 0, 0.1],
  dir1: [0, 0, 0],
  dir2: [0, 0, 0],
  power: perTick(25),
  powerJitter: 19 / 25,
  capacity: 600,
};
/** BITMAP_SPARK sub0 (ZzzEffectParticle.cpp): a Spark02 chip thrown up and falling, 1.6-2.8 cm; 3 cm. */
const SPARK_CHIPS: ParticleRecipe = {
  texture: TEX.spark2,
  colour: RGBS.white,
  size: 0.03,
  life: 1.2,
  power: 1.5,
  gravity: -4,
  dir1: [-0.6, 0.4, -0.6],
  dir2: [0.6, 1, 0.6],
};
/** One JOINT_SPARK at `at` along `heading`, with a `chip` chance of a Spark02 chip beside it. */
export function jointSpark(scene: Scene, at: Vector3, heading: Vector3, chip: number): void {
  effects.spawn('particles', scene, at, { recipe: JOINT_SPARKS, count: 1, heading });
  if (Math.random() < chip) effects.spawn('particles', scene, at, { recipe: SPARK_CHIPS, count: 1 });
}

/** Graded tiers: the sparks cool from white to orange as they die, a little wider. */
export const JOINT_SPARKS_HD: ParticleRecipe = { ...JOINT_SPARKS, colour: [1, 0.92, 0.75], colourEnd: [1, 0.45, 0.12], size: 0.024 };
/** Graded tiers: hot chips that bounce off the blade, one in three sparks. */
export const SPARK_CHIPS_HD: ParticleRecipe = { ...SPARK_CHIPS, colour: [1, 0.85, 0.55], colourEnd: [1, 0.35, 0.08], size: 0.04, life: 0.7, power: 2.2, gravity: -7, capacity: 256 };
/** A MODEL_SPEAR emitter's life (EffectRegistry.cpp:57): one flare a tick from each of the two. */
export const DRILL_EMITTER_TICKS = 10;
export const tmpEmitter = new Vector3();

// ---- dk1 steps -------------------------------------------------------------------

/** AttackTime runs from 1 at ReceiveMagic and the hit block fires at 15 (ZzzCharacter.cpp:2615, :4133-4139). */
const BLOW_TICKS = 14;
/** ATTACK_IMPACT_FRAME: a player attack clip past key 5 forces AttackTime to 15 (ZzzCharacter.cpp:2588, :3049-3062). */
const BLOW_KEY = 5;

/**
 * `step` at a sword skill's blow: 14 ticks after the echo, or sooner once the caster's clip passes
 * key 5. A remote caster's clip is applied after the packet handler, so the key counts only once
 * the model plays the clip it was given. Dropped when the caster is no longer in SWORD1..5 by
 * then, CreateSpark's own test (:4884).
 */
export const atSwordBlow = (step: Step): Step => (at, c) => {
  const t0 = fxNow();
  const poll = (): void => {
    if (entityGone(c.caster)) return;
    const m = c.caster.modelObject;
    const action = m?.CurrentAction ?? -1;
    const inSword = action >= PlayerAction.PLAYER_ATTACK_SKILL_SWORD1 && action <= PlayerAction.PLAYER_ATTACK_SKILL_SWORD5;
    const keyed = inSword && action === c.caster.playerAnimation?.action && m!.actionFrame() >= BLOW_KEY;
    if (keyed || fxNow() - t0 >= ticks(BLOW_TICKS) - 1e-6) {
      if (inSword) step(at, c);
      return;
    }
    delay(TICK / 2, poll);
  };
  poll();
};

/** The row's `strike` light on `on`, riding it at chest height. */
export const strikeOn = (scene: Scene, skill: number, on: Entity): void => {
  if (!on.transform) return;
  const p = entityPos(on, IMPACT_HEIGHT, new Vector3());
  lighting.skillStrike(scene, skill, {
    position: { x: p.x, y: p.y, z: p.z },
    follow: out => {
      entityPos(on, IMPACT_HEIGHT, p);
      out.x = p.x;
      out.y = p.y;
      out.z = p.z;
    },
  });
};

/** Tiles above the target's feet the hit flash sits. */
const SPARK_FLASH_HEIGHT = 0.3;

/**
 * CreateSpark's flash (ZzzEffectBlurSpark.cpp:444-449): BITMAP_SPARK+1 (Spark03, 32 px) at the
 * target's feet, Scale 1 losing 0.5 a tick and gone under 0.2 (ZzzEffectParticle.cpp:6612-6615).
 * Its 20 Spark02 chips are impactVisuals' HIT_SPARKS, thrown by the damage packet.
 */
export const swordSpark: Step = (_at, c) => {
  if (!c.target || entityGone(c.target)) return;
  // The original's 32 cm for two ticks, half in the ground, did not read at our camera: 64 cm, three ticks, shin high.
  effects.spawn('sprite', c.scene, entityPos(c.target, SPARK_FLASH_HEIGHT, new Vector3()), { texture: TEX.spark3, size: cm(64), seconds: ticks(3), grow: 0.5, fadeTail: 0 });
};

/** Enhanced: where the blade meets the body - tiles above the target's feet, and out of it toward the caster so the body does not hide the flash. */
const BLOW_HEIGHT = 0.6;
const BLOW_OUT = 0.4;
/** Enhanced: the soft flare round the blow flash. */
const BLOW_HALO: RGB = [0.8, 0.85, 1];

/**
 * Enhanced blow, at the same moment and place as swordSpark: the Spark03 flash hotter inside a soft
 * flare, chips thrown the way the blade travels, and the blow's light on the target (the row's `strike`).
 */
const swordBlowLit = (skill: number, chips: ParticleRecipe): Step => (_at, c) => {
  const target = c.target;
  if (!target || entityGone(target)) return;
  const at = entityPos(target, BLOW_HEIGHT, new Vector3());
  const out = toward(at, entityPos(c.caster, 0, new Vector3()));
  at.x += out.x * BLOW_OUT;
  at.z += out.z * BLOW_OUT;
  effects.spawn('sprite', c.scene, at, { texture: TEX.flare, colour: BLOW_HALO, size: 0.7, seconds: 0.2, growFrom: 0.6, grow: 1.1, fadeTail: 0.7 });
  effects.spawn('sprite', c.scene, at, { texture: TEX.spark3, size: 0.75, seconds: ticks(4), growFrom: 1.2, grow: 0.45, fadeTail: 0.3 });
  effects.spawn('sprite', c.scene, at, { texture: TEX.shiny, size: 0.8, seconds: ticks(4), growFrom: 1.3, grow: 0.3, spin: 4, fadeTail: 0.4 });
  effects.spawn('particles', c.scene, at, { recipe: chips, count: 14 });
  strikeOn(c.scene, skill, target);
};

/** The enhanced blow, timed as the Classic one; the skill is read now, before another is dispatched. */
export const litBlow = (chips: ParticleRecipe): Step => (at, c) =>
  atSwordBlow(swordBlowLit(baseSkill(currentSkill), chips))(at, c);
/**
 * RenderJoints' U for tail j is `(NumTails - j) / (MaxTails - 1)` (ZzzEffectJoint.cpp:7087-7091) while `paths` puts slot i
 * at `1 - i / (MaxTails - 1)`: a joint still filling starts at slot `MaxTails - 1 - NumTails`, the slots before it closed on its head.
 */
export const tailOfSlot = (i: number, numTails: number, maxTails: number): number => Math.max(0, i - (maxTails - 1 - numTails));
