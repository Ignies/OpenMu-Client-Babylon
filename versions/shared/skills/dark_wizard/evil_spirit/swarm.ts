import { MODEL, TEX } from '@/controllers/fx/recipes';
import { delay, followEntity, fxNow, type ParticleRecipe, type PointSource, type RGB } from '@/controllers/fx/core';
import { type ShroudOptions } from '@/controllers/fx/shroud';
import { type SpiritSwarmOptions, type SwarmSpirit } from '@/controllers/fx/spiritSwarm';
import { type TaperShape } from '@/controllers/fx/joint';
import { facing, perTick, ticks, type Step } from '@/controllers/skills/visuals';
import { effects } from '@/controllers/fx';
import { Ecs } from '@/ecs/current';
import type { Entity } from '@/ecs/world';

/**
 * Ours (Skill effects: Enhanced): Evil Spirit's swarm. The original's JOINT_SPIRIT flights each carrying
 * its MODEL_LASER skull, eight in two waves; each one chases its own point circling the caster inside
 * the skill's reach, so together they cover the area it hits. Dark smoke trails them and a shroud
 * closes in on the view. See ../readme.md.
 */
const SPIRIT_COUNT = 8;
const SPIRIT_WAVE = 4;
/** Seconds between waves; each wave's headings sit between the previous wave's. */
const SPIRIT_WAVE_GAP = 0.1;
const SPIRIT_SPEED = perTick(36);
const SPIRIT_TURN = (16 * Math.PI) / 180;
/** Ticks of trail behind each skull: the original's 6 read as a stub once the spirits spread out. */
const SPIRIT_TAILS = 26;
/** Each trail is the shadow dragon's body: wide behind the head, held, then a tail, swaying as it flies. */
const SPIRIT_BODY_WIDTH = 0.9;
const SPIRIT_BODY_SHAPE: TaperShape = { nose: 0.9, span: 0.04, hold: 0.3, falloff: 1.2 };
const SPIRIT_SWAY = { amplitude: 0.35, cycles: 1.5, speed: 8 };
/** The darker spine down the middle of each body: the original's width-20 ribbon beside the width-80 one. */
const SPIRIT_CORE_WIDTH = 0.4;
/** The body's own coverage, lighter than the core so the spine reads through it. */
const SPIRIT_FLESH: RGB = [0.8, 0.8, 0.8];
/** The spine's coverage over JointLaser01's soft centre line (it peaks at 0.36). */
const SPIRIT_SPINE: RGB = [2.2, 2.2, 2.2];
/** Caps on the body's and spine's coverage gain: night maps lift the dark gain a long way. */
const SPIRIT_FLESH_MAX = 1;
const SPIRIT_SPINE_MAX = 2.2;
/** Two thin wisps braiding round each body, half a wave apart, swinging wider than the body sways. */
const SPIRIT_WISP_WIDTH = 0.14;
const SPIRIT_WISPS = [0, Math.PI].map(phase => ({ amplitude: 0.6, cycles: 2.2, speed: 11, phase }));
/** Dark smoke the dragons shed as they fly: a soft black haze along the path that spreads and fades. */
const SPIRIT_SMOKE: ParticleRecipe = {
  texture: TEX.smokeAlpha,
  softEdge: true,
  colour: [0.02, 0.02, 0.03],
  size: 0.55,
  sizeJitter: 0.4,
  life: 0.9,
  lifeJitter: 0.3,
  box: [0.15, 0.1, 0.15],
  dir1: [-1, 0.2, -1],
  dir2: [1, 0.8, 1],
  power: 0.25,
  gravity: 0.1,
  spin: 0.8,
  endScale: 2.6,
  blend: 'alpha',
  capacity: 384,
};
/** The skill's distance in tiles (skillsDatabase, 7): the area the spirits spread over. */
const SPIRIT_REACH = 7;
/** Innermost and outermost orbit as fractions of the reach. */
const SPIRIT_ORBIT_MIN = 0.3;
const SPIRIT_ORBIT_MAX = 0.95;
/** Tangential speed of an orbit point, tiles/s, and the most any orbit turns, rad/s. */
const SPIRIT_ORBIT_SPEED = 5;
const SPIRIT_ORBIT_TURN = 1.4;
/** Skull scale (the original's 1.3) and its coverage. Laser01's snout points down its -Z. */
const SPIRIT_SCALE = 1.1;
const SPIRIT_DARK: RGB = [1, 1, 1];
/** How far the skull's back end sits behind the ribbon's tip, as a fraction of its length (past its swept horns). */
const SPIRIT_NECK = 0.6;
/** A faint flat shadow under the skull, so its dark cells read as body; the sheet's detail stays on top. */
const SPIRIT_BODY: RGB = [0.35, 0.35, 0.35];
/** The shroud: the caster's own view keeps a wide clear middle; anyone else's near a cast gets thicker smoke. */
const SHROUD_OWN: ShroudOptions = { cover: 0.8, maxCover: 0.7, hole: 0.08, feather: 0.3, smoke: 0.7 };
const SHROUD_OTHERS: ShroudOptions = { cover: 1, maxCover: 0.82, hole: 0, feather: 0.18, smoke: 0.55 };
/** Everything a wave of spirits shares: one steer, the body with its wisps and spine, the skull (the sheet twice). */
const SPIRIT_SWARM: Omit<SpiritSwarmOptions, 'spirits' | 'seconds' | 'fadeTail'> = {
  tails: SPIRIT_TAILS,
  smooth: 5,
  seekRate: SPIRIT_TURN,
  wander: { pitch: (3 * Math.PI) / 180, yaw: (8 * Math.PI) / 180 },
  band: { floor: 1, ceiling: 4 },
  body: { width: SPIRIT_BODY_WIDTH, colour: SPIRIT_FLESH, maxCover: SPIRIT_FLESH_MAX, texture: TEX.jointSpirit, taper: SPIRIT_BODY_SHAPE, wave: SPIRIT_SWAY },
  wisps: { width: SPIRIT_WISP_WIDTH, waves: SPIRIT_WISPS },
  spine: { width: SPIRIT_CORE_WIDTH, colour: SPIRIT_SPINE, maxCover: SPIRIT_SPINE_MAX, texture: TEX.jointLaser, taper: SPIRIT_BODY_SHAPE },
  skull: { model: MODEL.laser, scale: SPIRIT_SCALE, aimYaw: Math.PI, rearAt: SPIRIT_NECK, silhouette: SPIRIT_BODY, silhouetteCover: SPIRIT_BODY[0], sheet: SPIRIT_DARK, sheetCover: 1, passes: 2 },
};
const SECONDS = ticks(49);
const FADE_TAIL = 10 / 49;

/**
 * One cast's trail and shroud per caster at a time (effects clock, s): at a high attack speed they
 * stacked into a black screen. Later casts still fly their swarm.
 */
const smokeUntil = new WeakMap<Entity, number>();

/** Whether `caster`'s cast now brings the smoke; marks it taken until it ends. */
function takesSmoke(caster: Entity): boolean {
  const now = fxNow();
  if ((smokeUntil.get(caster) ?? -Infinity) > now) return false;
  smokeUntil.set(caster, now + SECONDS);
  return true;
}

export const spiritSwarm: Step = (at, c) => {
  const smoke = takesSmoke(c.caster);
  const centre = followEntity(c.caster, 0);
  const start = fxNow();
  const spirit = (i: number): SwarmSpirit => {
    const wave = Math.floor(i / SPIRIT_WAVE);
    const turn = ((i % SPIRIT_WAVE) * Math.PI * 2) / SPIRIT_WAVE + (wave * Math.PI) / (2 * SPIRIT_WAVE);
    const heading = facing(c, turn);
    // Radii interleaved across waves so every wave reaches both the inside and the rim.
    const slot = (i * 3) % SPIRIT_COUNT;
    const radius = SPIRIT_REACH * (SPIRIT_ORBIT_MIN + (SPIRIT_ORBIT_MAX - SPIRIT_ORBIT_MIN) * Math.sqrt((slot + 0.5) / SPIRIT_COUNT));
    const spin = (i % 2 ? 1 : -1) * Math.min(SPIRIT_ORBIT_TURN, SPIRIT_ORBIT_SPEED / radius);
    const phase = Math.atan2(heading.x, heading.z);
    const lift = 1.2 + Math.random() * 1.6;
    const seek: PointSource = out => {
      centre(out);
      const a = phase + spin * (fxNow() - start);
      out.x += Math.sin(a) * radius;
      out.z += Math.cos(a) * radius;
      out.y += lift;
      return out;
    };
    const velocity = SPIRIT_SPEED * (0.85 + Math.random() * 0.3);
    if (!smoke) return { velocity, heading, seek };
    const head = at.clone();
    const follow: PointSource = out => out.copyFrom(head);
    effects.spawn('particles', c.scene, at, { recipe: SPIRIT_SMOKE, rate: 12, seconds: SECONDS, follow });
    return { velocity, heading, seek, track: h => head.copyFrom(h) };
  };
  // One swarm per wave: its spirits' bodies, spines and skulls share a handful of meshes.
  const launch = (w: number): void => {
    const spirits: SwarmSpirit[] = [];
    for (let i = w * SPIRIT_WAVE; i < Math.min(SPIRIT_COUNT, (w + 1) * SPIRIT_WAVE); i++) spirits.push(spirit(i));
    effects.spawn('spiritSwarm', c.scene, at, { ...SPIRIT_SWARM, spirits, seconds: SECONDS, fadeTail: FADE_TAIL });
  };
  for (let w = 0; w * SPIRIT_WAVE < SPIRIT_COUNT; w++) {
    if (w === 0) launch(w);
    else delay(w * SPIRIT_WAVE_GAP, () => launch(w));
  }
  if (!smoke) return;
  // The shadow they bring: smoke closing in from the edge of the view, lighter on the caster's own screen.
  const mine = c.caster === Ecs.world?.playerEntity;
  effects.spawn('shroud', c.scene, at, {
    seconds: SECONDS,
    fadeTail: FADE_TAIL,
    follow: followEntity(c.caster, 0.9),
    ...(mine ? SHROUD_OWN : SHROUD_OTHERS),
  });
};
