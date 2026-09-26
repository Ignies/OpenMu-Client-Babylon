import type { Scene } from '../libs/babylon/exports';
import type { ENUM_WORLD } from '../common/types';
import type { Entity } from '../ecs/world';
import { skillDefinition } from '../common/skillsDatabase';
import { MODEL } from '../effects/recipes';
import type { LightingLayer } from './layer';
import { LightSource, type LightRecipe } from './lightSource';
import { tierIndex } from '../common/lightingQuality';
import { arc, effectLight, ember, flame, frost, holy, spark, tide, venom } from './recipes';

/**
 * Skills as light sources.
 *
 * What it is: the light a skill throws - at the caster's hands as the clip
 * starts, riding the projectile to the target, at the target on impact, or
 * on the ground point of an area skill. Driven by the two commands below,
 * which `common/skillVisuals.ts` calls from the skill packets. Read by nobody
 * but the sinks; `emitters()` reports what is live.
 *
 * Ranges are the original's `AddTerrainLight` radii per effect
 * (ZzzEffect.cpp line cited per row); colours follow the effect's sprite
 * tint. Where the original has no light the row says so and the values are
 * ours. A skill with no row still gets `DEFAULT_WIZARDRY_CAST` if it is
 * wizardry, so no spell is cast in the dark before its recipe exists.
 */

// ---- 1. tuning -------------------------------------------------------------

/** Tiles above the caster's feet where a cast light sits: the hands. */
const CAST_HEIGHT = 1.1;

/** Tiles above a target's feet where an impact light sits: the chest. */
const IMPACT_HEIGHT = 0.9;

/** Energy Ball's projectile speed in tiles/s, matching effects/energyBall.ts. */
const BOLT_SPEED = 7;

/** Arrows are faster than magic bolts: 70 cm a tick, like `common/skillVisuals.ts`. */
const ARROW_SPEED = 17.5;

/**
 * Seconds an arrow light lives if nothing ends it. An arrow crosses the
 * elf's six tiles in about a third of a second and `lightArrow`'s host stops
 * the source the moment the shot lands, so this only catches a projectile
 * that never reports back - it is the effects layer's own give-up time.
 */
const ARROW_SECONDS = 4;

/**
 * One skill, in up to four moments. Each is optional; a skill with only
 * `cast` flashes at the caster and nothing else.
 *
 *  - `cast`: at the caster's hands as the clip starts.
 *  - `travel`: rides from the caster to the target at `speed` tiles/s and
 *    ends on arrival; then `impact` fires at the target.
 *  - `impact`: at the target - on arrival if there is a `travel`, at once
 *    otherwise.
 *  - `area`: at the ground point of an area skill.
 */
export type SkillLight = {
  readonly cast?: LightRecipe;
  readonly travel?: LightRecipe & { readonly speed: number };
  readonly impact?: LightRecipe;
  readonly area?: LightRecipe;
  /**
   * `trail`: one light per moving body the effect spawns, riding it. The
   * effects layer owns those paths, so it hands a `follow` over per body and
   * this layer decides whether the tier can carry them.
   */
  readonly trail?: LightRecipe;
  /**
   * `follow`: the one light riding the effect's single moving emitter, on
   * every tier - the original's AddTerrainLight on a travelling effect
   * (Fire Breath's BITMAP_SHOTGUN). The effects layer starts it when the
   * emitter appears and hands over its path.
   */
  readonly follow?: LightRecipe;
  /**
   * `land`: a light the effect lays down itself where one of its pieces
   * gets to - a Drain Life siphon reaching the caster, a Chain Lightning
   * hop. Not tier-gated: one light per call, like an arrow.
   */
  readonly land?: LightRecipe;
  /**
   * `arrow`: what this skill's arrows carry while they fly, overriding the
   * launcher-model row in `ARROW_LIGHTS`. For the skills this client draws
   * with a tinted arrow where the original fires the plain one.
   */
  readonly arrow?: LightRecipe;
  /**
   * `bodies`: named lights the effect itself places, each riding one of its bodies on every tier -
   * the original's `AddTerrainLight` inside a model's own move (Twisting Slash's weapon copies,
   * Rageful Blow's cracks). The row decides when; the table says what.
   */
  readonly bodies?: Readonly<Record<string, LightRecipe>>;
  /**
   * `spots`: lights the effect switches on itself, by name, where and when its art shows (a
   * controller that wakes 16 ticks after the packet, the burst at the end of a breath), through
   * `lightSkillSpot`.
   */
  readonly spots?: Readonly<Record<string, LightRecipe>>;
  /**
   * The light on the Enhanced and Ultra tiers. Classic keeps the row itself,
   * the original's `AddTerrainLight`; each moment set here replaces the
   * Classic one on the graded tiers (`effectLight` sizes and tints it from
   * the effect), and a moment left out keeps it.
   */
  readonly enhanced?: Omit<SkillLight, 'enhanced'>;
  /**
   * `timed`: lights the original switches on later in the skill and away from the caster, each
   * its own `AddTerrainLight` (Earthshake's stones and cracks, Party Teleport's circle).
   */
  readonly timed?: readonly TimedLight[];
};

/** A light `delay` seconds after the packet, `forward` / `side` tiles off the caster's feet along its facing then. */
export type TimedLight = LightRecipe & {
  readonly delay: number;
  readonly forward?: number;
  readonly side?: number;
  /** Fired by its effect through `lightSkillCue` instead of the packet, `delay` after the cue: a moment gated on the caster's clip. */
  readonly cue?: string;
};

/** The first lighting tier that uses a row's `enhanced` light. */
const ENHANCED_TIER = 1;

/** A skill's light row as the current tier uses it. */
function lightRow(skill: number): SkillLight | undefined {
  const row = SKILL_LIGHTS[skill];
  return row?.enhanced && tierIndex() >= ENHANCED_TIER ? { ...row, ...row.enhanced } : row;
}

/** Lighting tier that carries per-body effect lights. */
const ULTRA_TIER = 2;

/** One original tick, seconds. */
const TICK_SECONDS = 0.04;

/**
 * Earthshake's two groups of `AddTerrainLight`s as one light each: the stone rings (up to 3 tiles out,
 * ticks 24-67) round the horse, and the red cracks' flickering `Luminosity` (0.7-1.0) round the burst
 * point 1.1 tiles ahead, from tick 28 for their 40.
 */
const EARTHSHAKE_LIGHT: SkillLight = {
  timed: [
    { color: [0.79, 0.72, 0.49], range: 4, delay: 24 * TICK_SECONDS, seconds: 43 * TICK_SECONDS, release: 8 * TICK_SECONDS },
    {
      color: [1, 0, 0],
      range: 3,
      forward: 1.12,
      side: -0.25,
      delay: 28 * TICK_SECONDS,
      seconds: 41 * TICK_SECONDS,
      attack: 10 * TICK_SECONDS,
      release: 10 * TICK_SECONDS,
      flicker: { min: 0.7, max: 1, steps: 4 },
    },
  ],
  // The stones' warm rims out to the 3-tile ring, lit only once a ring rises; the burst's white core;
  // the cracks' orange glow over the ~3.7 tiles the chains run.
  enhanced: {
    timed: [
      { ...effectLight([1, 0.8, 0.5], 3, 43 * TICK_SECONDS, { attack: 3 * TICK_SECONDS, release: 10 * TICK_SECONDS }), delay: 0, cue: 'stones' },
      { ...effectLight([1, 0.9, 0.75], 1.3, 0.4, { release: 0.3, heightOffset: 0.3 }), forward: 1.12, side: -0.25, delay: 28 * TICK_SECONDS },
      {
        ...effectLight([1, 0.45, 0.15], 3.7, 41 * TICK_SECONDS, { attack: 6 * TICK_SECONDS, release: 12 * TICK_SECONDS, flicker: { min: 0.75, max: 1, steps: 4 } }),
        forward: 1.12,
        side: -0.25,
        delay: 29 * TICK_SECONDS,
      },
    ],
  },
};

/**
 * Electric Spike: the original lights nothing. On the graded tiers the charge lights the hand and the
 * bolt carries its violet out along the facing as it grows (tip at 2.3, 4.9 and 9.9 tiles on ticks
 * 4-6), brightest where its sheet is white, then fades with its x1/1.3 tail.
 */
const ELECTRIC_SPIKE_LIGHT: SkillLight = {
  enhanced: {
    timed: [
      { ...effectLight([0.55, 0.55, 1], 1.2, 21 * TICK_SECONDS, { attack: 3 * TICK_SECONDS, release: 6 * TICK_SECONDS, heightOffset: 1.2, flicker: { min: 0.6, max: 1, steps: 3 } }), delay: 0, cue: 'charge' },
      { ...effectLight([0.8, 0.65, 1], 1, 16 * TICK_SECONDS, { release: 8 * TICK_SECONDS, heightOffset: 1 }), forward: 2.3, delay: 4 * TICK_SECONDS, cue: 'bolt' },
      { ...effectLight([0.8, 0.65, 1], 1.4, 15 * TICK_SECONDS, { release: 8 * TICK_SECONDS, heightOffset: 1 }), forward: 4.9, delay: 5 * TICK_SECONDS, cue: 'bolt' },
      { ...effectLight([0.85, 0.7, 1], 1.8, 14 * TICK_SECONDS, { release: 8 * TICK_SECONDS, heightOffset: 1, flicker: { min: 0.7, max: 1, steps: 3 } }), forward: 8, delay: 6 * TICK_SECONDS, cue: 'bolt' },
    ],
  },
};

/**
 * Drain Life: each JOINT_ENERGY siphon lights `L * (0.4, 1, 0.8)`, L 0.24-0.33, range 2 every tick
 * of its flight (ZzzEffectJoint.cpp:3377-3379), and dies into a BITMAP_LIGHTNING+1 lighting
 * `LifeTime / 10 * (0.5, 1, 0.8)` range 3 for 10 ticks (ZzzEffectParticle.cpp:4281-4287).
 */
const DRAIN_LIFE_LIGHT: SkillLight = {
  trail: { color: [0.11, 0.28, 0.22], range: 2, release: 0.1 },
  land: { color: [0.5, 1, 0.8], range: 3, seconds: 0.4, release: 0.4 },
};

/**
 * Chain Lightning: every 50 cm step of a width-50 JOINT_THUNDER lights `L * (0.1, 0.1, 0.5)`, L
 * 0.16-0.28, range 2 (ZzzEffectJoint.cpp:5006-5021); the steps of the hop's walks overlap into a
 * blue band along it for the hop's 20 ticks. The effect lays one of these every two tiles of it.
 */
const CHAIN_LIGHTNING_LIGHT: SkillLight = {
  land: { color: [0.15, 0.15, 0.75], range: 2, seconds: 0.84, release: 0.1 },
};

/** Teleport's column on the graded tiers: its sparks' tint, 2.16 tiles up either way, LT 10. */
const TELEPORT_LIGHT = effectLight([0.5, 0.75, 1], 2.16, 0.4, { heightOffset: CAST_HEIGHT, release: 0.25 });

/** Keyed by skill number (common/skillsDatabase.ts). */
export const SKILL_LIGHTS: Partial<Record<number, SkillLight>> = {
  // MODEL_POISON: AddTerrainLight range 2 (ZzzEffect.cpp:9752).
  1: { travel: { ...venom(2, 3), speed: BOLT_SPEED }, impact: venom(2, 0.6) },
  // Meteorite: a falling fire model - warm impact (BITMAP_FIRE+1 range 2, :8092).
  2: { cast: ember(1, 0.3), impact: flame(2, 0.5) },
  // BITMAP_LIGHTNING: range 6 on the strike (ZzzEffectParticle.cpp:4298).
  // 0.4 s is the clip: the bolt is `ticks(10)` in skillVisuals, and a light
  // that ends before its effect leaves the ground dark under a live bolt.
  3: { impact: arc(6, 0.4, { gain: 1.4 }) },
  // Fire Ball: BITMAP_FIRE+1 range 2 in flight (:8092).
  4: { travel: { ...ember(2, 3), speed: BOLT_SPEED }, impact: flame(2, 0.45) },
  // Flame: BITMAP_FLAME range 3 while the column burns (:8649). Wider and redder here: the
  // pillars stand on molten rock and the ground around them pools red in the renewed look.
  5: { area: { ...flame(3.5, 1.9, { gain: 1.5, floorGain: 1.3, release: 0.6 }), color: [1, 0.42, 0.14] } },
  // Teleport / Teleport Ally: BITMAP_SPARK+1 lights nothing in the original (ZzzEffect.cpp:6854-6871).
  // Enhanced: the spark colour at each square for the column's life, reaching its half height.
  6: { enhanced: { cast: TELEPORT_LIGHT, impact: TELEPORT_LIGHT } },
  15: { enhanced: { cast: TELEPORT_LIGHT, impact: TELEPORT_LIGHT } },
  // Ice: MODEL_ICE range 2 (:12182).
  7: { travel: { ...frost(2, 3), speed: BOLT_SPEED }, impact: frost(2, 0.5) },
  // Twister: MODEL_STORM range 5 (:10480).
  8: { area: { color: [0.75, 0.8, 0.9], range: 5, seconds: 1.4 } },
  // Evil Spirit: nothing, as the original - the spirits are shadow. The empty row also keeps the
  // wizardry cast flash off (castRecipeFor).
  9: {},
  // Hellfire: BITMAP_FLAME range 3, as Flame, brighter.
  10: { area: flame(4, 1.5, { gain: 1.4, floorGain: 1.3 }) },
  // Power Wave: MODEL_WAVE range 5 (:9610).
  11: { travel: { ...tide(5, 3), speed: BOLT_SPEED }, impact: tide(3, 0.3) },
  // Aqua Beam: MODEL_WATER_WAVE range 3 (:11644).
  12: { area: tide(4, 1.0) },
  // Cometfall: MODEL_GROUND_STONE2 range 4 (:13710).
  13: { area: flame(4, 1.0, { attack: 0.15 }) },
  // Inferno: BITMAP_FLAME range 3 (:8695), wide.
  14: { area: flame(4, 1.5, { gain: 1.6, floorGain: 1.5 }) },
  // BITMAP_ENERGY: range 2 in flight (:8820).
  17: { travel: { ...spark(2, 3), speed: BOLT_SPEED }, impact: spark(2, 0.3) },
  // Heal: MODEL_MAGIC_CIRCLE1 range 3 (:9705).
  26: { impact: holy(3, 1.0) },
  // Greater Defense / Greater Damage: the same magic circle.
  27: { impact: holy(3, 1.0) },
  28: { impact: { ...holy(3, 1.0), color: [1, 0.75, 0.55] } },
  // Ice Storm: MODEL_ICE range 4 on the storm's core (:12423).
  39: { area: frost(5, 1.6) },
  // Nova: the original lights nothing; a fire ring of range 6 is ours.
  40: { area: flame(6, 0.8, { gain: 1.8, floorGain: 1.4, release: 0.6 }) },
  // Twisting Slash: each MODEL_SKILL_WHEEL2 copy lights Luminosity x 0.3 grey, range 3, under itself
  // every tick of its 25 (MoveHandlers.cpp:2808-2812); Luminosity is 0.7-1, fading over the last 5 ticks.
  41: {
    bodies: { wheel: { color: [0.3, 0.3, 0.3], range: 3, seconds: 1, flicker: { min: 0.7, max: 1, steps: 4 }, release: 0.2 } },
    // Each copy carries the warm white of its flare01 glow and sparks at blade height, out to the blade's reach.
    enhanced: { bodies: { wheel: effectLight([1, 0.82, 0.6], 0.9, 1, { heightOffset: 1, release: 0.2, flicker: { min: 0.8, max: 1, steps: 4 } }) } },
  },
  // Rageful Blow: red Luminosity x (1,0,0), range 1, under the crater's EarthQuake02 (LT 20) and every
  // EarthQuake05 / 08 glow wall (LT 40) (ZzzEffect.cpp:7147-7156, :7199-7212, :7247-7258). MODEL_WAVE's
  // darkening light (-0.5, range 5, MoveHandlers.cpp:2601) has no equivalent: sources only add.
  42: {
    bodies: {
      crater: { color: [1, 0, 0], range: 1, seconds: 0.8, flicker: { min: 0.7, max: 1, steps: 4 }, release: 0.2 },
      wall: { color: [1, 0, 0], range: 1, seconds: 1.6, flicker: { min: 0.7, max: 1, steps: 4 }, release: 0.2 },
    },
    // One light per piece of art instead of 26 pure-red pools that summed to a pink flood: the white-hot burst,
    // the crater's orange, and the glowing field the cracks and satellites cover out to ~3.7 tiles.
    enhanced: {
      bodies: {
        burst: effectLight([1, 0.85, 0.6], 1.3, 0.45, { heightOffset: 0.4, release: 0.3 }),
        crater: effectLight([1, 0.5, 0.18], 1.5, 1.4, { attack: 0.08, release: 0.6, flicker: { min: 0.75, max: 1, steps: 4 } }),
        field: effectLight([1, 0.42, 0.12], 3.7, 1.6, { attack: 0.3, release: 0.7, flicker: { min: 0.8, max: 1, steps: 4 } }),
      },
    },
  },
  // Death Stab: the original lights nothing. On the graded tiers the red gathering point, the blue drill over its
  // 2.8 m (centred 1.4 m out, lit from the first roll to the last flare) and the victim's crackle each light like their art.
  43: {
    enhanced: {
      bodies: {
        gather: effectLight([1, 0.22, 0.1], 0.6, 0.48, { heightOffset: 0, attack: 0.16, release: 0.2 }),
        drill: effectLight([0.3, 0.4, 1], 1.5, 0.9, { heightOffset: 0, release: 0.35, flicker: { min: 0.75, max: 1, steps: 4 } }),
        victim: effectLight([0.5, 0.55, 1], 0.8, 1.48, { heightOffset: 0.9, release: 0.3, flicker: { min: 0.4, max: 1, steps: 3 } }),
      },
    },
  },
  // Starfall: MODEL_ARROW_IMPACT lights nothing in the original (:14596);
  // the holy wash riding the shot down is ours.
  46: { arrow: { ...holy(2, ARROW_SECONDS), release: 0.2 } },
  // Fire Breath: BITMAP_SHOTGUN's (0.5,0.5,0.8) x Luminosity 0.7-1.0, range 2, riding the emitter
  // for its 10 ticks and fading under LT 5 (MoveHandlers.cpp:5086-5087, ZzzEffect.cpp:6645-6650).
  // Graded: the breath's lavender over the ~1 tile its puffs reach, bright while the last puffs live
  // (18 ticks), and the DinoE burst's 1.3 tiles for its 12.
  49: {
    follow: { color: [0.5, 0.5, 0.8], range: 2, seconds: 0.4, release: 0.2, flicker: { min: 0.7, max: 1, steps: 4 } },
    enhanced: {
      follow: effectLight([0.6, 0.6, 1], 1.1, 0.72, { release: 0.36, flicker: { min: 0.8, max: 1, steps: 4 } }),
      spots: { bomb: effectLight([1, 0.85, 1], 1.3, 0.48, { release: 0.32, heightOffset: 0.2 }) },
    },
  },
  // Combo: the original lights nothing. Graded: the rays' blue over the ~3 tiles they reach, for their 20 ticks.
  59: { enhanced: { spots: { burst: effectLight([0.3, 0.6, 1], 3, 0.8, { release: 0.56 }) } } },
  // Strike of Destruction: the original lights nothing. Graded: the two FLARE_BLUE marks (4 and 6 tiles
  // wide) for their 24 ticks, fading as their /1.05 does, and a white-blue pop as the strike lands at B.
  232: {
    enhanced: {
      spots: {
        a: effectLight([0.5, 0.5, 1], 2, 0.96, { release: 0.7 }),
        b: effectLight([0.55, 0.6, 1], 3, 0.96, { release: 0.7, heightOffset: 0.5 }),
        strike: effectLight([0.85, 0.9, 1], 1.5, 0.2, { release: 0.15, heightOffset: 1 }),
      },
    },
  },
  // Ice Arrow: MODEL_ARROW range 2 (:11777). The bolt light rides the same
  // path the arrow does and fires the impact on arrival, so it keeps it.
  51: { travel: { ...frost(2, 3), speed: ARROW_SPEED }, impact: frost(2, 0.4) },
  // Penetration: the original fires the launcher arrow (MODEL_ARROW_STEEL on
  // a crossbow, which lights nothing); this client draws it charged
  // blue-white, so the arc is ours.
  52: { arrow: { ...arc(2, ARROW_SECONDS), release: 0.2 } },
  // Fire Slash / Flame Strike: BITMAP_JOINT_FIRE range 2 (ZzzEffectJoint.cpp:4612).
  55: { area: flame(3, 0.7) },
  236: { area: flame(3, 0.8, { gain: 1.3 }) },
  // Fire Burst: the original lights nothing (no AddTerrainLight on PIER_PART / DARKLORD_SKILL).
  // Fire Blast / Fire Scream: BITMAP_FLAME range 3.
  74: { impact: flame(3, 0.6, { gain: 1.3 }) },
  78: { area: flame(4, 0.9, { gain: 1.3 }) },
  // Earthshake (512 / 516): each ground stone's warm range 2 and each glowing crack's red range 1
  // (MoveHandlers.cpp:5712, ZzzEffect.cpp:7157, :7213, :7257), one light per group here.
  62: EARTHSHAKE_LIGHT,
  512: EARTHSHAKE_LIGHT,
  516: EARTHSHAKE_LIGHT,
  // Party Teleport: MODEL_CIRCLE_LIGHT sub3's grey `min(0.5, BlendMeshLight)` range 4 for its 250 ticks (MoveHandlers.cpp:3896).
  63: {
    timed: [{ color: [0.5, 0.5, 0.5], range: 4, delay: 6 * TICK_SECONDS, seconds: 250 * TICK_SECONDS, attack: 5 * TICK_SECONDS, release: 5 * TICK_SECONDS }],
    // The emblem's blue over its 4-tile radius for its 10 s, and the raised hand's glow while it is held.
    enhanced: {
      timed: [
        { ...effectLight([0.4, 0.55, 1], 4, 250 * TICK_SECONDS, { attack: 10 * TICK_SECONDS, release: 20 * TICK_SECONDS }), delay: 6 * TICK_SECONDS },
        { ...effectLight([0.3, 0.5, 1], 0.7, 3.6, { attack: 0.2, release: 0.5, heightOffset: 2 }), delay: 0, cue: 'hand' },
      ],
    },
  },
  // Electric Spike (519): the original lights nothing. The arc is ours, kept for the graded tiers.
  65: ELECTRIC_SPIKE_LIGHT,
  519: ELECTRIC_SPIKE_LIGHT,
  214: DRAIN_LIFE_LIGHT,
  458: DRAIN_LIFE_LIGHT,
  462: DRAIN_LIFE_LIGHT,
  215: CHAIN_LIGHTNING_LIGHT,
  455: CHAIN_LIGHTNING_LIGHT,
  // Lightning Orb and Lightning Shock light nothing in the original (ZzzEffect.cpp:6886-6965,
  // MoveHandlers.cpp:2385-2543); the empty rows keep the wizardry cast flash off.
  216: {},
  230: {},
  456: {},
};

/**
 * One arrow's light: the original's range 2 in the colour of the row,
 * rolling on `Luminosity`. The tail is short because an arrow ends where it
 * lands - a long one leaves a glow hanging in the air behind the shot.
 */
function arrowLight(color: readonly [number, number, number]): LightRecipe {
  return {
    color,
    range: 2,
    seconds: ARROW_SECONDS,
    release: 0.2,
    flicker: { min: 0.7, max: 1, steps: 4 },
  };
}

/**
 * What an arrow throws on the ground while it flies, by the launcher's
 * arrow model.
 *
 * The original lights the arrow body itself, every frame it is alive:
 * `AddTerrainLight(..., range 2)` in the colour below, from MoveEffect's
 * arrow cases in ZzzEffect.cpp (line cited per row). `Luminosity` there is
 * `(rand() % 4 + 7) * 0.1` rolled per effect per frame (:6764), which is the
 * flicker every row carries. Range 2 is the whole reason a volley reads at
 * night: the arrow is a tile off the ground, so the pool it drags along is
 * what the grass and the shooter are lit by.
 *
 * The metal bolts fall through the original's chain without a light and have
 * no row here either: MODEL_ARROW_STEEL, _THUNDER, _LASER, _V, _SAW, _SPARK
 * and _DARKSTINGER fly dark.
 */
export const ARROW_LIGHTS: Partial<Record<string, LightRecipe>> = {
  // MODEL_ARROW (:11776) - the plain wooden arrow every bow but the Elven,
  // Chaos Nature and Celestial fires, and what Triple Shot, Multi-Shot and
  // Ice Arrow draw here.
  [MODEL.arrow]: arrowLight([0.8, 0.5, 0.2]),
  // MODEL_ARROW_NATURE sub1, the Poison Arrow shot (:11833).
  [MODEL.arrowNature]: arrowLight([0.2, 0.8, 0.2]),
  // MODEL_LACEARROW, Arrow Viper Bow (:11885).
  [MODEL.laceArrow]: arrowLight([0.6, 0.2, 0.8]),
  // MODEL_ARROW_WING, Bluewing Crossbow (:11900).
  [MODEL.arrowWing]: arrowLight([0.6, 0.8, 0.8]),
  // MODEL_ARROW_BOMB, Aquagold Crossbow (:12056).
  [MODEL.arrowBomb]: arrowLight([0.6, 0.8, 0.8]),
  // MODEL_ARROW_RING, Albatross Bow (:12023).
  [MODEL.arrowRing]: arrowLight([0.6, 0.2, 0.8]),
  // MODEL_ARROW_GAMBLE, Air Lyn Bow (:12125).
  [MODEL.arrowGamble]: arrowLight([0.2, 0.8, 0.5]),
  // MODEL_ARROW_DOUBLE, Saint Crossbow (:11738).
  [MODEL.arrowDouble]: arrowLight([0.2, 0.4, 1]),
  // MODEL_ARROW_BEST_CROSSBOW, Divine Crossbow of Archangel (:11730).
  [MODEL.arrowBestCrossbow]: arrowLight([1, 0.4, 0.2]),
  // MODEL_ARROW_DRILL, Great Reign Crossbow (:12846).
  [MODEL.arrowDrill]: arrowLight([1, 0.4, 0.2]),
};

/**
 * Any wizardry skill without a row: a short pale flash at the caster's
 * hands - the MODEL_MAGIC2 cast glow (range 3, :10437), kept to 2 tiles so it
 * never out-lights a skill that has a real recipe.
 */
export const DEFAULT_WIZARDRY_CAST: LightRecipe = {
  color: [0.8, 0.85, 1],
  range: 2,
  seconds: 0.4,
  release: 0.3,
};

// ---- 2. state + readers ----------------------------------------------------

const sources = new Set<LightSource>();

/** `timed` lights waiting for their moment, on this layer's own clock. */
const pending: { due: number; light: TimedLight; caster: Entity; scene: Scene }[] = [];
let clock = 0;

function schedule(scene: Scene, row: SkillLight | undefined, caster: Entity): void {
  for (const light of row?.timed ?? []) if (!light.cue) pending.push({ due: clock + light.delay, light, caster, scene });
}

/** Command: the effect reached `cue` (a clip key, a first stone), so the row's `timed` lights waiting on it start their delay. */
export function lightSkillCue(scene: Scene, skill: number, cue: string, caster: Entity): void {
  for (const light of lightRow(skill)?.timed ?? []) if (light.cue === cue) pending.push({ due: clock + light.delay, light, caster, scene });
}

function fireTimed(scene: Scene, light: TimedLight, caster: Entity): void {
  const t = caster.transform;
  if (!t) return;
  const yaw = t.visualRotY ?? t.rot.y;
  const fx = Math.sin(yaw);
  const fz = -Math.cos(yaw);
  const f = light.forward ?? 0;
  const s = light.side ?? 0;
  const at = entityPos(caster, 0);
  attach(scene, light, { position: { x: at.x + fx * f - fz * s, y: at.y, z: at.z + fz * f + fx * s } });
}

function attach(
  scene: Scene,
  recipe: LightRecipe,
  anchor: Parameters<typeof LightSource.attach>[2]
): LightSource {
  const source = LightSource.attach(scene, recipe, anchor);
  sources.add(source);
  return source;
}

function entityPos(e: Entity, height: number) {
  const t = e.transform!;
  return {
    x: t.pos.x + (t.posOffset?.x ?? 0),
    y: t.pos.y + height,
    z: t.pos.z + (t.posOffset?.z ?? 0),
  };
}

function followEntity(e: Entity, height: number) {
  return (out: { x: number; y: number; z: number }) => {
    const t = e.transform;
    if (!t) return;
    out.x = t.pos.x + (t.posOffset?.x ?? 0);
    out.y = t.pos.y + height;
    out.z = t.pos.z + (t.posOffset?.z ?? 0);
  };
}

function castRecipeFor(skill: number): LightRecipe | null {
  const row = lightRow(skill);

  if (row?.cast) return row.cast;
  // A skill with a recipe keeps its hands dark unless it asked for a cast
  // flash; only unknown wizardry gets the fallback.
  if (row) return null;

  return skillDefinition(skill)?.damageType === 'Wizardry'
    ? DEFAULT_WIZARDRY_CAST
    : null;
}

/** Command: a targeted skill - cast flash, then projectile or direct impact. */
export function lightTargetedSkill(
  scene: Scene,
  skill: number,
  caster: Entity,
  target: Entity | null
): void {
  if (!caster.transform) return;

  const row = lightRow(skill);
  const cast = castRecipeFor(skill);

  if (cast) {
    attach(scene, cast, {
      position: entityPos(caster, CAST_HEIGHT),
      follow: followEntity(caster, CAST_HEIGHT),
    });
  }

  schedule(scene, row, caster);

  if (!row || !target?.transform) return;

  const impact = () => {
    if (!row.impact || !target.transform) return;

    attach(scene, row.impact, {
      position: entityPos(target, IMPACT_HEIGHT),
      follow: followEntity(target, IMPACT_HEIGHT),
    });
  };

  if (row.travel) {
    const { speed, ...recipe } = row.travel;

    attach(scene, recipe, {
      position: entityPos(caster, CAST_HEIGHT),
      travel: { to: entityPos(target, IMPACT_HEIGHT), speed, onArrive: impact },
    });
  } else {
    impact();
  }
}

/** Command: an area skill - cast flash, then the ground light at `at`. */
export function lightAreaSkill(
  scene: Scene,
  skill: number,
  caster: Entity,
  at: { x: number; y: number; z: number }
): void {
  const row = lightRow(skill);
  const cast = castRecipeFor(skill);

  if (cast && caster.transform) {
    attach(scene, cast, {
      position: entityPos(caster, CAST_HEIGHT),
      follow: followEntity(caster, CAST_HEIGHT),
    });
  }

  const area = row?.area ?? row?.impact;

  if (area) attach(scene, area, { position: { ...at } });
  if (caster.transform) schedule(scene, row, caster);
}

/** Command: one moment of a skill's light standing at `at`, for effects drawn outside the skill packets. */
export function lightSkillAt(
  scene: Scene,
  skill: number,
  moment: 'cast' | 'impact',
  at: { x: number; y: number; z: number }
): void {
  const recipe = lightRow(skill)?.[moment];

  if (recipe) attach(scene, recipe, { position: { ...at } });
}

/**
 * Command: a light riding one of a skill's moving bodies - Evil Spirit's four
 * spirits, each carrying its own violet. Ultra only: four of these is half the
 * point-light pool, and Ultra is the tier that budgets for that. Returns null
 * when the row has no `trail` or the tier will not carry it, so the caller can
 * skip its own bookkeeping.
 */
export function lightSkillTrail(
  scene: Scene,
  skill: number,
  follow: (out: { x: number; y: number; z: number }) => void
): LightSource | null {
  const recipe = lightRow(skill)?.trail;

  if (!recipe || tierIndex() < ULTRA_TIER) return null;

  const position = { x: 0, y: 0, z: 0 };
  follow(position);

  return attach(scene, recipe, { position, follow });
}

/**
 * Command: one of a skill's `bodies` lights, on every tier, riding `follow`. Null when the row has
 * no such body.
 */
export function lightSkillBody(
  scene: Scene,
  skill: number,
  body: string,
  follow: (out: { x: number; y: number; z: number }) => void
): LightSource | null {
  const recipe = lightRow(skill)?.bodies?.[body];

  if (!recipe) return null;

  const position = { x: 0, y: 0, z: 0 };
  follow(position);

  return attach(scene, recipe, { position, follow });
}

/**
 * Command: the row's `follow` light on a skill's one moving emitter, on every
 * tier. Null when the row has none.
 */
export function lightSkillFollow(
  scene: Scene,
  skill: number,
  follow: (out: { x: number; y: number; z: number }) => void
): LightSource | null {
  const recipe = lightRow(skill)?.follow;

  if (!recipe) return null;

  const position = { x: 0, y: 0, z: 0 };
  follow(position);

  return attach(scene, recipe, { position, follow });
}

/**
 * Command: the row's `spots[name]` light, anchored where `follow` says, as its effect reaches that
 * moment. Null when the row, as this tier uses it, has no such spot.
 */
export function lightSkillSpot(
  scene: Scene,
  skill: number,
  name: string,
  follow: (out: { x: number; y: number; z: number }) => void
): LightSource | null {
  const recipe = lightRow(skill)?.spots?.[name];

  if (!recipe) return null;

  const position = { x: 0, y: 0, z: 0 };
  follow(position);

  return attach(scene, recipe, { position, follow });
}

/**
 * Command: the light a skill's effect lays down where one of its pieces
 * gets to (the row's `land`), at `position` or riding `follow`. Null when
 * the row has none.
 */
export function lightSkillLand(
  scene: Scene,
  skill: number,
  position: { x: number; y: number; z: number },
  follow?: (out: { x: number; y: number; z: number }) => void
): LightSource | null {
  const recipe = lightRow(skill)?.land;

  if (!recipe) return null;

  return attach(scene, recipe, { position: { x: position.x, y: position.y, z: position.z }, follow });
}

/**
 * Command: the light an arrow carries while it flies. `skill` is 0 for a
 * plain bow shot and the base skill number for a skill volley; `model` is
 * the arrow model the launcher picked. Null when neither the skill nor the
 * model has a row, so the caller can skip its own bookkeeping.
 *
 * Not tier-gated, unlike `lightSkillTrail`: an arrow is one light per shot,
 * and where there is no point-light pool the terrain delta still carries it
 * - which is all the original ever had.
 *
 * A row with its own `travel` bolt keeps it and gets nothing here: the two
 * ride the same path, and the bolt is the one that fires the impact flash
 * when it lands.
 */
export function lightArrow(
  scene: Scene,
  skill: number,
  model: string,
  follow: (out: { x: number; y: number; z: number }) => void
): LightSource | null {
  const row = lightRow(skill);

  if (row?.travel) return null;

  const recipe = row?.arrow ?? ARROW_LIGHTS[model];

  if (!recipe) return null;

  const position = { x: 0, y: 0, z: 0 };

  follow(position);

  return attach(scene, recipe, { position, follow });
}

function update(dt: number): void {
  for (const source of sources) if (!source.alive) sources.delete(source);
  clock += dt;
  for (let i = pending.length - 1; i >= 0; i--) {
    const p = pending[i];
    if (clock < p.due) continue;
    pending.splice(i, 1);
    fireTimed(p.scene, p.light, p.caster);
  }
}

function reset(): void {
  sources.clear();
  pending.length = 0;
}

function emitters(): readonly LightSource[] {
  return Array.from(sources);
}

// ---- 3. the layer ----------------------------------------------------------

/** Every map: a skill lights wherever it is cast. */
export const skillsLayer: LightingLayer = {
  name: 'skills',
  update: (_map: ENUM_WORLD, dt: number) => update(dt),
  reset,
  emitters,
};
