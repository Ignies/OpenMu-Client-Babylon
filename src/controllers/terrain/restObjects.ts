import type { ENUM_WORLD } from '@/core/types';
import { maps } from '../maps';

/**
 * Objects a hero rests on: seats, lean boxes, healing spots. Each map
 * declares its own (`MapTerrain.rest` / `leanCursor` in
 * `versions/shared/maps/<map>/index.ts`); this file only reads them.
 */

export type RestKind = 'sit' | 'pose' | 'healing';

export interface RestObject {
  kind: RestKind;
  useObjectAngle: boolean;
}

const leanSets = new WeakMap<readonly number[], ReadonlySet<number>>();

/**
 * The operate boxes whose rest pose is the lean rather than the sit: the
 * cursor shows the lean hand over them (`CursorSystem`), and they keep a
 * model of their own for it.
 */
export function leanCursorObjects(map: ENUM_WORLD): ReadonlySet<number> | undefined {
  const types = maps.layerFor(map)?.terrain?.leanCursor;
  if (!types) return undefined;
  let set = leanSets.get(types);
  if (!set) {
    set = new Set(types);
    leanSets.set(types, set);
  }
  return set;
}

/**
 * `leanCursorObjects` as the per-world record its two outside readers
 * (`render/propBatches.ts`, `ecs/systems/cursorSystem.ts`) index. A live
 * view, read on every access; new code calls `leanCursorObjects`.
 */
export const LEAN_CURSOR_OBJECTS: Partial<Record<ENUM_WORLD, ReadonlySet<number>>> =
  new Proxy({} as Partial<Record<ENUM_WORLD, ReadonlySet<number>>>, {
    get: (_target, key) =>
      typeof key === 'string' ? leanCursorObjects(Number(key) as ENUM_WORLD) : undefined,
  });

export function findRestObject(
  map: ENUM_WORLD,
  objectType: number
): RestObject | undefined {
  return maps.layerFor(map)?.terrain?.rest?.[objectType];
}
