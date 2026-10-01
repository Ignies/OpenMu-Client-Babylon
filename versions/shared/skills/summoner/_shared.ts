import { CAST_HEIGHT, SkillContext, Step, TICK, cm, currentSkill, perTick, repeat, ring, ticks } from '@/controllers/skills/visuals';
import { type CardOptions } from '@/controllers/fx/cards';
import { type Entity } from '@/ecs/world';
import { type LightRecipe, type LightSource } from '@/controllers/lighting/lightSource';
import { MODEL, RGBS, TEX } from '@/controllers/fx/recipes';
import { bonePos, delay, entityGone, entityPos, entityYaw, fadeOut, fxNow, scaleRGB, type ParticleRecipe, type PointSource, type RGB } from '@/controllers/fx/core';
import { PlayerAction } from '../../objects/enum';
import { Vector3, type Scene } from '@/controllers/render/babylon/exports';
import { type SpriteOptions } from '@/controllers/fx/sprite';
import { deg, humTurn, lit, muForward, rad, randInt } from '../_shared';
import { effectLight } from '@/controllers/lighting/recipes';
import { effects } from '@/controllers/fx';
import { lighting } from '@/controllers/lighting';
import { playLandingSound } from '@/controllers/sound/combat';
import { spawnModel } from '@/controllers/fx/model';
import { storeRef } from '@/app/storeRef';

import { A, SkillClipSet } from '@/controllers/combat/recipes';

/** Degrees a tick -> radians a second. */
const degPerTick = (d: number): number => (d * 25 * Math.PI) / 180;

/** A body's point that keeps its last place once the body has gone. */
const holding = (e: Entity, height: number): PointSource => {
  const last = entityPos(e, height, new Vector3());
  return out => (entityGone(e) ? out.copyFrom(last) : last.copyFrom(entityPos(e, height, out)));
};

/**
 * An effect model's `BodyLight`: the terrain light under it plus its `Light`, clamped by the colour
 * write (ZzzObject.cpp:226-232, `LightEnable` from CreateEffect :349). A tinted model reads as lit
 * white with the tint on it, not as the pure tint.
 */
export function bodyLight(at: Vector3, tint: RGB): RGB {
  const l = storeRef().world?.getTerrainLight(at.x, at.z);
  const lx = l?.x ?? 1;
  const ly = l?.y ?? 1;
  const lz = l?.z ?? 1;
  return [Math.min(1, lx + tint[0]), Math.min(1, ly + tint[1]), Math.min(1, lz + tint[2])];
}

/** Hand FX tints, the three `vLight` blocks of the PLAYER_SKILL_SLEEP hand code (ZzzCharacter.cpp:10591-10740). */
export interface CurseHand {
  shiny: RGB;
  pin: RGB;
  puff: RGB;
  /** Blind: every layer drawn with EnableAlphaBlendMinus (sprite SubType 1, LIGHT+2 sub4, CLUD64 sub5). */
  dark: boolean;
}

/** The hand bone the curse FX ride: "Bip01 L Hand". */
const CURSE_HAND_BONE = 37;
/** Longest the hand FX run if the clip never ends (a body out of view keeps its action). */
const CURSE_HAND_MAX = 3;

/** CLUD64 sub3/5 dies once `Light[0]` falls under 0.05 at x 1/1.1 a tick (ZzzEffectParticle.cpp:5120-5150). */
const cludTicks = (red: number): number => Math.max(1, Math.ceil(Math.log(red / 0.05) / Math.log(1.1)));

const curseHandRecipes = new Map<string, { cra: ParticleRecipe; clud: ParticleRecipe; smoke: ParticleRecipe }>();

/**
 * The per-tick hand particles: BITMAP_LIGHT+2 sub0/4 (cra_04, LT 16, Scale 1.48..1.79, held at full
 * light) and BITMAP_CLUD64 sub3/5 (clud64 or smoke01, Scale 0.6..0.69 growing 0.08 a tick, 20 cm under
 * the hand +-10, light x 1/1.1 a tick) (ZzzEffectParticle.cpp:816-823, :851-856, :975-1009, :5120-5150).
 */
function curseHandRecipesFor(h: CurseHand): { cra: ParticleRecipe; clud: ParticleRecipe; smoke: ParticleRecipe } {
  const key = `${h.puff.join(',')}|${h.dark}`;
  let r = curseHandRecipes.get(key);
  if (r) return r;
  const n = cludTicks(h.puff[0]);
  const blend = h.dark ? 'dark' : 'add';
  const size = (64 * 0.645) / 100;
  const puff = (texture: string): ParticleRecipe => ({
    texture,
    colour: h.puff,
    size,
    sizeJitter: 0.07,
    life: ticks(n),
    lifeJitter: 0,
    box: [0.1, 0, 0.1],
    power: 0,
    endScale: (0.645 + 0.08 * n) / 0.645,
    fade: [0, 0.25, 0.5, 0.75, 1].map(p => [p, 1.1 ** (-p * n)] as const),
    blend,
    capacity: 96,
  });
  r = {
    cra: {
      texture: TEX.cra04,
      colour: h.puff,
      size: (64 * 1.635) / 100,
      sizeJitter: 0.095,
      life: ticks(16),
      lifeJitter: 0,
      box: [0.001, 0.001, 0.001],
      power: 0,
      fade: [
        [0, 1],
        [0.97, 1],
        [1, 0],
      ],
      blend,
      capacity: 64,
    },
    clud: puff(TEX.clud),
    smoke: puff(TEX.smoke),
  };
  curseHandRecipes.set(key, r);
  return r;
}

/**
 * The left-hand FX while a PLAYER_SKILL_SLEEP clip plays (ZzzCharacter.cpp:10591-10740): two shiny05
 * cards (Scale 1.0 / 0.7) turning +-216 deg/s, two pin_lights (16x128, Scale 1.7 / 1.5) at a new roll
 * every frame, and a cra_04 flash and a clud puff every tick. The original keys the colours on the
 * local hero's current skill, so another Summoner's cast shows the wrong colours or none; here they
 * are the caster's own skill's.
 */
export const summonerHand = (h: CurseHand): Step => (_at, c) => {
  const caster = c.caster;
  const anim = caster.playerAnimation;
  if (!anim || entityGone(caster)) return;
  const inClip = (): boolean => anim.action >= PlayerAction.PLAYER_SKILL_SLEEP && anim.action <= PlayerAction.PLAYER_SKILL_SLEEP_FENRIR;
  if (!inClip()) return;
  const done = (): boolean => entityGone(caster) || !inClip();
  const hand: PointSource = out => bonePos(caster, CURSE_HAND_BONE, out, CAST_HEIGHT);
  const at = hand(new Vector3());
  const blend = h.dark ? 'subtract' : 'add';
  const card = (texture: string, colour: RGB, scale: number, px: number, extra: Partial<SpriteOptions>): void => {
    effects.spawn('sprite', c.scene, at, { texture, colour, size: (px * scale) / 100, seconds: CURSE_HAND_MAX, follow: hand, until: done, fadeTail: 0, blend, ...extra });
  };
  // fRot = WorldTime * 0.0006 * 360 deg: 216 deg/s.
  card(TEX.shiny5, h.shiny, 1, 64, { spin: 3.77 });
  card(TEX.shiny5, h.shiny, 0.7, 64, { spin: -3.77 });
  card(TEX.pinLights, h.pin, 1.7, 16, { stretch: 8, randomRoll: true });
  card(TEX.pinLights, h.pin, 1.5, 16, { stretch: 8, randomRoll: true });
  const r = curseHandRecipesFor(h);
  effects.spawn('particles', c.scene, at, { recipe: r.cra, rate: 25, seconds: CURSE_HAND_MAX, follow: hand, until: done });
  effects.spawn('particles', c.scene, at, { recipe: r.clud, rate: 12.5, seconds: CURSE_HAND_MAX, follow: hand, until: done, height: -0.2 });
  effects.spawn('particles', c.scene, at, { recipe: r.smoke, rate: 12.5, seconds: CURSE_HAND_MAX, follow: hand, until: done, height: -0.2 });
};

/** The Sleep / Blind colours: the circle's Light, the model tint, then the model's flare01, shiny05 and joint Light. */
export interface AliceCurse {
  circle: RGB;
  models: RGB;
  flare: RGB;
  shiny: RGB;
  streak: RGB;
  /** Blind: MAGIC+1 sub12, ALICE sub1 RENDER_DARK, sprite SubType 1, JOINT_HEALING sub16 - all subtractive. */
  dark: boolean;
  /**
   * Who wears the rings: the target (the curses, nothing on a cast at oneself), the target or else the
   * caster (Thorns), or the caster (Berserker, ZzzCharacter.cpp:4716-4723).
   */
  on?: 'target' | 'targetOrSelf' | 'self';
  /** The graded tiers' light over the rings and the embers rising round the body, in place of the settling motes. */
  grace?: { light: RGB; ember: RGB };
}

export const ALICE_SLEEP: AliceCurse = { circle: [0.7, 0.3, 0.8], models: [0.8, 0.3, 0.9], flare: [0.8, 0.1, 0.9], shiny: [0.7, 0.6, 0.9], streak: [0.7, 0.5, 0.7], dark: false };

/** The body an ALICE_BUFFSKILL cast lands on, or null when it draws nothing. */
function aliceBody(k: AliceCurse, c: SkillContext): Entity | null {
  if (entityGone(c.caster)) return null;
  const target = c.target && c.target !== c.caster && !entityGone(c.target) ? c.target : null;
  const on = k.on ?? 'target';
  return on === 'self' ? c.caster : on === 'targetOrSelf' ? (target ?? c.caster) : target;
}

/** The accent flares at full Alpha sum to a white ball over the body on the graded buffer. */
const ALICE_FLARE_DIM = 0.6;

/**
 * The rings on the graded tiers: BodyLight clamps near white on any lit field, so every tint drew the same
 * white rings; this keeps them bright but lets the tint through.
 */
function aliceRingTint(body: RGB, tint: RGB): RGB {
  return [Math.min(1, tint[0] * 1.1 + body[0] * 0.15), Math.min(1, tint[1] * 1.1 + body[1] * 0.15), Math.min(1, tint[2] * 1.1 + body[2] * 0.15)];
}

/**
 * Sleep / Blind landing (ZzzCharacter.cpp:5158-5198). At the caster: BITMAP_MAGIC+1 sub11 (sub12 minus
 * for Blind), Magic_Ground2 growing `(20 - LT) * 0.15` to 3 tiles over 20 ticks at the caster's yaw,
 * its Luminosity dropping over the last 5 (ZzzEffect.cpp:9787-9882). On the target, following it one
 * tile up: MODEL_ALICE_BUFFSKILL_EFFECT (LT 34, Scale 0.1 + 0.035 a tick, +8 deg a tick) and ..EFFECT2
 * (LT 35, Scale 0.15, -8 deg), Alpha +0.05 a tick while LT > 20 then -0.05: up to 0.7 / 0.75 and gone
 * by tick 28 / 30 (ZzzEffect.cpp:875-915, MoveHandlers.cpp:2213-2338). Each model draws, every tick,
 * two flare01 at Scale 5 and shiny05 at 2.0 / 1.0 in its colour x Alpha, and starts three
 * JOINT_HEALING sub15/16 homing on it from 200 cm, each stamping Shiny02 on the centre. The original
 * skips all of it when the caster has lost its target (:4811, :4836). Thorns and Berserker draw the same
 * cast on the body `k.on` names; `graded` tints their rings and dims the flares (`aliceRingTint`).
 */
export const aliceCurse = (k: AliceCurse, graded = false): Step => (_at, c) => {
  // The original never sends the curses without a selection (castTargets.ts), so a curse on oneself draws nothing.
  const target = aliceBody(k, c);
  if (!target) return;
  const feet = entityPos(c.caster, 0, new Vector3());
  const yawDeg = (entityYaw(c.caster) * 180) / Math.PI;
  ring({ texture: TEX.magicGround2, colour: k.circle, seconds: ticks(20), scale: 3, growFrom: 0, grow: 1, spinFrom: -yawDeg, blend: k.dark ? 'subtract' : 'additive', alphaAt: p => fadeOut(p, 0.25) })(feet, c);

  const centre = holding(target, 1);
  const at = centre(new Vector3());
  const gone = (): boolean => entityGone(target);
  const blend = k.dark ? 'subtract' : 'add';
  const tint = k.dark ? k.models : graded ? aliceRingTint(bodyLight(at, k.models), k.models) : bodyLight(at, k.models);
  const dim = graded ? ALICE_FLARE_DIM : 1;
  const bodies = [
    { model: MODEL.elShieldRing, life: 28, scale: 0.1, spin: 1, peak: 0.7 },
    { model: MODEL.elShieldRing2, life: 30, scale: 0.15, spin: -1, peak: 0.75 },
  ];
  for (const b of bodies) {
    const seconds = ticks(b.life);
    // 0.035 a tick over the life, and 8 deg a tick.
    const grow = (b.scale + 0.035 * b.life) / b.scale;
    effects.spawn('model', c.scene, at, { model: b.model, seconds, scale: b.scale, grow, spin: b.spin * degPerTick(8), colour: tint, alpha: b.peak, fadeIn: 0.5, fadeTail: 0.5, follow: centre, until: gone, blend, maxCover: 1 });
    const glow = (texture: string, colour: RGB, scale: number, extra: Partial<SpriteOptions>): void => {
      effects.spawn('sprite', c.scene, at, { texture, colour: scaleRGB(colour, b.peak), size: (64 * scale) / 100, seconds, follow: centre, until: gone, fadeIn: 0.5, fadeTail: 0.5, blend, ...extra });
    };
    glow(TEX.flare, scaleRGB(k.flare, dim), 5, { count: 2 });
    glow(TEX.shiny5, k.shiny, 2, { spin: 3.77 });
    glow(TEX.shiny5, k.shiny, 1, { spin: -3.77 });
  }
  // Both models' joints in one shower: six a tick while the models live.
  effects.spawn('homing', c.scene, at, {
    centre,
    seconds: ticks(29),
    perTick: 6,
    radius: 2,
    accel: cm(4),
    life: 10,
    tails: 2,
    width: cm(5),
    texture: TEX.jointEnergy,
    colour: k.streak,
    decay: 1 / 1.08,
    blend,
    stamp: { texture: TEX.shiny2, w: cm(32), h: cm(64), scale: [0.8, 1.4] },
    until: gone,
  });
};

/** Weakness / Enervation colours: MAGIC_ZIN sub1's Light, the rest of the circles and models, the rain. */
export interface ZinCurse {
  wide: RGB;
  core: RGB;
  rain: RGB;
}

/** BITMAP_MAGIC_ZIN's Alpha a tick (MoveHandlers.cpp:1486-1512): sub1 climbs 0.06 to 0.72 and falls 0.03 from LT 20. */
const zinWideAlpha = (p: number): number => {
  const n = p * 40;
  return n < 20 ? Math.min(0.72, 0.06 * n) : 0.72 - 0.03 * (n - 20);
};

/**
 * Weakness / Enervation, at the caster's feet (ZzzCharacter.cpp:4724-4754): BITMAP_MAGIC_ZIN sub1
 * (7 tiles, LT 40, `Light x Alpha / 2.5`), sub0 (2 tiles, LT 50, `Light x Alpha x 2`, fading from LT
 * 20) and three sub2 ripples from 1.0 / 0.2 / 0.1 tiles growing 0.1 a tick to 3.5 (LT 30); none of
 * them turns (`HeadAngle[1]`, ZzzEffect.cpp:9960-9977). MODEL_SUMMONER_CASTING_EFFECT2 / 22 / 222 at
 * Scale 0.6 (the `if (o->SubType = 0)` typo keeps the passed scale), BlendMeshLight 0 -> 0.5 over 10
 * ticks, falling 0.03 a tick from LT 20, turning +3 / -3 / +3 deg a tick (ZzzEffect.cpp:759-773,
 * MoveHandlers.cpp:1133-1165). The rain: BITMAP_SHINY+6 makes a shiny05 particle a tick for 24 ticks
 * and BITMAP_PIN_LIGHT a pin_lights one every other tick for 40, anywhere within 2.5 tiles and 0.5-1.5
 * up (ZzzEffect.cpp:6790-6797, MoveHandlers.cpp:1519-1532). The sound plays now, not at the cast.
 */
export const zinCurse = (k: ZinCurse): Step => (_at, c) => {
  if (entityGone(c.caster)) return;
  const feet = entityPos(c.caster, 0, new Vector3());
  playLandingSound(currentSkill, feet);
  ring({ texture: TEX.magicZin, colour: scaleRGB(k.wide, 1 / 2.5), seconds: ticks(40), scale: 7, alphaAt: zinWideAlpha })(feet, c);
  ring({ texture: TEX.magicZin, colour: scaleRGB(k.core, 2), seconds: ticks(50), scale: 2, alphaAt: p => Math.min(1, (1 - p) * 2.5) })(feet, c);
  for (const s of [1, 0.2, 0.1]) {
    ring({ texture: TEX.magicZin, colour: k.core, seconds: ticks(30), scale: s, grow: (s + 0.1 * 30) / s, cap: 3.5, alphaAt: p => Math.min(1, (1 - p) * 1.5) })(feet, c);
  }
  const lit = bodyLight(feet, k.core);
  [MODEL.suhwanzin2, MODEL.suhwanzin22, MODEL.suhwanzin222].forEach((m, i) => {
    effects.spawn('model', c.scene, feet, { model: m, seconds: ticks(37), scale: 0.6, colour: lit, alpha: 0.5, fadeIn: 10 / 37, fadeTail: 17 / 37, spin: (i % 2 ? -1 : 1) * degPerTick(3) });
  });
  const origin = feet.clone();
  const drop = (): Vector3 => new Vector3(origin.x + (Math.random() - 0.5) * 5, origin.y + 1.5 - Math.random(), origin.z + (Math.random() - 0.5) * 5);
  // SHINY+6 particle: LT 30, Scale 0.5 + 0/0.1/0.2 shrinking 0.02 a tick, falling 1.3 cm and turning 5 deg a tick, drawn as shiny05 and again as flare01.
  repeat(24, TICK, (_p, cc) => {
    const p = drop();
    const scale = 0.5 + Math.floor(Math.random() * 3) * 0.1;
    for (const texture of [TEX.shiny5, TEX.flare]) {
      effects.spawn('sprite', cc.scene, p, { texture, colour: k.rain, size: (64 * scale) / 100, scaleRate: -perTick(64 * 0.02), rise: -perTick(1.3), spin: degPerTick(5), seconds: ticks(30), fadeTail: 0 });
    }
  })(feet, c);
  // PIN_LIGHT particle: LT 30, Scale 1.0 + 0..0.4 shrinking 0.02 a tick, falling 10 cm a tick.
  repeat(40, TICK, (_p, cc) => {
    if (Math.random() < 0.5) return;
    const scale = 1 + Math.floor(Math.random() * 5) * 0.1;
    effects.spawn('sprite', cc.scene, drop(), { texture: TEX.pinLights, colour: k.rain, size: (16 * scale) / 100, stretch: 8, scaleRate: -perTick(16 * 0.02), rise: -perTick(10), seconds: ticks(30), fadeTail: 0 });
  })(feet, c);
};

// Enhanced and Ultra: the same curses with a light that follows their art, ground contact and a
// little secondary motion. Classic draws none of this.

/** An `effectLight` at `at`, riding `follow` when given. */
export function curseLight(scene: Scene, colour: RGB, extent: number, seconds: number, at: Vector3, follow?: PointSource, extra?: Partial<LightRecipe>): LightSource {
  const position = { x: at.x, y: at.y, z: at.z };
  const scratch = at.clone();
  const ride = follow
    ? (out: { x: number; y: number; z: number }): void => {
        follow(scratch);
        out.x = scratch.x;
        out.y = scratch.y;
        out.z = scratch.z;
      }
    : undefined;
  return lighting.flash(scene, effectLight(colour, extent, seconds, extra), { position, follow: ride });
}

/** The hand light: the pins' tint, as long as the hand FX run (Blind's hand is dark and has none). */
export const curseHandLight = (h: CurseHand): Step => (_at, c) => {
  const caster = c.caster;
  const anim = caster.playerAnimation;
  if (!anim || entityGone(caster)) return;
  const inClip = (): boolean => anim.action >= PlayerAction.PLAYER_SKILL_SLEEP && anim.action <= PlayerAction.PLAYER_SKILL_SLEEP_FENRIR;
  if (!inClip()) return;
  const hand: PointSource = out => bonePos(caster, CURSE_HAND_BONE, out, CAST_HEIGHT);
  let light: LightSource | null = null;
  const ride: PointSource = out => {
    if (light && (entityGone(caster) || !inClip())) light.stop();
    return hand(out);
  };
  light = curseLight(c.scene, h.pin, 0.6, CURSE_HAND_MAX, hand(new Vector3()), ride, { attack: 0.1, release: 0.25, floorGain: 0.15, flicker: { min: 0.8, max: 1, steps: 3 } });
};

const curseDust = new Map<string, ParticleRecipe>();

/** Slow motes settling round a cursed body: Sleep's violet dust, Blind's dark smoke. */
function curseDustFor(colour: RGB, dark: boolean): ParticleRecipe {
  const key = `${colour.join(',')}|${dark}`;
  let r = curseDust.get(key);
  if (r) return r;
  r = dark
    ? { texture: TEX.smoke, colour, size: 0.9, sizeJitter: 0.3, life: 0.9, lifeJitter: 0.3, box: [0.7, 0.5, 0.7], dir1: [-0.3, 0.2, -0.3], dir2: [0.3, 0.6, 0.3], power: 0.3, spin: 1.2, endScale: 1.8, fade: [[0, 0], [0.3, 1], [1, 0]], blend: 'dark', capacity: 64 }
    : { texture: TEX.flare, colour, size: 0.3, sizeJitter: 0.4, life: 1.2, lifeJitter: 0.4, box: [0.9, 0.4, 0.9], dir1: [-0.2, -1, -0.2], dir2: [0.2, -0.3, 0.2], power: 0.35, gravity: -0.15, endScale: 0.3, fade: [[0, 0], [0.2, 1], [0.7, 0.7], [1, 0]], capacity: 96 };
  curseDust.set(key, r);
  return r;
}

/**
 * Sleep / Blind (and Thorns / Berserker) on the graded tiers: the Classic landing plus a glow on the
 * ground under the vortex, a ring pulse where it lands, motes settling on the body (embers rising round
 * it where `k.grace` says), and the light it throws (Blind is subtractive art and stays unlit).
 */
export const aliceGrace = (k: AliceCurse): Step => (_at, c) => {
  const target = aliceBody(k, c);
  if (!target) return;
  const feet = entityPos(c.caster, 0, new Vector3());
  const ground = holding(target, 0.05);
  const centre = holding(target, 1);
  const gone = (): boolean => entityGone(target);
  const blend = k.dark ? 'subtract' : 'add';
  const at = ground(new Vector3());
  effects.spawn('sprite', c.scene, at, { texture: TEX.flare, colour: scaleRGB(k.flare, 0.22), size: 2.4, seconds: ticks(30), fadeIn: 0.3, fadeTail: 0.5, flat: true, follow: ground, until: gone, blend });
  effects.spawn('sprite', c.scene, at, { texture: TEX.ring, colour: scaleRGB(k.circle, 0.8), size: 0.8, grow: 3.2, growFrom: 1, seconds: ticks(12), fadeTail: 0.7, flat: true, follow: ground, blend });
  if (k.grace) effects.spawn('particles', c.scene, at, { recipe: risingEmbersFor(k.grace.ember, 0.9), rate: 25, seconds: ticks(20), follow: ground, until: gone, height: 0.1 });
  else effects.spawn('particles', c.scene, at, { recipe: curseDustFor(k.dark ? [0.6, 0.6, 0.6] : k.flare, k.dark), rate: 26, seconds: ticks(26), follow: centre, until: gone, height: 0.4 });
  if (k.dark) return;
  // The caster's Magic_Ground2 (3 tiles, 20 ticks), unless the rings stand on the caster too, and the vortex's flare pair (3.2 tiles, about 30 ticks).
  if (target !== c.caster) curseLight(c.scene, k.flare, 1.5, ticks(20), feet, undefined, { attack: ticks(4), release: ticks(8), heightOffset: 0.4, floorGain: 0.35 });
  curseLight(c.scene, k.grace?.light ?? k.flare, 1.6, ticks(30), centre(new Vector3()), centre, { attack: ticks(6), release: ticks(12), floorGain: 0.4 });
};

const risingEmbers = new Map<string, ParticleRecipe>();

/** Sparks lifting off the ground within `spread` tiles: off the ZIN circle in the rain's colour, round a buffed body. */
export function risingEmbersFor(colour: RGB, spread: number): ParticleRecipe {
  const key = `${colour.join(',')}|${spread}`;
  let r = risingEmbers.get(key);
  if (r) return r;
  r = { texture: TEX.flare, colour: scaleRGB(colour, 1 / Math.max(colour[0], colour[1], colour[2])), size: 0.24, sizeJitter: 0.4, life: 1.0, lifeJitter: 0.4, box: [spread, 0.05, spread], dir1: [-0.15, 1, -0.15], dir2: [0.15, 1, 0.15], power: 1.1, powerJitter: 0.5, gravity: -0.4, endScale: 0.4, fade: [[0, 0], [0.15, 1], [0.6, 0.8], [1, 0]], capacity: 96 };
  risingEmbers.set(key, r);
  return r;
}

/**
 * Weakness / Enervation on the graded tiers: the Classic circles plus a glow pooled in the core circle,
 * sparks lifting off it while the circles are bright, and the light the circles throw, climbing with
 * the sub1 Alpha ramp (12 ticks) and falling with it.
 */
export const zinGrace = (k: ZinCurse): Step => (_at, c) => {
  if (entityGone(c.caster)) return;
  const feet = entityPos(c.caster, 0.05, new Vector3());
  effects.spawn('sprite', c.scene, feet, { texture: TEX.flare, colour: scaleRGB(k.core, 0.12), size: 2.4, seconds: ticks(40), fadeIn: 0.3, fadeTail: 0.5, flat: true });
  effects.spawn('particles', c.scene, feet, { recipe: risingEmbersFor(k.rain, 1.3), rate: 32, seconds: ticks(32), height: 0.1 });
  curseLight(c.scene, k.core, 2.5, ticks(44), feet, undefined, { attack: ticks(12), release: ticks(20), heightOffset: 0.5, floorGain: 0.35 });
};

// ---- sum1 steps ------------------------------------------------------------------

/**
 * `c->AttackTime >= g_iLimitAttackTime`: Drain Life and Lightning Orb start 14 ticks after the
 * reply set AttackTime to 1 (ZzzCharacter.cpp:4132-4145, :5147-5156, :5213-5223).
 */
const SUM1_DELAY = ticks(14);
/** `rand() % (2n) - n` in cm, as tiles. */
export const jitterCm = (n: number): number => cm(randInt(2 * n) - n);

/** A card of the cards layer: one original particle or per-frame sprite. */
export const spawnCard = (scene: Scene, at: Vector3, o: CardOptions): void => {
  effects.spawn('cards', scene, at, o);
};

/**
 * `fn(tick)` once for each of the next `n` original ticks on the effects clock, catching up after
 * a slow frame (MoveEffect runs once a tick). Returning false ends it, like `o->Live = false`.
 */
export function tickLoop(n: number, fn: (tick: number) => boolean | void): void {
  const t0 = fxNow();
  let i = 0;
  const run = (): void => {
    const due = Math.min(n, Math.floor((fxNow() - t0) / TICK + 1e-6) + 1);
    while (i < due) if (fn(i++) === false) return;
    if (i < n) delay(t0 + i * TICK - fxNow(), run);
  };
  run();
}

/** An invisible carrier the original moves once a tick (the orb, a siphon's head), drawn between its last two ticks. */
export class TickPoint {
  readonly prev = new Vector3();
  readonly cur = new Vector3();
  #stamp = fxNow();
  constructor(start: Vector3) {
    this.prev.copyFrom(start);
    this.cur.copyFrom(start);
  }
  /** Start a new tick: the point to move. */
  tick(): Vector3 {
    this.prev.copyFrom(this.cur);
    this.#stamp = fxNow();
    return this.cur;
  }
  readonly at: PointSource = out => Vector3.LerpToRef(this.prev, this.cur, Math.min(1, (fxNow() - this.#stamp) / TICK), out);
}

/** A local offset turned by a yaw in degrees (`VectorRotate` with `Angle (0, 0, yaw)`), x / y / up in cm, as tiles. */
export function muTurn(x: number, y: number, up: number, yaw: number, out: Vector3): Vector3 {
  const s = Math.sin(rad(yaw));
  const c = Math.cos(rad(yaw));
  return out.set(cm(c * x - s * y), cm(up), cm(s * x + c * y));
}

/** MoveHumming (ZzzAI.cpp:135): turn `a` ([pitch, roll, yaw] degrees) at `to` by up to `turn` degrees; the distance. */
export function humming(p: Vector3, a: number[], to: Vector3, turn: number): number {
  const dx = to.x - p.x;
  const dy = to.y - p.y;
  const dz = to.z - p.z;
  a[2] = humTurn(a[2], deg(Math.atan2(dx, -dz)), turn);
  a[0] = humTurn(a[0], -deg(Math.atan2(dy, Math.hypot(dx, dz))), turn);
  return Math.hypot(dx, dy, dz);
}

/** The bones a body's skeleton carries (the original's `NumBones`); 0 without one. */
export const boneCount = (e: Entity): number => Math.max(0, (e.modelObject?.gltf?.skeleton?.bones.length ?? 0) - 1);

/** Sheet widths in px, for `Width = bitmap width x Scale` (ZzzEffectParticle.cpp:8996). */
export const PX_FLARE = 64;
const PX_SHINY2 = 32;
export const PX_MAGIC = 128;
export const PX_PIN = 16;
export const PX_SPARK3 = 32;
export const PX_SMOKE = 64;
export const PX_THUNDER = 64;
export const PX_SHOCKWAVE = 128;
/** A sprite turning by `fRot = WorldTime * 0.0006 * 360`: 216 degrees a second. */
export const SPRITE_TURN = rad(216 * TICK);

/**
 * MODEL_FENRIR_THUNDER sub2 (`wide` false) / sub3 (ZzzEffect.cpp:4337-4381): lightning_type01 at a
 * random orientation, LT 4 at full alpha, with the flare01 halo at Scale 2 in `Light - 0.3` that
 * CreateSprite draws the one frame it is made.
 */
export function fenrirThunder(scene: Scene, at: Vector3, colour: RGB, wide: boolean): void {
  const j = wide ? 80 : 20;
  const p = new Vector3(at.x + jitterCm(j), at.y + jitterCm(j), at.z + jitterCm(j));
  const scale = (wide ? 0.5 : 0.1) + randInt(100) * 0.002;
  spawnModel(scene, p, { model: MODEL.lightningType, seconds: ticks(4), scale, colour, yaw: Math.random() * Math.PI * 2, fadeTail: 0.01 }).pitchTo(Math.random() * Math.PI * 2);
  const halo: RGB = [Math.max(0, colour[0] - 0.3), Math.max(0, colour[1] - 0.3), Math.max(0, colour[2] - 0.3)];
  spawnCard(scene, p, { texture: TEX.flare, colour: halo, size: cm(PX_FLARE * 2), ticks: 1 });
}

/**
 * A crackle on a hand while the cast clip plays: per tick two MODEL_FENRIR_THUNDER sub2 on each
 * bone, and a flare01 sprite on it every frame (Scale `flare`, 0 for none). Chain Lightning's
 * hands (ZzzCharacter.cpp:10743-10768), Lightning Orb's forearm (:10574-10590).
 */
const HAND_CRACKLE_MAX = 60;
export const handCrackle = (bones: readonly number[], colour: RGB, flare: number, clips: readonly PlayerAction[], light = 0): Step => (_at, c) => {
  const caster = c.caster;
  const playing = (): boolean => !entityGone(caster) && clips.includes(caster.playerAnimation?.action as PlayerAction);
  if (!playing()) return;
  const until = (): boolean => !playing();
  for (const bone of bones) {
    const hand: PointSource = out => bonePos(caster, bone, out, CAST_HEIGHT);
    if (flare > 0) spawnCard(c.scene, hand(new Vector3()), { texture: TEX.flare, colour, size: cm(PX_FLARE * flare), ticks: HAND_CRACKLE_MAX, follow: hand, until });
    // Enhanced rows only: the crackle's light on the hand for as long as it sparks.
    if (light > 0) sum1Light(c.scene, colour, light, ticks(HAND_CRACKLE_MAX), hand, playing, { flicker: CRACKLE_FLICKER, release: ticks(4) });
  }
  const p = new Vector3();
  tickLoop(HAND_CRACKLE_MAX, () => {
    if (!playing()) return false;
    for (const bone of bones) {
      bonePos(caster, bone, p, CAST_HEIGHT);
      fenrirThunder(c.scene, p, colour, false);
      fenrirThunder(c.scene, p, colour, false);
    }
  });
};

/** `step` at AttackTime 15, handed the skill being dispatched now (its sound and light read it). */
export const atAttackTime = (step: (at: Vector3, c: SkillContext, skill: number) => void): Step => (at, c) => {
  const skill = currentSkill;
  const p = at.clone();
  delay(SUM1_DELAY, () => step(p, c, skill));
};

/** BITMAP_MAGIC sub0 (ZzzEffectParticle.cpp:756-763, :4987-4995): Magic_Ground1, LT 10, Scale -0.05 and Light -0.01 a tick. */
export function magicParticle(scene: Scene, at: Vector3, colour: RGB, scale: number): void {
  spawnCard(scene, at, { texture: TEX.magicGround, colour, size: cm(PX_MAGIC * scale), grow: -cm(PX_MAGIC * 0.05), ticks: 10, brightness: age => 1 - 0.01 * age });
}

/** The sprites the orb and the falling shock draw at their position every frame: two Shiny02, two Magic_Ground1, two pin_lights. */
export function carrierSprites(scene: Scene, at: PointSource, until: () => boolean, life: number, scale: number, shiny: RGB, magic: RGB, pin: RGB): void {
  const p = at(new Vector3());
  const roll = rad(fxNow() * 216);
  for (const [s, dir] of [[4, 1], [3, -1]] as const) spawnCard(scene, p, { texture: TEX.shiny2, colour: shiny, size: cm(PX_SHINY2 * s * scale), aspect: 2, ticks: life, follow: at, until, roll: roll * dir, spin: SPRITE_TURN * dir });
  for (const [s, dir] of [[1, 1], [0.5, -1]] as const) spawnCard(scene, p, { texture: TEX.magicGround, colour: magic, size: cm(PX_MAGIC * s * scale), ticks: life, follow: at, until, roll: roll * dir, spin: SPRITE_TURN * dir });
  for (let i = 0; i < 2; i++) spawnCard(scene, p, { texture: TEX.pinLights, colour: pin, size: cm(PX_PIN * 2 * scale), aspect: 8, ticks: life, follow: at, until, rerollEachTick: true });
}

/**
 * SMOKE sub40 / sub58 (ZzzEffectParticle.cpp:1408-1419, :1548-1558, :5560-5566, :5760-5766): smoke01
 * thrown 40-47 cm on a random heading pitched +-45, x0.4 a tick, LT 50, Scale 0.8-1.1 growing 0.05
 * a tick, `Light = colour x LifeTime / 50`.
 */
export function throwSmoke(scene: Scene, at: Vector3, colour: RGB): void {
  const v = muForward([randInt(90) - 45, 0, randInt(360)], cm(randInt(8) + 40), new Vector3());
  spawnCard(scene, at, {
    texture: TEX.smoke,
    colour,
    size: cm(PX_SMOKE * (randInt(32) + 80) * 0.01),
    grow: cm(PX_SMOKE * 0.05),
    ticks: 50,
    lifeFade: true,
    offset: [jitterCm(32), cm(randInt(64) + 32), jitterCm(32)],
    velocity: [v.x, v.y, v.z],
    drag: 0.4,
    roll: Math.random() * Math.PI * 2,
  });
}

// Enhanced and Ultra (the rows' `enhanced`): Drain Life, Chain Lightning, Lightning Orb and Lightning Shock
// with the light their art throws (`effectLight`), contact with the ground and a little secondary detail.
// Classic never gets here.

/** A moving piece of an effect: where it is and whether it is over. */
export interface Carrier {
  at: PointSource;
  done: () => boolean;
}

/** A crackle's light: never steady. */
export const CRACKLE_FLICKER = { min: 0.55, max: 1, steps: 3 };

/** A `curseLight` riding `follow`, released as soon as `alive` says no (or when its seconds run out). */
export function sum1Light(scene: Scene, colour: RGB, extent: number, seconds: number, follow: PointSource, alive?: () => boolean, extra?: Partial<LightRecipe>): LightSource {
  let light: LightSource | null = null;
  const ride: PointSource = out => {
    if (light && alive && !alive()) light.stop();
    return follow(out);
  };
  light = curseLight(scene, colour, extent, seconds, follow(new Vector3()), ride, extra);
  return light;
}

/** A light a moving piece carries. */
export const carrierLight = (scene: Scene, colour: RGB, extent: number, seconds: number, piece: Carrier, extra?: Partial<LightRecipe>): LightSource =>
  sum1Light(scene, colour, extent, seconds, piece.at, () => !piece.done(), extra);

/** Up over `rise` ticks, down over the last `fall` of `n`. */
export const swell = (n: number, rise: number, fall: number) => (age: number): number => Math.min(1, age / rise, (n - age) / fall);

/** A soft flare laid flat on the ground: the pool of colour an effect leaves under itself. */
export function groundGlow(scene: Scene, at: PointSource, colour: RGB, size: number, n: number, until?: () => boolean): void {
  spawnCard(scene, at(new Vector3()), { texture: TEX.flare, colour, size, ticks: n, flat: true, brightness: swell(n, 4, n * 0.4), follow: at, until });
}

/** `n` Spark03 chips kicked up off `at`, falling and bouncing (SPARK+1 sub20's motion, as the orb's burst). */
export function kickSparks(scene: Scene, at: Vector3, colour: RGB, n: number, kick = 1): void {
  const v = new Vector3();
  for (let k = 0; k < n; k++) {
    muTurn((randInt(40) - 20) * 0.25 * kick, (randInt(40) - 20) * 0.25 * kick, (randInt(10) + 15) * 0.5 * kick, randInt(360), v);
    spawnCard(scene, at, { texture: TEX.spark3, colour, size: cm(PX_SPARK3 * (0.8 + randInt(10) * 0.04)), ticks: 30 + randInt(20), decay: 1 / 1.04, minLight: 0.05, velocity: [v.x, v.y, v.z], gravity: cm(0.75), bounce: [cm(3), 0.3, 2] });
  }
}

// ---- sum2 summons: 223 Explosion, 224 Requiem, 225 Pollution (SummonSystem.cpp CastSummonSkill) ------

/** The book's tier: `Weapon[1].Level` >= 11 is 2, >= 7 is 1, else 0 (SummonSystem.cpp:128-135). */
export function bookTier(e: Entity): number {
  const lvl = e.charAppearance?.leftHand?.lvl ?? 0;
  return lvl >= 11 ? 2 : lvl >= 7 ? 1 : 0;
}

/** The facing yaw that walks from `from` to `to` (the inverse of `forwardOf`). */
export const yawToward = (from: Vector3, to: Vector3): number => Math.atan2(to.x - from.x, -(to.z - from.z));

/** CreateCastingEffect's Lights: BITMAP_MAGIC sub9, CASTING_EFFECT1 / 11 / 111, 2 / 22 / 222 and 4 (SummonSystem.cpp:200-272). */
export interface SummonCast {
  impact: RGB;
  outer: RGB;
  inner: RGB;
  burst: RGB;
}

/** BITMAP_MAGIC sub10's Alpha at tick `n`: +0.05 to 1, then -0.03 a tick from LT 20 (MoveHandlers.cpp:1386-1390). */
const castPoolAlpha = (n: number): number => (n < 24 ? Math.min(1, 0.05 * n) : 1 - 0.03 * (n - 24));
/** Ticks each of sub10's five flare01 layers is drawn: layer i drops out below LT 3i (ZzzEffect.cpp:9759-9771). */
const CAST_POOL_LAYERS = [44, 41, 38, 35, 32];

/**
 * CreateCastingEffect at the caster's feet (SummonSystem.cpp:200-272). BITMAP_MAGIC sub10: flare01 on
 * the terrain, 12 tiles, subtractive white, up to five layers deep (LT 44, ZzzEffect.cpp:1163-1168,
 * :9759-9771). Sub9: empact01 at 2.4 and 2.88 tiles in the first Light, turning -8 and +4 deg a tick,
 * full from the start and fading over the last 20 of its 40 ticks (:1157-1162, :9746-9752,
 * MoveHandlers.cpp:1373-1380). The CASTING_EFFECT models: 1 / 11 / 111 and 2 / 22 / 222 at Scale 0.9
 * (the `if (o->SubType = 0)` typo keeps the default), BlendMeshLight +0.05 a tick to 0.5 and -0.03 a
 * tick from LT 20, turning 3 deg a tick; 4 at LT 25 growing 0.6 a tick, up to 0.25 over 5 ticks and
 * dark by tick 13 (ZzzEffect.cpp:759-782, MoveHandlers.cpp:1133-1165). All lit terrain + Light.
 */
export const summonCast = (k: SummonCast): Step => (_at, c) => {
  if (entityGone(c.caster)) return;
  const feet = entityPos(c.caster, 0, new Vector3());
  const yaw = entityYaw(c.caster);
  for (const life of CAST_POOL_LAYERS) {
    ring({ texture: TEX.flare, colour: RGBS.white, scale: 12, seconds: ticks(life), blend: 'subtract', spinFrom: (-yaw * 180) / Math.PI, alphaAt: p => castPoolAlpha(p * life) })(feet, c);
  }
  ring({ texture: TEX.empact, colour: k.impact, scale: 2.4, seconds: ticks(40), spin: -8 * 25, alphaAt: p => Math.min(1, (1 - p) * 2) })(feet, c);
  ring({ texture: TEX.empact, colour: k.impact, scale: 2.88, seconds: ticks(40), spin: 4 * 25, alphaAt: p => Math.min(1, (1 - p) * 2) })(feet, c);
  const outer = bodyLight(feet, k.outer);
  const inner = bodyLight(feet, k.inner);
  const circles: [string, RGB, number][] = [
    [MODEL.suhwanzin1, outer, -1],
    [MODEL.suhwanzin11, outer, 1],
    [MODEL.suhwanzin111, outer, -1],
    [MODEL.suhwanzin2, inner, 1],
    [MODEL.suhwanzin22, inner, -1],
    [MODEL.suhwanzin222, inner, 1],
  ];
  for (const [m, colour, turn] of circles) {
    effects.spawn('model', c.scene, feet, { model: m, seconds: ticks(37), scale: 0.9, colour, alpha: 0.5, fadeIn: 10 / 37, fadeTail: 17 / 37, spin: turn * degPerTick(3), yaw });
  }
  effects.spawn('model', c.scene, feet, { model: MODEL.suhwanzin4, seconds: ticks(13), scale: 1, grow: 1 + 0.6 * 13, colour: bodyLight(feet, k.burst), alpha: 0.25, fadeIn: 5 / 13, fadeTail: 8 / 13, yaw });
};

// Enhanced and Ultra: the summons throw the light of their art and gain embers, soot and ground contact.
// Classic draws none of this.

/** An `effectLight` whose strength follows `level()` (a summon's Alpha, 0..1), riding `follow`. */
export function levelLight(scene: Scene, colour: RGB, extent: number, seconds: number, at: Vector3, follow: PointSource, level: () => number, extra?: Partial<LightRecipe>): LightSource {
  const peak = Math.max(colour[0], colour[1], colour[2], 1e-3);
  const r = colour[0] / peak;
  const g = colour[1] / peak;
  const b = colour[2] / peak;
  const color = (out: { r: number; g: number; b: number }): { r: number; g: number; b: number } => {
    const k = Math.max(0, Math.min(1, level()));
    out.r = r * k;
    out.g = g * k;
    out.b = b * k;
    return out;
  };
  return curseLight(scene, colour, extent, seconds, at, follow, { ...extra, color });
}

/** The casting circle's light (the empact rings are 2.9 tiles across) and motes lifting off it. */
export const summonCastGrace = (k: SummonCast): Step => (_at, c) => {
  if (entityGone(c.caster)) return;
  const feet = entityPos(c.caster, 0.05, new Vector3());
  effects.spawn('particles', c.scene, feet, { recipe: risingEmbersFor(k.outer, 1.3), rate: 24, seconds: ticks(30), height: 0.1 });
  curseLight(c.scene, k.outer, 1.5, ticks(40), feet, undefined, { attack: ticks(8), release: ticks(20), heightOffset: 0.5, floorGain: 0.35 });
};

/** The Summoner curses, which all share the Sleep clip and its three mounts. */
const MOUNTED_SLEEP = {
  uniria: A.PLAYER_SKILL_SLEEP_UNI,
  dinorant: A.PLAYER_SKILL_SLEEP_DINO,
  fenrir: A.PLAYER_SKILL_SLEEP_FENRIR,
} as const;

/** The three summons, and their mounts (SummonSystem.cpp:46-62). */
export const SUMMON_CLIPS: SkillClipSet = {
  ground: A.PLAYER_SKILL_SUMMON,
  uniria: A.PLAYER_SKILL_SUMMON_UNI,
  dinorant: A.PLAYER_SKILL_SUMMON_DINO,
  fenrir: A.PLAYER_SKILL_SUMMON_FENRIR,
};

/** Sleep, Blind, Thorns, Berserker, Weakness, Enervation - one clip for all six. */
export const SLEEP_CLIPS: SkillClipSet = { ground: A.PLAYER_SKILL_SLEEP, ...MOUNTED_SLEEP };
