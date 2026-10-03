// The terrain controller's door. Small on purpose: only the row types a map's
// folder writes (`MapLayer.terrain`). Everything else is still imported from
// its own file until the controller gets a facade.
export type { MapTerrain, TerrainOverlayName } from './mapTerrain';
export type { MapObjectFixup } from './mapObjectFixups';
export type { RestKind, RestObject } from './restObjects';
export type { TerrainWaterSpec } from './terrainWater';
