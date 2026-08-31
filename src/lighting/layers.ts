import type { LightingLayer } from './layer';
import { mapObjectLightsLayer } from './mapObjectLights';
import { itemsLayer } from './items';
import { charactersLayer } from './characters';
import { skillsLayer } from './skills';
import { objectEffectsLayer } from './objectEffects';
import { skyLayer } from './sky';

/**
 * THE list. Every lighting entry in the game is one line here, and adding an
 * entry is adding one line. Nothing else in the codebase enumerates them.
 *
 * Order is update order. No entry reads another today, so it is free; the
 * order below is roughly "the map, then what stands on it, then what
 * happens on it".
 */
export const LIGHTING_LAYERS: readonly LightingLayer[] = [
  mapObjectLightsLayer,
  itemsLayer,
  charactersLayer,
  skillsLayer,
  objectEffectsLayer,
  skyLayer,
];
