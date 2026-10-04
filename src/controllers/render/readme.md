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
- `modelObject.ts`: `ModelObject`, the base class of every drawn model (actors, map objects, npcs,
  drops, pets); `PartPose`, `BodyShine`, `HIDDEN_MESH_ALL`.
- `scenes/testScene.ts`: `TestScene`, the game's `Scene` with its camera, highlight layer and look.
- `scenes/sceneLook.ts`: `setAreaMood`, `requestGlowProbe`, `updateSceneLook` (glow layer, areas).
- `scenes/<pass>.ts`: `sync<Pass>` / `dispose<Pass>` and `createPostChain`, called by
  `lighting/director.ts` only. `scenes/shadows.ts` also hands the terrain its CSM hook
  (`registerTerrainMaterial`, `terrainCsmDefines`, `terrainCsmGlsl`, `bindTerrainCsm`).
- `propBatches.ts`: `propBatchingActive`, `propBatchExclusion`, `addPropToBatch`,
  `flushPropBatches`, `updatePropBatches`, `disposePropBatches`.
- `objectShadow.ts`: `setShadowWorld`, `invalidateShadowState`.
- options: `materialQuality.ts`, `renderingStyle.ts`, `renderScale.ts`, `renderDistance.ts` (slider
  steps and readers for the Options window, the materials and boot).
- `pbrMaps.ts`: `pbrMapsFor`, `pbrMapsIfReady`, `textureSourceName`; `readPackLabelsWith(reader)`, the
  texture pack's remembered names, which `textureSourceName` asks first (set by `assets/modelLoader.ts`).
- `index.ts`: the types below, `ModelObject` (the pets controller extends it) and `HIDDEN_MESH_ALL` for
  map object classes.
- `MapRender`, `MeshAnimation`, `MeshAnimations` (`meshAnimation.ts`, types on `index.ts`): a map's own
  render row, `MapLayer.render`.
- helpers: `boneLink.ts` (bone-link matrices), `meshAnimation.ts` (`meshAnimationFor`),
  `renderAngles.ts` (`toRenderAngles`), `viewPlanes.ts`, `frameSnapshot.ts`, `textureScript.ts`,
  `sceneCover.ts`, `blendMeshes.ts`, `effectOnlyObjects.ts`, `perfOverlay.ts` (Shift+Ctrl+Alt+P).
- `configFingerprint.ts`: `configFingerprintLines()` and friends, every game option packed into a hex
  string for the perf overlay.

## How it works
- `ModelObject.load(gltf)` puts a GLB under the object's node with the BMD to Babylon basis change
  (`scaling (1,-1,1)`, `rotX(-90)`), sets per-mesh metadata (body light, shine, shadow flags) and
  applies `BlendMesh`, `BrightMesh`, `HiddenMesh`, `HideSkin`, mesh animations and the blob shadow.
  Map objects also drop still clips (`staticClips.ts`) and mark themselves static CSM casters.
- `textureScript.ts` reads a texture name's `_R/_H/_S/_N/_DC/_DT` suffix for the model loader.
- `propBatches.ts` draws map scenery as thin instances, one mesh per type, submesh and 32-tile chunk
  (`propBatchRules.ts`); one real `ModelObject` per type is the never-drawn prototype.
- The look director (`lighting/director.ts`) syncs the passes each tick in this order: shadows,
  upscale, effect mask, AO, ink outline, hull outline, speed lines, haze, room mask, sun shafts,
  tone map, firefly guard, then the post chain (`moveToEnd` when a pass ahead was rebuilt).
- Each pass takes the lighting tier and the post option from the director. On Classic (no tier)
  the effect mask, AO, haze and tone pass are not built, and the style readers answer "off".

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
- `configFingerprint.test.ts`: `configuration_hex.md` matches the options, the layout and lengths,
  the number bias round trip, and the pack digest.
- `frameSnapshot.test.ts`: fills once per frame and per scene, refills after a throw.
- `meshAnimation.test.ts`: `meshAnimationFor` reads the map row per world.
- `versions/shared/contentRows.golden.test.ts`: every map's mesh animations, sampled over time.
- `pbrMaps.test.ts`: `textureSourceName` reads the pack's remembered name mid-swap.
- `pbrDerive.test.ts`: `flipRows`, flat normal and emissive mask of `derivePbrMaps`.
- `propBatchLight.test.ts`: `ChunkLight` re-packs match a whole-chunk re-pack on every tier.
- `propBatchRules.test.ts`: `batchExclusion`, `chunkOf`, placement and instance matrices.
- `renderingStyle.test.ts`: style readers, tier gating, the material snapshot and toon binds.
- `renderScale.test.ts`: slider steps, `clampRenderScale`, `applyRenderScale` on the device ratio.
- `staticClips.test.ts`: still animation detection and `settleStillAnimations`.
- `viewPlanes.test.ts`: `viewDepth`, matching `BoundingSphere.isInFrustum`.
- `babylon/bitmapDecode.test.ts`: decode options, bitmap closing, the install probe.
- `babylon/spriteReplay.test.ts`: `renderWithReplay` reuses the frame's upload, and when it rebuilds.
- `scenes/csmBounds.test.ts`: the kept receiver box matches Babylon's sweep.
- `scenes/csmCache.test.ts`: the pinned Babylon private methods, map size and margin, `isStaticCaster`.
- `scenes/gbufferFormats.test.ts`: R32F depth and RGBA16F normals, defaults otherwise.
- `scenes/highlightMask.test.ts`: bone boxes, screen rects and hover mask selection.
- `scenes/sunShafts.test.ts`: the shaft pass leaves and rejoins the chain with the sun.

## Notes
- `materialQuality.ts`: tiers 1 and 2 put every lit mesh on PBR; they differ only in which meshes get
  derived (or `Data/PBR/`) maps, the rest bind flat placeholders. Additive `_R` cards and flat-lit UI
  models stay Standard; terrain keeps its own shader. All lit meshes must move together because
  `directLightGain` (pi, to undo Burley's 1/pi) applies to every light at once.
- `meshAnimation.ts`: `o->BlendMeshTexCoordU/V` and `o->BlendMeshLight` depend only on `WorldTime`,
  so they are a table, not a class per object; each map keeps its own (`MapRender.meshAnimations`),
  read at run time through `maps.rowFor`. `blend` targets the object's `BlendMesh`; `stream`
  is `Models[type].StreamMesh`, textured but unlit with flat `BodyLight` (ZzzBMD.cpp:990-1001).
  C's `-(int)WorldTime % 1000` keeps the sign, so it ramps 0 to -0.999: `-(t % 1000)`.
- `pbrMaps.ts`: the derivation reads the texture's encoded bytes (`texture._buffer` or `texture.url`),
  decoded in a worker with `createImageBitmap` or the Basis transcoder for KTX2. GPU readback is
  only the last fallback: it stalls the frame (up to 450 ms on an integrated Radeon).
- `renderAngles.ts`: every model root is mirrored (`scaling (1,-1,1)` + `rotX(-90)`), so the
  original's `AngleMatrix` (Rz.Ry.Rx, Z-up) maps to `(-a0, -a2, -a1)`. The loader negates pitch and
  roll; yaw stays MU-positive in `transform.rot.y` and is flipped only here. Babylon applies Z, X, Y
  while the original applies X, Z, Y: they differ only with both pitch and roll set.
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
- `objectShadow.ts`: `SHADOW_ALPHA_CUTOFF` is 0.1, not the caster's 0.25, because MU's TGAs carry
  partial alpha across whole surfaces (capes, visors) and 0.25 punched holes in the shadow. The torch
  direction slot was removed: it doubled shadows near braziers and broke indoors. `SHADOW_DILATE`
  (3 units) closes the hairline gaps between rigid body parts once flattened. `meshCasts` once
  dropped every alpha-blended mesh, which left a thin, naked shadow; now that rule is map objects only.
- `modelObject.ts`: `BLOB_SHADOW_MAX_FOOTPRINT` (4 tiles): on cliffs and walls the projection flattens
  onto the rock's own face and leans several tiles; their shading is already baked.
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
  floor are not walls. Not the G-buffer, which skips alpha-keyed props.
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
