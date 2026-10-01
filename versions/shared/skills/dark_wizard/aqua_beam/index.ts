import { defineSkill } from '@/controllers/skills/define';
import { entityPos, type ParticleRecipe, type RGB } from '@/controllers/fx/core';
import { SkillContext, Step, cm, facing, sprite, ticks } from '@/controllers/skills/visuals';
import { TEX } from '@/controllers/fx/recipes';
import { Vector3 } from '@/controllers/render/babylon/exports';
import { dw2AtAttackTime } from '../_shared';
import { dw2Sfx } from '../../_shared';
import { effects } from '@/controllers/fx';
import { lighting } from '@/controllers/lighting';

/** BITMAP_BOSS_LASER sub0: LT 20, Light (0.5, 0.7, 1), 20 Spark03 cards of Scale 16 (32 px -> 5.12 m) 50 cm apart (ZzzEffect.cpp:978-1031, :8967-9004). */
const AQUA_CARDS = 20;
const AQUA_STEP = cm(50);
const AQUA_CARD_SIZE = cm(32 * 16);
const AQUA_TINT: RGB = [0.5, 0.7, 1];
/** Where the five lane lights sit along the beam, in cards from its start. */
const AQUA_LIGHT_CARDS = [2, 6, 10, 14, 18];

/**
 * Aqua Beam at AttackTime 15 (ZzzCharacter.cpp:4550-4554): the beam starts at CalcAddPosition(-20, -90, 100),
 * 0.9 tiles ahead, 0.2 to the side and 1 up, and runs 9.5 tiles along the facing, fixed in the world, at
 * one brightness for its 20 ticks. SOUND_FLASH with it.
 */
const aquaBeamWith = (tint: RGB, lightCards: readonly number[], extra?: (from: Vector3, dir: Vector3, c: SkillContext) => void): Step => (_at, c) => {
  const dir = facing(c);
  const from = entityPos(c.caster, 1, new Vector3());
  from.x += dir.x * 0.9 - dir.z * 0.2;
  from.z += dir.z * 0.9 + dir.x * 0.2;
  const card = sprite({ texture: TEX.spark3, colour: tint, size: AQUA_CARD_SIZE, seconds: ticks(20), fadeTail: 0.01 });
  for (let i = 0; i < AQUA_CARDS; i++) card(new Vector3(from.x + dir.x * AQUA_STEP * i, from.y, from.z + dir.z * AQUA_STEP * i), c);
  extra?.(from, dir, c);
  for (const i of lightCards) {
    const x = from.x + dir.x * AQUA_STEP * i;
    const z = from.z + dir.z * AQUA_STEP * i;
    lighting.skillSpot(c.scene, 12, 'lane', out => {
      out.x = x;
      out.y = from.y;
      out.z = z;
    });
  }
  dw2Sfx('Sound/sAquaFlash', from);
};
const aquaBeam = aquaBeamWith(AQUA_TINT, AQUA_LIGHT_CARDS);

/** Aqua Beam's cards a little deeper blue, so twenty overlaps hold a blue body round the white core on the graded buffer. */
const AQUA_TINT_GRADED: RGB = [0.35, 0.58, 1];
/** Three lane lights, 3.5 tiles apart, each sized to the cards' 2.5-tile reach. */
const AQUA_LIGHT_CARDS_GRADED = [3, 10, 17];
/** Spray shed along the beam: blue drops falling off it. */
const AQUA_SPRAY: ParticleRecipe = {
  texture: TEX.flare,
  colour: [0.75, 0.9, 1],
  colourEnd: [0.3, 0.55, 1],
  size: 0.3,
  sizeJitter: 0.35,
  life: 0.55,
  box: [0.3, 0.2, 0.3],
  dir1: [-0.8, -0.2, -0.8],
  dir2: [0.8, 1, 0.8],
  power: 2.2,
  gravity: -4,
  capacity: 256,
};
/** The splash where the beam ends: drops thrown up and out. */
const AQUA_SPLASH: ParticleRecipe = { ...AQUA_SPRAY, size: 0.2, life: 0.7, power: 3, dir1: [-1, 0.4, -1], dir2: [1, 1.6, 1] };

/** Enhanced Aqua Beam: a scrolling blue core with a white heart through the cards, spray along it, a flare at the staff and a splash at the end. */
const aquaBeamGraded = aquaBeamWith(AQUA_TINT_GRADED, AQUA_LIGHT_CARDS_GRADED, (from, dir, c) => {
  const len = AQUA_STEP * (AQUA_CARDS - 1);
  const end = new Vector3(from.x + dir.x * len, from.y, from.z + dir.z * len);
  const core = { to: end, seconds: ticks(20), segments: 4, jitter: 0, fadeTail: 0.25, texture: TEX.jointLaser, textureRepeats: 4, textureScroll: -3 };
  effects.spawn('joint', c.scene, from, { ...core, colour: [0.3, 0.55, 1], width: 0.7 });
  effects.spawn('joint', c.scene, from, { ...core, colour: [0.75, 0.88, 1], width: 0.22 });
  for (let i = 1; i <= 4; i++) {
    const k = (len * i) / 4;
    effects.spawn('particles', c.scene, new Vector3(from.x + dir.x * k, from.y, from.z + dir.z * k), { recipe: AQUA_SPRAY, rate: 20, seconds: ticks(18) });
  }
  effects.spawn('sprite', c.scene, from, { texture: TEX.flare, colour: [0.5, 0.75, 1], size: 2.2, seconds: ticks(10), growFrom: 0.5, grow: 1.2, fadeTail: 0.8 });
  effects.spawn('sprite', c.scene, end, { texture: TEX.flare, colour: [0.5, 0.75, 1], size: 1.8, seconds: ticks(20), growFrom: 0.6, fadeTail: 0.5 });
  effects.spawn('particles', c.scene, end, { recipe: AQUA_SPLASH, count: 16 });
});

export default defineSkill({
  id: 12,
  name: "Aqua Beam",
  // 12 Aqua Beam: BITMAP_BOSS_LASER sub0 along the facing at AttackTime 15 (`aquaBeam`); Enhanced `aquaBeamGraded`.
  visual: { area: dw2AtAttackTime(aquaBeam), enhanced: { area: dw2AtAttackTime(aquaBeamGraded) } },
});
