import type { Scene } from '../libs/babylon/exports';
import type { ENUM_WORLD } from '../common/types';
import type { Entity } from '../ecs/world';
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

/** Keyed by NPC/monster type number (`MonstersDatabase`). */
export const CHARACTER_LIGHTS: Partial<Record<number, LightRecipe>> = {
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
};

// ---- 2. state + readers ----------------------------------------------------

const sources = new Map<Entity, LightSource>();

/** The recipe a character type carries, if any. */
export function characterLightFor(npcType: number): LightRecipe | undefined {
  return CHARACTER_LIGHTS[npcType];
}

/** Whether this entity holds a live light right now. */
export function characterIsLit(e: Entity): boolean {
  return sources.get(e)?.alive === true;
}

/** Command: attach the entity's light (replacing a dead one). */
export function lightCharacter(scene: Scene, e: Entity): void {
  const recipe = e.npcType !== undefined ? CHARACTER_LIGHTS[e.npcType] : null;
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
