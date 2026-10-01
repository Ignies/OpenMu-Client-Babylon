import { defineSkill } from '@/controllers/skills/define';
import { CAST_HEIGHT, SkillContext, Step, TICK, cm, forwardOf, model, particles, perTick, seq, sprite, ticks } from '@/controllers/skills/visuals';
import { DEG, groundAt } from '../../_shared';
import { EXPLOSION_CELLS, MODEL, RGBS, TEX } from '@/controllers/fx/recipes';
import { bonePos, delay, entityGone, entityPos, entityYaw, fxNow, type ParticleRecipe, type PointSource } from '@/controllers/fx/core';
import { Vector3 } from '@/controllers/render/babylon/exports';
import { effects } from '@/controllers/fx';
import { muAngle, sfx } from '../_shared';

/**
 * Chaotic Diseier's body: 5 BITMAP_SHINY+6 sub3 for 24 ticks, each drawing a one-frame dark shiny05
 * (64 px x 2, Light 0.5) at a random bone 20 cm along the facing every tick (ZzzEffect.cpp:1251-1260,
 * :6825-6832). One card per emitter that jumps to a new bone each tick.
 */
const chaoticStars: Step = (_at, c) => {
  const t0 = fxNow();
  for (let s = 0; s < 5; s++) {
    let tick = -1;
    let bone = 0;
    const follow: PointSource = out => {
      const k = Math.floor((fxNow() - t0) / TICK);
      if (k !== tick) {
        tick = k;
        const n = (c.caster.modelObject?.gltf?.skeleton?.bones.length ?? 0) - 1;
        bone = n > 0 ? Math.floor(Math.random() * n) : 0;
      }
      bonePos(c.caster, bone, out, CAST_HEIGHT);
      const f = forwardOf(entityYaw(c.caster));
      out.x += f.x * cm(20);
      out.z += f.z * cm(20);
      return out;
    };
    effects.spawn('sprite', c.scene, follow(new Vector3()), { texture: TEX.shiny5, blend: 'subtract', colour: [0.5, 0.5, 0.5], size: cm(128), seconds: ticks(24), fadeTail: 0.001, follow });
  }
};

/**
 * BITMAP_SMOKE sub59 off each ribbon head every move: 41-81 cm, +0.09 scale a tick, LT 40, rising 6-9 cm a
 * tick, subtracting smoke01 x `LT / 40 x 0.9` (ZzzEffectParticle.cpp:1481-1486, :5646-5649). Drawn as black
 * over smoke02's alpha, held to 0.2: smoke01 peaks at 0.28 luminance where smoke02's alpha reaches 0.89.
 */
const CHAOS_SMOKE: ParticleRecipe = {
  texture: TEX.smokeAlpha,
  softEdge: true,
  colour: [0, 0, 0],
  size: cm(61),
  sizeJitter: 0.33,
  life: ticks(40),
  lifeJitter: 0,
  box: [0, 0, 0],
  dir1: [0, 1, 0],
  dir2: [0, 1, 0],
  power: perTick(7.6),
  powerJitter: 0.2,
  gravity: 0,
  endScale: 4.8,
  blend: 'alpha',
  alpha: 0.2,
  capacity: 384,
};
/** Graded tiers: black ash flecks the ribbon heads shed, drifting down. */
const CHAOS_ASH: ParticleRecipe = {
  ...CHAOS_SMOKE,
  size: 0.14,
  sizeJitter: 0.5,
  life: 0.9,
  lifeJitter: 0.4,
  box: [0.15, 0.2, 0.15],
  dir1: [-0.4, -0.2, -0.4],
  dir2: [0.4, 0.3, 0.4],
  power: 0.4,
  powerJitter: 0.5,
  gravity: -0.6,
  spin: 3,
  endScale: 0.6,
  alpha: 0.8,
  capacity: 256,
};
/** Graded tiers: the dark wake each MODEL_DESAIR drags. */
const CHAOS_WAKE: ParticleRecipe = { ...CHAOS_SMOKE, size: 0.4, sizeJitter: 0.3, life: 0.5, lifeJitter: 0.3, power: 0.15, endScale: 2.2, spin: 1, alpha: 0.3, capacity: 256 };
/** Graded tiers: the bomb's dark smoke thrown out low along the ground. */
const CHAOS_BURST: ParticleRecipe = {
  ...CHAOS_SMOKE,
  size: 0.6,
  sizeJitter: 0.35,
  life: 0.9,
  lifeJitter: 0.3,
  box: [0.1, 0.05, 0.1],
  dir1: [-1, 0.05, -1],
  dir2: [1, 0.3, 1],
  power: 2.2,
  powerJitter: 0.4,
  gravity: 0,
  spin: 1.2,
  endScale: 3,
  alpha: 0.35,
  capacity: 128,
};
/** Graded tiers: black chips the bomb throws up. */
const CHAOS_BURST_ASH: ParticleRecipe = { ...CHAOS_ASH, size: 0.12, life: 0.8, box: [0.1, 0.1, 0.1], dir1: [-1, 0.8, -1], dir2: [1, 1.8, 1], power: 3, gravity: -5, capacity: 128 };
/** BITMAP_2LINE_GHOST sub0 keeps 26 tails (ZzzEffectJoint.cpp:602-622). */
const GHOST_TAILS = 26;
/** MODEL_DESAIR sheds its two feathers on LifeTime 50, 40 ... 10 (EffectBehaviors.cpp:31-46). */
const DESAIR_DROPS = [2, 12, 22, 32, 42] as const;

/** MODEL_FEATHER sub2/3 (ZzzEffect.cpp:4692-4730, :8350-8395): dark, +-40 cm off the bird, any angle, 100 ticks, alpha, light and size x0.97 a tick. */
function chaoticFeather(c: SkillContext, at: Vector3): void {
  const jitter = (): number => cm((Math.floor(Math.random() * 20) - 10) * 4);
  const angle = (): number => Math.floor(Math.random() * 360);
  model({
    model: MODEL.feather,
    blend: 'subtract',
    colour: RGBS.white,
    scale: 1.4 * (1 + (Math.floor(Math.random() * 20) - 10) * 0.03),
    grow: Math.pow(0.97, 100),
    alpha: 0.6 + Math.floor(Math.random() * 10) * 0.02,
    seconds: ticks(100),
    life: p => Math.pow(0.97, 200 * p),
    spin: (Math.floor(Math.random() * 10) - 5) * 25 * DEG,
    ...muAngle(angle(), angle(), angle()),
  })(new Vector3(at.x + jitter(), at.y + jitter(), at.z + jitter()), c);
}

/**
 * One BITMAP_2LINE_GHOST sub0 (ZzzEffectJoint.cpp:602-622, :3707-3719): from the caster +-119 cm
 * along the world X and 49-108 cm up, it flies the caster's facing at 40-59 cm a tick for 67 or 75
 * ticks, weaving +10 deg a tick while `LifeTime % 16 <= 7` and -10 after; 2line_gost, dark,
 * 21-220 cm wide. Two in three carry a MODEL_DESAIR (Light 0.5 on the ribbon).
 */
function chaoticGhost(c: SkillContext, feet: Vector3, yaw: number, hd = false): void {
  const life = Math.random() < 0.5 ? 67 : 75;
  const moves = life + 1;
  const v = cm(40 + Math.floor(Math.random() * 20));
  const width = cm(20 + Math.floor(Math.random() * 200) + 1);
  const carrier = Math.floor(Math.random() * 3) < 2;
  const xs = new Float32Array(moves + 1);
  const zs = new Float32Array(moves + 1);
  xs[0] = feet.x + cm(-119 + Math.floor(Math.random() * 240));
  zs[0] = feet.z;
  const y = feet.y + cm(49 + Math.floor(Math.random() * 60));
  let a = yaw;
  for (let k = 0; k < moves; k++) {
    xs[k + 1] = xs[k] + Math.sin(a) * v;
    zs[k + 1] = zs[k] - Math.cos(a) * v;
    a += ((life - k) % 16 <= 7 ? 10 : -10) * DEG;
  }
  const t0 = fxNow();
  // The first move runs as the joint is made.
  const head: PointSource = out => {
    const f = Math.min(moves, 1 + (fxNow() - t0) / TICK);
    const k = Math.min(moves - 1, Math.floor(f));
    const u = f - k;
    return out.set(xs[k] + (xs[k + 1] - xs[k]) * u, y, zs[k] + (zs[k + 1] - zs[k]) * u);
  };
  const at = head(new Vector3());
  const shade = carrier ? 0.5 : 1;
  effects.spawn('joint', c.scene, at, { head, maxTails: GHOST_TAILS, width, colour: [shade, shade, shade], blend: 'subtract', texture: TEX.twoLineGhost, seconds: ticks(moves), fadeTail: 0.01 });
  effects.spawn('particles', c.scene, at, { recipe: CHAOS_SMOKE, rate: 25, seconds: ticks(moves), follow: head });
  if (hd) effects.spawn('particles', c.scene, at, { recipe: CHAOS_ASH, rate: 8, seconds: ticks(moves - 6), follow: head });
  if (!carrier) return;
  if (hd) effects.spawn('particles', c.scene, at, { recipe: CHAOS_WAKE, rate: 22, seconds: ticks(50), follow: head });
  // MODEL_DESAIR: LT 52, Scale 1.4, RENDER_DARK at Light 1, on the ribbon's head and heading (EffectRegistry.cpp:48-53, ZzzObject.cpp:1507-1511).
  model({ model: MODEL.desair, scale: 1.4, seconds: ticks(52), blend: 'subtract', colour: RGBS.white, follow: head, yaw: -yaw, aim: true, aimYaw: Math.PI, fadeTail: 0.001 })(at, c);
  for (const k of DESAIR_DROPS) {
    delay(ticks(k), () => {
      const p = head(new Vector3());
      chaoticFeather(c, p);
      chaoticFeather(c, p);
    });
  }
}

/** The eight ribbons, heading where the caster faces. `hd`: ash off each head and a wake behind each bird. */
const chaoticGhostsOf = (hd: boolean): Step => (_at, c) => {
  const feet = entityPos(c.caster, 0, new Vector3());
  const yaw = entityYaw(c.caster);
  for (let i = 0; i < 8; i++) chaoticGhost(c, feet, yaw, hd);
};
const chaoticGhosts = chaoticGhostsOf(false);

/**
 * CreateBomb sub6's BITMAP_SPARK sub10 (ZzzEffectParticle.cpp:2060-2079, :6558-6600, :9283-9285): a dark
 * Clud64 puff 38-67 cm, thrown 6-21 cm a tick up and up to 9 sideways, falling 2 cm a tick faster
 * each tick and bouncing at 0.6, at a coverage of `LifeTime / 16 / 1.02`. The bounce's
 * `LifeTime -= 4` is not ported.
 */
function cludPuff(c: SkillContext, at: Vector3): void {
  const life = 24 + Math.floor(Math.random() * 16);
  const turn = Math.floor(Math.random() * 360) * DEG;
  const side = (Math.floor(Math.random() * 60) - 30) * 0.1 * 3;
  const vx = cm(-Math.sin(turn) * side);
  const vz = cm(Math.cos(turn) * side);
  let g = 6 + Math.floor(Math.random() * 16);
  const xs = new Float32Array(life + 1);
  const ys = new Float32Array(life + 1);
  const zs = new Float32Array(life + 1);
  xs[0] = at.x;
  ys[0] = at.y;
  zs[0] = at.z;
  for (let k = 0; k < life; k++) {
    let y = ys[k] + cm(g);
    g -= 2;
    const ground = groundAt(xs[k], zs[k], -Infinity);
    if (y < ground) {
      y = ground;
      g = -g * 0.6;
    }
    xs[k + 1] = xs[k] + vx;
    ys[k + 1] = y;
    zs[k + 1] = zs[k] + vz;
  }
  const t0 = fxNow();
  const follow: PointSource = out => {
    const f = Math.min(life, (fxNow() - t0) / TICK);
    const k = Math.min(life - 1, Math.floor(f));
    const u = f - k;
    return out.set(xs[k] + (xs[k + 1] - xs[k]) * u, ys[k] + (ys[k + 1] - ys[k]) * u, zs[k] + (zs[k + 1] - zs[k]) * u);
  };
  const size = cm(64 * (4 + Math.floor(Math.random() * 4)) * 0.1 * 1.5);
  // glColor clamps the coverage at 1, so it only fades over the last 16 ticks.
  effects.spawn('sprite', c.scene, at, { texture: TEX.clud, blend: 'subtract', cover: 1, size, seconds: ticks(life), fadeTail: Math.min(1, (16 * 1.02) / life), follow });
}

/**
 * CreateBomb(target, true, 6), made only by the caster's own client at his selected target
 * (ClassAttack.cpp:762; the WSclient copies are subtype 0 and never reached): 20 dark Clud64 puffs and
 * a grey (0.3) BITMAP_EXPLOTION_MONO, 80 cm up, which plays SOUND_EXPLOTION01 (ZzzEffect.cpp:6275-6346).
 */
const chaoticBombOf = (hd: boolean): Step => (_at, c) => {
  if (!c.caster.localPlayer || !c.target || entityGone(c.target)) return;
  const p = entityPos(c.target, cm(80), new Vector3());
  // Graded tiers: the grey card at 0.16; at the original's 0.3 the tone curve lifted it into a white fog ball over the dark puffs.
  const grey = hd ? 0.16 : 0.3;
  sprite({ texture: TEX.explosionMono, colour: [grey, grey, grey], size: cm(256), seconds: ticks(20), cells: EXPLOSION_CELLS, fadeTail: 0.25 })(p, c);
  for (let j = 0; j < 20; j++) cludPuff(c, p);
  if (hd) {
    const ground = new Vector3(p.x, groundAt(p.x, p.z, p.y - cm(80)) + 0.15, p.z);
    particles({ recipe: CHAOS_BURST, count: 14 })(ground, c);
    particles({ recipe: CHAOS_BURST_ASH, count: 22 })(p, c);
  }
  sfx('Sound/eExplosion')(p, c);
};
const chaoticBomb = chaoticBombOf(false);

export default defineSkill({
  id: 238,
  name: "Chaotic Diseier",
  // 238 Chaotic Diseier (523): the dark stars on the body, eight dark 2line_gost ribbons with their birds, feathers and
  // smoke flying the facing, and on the caster's own screen the dark bomb at his target (ClassAttack.cpp:698-775,
  // WSclient.cpp:4971-5025). SOUND_SKILL_CAOTIC is SKILL_SOUNDS[238].
  visual: { area: seq(chaoticStars, chaoticGhosts, chaoticBomb), enhanced: { area: seq(chaoticStars, chaoticGhostsOf(true), chaoticBombOf(true)) } },
  // 237 Gigantic Storm plays gigantic_storm from its row, at the clip key (ZzzCharacter.cpp:4777).
  sound: 'Sound/caotic', // Chaotic Diseier
});
