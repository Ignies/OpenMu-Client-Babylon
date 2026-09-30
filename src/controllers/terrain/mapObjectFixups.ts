import { ENUM_WORLD } from '../../common';
import { MODEL_CANDLE, MODEL_FURNITURE01 } from '../../common/objects/enum';

export interface MapObjectFixup {
  type: number;
  x: number;
  y: number;
  z: number;
}

const MATCH_EPSILON = 1;

const MAP_OBJECT_FIXUPS: Partial<Record<ENUM_WORLD, MapObjectFixup[]>> = {
  [ENUM_WORLD.WD_0LORENCIA]: [
    { type: MODEL_FURNITURE01 + 3, x: 12494.65, y: 12235.38, z: 165 },
    { type: MODEL_FURNITURE01 + 3, x: 12483.23, y: 12235.69, z: 165 },

    { type: MODEL_CANDLE, x: 12531.0, y: 12253.23, z: 250 },
  ],
};

export function applyMapObjectFixups(
  map: ENUM_WORLD,
  objs: { id: number; pos: { x: number; y: number; z: number } }[]
): void {
  const fixups = MAP_OBJECT_FIXUPS[map];
  if (!fixups) return;

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
