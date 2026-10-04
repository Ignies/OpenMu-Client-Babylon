import { BLOOD_CHIPS, BLOOD_MIST, DUST, MODEL, RGBS, STEEL_GLINTS, TEX } from '@/controllers/fx/recipes';
import { COMBAT_BUS, playSfx } from '@/controllers/sound';
import { ENHANCED_TIER, SkillContext, SkillVisual, Step, TICK, cm, currentSkill, explosion, flash, flying, forwardOf, hitSparks, model, particles, perTick, ring, scatter, seq, sprite, ticks } from '@/controllers/skills/visuals';
import { type Entity } from '@/ecs/world';
import { type JointOptions } from '@/controllers/fx/joint';
import { type LightRecipe } from '@/controllers/lighting/lightSource';
import { MonsterActionType, PlayerAction } from '../objects/enum';
import { delay, entityGone, entityPos, entityYaw, followEntity, fxNow, scaleRGB, type ParticleRecipe, type PointSource, type RGB } from '@/controllers/fx/core';

import { Vector3, type Scene } from '@/controllers/render/babylon/exports';
import { type Sounds } from '@/controllers/sound/recipes';
import { effectLight } from '@/controllers/lighting/recipes';
import { effects } from '@/controllers/fx';
import { lighting } from '@/controllers/lighting';
import { playCombat, playLandingSound } from '@/controllers/sound/combat';
import { storeRef } from '@/app/storeRef';
import { tierIndex } from '@/controllers/lighting/lightingQuality';

import { A } from '@/controllers/combat/recipes';

import { SkillLight } from '@/controllers/lighting/skills';

/** Degrees → radians. */
export const DEG = Math.PI / 180;

/** A `soundOnLanding` skill's `sound`, heard from the caster: the release block's `PlayBuffer` (use with `afterRelease`). */
export const landingSound: Step = (_at, c) => {
  const t = c.caster.transform;
  if (t) playLandingSound(currentSkill, { x: t.pos.x, z: t.pos.z });
};

/**
 * A summon arriving (the 0x1F create flag): BITMAP_LIGHTNING+1 sub2 lights the ground
 * (0.5, 1, 0.8) * LifeTime / 10 at range 3 for its 20 ticks (ZzzEffectParticle.cpp:4281-4296).
 */
const SUMMON_ARRIVAL_LIGHT: LightRecipe = {
  color: [1, 2, 1.6],
  range: 3,
  seconds: 0.8,
  release: 0.8,
};
/** MODEL_STONE1 / MODEL_STONE2 chips thrown up from a ground hit - either model, rolled per chip (ZzzEffect.cpp:280). */
export const stones = (n: number, radius = 0.6): Step =>
  scatter(
    (at, c) => model({ model: Math.random() < 0.5 ? MODEL.stone : MODEL.stone2, seconds: 1, colour: RGBS.gold, rise: 2.5, spin: 6, scale: 0.7 })(at, c),
    n,
    radius
  );
/** MODEL_FIRE's `o->BlendMesh = 1`: the fire01 tail is additive, the fire02 lava core is drawn opaque. */
export const FIRE_BLEND_MESH = 1;
/**
 * A bleed skill landing. No `flash`: a card is additive whatever it is
 * tinted, and a red `flare` over a bright map clipped to white and bloomed
 * into a pink cloud - BLOOD_MIST is the same spray drawn straight-alpha.
 */
const bloodHit: Step = seq(hitSparks(BLOOD_CHIPS, 18), particles({ recipe: BLOOD_MIST, count: 5 }));
/** A JOINT_THUNDER bolt from the sky onto `at` (GiganticStorm, Twister's strikes). */
const skyBolt = (height: number, width = 0.3, seconds = ticks(20)): Step => (at, c) => {
  const top = at.clone();
  top.y += height;
  top.x += (Math.random() - 0.5) * 2;
  top.z += (Math.random() - 0.5) * 2;
  effects.spawn('joint', c.scene, top, { to: at, colour: RGBS.arc, seconds, width, forks: 2, jitter: 0.1, texture: TEX.jointThunder, textureRepeats: 2, textureScroll: 1 });
};
/** `n` streamers fanning around the up axis, `i*step` radians apart, from `at`. */
export const streamerFan = (
  n: number,
  step: number,
  o: { velocity: number; seconds: number; maxTails: number; width: number; colour: RGB; pitch?: number; turn?: number; gravity?: number; blend?: JointOptions['blend']; texture?: string }
): Step => (at, c) => {
  const base = entityYaw(c.caster);
  const pitch = o.pitch ?? 0;
  for (let i = 0; i < n; i++) {
    const f = forwardOf(base + i * step);
    const heading = new Vector3(f.x * Math.cos(pitch), Math.sin(pitch), f.z * Math.cos(pitch));
    effects.spawn('joint', c.scene, at, { ...o, heading });
  }
};

/**
 * The MODEL_MULTI_SHOT volley (WSclient.cpp AT_SKILL_MULTI_SHOT, Dragon Kick):
 * 3× sub1 at the hands, 2× sub2 and 2× sub3 twenty cm ahead, Light (0.8,0.9,1.6),
 * fired along the facing.
 */
export const multiShotVolley: Step = (_at, c) => {
  const tint: RGB = [0.8, 0.9, 1];
  const volley = (m: string, fwd: number, n: number): void => {
    for (let i = 0; i < n; i++) {
      const turn = (i - (n - 1) / 2) * 0.14;
      effects.spawn('model', c.scene, entityPos(c.caster, 0.9, new Vector3()), { model: m, seconds: ticks(20), scale: 1, colour: tint, follow: flying(c, 0.9, perTick(45), turn, fwd), yaw: entityYaw(c.caster) + turn });
    }
  };
  volley(MODEL.multishot3, cm(20), 2);
  volley(MODEL.multishot, 0, 3);
  volley(MODEL.multishot2, cm(20), 2);
};

/**
 * `n` JOINT_HEALING-style ribbons spiralling up round a body from ±80 cm at
 * +300 z (ImproveAG's four sub10 joints; Recover's nineteen FLARE joints).
 */
export function spiralRibbons(n: number, colour: RGB, width: number, tails: number, seconds: number): Step {
  return (at, c) => {
    for (let i = 0; i < n; i++) {
      const phase = (i * Math.PI * 2) / n;
      const t0 = fxNow();
      const head: PointSource = out => {
        const t = fxNow() - t0;
        const a = phase + t * 4;
        return out.set(at.x + Math.cos(a) * cm(80), at.y + 0.2 + t * 1.2, at.z + Math.sin(a) * cm(80));
      };
      effects.spawn('joint', c.scene, at, { head, maxTails: tails, width, colour, seconds, texture: TEX.jointEnergy });
    }
  };
}
/** `rand() % n`. */
export const randInt = (n: number): number => Math.floor(Math.random() * n);

/** Terrain height under (x, z), or `fallback` before the map's heights are in. */
export function groundAt(x: number, z: number, fallback: number): number {
  const h = storeRef().world?.getTerrainHeight(x, z);
  return h === undefined || h < -9000 ? fallback : h;
}
/** `BlendMeshTexCoordU = -LifeTime * 0.01`: a quarter of the sheet a second. */
export const QUAKE_SCROLL = 0.25;

/**
 * Iron Defense (323 / 521 / 524): nothing in Classic, the original predates it. The graded tiers keep
 * the old stand-in steel flash at the chest (smaller), with a soft steel halo behind it, glints thrown off the
 * body and a steel ring running out along the ground from the feet.
 */
export const IRON_DEFENSE: SkillVisual = {
  enhanced: {
    impact: seq(
      // Shiny01's bars run to its border, so at the stand-in's 1.4 they read as a cut-off cross; 0.9 keeps them short.
      flash(TEX.shiny, RGBS.steel, 0.9, 0.5),
      sprite({ texture: TEX.flare, colour: [0.5, 0.53, 0.65], size: 2, seconds: 0.7, growFrom: 0.5, grow: 1.2, fadeTail: 0.6 }),
      particles({ recipe: STEEL_GLINTS, count: 22 }),
      ring({ texture: TEX.shockwave, colour: [0.8, 0.84, 1], scale: 0.8, grow: 4, seconds: 0.6, fadeTail: 0.6 })
    ),
  },
};

/** Degrees -> radians, and back. */
export const rad = (d: number): number => (d * Math.PI) / 180;
export const deg = (r: number): number => (r * 180) / Math.PI;

/**
 * `VectorRotate((0, -v, 0), AngleMatrix(a))` for `a` = [pitch, roll, yaw] in degrees: the original's
 * forward step (ZzzMathLib.cpp:185-212). MU x / y are x / z here, and MU forward is -Y.
 */
export function muForward(a: readonly number[], v: number, out: Vector3): Vector3 {
  const sr = Math.sin(rad(a[0]));
  const cr = Math.cos(rad(a[0]));
  const sp = Math.sin(rad(a[1]));
  const cp = Math.cos(rad(a[1]));
  const sy = Math.sin(rad(a[2]));
  const cy = Math.cos(rad(a[2]));
  return out.set(-(sr * sp * cy - cr * sy) * v, -(sr * cp) * v, -(sr * sp * sy + cr * cy) * v);
}

/** TurnAngle2: step `a` toward `to` the short way by at most `d` degrees (ZzzAI.cpp:113). */
export function humTurn(a: number, to: number, d: number): number {
  const diff = ((((to - a) % 360) + 540) % 360) - 180;
  return Math.abs(diff) <= d ? a + diff : a + Math.sign(diff) * d;
}

/** A point source as the lighting layer's follow callback. */
export const lightFollow = (src: PointSource): ((out: { x: number; y: number; z: number }) => void) => {
  const p = new Vector3();
  return out => {
    src(p);
    out.x = p.x;
    out.y = p.y;
    out.z = p.z;
  };
};

export const groundY = (x: number, z: number): number => storeRef().world?.getTerrainHeight(x, z) ?? 0;
/** The hero's entity, for a rule that reads his own clip (the Dark Side follow-ups). */
export const heroEntity = (): Entity | undefined => storeRef().world?.playerEntity ?? undefined;
/** The map the hero is on (`gMapManager.WorldActive`), for a sound only one map loads. */
export const currentMap = (): number | undefined => storeRef().world?.mapIndex;

/** `src` dropped onto the terrain, a hair above it. */
export const onGround = (src: PointSource): PointSource => out => {
  src(out);
  out.y = groundY(out.x, out.z) + 0.04;
  return out;
};

/** A fixed point as a source. */
export const heldAt = (p: Vector3): PointSource => out => out.copyFrom(p);
/** A `BodyLight x BlendMeshLight` brightness over a tick curve, clamped as the fixed-function colour was. */
export const lit = (body: number, blendMeshLight: (tick: number) => number) => (t: number): number =>
  Math.min(1, body * blendMeshLight(t / TICK));

/**
 * `step` once the caster's `action` reaches clip key `key` (`IsAttackImpactFrame`, or Rageful Blow's
 * `AnimationFrame >= 1`), or `maxTicks` after the packet, when `AttackTime` reaches 15 by itself
 * (ZzzCharacter.cpp:3044-3063, :4132-4141). A caster that has left the clip fires at once. `onTimeout: false` for a
 * step the original draws in AttackStage on the key only (Fire Slash, Spiral Slash): at `maxTicks` it is dropped.
 * `onLeave: 'drop'` for a step an effect draws while its owner plays the clip, dropped when the owner leaves it
 * first (the Rage Fighter effects, MoveHandlers.cpp:9312-9380).
 */
export const whenClipKey = (action: PlayerAction, key: number, maxTicks: number, step: Step, onTimeout = true, onLeave: 'fire' | 'drop' = 'fire'): Step => (at, c) => {
  const p = at.clone();
  const t0 = fxNow();
  let n = 0;
  // Another character's clip is applied after the packet handler runs: only leaving it after it was seen counts.
  let seen = false;
  const check = (): void => {
    if (entityGone(c.caster)) return;
    const m = c.caster.modelObject;
    const inClip = !!m && m.CurrentAction === action;
    seen ||= inClip;
    if (seen && !inClip) {
      if (onLeave === 'fire') step(p, c);
      return;
    }
    if (inClip && m!.actionFrame() >= key) {
      step(p, c);
      return;
    }
    if (n >= maxTicks) {
      if (onTimeout) step(p, c);
      return;
    }
    n++;
    // Due on the tick grid from the packet: chained one-tick delays drift a frame late each.
    delay(t0 + ticks(n) - fxNow(), check);
  };
  check();
};
/**
 * `fn(frame, tick)` on each tick after the packet (1, 2, ...) while the caster plays `action`: an effect whose Move
 * reads its owner's clip and dies once the owner leaves it (MODEL_DRAGON_KICK_DUMMY, MoveHandlers.cpp:9828-9834).
 * It waits for the clip as `whenClipKey` does, and ends after `maxTicks`. `onEnd` runs once when it ends.
 */
export function eachClipTick(c: SkillContext, action: PlayerAction, maxTicks: number, fn: (frame: number, tick: number) => void, onEnd?: () => void): void {
  const t0 = fxNow();
  let n = 0;
  let seen = false;
  const tick = (): void => {
    n++;
    const m = c.caster.modelObject;
    const inClip = !entityGone(c.caster) && m?.CurrentAction === action;
    seen ||= inClip;
    if (entityGone(c.caster) || (seen && !inClip)) {
      onEnd?.();
      return;
    }
    if (inClip && m) fn(m.actionFrame(), n);
    if (n >= maxTicks) {
      onEnd?.();
      return;
    }
    delay(t0 + ticks(n + 1) - fxNow(), tick);
  };
  delay(ticks(1), tick);
}
/** Player `Weapon[0].LinkBone` (ZzzCharacter.cpp:12067-12071). */
export const WEAPON_LINK_BONE = 33;

/** GetMagicScrew (ZzzEffectJoint.cpp:7360-7377): a unit vector wandering with WorldTime `ms`; MU (x, y, z) is world (x, z, y). */
export function magicScrew(param: number, rate: number, ms: number, out: Vector3): Vector3 {
  const i = param + Math.floor(ms / 40);
  const a = (i + 55555) * 0.048 * rate;
  const b = i * 0.0613 * rate;
  const c = (i + 11111) * 0.1113 * rate;
  const x = Math.sin(a) * Math.cos(b);
  const y = Math.sin(a) * Math.sin(b);
  const z = Math.cos(a);
  return out.set(Math.cos(c) * y - Math.sin(c) * z, x, Math.sin(c) * y + Math.cos(c) * z);
}

// Enhanced and Ultra: each runs the Classic step above untouched and adds to it.

/** A skill light's anchor held on one point, copied when the light is made. */
export const lightAt = (p: Vector3): ((out: { x: number; y: number; z: number }) => void) => {
  const { x, y, z } = p;
  return out => {
    out.x = x;
    out.y = y;
    out.z = z;
  };
};

export const dw2Sfx = (key: Sounds, at: Vector3): void => {
  playSfx(key, at, { bus: COMBAT_BUS });
};

/** MODEL_SKILL_BLAST: LT 30, Scale 1.0-1.7, from the point + (200..299, -50..49, 300..799) cm, falling 50-99 cm a tick along Angle (0,20,0) (ZzzEffect.cpp:1355-1367, :6231-6240). */
const COMET_TILT = (20 * Math.PI) / 180;
/** JOINT_ENERGY sub5: MaxTails 10, width 100 cm, Light (0.5, 0.1, 1) (ZzzEffectJoint.cpp:268-289, :453). */
const COMET_TRAIL_TINT: RGB = [0.5, 0.1, 1];
/** BITMAP_SHINY+4 sub0 (ring.jpg, 64 px): Scale sin(LifeTime * 10 deg) * 3 + 2, LT 20 (ZzzEffectParticle.cpp:2694-2705, :7326-7332). */
const COMET_RING_SIZE = cm(64);
const cometRingScale = (p: number): number => Math.sin(((20 - 20 * p) * 10 * Math.PI) / 180) * 3 + 2;

/** Where a comet lands: on the ground, 6 MODEL_STONE1/2, and the ring and the explosion 80 cm up (MoveHandlers.cpp:2562-2575). */
const cometLanding = (p: Vector3, c: SkillContext): void => {
  for (let i = 0; i < 6; i++) effects.spawn('debris', c.scene, p, { model: Math.random() < 0.5 ? MODEL.stone : MODEL.stone2, colour: RGBS.white });
  const up = new Vector3(p.x, p.y + cm(80), p.z);
  sprite({ texture: TEX.ring, colour: RGBS.white, size: COMET_RING_SIZE, seconds: ticks(20), fadeTail: 0.25, sizeAt: cometRingScale })(up, c);
  explosion(RGBS.white)(up, c);
  // BITMAP_EXPLOTION plays SOUND_EXPLOTION01 as it is made (ZzzEffectParticle.cpp:2476-2481).
  dw2Sfx('Sound/eExplosion', up);
  lighting.skillSpot(c.scene, 13, 'blast', out => {
    out.x = p.x;
    out.y = p.y;
    out.z = p.z;
  });
};

/** What the graded tiers add to a comet: over its flight (its head and how long it falls), and where it lands. */
interface CometExtra {
  flight: (head: PointSource, seconds: number, c: SkillContext) => void;
  land: Step;
}

/** One MODEL_SKILL_BLAST: the blue ring2 comet with its JOINT_ENERGY tail and blue light, falling on its tilt to the ground. */
export const cometWith = (extra?: CometExtra): Step => (at, c) => {
  const up = cm(300 + Math.floor(Math.random() * 500));
  const start = new Vector3(at.x + cm(200 + Math.floor(Math.random() * 100)), at.y + up, at.z + cm(Math.floor(Math.random() * 100) - 50));
  // Its path leans toward -x; it lands where the lean meets the ground.
  const land = new Vector3(start.x - up * Math.tan(COMET_TILT), 0, start.z);
  land.y = groundAt(land.x, land.z, at.y);
  const head = start.clone();
  const headAt: PointSource = out => out.copyFrom(head);
  let landed = false;
  const light = lighting.skillSpot(c.scene, 13, 'comet', lightFollow(headAt));
  effects.spawn('joint', c.scene, start, { head: headAt, maxTails: 10, width: 1, colour: COMET_TRAIL_TINT, texture: TEX.jointLaser, seconds: ticks(30), fadeTail: 0.01, until: () => landed });
  const speed = perTick(50 + Math.floor(Math.random() * 50));
  extra?.flight(headAt, Vector3.Distance(start, land) / speed, c);
  effects.spawn('projectile', c.scene, start, {
    to: land,
    speed,
    model: { model: MODEL.blast, colour: RGBS.white, scale: 1 + Math.floor(Math.random() * 8) * 0.1, blendMesh: 0, alongPath: true },
    trace: p => head.copyFrom(p),
    onArrive: p => {
      landed = true;
      light?.stop();
      cometLanding(p, c);
      extra?.land(p, c);
    },
    onLost: () => {
      landed = true;
      light?.stop();
    },
  });
};

export const comet = cometWith();

/** One MODEL_STONE1 or MODEL_STONE2, picked per piece (ZzzEffect.cpp:6471-6472). */
export const dw2Stone = (): string => (Math.random() < 0.5 ? MODEL.stone : MODEL.stone2);

/**
 * BITMAP_FIRE sub5, two a tick +-25 cm in x at (0.1, 1, 0) x Luminosity: Fire01 cells at Scale 1.28-1.91 (64 cm a
 * cell), LT 24, Scale -0.04 and +5 deg a tick, drifting 3.2-4.7 cm a tick (ZzzEffectParticle.cpp:407-415, :4553-4562, :9145-9151).
 */
const DECAY_FLAMES: ParticleRecipe = {
  texture: TEX.fire,
  cells: { w: 64, h: 64, count: 4 },
  colour: [0.085, 0.85, 0],
  colourEnd: [0, 0, 0],
  size: 1.02,
  sizeJitter: 0.2,
  life: ticks(24),
  box: [0.25, 0, 0],
  dir1: [0, 0, -1.2],
  dir2: [0, 0.1, -0.8],
  power: 1,
  gravity: 0,
  spin: 2.2,
  endScale: 0.4,
  blend: 'add',
  capacity: 256,
};

/**
 * BITMAP_SMOKE sub11 tinted `colour`: smoke01 at Scale 2.0-2.78 (1.28-1.78 tiles) growing 0.05 a tick over LT 50,
 * its own +-32 / +-32 / +32..95 cm start jitter, fading LT/50, sinking 1 cm a tick (ZzzEffectParticle.cpp:1257-1267,
 * :5336-5342). Its 40-47 cm a tick burst braked x0.4 is spread over the life: the recipe has no drag.
 */
export const landingSmoke = (colour: RGB): ParticleRecipe => ({
  texture: TEX.smoke,
  colour,
  colourEnd: [0, 0, 0],
  size: 1.53,
  sizeJitter: 0.16,
  life: ticks(50),
  box: [0.32, 0.315, 0.32],
  dir1: [-1, -1.4, -1],
  dir2: [1, 0, 1],
  power: 0.35,
  gravity: 0,
  endScale: 2.05,
  blend: 'add',
  capacity: 128,
});
/** The centre of the smoke's own +32..95 cm lift. */
export const LANDING_SMOKE_LIFT = cm(63.5);
/** Decay's landing tint, `Light` (0.1, 0.5, 0.1) for the smoke, the stones and the explosion (ZzzEffect.cpp:7829-7849). */
const DECAY_TINT: RGB = [0.1, 0.5, 0.1];
export const DECAY_SMOKE = landingSmoke(DECAY_TINT);
const DECAY_SMOKE_COUNT = 15;
/** MODEL_SKILL_INFERNO sub2: LT 12, Scale PKKey/100 = 0.3 growing 0.04 a tick, mesh 0 hidden, Light (0, 0.5, 0) (ZzzEffect.cpp:1390-1398, MoveHandlers.cpp:2632-2635). */
const DECAY_RING_TICKS = 12;
const DECAY_RING_SCALE = 0.3;

/** Where a Decay comet lands (ZzzEffect.cpp:7811-7851). */
const decayLanding = (p: Vector3, c: SkillContext, smoke: ParticleRecipe, lift: number): void => {
  effects.spawn('model', c.scene, p, {
    model: MODEL.inferno,
    seconds: ticks(DECAY_RING_TICKS),
    scale: DECAY_RING_SCALE,
    grow: (DECAY_RING_SCALE + 0.04 * DECAY_RING_TICKS) / DECAY_RING_SCALE,
    colour: [0, 0.5, 0],
    hideMesh: 0,
    keysPerTick: 0.5,
    life: q => (DECAY_RING_TICKS * (1 - q)) / 20,
  });
  const puff = new Vector3();
  for (let i = 0; i < DECAY_SMOKE_COUNT; i++) {
    puff.set(p.x + cm(Math.floor(Math.random() * 160) - 80), p.y + cm(50), p.z + cm(Math.floor(Math.random() * 160) - 100));
    particles({ recipe: smoke, count: 1, height: lift })(puff, c);
  }
  for (let j = 0; j < 6; j++) effects.spawn('debris', c.scene, p, { model: dw2Stone(), colour: DECAY_TINT });
  // The explosion takes `Position`, which the smoke loop left on the last puff (ZzzEffect.cpp:7849).
  explosion(DECAY_TINT)(puff, c);
  lighting.skillSpot(c.scene, 38, 'blast', lightAt(puff));
  dw2Sfx('Sound/eBlastPoison_2', p);
  dw2Sfx('Sound/eExplosion', puff);
};

/**
 * One MODEL_FIRE sub6 (ZzzEffect.cpp:2586-2600): LT 40, from the point + (200..299, -50..49, 500..799) cm, falling
 * 50-99 cm a tick along HeadAngle (0, 20, 0), the mesh itself hidden (HiddenMesh -2). What shows is drawn on it each
 * tick (:7786-7793, :7933-7956): a blue flare, a dark and an orange Shiny02 turned at random, two green flames and a
 * green light, with a white Flare.jpg ribbon riding it.
 */
export const decayCometWith = (extra?: CometExtra, smoke = DECAY_SMOKE, lift = LANDING_SMOKE_LIFT): Step => (at, c) => {
  const up = cm(500 + Math.floor(Math.random() * 300));
  const start = new Vector3(at.x + cm(200 + Math.floor(Math.random() * 100)), at.y + up, at.z + cm(Math.floor(Math.random() * 100) - 50));
  const land = new Vector3(start.x - up * Math.tan(COMET_TILT), 0, start.z);
  land.y = groundAt(land.x, land.z, at.y);
  const speed = perTick(50 + Math.floor(Math.random() * 50));
  const seconds = Vector3.Distance(start, land) / speed;
  const head = start.clone();
  const headAt: PointSource = out => out.copyFrom(head);
  const light = lighting.skillSpot(c.scene, 38, 'comet', lightFollow(headAt));
  const rider = { seconds, follow: headAt, fadeTail: 0.01 };
  effects.spawn('sprite', c.scene, start, { ...rider, texture: TEX.flare, colour: [0.5, 0.5, 1], size: cm(64 * 3) });
  effects.spawn('sprite', c.scene, start, { ...rider, texture: TEX.shiny2, colour: RGBS.white, size: cm(32 * 3), aspect: 2, blend: 'subtract', reroll: { every: TICK } });
  effects.spawn('sprite', c.scene, start, { ...rider, texture: TEX.shiny2, colour: [0.8, 0.5, 0.1], size: cm(32 * 4), aspect: 2, reroll: { every: TICK } });
  // BITMAP_SMOKE joint sub0: Flare.jpg, 100 cm wide, 20 tails, LT 20, following the comet while it lives (ZzzEffectJoint.cpp:998-1006, :4618-4623).
  effects.spawn('joint', c.scene, start, { head: headAt, maxTails: 20, width: 1, colour: RGBS.white, texture: TEX.flareBig, seconds: ticks(20), fadeTail: 0.05 });
  extra?.flight(headAt, seconds, c);
  effects.spawn('projectile', c.scene, start, {
    to: land,
    speed,
    trail: { recipe: DECAY_FLAMES, rate: 50 },
    trace: p => head.copyFrom(p),
    onArrive: p => {
      head.copyFrom(p);
      light?.stop();
      decayLanding(p, c, smoke, lift);
      extra?.land(p, c);
    },
    onLost: () => light?.stop(),
  });
};

/** Decay at AttackTime 15 on the cast point: two comets made the same tick, and SOUND_DEATH_POISON1 (ZzzCharacter.cpp:4440-4450). */
export const decayOf = (comet: Step): Step => (at, c) => {
  comet(at, c);
  comet(at, c);
  dw2Sfx('Sound/eBlastPoison_1', at);
};
export const decay = decayOf(decayCometWith());
/** MONSTER_ASSASSIN (_enum.h:4402): AppearMonster's one summon that arrives opaque in STOP2. */
const MONSTER_ASSASSIN = 21;
/** The arrival's cyan: lightning2 and its terrain light (0.5, 1, 0.8) (ZzzEffectParticle.cpp:4281-4296). */
const ARRIVAL_TINT: RGB = [0.5, 1, 0.8];
/** Sparks thrown off as the lightning2 card opens. */
const ARRIVAL_SPARKS: ParticleRecipe = {
  texture: TEX.flare,
  colour: [0.6, 1, 0.85],
  colourEnd: [0.1, 0.35, 0.3],
  size: 0.14,
  sizeJitter: 0.4,
  life: 0.6,
  lifeJitter: 0.3,
  box: [0.35, 0.5, 0.35],
  dir1: [-1, 0.6, -1],
  dir2: [1, 1.6, 1],
  power: 2.4,
  powerJitter: 0.5,
  gravity: -3,
  endScale: 0.4,
  capacity: 64,
};

/** An `effectLight` at `at`, riding `follow` when given. */
export function summonLight(scene: Scene, colour: RGB, extent: number, seconds: number, at: Vector3, follow?: PointSource, extra?: Partial<LightRecipe>): void {
  const scratch = at.clone();
  const ride = follow
    ? (out: { x: number; y: number; z: number }): void => {
        follow(scratch);
        out.x = scratch.x;
        out.y = scratch.y;
        out.z = scratch.z;
      }
    : undefined;
  lighting.flash(scene, effectLight(colour, extent, seconds, extra), { position: { x: at.x, y: at.y, z: at.z }, follow: ride });
}

/**
 * The arrival on the graded tiers, on top of the original's circle and lightning2: a cyan pool and a
 * ring running out on the ground, sparks thrown off the flash, a puff of dust where the body lands.
 */
function summonArrivalGrace(scene: Scene, monster: Entity, feet: Vector3): void {
  const ground = followEntity(monster, 0.04);
  effects.spawn('sprite', scene, feet, { texture: TEX.flare, colour: scaleRGB(ARRIVAL_TINT, 0.35), size: 3.2, growFrom: 0.4, seconds: ticks(24), fadeTail: 0.5, flat: true, follow: ground });
  effects.spawn('sprite', scene, feet, { texture: TEX.ring, colour: scaleRGB(ARRIVAL_TINT, 0.9), size: 1, grow: 3.6, growFrom: 1, seconds: ticks(14), fadeTail: 0.7, flat: true, follow: ground });
  effects.spawn('particles', scene, feet, { recipe: ARRIVAL_SPARKS, count: 22, height: 0.8 });
  effects.spawn('particles', scene, feet, { recipe: DUST, count: 5, height: 0.1 });
}

/**
 * A summon arriving with the 0x1F create flag (WSclient.cpp:3113-3117): AppearMonster (:2837-2921),
 * MODEL_MAGIC_CIRCLE1 sub0 and BITMAP_LIGHTNING+1 sub2 on it. The Assassin comes in opaque playing
 * STOP2 with its cry; any other fades in 0.05 a tick (ZzzAI.cpp:172-192).
 */
export function playSummonArrival(scene: Scene, monster: Entity): void {
  if (!monster.transform) return;
  const feet = entityPos(monster, 0, new Vector3());
  // LT 30, Scale 0.7 + 0.01 a tick, every mesh additive, clip at Velocity 0.1, on the monster
  // (ZzzEffect.cpp:1477-1496, MoveHandlers.cpp:2706-2728). Its light is the ground's; white here.
  effects.spawn('model', scene, feet, {
    model: MODEL.magicCircle,
    seconds: ticks(30),
    scale: 0.7,
    grow: 1 / 0.7,
    colour: RGBS.white,
    yaw: entityYaw(monster),
    follow: followEntity(monster, 0),
    fadeTail: 0,
    keysPerTick: 0.1,
  });
  // lightning2 (128 px): LT 20, Scale 1 + 0.1 a tick, (0.5, 1, 0.8) * LT / 10, on the monster + 80 cm
  // (ZzzEffectParticle.cpp:242-244, :4281-4296). 1.28 -> 3.84 tiles, linear.
  effects.spawn('sprite', scene, feet, {
    texture: TEX.lightning2,
    colour: [1, 2, 1.6],
    size: cm(128) * 1.6,
    growFrom: 1 / 1.6,
    grow: 3 / 1.6,
    seconds: ticks(20),
    fadeTail: 1,
    follow: followEntity(monster, cm(80)),
  });
  if (tierIndex() >= ENHANCED_TIER) {
    summonArrivalGrace(scene, monster, feet);
    // lightning2 at its widest is 3.84 tiles across, dimming as LT / 10 over its 20 ticks.
    const chest = followEntity(monster, cm(80));
    summonLight(scene, ARRIVAL_TINT, 1.9, ticks(20), chest(new Vector3()), chest, { release: ticks(18) });
  } else {
    const glow = new Vector3();
    lighting.flash(scene, SUMMON_ARRIVAL_LIGHT, {
      position: entityPos(monster, cm(80), new Vector3()),
      follow: out => {
        entityPos(monster, cm(80), glow);
        out.x = glow.x;
        out.y = glow.y;
        out.z = glow.z;
      },
    });
  }
  if (monster.npcType === MONSTER_ASSASSIN) {
    if (monster.monsterAnimation) monster.monsterAnimation.action = MonsterActionType.Stop2;
    playCombat('Sound/mAssassin1', monster.transform.pos);
    return;
  }
  monster.modelObject?.setAlpha(0);
  for (let k = 1; k <= 20; k++) delay(ticks(k), () => monster.modelObject?.setAlpha(k * 0.05));
}
/** The fire and energy lights waver like the original's Luminosity roll. */
export const FX_FLICKER = { min: 0.75, max: 1, steps: 4 };
/** A light standing where a step lands. */
export const lightHere = (recipe: LightRecipe): Step => (at, c) => {
  lighting.flash(c.scene, recipe, { position: { x: at.x, y: at.y, z: at.z } });
};
/** A light riding a moving point (a spirit's head, a struck body). */
export function rideLightFor(c: SkillContext, recipe: LightRecipe, source: PointSource): void {
  const scratch = new Vector3();
  source(scratch);
  lighting.flash(c.scene, recipe, {
    position: { x: scratch.x, y: scratch.y, z: scratch.z },
    follow: out => {
      source(scratch);
      out.x = scratch.x;
      out.y = scratch.y;
      out.z = scratch.z;
    },
  });
}

/** Drop a path's oldest point in place, without the array `splice` returns. */
export function dropOldest(pts: number[]): void {
  pts.copyWithin(0, 3);
  pts.length -= 3;
}

/** A joint path callback's copy: the flat xyz list into the buffer, returning the point count. */
export function writePath(pts: readonly number[], buf: number[]): number {
  const n = Math.min(pts.length, buf.length);
  for (let i = 0; i < n; i++) buf[i] = pts[i];
  return n / 3;
}

/**
 * The castle-siege commands - Stun, Removal, Mana, Invisible, Removal Buff:
 * the four-way ladder `AttackCommon` runs (ZzzInterface.cpp:6495-6690,
 * WSclient.cpp:4170-4350).
 */
export const MOUNTED_COMMAND = {
  horse: A.PLAYER_ATTACK_RIDE_ATTACK_MAGIC,
  uniria: A.PLAYER_SKILL_RIDER,
  dinorant: A.PLAYER_SKILL_RIDER_FLY,
  fenrir: A.PLAYER_FENRIR_ATTACK_MAGIC,
} as const;

/** Increase Critical Damage / Add Skill: horse and Fenrir only (WSclient.cpp:4369-4386). */
export const MOUNTED_HAND = {
  horse: A.PLAYER_ATTACK_RIDE_ATTACK_MAGIC,
  fenrir: A.PLAYER_FENRIR_ATTACK_MAGIC,
} as const;

/** The Dark Knight default branch: only the Fenrir has a clip of its own. */
export const MOUNTED_SWORD = { fenrir: A.PLAYER_FENRIR_ATTACK_MAGIC } as const;

/** One original tick, seconds. */
export const TICK_SECONDS = 0.04;

/** Iron Defense: nothing in Classic (the original predates it); the graded tiers' steel flash lights the caster, whom it buffs. */
export const IRON_DEFENSE_LIGHT: SkillLight = {
  enhanced: { cast: effectLight([0.85, 0.85, 0.95], 1.2, 0.6, { attack: 0.05, release: 0.4 }) },
};
