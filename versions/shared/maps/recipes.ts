/**
 * Tile-slot lists shared by map entries (`MapLayer.tiles`). Slot order is
 * `CMapManager::LoadWorld`'s (MapManager.cpp:1362-1420): 0 Grass01, 1 Grass02,
 * 2 Ground01, 3 Ground02, 4 Ground03, 5 Water01, 6 Wood01, 7 Rock01 … 13
 * Rock07. A map whose folder lacks a slot's file spells its own list in its
 * entry, substituting a tile the folder does have.
 */

/** Every slot, Rock01-07: the folders that ship the full set. */
export const FULL_TILES: readonly string[] = [
  'TileGrass01',
  'TileGrass02',
  'TileGround01',
  'TileGround02',
  'TileGround03',
  'TileWater01',
  'TileWood01',
  'TileRock01',
  'TileRock02',
  'TileRock03',
  'TileRock04',
  'TileRock05',
  'TileRock06',
  'TileRock07',
];

/** Slots 0-10, Rock01-04: most Season 1 folders (Lost Tower, Stadium, Tarkan …). */
export const ROCK04_TILES: readonly string[] = FULL_TILES.slice(0, 11);

/** Slots 0-8, Rock01-02: Lorencia and the Dungeon. */
export const ROCK02_TILES: readonly string[] = FULL_TILES.slice(0, 9);
