import { maps } from '../maps';

/**
 * The renderer's "no additive mesh" sentinel (`ModelObject.BlendMesh`). The
 * per-world tables are `MapLayer.blendMeshes` on each map entry
 * (`src/maps/<name>/spec.ts`); this file is the old name for the reader.
 */
export const NO_BLEND_MESH = -1;

export function blendMeshFor(world: number, type: number): number {
  return maps.blendMeshFor(world, type) ?? NO_BLEND_MESH;
}
