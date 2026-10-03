import type { Scene } from '../render/babylon/exports';
import type { ENUM_WORLD } from '../../core/types';
import type { Entity } from '../../ecs/world';
import { lightingTier } from './lightingQuality';
import type { LightingLayer } from './layer';
import { LightSource, type LightRecipe } from './lightSource';
import { monsterRegistry, type MonsterLight } from '../monsters';

/**
 * The light an NPC or monster carries while in scope, following its body:
 * `MoveCharacterVisual` (ZzzCharacter.cpp:5790-6005). Notes in readme.md.
 */

// ---- 1. tuning -------------------------------------------------------------

/** Tiles above the feet where a forge/brazier light hangs: waist height. */
const BODY_HEIGHT = 0.7;

/** Pool priority: a lit NPC ranks with the torches, below any player's gear. */
const PRIORITY_CHARACTER = 0;

/** The blacksmith's forge roll, `Luminosity` 0.6…1.0 in five steps. */
const FORGE_FLICKER = { min: 0.6, max: 1, steps: 5 };

/**
 * `RenderLight`'s breath (ZzzCharacter.cpp:8249) as a `LightPulse`:
 * `sinf(WorldTime * 0.002f) * 0.3f + 0.7f` is `(sin + 1) * 0.3 + 0.1`, so the
 * floor swells with the card the monster is carrying rather than beside it.
 */
const CARRIED_GLOW_PULSE = { speed: 0.002, amount: 0.3, base: 0.1 };

/** `RenderLight`'s colour at full luminosity: `(L, 0.6L, 0.4L)` (:8250). */
const CARRIED_GLOW_RGB = [1, 0.6, 0.4] as const;

/**
 * The colour of a hand that holds `BITMAP_LIGHTNING + 1`: `lightning2` is a
 * cyan burst, and the card on the bone reads cyan-white whatever
 * `RenderLight`'s amber says. The pool on the floor is the light in the
 * hand, so it takes the card's colour - the reviewer caught the Vepar's blue
 * hands pooling orange on the Atlans sand.
 */
const LIGHTNING_GLOW_RGB = [0.35, 0.8, 1] as const;

/**
 * A negative light's strength here against the original's. The original takes
 * its -1.3 off a gamma-space floor that sits near 0.7 and blacks out the
 * inner half of its 3 tiles. The terrain shader on tiers >= 1 subtracts in
 * linear light, where that floor is 0.7^2.2 = 0.46, and the same 1.3 blacks
 * out nearly the whole radius - a hole in the ground. 0.46 / 1.3 puts the
 * subtraction at the floor's own level: black only at the point under the
 * body, which the body covers, and a gradient over the whole radius. The
 * point light on bodies takes the same factor.
 */
const DARK_FLOOR_GAIN = 0.35;

type CharacterLight = LightRecipe & {
  /**
   * Ours, not the original's: the monster carries a glow but throws no
   * `AddTerrainLight`. Withheld on Classic, which is the original look.
   */
  readonly improvedOnly?: boolean;
};

/** A monster lit by the glow it carries (`controllers/fx/monsterGlow.ts`). */
function carried(
  range: number,
  heightOffset: number,
  color: readonly [number, number, number] = CARRIED_GLOW_RGB,
  steady = false
): CharacterLight {
  return {
    color,
    range,
    pointRange: range + 2,
    heightOffset,
    pulse: steady ? undefined : CARRIED_GLOW_PULSE,
    priority: PRIORITY_CHARACTER,
    improvedOnly: true,
  };
}

/** The recipe a type's `MonsterDef.light` row stands for. */
function recipeOf(light: MonsterLight): CharacterLight {
  switch (light.kind) {
    case 'forge':
      return {
        color: light.color,
        range: light.range,
        pointRange: light.range + 2,
        heightOffset: BODY_HEIGHT,
        flicker: FORGE_FLICKER,
        priority: PRIORITY_CHARACTER,
      };
    case 'dark':
      // The pool keeps the terrain radius (the usual +2 made a black hole of it) and the
      // subtraction is scaled to linear light, DARK_FLOOR_GAIN.
      return {
        color: [-1.3, -1.3, -1.3],
        range: 3,
        pointRange: 3,
        heightOffset: BODY_HEIGHT,
        gain: DARK_FLOOR_GAIN,
        floorGain: DARK_FLOOR_GAIN,
        priority: PRIORITY_CHARACTER,
      };
    case 'carried':
      return carried(
        light.range,
        light.height ?? BODY_HEIGHT,
        light.color === 'lightning' ? LIGHTNING_GLOW_RGB : light.color,
        light.steady
      );
  }
}

// ---- 2. state + readers ----------------------------------------------------

const sources = new Map<Entity, LightSource>();
const recipes = new WeakMap<MonsterLight, CharacterLight>();

/**
 * The recipe a character type carries, if any (its monster folder's `light`). Classic gets the
 * original's own lights only; the rows we added for a carried glow need a tier that lights the
 * floor dynamically in the first place.
 */
export function characterLightFor(npcType: number): LightRecipe | undefined {
  const light = monsterRegistry.def(npcType)?.light;
  if (!light) return undefined;
  let row = recipes.get(light);
  if (!row) {
    row = recipeOf(light);
    recipes.set(light, row);
  }

  if (row.improvedOnly && !lightingTier()) return undefined;

  return row;
}

/** Whether this entity holds a live light right now. */
export function characterIsLit(e: Entity): boolean {
  return sources.get(e)?.alive === true;
}

/** Command: attach the entity's light (replacing a dead one). */
export function lightCharacter(scene: Scene, e: Entity): void {
  const recipe = e.npcType !== undefined ? characterLightFor(e.npcType) : null;
  const transform = e.transform;

  if (!recipe || !transform) return;

  snuffCharacter(e);

  sources.set(
    e,
    LightSource.attach(scene, recipe, {
      position: { x: transform.pos.x, y: transform.pos.y, z: transform.pos.z },
      follow: out => {
        out.x = transform.pos.x + (transform.posOffset?.x ?? 0);
        out.y = transform.pos.y + (transform.posOffset?.y ?? 0);
        out.z = transform.pos.z + (transform.posOffset?.z ?? 0);
      },
    })
  );
}

/** Command: drop the entity's light. */
export function snuffCharacter(e: Entity): void {
  sources.get(e)?.dispose();
  sources.delete(e);
}

function reset(): void {
  // The facade already disposed every source; only the handles remain.
  sources.clear();
}

function emitters(): readonly LightSource[] {
  return Array.from(sources.values());
}

// ---- 3. the layer ----------------------------------------------------------

/** Every map: the monster's own row decides who is lit, not the world. */
export const charactersLayer: LightingLayer = {
  name: 'characters',
  update: (_map: ENUM_WORLD) => {},
  reset,
  emitters,
};
