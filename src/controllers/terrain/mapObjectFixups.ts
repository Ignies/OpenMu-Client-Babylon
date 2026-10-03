import type { ENUM_WORLD } from '@/core/types';
import { maps } from '../maps';

/**
 * Height fixes for objects the shipped `.obj` places wrong. Each map declares
 * its own (`MapTerrain.objectFixups`); this file matches and applies them.
 */
export interface MapObjectFixup {
  type: number;
  x: number;
  y: number;
  z: number;
}

const MATCH_EPSILON = 1;

/** The height fixes a world applies to its objects, empty for none. */
export function mapObjectFixupsFor(map: ENUM_WORLD): readonly MapObjectFixup[] {
  return maps.layerFor(map)?.terrain?.objectFixups ?? [];
}

export function applyMapObjectFixups(
  map: ENUM_WORLD,
  objs: { id: number; pos: { x: number; y: number; z: number } }[]
): void {
  const fixups = mapObjectFixupsFor(map);

  for (const fixup of fixups) {
    let target: (typeof objs)[number] | undefined;
    let bestDistance = MATCH_EPSILON;

    for (const o of objs) {
      if (o.id !== fixup.type) continue;

      const distance = Math.hypot(o.pos.x - fixup.x, o.pos.y - fixup.y);
      if (distance < bestDistance) {
        bestDistance = distance;
        target = o;
      }
    }

    if (!target) {
      console.warn(
        `[mapObjectFixups] no object ${fixup.type} near (${fixup.x}, ${fixup.y}) on map ${map}`
      );
      continue;
    }

    target.pos.z = fixup.z;
  }
}
