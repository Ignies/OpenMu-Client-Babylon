import type { Scene } from '../libs/babylon/exports';
import type { ENUM_WORLD } from '../common/types';
import type { Entity } from '../ecs/world';
import { lightingTier } from '../common/lightingQuality';
import type { LightingLayer } from './layer';
import { LightSource, type LightRecipe } from './lightSource';

/**
 * Characters as light sources.
 *
 * What it is: the light an NPC or monster carries for as long as it is in
 * scope, following its body. Driven by `CharacterLightSystem`
 * (ecs/systems), which walks the entities with an `npcType` and calls the
 * two commands below. The original's `MoveCharacterVisual`
 * (ZzzCharacter.cpp:5790-6005) does this per frame under a handful of
 * models; `heightOffset` is where on the body the point light hangs.
 *
 * Player-worn gear is not this — `ecs/systems/itemGlowSystem.ts` grades it
 * by item tier .
 *
 * The rows marked `improvedOnly` are not the original's: they are the floor
 * light under a monster that only *carries* a glow there (Bahamut's lure,
 * the Lost Tower Shadow's body — `effects/monsterGlow.ts` draws the cards).
 * They breathe on the same curve the cards do, and Classic withholds them so
 * that tier stays as shipped.
 *
 * Not carried over: the negative light under Bloody Wolf and Tantallos
 * (`Vector(-1.3, -1.3, -1.3)`, range 3) — sources only add, and the terrain
 * delta texture has no sign bit. it is recorded as an open
 * decision.
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

type CharacterLight = LightRecipe & {
  /**
   * Ours, not the original's: the monster carries a glow but throws no
   * `AddTerrainLight`. Withheld on Classic, which is the original look.
   */
  readonly improvedOnly?: boolean;
};

/** A monster lit by the glow it carries (`effects/monsterGlow.ts`). */
function carried(
  range: number,
  heightOffset: number,
  color: readonly [number, number, number] = CARRIED_GLOW_RGB,
  pulse: typeof CARRIED_GLOW_PULSE | undefined = CARRIED_GLOW_PULSE
): CharacterLight {
  return {
    color,
    range,
    pointRange: range + 2,
    heightOffset,
    pulse,
    priority: PRIORITY_CHARACTER,
    improvedOnly: true,
  };
}

/** Keyed by NPC/monster type number (`MonstersDatabase`). */
export const CHARACTER_LIGHTS: Partial<Record<number, CharacterLight>> = {
  // 251 Hanzo the Blacksmith (MODEL_SMITH): (L, 0.4L, 0), range 3, :5970-5971.
  251: {
    color: [1, 0.4, 0],
    range: 3,
    pointRange: 5,
    heightOffset: BODY_HEIGHT,
    flicker: FORGE_FLICKER,
    priority: PRIORITY_CHARACTER,
  },
  // 231 Devias trader (MODEL_DEVIAS_TRADER): (0.5L, 0.3L, 0), range 3, :5999-6000.
  231: {
    color: [0.5, 0.3, 0],
    range: 3,
    pointRange: 5,
    heightOffset: BODY_HEIGHT,
    flicker: FORGE_FLICKER,
    priority: PRIORITY_CHARACTER,
  },
  // 35 Death Gorgon (MODEL_GORGON, `c->Level == 2`): the one monster in the
  // classic set that lights the floor itself — (0.8, 0.16, 0), range 2
  // (ZzzCharacter.cpp:5956-5957). Every tier: this one is the original's.
  35: {
    color: [0.8, 0.16, 0],
    range: 2,
    pointRange: 4,
    heightOffset: BODY_HEIGHT,
    flicker: FORGE_FLICKER,
    priority: PRIORITY_CHARACTER,
  },

  // ---- carried glows: ours, Enhanced/Ultra only ----------------------------

  // 45 Bahamut / 51 Great Bahamut: the lure hangs off the head of a fish
  // lying on the seabed, so the pool sits low.
  45: carried(3, 0.35),
  51: carried(3, 0.5),
  // 46 Vepar / 80 Golden Vepar: one light in each hand.
  46: carried(3, 0.8),
  80: carried(3, 0.8),
  // 48 Lizard King / 81 Golden Lizard King: four burning spikes.
  48: carried(3, 0.9),
  81: carried(3, 0.9),
  // 49 Hydra: the big flare over the head of a boss.
  49: carried(4, 1.2),
  // 36 Shadow has no row on purpose: its body cards are `SubType 1`,
  // `dst * (1 - src)` — it removes light rather than adding it, and a
  // negative source is the one thing the two sinks cannot carry (see above).
  // 39 Poison Shadow: the same body, but additive, in `Vector(0.2, 0.7, 0.1)`.
  39: carried(3, BODY_HEIGHT, [0.2, 0.7, 0.1], undefined),
  // 27 Scorpion: the tail lamp, `Luminosity` 0.8 flat (:6037).
  27: carried(2, 0.25, [0.8, 0.32, 0.16], undefined),
  // 235 Priest Sevina, 238 Chaos Goblin: a held flare.
  235: carried(3, 0.9),
  238: carried(2, BODY_HEIGHT),
};

// ---- 2. state + readers ----------------------------------------------------

const sources = new Map<Entity, LightSource>();

/**
 * The recipe a character type carries, if any. Classic gets the original's
 * own lights only; the rows we added for a carried glow need a tier that
 * lights the floor dynamically in the first place.
 */
export function characterLightFor(npcType: number): LightRecipe | undefined {
  const row = CHARACTER_LIGHTS[npcType];

  if (row?.improvedOnly && !lightingTier()) return undefined;

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

/** Every map: the table decides who is lit, not the world. */
export const charactersLayer: LightingLayer = {
  name: 'characters',
  update: (_map: ENUM_WORLD) => {},
  reset,
  emitters,
};
