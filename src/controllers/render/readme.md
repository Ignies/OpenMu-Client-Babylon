# render

How models and the frame are drawn: the `ModelObject` base class, prop batching, blob shadows, PBR
maps, the render options and the post passes (`scenes/`). `babylon/` is the one place the code
imports Babylon from.

## Public API
There is no `index.ts` facade; other folders import the modules directly.
- `babylon/exports.ts`: every Babylon class the game uses; also sets the self-hosted decoder URLs
  (Draco, meshopt, KTX2, Basis). Imported by about 260 files.
- `babylon/utils.ts`: `createEngine(canvas, aa)` (boot), `addInspectorForScene` (Shift+Ctrl+Alt+I),
  `projectWorldPositionToScreenRef`. `babylon/emptyTexture.ts`: `getEmptyTexture`.
- `babylon/spriteLinear.ts`: `installSpriteLinearDecode()` (called by `fx/core.ts`).
- `babylon/compileWait.ts`: `patientCompileWait()` (called by `createEngine`): never gives a slow shader up.
- `modelObject.ts`: `ModelObject`, the base class of every drawn model (actors, map objects, npcs,
  drops, pets); `PartPose`, `BodyShine` (with `ShineMesh` or `ShineMeshes` and `ShineLight`, the shine mesh lit by
  the shine's tint), `HIDDEN_MESH_ALL`, `BLEND_MESH_ALL`.
- `meshPasses.ts`: `MeshPass`, `MeshPassSet`, `MeshPasses`, `UV_MAP` / `UvMap`: a model's own
  `RenderPartObjectBody` passes, set on `ModelObject.MeshPasses` before `load()` (item looks, and a
  monster's own `RenderMonster` passes, its folder's `passes`).
- `scenes/testScene.ts`: `TestScene`, the game's `Scene` with its camera, highlight layer and look.
- `sceneLook.ts`: `setAreaMood`, `requestGlowProbe`, `updateSceneLook` (glow layer, areas).
- `scenes/<pass>.ts`: `sync<Pass>` / `dispose<Pass>` and `createPostChain`, called by
  `lighting/director.ts` through `scenes/index.ts`.
- `shadows.ts`: `syncShadows`, `syncTerrainDefines` (the director) and the terrain's CSM hook
  (`registerTerrainMaterial`, `terrainCsmDefines`, `terrainCsmGlsl`, `bindTerrainCsm`).
- `propBatches.ts`: `propBatchingActive`, `propBatchExclusion`, `addPropToBatch`,
  `flushPropBatches`, `updatePropBatches`, `disposePropBatches`; `propLocalBox(world, type, model, min, max)`, a
  map type's box under its node from its batch or its loaded model (the wall lean measures walls with it).
- `objectShadow.ts`: `setShadowWorld` (the shadowless worlds and the lean, `shadowLean`), `setShadowlessScene`
  (the Kanturu Maya scene, from `modules/events`), `invalidateShadowState`.
- options: `materialQuality.ts`, `renderingStyle.ts`, `renderScale.ts`, `renderDistance.ts` (slider
  steps and readers for the Options window, the materials and boot).
- `fpsLimit.ts` (ours, the FPS limit option): `FPS_LIMIT_STEPS` / `_MAX`, `fpsLimitForStep`, `FramePacer`,
  `framePacer` (boot's render loop asks `due(now, limit)`; its `fps` counts drawn frames, which the perf
  readout and overlay show). `loadShed.ts` (ours, the `effectShedding` option): `shedLevel(now)`, `nextShedLevel`,
  `ShedLevel`, read by `skills/castBudget.ts`; `othersShedFully(owner, now)`, read by `ecs/systems/petSystem.ts`.
- `pbrMaps.ts`: `pbrMapsFor`, `pbrMapsIfReady`, `textureSourceName`; `readPackLabelsWith(reader)`, the
  texture pack's remembered names, which `textureSourceName` asks first (set by `assets/modelLoader.ts`).
- `surfaceClass.ts`: `registerSurfaces(rule)` (content fills it: `versions/shared/surfaces`),
  `surfaceOf(path)`, `modelKey(path)`, `SURFACE_NONE` / `GEAR` / `CLOTH` / `SKIN`. The model loader
  stamps `metadata.surface` on every mesh; the PBR material's looks read it (`item_fx/pbrLooks.ts`).
- `index.ts`: the types below, `ModelObject` (the pets controller extends it) and `HIDDEN_MESH_ALL` for
  map object classes.
- `MapRender`, `MeshAnimation`, `MeshAnimations` (`meshAnimation.ts`, types on `index.ts`): a map's own
  render row, `MapLayer.render`.
- helpers: `boneLink.ts` (bone-link matrices), `meshAnimation.ts` (`meshAnimationFor`),
  `renderAngles.ts` (`toRenderAngles`, `angleMatrixQuaternion`, `renderAnglesQuaternion`), `viewPlanes.ts`, `frameSnapshot.ts`, `textureScript.ts`,
  `sceneCover.ts`, `blendMeshes.ts`, `effectOnlyObjects.ts`, `perfOverlay.ts` (Shift+Ctrl+Alt+P; `systemTimesSnapshot` for `app/bench.ts`).
- `configFingerprint.ts`: `configFingerprintLines()` and friends, every game option packed into a hex
  string for the perf overlay.
- `iconShot.ts`: `iconShots(scene).shoot(job)`, a one-shot picture of a model as an image URL (the bag
  icons the pack has no file for); `iconShots(scene).spin(job, paint)`, the same model turned and drawn
  every frame until stopped (the item under the cursor); `forget()`, the kept pictures dropped;
  `ICON_LAYER`, `iconPixels`.

## How it works
- `ModelObject.load(gltf)` puts a GLB under the object's node with the BMD to Babylon basis change
  (`scaling (1,-1,1)`, `rotX(-90)`), sets per-mesh metadata (body light, shine, shadow flags) and
  applies `BlendMesh`, `BrightMesh`, `HiddenMesh`, `HideSkin`, mesh animations and the blob shadow.
  `BlendMesh = -2` (`BLEND_MESH_ALL`) draws every mesh additive (ZzzBMD.cpp:2022), `blendAll()` switches to it after
  load, and `BlendMeshLightAt`, when
  set, rewrites the blend meshes' `BlendMeshLight` each frame off `WorldTime` (a held weapon's pulse).
  `setBoneLink(-1)` puts a bone-linked part back under its owner's node, as built.
  Under `HideSkin`, `HideSkinTexture` (a `Data/` path) is the bitmap mesh 0 is drawn with instead of its
  own, alpha-tested (ZzzObject.cpp:7774-7790), and `HideSkinMeshes` the only meshes drawn; a drop sets
  both from `actors/skinTexture.ts`.
  Map objects also drop still clips (`staticClips.ts`) and mark themselves static CSM casters.
- `MeshPasses` (`meshPasses.ts`): each pass is a clone of its mesh under the same parent (indices stand),
  hidden until shown, on the additive scroll material (`add`, `bright`), the flat-lit scroll one (`unlit`,
  which draws the texel at full: the flat variant takes no BodyLight) or the lit blended one (`blend`, alpha
  as `coverage`). Clones skip the shadows but `unlit`. `metadata.uvMap` asks the scroll materials for a
  chrome look-up by the normal in place of the mesh UVs. `update(ms)` writes light, gain and scroll
  without allocating and, when `shown` flips, swaps the clones and the meshes they replace. A pass with
  `when` (an event state: Selupan's pattern) is drawn only while it holds.
- `textureScript.ts` reads a texture name's `_R/_H/_S/_N/_DC/_DT` suffix for the model loader.
- `propBatches.ts` draws map scenery as thin instances, one mesh per type, submesh and 32-tile chunk
  (`propBatchRules.ts`); one real `ModelObject` per type is the never-drawn prototype. A chunk mesh
  draws the cached model's GPU buffers with a reference of its own on each (`shareGeometry`): without
  it the first chunk disposed freed them, and the next clone of that model (a same-folder map such as
  the Chaos Castle floors, a lighting-tier rebuild, the batching toggle) drew a recycled buffer, torn.
- The look director (`lighting/director.ts`) syncs the passes each tick in this order: shadows,
  upscale, effect mask, AO, ink outline, hull outline, speed lines, haze, room mask, sun shafts,
  tone map, firefly guard, then the post chain (`moveToEnd` when a pass ahead was rebuilt).
- Each pass takes the lighting tier and the post option from the director. On Classic (no tier)
  the effect mask, AO, haze and tone pass are not built, and the style readers answer "off".
- `iconShot.ts` queues jobs and runs one at a time: the job builds its model under a root that turns
  MU's frame upright (the original's item camera: identity view, NewUI3DRenderMng.cpp:165-169), the
  meshes go on `ICON_LAYER` (no other camera draws them), flat lit at BodyLight 1 with no fog or
  shadow flags (the original's `Light = 1,1,1`, `LightEnable` off, ZzzInventory.cpp:9682-9699), then an
  orthographic camera and a target of their own draw them once after the frame (`onAfterRender`,
  only while a job waits), at most one per frame. The target is read back, encoded as a PNG object
  URL, cached by the job's key and everything is freed. A spin keeps its root, camera and target
  until stopped and, every frame after the render, turns the model (`job.turn`), draws it, reads it
  synchronously into a kept buffer and hands `paint` one kept straight-alpha array: no allocation per
  frame. One spin at a time: a new one stops the last.

## Depends on / used by
- uses: `assets` (model loader, texture packs), `lighting`, `terrain`, `maps`, `item_fx`, `anim`,
  `net`, `settings`, `ecs` (world types, `Ecs.world`, two system helpers), `core`.
- used by: `app/boot.tsx`, `ecs` systems, `actors`, `fx`, `lighting`, `terrain`, `item_fx`,
  `assets`, `modules`, `versions/shared` maps, npcs and the Options window.

## Change it
- a new model class: extend `ModelObject`; set `static Batchable = true` only if it does nothing per
  object after `init()`.
- a scrolling or pulsing mesh on a map object: add a row to the map's `*_MESH_ANIMATIONS` table in
  its `spec.ts` (`render.meshAnimations` on the entry); `maps/shared/meshAnimation.ts` has the
  `saw` / `sawUp` / `perTick` helpers.
- a new post pass: add `scenes/<name>.ts` with `sync<Name>` / `dispose<Name>`, call it from
  `lighting/director.ts` in chain order, return true when the chain changed.
- a new render option: add its steps and reader next to the others (e.g. `renderingStyle.ts`) and
  the slider in `versions/shared/ui/windows/options/catalogue.ts`.
- a new game option: run `bun run tools/configHexTable.ts` to rewrite `docs/configuration_hex.md`;
  bump `CONFIG_FINGERPRINT_VERSION` if the byte layout itself changes.
- see [docs/controllers.md](../../../docs/controllers.md) for adding a new look next to the classic one.

## Tests
- `perfOverlay.test.ts`: the per-system rows the bench reads, slowest first with their worst tick.
- `configFingerprint.test.ts`: `configuration_hex.md` matches the options, the layout and lengths,
  the number bias round trip, and the pack digest.
- `fpsLimit.test.ts`: uncapped draws every frame; a cap holds on a faster monitor, averages a rate it does
  not divide, drops nothing at the refresh rate; `fps` measures the frames let through.
- `loadShed.test.ts`: the levels against the target, the way back one step at a time, no reading changes
  nothing, read at most twice a second; level 2 drops other players only, with the option on.
- `frameSnapshot.test.ts`: fills once per frame and per scene, refills after a throw.
- `iconShot.test.ts`: at most one shot per frame and no observer once idle; one build per key, again
  after `forget`; the
  subject, root, camera and target freed; the main camera never sees the subject; flat lit, no fog,
  no caster flag, but a mesh lit by its own shine keeps its light; a failed build answers null; the bounded wait for readiness; `iconPixels` (row flip,
  straight alpha over the clear, the display curve on a linear buffer, a kept buffer rewritten whole);
  the spin draws one turned picture a frame into one kept buffer, one item at a time, and frees all of
  it when stopped, before its model is in too. NullEngine draws no pixels, so what a picture looks
  like is checked in a browser.
- `meshAnimation.test.ts`: `meshAnimationFor` reads the map row per world.
- `meshPasses.test.ts`: an additive copy whose gain and UVs follow WorldTime, the meshes a branch skips or
  a pass replaces, a pass's own light, a `RenderBody` pass on every drawn mesh, the option putting the
  model back, and a pass drawn only while its `when` holds.
- `modelObject.test.ts`: a model whose clips are cloned on first play reads every clip's keys at load
  without cloning one, and a clip cloned later reports its end; `BlendMesh -2`, before load and after (`blendAll`), and a pulsing `BlendMeshLightAt`;
  `ShineLight` lights the shine mesh by the tint; `ShineMeshes` puts the shine on those meshes only;
  a part unlinked from its bone goes back under its owner; an action stops every other running clip, the loader's clip 0 too;
  a character casts the blob, a map object only with `MapShadow`; `ShadowFromGround` marks the clone;
  `ShadowMeshes` keeps the other meshes out; the clone carries `ShadowAlpha` and draws from `ShadowMinAlpha`;
  no per-frame `Draw` / `DrawMesh` hook is left; `setAnimationsHeld` (the crowd options) pauses the looping clip,
  a loop started while held too, and lets a one-shot play.
- `versions/shared/contentRows.golden.test.ts`: every map's mesh animations, sampled over time.
- `pbrMaps.test.ts`: `textureSourceName` reads the pack's remembered name mid-swap.
- `pbrDerive.test.ts`: `flipRows`, flat normal and emissive mask of `derivePbrMaps`; steel and gold
  are metal candidates, tan wood and cloth are not, and roughness ignores the candidate.
- `materialQuality.test.ts`: `pbrCovers` per tier, character art and the world.
- `surfaceClass.test.ts`: `modelKey` forms; `surfaceOf` asks the registered rule, else none.
- `propBatchLight.test.ts`: `ChunkLight` re-packs match a whole-chunk re-pack on every tier.
- `propBatchRules.test.ts`: `batchExclusion`, `chunkOf`, placement and instance matrices.
- `objectShadow.test.ts`: the shadow fold, run as JS: every vertex folds as `CalcShadowPosition`, a tall
  one too; Icarus and Kalima draw no shadow; the lean is 25 tiles in Valley of Loren, 20 elsewhere.
- `propBatches.test.ts`: batches built and disposed twice over one cached model leave its buffers whole; a
  batched caster's shadow folds from the ground when it asks to (`ShadowFromGround`).
- `renderAngles.test.ts`: `angleMatrixQuaternion` against the original's `AngleMatrix`, and a
  placed record with both pitch and roll drawn by it, by its node and by its batched placement.
- `renderingStyle.test.ts`: style readers, tier gating, the material snapshot and toon binds; the
  cinematic trim is one kept object.
- `renderScale.test.ts`: slider steps, `clampRenderScale`, `applyRenderScale` on the device ratio.
- `staticClips.test.ts`: still animation detection and `settleStillAnimations`.
- `viewPlanes.test.ts`: `viewDepth`, matching `BoundingSphere.isInFrustum`.
- `babylon/bitmapDecode.test.ts`: decode options, bitmap closing, the install probe.
- `babylon/compileWait.test.ts`: a compiling shader is not given up while the page is hidden; shown,
  Babylon's 30 s wait stands and a compile error is reported at once.
- `babylon/spriteReplay.test.ts`: `renderWithReplay` reuses the frame's upload, and when it rebuilds.
- `scenes/csmBounds.test.ts`: the kept receiver box matches Babylon's sweep.
- `scenes/csmCache.test.ts`: the pinned Babylon private methods, map size and margin, `isStaticCaster`.
- `scenes/gbufferFormats.test.ts`: R32F depth and RGBA16F normals, defaults otherwise.
- `scenes/highlightMask.test.ts`: bone boxes, screen rects and hover mask selection; a skinned part
  is kept only when its posed bone boxes reach the lit box.
- `scenes/roomMask.test.ts`: the room mask's depth map follows a resize on the next tick; its answer is
  one kept object; it is not built while `openRooms` is on.
- `scenes/sunShafts.test.ts`: the shaft pass leaves and rejoins the chain with the sun.

## Notes
- `iconShot.ts`: the subject lives in the game's scene (the item materials are cached per scene) and
  waits there, masked, until its shaders and its per-mesh textures are ready (`READY_FRAMES` at most).
  Orthographic, not the original's 1 degree perspective: at that angle the two differ by well under
  a pixel. The target is cleared to transparent black, so an additive mesh leaves alpha 0 under its
  colour; `iconPixels` reads every pixel as premultiplied over black, which is exact on the dark bag.
- `materialQuality.ts`: tier 1 ("Characters") puts character art (`isCharacterAsset`: figures and the
  gear on them) on PBR with derived (or `Data/PBR/`) maps and leaves the world on the Classic Standard
  path; tier 2 puts every lit mesh on PBR with maps. Additive `_R` cards and flat-lit UI models stay
  Standard; terrain keeps its own shader. Mixing the two paths in one scene works because the PBR
  material undoes Burley's 1/pi itself (`item_fx` readme, `BURLEY_PI_GLSL`); the lights carry no gain.
- `meshAnimation.ts`: `o->BlendMeshTexCoordU/V` and `o->BlendMeshLight` depend only on `WorldTime`,
  so they are a table, not a class per object; each map keeps its own (`MapRender.meshAnimations`),
  read at run time through `maps.rowFor`. `blend` targets the object's `BlendMesh`; `stream`
  is `Models[type].StreamMesh`, textured but unlit with flat `BodyLight` (ZzzBMD.cpp:990-1001).
  C's `-(int)WorldTime % 1000` keeps the sign, so it ramps 0 to -0.999: `-(t % 1000)`.
- `ModelObject.Unlit`: `b->LightEnable = false`, a part RenderLinkObject draws (the hand weapons, the
  phoenix wings, the wings and capes, the Imp, the Blood Castle quest weapon; ZzzCharacter.cpp:6651-6652).
  The cloth (capes, robes) and the GM mark are drawn elsewhere and keep their light. On Classic its lit meshes take their flat-lit twin
  (`assets/modelLoader.ts` `setMeshUnlit`), flat BodyLight; the tiers above keep the scene's light and PBR.
- `pbrDerive.ts`: the B channel is a metal *candidate*, not metal: steel (desaturated, mid to high
  luma) or gold (hue 40-56 degrees, saturated, bright). Turned into metal on gear meshes only
  (`item_fx/pbrLooks.ts`), so world wood that reads gold stays matte; the palette alone could never
  tell gold from warm-lit oak, which is why derived metal used to be off. Roughness ignores it.
  R is painted plate (any texel that is not a dark gap), the second thing gear may turn into metal;
  the flat placeholder's R is 0, so nothing is metal before its maps exist.
- `pbrMaps.ts`: the derivation reads the texture's encoded bytes (`texture._buffer` or `texture.url`),
  decoded in a worker with `createImageBitmap` or the Basis transcoder for KTX2. GPU readback is
  only the last fallback: it stalls the frame (up to 450 ms on an integrated Radeon).
- `renderAngles.ts`: every model root is mirrored (`scaling (1,-1,1)` + `rotX(-90)`), so the
  original's `AngleMatrix` (Rz.Ry.Rx, Z-up) maps to `(-a0, -a2, -a1)`. The loader negates pitch and
  roll; yaw stays MU-positive in `transform.rot.y` and is flipped only here. Babylon applies Z, X, Y
  while the original applies X, Z, Y: they differ only with both pitch and roll set (4795 placed
  records over every world). Such a map object's node takes `renderAnglesQuaternion` (the original's
  matrix) as its `rotationQuaternion` and keeps `rotation` for its readers (particle turns, flicker
  phases); the batched placement and the light offsets always turn by it.
- `renderDistance.ts`: `visible` is the inner ring (loads first; read by ceiling flood fill, picking,
  highlights); `nearby` also loads, and only `hidden` disposes. The top step covers the whole map.
- `renderingStyle.ts`: 1 steps the sun's response; 2 adds ink lines, a stepped rim, flat textures and,
  behind toggles, grass outline and flat skill effects (Ultra also adds a highlight and hatching);
  3 puts each part on its own slider plus matcap sheen, screentone, hull or screen lines, speed lines
  and a film trim. Dev seams: `?style= ?strength= ?lineStrength= ?lineWidth= ?linePlacement=
  ?shadeSteps= ?toonSoft= ?toonRim= ?toonTex= ?toonGrass= ?grassOutline= ?animeEffects= ?toonUltra=`
  and one per 2.0 slider (`?animeShading=`, `?animeRim=`, ... `?animeImpacts=`).
- `renderScale.ts`: helps integrated GPUs (Radeon 610M at the Lorencia spawn: 15 fps at 1, 29 at 0.6);
  a discrete card is CPU bound and gains nothing. `resize` keeps the scale across monitors because
  Babylon multiplies the level by the device ratio change.
- `fpsLimit.ts`: a cap skips whole animation frames (nothing runs; the next drawn frame gets the whole dt),
  carrying the due time forward so 45 on 60 Hz averages right, with 1 ms of slack so a cap equal to the
  refresh rate drops nothing. Off (step 0) is the browser rate the client always ran at.
- `loadShed.ts`: level 1 under 2/3 of the target frame rate (the FPS limit, 60 uncapped), 2 under 2/5,
  from `framePacer.fps` re-read twice a second; a level is left over 0.85 / 0.55 of the target, one step a
  reading, so a crowd at the edge does not flicker. At level 2 other players' Fenrir body bolts stop too (idea from
  skualsito/Mu-La-Ronda 0b4d25d4a); the hero's never do.
- `objectShadow.ts`: `SHADOW_ALPHA_CUTOFF` is 0.1, not the caster's 0.25, because MU's TGAs carry
  partial alpha across whole surfaces (capes, visors) and 0.25 punched holes in the shadow. The torch
  direction slot was removed: it doubled shadows near braziers and broke indoors. `SHADOW_DILATE`
  (3 units) closes the hairline gaps between rigid body parts once flattened. `meshCasts` once
  dropped every alpha-blended mesh, which left a thin, naked shadow.
  Classic shadows what the original does: characters and their parts, and of the map objects only those
  whose case calls `RenderBodyShadow` (`MapShadow`: Blood Castle 28/29, Valley of Loren 50/83/84/85). Every
  map object once cast one, with a size gate to keep flowers and cliffs out. `ClassicShadow` turns a
  character's or part's blob off where the original draws none (a cape's model), read every frame; the
  cascades still take it (`CastsShadow`). `ShadowFromGround` folds from the terrain under the origin
  (the shader's `shadowGround`), as the original does for the boids and the Blood Castle statues;
  `ShadowAlpha` is the caster's share of `SHADOW_ALPHA` (the shader's `shadowStrength`, set per mesh at bind:
  one material for every caster), and `ShadowMinAlpha` the body alpha its shadow starts at (a player 0.5, a
  monster 0.3, `syncShadowEnabled`); `CascadeShadow` keeps a caster off
  the cascades (the boids, which have the Classic shadow alone).
  The fold (`SHADOW_FOLD`) is the original's `CalcShadowPosition`, which divides by the vertex's height
  under the 40-tile light, with no limit: the tallest monsters it shadows (Selupan's highest key is 26
  tiles up, the Hydra 16, the golden dragons 9) streak as they do there. A clamp once kept every vertex
  within 5 tiles, from when every map object cast.
- `babylon/compileWait.ts`: Babylon waits for a program with 1875 checks 16 ms apart (`Effect._checkIsReady`),
  a count, not a time. A hidden page runs them once a second or slower and the GPU does not compile
  for it, so a long AFK ran the count out and the materials came back black. The countdown stops
  while the page is hidden; the rest is Babylon's.
- `babylon/spriteLinear.ts`: decoding sprite colour on the CPU got the level right but left the soft
  skirt display-referred, and the effect composite lifted it into a pale disc. The shader gets a
  `MU_LINEAR` define and `muLinear` uniform, read on every bind.
- `scenes/csmCache.ts`: the shadow pass was 342 of 542 draws at the Devias spawn, mostly static map
  geometry. A cache hit needs the same cascade matrix (compared element by element) and static set.
  Windows are fitted `CSM_WINDOW_MARGIN` wider and held; the map grows by the same factor so texels
  per tile stay. `isStaticCaster`: prop-batch chunks plus map objects with no clip running.
- `scenes/effectMask.ts`: holds only additive geometry over black, so readers (AO combine, haze, ink,
  room mask, tone) get the surface as `colour - mask`. It borrows the first post-process target's
  depth (`RenderTargetWrapper.shareDepth`); nothing in it writes depth. Full size and half float: half
  resolution loses thin streaks, 8 bits clamps flames. The size is explicit, because a ratio resize
  would dispose the borrowed depth buffer.
- `scenes/fireflyGuard.ts`: bloom spreads a pixel by its value, so one aliased grass fragment (32 vs a
  torch's 4) became a floating ball of light. The guard runs on the linear buffer before the
  pipeline. Off on Classic, with bloom off, and when the tone pass is live.
- `scenes/highlightMask.ts`: Babylon draws every active mesh into the hover mask, unlit ones black.
  The list keeps the lit meshes and what can reach their screen box: a static mesh by the narrowed
  frustum, a skinned one (its culling box is not trusted) by its posed bone boxes, anything else
  whole. Worn parts were most of a crowd's mask draws before the skinned test.
- `scenes/heightFog.ts`: `EFFECT_HAZE_SHARE` was a fixed 12 tiles, past every outdoor `fog.start`, so
  edge torches burned at full HDR over hazed ground. A look's `fog.fromTarget` adds the camera radius
  to `start`, so the haze starts that far past the hero at every zoom (Chaos Castle).
- `scenes/hullOutline.ts`: Babylon's outline renderer redraws back faces pushed out along normals:
  cheap, exact silhouettes, but no creases and gaps at split normals, so it is an option, not the
  default. Figures only. Width is world space, so it thins with distance.
- `scenes/inkOutline.ts`: reciprocal depth is linear across a flat surface, so the second difference
  of two neighbours finds silhouettes; a sudden normal turn with continuous depth is a crease. Sky
  (depth 0) never inks. With skill effects on, the additive half is snapped to the shade steps and
  contoured in its own darker colour.
- `scenes/renderList.ts`: Babylon's `renderListPredicate` empties and refills each list per frame,
  dirtying every mesh's light defines twice per pass (about 2 ms of a 19 ms Noria frame). `scene`
  lists pick from every mesh (shadows need casters behind the camera); `active` lists from the
  frustum (G-buffer, glow, effect mask).
- `scenes/roomMask.ts`: per pixel, the world position from its own depth renderer is kept when inside
  the room box, or when the camera ray leaves the wall box through a side (a door or window). Roof and
  floor are not walls. Not the G-buffer, which skips alpha-keyed props. Babylon sizes that renderer's
  map once (depthRenderer.js:84); the sync keeps it the frame's size, or after a window or render-scale
  resize its upscaled depth put the front wall's depth on the floor beside it and blacked it. The `openRooms` improvement (Ultra) skips the pass.
- `scenes/speedLines.ts`: reading hero speed from the ECS would add a seam; the camera follows the
  hero, so its travel is used. Streaks are 220 hashed angle cells faded in from 0.35 of the half
  diagonal, so the centre stays clear.
- `scenes/toneMap.ts`: mappers 0 clip, 1 MU curve (Reinhard shoulder plus a toe on luminance, chroma
  kept), 2 ACES, 3 Khronos neutral, the last two copied from `imageProcessingFunctions`. The composite
  puts the effect mask back as `(e / keyGain)^(1/2.2)` with the original's add and clamp at 1.
- `scenes/upscale.ts`: Babylon sizes a post target from the camera's output target, not the pass
  before (`postProcess.js:584`), and the scene renders into the first pass's target sized from the
  screen (`scene.js:3690`). So it sets a reduced `camera.outputRenderTarget` plus a first entry pass at
  ratio `scale`, then runs EASU and RCAS from `onAfterRenderObservable`. When it is off,
  `renderScale.ts` shrinks the drawing buffer instead; `app/boot.tsx` picks one.
