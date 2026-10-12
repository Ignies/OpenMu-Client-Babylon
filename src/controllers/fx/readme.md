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
- `core.ts`: the effects clock (`delay(seconds, fn)`, `fxNow()`; `fxTicks` / `setFxTicks` for the skill golden, which replays a cast on both Skill effects branches from one tick), units (`TICK` = 1/25 s, `CM`),
  `RGB`, `PointSource` (`followEntity`, `fixedPoint`, `pointSource`), entity helpers (`entityPos`,
  `entityYaw`, `bonePos`, `boneLocalPos`, `entityGone`, `inWindow`), `ParticleRecipe`, light gains
  (`lightCardGain`, `darkCardGain`, `spriteLevel`), `EFFECT_RENDERING_GROUP`, `keepDepthForEffects`.
- `recipes.ts`: `TEX` (Data/Effect sheets), `MODEL` (Data/Skill models), `RGBS`, particle recipes
  several owners share (`SPARKS`, `FIRE_PUFF`, `SMOKE`, ...), `EXPLOSION_CELLS`,
  `FOOT_THUNDER_FRAMES`. A recipe only one skill uses lives in that skill's file.
- The door (`index.ts`) also exports the `ParticleRecipe` and `RGB` types, `bonePos`, `entityPos`,
  `spriteLevel` and `TEX` for map object classes.
- Entry option types skill files import: `ModelOptions`, `SpriteOptions`, `RingOptions`,
  `ParticlesOptions`, `ProjectileOptions`, `AuraOptions`, `JointOptions`, `CardOptions`, ... and
  handles (`ModelHandle`, `StampsHandle`, `SummonBody`, `TailStrip`, `AfterimageHandle`). `spawnModel` (`model.ts`) and
  `spawnLinkedModel` (`linkedModel.ts`) spawn without the facade and hand back a richer handle.
- Modules the ECS systems and other controllers call directly:
  - `effectParticles.ts`: the map-object sprite pool (`Emission`, `ParticleEmitter`,
    `BonedParticleEmitter`, `HeldSprites`, `spawnParticle`, `emissionsFor`, `NodeTurn`, `NO_TURN`); `BonedParticleEmitter`
    and `BonedEmission` are also on `index.ts` for map object classes.
  - `effectTexture.ts`: `loadEffectTexture` (the shared effect texture cache).
  - `moveTargetEffect.ts`: `TerrainDecal`, `MoveTargetEffect` (the click-to-move marker).
  - `ambientParticles.ts` `createAmbientSystem`, `boids.ts` `boidsFor` / `boidFactoryFor`,
    `bursts.ts` `playBurst`, `fireworks.ts` `spawnFireworks`, `firecrackerRise.ts` `spawnFirecrackerRise`
    (the Battle Soccer score's rockets), `impactVisuals.ts` `spawnHitImpact`,
    `bloodDecals.ts` `BloodDecals`, `deathVisuals.ts` `shatterDeathFor` / `skeletonShatter` /
    `spawnBomb` (`explosion` false: the sparks alone, `CreateBomb(p, false)`) / `spawnCrystalShards`, `itemAura.ts` `createItemAura`, `itemCrackle.ts`
    `createItemCrackle`, `monsterGlow.ts` `monsterGlowFor` / `glowMonster`, `monsterVisuals.ts`
    `monsterVisualFor` / `visualMonster`, `ping.ts` `pingLiveFor` / `TRAIL_ANCHOR`.

## How it works
- `layers.ts` holds `EFFECT_LAYERS`, the only list of entries. Each entry is one file exporting an
  `EffectLayer` (`layer.ts`): `name`, optional `update(map, dt)` and `reset()`, and `spawn`.
  `EffectName` and `EffectOptions<N>` are derived from that tuple, so `spawn` is type checked.
- While the page is hidden no particle is made (`emitBurst` / `Emitter` and `spawnParticle`): both
  only age on a drawn frame, so the ones made meanwhile would all play at once on return.
- `effects.update` runs once a frame from `ecs/systems/effectSystem.ts`: it steps the clock first
  (`stepClock`, so a `delay` that comes due spawns this frame), then every entry in list order.
  Order matters: `projectile`, `debris` and `feathers` move points that `model` reads; `aura`
  drives ribbon heads `joint` reads; `monsterGlow` is last so its cards ride this frame's bones.
- The clock counts 25 Hz ticks, like `c->AttackTime += FPS_ANIMATION_FACTOR`, and a delay of a whole
  number of ticks is due on that tick: at 25 fps `delay(ticks(14))` fires on the 14th frame. Summed
  float seconds made `ticks(n)` delays fire a frame late and a chain of `delay(TICK)` polls step
  every other frame.
- `effects.reset` runs on map change from `app/lifecycle.ts`: `clearTimers`, each entry's
  `reset`, then `disposePools` (materials, cards, particle systems, the effect glow layer).
- An entry keeps its live effects in a `LiveList` (`core.ts`). A throwing update or release is
  logged and dropped, never rethrown into the render loop.
- Textures, models and sprite sheets load in the background (`void load(x).then(...)`). Every such
  call ends in `.catch(reportLoadFailure(file))` from `assets`: a missing file is warned once and
  the effect just does not appear.
- Shared pools (`core.ts`): additive materials cached per (texture, colour, blend), billboard
  cards from a free list, one `ParticleSystem` per recipe so a burst is a counter bump. The colour
  is rounded to 1/128 first, under one 8-bit level (1/32 showed as steps in a slow fade): keyed by
  the exact tint, a flickering effect made a new material nearly every frame and kept it until the
  map changed.
- Caps: `effects.spawn('joint')` makes nothing past `MAX_JOINTS` (500) live joints and
  `effects.spawn('model')` past `MAX_EFFECTS` (200) models, the original's fixed `Joints[]` /
  `Effects[]` slots (Core/Globals/_define.h:456,504). The level-up rings go through the joint cap.
  The hero's own Hell Fire circle, Inferno ring, Twister funnel and Fire Scream claw take 100 slots
  of their own instead (`g_SkillEffects`, `MAX_SKILL_EFFECTS`, SkillEffectMgr.cpp:33-62): the skill
  marks them with `heroSkillEffect(opts, caster)` (`heroSkill`), only when the caster is the hero.
  The other effects that list names (Blast, Flash, Flame, Sword Force) are not `model` spawns here.
  What other entries start with `spawnJoint` / `spawnModel` (aura and monster ribbons, projectile
  heads, debris) counts but is never refused: a refused aura would not come back. A joint set
  (`pairs`, `paths`) counts once.
- Units follow the original: lifetimes in 25 Hz ticks (`TICK`), distances in cm / 100 (`CM`).
  Entries cite the `CreateEffect` / `CreateJoint` / `CreateParticle` code they port
  (ZzzEffect.cpp, ZzzEffectJoint.cpp, ZzzEffectParticle.cpp).

## Depends on / used by
- uses: `render`, `assets`, `lighting`, `sound`, `terrain`, `weather`, `maps`, `item_fx`, `anim`,
  `net/protocols/pingProtocol`, `core`, `ecs/world` (types), `ecs/current` (the live world),
  `@versions/shared/objects/enum`. Reads `settings` (`GameOptions`).
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
- `blur.test.ts`: a `tickHistory` trail fades a light above 1 from its own tint, clamped per channel after the
  fade (PackABGR), and drops two samples a tick from 15 ticks old when `short`, from 30 when not (CreateBlur).
- `debris.test.ts`: broken ice (`ice`) is thrown, tumbles, falls, bounces and fades as MODEL_EFFECT_BROKEN_ICE
  SubType 0 moves a tick.
- `boids.test.ts`: a bird, a fish and an invasion dragon cast the Classic shadow from the ground at 0.2, not on the cascades.
- `layers.test.ts`: the shroud draws at most `SHROUD_MAX` cards at once.
- `modelClones.test.ts` (spiritSwarm): a disposed rig takes its skull clones along, loaded or late.
- `firecrackerRise.test.ts`: the soccer score's fireworks fire on a fifth tick one time in three, climb 12 ticks
  from the square's centre at a flat 100 cm and burst into 80 sparks with the firecracker sound, coloured by
  their rolls and turned for their sub.
- `effectParticles.test.ts`: no particle is made while the page is hidden; `spawnParticle` reads its position, turn
  and light before it returns, while its sheet loads and once it has, so a caller may rewrite one scratch object
  for every spawn; `KIND_REACH` covers every particle kind, and the view gate of
  `ParticleEmitter` / `BonedParticleEmitter` (spawns only when a sprite could reach the frustum);
  a pushed particle on a turned or tilted object goes where MovePosition turns its velocity
  (ZzzAI.cpp:148-156), from `spawnParticle` and from an emitter handed the node's rotation, and
  `KIND_REACH` holds on any turn; every kind's colour stays in 0..1
  over its life whatever light it is made with, and a held sprite's (the wing glows) whatever its look;
  `light0` (`BITMAP_LIGHT` SubType 0) rises, shrinks, glows as its scale up to 1 and drifts on half the
  particle wind (`g_vParticleWind`, walked once a tick, ZzzEffectParticle.cpp:3847-3859); `light15`
  (`BITMAP_LIGHT` SubType 15) climbs a spiral from up to `Scale * 30` off, fading in and out in the
  light it is made with;
  `trueFire` (`BITMAP_TRUE_FIRE`, fantaF.jpg) takes its sideways and upward push at birth, rises,
  shrinks and fades with its life (24 ticks, `trueFire5` 20); `trueBlue` (`BITMAP_TRUE_BLUE`) is
  the same particle on fantaB.jpg; `smoke13` (`BITMAP_SMOKE` SubType 13) stays put, grows and fades
  orange; `fi01_0` / `fi01_1` (`BITMAP_ADV_SMOKE` SubType 0 / 1) move by their velocity twice a tick,
  turned with the object and as it is, rise faster, grow and are `LifeTime / 10` bright, held at 1;
  `fi02_0` (`BITMAP_ADV_SMOKE + 1`, fi02.tga drawn `alpha`) takes `BITMAP_TRUE_FIRE`'s life and push,
  wanders, turns and fades in colour and alpha; `cloud6` (`BITMAP_CLOUD` SubType 6) moves the same at a
  fifth of its size, additive, `LifeTime / 50` bright; `waterfall1_2` (`BITMAP_WATERFALL_1` SubType 2)
  falls as `waterfall5_9` 1.6 bigger and dims below 5 ticks left, not 8; `waterfall2_1`
  (`BITMAP_WATERFALL_2` SubType 1) is made off its spot, falls, wobbles, grows and dims teal;
  `waterfall2_2` (SubType 2) is the same grey, 40 ticks, the object's scale added to its own;
  `waterfall3_3` (`BITMAP_WATERFALL_3` SubType 3) sinks faster each tick and keeps 0.97 of its light;
  `waterfall3_4` (SubType 4) leaps up, sinks 2.5 faster a tick and dims 1.1; the Balgass volcano's
  `fi01_2` / `fi02_1` (`BITMAP_ADV_SMOKE` SubType 2, `+ 1` SubType 1) are SubType 0 at half the
  spawn scale, `cloud14` (`BITMAP_CLOUD` SubType 14) is `cloud6` at a fifth of it, subtracted,
  `cloud10` (SubType 10) drifts twice its push from up to 200 off and darkens 0.01 a tick to 0.15,
  fading past 300 and gone past 500, `cloud11` (SubType 11) drifts the same in its own light, turning,
  and `fireRed` (`BITMAP_FIRE_RED`, firered.jpg) shoots up steady for 20 ticks. The bosses' smokes:
  `smoke50` (`BITMAP_SMOKE` SubType 50) fades in to half its light and rises, `smokeLine1..3`
  (`BITMAP_SMOKELINE1..3` SubType 0) to 0.7 on their own sheets, `smokeLine1_2..3_2` (SubType 2) the same over 45 ticks, not 35, and `smoke1` (SubType 1) is green
  whatever its light. Medusa's: `fireMono1_4`, `fireMono2_8`, `fireMono3_5` (the mono fire jets) fly 8 cm a
  tick along their object's facing for 8 ticks, growing; `waterfall4Orbit0..2` (`BITMAP_WATERFALL_4`'s three
  cards, on one set of rolls) circle where they were made, 2.1 cm further out and 0.1 round a tick; a
  particle made with an anchor moves as far as the anchor does. The Dark Ghost's: `waterfall4_15` (`BITMAP_WATERFALL_4`
  SubType 15) drops from 50 cm under its spot, shrinking and dimming, 20 ticks; `smoke39` (`BITMAP_SMOKE` SubType 39,
  no case of its own) is a still smoke01 card for two ticks. The Maya hands': `waterfall3_6` (`BITMAP_WATERFALL_3`
  SubType 6) rises from 50 cm under its spot; `smoke3_3` / `smoke3_4` (`BITMAP_SMOKE + 3` SubType 3 / 4) are dark
  clud64 / waterFall3 puffs, white whatever their light, drawn subtracted.
- `monsterGlow.test.ts`: `RenderLight` breathes on the world's clock, so two monsters that came apart
  breathe alike, in step with their floor light; Santa Claus and the Snowman carry their steady
  flare01 cards on their bones (ZzzObject.cpp:1910-1945); a swelling card (Kundun's) takes its size
  from the world clock, a lifted one (Selupan's) adds the swing to its light and turns on that clock;
  `scaleBy` times a card's size every frame.
- `monsterVisuals.test.ts`: a `cards` row hangs each spot on the glow entry with its own sheet, scale
  and offset; a `trail` runs a ribbon from its bone, a gated one ending when the monster dies and one gated on an
  action drawn only in it (Fred's blades, Spark03); a `puff`
  makes one of its particles at its bone, and one gated on a buff puffs only under it, each bone rolling
  its own chance with `rollEach`; each particle of a puff takes its own scale, and the jitter; a `turned`
  puff takes the monster's facing and a `ride` one hands its particles one kept point a body or a bone; a
  cards row gated on an action is shown only in it; a `roar` row's cards and particles scale with Kundun's
  Shock roar (`PKKey` and `Skill` stepped a tick, GMHellas.cpp:1596-1622), 1 out of Shock.
  The anvil's sparks are handed one kept heading (`spawnJoint` copies it). A `blur` row runs one trail between
  its bone points while its gate is open, and from the first tick when it has none. An `origin` puff is made at
  the body, not a bone; a `pick` puff at that many of its bones picked at random; a gate's `when` holds a row
  (a cards row too: Valam's) to a state the content reads; a puff with `colours` picks one for each spot (the Iron Knights' blue or grey); a `blur` row hands on its sheet (motion_blur for
  Type 1), its dark pass (Type 4) and its Short flag; a `shards` row throws its
  pieces as debris at each bone.
- `core.test.ts`: a flickering tint makes a bounded number of additive materials, each within half
  a 1/128 step of the colour asked for; a burst emits nothing while the page is hidden.
- `modelClones.test.ts`: a `model`, `linkedModel` or spirit skull clone leaves no mesh, skeleton or
  clip behind when it ends (a `model` clone once the pool is emptied), also when it loads after the
  end; a `model` spawn after one ended reuses its clone, shown once dressed.
- `caps.test.ts`: past 500 live joints or 200 live models a spawn makes nothing, and makes one
  again once one ends; the hero's skill effects take 100 slots of their own; the level-up rings
  count toward the joint cap.
- `modelPool.test.ts`: a returned clone comes back as it was loaded and disabled, at most
  `POOL_PER_MODEL` per model, never to another scene; a stray one is disposed, the spares on reset.
- `afterimage.test.ts`: a copy takes the drawn meshes of each part onto a skeleton of its own, posed on
  the clip's first key while the body keeps its own; a placed part stands where a body facing that way
  would draw it, at its alpha; an unplaced or 0-alpha part is not drawn; it ends taking its copies along.
- `glow.test.ts`: the effect halo's render list draws only the included meshes and follows
  resizes and map changes.
- `greasedLineRelease.test.ts`: releasing simple and textured lines never throws and keeps the
  shared empty-colours texture alive.
- `clock.test.ts`: an n-tick delay fires on the n-th frame at 25 fps from any start, and on the first
  due frame at 60 fps.
- `softEdge.test.ts`: `fadeSheetEdges` / `fadeSheetSides` fade sheet borders and only touch alpha.
- `ring.test.ts`: a ring with `scaleAt` is drawn at that diameter each frame (a per-tick `o->Scale` curve); an aura's
  `groundGlow` draws its decals where the wearer stands each frame until the aura stops.
- `ticked.test.ts`: a strip with `maxSegment` parks a segment whose tail centres lie further apart.
- `model.test.ts`: a model turned by `angle` (MU degrees) or by `yaw: -entityYaw` faces where its caster is
  drawn facing; `yaw` is the node's own turn, so `entityYaw` as it is mirrors it. `yawTo(dir)` turns it as
  `angle` does with the CreateAngle along `dir`: nose first, as the original flies a projectile.
- The skill golden tests (`versions/shared/skills/*.golden.test.ts`) drive `effects.spawn` and
  `effects.update` for every skill.

## Notes

### _template.ts
Pools come from `core.ts`: `additiveMaterial` + `acquireCard` for a handful of billboards,
`particleSystemFor` / `emitBurst` / `Emitter` for many. Each tuning constant says what it is in
real units and why. Module state lives in the entry file, never in the facade.

### afterimage.ts
The original draws a body again where it is not: `DarksideRendering` renders each part a second time at
another Position, Angle, action and Alpha (MonkSystem.cpp:697-857). A spawn clones the drawn meshes of the
parts it is given (geometry and materials stay the body's, metadata is copied so the item shader lights
them as the body) onto one clone of the body's skeleton, unlinked from the rig's nodes and stood once on
the clip's first key, so nothing poses per frame. Each part hangs on a node of its own, so the spawner
can put every part where its own call left it; below alpha 1 the meshes take their blended twin
(`setMeshFadeBlend`), as a fading body does. Clones stay out of the cascades, the depth and the halo.

### ambientParticles.ts
High-count, long-lived emitters (rain, snow, leaves, dust) that the CPU sprite pool is wrong for.
Each recipe is a `GPUParticleSystem` when the engine supports it, else a smaller `ParticleSystem`.
A `NoiseProceduralTexture` stands in for the per-tick random walk
(`Velocity += RangeFloat(-8, 7) * 0.1`) on both paths.

### aura.ts
Parts follow the wearer by `follow` (feet) and `bone` (MU bone index), step at 25 Hz where a rate
is per tick, ramp in and out over `RAMP_SECONDS`, and end together on `stop()` or `until`.
Examples: the five MODEL_SPEARSKILL ribbons of Greater Defense, Swell Life's shoulder motes. `groundGlow` keeps
`ring` decals under the wearer, redrawn where it stands each frame (`RenderTerrainAlphaBitmap`), breathing on the clock.
Spawned from `controllers/skills/visuals.ts` (`BUFF_VISUALS`, keyed by `eBuffState`).

### bandNotes.ts
A note is a solid alpha-tested glyph in the world's rendering group, so it writes depth and gets
its own ink line under the Anime style (`render/scenes/inkOutline.ts`). The glyph is drawn once per
scene into a dynamic texture from shapes, not a font. Notes fan forward, rise, grow, then fade with
a soft wake. Driven by `ecs/systems/bandSystem.ts`, one spawn per hit.

### boids.ts
`GOBoid.cpp` has two halves: `Mounts[]` (pets, Fenrir, the Dark Lord's horse) lives in
`controllers/pets/pets.ts` and `ecs/systems/petSystem.ts`; `Boids[]` (birds, bats, butterflies, crows,
fish) is here; each map names its species (`fx: { boids }` on the entry, `MapFx`). Each boid plays its own call sound (GOBoid.cpp:1481-1501). The ground crawlers
(GOBoid.cpp:1690-1745) are not ported yet. `MAX_BOIDS` is 13, not the original array size of 40.
Every boid and fish casts the Classic shadow from the ground under it (`ShadowFromGround`, GOBoid.cpp:1585-1600,
:1630-1640) at alpha 0.2 (`ShadowAlpha`, a share of the Classic value) and none on the cascades. The
eagle's 0 or 1 (GOBoid.cpp:1591-1593) has no boid here to carry it.

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
also used by `actors/transformedBody.ts` and `versions/shared/monsters/_skeleton_line/model.ts`.

### debris.ts
Init: random yaw, horizontal speed (64..319) x 0.1 cm/tick, rise 8..23 cm/tick, scale 0.8..1.1,
life 32..47 ticks. Move: drag x0.9 a tick, gravity 3 cm/tick², bounce at half speed (costs 4
ticks), tumble `Scale x 32°` a tick, a puff 1 tick in 10. Each piece is a `spawnModel` driven from
here, so `debris` comes before `model` in the list. Spawned from `deathVisuals.ts` and skill files.

### effectParticles.ts
A kind names its sheet and blend: `add` (`EnableAlphaBlend`), `subtract` (`EnableAlphaBlendMinus`;
held sprites draw it `dark`), or `alpha` for a sheet with alpha (OZT, decoded by `loadMuSprite`)
drawn `EnableAlphaBlend3`. RenderSprite colours such a sheet
`(L, L, L, L)` (ZzzOpenglUtil.cpp:918-933), so an `alpha` kind writes its alpha into the colour too.
Every particle moves by its velocity turned with the object first (MovePosition,
ZzzEffectParticle.cpp:3885); a kind whose case adds `VectorAddScaled` moves a second time
(`moveAgain`). The emitters are handed the node's rotation (`NodeTurn`: MU's `Angle` as
`(-Angle[0], -Angle[2], -Angle[1])`, `terrain/loadMapIntoScene.ts` then `render/renderAngles.ts`) and
`spawnParticle` turns it back into the original's `AngleMatrix` (ZzzMathLib.cpp:185-212), pitch and
roll included: a waterfall on a tilted object (Kalima, Elbeland 58, the GM area's 81) falls along
it. The yaw taken as it was sent every pushed particle the mirrored way; `NO_TURN` is no turn at
all (bones, the Chaos Castle cracks). The tick holds each channel of a kind's
colour in 0..1, as RenderSprite packs the light a byte a channel (ZzzOpenglUtil.cpp:918-933,
RenderUtils.h:8-18): `smoke0` starts at `LifeTime / 8` = 2, `light0` at its scale, a torch fire at
its light, and none of that past 1 reached the screen. `HeldSprites` holds its look the same way; no
wing look goes past 1 today (the Wing of Storm's peak at 0.9). A held sprite is drawn at its sheet's own
width and height (`RenderSprite`, zzzeffectsprite.cpp:73-75): a sheet that is not square names its
`height` (Shiny02, pin_lights), and the pool keeps it as `aspect`.

### feathers.ts
Jitter up to 40 cm per axis, random tumble 0..5° a tick, `Alpha` 0.6..0.8. The original drops these
from dark wings and Desair, never an NPC; the archangel release is a client addition with a slower
fall and a longer life (the `archangelFeathers` improvement: none on Classic). Each feather is a `spawnModel`, so `feathers` comes before `model`.
Spawned from `versions/shared/monsters/_archangels/model.ts`.

### glow.ts
The item halo (`render/sceneLook.ts`) has no render list; effect art is excluded from it.
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

### modelPool.ts
`spawnModel` takes its clone from here and hands it back on release, so a bolt or an arrow reuses a
clone instead of making one and dropping it (in a crowd that was a hundred a second and the GC
stalled for 400 ms). Up to 24 spares per model and scene; what a spawn may change on the meshes
(material, metadata, visibility, vertex colours, enabled) is put back on return, what it hung under
the clone is disposed, and a spare's first clip restarts as on a fresh clone. A clone is handed
out disabled and the spawn enables it once dressed, so a spawn that fails half way never shows the
raw GLB. `reset` disposes the spares. The original makes nothing per spawn either: effects are
fixed slots (`Effects[MAX_EFFECTS]`, Core/Globals/_define.h:456) drawing the shared `Models[]`.

### monsterGlow.ts
`RenderLight` is warm amber breathing `sin(WorldTime * 0.002) * 0.3 + 0.7`; card size is texture
px x `Scale` / `TILE_CM`. Drawn as `SpriteManager` sprites (one manager per texture) because the
Lost Tower Shadow alone is 39 cards. The matching floor light is in `lighting/characters.ts`.

### monsterVisuals.ts
Each `MoveCharacterVisual` arm is a `CreateParticle` behind `rand_fps_check(n)`; a tick bank per
monster rolls the same 1/n. Spawns go into other entries' pools (`emitBurst`, `spawnJoint`,
`spawnRing`, `spawnDebris`, `spawnSprite`); this entry keeps only handles and banks. The rows are
each monster folder's `bodyFx` (types in `controllers/monsters/bodyFx.ts`, shared pieces in
`versions/shared/monsters/_shared/bodyFx.ts`); particle and texture names resolve here (`PARTICLES`,
`TEXTURES`), once per row. The `RenderMonsterVisual` rows: `cards` (steady `CreateSprite` cards on
bones) go to `monsterGlow` as spots, `trail` (a JOINT_ENERGY whose head rides a bone) is one joint
for the monster's life, and `puff` spawns the original's own particles (`effectParticles.ts` kinds,
`PUFFS`). A row gated `alive` ends when the monster dies (the original's `if (Die) return`). A
cards row gated on an action or frames is a `MoveMonsterVisual` CreateSprite: the glow hides it outside
them (`when`). A `turned` puff is made on the monster's `Angle` (`facing`: a node turn of `-yaw`, so a
`(0, -1, 0)` push goes the way it faces); a `ride` puff hands its particles a kept point (the body, or
each bone) the particle tick moves them with, the original's `VectorCopy(o->Target->Position,
o->StartPosition)`. One `Vector3` a ride, made with the monster's row and rewritten each frame. A `blur`
row is a monster's RenderObject swing loop: a `blur` entry trail (`tickHistory`, its 10 samples a tick) between
two bone points, spawned when its gate opens and sampling until it closes; an ungated one (Selupan, the Iron
Knights) runs for the monster's life. The trail's tint is the material's emissive, which Babylon clamps
before the ramp: a light over 1 (their `(1, 1.2, 2)`) ramps from white where the original's packed vertex
colour ramps from its own hue.

### ping.ts
The ring drapes the marker over the terrain and a straight joint draws the trail, near end on the
owner, far end on the spot. A second ping from the same owner replaces the first; `pingLiveFor`
is the "one pointer at a time" check on sender and receivers. Lifetime comes from `PING_LIMITS`.

### projectile.ts
The head is a card (BITMAP_ENERGY, BITMAP_FIRE, ...) and/or a `model` spawn following the
projectile point, its nose along the flight (`yawTo`: the original moves an arrow along its own Angle,
ZzzEffect.cpp:1661-1665); an optional trail streams a particle recipe. Hit within `HIT_DISTANCE`; gives up
after `MAX_FLIGHT_SECONDS`. `onArrive` is how the skill fires its impact.

### rays.ts
Every ray is one line of a single GreasedLine (`joint.ts` `makeLine`), so a burst is one mesh and
one draw instead of forty. Rays share one brightness (born on one tick, decaying together); a
finished ray collapses onto its head.

### shroud.ts
Ours (Evil Spirit on Skill effects: Enhanced). Churning smoke that thickens from a clear middle
outward, coverage over black (not subtraction, see `model.ts` `subtractMaterial`). The card faces the
camera, ignores depth and draws first among transparent effects. At most `SHROUD_MAX` (2) cards at once,
whoever cast them; the skill keeps one per caster. Finished cards and materials are kept for the next cast.

### spiritSwarm.ts
Ours (Evil Spirit on Skill effects: Enhanced). Each spirit: a dark body, two braided wisps, a spine
and a skull. Bodies and wisps share one ribbon mesh, spines another, skulls are thin instances; ribbons
move in place (`greasedLineInPlace.ts`). Followers ride the head where it was a frame ago. Finished
waves wait in a pool. Spawned by `versions/shared/skills/dark_wizard/evil_spirit/swarm.ts`.

### summon.ts
Each mesh is drawn bright, textured at `Alpha`, both, or hidden, in its own light; the clip is
picked by index and run at the original's keys a tick; the spawner reads its bones. The clone,
skeleton and animation groups are the spawn's own; materials are cached, nothing compiles per spawn.
A mesh's `scrollV` writes the V offset of the GLB's own sheet once a frame, as model.ts `scrollV` does.

### tails.ts
Tail centres are laid one a tick, each tail two crossed faces `width` wide, U per tail slot
(`(NumTails - j) / (MaxTails - 1)`). Space Split pillars and Fire Scream streaks
(BITMAP_JOINT_FORCE sub2 / sub7). One updatable mesh per spawn, rewritten only when a tail is laid.

### ticked.ts
For effects whose per-tick maths are kept as written. Nothing is interpolated between ticks.
`sprite` is a one-tick `CreateSprite`, `strip` a `CreateTail` strip, `ribbon` an object blur that
loses one sample a tick, `decal` a one-tick `RenderTerrainAlphaBitmap`. Strips of one kind share a
mesh; `maxSegment` leaves out a segment longer than RenderJoints draws (60 cm). Used by the Magic
Gladiator and Rage Fighter skills.
