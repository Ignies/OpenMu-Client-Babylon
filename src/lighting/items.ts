/**
 * Items as lights : in the improved look, +9…+15 gear lights
 * the wearer's surroundings — one point light and a terrain stain per
 * character, following the body — and a dropped +9…+15 item does the same,
 * static. The colour is the item tier's, breathing on the item-glow clock so
 * floor and blade agree (`common/itemVisualTier.ts`).
 *
 * What triggers a lamp stays in `ecs/systems/itemGlowSystem.ts`: it knows
 * which entity wears what, stamps the meshes, and owns the auras and
 * crackles; it asks this entry for the light and writes the wearer's
 * `SelfLight` from `itemSelfLight`.
 */
import type { Scene } from '../libs/babylon/exports';
import type { TerrainLightColor } from '../common/terrainDynamicLight';
import {
  itemGlowClock,
  itemLightColorAt,
  type ItemVisualTier,
} from '../common/itemVisualTier';
import type { LightingLayer } from './layer';
import { LightSource, PRIORITY_TORCH, type LightRecipe } from './lightSource';

// ---- 1. tuning -------------------------------------------------------------

/** Light hovers at chest height on a character; drops sit on the floor. */
const CHARACTER_LIGHT_HEIGHT = 0.9;
const DROP_LIGHT_HEIGHT = 0.35;

/** Fraction of the light colour fed back into the wearer's own body light. */
const SELF_LIGHT = 0.35;

/** Terrain-stain floor gain: softer than a torch, it's jewellery not fire. */
const FLOOR_GAIN = 0.7;

/** Pool priority: hero > other players > drops / torches, then distance. */
const PRIORITY_HERO = 2;
const PRIORITY_PLAYER = 1;
const PRIORITY_DROP = PRIORITY_TORCH;

export type ItemLampKind = 'hero' | 'player' | 'drop';

function itemRecipe(tier: ItemVisualTier, kind: ItemLampKind): LightRecipe {
  return {
    color: out => itemLightColorAt(tier, itemGlowClock(), out),
    range: tier.terrainRange,
    pointRange: tier.lightRange,
    floorGain: FLOOR_GAIN,
    heightOffset: kind === 'drop' ? DROP_LIGHT_HEIGHT : CHARACTER_LIGHT_HEIGHT,
    priority:
      kind === 'hero'
        ? PRIORITY_HERO
        : kind === 'player'
          ? PRIORITY_PLAYER
          : PRIORITY_DROP,
    // Gear is worn for the whole map; the pool's cross-fade is right for it.
    instant: false,
  };
}

// ---- 2. state + readers ----------------------------------------------------

const lamps = new Set<LightSource>();

/**
 * Command: a lamp for an item tier at `position`, which is held by reference
 * — the caller moves it with the wearer. Null for tiers that throw no light
 * (`lightGain` 0). The caller keeps the handle and `dispose()`s it when the
 * gear changes; a map change disposes it underneath (the facade's reset),
 * after which `alive` is false and the caller rebuilds.
 */
export function lightItem(
  scene: Scene,
  tier: ItemVisualTier,
  kind: ItemLampKind,
  position: { x: number; y: number; z: number }
): LightSource | null {
  if (tier.lightGain <= 0) return null;

  const lamp = LightSource.attach(scene, itemRecipe(tier, kind), { position });

  lamps.add(lamp);

  return lamp;
}

/**
 * Reader: what the wearer's own body gets back from their gear — the
 * original adds `o->Light` to the character it belongs to.
 */
export function itemSelfLight(
  lamp: LightSource,
  out: TerrainLightColor
): TerrainLightColor {
  const c = lamp.color;

  out.r = c.r * SELF_LIGHT;
  out.g = c.g * SELF_LIGHT;
  out.b = c.b * SELF_LIGHT;

  return out;
}

function update(): void {
  for (const lamp of lamps) if (!lamp.alive) lamps.delete(lamp);
}

function reset(): void {
  lamps.clear();
}

function emitters(): readonly LightSource[] {
  return Array.from(lamps);
}

// ---- 3. the layer ----------------------------------------------------------

export const itemsLayer: LightingLayer = {
  name: 'items',
  update,
  reset,
  emitters,
};
