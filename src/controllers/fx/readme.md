# fx

The effects controller: everything a skill, a packet, a buff or a monster draws in the world for a
while (bolts, ribbons, cards, decals, auras, camera shake) behind one `effects` facade, plus the
shared pools, textures and particle recipes other folders reuse.

## Public API
- `effects` (`index.ts`): `spawn(name, scene, at, opts)` starts one effect of entry `name` at `at`
  (tiles) and returns an `EffectHandle` (`alive`, `stop()`); `opts` is typed from the entry.
  `update(map, dt)` and `reset()` are for the game loop. `register(layer)` and `layersFor(map)`
  exist but nothing calls them. Also re-exports `EffectHandle`, `EffectLayer`, `DEAD_HANDLE`,
  `delay`, `fxNow`.
- `core.ts`: the effects clock (`delay(seconds, fn)`, `fxNow()`), units (`TICK` = 1/25 s, `CM`),
  `RGB`, `PointSource` (`followEntity`, `fixedPoint`, `pointSource`), entity helpers (`entityPos`,
  `entityYaw`, `bonePos`, `boneLocalPos`, `entityGone`, `inWindow`), `ParticleRecipe`, light gains
  (`lightCardGain`, `darkCardGain`, `spriteLevel`), `EFFECT_RENDERING_GROUP`, `keepDepthForEffects`.
- `recipes.ts`: `TEX` (Data/Effect sheets), `MODEL` (Data/Skill models), `RGBS`, particle recipes
  several owners share (`SPARKS`, `FIRE_PUFF`, `SMOKE`, ...), `EXPLOSION_CELLS`,
  `FOOT_THUNDER_FRAMES`. A recipe only one skill uses lives in that skill's file.
- The door (`index.ts`) also exports the `ParticleRecipe` and `RGB` types.
- Entry option types skill files import: `ModelOptions`, `SpriteOptions`, `RingOptions`,
  `ParticlesOptions`, `ProjectileOptions`, `AuraOptions`, `JointOptions`, `CardOptions`, ... and
  handles (`ModelHandle`, `StampsHandle`, `SummonBody`, `TailStrip`). `spawnModel` (`model.ts`) and
  `spawnLinkedModel` (`linkedModel.ts`) spawn without the facade and hand back a richer handle.
- Modules the ECS systems and other controllers call directly:
  - `effectParticles.ts`: the map-object sprite pool (`Emission`, `ParticleEmitter`,
    `BonedParticleEmitter`, `HeldSprites`, `spawnParticle`, `emissionsFor`).
  - `moveTargetEffect.ts`: `loadEffectTexture` (the shared effect texture cache), `TerrainDecal`,
    `MoveTargetEffect` (the click-to-move marker).
  - `ambientParticles.ts` `createAmbientSystem`, `boids.ts` `boidsFor` / `boidFactoryFor`,
    `bursts.ts` `playBurst`, `fireworks.ts` `spawnFireworks`, `impactVisuals.ts` `spawnHitImpact`,
    `bloodDecals.ts` `BloodDecals`, `deathVisuals.ts` `shatterDeathFor` / `skeletonShatter` /
    `spawnBomb` / `spawnCrystalShards`, `itemAura.ts` `createItemAura`, `itemCrackle.ts`
    `createItemCrackle`, `monsterGlow.ts` `monsterGlowFor` / `glowMonster`, `monsterVisuals.ts`
    `monsterVisualFor` / `visualMonster`, `ping.ts` `pingLiveFor` / `TRAIL_ANCHOR`.

## How it works
- `layers.ts` holds `EFFECT_LAYERS`, the only list of entries. Each entry is one file exporting an
  `EffectLayer` (`layer.ts`): `name`, optional `update(map, dt)` and `reset()`, and `spawn`.
  `EffectName` and `EffectOptions<N>` are derived from that tuple, so `spawn` is type checked.
- `effects.update` runs once a frame from `ecs/systems/effectSystem.ts`: it steps the clock first
  (`stepClock`, so a `delay` that comes due spawns this frame), then every entry in list order.
  Order matters: `projectile`, `debris` and `feathers` move points that `model` reads; `aura`
  drives ribbon heads `joint` reads; `monsterGlow` is last so its cards ride this frame's bones.
- `effects.reset` runs on map change from `app/lifecycle.ts`: `clearTimers`, each entry's
  `reset`, then `disposePools` (materials, cards, particle systems, the effect glow layer).
- An entry keeps its live effects in a `LiveList` (`core.ts`). A throwing update or release is
  logged and dropped, never rethrown into the render loop.
- Shared pools (`core.ts`): additive materials cached per (texture, colour, blend), billboard
  cards from a free list, one `ParticleSystem` per recipe so a burst is a counter bump.
- Units follow the original: lifetimes in 25 Hz ticks (`TICK`), distances in cm / 100 (`CM`).
  Entries cite the `CreateEffect` / `CreateJoint` / `CreateParticle` code they port
  (ZzzEffect.cpp, ZzzEffectJoint.cpp, ZzzEffectParticle.cpp).

## Depends on / used by
- uses: `render`, `assets`, `lighting`, `sound`, `terrain`, `weather`, `maps`, `item_fx`, `anim`,
  `net/protocols/pingProtocol`, `core`, `ecs/world` (types), `@versions/shared/objects/enum`. Old
  exceptions (`tools/checks/baselines/deps.json`): `app/store.ts` (15 files), `modules/options`.
- used by: skill files (`versions/shared/skills/`) and `controllers/skills/visuals.ts`; map,
  monster, npc and item content; most ECS systems; `actors`, `weather`, `lighting`, `net`,
  `item_fx`, `maps`, `terrain`; `modules/events`, `modules/combat`; `app/logic.ts`,
  `app/lifecycle.ts`.

## Change it
- add an effect entry: copy `_template.ts` to `<name>.ts`, set `name: '<name>'` and type it
  `EffectLayer<Options, '<name>'>`, then add it to `EFFECT_LAYERS` in `layers.ts` at the place
  its update order needs. `effects.spawn('<name>', ...)` is then typed.
- add a shared texture, model, colour or particle recipe: `recipes.ts` (a recipe for one skill
  goes in that skill's file).
- change how cards, materials or particle pools work for every entry: `core.ts`.
- remove an entry: delete its line in `layers.ts` and its file; tsc lists the callers.
- change one skill's look: its file in `versions/shared/skills/`, not here.

## Tests
- `effectParticles.test.ts`: `KIND_REACH` covers every particle kind, and the view gate of
  `ParticleEmitter` / `BonedParticleEmitter` (spawns only when a sprite could reach the frustum).
- `glow.test.ts`: the effect halo's render list draws only the included meshes and follows
  resizes and map changes.
- `greasedLineRelease.test.ts`: releasing simple and textured lines never throws and keeps the
  shared empty-colours texture alive.
- `softEdge.test.ts`: `fadeSheetEdges` / `fadeSheetSides` fade sheet borders and only touch alpha.
- The skill golden tests (`versions/shared/skills/*.golden.test.ts`) drive `effects.spawn` and
  `effects.update` for every skill.

## Notes

### _template.ts
Pools come from `core.ts`: `additiveMaterial` + `acquireCard` for a handful of billboards,
`particleSystemFor` / `emitBurst` / `Emitter` for many. Each tuning constant says what it is in
real units and why. Module state lives in the entry file, never in the facade.

### ambientParticles.ts
High-count, long-lived emitters (rain, snow, leaves, dust) that the CPU sprite pool is wrong for.
Each recipe is a `GPUParticleSystem` when the engine supports it, else a smaller `ParticleSystem`.
A `NoiseProceduralTexture` stands in for the per-tick random walk
(`Velocity += RangeFloat(-8, 7) * 0.1`) on both paths.

### aura.ts
Parts follow the wearer by `follow` (feet) and `bone` (MU bone index), step at 25 Hz where a rate
is per tick, ramp in and out over `RAMP_SECONDS`, and end together on `stop()` or `until`.
Examples: the five MODEL_SPEARSKILL ribbons of Greater Defense, Swell Life's shoulder motes.
Spawned from `controllers/skills/visuals.ts` (`BUFF_VISUALS`, keyed by `eBuffState`).

### bandNotes.ts
A note is a solid alpha-tested glyph in the world's rendering group, so it writes depth and gets
its own ink line under the Anime style (`render/scenes/inkOutline.ts`). The glyph is drawn once per
scene into a dynamic texture from shapes, not a font. Notes fan forward, rise, grow, then fade with
a soft wake. Driven by `ecs/systems/bandSystem.ts`, one spawn per hit.

### boids.ts
`GOBoid.cpp` has two halves: `Mounts[]` (pets, Fenrir, the Dark Lord's horse) lives in
`modules/pets/pets.ts` and `ecs/systems/petSystem.ts`; `Boids[]` (birds, bats, butterflies, crows,
fish) is here; each map names its species (`fx: { boids }` on the entry, `MapFx`). Each boid plays its own call sound (GOBoid.cpp:1481-1501). The ground crawlers
(GOBoid.cpp:1690-1745) are not ported yet. `MAX_BOIDS` is 13, not the original array size of 40.

### cards.ts
Per-tick rules: velocity decaying by a factor, scale growing by a step or factor, light that decays
or follows `LifeTime`, roll, terrain bounce. Motion is integrated in fractional ticks so it does not
step on screen. Colour ramps pick among a few cached materials. `sprite.ts` covers simple flashes.

### core.ts
Additive materials draw MU's `EnableAlphaBlend` as `(SRC_ALPHA, ONE)`, so `visibility` is the fade
(`ADDITIVE_ALPHA_MODE`). Cards are `CreatePlane` meshes from a free list. Particle bursts use one
cached `ParticleSystem` per recipe. `disposePools()` + `clearTimers()` are the facade's reset.

### deathVisuals.ts
`deathSystem.ts` asks `shatterDeathFor(monsterModelType)` when the Die clip would start; a row means
the body vanishes at once (`o->Live = false`) and pieces fly instead of the corpse sinking. The
body file names its shatter (`shatter` in `versions/shared/monster_models/<body>.ts`), found through
`monsterModelTypeOf` (`actors/monsterModelTable.ts`). `skeletonShatter` is
also used by `actors/transformedBody.ts` and `versions/shared/monsters/skeleton_warrior.ts`.

### debris.ts
Init: random yaw, horizontal speed (64..319) x 0.1 cm/tick, rise 8..23 cm/tick, scale 0.8..1.1,
life 32..47 ticks. Move: drag x0.9 a tick, gravity 3 cm/tick², bounce at half speed (costs 4
ticks), tumble `Scale x 32°` a tick, a puff 1 tick in 10. Each piece is a `spawnModel` driven from
here, so `debris` comes before `model` in the list. Spawned from `deathVisuals.ts` and skill files.

### feathers.ts
Jitter up to 40 cm per axis, random tumble 0..5° a tick, `Alpha` 0.6..0.8. The original drops these
from dark wings and Desair, never an NPC; the archangel release is a client addition with a slower
fall and a longer life. Each feather is a `spawnModel`, so `feathers` comes before `model`.
Spawned from `versions/shared/monsters/_archangels/model.ts`.

### glow.ts
The item halo (`render/scenes/sceneLook.ts`) has no render list; effect art is excluded from it.
This layer draws only meshes added with `addEffectGlow` (cards in `core.ts`, joints, models, paths,
pillars, tails, ticked strips, summons, homing, linked models) with their own material. Strength
follows the Glow slider up to `FX_GLOW_MAX_INTENSITY`; intensity is 0 without post processing.
Only emissive art joins. `disposePools` disposes it on map change.

### greasedLineInPlace.ts
`setPoints` allocates new arrays and GPU buffers every call. This keeps one updatable buffer per
attribute and rewrites positions and prev / next neighbours. Length counters are written once as
index ratios; side signs, UVs, widths and indices stay from the first build.

### greasedLineRelease.ts
`GreasedLineSimpleMaterial.dispose()` disposes the shared `EmptyColorsTexture` without nulling the
static, which silently stops every other GreasedLine from rendering. The public `colorsTexture`
setter throws on null, and a throw from a release froze the render loop (the Drain Life "hang"),
so the private `_colorsTexture` is cleared first. Used by `joint.ts`, `itemCrackle.ts`, `spiritSwarm.ts`.

### homing.ts
Each joint starts `radius` out on the upper half sphere, gains `accel` a tick (`Velocity += 4`),
turns on the centre (`MoveHumming`), loses light by `decay` and stamps a BITMAP_SHINY+1 on the
centre every tick. Streaks and stamps are two batched meshes per spawn. Used by the Summoner curses.

### impactVisuals.ts
20 spark chips per blow (the `CreateBlood` spark loop), blood flecks only when health was taken.
The hero raises no dust when walking: `PlayWalkSound` (ZzzCharacter.cpp:5230) only picks a sound.
Tarkan sand comes from `monsterVisuals.ts`.

### itemAura.ts
The emitter sits on the glowing part's bone (set by `itemGlowSystem`); a shape table sizes the box.
One system per wearer or drop, shared flare01 texture; disposed with `ps.dispose(false)` so the
cached texture survives. Orbit rings and drifting motes were removed: per-item systems and
observers cost too much in crowded squares.

### joint.ts
Two shapes: a bolt (points between two ends, re-pointed each tick with noise; `forks` for
Lightning) and a trail (a head moving by `Velocity` / bone, dragging `MaxTails` positions). A
textured joint runs the BITMAP_JOINT_* sheet U per tail slot and V across, so only the bright
middle shows. `aura.ts` spawns its orbit ribbons through `spawnJoint`.

### linkedModel.ts
The node sits in the bone's frame like a held item (`render/modelObject.ts` basis), so the mesh's
BMD space is the bone's. The clip plays at the owner's speed and is put back when it drifts;
`lock(frame, 0)` holds a key with a looping sliver, never a paused clip. Spawned by
`spawnLinkedModel` from the Flame Strike skill, which steps it a tick at a time.

### monsterGlow.ts
`RenderLight` is warm amber breathing `sin(WorldTime * 0.002) * 0.3 + 0.7`; card size is texture
px x `Scale` / `TILE_CM`. Drawn as `SpriteManager` sprites (one manager per texture) because the
Lost Tower Shadow alone is 39 cards. The matching floor light is in `lighting/characters.ts`.

### monsterVisuals.ts
Each `MoveCharacterVisual` arm is a `CreateParticle` behind `rand_fps_check(n)`; a tick bank per
monster rolls the same 1/n. Spawns go into other entries' pools (`emitBurst`, `spawnJoint`,
`spawnRing`, `spawnDebris`, `spawnSprite`); this entry keeps only handles and banks.

### ping.ts
The ring drapes the marker over the terrain and a straight joint draws the trail, near end on the
owner, far end on the spot. A second ping from the same owner replaces the first; `pingLiveFor`
is the "one pointer at a time" check on sender and receivers. Lifetime comes from `PING_LIMITS`.

### projectile.ts
The head is a card (BITMAP_ENERGY, BITMAP_FIRE, ...) and/or a `model` spawn following the
projectile point; an optional trail streams a particle recipe. Hit within `HIT_DISTANCE`; gives up
after `MAX_FLIGHT_SECONDS`. `onArrive` is how the skill fires its impact.

### rays.ts
Every ray is one line of a single GreasedLine (`joint.ts` `makeLine`), so a burst is one mesh and
one draw instead of forty. Rays share one brightness (born on one tick, decaying together); a
finished ray collapses onto its head.

### shroud.ts
Churning smoke that thickens from a clear middle outward, coverage over black (not subtraction,
see `model.ts` `subtractMaterial`). The card faces the camera, ignores depth and draws first among
transparent effects. Finished cards and materials are kept for the next cast.

### spiritSwarm.ts
Each spirit: a dark body, two braided wisps, a spine and a skull. Bodies and wisps share one
ribbon mesh, spines another, skulls are thin instances; ribbons move in place
(`greasedLineInPlace.ts`). Followers ride the head where it was a frame ago. Finished waves wait in
a pool. Spawned by `versions/shared/skills/dark_wizard/evil_spirit`.

### summon.ts
Each mesh is drawn bright, textured at `Alpha`, both, or hidden, in its own light; the clip is
picked by index and run at the original's keys a tick; the spawner reads its bones. The clone,
skeleton and animation groups are the spawn's own; materials are cached, nothing compiles per spawn.

### tails.ts
Tail centres are laid one a tick, each tail two crossed faces `width` wide, U per tail slot
(`(NumTails - j) / (MaxTails - 1)`). Space Split pillars and Fire Scream streaks
(BITMAP_JOINT_FORCE sub2 / sub7). One updatable mesh per spawn, rewritten only when a tail is laid.

### ticked.ts
For effects whose per-tick maths are kept as written. Nothing is interpolated between ticks.
`sprite` is a one-tick `CreateSprite`, `strip` a `CreateTail` strip, `ribbon` an object blur that
loses one sample a tick, `decal` a one-tick `RenderTerrainAlphaBitmap`. Strips of one kind share a
mesh. Used by the Magic Gladiator skills.
