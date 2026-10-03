import type { ENUM_WORLD } from '../../core/types';
import { maps, type PerWorld } from '../maps';

/**
 * `MoveObject`'s per-frame mesh writes (`o->BlendMeshTexCoordU/V`,
 * `o->BlendMeshLight`) by world and type. `stream` draws unlit (ZzzBMD.cpp:990-1001).
 * Each map writes its own rows (`MapRender.meshAnimations` in its `spec.ts`).
 */
export type MeshAnimation = {
  /** Which mesh index the writes target. */
  readonly mesh: number;
  /** `stream`: unlit + scrolling. `blend`: the additive BlendMesh. */
  readonly kind: 'stream' | 'blend';
  readonly u?: (timeMs: number) => number;
  readonly v?: (timeMs: number) => number;
  /** Animated `o->BlendMeshLight`; `blend` meshes only. */
  readonly light?: (timeMs: number) => number;
};

/** One map's mesh animations, by object type. */
export type MeshAnimations = Readonly<Partial<Record<number, MeshAnimation>>>;

/** A map's own render rows, `MapLayer.render`. */
export type MapRender = {
  /** `MoveObject`'s mesh writes by object type. Read by `meshAnimationFor`. */
  readonly meshAnimations?: PerWorld<MeshAnimations>;
};

export function meshAnimationFor(
  world: ENUM_WORLD,
  type: number
): MeshAnimation | undefined {
  return maps.rowFor(world, l => l.render?.meshAnimations)?.[type];
}
