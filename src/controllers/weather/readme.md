# weather

Rain, snow and what they leave on the ground: the rain ramp, settled snow, wet stone and puddles,
footprints, snow melted and grass burnt by fire, and the ambient particle
recipes. One `weather` facade steps every effect (see [docs/controllers.md](../../../docs/controllers.md)).

## Public API
- `WeatherStatus.weather` (`status.ts`): `{ weather, variation }` of the current map
  (`WeatherStatusUpdate` 0x0F); the world module writes it, `rainState.ts` reads it.
- `weather` (`index.ts`, a `Controller`): `update(map, dt)` once a frame, `reset()` on map change,
  `register(layer)` (returns the unregister), `layersFor(map)`.
  - readers: `rain`, `snowCover`, `wetness`, `puddles`, `inPuddles()`, `snowCapAt(x, z)`,
    `puddleUnderfoot(world, x, z)`, `snowUnderfoot(world, x, z)`, `snowSinkDepth(world, map, x, y, z)`,
    `grassBurnAt(x, z)`.
  - writers: `meltSnow(x, z, radius, strength)`, `burnGrass(scene, x, z, radius, strength)`,
    `snowSpray(scene, x, y, z, strength)`.
- `WeatherLayer` (`layer.ts`): one effect's `name`, optional `maps`, `update(map, dt)`, `reset()`.
- `MapWeather` (`mapWeather.ts`, exported from `index.ts`): the type of a map's `weather` field
  (`alwaysRain`, `wetGround`, `leaves`, `dust`: `MapDustRoom`). `ambientLeavesFor(world)` and
  `ambientDustFor(world)` (`ambientWeather.ts`, also on `index.ts`): the leaf recipe a map's
  `leaves` names and its dust rooms with their recipes; `allDustRooms()` lists every map's.
- Imported straight from the effect files:
  - `ambientWeather.ts`: the `AmbientRecipe`s (`RAIN`, `DEVIAS_SNOW`, `LORENCIA_LEAVES`, ...),
    `SNOW_MAPS`, `SNOWFALL_MAPS`, `UNDERWATER_MAPS` (live sets over the map flags), `GROUND_WIND`. `ambientSchedule.ts`: `ambientStrengthAt`.
  - `roomClip.ts`: `clipToRoom`, `roomClipAvailable`, `setRoomWeatherClip`. `rainState.ts`:
    `WEATHER_RAIN`, `rainStrength`, `rainTarget`, `alwaysRains`. `wetness.ts`: `wetness`, `puddleCover`.
  - `snowCover.ts`: `SNOW_GROUND_MAPS`, `snowCover`. `snowCaps.ts`: `snowCapAt`, `snowCapCover`,
    `SNOW_CAP_*`. `snowSink.ts`: `onSnowGround`. `snowMelt.ts`: `MELT_*`, `snowMeltUniform`,
    `snowMeltCount`.
  - `grassBurn.ts`: `grassBurnTexture`, `grassBurnActive`, `setGrassProbe`, `setGroundProbe`.
  - `footprints.ts`: `addFootprint`, `warmFootprints`, `updateFootprints`, `resetFootprints`,
    `bootStrength`, `FULL_STEPS`, `FADE_STEPS`. `recipes.ts`: `trackFor`.

## How it works
- `WEATHER_LAYERS` (`layers.ts`) is the only list of effects, in update order: a layer that reads
  another comes after it (wetness after rain). `weather.update` and `weather.reset` walk it. Each
  effect file keeps its own state and exports plain readers; the facade only forwards.
- Some layers are reset-only: footprints and spray are driven by `ecs/systems/footprintSystem.ts`,
  which needs the scene and the hero. `snowCaps`, `snowSink` and `puddleUnderfoot` have no state.
- Rain follows the packet: `RainTarget` / `RainCurrent` (ZzzEffectFireLeave.cpp:27-28, 422-452,
  `ReceiveWeather` WSclient.cpp:6716). Snow is a map property (`MapLayer.snow` / `snowfall`), never
  the packet. Settled snow, wet ground, melts and burns are our own; the original has no
  ground contact beyond fading leaves (`MoveEtcLeaf`).
- Ground effects reach the screen through `terrain/terrainOverlay.ts` (coverage readers, the
  melt uniforms) and `terrain/terrainGrass.ts` (burn texture). The overlay's
  `SNOW_COVER.bed` table is read back on the CPU here, so the sink and the prints match what is drawn.
- `snowMelt.ts` and `grassBurn.ts` must stay leaves (no imports from this folder):
  `terrainOverlay.ts` imports them and `snowCover.ts` imports `terrainOverlay.ts`, so a module-scope
  read inside that cycle crashes the client on load.
- Per-map rows live with the map (`MapLayer.weather` and the climate flags in
  `versions/shared/maps/<map>/index.ts`). The effects read them through `maps.layerFor`,
  `maps.rowFor` and `maps.worldSet` at run time; nothing here reads a map at module load, so the
  layers' `maps` sets are live views.
- Gusts and squalls are rolled off `serverNow()`, so all clients agree; burns, melts and
  snow depth are local to each client.
- The module declines hot updates, so the singleton is never duplicated. `app/boot.tsx` puts it
  on `window.__weather` for the verification scripts.

## Depends on / used by
- uses: `terrain` (`terrainMask.isTileOpen`, `terrainOverlay` bed table and `overlayAmountAt`),
  `maps` (climate flags), `fx` (`effects.spawn`, `FIRE_SPARKS`, ambient types), `net/serverTime`,
  `lighting` (`keyRig`, `lightModel`, `profiles` types), `anim/playSpeed`, `render/babylon`, `core`.
  Reads `settings`.
- used by: `controllers.ts`, `app/lifecycle.ts`, `app/boot.tsx`, `modules/world/net.ts`,
  `ecs/systems` (`weatherSystem`, `footprintSystem`, `ambientParticleSystem`, `renderSystem`),
  `skills/visuals.ts` (`scorch`, `burn` steps), `terrain` (overlay, material, grass,
  `mapTileObject`), `item_fx/itemMaterial.ts`, `render/propBatches.ts`, `fx/ambientParticles.ts`.

## Change it
- add an effect: copy `_template.ts` to `<name>.ts`. Keep its three parts in order: (1) tuning
  constants with real units (seconds, tiles, 0..1) and why; (2) module state and plain readers
  (`fooStrength()`); (3) the exported `WeatherLayer`. Add it to `WEATHER_LAYERS` in `layers.ts`
  after any layer it reads. If it shows on the ground, add a `TerrainOverlay` recipe in
  `terrain/terrainOverlay.ts` whose `coverage` reads your reader; if it falls from the sky, add an
  `AmbientRecipe` here and spawn it from `ecs/systems/ambientParticleSystem.ts`; for a sound, add a
  bed row in the map's `sound.ts`. Add a facade reader in `index.ts` if others need it.
- remove an effect: drop its line from `layers.ts` and its file, then fix the importers tsc lists.
- rain timing: `RAMP_UP_SECONDS` / `RAMP_DOWN_SECONDS`. A map that always rains, gets wet ground
  or carries leaves: `weather` on its entry (`alwaysRain`, `wetGround`, `leaves`). Snow, snowfall
  and underwater maps: the map's `MapLayer` flags in `versions/shared/maps/<map>/`.
- what a creature leaves in snow: a row in `MODEL_TRACKS` (`recipes.ts`).
- the print look: dial it in the console (`muFootprints.set({...})`), then copy the numbers into
  `FOOTPRINT_TUNING`.

## Tests
- `versions/shared/maps/mapRows.golden.test.ts`: which worlds always rain, get wet, snow, fall,
  settle and sit under water, pinned across the move into the map folders.
- `mapWeather.test.ts`: `ambientLeavesFor` and `ambientDustFor` per map, `allDustRooms` order.
- `footprints.test.ts`: the `?printFast` shader early-outs (dead slots parked, stencil rule, the
  old shader with `?printFast=0`).
- `grassBurn.test.ts`: the throttled stamp leaves the same scar as the every-frame stamp; the decay
  clock starts on the first charred texel.
- `snowMelt.test.ts`: the melt uniform layout, packing of live patches, and the same melt as the
  shader loop packed or not.

## Notes
- `ambientSchedule.ts`: time is cut into `period` slots; each slot rolls once (`chance`, `duration`,
  start, `strength`) and the episode stays inside its slot, so a lookup hashes only the current
  slot: no state, right the moment a client joins. `proxy/weather.ts` uses the same hash and roll.
- `ambientWeather.ts`: the original ran up to 80 `Leaves[]` (200 in events) at 25 ticks/s.
  Lorencia leaves (`CreateLorenciaLeaf`): spawn x +-800, y -500..+899, z +50..+349, velocity x
  -6.4..-12.7 u/tick, random walk +-0.8. Atlans and Noria (`CreateAtlanseLeaf`) copy those numbers
  on their own `leaf01` (MapManager.cpp:1474-1476); Atlans draws additive and its drift is slowed
  to 0.35-0.9 tiles/s, since water has no gales; its bubbles are ours, on top of the 845 vents.
  Devias snow (`CreateDeviasSnow`): z +200..+399, 8..23 u/tick tilted -30 deg, 1 in 10 a big
  `leaf02` flake. Rain (`CreateHeavenRain` / `CreateDevilSquareRain`): 20..43 u/tick tilted
  -30..-50 deg, a 1x20 plane, here a stretched billboard. Three knobs stop popping: `fade` (per
  particle), `ramp` (emit-rate slew per system) and `growth` (drop size, length and speed follow
  intensity). Rain lives long enough to fall below the ground, which hides it; splash rings live
  in the terrain shader.
- `footprints.ts`: not a terrain overlay (one texel per tile is a whole stride). Prints are thin
  instances of one quad, one draw call per ring pool: the hero's (64, about 16 tiles) and the
  crowd's (128, bounded by `MAX_WALKERS`). The sole is a baked normal map rotated by the instance
  axes, so every print is lit by the same sun, plus a parallax march by depth. `ALPHA_MULTIPLY`
  (`DST_COLOR, ZERO`) only darkens, which is all sunlit snow can show. `FOOTPRINT_TUNING` sizes
  are the print outline; `muFootprints.get/set/reset` rebuild soles and materials. Atlas rows bake
  per shape on first use (`ensureShape`).
- `grassBurn.ts`: 4 texels a tile (1024x1024, 1 MB), stamped as an annulus per front with three
  lobe harmonics, uploaded over a dirty rectangle, regrowing over `REGROW_SECONDS` (300). Vigour
  falls with radius (`VIGOUR_SPAN`) and with no fuel (`STARVE_RATE`). The texture is created with
  data and `TEXTURETYPE_UNSIGNED_INT`: the default float type silently drops the bytes. Local per
  client: the protocol has no impact timestamp. `?burnThrottle=0` stamps every frame.
- `rainState.ts`: `ReceiveWeather` kind is `Value >> 4` (0 clear, 1 rain); `RainTarget = (Value &
  15) * 6` lands in 0..90 and `Rainly = RainCurrent * MAX_LEAVES / 100` (`MAX_LEAVES = 200`,
  _define.h:443). The original chases one unit per 25 Hz frame (~4 s); here 26 s up, 45 s down.
  Three stages smooth the sky: the proxy's smoothstep between slots (minutes; skipped under
  `WEATHER_FORCE`), this ramp, and the emitter `ramp` (2.5 s for rain). Icarus, Devil Square and
  Chaos Castle always rain (`MoveLeaves`, ZzzEffectFireLeave.cpp:422-436). After a map change the
  next update takes the target whole.
- `recipes.ts`: six drawn shapes (one atlas row and a `shapeDepth` case each); recipes share
  shapes. Keyed by monster model type (`monsterModelTypeOf`, the key `deathVisuals.ts` uses), so
  golden and event variants inherit. `boot` is the tuned baseline and the default. `none` and
  `slide` need proof: Devias' Worm is a quadruped, and the Iron Wheel walks (`SAND_SMOKE_MODELS`).
- `roomClip.ts`: a particle is drawn only if the segment from the camera crosses the room's wall
  box and the particle is outside the room volume. Off (`roomClipCam.w = 0`) outdoors and when the
  mask is not drawn (Classic). The test is injected after `void main {` into Babylon's own
  `particlesPixelShader` / `gpuRenderParticlesPixelShader`; on a compile error the system falls
  back to the stock effect and `roomClipAvailable()` turns false (no weather under a roof).
- `snowCover.ts`: `SNOW_GROUND_MAPS` is `SNOWFALL_MAPS` that are outdoor. Builds over 90 s of full
  squall, melts over 240 s down to `BASE_COVER` (0.85, so Devias stays white). Arriving on a map
  seeds from the current squall.
- `snowMelt.ts`: patches are few and short-lived, so a uniform array (like the torch pool) instead
  of a texture: the terrain sampler list is brittle. Up to 8 spots (Inferno's eight bombs); a hit
  inside a patch widens it; slots are reused by remaining `life`. Which maps melt is
  `SNOW_COVER.melt` in the overlay. `snowMeltAt` repeats the shader falloff for `snowSink`.
- `snowSink.ts`: lowers the rendered position only (`renderSystem`), characters only. Four checks:
  standing on terrain (`onSnowGround`, within `ON_OBJECT` of the ground), open sky (`isTileOpen`),
  the tile drawn as snow (`SNOW_COVER.bed`, bilinear over four tiles, minus melt), and cover above
  `SINK_MIN`. The original's footstep rule (`tile !== 3 && tile < 10`) put prints on paving.
- `snowSpray.ts`: a burst shape (nothing, then a handful in one frame), so `manualEmitCount`
  instead of a rate. Mostly visible against the hero's own silhouette.
- `wetness.ts`: wetness heads for `rain * SOAK_GAIN`, so a drizzle never soaks; puddles build only
  above `PUDDLE_THRESHOLD` while it rains and never exceed wetness. `inPuddles` is one global test
  so the CPU never mirrors the shader noise.
