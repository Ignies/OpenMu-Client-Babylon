# terrain

The ground of a map: loading its terrain files (in a worker), the ground mesh, material and outer
edge, its light (bake, torch light, roof mask), the weather overlays drawn on it, grass, animated
water, ground picks, minimap data and the base class for map objects. There is no facade yet:
`index.ts` only exports the row types a map folder writes; callers import the files below directly.

## Public API
- `index.ts`: `MapTileObject` (the base class a map folder's object classes extend; import it only
  from code a map's `create.ts` loads) and the types - `MapTerrain` (`mapTerrain.ts`, a map's `terrain` field:
  `overlays`, `snowBed`, `water`, `rest`, `leanCursor`, `objectFixups`, `grass`, `hidden`),
  `TerrainOverlayName`, `RestObject`, `RestKind`, `MapObjectFixup`, `TerrainWaterSpec`; `TILE_CM`.
- `loadMapIntoScene(world, map, pos?)` (`loadMapIntoScene.ts`): queue a warp to `map`.
- `objectRecords.ts`: `MapObjectRecord` and `placesObject(record)`, which records become objects
  (inside the block grid, finite, a type with a model; World7 places one at -515).
  `onMapChange(fn)` sets what resets on map change and `onHeroPlaced(fn)` what runs once the hero
  stands on the new map (both set once by `app/boot.tsx`; the hero puts its gear back on);
  `reloadMapObjects()` rebuilds the map's objects after the batching option changes.
- World accessors set on each load (`getTerrainData.ts`): `world.getTerrainHeight`, `isWalkable`,
  `getTerrainFlag`, `setTerrainFlags`, `detachGround`, `getTerrainTile`, `getTerrainLayers`,
  `getTerrainLight`. Picks: `pickGround(world, x, y)` and `TerrainPicker` (`terrainPick.ts`).
- `MapTileObject` (`mapTileObject.ts`): the `ModelObject` every map object extends.
- `consts.ts`: `TERRAIN_SIZE`, `TILE_CM`, `cmToTiles`, the `TW_*` / `TWFlags` attribute bits, and the
  dev switches `DEBUG_SHOW_TERRAIN_ATTRIBUTES`, `DISABLE_OBJECTS_LOADING`.
- `terrainDynamicLight.ts`: `registerTerrainLight(emitter)` (returns the unregister),
  `updateTerrainDynamicLight`, `uploadTerrainLightDelta`, `requestTerrainLight`,
  `requestBodyTerrainLight`, `terrainLightReaches`, `terrainLightTouchesSample`.
- `terrainMask.ts`: `isTileOpen(x, z)`, `paintRoof`, `isRoofSlab`, `flushTerrainMask`,
  `resetTerrainMask`, `terrainMaskVersion`.
- `terrainOverlay.ts`: `PUDDLES`, `WET_GROUND`, `overlayAmountAt`, `overlayBedShare`,
  `snowCoverFor`, `needsTerrainMask`. `terrainGrass.ts`: `grassFieldForFrame`, `GrassActor`.
- `artMatch.ts`: `SNOW_ART`, `ArtMatch`, `artMatch`: how much a map's own tile art already is
  the substance an overlay draws (a leaf, so its test needs no scene).
- Smaller readers: `loadWorldMinimap` (null, without a request, when the version's tree has no
  `mini_map.ozt` for the world: `hasDataFile`), `parseMinimapData`, `findRestObject` /
  `leanCursorObjects`, `mapObjectFixupsFor`,
  `grassAllowed`, `parseTerrainObjects`, `decryptMapFile` / `convertBux`, `getTilesList`,
  `getTerrainHeightMap`, `waterSurfaceHeight`, `loadCameraWalkScript`, `liveTileArrays`.

## How it works
- `loadMapIntoScene` sets `world.mapIndex` at once and queues the load; loads run one at a time
  and a newer warp supersedes an older one. `prepareTerrain` does everything that can fail before
  the old map is torn down, so a failed warp leaves the old map up and retries (400, 1200, 3000 ms).
  Then: `unloadMap`, the map-change hook (`app/lifecycle.ts`), `resetTerrainMask`,
  `getTerrainData`, the map entry's `maps.create(world)`, the objects (the 16x16 block test of
  `CreateObject`, ZzzObject.cpp:4433-4435), the hero placed, `warpCompleted` emitted.
- `prepareTerrain` (`getTerrainData.ts`): the five terrain files and tiles come from
  `assets/prefetchWorld`. Height, attributes, mapping and objects parse in the worker
  (`terrainParseClient.ts` -> `terrainParse.worker.ts`, inline fallback). By default the light
  map decodes and bakes there too: the lightmap times normal dot `(0.5, -0.5, 0.5)` + 0.5. The
  ground arrays build there (`groundArrays.ts`) while the tiles pack into a texture array and the
  water frames and grass cards load. A card the version lacks (`hasAssetFile`) is not asked for.
- `getTerrainData` uploads the ground mesh, the height map texture and the picker, builds the
  material (`terrainMaterial.ts`: tile splat, overlays, cutout, water), the outer edge (tiers
  only) and the grass, and returns the world accessors.
- Light: `terrainDynamicLight.ts` keeps the bake plus this frame's emitters per tile
  (`PrimaryTerrainLight`) and uploads the delta as an RGBA texture whose alpha is the roof mask.
  `terrainLighting.ts` is the one GLSL writer of ground light (Classic: bake + delta,
  ZzzLodTerrain.cpp:481-505), shared by the material and the grass.
- `setTerrainFlags` (`AddTerrainAttributeRange`) patches the pathfinder and re-lays `NoGround`
  tiles (`refreshGroundTile`; the original tests it per draw, ZzzLodTerrain.cpp:1623). The server's
  `ChangeTerrainAttributes` (`ReceiveSetAttribute`, WSclient.cpp:8320-8345) goes through it.
- Overlays: `terrainOverlaysFor(map)` gives the layers the map names (`terrain.overlays`: wet
  ground and puddles on Noria) and snow on `SNOW_GROUND_MAPS`; their coverage reads the weather
  controller.
- Per-map rows live with the map (`MapLayer.terrain` in `versions/shared/maps/<map>/`): overlays,
  snow bed, water, rest objects, object fixups, grass off, a ground never drawn (Icarus). The modules here read them through
  `maps.layerFor` when they need them, never at module load.

## Depends on / used by
- uses: `assets`, `maps` (tiles, cutout, spawn, `create`), `weather` (coverage, trail, melt,
  burn), `lighting`, `render`, `fx`, `loading` (the scene flag), `core`. Reads `settings`.
- used by: `app/boot.tsx`, `ecs/world.ts`, ECS systems (`terrainLightSystem`, `terrainMaskSystem`,
  `terrainGrassSystem`, the cursor and pointer systems), the fx, lighting, render, sound, assets,
  maps and weather controllers, `modules` (skills, warp), the options window, the minimap HUD,
  the GM map view, and map content in `versions/shared/maps/`.

## Change it
- give a map wet ground or another overlay: `terrain.overlays` on its entry; a new layer is a
  `TerrainOverlay` recipe whose `coverage` reads a weather reader, named in `OVERLAYS`
  (`terrainOverlay.ts`) and `TerrainOverlayName` (`mapTerrain.ts`).
- where snow lies on a snow map: `terrain.snowBed` on its entry (or `SNOW_COVER.bed` for Devias'
  slots).
- give a map animated water: `terrain.water` on its entry.
- a sit / pose / healing object: `terrain.rest` (and `leanCursor`) on its entry, built with
  `sit` / `pose` / `healing` (`versions/shared/maps/shared/terrain.ts`); a misplaced object's
  height: `terrain.objectFixups`. Turn the grass off: `terrain.grass: false`.
- change how the ground is lit: `terrainLighting.ts` only, so the grass follows.
- a new parse step: write it pure (no Babylon, no DOM), add a request kind to
  `terrainParse.worker.ts` and a wrapper with an inline fallback in `terrainParseClient.ts`.

## Tests
- `versions/shared/maps/mapRows.golden.test.ts`: every world's overlays, snow bed, water, rest
  objects, lean boxes, fixups and grass, pinned across the move into the map folders.
- `mapTerrain.test.ts`: only Icarus hides its ground; rest objects and lean boxes and the
  nearest-object height fix from a registered entry.
- `terrainGrassCards.test.ts`: a card the version lacks is never fetched.
- `minimap.test.ts`: no picture in the version's tree is no minimap, and nothing is fetched for it.
- `tools/grassCards.test.ts`: every grass card `Data/` ships for a converted world is in
  `public/game-assets` (a missing card silently grows no grass; 58 were missing until 2026-10-05).
- `groundArrays.test.ts`: `refreshGroundTile` raises and drops a tile and leaves its neighbours;
  `groundTiles` copies tiles out with their own quads.
- `terrainDynamicLight.test.ts`: `terrainLightTouchesSample` and its version, the bilinear sample.
- `terrainJpeg.test.ts`: `lightFromPixels` and `decodeJpegPixels` (worker and main-thread paths).
- `terrainLighting.test.ts`: the GLSL branches on the tier uniforms, `?terrainBranch=0`, range 0
  for unfilled pool slots.
- `terrainOverlay.test.ts`: the snow melt loop and upload, with and without `?snowGate=0`.
- `snowArtMatch.test.ts`: `SNOW_ART` against measured tile colours.
- `terrainPick.test.ts`: `TerrainPicker` finds the same hit as Babylon's mesh pick.
- `objectRecords.test.ts`: the block grid, NaN coordinates and a negative type.
- `terrainWater.test.ts`: the surface is a pure function of time and position, carries the
  `CSWaterTerrain` wave constants, stays in the amplitude bound; the ambient ring spreads and damps.

## Notes
- `createTerrainNormal.ts`: plain floats instead of `Vector3[]` (65 536 fewer allocations, and it
  runs in the worker). Two face normals per texel, summed, not normalised. When a face has zero
  area the original's hoisted `face_normal` keeps the previous face's normal; `fnx/fny/fnz` copy
  that (unreachable with `TERRAIN_SCALE = 1`, kept anyway).
- `minimapData.ts`: `Data/World{n}/Minimap.bmd` is `MAX_MINI_MAP_DATA` (100) BUX-encoded records,
  a 45-byte tail and a checksum (`GenerateCheckSum2(..., 0x2BC1)`). A record is 4-byte aligned:
  `BYTE Kind` (0 end, 1 NPC, 2 portal), `int Location[2]`, `int Rotation`, `char Name[100]` = 116
  bytes. The localised `Data/Local/{lang}/Minimap/Minimap_World{n}_{lang}.bmd` has the same layout.
- `terrainDetail.ts`: MU's ground art is 64-128 px over several tiles, fine from the ported camera
  but a smear at eye height (1.6 tiles). A luminance grain on the art, before the light.
- `terrainEdge.ts`: the ground is a 256x256 sheet with no sides. Each border tile carries itself
  out: water at its own level, ground otherwise, with an apron where they meet. Rings of doubling
  depth avoid one stretched quad per tile (stripes to the horizon). Shares the ground's
  `ShaderMaterial`, so there is no seam; a separate mesh so picks and the octree stay small.
- `terrainGrass.ts`: the original drew one alpha card per grass tile (`TileGrass01/02/03`); blades
  are opaque, so no sorting or alpha test. Wind is a plane wave so neighbours move together, and
  form shading bands it. Burn: blades go at their own cubed-hash threshold, so about three quarters
  go and a sixth stay charred; `HEAT_FROM` sets how long a cut glows. Transmission recolours the
  tip toward the emitter hue without brightening. Actors are a uniform array, not a trample map
  (that would add a texture, an upload and a decay pass).
- `terrainGrassCards.ts`: the original draws a card only if `Bitmaps.FindTexture` finds it, so the
  rule is "does the world ship the card": Lorencia all three, Dungeon none, Devias only Grass02
  (frosted grass on the ice), Lost Tower Grass01 and Grass03, Tarkan none.
- `terrainLighting.ts` contract: emit `terrainLightDeclarationsGlsl` at fragment scope, then
  `terrainSkyLightGlsl` and `terrainGroundLightGlsl` in `main`; list `TERRAIN_LIGHT_UNIFORMS`,
  `terrainLightSamplers`, `terrainLightDefines`; call `bindTerrainLight`. The vertex stage passes
  `vWorldXZ` (light and mask lookup), `vWorldPos` (cascade lookup), `vViewZ` (which cascade).
- `terrainMask.ts`: texel (x, y) is tile (x, z), read at `(worldXZ + 0.5) / 256`. No `.att` marks
  interiors (Lorencia has zero `Height` tiles), so two sources are painted: roof slabs (the
  roof test of `ecs/systems/roofDetection.ts` over the whole map) and known room boxes. Painting is additive for the
  life of the map, so a roof hidden while the hero is inside still counts.
- `terrainMaterial.ts`: every `AlphaTile*.Tga` is zero, so the cutout slot draws nothing. A tile
  fully covered by layer 2 never reaches the cutout; a partial one takes a 0.5 cut (11 of 309
  tiles on Elbeland).
- `terrainOverlay.ts`: the terrain shader can read the height map where a particle cannot, so
  snow, wet stone and puddles are one recipe list. The mix is before lighting, so a layer takes
  the same bake, shadow and torches as the ground. Colour, patch size, softness and slope are GLSL
  literals; only `coverage` is a uniform, so a lost uniform means "no layer", never black ground.
  `SNOW_SHADE` is the live exception (`window.muSnow`). `defersToArt` keeps the layer off art that is already snow (Devias, Santa
  Town, the ice fields). Water reflects a built sky (gradient plus parallax cloud deck), not a
  colour, and its normal stacks wind ripple and raindrop rings. On the linear tiers the lit term
  decodes the constants once, adds the delta in linear and encodes once at the end.
- `terrainParse.worker.ts` requests: `bulk` (height, attributes, mapping, objects from the
  downloaded bytes), `lightJpeg` (decode TerrainLight.OZJ, then the normal / luminosity pass),
  `light` (the same pass on floats read back from the GPU, `?lightDecode=gpu`), `ground` (vertex
  arrays), `pack` (tiles resampled into array layers). Buffers transfer, not copy.
- `tileTextureArray.ts`: a sampler array cannot be indexed per fragment, so the old shader ran
  18-20 guarded fetches; an array layer is a coordinate. Tiles are 256 or 128 px, upscaled to the
  largest: nearest is exact under Classic's `NEAREST_NEAREST`, bilinear on tiers >= 1. Mips are
  always built so the quality flip is a live `updateSamplingMode`.
- `unpackTerrainLight.ts`: plain `{x, y, z}` objects silently gave `undefined` vertex colours
  (flat unlit ground), because Babylon's `copyFrom` reads `_x`.
- `terrainDynamicLight.ts` (`requestBodyTerrainLight`): the ground adds the dynamic light, an
  object multiplies by BodyLight, so with a black bake (Atlans has stretches at (0, 0, 0.02)) no
  torch reaches a monster. The floor uses `bodyLift`, the share the point-light pool does not take.
