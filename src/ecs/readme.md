# ecs

The entity world (miniplex) and the systems that step it every frame, in a fixed order.

## Public API
- `World` (`world.ts`): the miniplex world plus game state the systems share: `getByNetId`,
  `playerEntity` (the hero), `removeHero`, `mapIndex`, `terrain`, `pathfinder`, the input
  targets (`attackTarget`, `castRequest`, `pickupTarget`, `talkTarget`, ...) and the terrain
  readers (`getTerrainHeight`, `isWalkable`, `getTerrainFlag`, `getTerrainLayers`, ...).
- `Entity` (`world.ts`): one `Partial<{...}>` type with every component. Also `NetEntity`,
  `Item`, `DeathMotion`, `TerrainLayers`, `ISystemFactory`. `world.ts` also merges the bus events
  that carry an entity (`objectDamaged`, `objectEffect`) into `EventMap` (`core/eventBus/events.ts`).
- `createWorld(scene)` (`createWorld.ts`): builds the world and returns `updateSystems(dt)`.
  Called once from `app/boot.tsx`.
- `Ecs.world` (`current.ts`): the live world, null until boot sets it. Observable; imports only
  mobx, so controllers, content and windows read it without reaching the app.
- A few systems export helpers other code reads (`isHeroUnderRoof`, `mayBeCeilingPiece` in `roofDetection.ts`,
  `isTeleporting` / `teleportMountAlpha` in `teleportSystem.ts`).

## How it works
- A system is a factory `(world) => { update?(dt) }` in `systems/`. `createWorld.ts` lists every
  factory in `factories`; the list order is the run order, and the comments next to entries say
  why one must run before another (input before attack, animation before pets, movement before the
  screen projection, `RenderSystem` second to last).
- `updateSystems(dt)` runs them in that order. With the perf overlay open (Shift+Ctrl+Alt+P) it
  also times each system (`recordSystemTime`).
- Controllers with per-frame work are stepped from their system: `EffectSystem` ->
  `effects.update`, `AttackSystem` -> `combat.update`, `WeatherSystem` -> `weather.update`.
- `World.byNetId` indexes every entity with `netId` + `transform`, kept by the query's add / remove
  hooks. The newest add wins; removing one entity of a shared id falls back to the survivor.
- The terrain readers on `World` are stubs until `loadMapIntoScene` binds them to the loaded map.
- `world.ts` declines hot updates: a second `World` class would fork the ECS.

## Depends on / used by
- uses: most controllers, the modules' state through their doors (`Hero`, `Session`, `Bag`,
  `HeroSkills`, `Merchant`, ...), `controllers/interface/uiState.ts`, `modules/scope/net.ts` (`spawnPlayer`), `src/core`.
- used by: `app/boot.tsx` (`createWorld`); `Entity` / `World` types everywhere an entity is
  touched (controllers, modules, `versions/shared` maps, skills, npcs, monsters, ui).

## Change it
- add a system: write `systems/<name>System.ts` exporting `const <Name>System: ISystemFactory`,
  import it in `createWorld.ts` and put it in `factories` where its inputs are ready. Say why in
  a one-line comment when the position matters.
- add a component: add an optional field to `Entity` in `world.ts`; query it with
  `world.with('field')`.
- per-frame code allocates nothing and walks no scene graph
  ([../../docs/guidelines/performance.md](../../docs/guidelines/performance.md)).

## Tests
- `systems/appearanceSystem.test.ts`: the class head bare-headed and under each open helm, off under every other
  helm and in the Chaos Castle skin, and back on when the helm allows it (SetCharacterScale, ZzzCharacter.cpp:12114-12128).
- `systems/animationSystem.test.ts`: the hero and a player with no reported speeds take the hero's
  attack and magic speed; another player with speeds from the scope packet keeps its own.
- `systems/deathSystem.test.ts`: Chaos Castle bomb sounds on odd ticks 15..25, the pit scream,
  no sound off the Blood Castle bridge, the skill knock and Nova motes, the Dead counter in whole
  ticks at 25 fps, the Die clip at Dead 15 (less the hero's blow wait), the fade from the kill.
- `systems/mapDoorSystem.test.ts`: Devias door creaks (repeat while the hero stays, stop out of
  range, one per wave, retry when a creak did not start).
- `systems/restObjectRay.test.ts`: the rest-object picking ray matches `scene.pick`.
- `systems/ceilingHideSystem.test.ts`: the roof over the hero fades on Enhanced, stays drawn but
  detected on Classic, and comes back when `roofFade` is turned off.
- `systems/attackSystem.test.ts`: a swing sends the walk stop (`LetHeroStop`) before its hit.
- `systems/skillCastSystem.test.ts`: Dark Side's follow-up blows draw on each target the server
  named and send nothing; with nothing selected it is cast where the hero stands, target key 0.
  A bow skill with no arrows in hand reloads the next quiver instead of shooting, and is dropped
  when the bag has none (`CheckArrow`). Heal and the other `playerOrSelf` casts are cancelled with a
  monster selected and land on the caster with nothing selected.

## Notes
Long file comments from `systems/`, condensed.

### ambientParticleSystem.ts
Picks which weather / leaf / dust recipes (`controllers/weather/ambientWeather.ts`) live for the
current map, weather and room, and drags hero-relative ones with the hero (`MoveLeaves`). Lorencia
leaves (`CreateLorenciaLeaf`), Noria petals and Atlans drift (`CreateAtlanseLeaf` numbers), Devias
snow (`CreateDeviasSnow`), Blood Castle embers (`MoveObjectOnEffect`), rain on outdoor maps while
`WeatherStatusUpdate` says 1, dust inside tavern rooms (each map's `weather.leaves` / `weather.dust`). Sky weather is clipped by room openings
(`weather/roomClip.ts`). Nothing switches off at once: the emit rate ramps to zero and the emitter
is disposed after its last particle dies, except on a map change. A recipe with a `schedule` reads
gusts from `ambientSchedule.ts`, rolled from `serverNow()` so every client sees the same weather.

### animationSystem.ts
Clip speeds come from `controllers/anim`. The attack and magic speeds that scale them are another
player's own when the extended scope packet sent them (its `speeds` component), else the hero's: the
original's `SetAttackSpeed` writes `CharacterAttribute` into the one `MODEL_PLAYER` action table
(ZzzCharacter.cpp:812-1028), so there everyone swings at the hero's rate (and here on Classic Fidelity:
`isOn('otherPlayersOwnSpeed')`). That deviation is described
in `controllers/anim/readme.md`.

### ceilingHideSystem.ts, roofDetection.ts
`roofDetection.ts` finds the roof of the building the hero is in (Lorencia, Devias): a mesh is a
ceiling piece when its world AABB is a thin slab above head height; the piece over the hero seeds a
flood fill through touching pieces at the same height. While a room is the active area, every slab
inside the room seeds the set. It runs on every Fidelity preset: `isHeroUnderRoof` keeps the
weather and the indoor ambience out. `ceilingHideSystem.ts` steps it each frame and fades those
meshes so the fixed camera still sees inside (the Lorencia pub uses a hack in `loadMapIntoScene`);
the fade is the `roofFade` improvement, not in the original.

### deathSystem.ts
1. Kill packet: Dead = 1, movement stops. `dying.time` counts 25 Hz ticks (`dt * 25` a frame, like
   `c->Dead += FPS_ANIMATION_FACTOR`), so at 25 fps every tick lands on a whole number. The Die
   clip starts at `c->Dead >= 15`, 14 ticks after the kill (ZzzCharacter.cpp:4074-4080), less `held`
   for a hero's blow whose request waited past the swing's start; a Blood Castle bridge fall dies at
   once (`m_bActionStart`).
2. Die clip plays once and holds; two blood splats under the head. Death Cow, Stone Golem and Ice
   Monster shatter instead (`controllers/fx/deathVisuals.ts`).
3. Rot += 0.02 a tick from the kill; from Rot >= 1 (2 s) alpha fades over 2 s while the body
   sinks 0.4 cm a tick.
4. Render-only body motion: Nova / Combo kills slide toward the killer for 15 ticks (Nova also
   throws blue motes); Blood Castle bridge and Chaos Castle pit deaths fall off
   (`FallingCharacter`), Chaos Castle corpses pop `CreateBomb`s on odd ticks 15-25.
5. Alpha < 0.01: the entity is removed, except the hero, who waits for the respawn packet.

### dropMotionSystem.ts
A fresh drop starts 180 cm up with `Gravity = 20` cm/tick, `Gravity -= 6` a tick, tumbling until
its rest height (`controllers/actors/itemAngle.ts` sets the lying pose). The fall is a render-only
`posOffset.y`, so pathing, picking and the name tag never see it. On Icarus (and Kanturu's Maya
scene) every drop bobs: `10 * sin((i * 1237 + WorldTime) * 0.002)`.

### emojiBubbleSystem.ts
The side anchor sits on the shoulder facing the camera and swaps when the character turns. The side
axis is the rendered node's local +X, `(cos yaw, 0, sin yaw)` given `RenderSystem`'s `2pi - yaw`
rotation; the sign that puts the anchor on the camera's side picks the shoulder, so the same code
works for players, NPCs and monsters.

### footprintSystem.ts
Wet prints come from the boot, so they keep appearing after a puddle and indoors. Snow prints need
settled cover under the foot and stop at a doorway. Every walker leaves prints, within budget: the
hero has its own ring (`PrintLane`), only walkers within `PRINT_RANGE` of the hero and at most
`MAX_WALKERS` are laid, and the long trail is the ploughed channel in `weather/snowTrail.ts`, not
decals. What a foot looks like (boots, pads, pricks, a groove, nothing for flyers) is the walker's
recipe in `weather/recipes.ts`; this file decides when.

Gaits (`GAIT`) are multipliers on the recipe, keyed on `c->Run` (`playerAnimation.run`). A walk in
deep snow ploughs one trench with deeper pockets (wide drag, short stride); a run leaves separate
deep prints with clean snow between and throws more snow. Only players have `run`, so everything
else walks. Stride is also how far the newest print can lag behind a walker, and it must be longer
than a print so feet read as left, right, left rather than pairs; `side` must match where the
creature's feet are (a person's stance is narrow).

### terrainGrassSystem.ts
Decides which grass blocks exist and who stands in them; the blades belong to
`terrain/terrainGrass.ts`. At most one block is built a frame, so a warp streams grass in. Only
creatures press grass (server objects, the hero, offline NPCs, pets), as four incremental queries:
with every positioned entity, static props took the press budget and the hero left no path.

### headTrackingSystem.ts
The hero's head yaw follows the cursor (clamped to 60 degrees), pitch follows its height, also while
leaning or sitting; off while auto-attacking. Other players glance around at random (about every 32
ticks). Both are smoothed with `TurnAngle2(..., FarAngle * 0.2)` a tick. After about 40 idle ticks
the hero's body turns to the cursor and AT_STAND1 is sent. The cursor yaw is solved from the camera
projection instead of the original's `CreateAngle(...) + 315`, so it is exact for any camera. The
bone override runs in `onAfterAnimationsObservable`, after Babylon writes the head bone.

### itemGlowSystem.ts
Stamps `metadata.itemTier` on item meshes (`PlayerObject.loadPartAsync` does the first stamp) and
re-stamps when the item-effects option or level cap changes; `item_fx/itemMaterial.ts` and
`render/sceneLook.ts` read it. Improved look only: +9..+15 gear and drops get a lamp
(`controllers/lighting/items.ts`), an aura and a crackle. Both looks: excellent items throw the
`CreateShiny` glints (`controllers/fx/itemSparkle.ts`). This system picks which entity is lit and
moves the lamp with the wearer.

### petSystem.ts
Pets that live in the world, not on the wearer's skeleton (GOBoid.cpp:66-680):
- Guardian Angel: a boid that re-rolls its heading about every 32 ticks, turns back past
  `FlyRange` and stays 100-200 units above the owner. It keeps flying in town (GOBoid.cpp:604-621).
- Uniria / Dinorant: pinned to the rider. A Dinorant sits 30 units lower and lifts the rider 30.
  Mounts fade in a safe zone (GOBoid.cpp:182, :323, :497). None is created in Chaos Castle.
- Dark Raven (`CSPetDarkSpirit`, CSPetSystem.cpp:291-610): circles about 250 units up (350 over a
  Dark Horse) and lands by the shoulder in a safe zone (an approximation of bone 37).
- Followers (`PetObject`, w_BasePet.cpp): Demon, Spirit of Guardian, Rudolph, Panda, Pet Unicorn,
  Pet Skeleton. Four of them fetch zen near the owner (`errand`).
- Dark Horse / Fenrir: pinned like the horns; Fenrir mirrors the rider's `PLAYER_FENRIR_*` clips
  (GOBoid.cpp:200-266) with the glow and lightning of ZzzObject.cpp:855-895.
The Imp is not here: it is linked to the owner's bone 34 (`PlayerObject.Pet`).

### terrainMaskSystem.ts
The map data has no interior flag, so a roof is found by shape: the `roofDetection.ts` slab test
run on every loaded map object. It scans every 0.5 s because objects stream in with the player;
painting is additive and each entity is measured once. Only entities with `modelId` (set by
`loadMapIntoScene.createObjects`) are measured: a falling drop or a living body would otherwise
paint a permanent hole in the snow.
