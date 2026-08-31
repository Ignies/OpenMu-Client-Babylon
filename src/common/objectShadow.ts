import {
  Color3,
  Constants,
  CustomMaterial,
  Material,
  Mesh,
  type AbstractMesh,
  type Scene,
  type Texture,
  type TransformNode,
  GlowLayer,
} from '../libs/babylon/exports';
import { getEmptyTexture } from '../libs/babylon/emptyTexture';
import { TERRAIN_SIZE, TILE_CM } from './terrain/consts';
import { ENUM_WORLD } from './types';
import { GameOptions } from './gameOptions';
import { blobShadowRefresh, csmActive } from './lightingQuality';
import {
  TERRAIN_HEIGHT_SCALE,
  getTerrainHeightMap,
} from '../libs/mu/terrainHeightMap';


const SHADOW_SX = 2000 / TILE_CM;
const SHADOW_SY = 4000 / TILE_CM;

const GROUND_OFFSET = 5 / TILE_CM;

/**
 * How dark a shadowed pixel lands. `RenderBodyShadow` uses
 * `glColor4f(0, 0, 0, 0.5)`; this sits above it because the original draws
 * onto a terrain that is already dimmed by its own vertex lighting, and this
 * one draws onto a lit, tone-mapped floor where a flat half-black reads as a
 * grey smudge — most visibly on snow, where the ground is the brightest thing
 * on screen. The stencil below still means overlaps never deepen it, so this
 * is the shadow's one and only value.
 */
const SHADOW_ALPHA = 0.62;

/**
 * `EnableAlphaTest` — glAlphaFunc(GL_GREATER, 0.25), ZzzOpenglUtil.cpp:395.
 * The silhouette is cut by the caster's own texture at the same threshold the
 * caster is drawn with, so a mesh that is a card with a shape keyed into it
 * (a sword's guard, a wing membrane, a leaf spray) throws that shape and not
 * its quad.
 *
 * The original does not do this — `RenderBodyShadow` calls `DisableTexture()`
 * and every triangle lands solid. It gets away with it because it only ever
 * shadows body parts and weapons, whose meshes *are* their silhouette; the
 * blobs here also cover map objects, where an untextured card reads as a
 * black rectangle on the floor.
 *
 * Well below the 0.25 the caster itself is drawn with, though, and
 * deliberately: the caster is keyed to hide a card's corners, the shadow is
 * keyed only to find the silhouette's outline. MU's TGAs carry partial alpha
 * across whole surfaces and not just along a key's edge — a cape's weave, a
 * skirt's hem, a wing membrane, a helmet's visor — and at 0.25 every one of
 * those surfaces fell under the test and punched a hole clean through the
 * middle of the shadow, along the seam of whichever body part wore it. At 0.1
 * only a texel the artist actually keyed out is cut, which is the outline and
 * nothing else, and the interior lands solid the way the original's does.
 */
const SHADOW_ALPHA_CUTOFF = 0.1;

/**
 * ### Why there is only one slot, and only the sun direction
 *
 * There was a second projection here: the silhouette a torch throws across the
 * floor *away from the flame*, on its own stencil bit, with the blob under a
 * character warped between the two. It was removed on request — outdoors it
 * put a second shadow under everything within reach of a brazier, and indoors
 * it exposed three separate faults at once: the room's own walls and roof cast
 * across the floor they enclose (the Lorencia pub's roof is lifted 100 units
 * out of view while the hero is inside, and went on casting from up there),
 * every long weapon smeared into a streak because the projection stretches a
 * caster by its height, and the furniture that should have cast did not,
 * because `ModelObject.BLOB_SHADOW_MIN_HEIGHT` is measured against the tallest
 * single mesh, and a table is a thin top on thin legs.
 *
 * Each of those is fixable. Together they are a feature that needs a real
 * shadow map rather than a projection, and the cascades already are one. So:
 * one slot, the sun direction, and the CSM replaces it wherever it runs.
 */
const SHADOW_STENCIL_BITS = [0x80] as const;

export const SHADOW_SLOTS = SHADOW_STENCIL_BITS.length;

const SHADOW_FADE_START = 250 / TILE_CM;
const SHADOW_FADE_END = 600 / TILE_CM;

/**
 * How far the silhouette is pushed out along its own surface normal, in MU
 * units, before it is projected.
 *
 * A MU body is not one skin. It is a stack of separate BMDs — body, helm,
 * armour, pants, gloves, boots, plus whatever is in each hand — and inside
 * each of those every vertex is bound rigidly to exactly one bone
 * (`bmdToGlb`: `weightsArray.push(1, 0, 0, 0)`). Nothing blends across a
 * joint, so wherever two pieces meet they simply overlap, and the overlap is
 * only as deep as the artist left it. Seen in 3D that is invisible — one
 * piece is in front of the other. Flattened onto the floor it is not: the
 * two silhouettes are laid side by side in the same plane, and every place
 * their overlap ran out shows as a bright hairline of unshadowed ground —
 * around the neck, at each elbow and knee, where a boot meets a shin. A
 * shadow that ought to be one shape arrives as a pile of parts.
 *
 * Growing each piece by a hair along its own normal makes the overlaps deep
 * enough to survive being flattened, and the seams close. Only the horizontal
 * part of the normal is used, because the vertical part cannot change a
 * silhouette that has already been squashed flat — see the vertex block.
 *
 * Kept small: this is the whole outline growing, not just the joints, so it
 * is also what the shadow's edge costs in accuracy. Three units is under a
 * tenth of a limb's width and roughly what the joints were short by.
 */
const SHADOW_DILATE = 3 / TILE_CM;

/**
 * How far above the sampled ground the flattened shadow sits, in world units.
 * The vertex block reads the height from the bilinear heightmap while the
 * terrain mesh is two triangles per tile, so on any slope the two disagree by
 * a hair and the shadow would z-fight or dip under the floor. Two units is
 * more than that disagreement on walkable ground and less than a boot sole,
 * so the caster's own feet still win the depth test against it.
 */
const SHADOW_LIFT = 2 / TILE_CM;

const shadowMaterials: (CustomMaterial | null)[] = [];

function createShadowMaterial(scene: Scene, slot: number): CustomMaterial {
  const material = new CustomMaterial(`objectShadow${slot}`, scene);

  material.diffuseColor = Color3.Black();
  material.specularColor = Color3.Black();
  material.emissiveColor = Color3.Black();
  material.ambientColor = Color3.Black();
  material.disableLighting = true;

  // Deliberately 1 rather than SHADOW_ALPHA. This value never reaches the
  // blend — the shadow's opacity is assigned in the fragment below — but it
  // does reach the alpha *test*, because Babylon folds it in before the
  // compare: `alpha = vDiffuseColor.a * texel.a`, then `alpha < alphaCutOff`
  // (ALPHATEST_AFTERALLALPHACOMPUTATIONS, which any explicit
  // `transparencyMode` turns on — default.fragment:246). At 0.5 the test read
  // `texel.a < 0.5`, five times the threshold below, and every soft key went
  // with it: a feathered wing edge, hair, a fringe, a blade's ground bevel.
  material.alpha = 1;

  // Alpha-keyed casters cut their own silhouette (see SHADOW_ALPHA_CUTOFF).
  // The texture is a per-mesh bind in `onBindObservable` below, exactly as on
  // the shared item material; this one is the placeholder that compiles the
  // DIFFUSE / ALPHATEST / ALPHAFROMDIFFUSE defines in. `diffuseColor` is
  // black, so the texel only ever reaches the alpha.
  material.diffuseTexture = getEmptyTexture(scene);
  material.useAlphaFromDiffuseTexture = true;
  material.transparencyMode = Material.MATERIAL_ALPHATESTANDBLEND;
  material.alphaCutOff = SHADOW_ALPHA_CUTOFF;
  material.backFaceCulling = false;

  material.disableDepthWrite = true;

  // A constant depth bias only — enough to beat the coplanar ground it was
  // just draped on (with SHADOW_LIFT), never the caster. The slope-scaled
  // `zOffset = -2` that stood here pulled a flattened polygon seen at the
  // camera's grazing angle far enough forward to beat the character's legs:
  // on Classic the weapon's shadow was drawn *through* the character. CSM
  // never had the problem, and now neither does this.
  material.zOffset = 0;
  material.zOffsetUnits = -2;

  const bit = SHADOW_STENCIL_BITS[slot];

  material.stencil.enabled = true;
  material.stencil.func = Constants.NOTEQUAL;
  material.stencil.funcRef = bit;
  material.stencil.funcMask = bit;
  material.stencil.opStencilFail = Constants.KEEP;

  material.stencil.opDepthFail = Constants.KEEP;

  material.stencil.opStencilDepthPass = Constants.REPLACE;

  material.stencil.mask = bit;

  material.AddUniform('shadowOrigin', 'vec3', undefined);
  material.AddUniform('shadowParams', 'vec4', undefined);
  material.AddUniform('terrainHeightMap', 'sampler2D', undefined);

  // The silhouette dilation (SHADOW_DILATE) needs the caster's normals, and
  // nothing else in this pass does — `disableLighting` is on, there is no
  // bump map and no reflection, so `_needNormals` is false and Babylon leaves
  // the NORMAL define, the attribute and `vNormalW` out of the compiled
  // shader (`PrepareDefinesForAttributes`, materialHelper.functions:708).
  // Ask for the buffer explicitly and declare the attribute ourselves, under
  // the guard that keeps this from colliding with Babylon's own declaration
  // if some later change ever does turn NORMAL on.
  material.AddAttribute('normal');

  material.Vertex_Definitions(`
    #ifndef NORMAL
      attribute vec3 normal;
    #endif

    varying float vShadowHeight;
  `);

  material.Vertex_After_WorldPosComputed(`
    // Grow the caster before flattening it — see SHADOW_DILATE. finalWorld
    // already carries this vertex's bone (Babylon's bonesVertex include folds
    // the skinning matrix into it a few lines above), so this is the normal
    // in the same posed world space worldPos is in.
    //
    // Only the horizontal component is kept. The projection below overwrites
    // worldPos.y with the terrain height, so anything pushed along the
    // vertical part of the normal is thrown away a moment later; on a
    // top-facing polygon that leaves no dilation at all, which is right —
    // those are the interior of the silhouette, not its outline. Faces that
    // do bound the outline, and the ring of faces around the open end of
    // every limb segment, all point sideways and get the full push.
    vec3 shadowNormalW = mat3(finalWorld) * normal;
    vec2 shadowNormalXZ = vec2(shadowNormalW.x, shadowNormalW.z);
    float shadowNormalLen = length(shadowNormalXZ);

    if (shadowNormalLen > 0.0001) {
      // A mesh with no normals binds this attribute to (0,0,0) rather than
      // failing, so the guard doubles as the fallback: no normals, no
      // dilation, and the shadow is what it was.
      worldPos.xz +=
        (shadowNormalXZ / shadowNormalLen) * ${SHADOW_DILATE.toFixed(5)};
    }

    vec3 shadowRel = worldPos.xyz - shadowOrigin.xyz;

    float shadowDenom = min(shadowRel.y - shadowParams.y, -0.001);

    float shadowCasterY = worldPos.y;

    vec2 shadowSun = vec2(
      shadowOrigin.x + shadowRel.x
        + (shadowRel.y * (shadowRel.x + shadowParams.x)) / shadowDenom,
      worldPos.z
    );

    worldPos.x = shadowSun.x;
    worldPos.z = shadowSun.y;

    vec2 shadowUV = (vec2(worldPos.x, worldPos.z) + 0.5) / ${TERRAIN_SIZE}.0;

    float shadowGroundY =
      texture2D(terrainHeightMap, shadowUV).r * shadowParams.w
      + shadowParams.z;

    worldPos.y = shadowGroundY + ${SHADOW_LIFT.toFixed(5)};

    vShadowHeight = shadowCasterY - shadowGroundY;
  `);

  material.Fragment_Definitions('varying float vShadowHeight;');

  material.Fragment_Before_FragColor(`
    // Flat, from SHADOW_ALPHA, the way glColor4f(0, 0, 0, 0.5) is flat in
    // RenderBodyShadow — and not the
    // texel's alpha, which Babylon has already multiplied in by this point
    // (ALPHAFROMDIFFUSE, default.fragment:114). The texture is in this pass to
    // cut the key and for nothing else. MU's TGAs carry partial alpha across
    // whole surfaces and not only along a key's edge — a cape's weave, a wing
    // membrane, a lantern's glass — so letting it through faded each shadow in
    // proportion to how see-through its caster was, and a shadow that is a
    // little bit of everything is the one that reads as too thin. The original
    // samples no texture here at all: every triangle it keeps lands solid 50%
    // black, and overlaps do not deepen it (the stencil above).
    color.a = ${SHADOW_ALPHA.toFixed(3)};

    color.a *= 1.0 - smoothstep(
      ${SHADOW_FADE_START.toFixed(4)},
      ${SHADOW_FADE_END.toFixed(4)},
      vShadowHeight
    );

    if (color.a < 0.004) discard;
  `);

  material.onBindObservable.add(mesh => {
    const effect = material.getEffect();
    if (!effect) return;

    // The caster's own texture, carried onto the clone by `createOneShadow`.
    // Only its alpha is read (the material's diffuse colour is black), and
    // only to cut the key — see SHADOW_ALPHA_CUTOFF.
    effect.setTexture(
      'diffuseSampler',
      (mesh.metadata?.diffuseTexture as Texture | undefined) ??
        getEmptyTexture(mesh.getScene())
    );

    const heightMap = getTerrainHeightMap();
    if (!heightMap) return;

    const origin = (
      mesh.metadata?.shadowOriginNode as TransformNode | undefined
    )?.getAbsolutePosition();

    effect.setFloat3(
      'shadowOrigin',
      origin?.x ?? 0,
      origin?.y ?? 0,
      origin?.z ?? 0
    );

    effect.setFloat4(
      'shadowParams',
      SHADOW_SX,
      SHADOW_SY,
      GROUND_OFFSET,
      TERRAIN_HEIGHT_SCALE
    );

    effect.setTexture('terrainHeightMap', heightMap);
  });

  material.freeze();

  return material;
}

function getShadowMaterial(scene: Scene, slot: number): CustomMaterial {
  const existing = shadowMaterials[slot];

  if (!existing || existing.getScene() !== scene) {
    const created = createShadowMaterial(scene, slot);

    shadowMaterials[slot] = created;

    return created;
  }

  return existing;
}

/**
 * Worlds where nothing casts a ground shadow.
 *
 * Icarus is the whole set. `RenderTerrain` is skipped there
 * (MainScene.cpp:402), so there is no floor for a blob to land on — the
 * projection would hang in the void at terrain height, under islands it has
 * no relationship to. The original suppresses every shadow on this world
 * explicitly and separately: mounts, fenrir and weapons in `Draw_RenderObject`
 * (ZzzObject.cpp:761, 836, 971), characters and monsters in `ZzzCharacter.cpp`
 * (:8384, :8459), items in `RenderPartObjectEffect` (:9378, :10403) and the
 * boids in `GOBoid.cpp`. One set is the same rule stated once.
 */
const SHADOWLESS_WORLDS: ReadonlySet<ENUM_WORLD> = new Set([
  ENUM_WORLD.WD_10ICARUS,
]);

let shadowsAllowed = true;

/**
 * Called on every map change. Kept as a set-on-load flag rather than a lookup
 * inside `blobShadowsActive` because that runs per object per frame, and the
 * answer only ever changes when the world does.
 */
export function setShadowWorld(world: ENUM_WORLD): void {
  const next = !SHADOWLESS_WORLDS.has(world);

  if (next === shadowsAllowed) return;

  shadowsAllowed = next;
  invalidateShadowState();
}

/**
 * The projected sun blob — the Classic-tier shadow, and the only one this
 * module still draws. On Enhanced/Ultra the cascades own the sun, and two sun
 * shadows read wrong, so the blob steps aside.
 *
 * `GameOptions.shadows` is the player's "Object shadows" toggle. It gates the
 * cascades too (`enhancedLighting`), so unchecking it removes every shadow in
 * the scene rather than only the tier that happens to be running.
 */
export function blobShadowsActive(): boolean {
  return shadowsAllowed && GameOptions.shadows && !csmActive();
}

/**
 * Bumped whenever something that `blobShadowsActive` depends on changes (the
 * shadows toggle, the lighting tier taking the sun off the blobs). Each
 * `ModelObject` re-applies its own slots' enabled state when it sees a new
 * value, instead of this walking every mesh in the scene — and, unlike that
 * walk, it composes with the per-object frustum gate.
 */
let shadowStateSerial = 0;

export function shadowStateVersion(): number {
  return shadowStateSerial;
}

export function invalidateShadowState(): void {
  shadowStateSerial++;
}

blobShadowRefresh.fn = invalidateShadowState;

/** Which of a caster's meshes are in its silhouette. */
export type ShadowMeshRules = {
  /**
   * `o->BlendMesh` casts with the rest of the body. Off everywhere the
   * original has it off, which is everywhere — see `WingObject`.
   */
  readonly blendMesh: boolean;
  /**
   * Alpha-keyed meshes cast, cut by their own texture (SHADOW_ALPHA_CUTOFF).
   *
   * On for characters and their gear, which is what the original's shadow
   * pass covers and where the key *is* the shape — armour trim, robes,
   * skirts, a weapon's blade. Off for map objects, which are this project's
   * own extension of the pass and carry cards the original never meant to
   * cast: the pre-baked shadow decals under Lorencia's bridges would throw a
   * second, real shadow of themselves, and every barred gate its own bars.
   */
  readonly keyed: boolean;
};

/**
 * One projected blob for `slot`, or null when this caster has nothing to
 * project. Built on demand — every clone is a full copy of the caster's
 * submesh hierarchy and a second set of draw calls, so on a tier where the
 * slot never activates it should never exist.
 */
export function createObjectShadow(
  root: AbstractMesh,
  parent: TransformNode,
  originNode: TransformNode,
  slot: number,
  rules: ShadowMeshRules
): AbstractMesh | null {
  if (!(root instanceof Mesh)) return null;

  return createOneShadow(root, parent, originNode, slot, rules);
}

function createOneShadow(
  root: Mesh,
  parent: TransformNode,
  originNode: TransformNode,
  slot: number,
  rules: ShadowMeshRules
): AbstractMesh | null {
  const clone = root.clone(`${root.name}_shadow${slot}`, parent, false);
  if (!clone) return null;

  const material = getShadowMaterial(root.getScene(), slot);

  let hasGeometry = false;

  for (const mesh of [clone, ...clone.getChildMeshes(false)]) {
    // `AddMeshShadowTriangles` (ZzzBMD.cpp:2295) walks every mesh of the body
    // and skips exactly two: the one the object nominated as `BlendMesh` —
    // an additive glow card, which is light, not matter — and `HiddenMesh`,
    // which is not drawn at all. Everything else casts, alpha-keyed or not.
    //
    // The rule here used to drop every mesh whose material needed alpha
    // blending, which after `modelLoader`'s TGA → ALPHATESTANDBLEND promotion
    // is most of what a character wears: the shadow lost the armour's keyed
    // trim and its robes, all of a BLEND-textured weapon, and every wing —
    // which is why it read as a thin, naked body. It survives for map objects
    // only, as `rules.keyed`.
    const blendMesh = mesh.metadata?.brightMesh === true;
    const hidden =
      mesh.metadata?.hiddenByScript === true || mesh.isVisible === false;
    const keyed = mesh.material?.needAlphaBlending() === true;

    if (hidden || (blendMesh && !rules.blendMesh) || (keyed && !rules.keyed)) {
      if (mesh !== clone) mesh.dispose(false, false);
      continue;
    }

    const casterTexture = mesh.metadata?.diffuseTexture as Texture | undefined;

    mesh.material = material;
    mesh.isPickable = false;
    mesh.receiveShadows = false;
    mesh.alwaysSelectAsActiveMesh = true;
    mesh.doNotSyncBoundingInfo = true;

    mesh.visibility = 1;

    mesh.metadata = {
      SkipBoundingBox: true,
      shadowOriginNode: originNode,
      diffuseTexture: casterTexture,
    };

    // The glow layer draws every mesh into its emissive pass with its own
    // vertex shader — no ground projection — so a clone would sit on the
    // character as a black, depth-writing copy and mask its glow. Keep the
    // clones out of every effect layer.
    for (const layer of root.getScene().effectLayers) {
      if (layer instanceof GlowLayer) layer.addExcludedMesh(mesh as Mesh);
    }

    mesh.setEnabled(blobShadowsActive());

    if (mesh.getTotalVertices() > 0) hasGeometry = true;
  }

  if (!hasGeometry) {
    clone.dispose(false, false);
    return null;
  }

  return clone;
}
