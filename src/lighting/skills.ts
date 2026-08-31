import type { Scene } from '../libs/babylon/exports';
import type { ENUM_WORLD } from '../common/types';
import type { Entity } from '../ecs/world';
import { skillDefinition } from '../common/skillsDatabase';
import type { LightingLayer } from './layer';
import { LightSource, type LightRecipe } from './lightSource';
import { arc, ember, flame, frost, holy, shade, spark, tide, venom } from './recipes';

/**
 * Skills as light sources.
 *
 * What it is: the light a skill throws — at the caster's hands as the clip
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

/** Arrows are faster than magic bolts (MODEL_ARROW moves 35 units/tick). */
const ARROW_SPEED = 12;

/**
 * One skill, in up to four moments. Each is optional; a skill with only
 * `cast` flashes at the caster and nothing else.
 *
 *  - `cast`: at the caster's hands as the clip starts.
 *  - `travel`: rides from the caster to the target at `speed` tiles/s and
 *    ends on arrival; then `impact` fires at the target.
 *  - `impact`: at the target — on arrival if there is a `travel`, at once
 *    otherwise.
 *  - `area`: at the ground point of an area skill.
 */
export type SkillLight = {
  readonly cast?: LightRecipe;
  readonly travel?: LightRecipe & { readonly speed: number };
  readonly impact?: LightRecipe;
  readonly area?: LightRecipe;
};

/** Keyed by skill number (common/skillsDatabase.ts). */
export const SKILL_LIGHTS: Partial<Record<number, SkillLight>> = {
  // MODEL_POISON: AddTerrainLight range 2 (ZzzEffect.cpp:9752).
  1: { travel: { ...venom(2, 3), speed: BOLT_SPEED }, impact: venom(2, 0.6) },
  // Meteorite: a falling fire model — warm impact (BITMAP_FIRE+1 range 2, :8092).
  2: { cast: ember(1, 0.3), impact: flame(2, 0.5) },
  // BITMAP_LIGHTNING: range 6 on the strike (ZzzEffectParticle.cpp:4298).
  3: { impact: arc(6, 0.35, { gain: 1.4 }) },
  // Fire Ball: BITMAP_FIRE+1 range 2 in flight (:8092).
  4: { travel: { ...ember(2, 3), speed: BOLT_SPEED }, impact: flame(2, 0.45) },
  // Flame: BITMAP_FLAME range 3 while the column burns (:8649).
  5: { area: flame(3, 1.5, { release: 0.5 }) },
  // Ice: MODEL_ICE range 2 (:12182).
  7: { travel: { ...frost(2, 3), speed: BOLT_SPEED }, impact: frost(2, 0.5) },
  // Twister: MODEL_STORM range 5 (:10480).
  8: { area: { color: [0.75, 0.8, 0.9], range: 5, seconds: 1.4 } },
  // Evil Spirit: the original lights nothing here; a violet wash is ours.
  9: { area: shade(3, 1.2) },
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
  // Twisting Slash: MODEL_SKILL_WHEEL2 range 3 (:9798).
  41: { area: spark(3, 0.6) },
  // Fire Breath: BITMAP_FIRE+1 range 2.
  49: { impact: flame(2, 0.5) },
  // Ice Arrow: MODEL_ARROW range 2 (:11777).
  51: { travel: { ...frost(2, 3), speed: ARROW_SPEED }, impact: frost(2, 0.4) },
  // Fire Slash / Flame Strike: BITMAP_JOINT_FIRE range 2 (ZzzEffectJoint.cpp:4612).
  55: { area: flame(3, 0.7) },
  236: { area: flame(3, 0.8, { gain: 1.3 }) },
  // Fire Burst / Fire Blast / Fire Scream: BITMAP_FLAME range 3.
  61: { impact: flame(3, 0.6) },
  74: { impact: flame(3, 0.6, { gain: 1.3 }) },
  78: { area: flame(4, 0.9, { gain: 1.3 }) },
  // Electric Spark / Lightning Shock / Chain Lightning: BITMAP_LIGHTNING+1 range 2-4.
  65: { area: arc(4, 0.5) },
  215: { impact: arc(4, 0.45) },
  230: { area: arc(5, 0.6, { gain: 1.4 }) },
  // Drain Life: MODEL_DARK_ELF_SKILL range 3 (:10423).
  214: { impact: shade(3, 0.8) },
};

/**
 * Any wizardry skill without a row: a short pale flash at the caster's
 * hands — the MODEL_MAGIC2 cast glow (range 3, :10437), kept to 2 tiles so it
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
  const row = SKILL_LIGHTS[skill];

  if (row?.cast) return row.cast;
  // A skill with a recipe keeps its hands dark unless it asked for a cast
  // flash; only unknown wizardry gets the fallback.
  if (row) return null;

  return skillDefinition(skill)?.damageType === 'Wizardry'
    ? DEFAULT_WIZARDRY_CAST
    : null;
}

/** Command: a targeted skill — cast flash, then projectile or direct impact. */
export function lightTargetedSkill(
  scene: Scene,
  skill: number,
  caster: Entity,
  target: Entity | null
): void {
  if (!caster.transform) return;

  const row = SKILL_LIGHTS[skill];
  const cast = castRecipeFor(skill);

  if (cast) {
    attach(scene, cast, {
      position: entityPos(caster, CAST_HEIGHT),
      follow: followEntity(caster, CAST_HEIGHT),
    });
  }

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

/** Command: an area skill — cast flash, then the ground light at `at`. */
export function lightAreaSkill(
  scene: Scene,
  skill: number,
  caster: Entity,
  at: { x: number; y: number; z: number }
): void {
  const row = SKILL_LIGHTS[skill];
  const cast = castRecipeFor(skill);

  if (cast && caster.transform) {
    attach(scene, cast, {
      position: entityPos(caster, CAST_HEIGHT),
      follow: followEntity(caster, CAST_HEIGHT),
    });
  }

  const area = row?.area ?? row?.impact;

  if (area) attach(scene, area, { position: { ...at } });
}

function update(): void {
  for (const source of sources) if (!source.alive) sources.delete(source);
}

function reset(): void {
  sources.clear();
}

function emitters(): readonly LightSource[] {
  return Array.from(sources);
}

// ---- 3. the layer ----------------------------------------------------------

/** Every map: a skill lights wherever it is cast. */
export const skillsLayer: LightingLayer = {
  name: 'skills',
  update: (_map: ENUM_WORLD) => update(),
  reset,
  emitters,
};
