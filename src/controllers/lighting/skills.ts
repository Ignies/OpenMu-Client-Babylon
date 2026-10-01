import type { Scene } from '../render/babylon/exports';
import type { ENUM_WORLD } from '../../core/types';
import type { Entity } from '../../ecs/world';
import { skillDefinition } from '@versions/shared/skills/skillsDatabase';
import { MODEL } from '../fx/recipes';
import type { LightingLayer } from './layer';
import { LightSource, type LightRecipe } from './lightSource';
import { tierIndex } from './lightingQuality';
import { masterBase } from '../../features/skills/skillAliases';
import { effectLight } from './recipes';

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
export const CAST_HEIGHT = 1.1;

/** Tiles above a target's feet where an impact light sits: the chest. */
const IMPACT_HEIGHT = 0.9;

/**
 * Seconds an arrow light lives if nothing ends it. An arrow crosses the
 * elf's six tiles in about a third of a second and `lightArrow`'s host stops
 * the source the moment the shot lands, so this only catches a projectile
 * that never reports back - it is the effects layer's own give-up time.
 */
export const ARROW_SECONDS = 4;

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
   * `follow`: one light per moving emitter, on every tier - the original's
   * AddTerrainLight on a travelling effect (Fire Breath's BITMAP_SHOTGUN,
   * Power Slash's five orbs). The effects layer starts one when an emitter
   * appears and hands over its path.
   */
  readonly follow?: LightRecipe;
  /**
   * `land`: a light the effect lays down itself where one of its pieces
   * gets to - a Drain Life siphon reaching the caster, a Chain Lightning
   * hop. Not tier-gated: one light per call, like an arrow.
   */
  readonly land?: LightRecipe;
  /**
   * `hold`: a light the effect keeps up for as long as it runs and then
   * stops - a charge held for an unknown time. Any tier that uses the row.
   */
  readonly hold?: LightRecipe;
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
   * controller that wakes 16 ticks after the packet, the burst at the end of a breath, a walking storm, a
   * comet and its landing), through `lightSkillSpot`.
   */
  readonly spots?: Readonly<Record<string, LightRecipe>>;
  /**
   * `strike`: fired by the visual step itself (`lightSkillStrike`), where and
   * when its art appears, for a skill released on a clip key rather than at
   * the packet (the Dark Lord's strike, a sword blow landing). The packet commands never fire it.
   */
  readonly strike?: LightRecipe;
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
  /** Rides the caster (keeping its forward / side offset from the moment it fired) instead of staying where it started. */
  readonly ride?: boolean;
};

/** The first lighting tier that uses a row's `enhanced` light. */
const ENHANCED_TIER = 1;

/** A skill's light row as the current tier uses it. */
function lightRow(skill: number): SkillLight | undefined {
  const row = SKILL_LIGHTS[skill] ?? SKILL_LIGHTS[masterBase(skill)];
  return row?.enhanced && tierIndex() >= ENHANCED_TIER ? { ...row, ...row.enhanced } : row;
}

/** Lighting tier that carries per-body effect lights. */
const ULTRA_TIER = 2;

/** MoveEffect's `Luminosity = (rand() % 4 + 7) * 0.1` a frame (ZzzEffect.cpp:6645). */
export const EFFECT_LUMINOSITY = { min: 0.7, max: 1, steps: 4 };

/** Keyed by skill number (common/skillsDatabase.ts). */
export const SKILL_LIGHTS: Partial<Record<number, SkillLight>> = {
  // Weapon swings (no skill of that number): the original lights neither. Graded: the warrior glint's
  // white for its 18 ticks, and a soft light on the blade tip of a bright trail, below the skill lights
  // in the pool (priority 1, the event gain applied by hand).
  0: {
    enhanced: {
      spots: {
        glint: effectLight([0.85, 0.8, 1], 1, 0.72, { attack: 0.2, release: 0.4, floorGain: 0.6 }),
        swing: effectLight([0.85, 0.9, 1], 0.8, 0.5, { release: 0.3, priority: 1, gain: 0.97 * 0.35 }),
        swingRed: effectLight([1, 0.25, 0.2], 0.8, 0.5, { release: 0.3, priority: 1, gain: 0.97 * 0.35 }),
      },
    },
  },
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

/**
 * A summon arriving (the 0x1F create flag): BITMAP_LIGHTNING+1 sub2 lights the ground
 * (0.5, 1, 0.8) * LifeTime / 10 at range 3 for its 20 ticks (ZzzEffectParticle.cpp:4281-4296).
 */
export const SUMMON_ARRIVAL_LIGHT: LightRecipe = {
  color: [1, 2, 1.6],
  range: 3,
  seconds: 0.8,
  release: 0.8,
};

/** MODEL_FIRE sub0 / sub1 in flight: (1, 0.1, 0) * Luminosity at range 2 (ZzzEffect.cpp:7936-7945). */
export const METEOR_LIGHT: LightRecipe = {
  color: [1, 0.1, 0],
  range: 2,
  seconds: 0.4,
  release: 0.04,
  flicker: EFFECT_LUMINOSITY,
};

/** MODEL_SKILL_BLAST and MODEL_STAFF_OF_DESTRUCTION in flight: (0.2, 0.4, 1) * Luminosity at range 2 (MoveHandlers.cpp:2576, :4361). */
export const BLAST_LIGHT: LightRecipe = {
  color: [0.2, 0.4, 1],
  range: 2,
  seconds: 0.4,
  release: 0.04,
  flicker: EFFECT_LUMINOSITY,
};

/** MODEL_CIRCLE_LIGHT sub0: (1, 0.8, 0.2) * Luminosity at range 4 for its 40 ticks (MoveHandlers.cpp:3862). */
export const HELLFIRE_CIRCLE_LIGHT: LightRecipe = {
  color: [1, 0.8, 0.2],
  range: 4,
  seconds: 1.6,
  release: 0.08,
  flicker: EFFECT_LUMINOSITY,
};

/**
 * BITMAP_BOSS_LASER sub0: (0.5, 0.7, 1) at range 2 on each of its 20 cards, 50 cm apart, for 20
 * ticks (ZzzEffect.cpp:8990-9003). Two range-3 lights per beam stand in for the twenty.
 */
export const BOSS_LASER_LIGHT: LightRecipe = {
  color: [0.5, 0.7, 1],
  range: 3,
  seconds: 0.8,
  release: 0.04,
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
  const dx = fx * f - fz * s;
  const dz = fz * f + fx * s;
  const at = entityPos(caster, 0);
  const position = { x: at.x + dx, y: at.y, z: at.z + dz };
  if (!light.ride) {
    attach(scene, light, { position });
    return;
  }
  const feet = followEntity(caster, 0);
  attach(scene, light, {
    position,
    follow: out => {
      feet(out);
      out.x += dx;
      out.z += dz;
    },
  });
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
 * Command: a row's `strike` light at the anchor the visual step names, the
 * moment its art appears. Null when the row (as the tier uses it) has none.
 */
export function lightSkillStrike(scene: Scene, skill: number, anchor: Parameters<typeof LightSource.attach>[2]): LightSource | null {
  const recipe = lightRow(skill)?.strike;

  return recipe ? attach(scene, recipe, anchor) : null;
}

/**
 * Command: a light the effect holds up and `stop()`s itself - a charge.
 * Null when the row, as the current tier uses it, has no `hold`.
 */
export function lightSkillHold(
  scene: Scene,
  skill: number,
  follow: (out: { x: number; y: number; z: number }) => void
): LightSource | null {
  const recipe = lightRow(skill)?.hold;

  if (!recipe) return null;

  const position = { x: 0, y: 0, z: 0 };
  follow(position);

  return attach(scene, recipe, { position, follow });
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
