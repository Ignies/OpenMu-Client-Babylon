import type { Scene } from '../libs/babylon/exports';
import type { ENUM_WORLD } from '../common/types';
import type { Entity } from '../ecs/world';
import type { Events } from '../libs/eventBus/events';
import type { LightingLayer } from './layer';
import { LightSource, type LightRecipe } from './lightSource';

/**
 * Server-driven object effects as light sources.
 *
 * What it is: the flash under a level-up, a shield potion, a lost shield or
 * a swirl — the bursts in `effects/burstEffects.ts`, lit. Driven by the
 * `objectEffect` event, through `ObjectEffectSystem` calling the command
 * below. The light follows the body, so a level-up mid-walk keeps its glow
 * under the feet.
 *
 * The original lights none of these (`ReceiveLevelUp` spawns flare joints,
 * which carry no `AddTerrainLight`), so the colours follow the burst's
 * particle tint and the values are ours.
 */

// ---- 1. tuning -------------------------------------------------------------

type ObjectEffect = Events['objectEffect']['effect'];

/** Tiles above the feet for a whole-body effect: chest height. */
const BODY_HEIGHT = 0.8;

/** Tiles above the feet for a swirl, which sits lower. */
const SWIRL_HEIGHT = 0.6;

/** Keyed by the event's effect name. */
export const OBJECT_EFFECT_LIGHTS: Record<ObjectEffect, LightRecipe> = {
  levelUp: {
    color: [1, 0.85, 0.4],
    range: 3,
    seconds: 1.6,
    attack: 0.12,
    release: 0.7,
    heightOffset: BODY_HEIGHT,
  },
  shieldPotion: {
    color: [0.4, 0.7, 1],
    range: 2,
    seconds: 0.8,
    heightOffset: BODY_HEIGHT,
  },
  shieldLost: {
    color: [0.8, 0.3, 0.3],
    range: 2,
    seconds: 0.8,
    heightOffset: BODY_HEIGHT,
  },
  swirl: {
    color: [1, 1, 1],
    range: 2,
    seconds: 1.0,
    heightOffset: SWIRL_HEIGHT,
  },
};

// ---- 2. state + readers ----------------------------------------------------

const sources = new Set<LightSource>();

/** Command: light an object effect on an entity. */
export function lightObjectEffect(
  scene: Scene,
  entity: Entity,
  effect: ObjectEffect
): void {
  const transform = entity.transform;
  if (!transform) return;

  const recipe = OBJECT_EFFECT_LIGHTS[effect];
  // The body height rides in the anchor so the terrain footprint stays at
  // the feet; the point light then needs no extra offset.
  const height = recipe.heightOffset ?? 0;

  const follow = (out: { x: number; y: number; z: number }) => {
    out.x = transform.pos.x + (transform.posOffset?.x ?? 0);
    out.y = transform.pos.y + height;
    out.z = transform.pos.z + (transform.posOffset?.z ?? 0);
  };

  const position = { x: 0, y: 0, z: 0 };
  follow(position);

  sources.add(
    LightSource.attach(scene, { ...recipe, heightOffset: 0 }, { position, follow })
  );
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

/** Every map: the event decides, not the world. */
export const objectEffectsLayer: LightingLayer = {
  name: 'objectEffects',
  update: (_map: ENUM_WORLD) => update(),
  reset,
  emitters,
};
