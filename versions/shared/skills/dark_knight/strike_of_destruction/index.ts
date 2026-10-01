import { defineSkill } from '@/controllers/skills/define';
import { type Entity } from '@/ecs/world';
import { MODEL, RGBS, SMOKE, TEX } from '@/controllers/fx/recipes';
import { delay, entityPos, entityYaw, type ParticleRecipe, type RGB } from '@/controllers/fx/core';
import { Vector3, type Scene } from '@/controllers/render/babylon/exports';
import { Step, after, cm, forwardOf, ticks, toward } from '@/controllers/skills/visuals';
import { effects } from '@/controllers/fx';
import { lightAt } from '../../_shared';
import { lighting } from '@/controllers/lighting';

/** BITMAP_WATERFALL_5 sub8 (ZzzEffectParticle.cpp:3476-3481, :8437-8446): 1.2-1.9 m, rising 1-3 cm a tick less 0.6 a tick, +0.05 Scale and Light /1.1 a tick. */
const DESTRUCTION_MIST: ParticleRecipe = {
  texture: TEX.waterFall5,
  colour: [0.5, 0.5, 1],
  colourEnd: [0.11, 0.11, 0.22],
  size: 1.54,
  sizeJitter: 0.23,
  life: ticks(30),
  lifeJitter: 0,
  box: [1.5, 0.75, 1.5],
  dir1: [0, 0.25, 0],
  dir2: [0, 0.75, 0],
  power: 1,
  powerJitter: 0,
  gravity: -3.75,
  endScale: 1.6,
  capacity: 256,
};
/** BITMAP_WATERFALL_3 sub8 (:3663-3668, :8597-8604): 32-61 cm, rising 5-9 cm a tick less 0.6 a tick, the same growth and fade. */
const DESTRUCTION_SPLASH: ParticleRecipe = {
  ...DESTRUCTION_MIST,
  texture: TEX.waterFall3,
  size: 0.47,
  sizeJitter: 0.3,
  dir1: [0, 1.25, 0],
  dir2: [0, 2.25, 0],
  endScale: 3.1,
};
/** BITMAP_SMOKE sub55 (:1540-1547, :5736-5745): about 1 m, rising faster by 0.1 cm a tick, +0.05 Scale and Light /1.08 a tick. */
const DESTRUCTION_SMOKE: ParticleRecipe = {
  texture: TEX.smoke,
  colour: RGBS.white,
  colourEnd: [0.31, 0.31, 0.31],
  size: 1.05,
  sizeJitter: 0.1,
  life: ticks(30),
  lifeJitter: 0,
  box: [1.5, 0.75, 1.5],
  dir1: [0, 0, 0],
  dir2: [0, 0, 0],
  power: 0,
  powerJitter: 0,
  gravity: 0.625,
  endScale: 1.9,
  capacity: 256,
};
/**
 * Spots a tick at the target (MoveHandlers.cpp:7589-7604 throws 15 into a 3 m cube round an absolute z of
 * 150, the ground here): only the upper half of the cube is above ground, so half the spots, in that half.
 */
const DESTRUCTION_SPOTS = 4;
/** The controllers' `Light /= 1.05` a tick (ZzzEffect.cpp:9214-9240). */
const DESTRUCTION_LIGHT_DECAY = 1 / 1.05;

/**
 * Strike of Destruction (ZzzCharacter.cpp:4169-4179): MODEL_BLOW_OF_DESTRUCTION is no mesh but two
 * controllers, sub0 100 cm ahead and 20 right of the caster (A) and sub1 on the target tile (B), LT 40
 * (ZzzEffect.cpp:4771-4792). Nothing shows until LT 24: then the Swordeff_mono flash 65 cm over A and the
 * 3.2 m BITMAP_LIGHT a metre over B, FLARE_BLUE ground marks 4 and 6 tiles wide tinted a Light that falls
 * from 1.2 by /1.05 a tick (ZzzEffect.cpp:9214-9240, :10058-10073), the camera shaking to LT 15 and the
 * spray at B. At LT 23 the splashes and cracks (MoveHandlers.cpp:7530-7625). The original's stones there are
 * created at Scale 0 (sub13 multiplies by CreateEffect's Scale, 0 here: ZzzEffect.cpp:2700-2710) and never show.
 */
const blowOfDestruction: Step = (at, c) => {
  const yaw = entityYaw(c.caster);
  const f = forwardOf(yaw);
  const feet = entityPos(c.caster, 0, new Vector3());
  // (-20, -100) in the caster's frame: a metre ahead, 20 cm to its right, (f.z, -f.x).
  const a = new Vector3(feet.x + f.x + f.z * cm(20), feet.y, feet.z + f.z - f.x * cm(20));
  const b = at.clone();
  const tint: RGB = [0.3, 0.3, 1];
  const turn = (): number => Math.random() * Math.PI * 2;
  // The crack streaks on mesh 1 scroll `-(WorldTime % 2000) * 0.0001` in V (ZzzObject.cpp:606-617).
  const streaks = { mesh: 1, at: (now: number): number => -((now * 1000) % 2000) * 0.0001 };
  // The crack meshes are authored flat in MU's XY, so the default (upright) basis is what lays them down.

  after(ticks(16), (_p, cc) => {
    effects.spawn('sprite', cc.scene, a, { texture: TEX.swordEffMono, colour: [0.5, 0.5, 1], size: cm(64) * 3.05, height: cm(65), seconds: ticks(24), fadeTail: 0.1 });
    // L = 1.2 falling /1.05 a tick to 0.37 at LT 0, then cut.
    const light = { seconds: ticks(24), fadeTail: 0.04, decay: DESTRUCTION_LIGHT_DECAY };
    effects.spawn('ring', cc.scene, a, { texture: TEX.flareBlue, colour: [1.2, 1.2, 1.2], scale: 4, fadeColour: true, ...light });
    effects.spawn('sprite', cc.scene, b, { texture: TEX.flare, colour: [0.6, 0.6, 1.2], size: cm(64) * 5, height: 1, ...light });
    effects.spawn('ring', cc.scene, b, { texture: TEX.flareBlue, colour: [1.2, 1.2, 1.2], scale: 6, fadeColour: true, ...light });
    effects.spawn('quake', cc.scene, b, { seconds: ticks(10), min: -0.4, max: 0.3 });
    const spot = new Vector3(b.x, b.y + 0.75, b.z);
    for (let k = 0; k < 10; k++) {
      delay(ticks(k), () => {
        effects.spawn('particles', cc.scene, spot, { recipe: DESTRUCTION_MIST, count: DESTRUCTION_SPOTS });
        effects.spawn('particles', cc.scene, spot, { recipe: DESTRUCTION_SPLASH, count: DESTRUCTION_SPOTS });
        effects.spawn('particles', cc.scene, spot, { recipe: DESTRUCTION_SMOKE, count: DESTRUCTION_SPOTS });
      });
    }
  })(at, c);

  after(ticks(17), (_p, cc) => {
    const splash = (p: Vector3, scale: number): void => {
      effects.spawn('model', cc.scene, p, { model: MODEL.nightwater, scale, colour: tint, yaw: turn(), seconds: ticks(25), fadeTail: 1 });
    };
    splash(a, 0.9);
    splash(a, 0.9);
    effects.spawn('model', cc.scene, a, { model: MODEL.knightPlanCrack, scale: 1.2 + Math.floor(Math.random() * 10) * 0.05, colour: tint, yaw: turn(), height: cm(10), seconds: ticks(25), fadeTail: 1, scrollV: streaks });
    // KNIGHT_PLANCRACK_B every 55 cm from A, one per metre to B plus one: about half the way. Each is turned
    // +90 deg at its init and alternately 10-29 deg either side of the caster's facing.
    const dir = toward(a, b);
    const n = Math.floor(Math.hypot(b.x - a.x, b.z - a.z)) + 1;
    for (let i = 0; i < n; i++) {
      const side = ((10 + Math.floor(Math.random() * 20)) * Math.PI) / 180;
      const p = new Vector3(a.x + dir.x * cm(55) * i, a.y, a.z + dir.z * cm(55) * i);
      effects.spawn('model', cc.scene, p, { model: MODEL.knightPlanCrack2, scale: 1, colour: tint, yaw: yaw + Math.PI / 2 + (i % 2 === 0 ? side : -side), height: cm(15), seconds: ticks(25), fadeTail: 1, scrollV: streaks });
    }
    splash(b, 2);
    splash(b, 1);
    // RAKLION_BOSS_CRACKEFFECT: Scale 0.2 + 1, 30 cm up, alpha -0.03 a tick, so gone after 33 of its 40 ticks.
    effects.spawn('model', cc.scene, b, { model: MODEL.knightPlanCrackGrand, scale: 1.2, colour: tint, yaw: turn(), height: cm(30), seconds: ticks(33), fadeTail: 1 });
  })(at, c);
};

/**
 * The Cold debuff's one look on insert (WSclient.cpp:15631-15634): MODEL_ICE sub0 at the feet, Scale 0.8,
 * BlendMesh 0, LT 50, smoking and fading once its clip passes key 5 (ZzzEffect.cpp:2187-2195, :7637-7661).
 * The body tint, the bright pass and the slowed walk that go with it are common/debuffBody.ts.
 */
function coldIce(scene: Scene, entity: Entity): void {
  const feet = entityPos(entity, 0, new Vector3());
  effects.spawn('model', scene, feet, { model: MODEL.ice, seconds: ticks(50), scale: 0.8, blendMesh: 0, colour: RGBS.white, loop: false, fadeTail: 0.4 });
  // A BITMAP_SMOKE every other tick 32-160 cm up while it fades, its last 20 ticks.
  delay(ticks(30), () => effects.spawn('particles', scene, feet, { recipe: SMOKE, rate: 12.5, seconds: ticks(20), height: 0.96 }));
}

/** Strike of Destruction's ice chips out of the strike, bright and falling back. */
const DESTRUCTION_CHIPS: ParticleRecipe = {
  texture: TEX.spark2,
  colour: [0.75, 0.85, 1.2],
  colourEnd: [0.15, 0.25, 0.6],
  size: 0.11,
  sizeJitter: 0.35,
  life: 0.75,
  lifeJitter: 0.3,
  box: [0.5, 0.05, 0.5],
  dir1: [-1, 1, -1],
  dir2: [1, 2.2, 1],
  power: 3.2,
  powerJitter: 0.4,
  gravity: -9,
  spin: 6,
  capacity: 128,
};
/** Cold breathing off the cracks as they fade. */
const DESTRUCTION_FROST: ParticleRecipe = {
  texture: TEX.flare,
  colour: [0.3, 0.4, 0.9],
  colourEnd: [0.04, 0.06, 0.18],
  size: 0.16,
  sizeJitter: 0.4,
  life: 1,
  lifeJitter: 0.3,
  box: [0.25, 0.02, 0.25],
  dir1: [-0.1, 0.6, -0.1],
  dir2: [0.1, 1, 0.1],
  power: 0.6,
  powerJitter: 0.3,
  gravity: 0.2,
  endScale: 1.8,
  capacity: 128,
};

/**
 * Strike of Destruction, graded: the same controllers, marks, spray and cracks, with the strike landing
 * at B as a short white-blue core, a shock running out over the 6-tile mark and ice chips thrown up (a
 * smaller shock and chips at A), and frost breathing off each crack while it fades. Lights: `a`, `b`
 * over the two marks for their 24 ticks and a `strike` pop at B.
 */
const blowOfDestructionPlus: Step = (at, c) => {
  blowOfDestruction(at, c);
  const f = forwardOf(entityYaw(c.caster));
  const feet = entityPos(c.caster, 0, new Vector3());
  const a = new Vector3(feet.x + f.x + f.z * cm(20), feet.y, feet.z + f.z - f.x * cm(20));
  const b = at.clone();
  delay(ticks(16), () => {
    lighting.skillSpot(c.scene, 232, 'a', lightAt(a));
    lighting.skillSpot(c.scene, 232, 'b', lightAt(b));
    lighting.skillSpot(c.scene, 232, 'strike', lightAt(b));
    effects.spawn('sprite', c.scene, b, { texture: TEX.flare, colour: [0.4, 0.5, 0.85], size: 1.8, height: 0.8, seconds: ticks(5), fadeTail: 0.8 });
    effects.spawn('ring', c.scene, b, { texture: TEX.shockwave, colour: [0.4, 0.5, 1.1], scale: 2, grow: 3.5, seconds: ticks(12), fadeColour: true });
    effects.spawn('ring', c.scene, a, { texture: TEX.shockwave, colour: [0.3, 0.36, 0.85], scale: 1.2, grow: 3, seconds: ticks(10), fadeColour: true });
    effects.spawn('particles', c.scene, b, { recipe: DESTRUCTION_CHIPS, count: 28 });
    effects.spawn('particles', c.scene, a, { recipe: DESTRUCTION_CHIPS, count: 10 });
  });
  // The crack trail's spots, as blowOfDestruction lays them.
  delay(ticks(17), () => {
    const dir = toward(a, b);
    const n = Math.floor(Math.hypot(b.x - a.x, b.z - a.z)) + 1;
    const p = new Vector3();
    for (let i = 0; i < n; i++) {
      p.set(a.x + dir.x * cm(55) * i, a.y, a.z + dir.z * cm(55) * i);
      effects.spawn('particles', c.scene, p, { recipe: DESTRUCTION_FROST, count: 3 });
    }
    effects.spawn('particles', c.scene, b, { recipe: DESTRUCTION_FROST, count: 8 });
  });
};

export default defineSkill({
  id: 232,
  name: "Strike of Destruction",
  // 232 Strike of Destruction (337/340/343 alias here, drawn at the target's feet): see `blowOfDestruction`.
  visual: { area: blowOfDestruction, enhanced: { area: blowOfDestructionPlus } },
  buffs: {
    // 0x56 Cold (eDeBuff_BlowOfDestruction, Strike of Destruction and Chain Drive): the ice at the feet, once.
    86: (e, s) => ({ pulse: { every: Infinity, fire: () => coldIce(s, e) } }),
  },
});
