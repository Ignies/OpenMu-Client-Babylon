import { type BoneGlow } from '@/controllers/fx/aura';
import { MODEL, RGBS, TEX } from '@/controllers/fx/recipes';
import { effects } from '@/controllers/fx';
import { TICK, entityPos, entityYaw, fxNow, type RGB } from '@/controllers/fx/core';
import { Vector3, type Scene } from '@/controllers/render/babylon/exports';
import { after, cm, seq, ticks, type Step } from '@/controllers/skills/visuals';
import { PlayerAction } from '@versions/shared/objects/enum';
import type { ClipPick } from '@/controllers/combat';
import type { Sounds } from '@/controllers/sound';
import { deg } from '../_shared';

/** Moves an effect has made `t` seconds after its spawn: the first on the next tick (readme.md). */
export const movesAt = (t: number): number => Math.floor(t / TICK + 1e-6);

/** The two clips a party buff (266-268) picks between, evens (SetRageSkillAni, MonkSystem.cpp:2866-2874). */
export const PARTY_BUFF_CLIPS: readonly PlayerAction[] = [PlayerAction.PLAYER_SKILL_ATT_UP_OURFORCES, PlayerAction.PLAYER_SKILL_HP_UP_OURFORCES];
/** `rand_fps_check(2)`: the party buffs toss a coin for their clip rather than go by the caster. */
export const partyBuffClip: ClipPick = () => PARTY_BUFF_CLIPS[Math.random() < 0.5 ? 0 : 1];
/** The sound goes with the toss (SkillCast.cpp:915-931): ATT_UP with Rage_Buff_1, HP_UP with Rage_Buff_2. */
export const partyBuffSound = (clip: PlayerAction): Sounds =>
  clip === PARTY_BUFF_CLIPS[1] ? 'Sound/Ragefighter/Rage_Buff_2' : 'Sound/Ragefighter/Rage_Buff_1';

/** The Ourforces glow's 17 bones, in three breathing groups (ZzzEffect.cpp:9602-9636). */
const OURFORCES_BONES = [12, 17, 5, 10, 36, 27, 37, 28, 11, 35, 2, 3, 36, 20, 27, 4, 26] as const;
const OURFORCES_SLOW = new Set([5, 12, 7, 8, 9, 14, 15, 16]);
const ourforcesBreathe = (t: number, i: number): number =>
  i < 3 ? (Math.sin(t * 10) + 1) * 0.25 + 0.2 : OURFORCES_SLOW.has(i) ? (Math.sin(t * 5) + 1) * 0.25 + 0.5 : (Math.sin(t * 10) + 1) * 0.3 + 0.3;
export const OURFORCES_GLOW: BoneGlow = { bones: OURFORCES_BONES, texture: TEX.flareRed, colour: RGBS.white, size: 0.96, breathe: ourforcesBreathe };

/** The ticks a wind pillar raises its sub 3: LifeTime 40 and 30 of 50, or 60 and 50 of 70 (MoveHandlers.cpp:9538, :9590). */
const WIND_FORCE_THROWS = [11, 21];

/**
 * One MODEL_WINDFOCE (wind_foce.bmd) at `at`, where it stays. Each tick it turns to `-WorldTime * 0.3` degrees, or
 * `* 0.9` when `fast` (sub 2, 3), grows 0.1 up to 3 and keeps 0.9 of its Light (0.85 fast) (MoveHandlers.cpp:9524-9609);
 * LifeTime 50, 70 fast (ZzzEffect.cpp:6004-6023). Drawn RENDER_BRIGHT at Light x 6, clamped (ZzzObject.cpp:2509-2514):
 * the blend is (ONE, ONE), so the Alpha it also loses shows nothing.
 */
function windPillar(colour: RGB, fast: boolean): Step {
  const keep = fast ? 0.85 : 0.9;
  // Degrees a ms of WorldTime as radians a second; MU's yaw turns the other way.
  const spin = ((fast ? 0.9 : 0.3) * 1000 * Math.PI) / 180;
  return (at, c) =>
    effects.spawn('model', c.scene, at, {
      model: MODEL.windForce,
      seconds: ticks(fast ? 70 : 50),
      yaw: entityYaw(c.caster),
      spin,
      scaleAt: t => Math.min(3, 1 + 0.1 * movesAt(t)),
      colour,
      blendMesh: 0,
      blendLight: t => 6 * keep ** movesAt(t),
      blendClamp: true,
      fadeTail: 0,
    });
}

/**
 * The wind pillar Dark Side and the Ourforces buffs raise at the caster's feet (MonkSystem.cpp:1151, :1179, :1209,
 * :1298), and the fast sub 3 pillar it raises where it stands on its 11th and 21st tick, in `thrown`'s Light.
 */
export const windForce = (colour: RGB, fast: boolean, thrown: RGB): Step => {
  const own = windPillar(colour, fast);
  const sub3 = windPillar(thrown, true);
  return (_at, c) => {
    const feet = entityPos(c.caster, 0, new Vector3());
    own(feet, c);
    for (const tick of WIND_FORCE_THROWS) after(ticks(tick), sub3)(feet, c);
  };
};

/** BITMAP_SWORD_EFFECT_MONO's particle Scale after `n` moves: x1.2 until past 6 (move 10), then x0.8 (ZzzEffectParticle.cpp:8861-8886). */
const monoScale = (n: number): number => (n <= 10 ? 1.2 ** n : 1.2 ** 10 * 0.8 ** (n - 10));
/** Its Light: x0.94 a move, but not on the move it turns. */
const monoLight = (n: number): number => 0.94 ** (n < 10 ? n : n - 1);
/** It is drawn after moves 1-18: on move 19 its Scale is under 1 and it dies. */
const MONO_MOVES = 18;
/** The effect's LifeTime (ZzzEffect.cpp:6068-6073). */
const MONO_LIFE = 15;
/** MODEL_SHOCKWAVE01 sub 2's LifeTime 5 / 0.3: drawn after moves 1-16 (ZzzEffect.cpp:5887-5891). */
const WAVE_TICKS = 17;

/**
 * MODEL_SHOCKWAVE01 sub 2 at `feet`: each move Scale x1.24, Position[2] x1.19 (the height above sea level, so it rises off
 * high ground) and Light x0.45, zeroed under 0.001 (MoveHandlers.cpp:9387-9395); drawn twice at Light x 15
 * (ZzzObject.cpp:2467-2473), so twice here.
 */
function swordFlashWave(scene: Scene, feet: Vector3, yaw: number, light: RGB): void {
  const t0 = fxNow();
  for (let pass = 0; pass < 2; pass++) {
    effects.spawn('model', scene, feet.clone(), {
      model: MODEL.shockwave,
      seconds: ticks(WAVE_TICKS),
      angle: [0, 0, yaw],
      colour: light,
      scaleAt: t => 1.24 ** movesAt(t),
      follow: out => out.set(feet.x, feet.y * 1.19 ** movesAt(fxNow() - t0), feet.z),
      blendMesh: 0,
      blendLight: t => (light[0] * 0.45 ** movesAt(t) < 0.001 ? 0 : 15 * 0.45 ** movesAt(t)),
      blendClamp: true,
      fadeTail: 0,
    });
  }
}

/**
 * BITMAP_SWORD_EFFECT_MONO where the caster stands, LifeTime 15 (MonkSystem.cpp:1140, :1169, :1198). Each move on a LifeTime 3
 * does not divide (ticks 2, 3, 5 .. 15) makes a Swordeff_mono particle in its Light, and LifeTime 14 (tick 2) the shock wave in
 * `wave` (MoveHandlers.cpp:9705-9730). A particle moves in the frame it is made; it is drawn 64 px x Scale x 0.9 wide and x 1.1
 * high, 31 cm x Scale over the feet (ZzzEffectParticle.cpp:3820-3825, :9324-9330).
 */
export const swordFlash = (light: RGB, wave: RGB): Step => (_at, c) => {
  const feet = entityPos(c.caster, 0, new Vector3());
  const yaw = deg(entityYaw(c.caster));
  const born: number[] = [];
  effects.spawn('ticked', c.scene, feet, {
    tick(fx, n) {
      const lifeTime = MONO_LIFE + 1 - n;
      if (n > 0 && lifeTime > 0) {
        if (lifeTime % 3 !== 0) born.push(n);
        if (lifeTime === 14) swordFlashWave(fx.scene, feet, yaw, wave);
      }
      let drawn = false;
      for (const b of born) {
        const m = n - b + 1;
        if (m > MONO_MOVES) continue;
        const s = monoScale(m);
        fx.sprite(TEX.swordEffMono, light, feet.x, feet.y + cm(31 * s), feet.z, cm(64 * 0.9 * s), cm(64 * 1.1 * s), 0, monoLight(m));
        drawn = true;
      }
      return drawn || lifeTime > 1;
    },
  });
};

/**
 * BITMAP_EVENT_CLOUD (clouds2) at the caster's feet, LifeTime 30 (ZzzEffect.cpp:5993-6002): each move Scale x1.08 up to `cap`
 * (3, sub1 5) and Light x0.9, turned -WorldTime x 0.5 degrees (MoveHandlers.cpp:9495-9518), drawn on the ground at its Light
 * (ZzzEffect.cpp:9543-9548). WorldTime's phase is not kept: every cloud starts its turn at 0.
 */
export const eventCloud = (light: RGB, cap = 3): Step => (_at, c) =>
  effects.spawn('ring', c.scene, entityPos(c.caster, 0, new Vector3()), {
    texture: TEX.eventCloud,
    colour: light,
    seconds: ticks(30),
    scaleAt: t => Math.min(cap, 1.08 ** movesAt(t)),
    brightness: t => 0.9 ** movesAt(t),
    spin: -500,
    fadeTail: 0,
  });

/**
 * BITMAP_MAGIC sub13 / 14 (Magic_Ground1) at the caster's feet, Scale 1 (ZzzEffect.cpp:1179-1184): each move Scale x1.1 and
 * Light x0.95, halved again past Scale 4; past 8 (move 22) it dies (MoveHandlers.cpp:1424-1448). Drawn twice at the
 * caster's facing (ZzzEffect.cpp:9776-9780), so twice here.
 */
export const magicGround13 = (light: RGB): Step => (_at, c) => {
  const feet = entityPos(c.caster, 0, new Vector3());
  const turn = -deg(entityYaw(c.caster));
  for (let pass = 0; pass < 2; pass++) {
    effects.spawn('ring', c.scene, feet, {
      texture: TEX.magicGround,
      colour: light,
      seconds: ticks(22),
      scaleAt: t => 1.1 ** movesAt(t),
      brightness: t => 0.95 ** movesAt(t) * 0.5 ** Math.max(0, movesAt(t) - 14),
      spinFrom: turn,
      fadeTail: 0,
    });
  }
};

/**
 * MODEL_SHOCKWAVE_GROUND01 sub0 (shockwave_ground01.bmd) at the caster's feet, LifeTime 20 (ZzzEffect.cpp:6109-6115): each move
 * Scale x1.2 and Light x0.8 (MoveHandlers.cpp:9803-9822), drawn bright at Light x 6, clamped (ZzzObject.cpp:2521-2534).
 */
const groundShock = (light: RGB, scale: number): Step => (_at, c) =>
  effects.spawn('model', c.scene, entityPos(c.caster, 0, new Vector3()), {
    model: MODEL.shockwaveGround,
    seconds: ticks(20),
    angle: [0, 0, deg(entityYaw(c.caster))],
    colour: light,
    scaleAt: t => scale * 1.2 ** movesAt(t),
    blendMesh: 0,
    blendLight: t => 6 * 0.8 ** movesAt(t),
    blendClamp: true,
    fadeTail: 0,
  });

/** The Lights of a party buff's RageCreateEffect (MonkSystem.cpp:1128-1214). */
export interface OurforcesLights {
  /** BITMAP_SWORD_EFFECT_MONO and the MODEL_SHOCKWAVE01 it sends. */
  flash: RGB;
  wave: RGB;
  /** The three MODEL_SHOCKWAVE_GROUND01, Scale 1, 0.85 and 0.7, each with a BITMAP_EVENT_CLOUD. */
  ring: RGB;
  cloud: RGB;
  /** MODEL_WINDFOCE, and the BITMAP_MAGIC sub13 under it. */
  pillar: RGB;
  magic: RGB;
}

/** A party buff's RageCreateEffect at the caster, in the original's order. */
export const ourforcesCast = (l: OurforcesLights): Step =>
  seq(
    swordFlash(l.flash, l.wave),
    ...[1, 0.85, 0.7].flatMap(s => [groundShock(l.ring, s), eventCloud(l.cloud)]),
    windForce(l.pillar, false, l.pillar),
    magicGround13(l.magic)
  );
