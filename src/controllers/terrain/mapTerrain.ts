import type { MapObjectFixup } from './mapObjectFixups';
import type { RestObject } from './restObjects';
import type { TerrainWaterSpec } from './terrainWater';

/** A ground layer the terrain controller draws (`terrainOverlay.ts`), by name. */
export type TerrainOverlayName = 'wetGround' | 'puddles';

/**
 * A map's own ground, `MapLayer.terrain`, written in the map's folder. Each
 * field is read by one terrain module at map load through the `maps`
 * controller; a field left out means "nothing here".
 */
export type MapTerrain = {
  /** Weather layers drawn over the tiles, besides settled snow (`terrainOverlay.ts`). */
  readonly overlays?: readonly TerrainOverlayName[];
  /**
   * How much settled snow each tile slot holds, 0..1, on a snow map whose
   * slots are not Devias' (`terrainOverlay.ts`'s `SNOW_COVER` bed).
   */
  readonly snowBed?: Readonly<Record<number, number>>;
  /** Animated water: the water slot, the wave scale, the caustics (`terrainWater.ts`). */
  readonly water?: TerrainWaterSpec;
  /** Objects a hero sits, leans or heals on, by object type (`restObjects.ts`). */
  readonly rest?: Readonly<Record<number, RestObject>>;
  /** The rest objects whose cursor is the lean hand (`restObjects.ts`). */
  readonly leanCursor?: readonly number[];
  /** Heights fixed on objects the shipped `.obj` places wrong (`mapObjectFixups.ts`). */
  readonly objectFixups?: readonly MapObjectFixup[];
  /** False where the original turns the grass pass off (`terrainGrass.ts`). */
  readonly grass?: boolean;
  /** The ground mesh is not drawn, only kept for its heights (`loadMapIntoScene.ts`). */
  readonly hidden?: boolean;
};
