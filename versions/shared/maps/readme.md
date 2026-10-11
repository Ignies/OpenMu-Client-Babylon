# maps

One folder per map. Each folder exports one `MapLayer` (the contract in
`src/controllers/maps/layer.ts`); `layers.ts` lists them all.

## Public API
- `MAP_LAYERS` (`layers.ts`): every map the client can load, in `ENUM_WORLD` order. The only list
  of maps; there is no `switch (map)` anywhere else.
- `FULL_TILES`, `ROCK04_TILES`, `ROCK02_TILES` (`recipes.ts`): common tile-slot lists.
- `shared/objectVariants.ts`: `AlphaObject.at(k)`, `PlaySpeedObject.at(k)`, `AbsentModelObject`,
  `bindAbsentModels(...)`, `ShadowCasterObject` (a map object the original shadows): per-type settings
  without a subclass per map.
- `shared/sound.ts` (`WIND`, `smallLoop` / `largeLoop`, `outsideSafeZone`, the monster hook
  shorthands `hookWalk` / `hookOnce` / `hookPlay` / `oneChannel`), `shared/looks.ts` (`OPEN_SKY`,
  `KANTURU_SKY`, `DESERT_SKY`, `GRADED_HAZE`, `sun`...), `shared/lights.ts` (`createFire`),
  `shared/terrain.ts` (`sit`, `pose`, `healing`): plain building blocks the map rows share.

## How it works
- A `MapLayer` is mostly data: `name` (= folder name), `worlds` it serves, `assetWorld` when the
  `World<n>` folder is not `world + 1`, `tiles` by slot, `cutoutTile`, `spawn`, sky kind
  (`outdoor`, `rain`, `snow`, `snowfall`, `underwater`, `desert`), `clearColor`, `rooms`, and the
  per-object-type tables `blendMeshes`, `effectOnly`, `emissions`.
- The map's own rows for the other controllers: `sound` (beds, one-shots, music, town tracks,
  object loops, monster cues), `lighting` (look, room looks, object lights, thunder), `weather`
  (always rains, wet ground, leaves) and `terrain` (overlays, snow bed, water, rest objects,
  object fixups, grass, a hidden ground) and `actors` (what spawns bigger: Blood Castle's `actors.ts`). Reworking a controller never touches these; changing what a map sounds
  or looks like is an edit here only. A row that differs between the entry's worlds is written
  `{ byWorld: { [world]: row } }`.
- `create(world)` binds the map's object classes into `world.terrain.MapTileObjects[type]` and adds
  entities the map owns. It runs once per warp. It is always written as
  `world => import('./create').then(m => m.createX(world))`; a static import is an import cycle.
- `reset()` drops what belonged to the map on a map change.
- `all.ts` hands `MAP_LAYERS` to the `maps` controller (`registerMaps`); `src/app/boot.tsx` imports
  it first (tests: `src/version/testSetup.ts`); the controller indexes it by world and answers the renderer,
  terrain loader, weather and sound.

A map folder:
```
<map>/index.ts    data + the exported <map>Layer
<map>/spec.ts     plain tables: blend meshes, effect-only types, emissions, lights (no scene imports)
<map>/sound.ts    MapSound: beds, music, object loops, monster voices (plain data)
<map>/lighting.ts MapLighting: look over the default, room looks, its spec's light table
<map>/create.ts   object classes bound by type, map-owned entities
<map>/*Object.ts  one file per object type with its own behaviour (Lorencia has 38)
```
Some maps have no `spec.ts` (balgasrefuge, gmarea, karutan2, raklionboss) or no `create.ts`
(doppelganger2, landoftrials).

| Folder | Worlds |
|---|---|
| lorencia, dungeon, devias, noria, losttower | 0, 1, 2, 3, 4 |
| stadium, atlans, tarkan, icarus | 6, 7, 8, 10 |
| devilsquare | 9 and 32 (art in World10) |
| bloodcastle, chaoscastle, kalima | event floors on World12, World19, World25 |
| valleyofloren, landoftrials, aida, crywolf | 30, 31, 33, 34 |
| kanturu1/2/3, gmarea | 37, 38, 39, 40 |
| balgasbarracks, balgasrefuge | 41, 42 |
| cursedtemple | 45 levels 1-6 (World47) |
| elbeland, swamp, raklion, raklionboss | 51, 56, 57, 58 |
| santatown, vulcanus, duelarena | 62, 63, 64 |
| doppelganger1/2/3/4 | 65-68 |
| empireguardian, empireguardian4 | 69-71, 72 |
| loginscene | 73, 74, 77, 78 |
| lorenmarket, karutan1, karutan2 | 79, 80, 81 |

## Depends on / used by
- uses: `@/controllers/maps` (contract, rooms), `@/controllers/terrain`, `@/controllers/render`,
  `@/controllers/fx`, `versions/shared/objects`, `versions/shared/monsters` (the Elf Soldier class)
- used by: `all.ts` (registers `MAP_LAYERS` with `src/controllers/maps`), `_template.ts` (the copy-me
  entry, moved here from the controller so it imports no content from there)

## Change it
- add a map: copy `_template.ts` to `<name>/index.ts`, add `spec.ts` and
  `create.ts` as needed, then add `<name>Layer` to `layers.ts`. Each `ENUM_WORLD` may appear in
  one entry only.
- a tile file is missing in the world folder: name a tile the folder has in that slot, so the
  `EncTerrain<n>.map` indices stay put.
- give an object type behaviour: add `<thing>Object.ts`, bind it by type in `create.ts`.
- change a map's bed, track, object loop or monster voice: its `sound.ts`. Its look, room looks
  or torches: `lighting.ts` (torch rows in `spec.ts`). Rain, wet ground, leaves: `weather` on the
  entry. Overlays, water, seats, grass: `terrain` on the entry.
- data files stay pure: import controller types only (`import type ... from '@/controllers/x'`),
  and plain values from `shared/` or `@versions/shared/objects/enum`, never a controller at run
  time - `layers.ts` loads every entry when the `maps` controller loads.
- a flare card takes the sheet the original names (`texture`: `'flare'` for `BITMAP_FLARE`,
  Flare.jpg, already a warm star; `'spark1'` for `BITMAP_SPARK + 1`) and the original's own tint,
  not a warm one; `BITMAP_LIGHT` (flare01.jpg) is the default. A size the original writes without
  `* o->Scale` is `unscaled`; an offset that stands for a bone is `bone: true`, so it grows with the
  object. A row on an animated bone sits at the middle of the bone's motion: a table row cannot
  follow the bone (an object that must, like the Karutan insect or the Cursed Temple dragon, hangs
  its cards itself).
  `flareSheets.test.ts` lists the table rows that take another sheet.

## Tests
- `mapRows.golden.test.ts`: every per-map row the sound, lighting, weather and terrain
  controllers answer for every world, as hashes; pinned before the rows moved here.
- `tileFiles.test.ts`: every tile slot of every map names a file that exists in its world folder.
- `flareSheets.test.ts`: the table flares the original draws from another sheet than `BITMAP_LIGHT`
  take it with the original's tint, size and motion: `BITMAP_FLARE` (Aida 75 turning on bone 4,
  Loren Market 30 on its three heads and 35 on bone 2), `BITMAP_SPARK + 1` (Aida 30 and 71 on their
  six bulbs, Kanturu 70 whose size breathes, Kanturu 2 8, Karutan 72's plant bulbs breathing on
  `|sin|`), `BITMAP_KANTURU_2ND_EFFECT1` (Kanturu 2 4's pair over its lamp); Karutan 66, Crywolf 41
  and Cursed Temple 62 have none (the insect hangs its `BITMAP_SHINY + 5` points itself, the beacon
  its turning pair, the dragon its eyes); `BITMAP_SHINY + 1` (Shiny02.jpg, 32 by 64: Kanturu 3 5's
  pair, Land of Trials 49's grey card); Icarus 10 streams `light0` (`BITMAP_LIGHT` SubType 0) from
  bone 3, one a tick at scale 1 on any pillar, and draws no card.
- `flareWaves.test.ts`: the table cards' waves are the original's `sinf(WorldTime * k)`, k in radians a
  millisecond: the fire vents (Karutan 113, Loren Market 57, Vulcanus 6) burn steady red, with one
  particle of the original's three fire sheets every tick, spawned at the vent; the
  `BITMAP_TRUE_FIRE` braziers (Elbeland 0, Kanturu 61, Balgas 3, the Swamp's 57 with its smoke) burn
  one tick in three, a white `trueFire` at the brazier with no spread (the Swamp's 57 and 71 SubType
  5, `trueFire5`; Kanturu 60's fire, ours, as 61), and Elbeland's blue lamp (61) one white
  `trueBlue` (`BITMAP_TRUE_BLUE`, fantaB.jpg) one tick in three on every preset; Kalima's flower glows (12, 32) grow and shrink on bone 5; the Kanturu relic
  lamps (Kanturu 2 4, Kanturu 3 5) breathe and grow with their fLumi, and Kanturu 3's two `BITMAP_SHINY + 1` turn 0.5 and 0.25
  degrees a millisecond of world time, in whole degrees (Aida 75's torch turns smoothly, `flareSheets.test.ts`); Land of Trials 49 draws two red cards on bone 3 and a grey `BITMAP_SHINY + 1`
  at a fresh angle every frame; Elbeland's lantern (63) breathes and its totem (121) breathes and grows on six
  bones; and no table wave is faster than 0.05.
- `boneRows.test.ts`: the rows the original hangs on a bone are `bone: true` (Noria's lamps, Icarus
  10, Kalima's flowers, Aida's plants and torch, the Kanturu lamps, Elbeland 63, 110 and 121, Loren
  Market 30 and 35, Karutan 72, Land of Trials 49), and Noria's swinging lanterns sit at the middle of
  their swing.
- `fireLights.test.ts`: the ground lights the original throws take its position and range on every
  preset: Devias 66's `CreateFire` 50 up at range 4, Lorencia 150 at range 3, Loren Market 30 and 35
  breathing on their bones, Kanturu 70 and the Tarkan braziers on their sine, and Tarkan 4, which has
  no model, white at range 3 on the same sine.
- `shadowCasters.test.ts`: the only map objects with a Classic shadow are Blood Castle 28 and 29 (mesh 2
  left out, folded from the ground under them) and Valley of Loren 50, 83, 84 and 85, the ones whose case calls `RenderBodyShadow`; Valley of
  Loren 77 and 84 are operate boxes the map draws (`valleyofloren/operateObject.ts`).
- `bloodcastle/lampObject.test.ts`: the throne-room lamp's flare is `BITMAP_FLARE` too;
  `bloodcastle/candelabraObject.test.ts`: the candelabra's seven flares are 0.5 on any object scale.
- `lampFlares.test.ts`, `lorencia/candleObject.test.ts`, `devias/candleObject.test.ts`: what the original
  never draws is the `lampFlares` improvement, gone on Classic: the flares of Lorencia 90 and 150, Devias
  66 and the candelabra, Elbeland 61 and Lost Tower 23 (the light under them kept), the candle wick
  fire, the Land of Trials brazier's fire (42, its ground light kept), the Kanturu deep-red
  brazier's (60, on the GM area and Doppelganger 4 too, its ground light kept) and the Stadium
  brazier's (`stadium/brazierObject.test.ts`), and the ground lights of the Devias candelabra, Lost Tower 18,
  19, 20 and 23, the fire vents (Vulcanus and Doppelganger 2 6, Loren Market 57), the Noria forge,
  the Stadium braziers and the Blood Castle candelabra (`bloodcastle/candelabraObject.test.ts`; their
  cards kept); no row shapes its ground light on Classic (no `falloff` or `floorGain`), and Lorencia
  90 and Elbeland 61 light at the object.
- `loginscene/wallTorchObject.test.ts`, `empireguardian4/spec.test.ts`: the wall torch's flare, on
  the `BITMAP_FLARE` sheet lit or not, and the fortress lights on Classic and Enhanced; a lit torch's
  warm tint gives Flare.jpg the mean colour its old tint gave flare01.jpg, worked out from the two
  sheets' pixels in `Data/Effect`.
- `empireguardian/spec.test.ts`: days 1-3 draw day 4's blue lamp (80) and bind its wall torch (37).
- `balgasbarracks/spec.test.ts`: the lava vents (2) puff a `BITMAP_SMOKE` SubType 13 (`smoke13`) one
  tick in three on both worlds; 5 makes `BITMAP_ADV_SMOKE + 1` with `ADV_SMOKE` SubType 0, then
  `BITMAP_CLOUD` SubType 6 with `ADV_SMOKE` SubType 1; the volcano's 85 smokes as 5 with its own
  SubTypes (`fi02_1` behind one more coin, `fi01_2`, then `cloud14`, `fi01_2` at twice the scale),
  both drawn by `BalgasSmokeObject` on both worlds; 58-60 make `BITMAP_WATERFALL_1` SubType 2, `_2`
  SubType 1 and `_3` SubType 3 (`waterfall1_2`, `waterfall2_1`, `waterfall3_3`); 88 drifts a dark
  `cloud10` and 89 a faint red `cloud11`, one tick in four.
- `balgasbarracks/smokeObject.test.ts`: 5 and 85 walk the original's `o->Timer`
  (GM3rdChangeUp.cpp:133-153, :187-210): over 200 000 ticks each pair comes one tick in eight, never
  on the other's tick, and either may follow either; 85's `fi02_1` one tick in sixteen; nothing out
  of view.
- `balgasbarracks/firePillarObject.test.ts`: the Refuge's 92 makes two `BITMAP_FIRE_RED` effects a
  tick on the crest of its `sinf(WorldTime * 0.0005f)` wave, each making a `fireRed` a tick for 40
  ticks at the effect's own 0.9, only in view, the made ones running out after the crest.
- `doppelganger4/spec.test.ts`: 59 puffs a `BITMAP_SMOKE` SubType 13 (`smoke13`) one tick in three where
  Kanturu's puffs SubType 21, and 82 / 83 make `BITMAP_WATERFALL_3` SubType 3 / `_2` SubType 1 where
  Kanturu makes SubType 4 / 2; every other Kanturu row stays; its light box 48 makes a `BITMAP_LIGHT`
  SubType 15 (`light15`) one tick in three.
- `placedModels.test.ts`: every type each world's `EncTerrain<n>.obj` places (effect-only ones
  aside) asks for a model `Data` has, at a folder slot under `MAX_WORLD_OBJECTS`, or asks for none
  (bound absent with `bindAbsentModels`, or a class that draws without one: the lean boxes, the
  Icarus and Chaos Castle clouds, Lost Tower 40's sprites). The original draws no body for a type
  whose file is missing (LoadData.cpp:22-49, ZzzBMD.cpp:3098-3116); unbound, ours fetched a GLB and
  logged "Could not load model". Bound absent: Tarkan 0, 3, 4, 35, 38, Valley of Loren 35, Crywolf
  79, 80, Kanturu 2 21, 22, 25, 28, 39, 40, 42, 43, 69, 84, the GM area 15, 33, 74, Santa Town 37, 40, 51,
  Doppelganger 4 34 and 175 (`MODEL_BIRD01`, Lorencia's only), the Fortress 95, 126, Loren Market 51,
  besides the earlier Swamp, Vulcanus, Duel Arena, Doppelganger 1, Raklion, Cursed Temple, Empire
  Guardian 4 and login scene rows. No body is not no object: `MoveObject` and `RenderObjectVisual`
  run for every visible record (`PlayAnimation` returns at once with no actions, ZzzBMD.cpp:747), so
  a case that makes a light, sprite or particle from `o->Position` still does. Two do: Tarkan 4
  lights the ground white on its sine (ZzzObject.cpp:4051-4062, a `spec.ts` row, which attaches to
  the absent object too) and Lost Tower 40 draws its turning `BITMAP_LIGHTNING + 1` pair
  (:2913-2920, `losttower/lightningObject.ts`). Every other absent type has no case in its world's
  `MoveObject`, `RenderObjectVisual` or GM file, or one that only touches the body it lacks (Kanturu
  2 42's UV scroll, GM_Kanturu_2nd.cpp:240-245; the Dungeon's lean box 60, ZzzObject.cpp:4617-4621).
- `doppelgangerLights.test.ts`: the four arenas' sky-blue light boxes (Doppelganger 1's 101, the
  others' 48) make a `BITMAP_LIGHT` SubType 15 (`light15`) one tick in three.
- `kanturu1/spec.test.ts`, `aida/spec.test.ts`: the falls (Kanturu and the GM area 81-83, Aida 56-58) make
  `BITMAP_WATERFALL_1` SubType 2 one tick in two, `_3` SubType 4 every tick and `_2` SubType 2 one in
  three (`waterfall1_2`, `waterfall3_4`, `waterfall2_2`); Aida 25 and 28 scroll down 0.015 a tick from
  one scroll built at load, never one a frame.
- `chaoscastle/thunder.test.ts`: pillar thunder timing, which pillar it strikes and the bolt's fall,
  whose walk is pinned roll for roll.
- `chaoscastle/clouds.test.ts`: the blue fog banks on types 6-11; 12 stays a marker.
- `chaoscastle/lighting.test.ts`: one look row on every arena, no sky, black haze from the hero, no
  underworld.
- `chaoscastle/ringObject.test.ts`: a falling ring drops by the arena's drop, in tiles, on one offset
  it keeps for the whole fall.
- `kalima/grassObject.test.ts`: `KalimaWaterPlantObject`.
- `kanturu2/gateway.test.ts`: the gateway turn sound loops from the click, and stays silent when
  the original refuses it.
- `crywolf/beaconObject.test.ts`: the beacon's two `BITMAP_FLARE`s ride `350 + aaa` in step on every
  beacon, and the second turns by the one `Ro` each beacon in view bumps a degree a frame, so n in view
  turn it n times as fast.
- `karutan1/insectObject.test.ts`: the insect's two `BITMAP_SHINY + 5` points ride bones 13 and 14
  and breathe on `|sin|`; it is never a batched prop.
- `cursedtemple/dragonObject.test.ts`: the dragon's two pink `BITMAP_SHINY + 1` eyes ride bones 22
  and 23 every frame and grow with `fLumi`, and it puffs a `BITMAP_SMOKE` (`smoke0`) from bone 20 one
  tick in five; it is never a batched prop.
- `tarkan/impactGlowObject.test.ts`: the temple glow is `BITMAP_IMPACT`, its size and colour
  breathing together.
- `stadium/brazierObject.test.ts`: the brazier's card is `Luminosity * 5` every frame, whatever the
  pillar's scale; its fire is `lampFlares`.
- `losttower/towerMachineObject.test.ts`: the machines draw `BITMAP_MAGIC + 1` (19) and
  `BITMAP_LIGHTNING + 1` (20) pairs that turn against each other.
- `losttower/lightningObject.test.ts`: 40, with no model, draws two white `BITMAP_LIGHTNING + 1` 260
  up at 2.5 on any scale, turning against each other on one luminosity roll a frame.
- `devilsquare/storm.test.ts`: the storm keeps at most two flashes alight and drops the spent ones
  in place, making no array a tick.
