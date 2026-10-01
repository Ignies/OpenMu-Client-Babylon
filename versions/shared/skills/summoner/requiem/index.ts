import { defineSkill } from '@/controllers/skills/define';
import { MODEL, TEX } from '@/controllers/fx/recipes';
import { entityGone, entityPos, entityYaw, type ParticleRecipe, type PointSource, type RGB } from '@/controllers/fx/core';
import { SkillContext, Step, cm, forwardOf, particles, seq, ticks } from '@/controllers/skills/visuals';
import { SummonCast, bookTier, curseLight, levelLight, risingEmbersFor, summonCast, summonCastGrace } from '../_shared';
import { Vector3 } from '@/controllers/render/babylon/exports';
import { effects } from '@/controllers/fx';
import { playCombat } from '@/controllers/sound/combat';

import { SUMMON_CLIPS } from '../_shared';

const CAST_REQUIEM: SummonCast = { impact: [0.7, 0.7, 1], outer: [0, 0.7, 1], inner: [0, 0, 1], burst: [0.8, 0.5, 1] };

/** Neil's light: his white body and the red blade glow. */
const NEIL_TINT: RGB = [1, 0.2, 0.25];
/** The knives and ground rings on the point: white meshes with red ones. */
const NEIL_GROUND_TINT: RGB = [1, 0.45, 0.5];
/** Red chips thrown off the point as the knives land. */
const NEIL_SPARKS: ParticleRecipe = {
  texture: TEX.spark2,
  colour: [1, 0.35, 0.35],
  colourEnd: [0.7, 0, 0.05],
  size: 0.16,
  life: 0.5,
  lifeJitter: 0.3,
  power: 3.2,
  powerJitter: 0.4,
  gravity: -5,
  dir1: [-0.7, 0.4, -0.7],
  dir2: [0.7, 1, 0.7],
  spin: 6,
  capacity: 96,
};

/** The knives land (tick 23): a red flash on the point and chips thrown off it. */
function neilKnivesGrace(c: SkillContext, point: Vector3): void {
  effects.spawn('sprite', c.scene, point, { texture: TEX.flare, colour: [1, 0.25, 0.3], size: 1.8, seconds: ticks(8), fadeTail: 0.8, height: 0.6 });
  particles({ recipe: NEIL_SPARKS, count: 18 })(new Vector3(point.x, point.y + 0.4, point.z), c);
}

/** The ground rings (tick 29, 50 ticks): their light, a red glow under them and embers rising off them. */
function neilGroundGrace(c: SkillContext, point: Vector3, tier: number): void {
  const at = new Vector3(point.x, point.y + 0.05, point.z);
  effects.spawn('sprite', c.scene, at, { texture: TEX.flare, colour: [0.22, 0.03, 0.05], size: 2.6 + 0.4 * tier, seconds: ticks(50), fadeIn: 0.1, fadeTail: 0.4, flat: true });
  effects.spawn('particles', c.scene, at, { recipe: risingEmbersFor([1, 0.15, 0.2], 1.3), rate: 26, seconds: ticks(36), height: 0.1 });
  curseLight(c.scene, NEIL_GROUND_TINT, 1.5 + 0.3 * tier, ticks(50), at, undefined, { attack: ticks(4), release: ticks(20), heightOffset: 0.6, floorGain: 0.5 });
}

/** The nine bones Neil's red flare01 sprites sit on; 51 and 59 are also the blade blur's ends (ZzzObject.cpp:1719-1750). */
const NEIL_GLOW_BONES = [51, 52, 53, 54, 55, 56, 57, 58, 59];
const NEIL_KNIVES = [MODEL.neilKnife1, MODEL.neilKnife2, MODEL.neilKnife3];
const NEIL_GROUNDS = [MODEL.neilGround1, MODEL.neilGround2, MODEL.neilGround3];

/**
 * 224 Requiem (SummonSystem.cpp:158-174, ZzzEffect.cpp:797-806, MoveHandlers.cpp:1263-1303):
 * MODEL_SUMMONER_SUMMON_NEIL one tile before the caster, 10 cm up, LT 80, action 0 once at 0.35 keys a
 * tick, Alpha +0.04 a tick to 0.72 and -0.05 from LT 20. Meshes 0 / 2 bright while Alpha < 0.7 and
 * textured from there, mesh 1 bright red; nine red flare01 on bones 51-59 and a red blur from bone 51 to 59
 * through frames 0-10 (ZzzObject.cpp:1703-1753). Frame 8 (tick 23): NIFE1 (+2 at +7, +3 at +11) on the
 * point, LT 50, mesh 0 textured and mesh 1 bright red (EffectBehaviors.cpp:97-103). Frame 10 (tick 29):
 * GROUND1 60 cm before Neil and GROUND1 (+2, +3) on the point, LT 50, Alpha +0.3 a tick, both meshes
 * bright, mesh 1's U running -1 a second (ZzzObject.cpp:1761-1765), and requiem02.
 */
const requiemOf = (graded: boolean): Step => (at, c) => {
  if (entityGone(c.caster)) return;
  const tier = bookTier(c.caster);
  const yaw = entityYaw(c.caster);
  const f = forwardOf(yaw);
  const home = entityPos(c.caster, cm(10), new Vector3());
  home.x += f.x;
  home.z += f.z;
  const point = at.clone();
  let glows = false;
  let knives = false;
  let grounds = false;
  const neil = effects.spawn('summon', c.scene, home, {
    model: MODEL.summonNeil,
    seconds: ticks(80),
    yaw,
    alpha: 0,
    meshes: [{ draw: 'add' }, { draw: 'add', colour: [1, 0, 0] }, { draw: 'add' }],
    keysPerTick: 0.35,
    loop: false,
    drive: (b, t) => {
      b.alpha = t < 60 ? Math.min(0.72, 0.04 * t) : 0.72 - 0.05 * (t - 60);
      const d = b.alpha < 0.7 ? 'add' : 'alpha';
      b.draw(0, d);
      b.draw(2, d);
      if (!glows && b.loaded) {
        glows = true;
        const gone = (): boolean => !neil.alive;
        const on = (n: number): PointSource => out => (b.bone(n, out) ? out : out.copyFrom(b.at));
        for (const n of NEIL_GLOW_BONES) {
          effects.spawn('sprite', c.scene, b.at, { texture: TEX.flare, colour: [1, 0, 0], size: cm(64), seconds: ticks(80 - t), fadeTail: 0, follow: on(n), until: gone });
        }
        if (t < 28) effects.spawn('blur', c.scene, b.at, { follow: on(59), base: on(51), colour: [1, 0, 0], texture: TEX.motionBlurR, seconds: ticks(28.6 - t), until: gone });
        if (graded) levelLight(c.scene, NEIL_TINT, 1.2, ticks(80 - t), b.at.clone(), on(55), () => b.alpha / 0.72, { release: ticks(4), heightOffset: 0.6, floorGain: 0.35 });
      }
      if (!knives && t >= 23) {
        knives = true;
        if (graded) neilKnivesGrace(c, point);
        for (let i = 0; i <= tier; i++) {
          effects.spawn('summon', c.scene, point, {
            model: NEIL_KNIVES[i],
            seconds: ticks(50),
            yaw,
            meshes: [{ draw: 'alpha' }, { draw: 'add', colour: [1, 0, 0] }],
            loop: false,
            drive: (k, kt) => {
              k.alpha = kt < 30 ? 1 : 1 - 0.05 * (kt - 30);
            },
          });
        }
      }
      if (!grounds && t >= 29) {
        grounds = true;
        const ground = (m: string, p: Vector3): void => {
          effects.spawn('summon', c.scene, p, {
            model: m,
            seconds: ticks(50),
            yaw,
            alpha: 0,
            meshes: [{ draw: 'add' }, { draw: 'add', scrollU: -1 }],
            drive: (g, gt) => {
              g.alpha = gt < 30 ? Math.min(1.2, 0.3 * gt) : 1.2 - 0.05 * (gt - 30);
            },
          });
        };
        ground(MODEL.neilGround1, new Vector3(b.at.x + f.x * cm(60), b.at.y, b.at.z + f.z * cm(60)));
        for (let i = 0; i <= tier; i++) ground(NEIL_GROUNDS[i], point);
        playCombat('Sound/SE_Ch_summoner_skill06_requiem02', point);
        if (graded) neilGroundGrace(c, point, tier);
      }
    },
  });
};

export default defineSkill({
  id: 224,
  name: "Requiem",
  // 224 Requiem: the casting circle, Neil before the caster swinging his blade, the knives and ground rings on
  // the point (summonCast, requiem).
  visual: {
    cast: summonCast(CAST_REQUIEM),
    area: requiemOf(false),
    enhanced: { cast: seq(summonCast(CAST_REQUIEM), summonCastGrace(CAST_REQUIEM)), area: requiemOf(true) },
  },
  buffs: {
    // 74 eDeBuff_NeilDOT (Requiem) and 75 eDeBuff_SahamuttDOT (Explosion) (ZzzCharacter.cpp:10932-10948).
    74: () => ({ neilSparks: true }),
  },
  sound: 'Sound/SE_Ch_summoner_skill06_requiem01', // Requiem (SOUND_SUMMON_NEIL)
  delayMs: 4000, // Requiem
  clip: SUMMON_CLIPS, // Requiem
});
