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
} from './babylon/exports';
import { getEmptyTexture } from './babylon/emptyTexture';
import { sunLightOf } from '../lighting/keyRig';
import { TERRAIN_SIZE, TILE_CM } from '../terrain/consts';
import { ENUM_WORLD } from '../../core/types';
import { GameOptions } from '../../features/options/gameOptions';
import { blobShadowRefresh, csmActive } from '../lighting/lightingQuality';
import {
  TERRAIN_HEIGHT_SCALE,
  getTerrainHeightMap,
} from '../terrain/terrainHeightMap';


const SHADOW_SX = 2000 / TILE_CM;
const SHADOW_SY = 4000 / TILE_CM;

const GROUND_OFFSET = 5 / TILE_CM;

/**
 * How dark a shadowed pixel lands. `RenderBodyShadow` uses
 * `glColor4f(0, 0, 0, 0.5)`; this sits above it because the original draws
 * onto a terrain that is already dimmed by its own vertex lighting, and this
 * one draws onto a lit, tone-mapped floor where a flat half-black reads as a
 * grey smudge - most visibly on snow, where the ground is the brightest thing
 * on screen. The stencil below still means overlaps never deepen it, so this
 * is the shadow's one and only value.
 *
 * The Classic value of the one shadow rule (lighting_polish ARCHITECTURE
 * §4.4): the blob keeps this alpha whatever the policy says, because Classic
 * is the reference and does not move.
 */
const SHADOW_ALPHA = 0.65;

/**
 * Alpha cut for the silhouette. `EnableAlphaTest` is 0.25 (ZzzOpenglUtil.cpp:395);
 * 0.1 cuts only keyed-out texels, so partly transparent cloth still casts.
 */
const SHADOW_ALPHA_CUTOFF = 0.1;

/**
 * One slot, the sun direction only (a torch slot was removed). The CSM replaces
 * the blob wherever it runs.
 */
const SHADOW_STENCIL_BITS = [0x80] as const;

export const SHADOW_SLOTS = SHADOW_STENCIL_BITS.length;

const SHADOW_FADE_START = 250 / TILE_CM;
const SHADOW_FADE_END = 600 / TILE_CM;

/**
 * How far the silhouette is pushed out along its horizontal normal before it is
 * projected, so the seams between rigid body parts close.
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
  // blend - the shadow's opacity is assigned in the fragment below - but it
  // does reach the alpha *test*, because Babylon folds it in before the
  // compare: `alpha = vDiffuseColor.a * texel.a`, then `alpha < alphaCutOff`
  // (ALPHATEST_AFTERALLALPHACOMPUTATIONS, which any explicit
  // `transparencyMode` turns on - default.fragment:246). At 0.5 the test read
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

  // A constant depth bias only - enough to beat the coplanar ground it was
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
  // The lean axis, from the key rig's sun (lighting_rework.md §5.2): the
  // unit horizontal direction the projection folds the caster along. (1, 0)
  // reproduces the old hardcoded +X formula exactly.
  material.AddUniform('shadowSunDir', 'vec2', undefined);
  material.AddUniform('terrainHeightMap', 'sampler2D', undefined);

  // The silhouette dilation (SHADOW_DILATE) needs the caster's normals, and
  // nothing else in this pass does - `disableLighting` is on, there is no
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
    // Grow the caster before flattening it - see SHADOW_DILATE. finalWorld
    // already carries this vertex's bone (Babylon's bonesVertex include folds
    // the skinning matrix into it a few lines above), so this is the normal
    // in the same posed world space worldPos is in.
    //
    // Only the horizontal component is kept. The projection below overwrites
    // worldPos.y with the terrain height, so anything pushed along the
    // vertical part of the normal is thrown away a moment later; on a
    // top-facing polygon that leaves no dilation at all, which is right -
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

    #ifdef INSTANCES
      // A prop batch (common/propBatches.ts): the caster is one thin
      // instance, and its origin is the instance matrix's translation - the
      // loader's basis change carries none, so this is the record's position.
      vec3 shadowOriginI = (world * mat4(world0, world1, world2, world3))[3].xyz;
    #else
      vec3 shadowOriginI = shadowOrigin.xyz;
    #endif

    vec3 shadowRel = worldPos.xyz - shadowOriginI;

    float shadowDenom = min(shadowRel.y - shadowParams.y, -0.001);

    float shadowCasterY = worldPos.y;

    // The original's projection folds the caster along a single horizontal
    // axis (RenderBodyShadow hardcodes +X). Rotate into the sun frame
    // instead: shadowA runs along the lean axis and takes the original's
    // perspective fold, shadowB runs across it and passes through. With
    // shadowSunDir = (1, 0) this is bit-for-bit the old formula, and with
    // the rig's sun every tier's blobs lean the same way the CSM projects.
    vec2 shadowAcross = vec2(-shadowSunDir.y, shadowSunDir.x);
    float shadowA = dot(shadowRel.xz, shadowSunDir);
    float shadowB = dot(shadowRel.xz, shadowAcross);

    shadowA += (shadowRel.y * (shadowA + shadowParams.x)) / shadowDenom;

    worldPos.x = shadowOriginI.x
      + shadowSunDir.x * shadowA + shadowAcross.x * shadowB;
    worldPos.z = shadowOriginI.z
      + shadowSunDir.y * shadowA + shadowAcross.y * shadowB;

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
    // RenderBodyShadow - and not the
    // texel's alpha, which Babylon has already multiplied in by this point
    // (ALPHAFROMDIFFUSE, default.fragment:114). The texture is in this pass to
    // cut the key and for nothing else. MU's TGAs carry partial alpha across
    // whole surfaces and not only along a key's edge - a cape's weave, a wing
    // membrane, a lantern's glass - so letting it through faded each shadow in
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
    // only to cut the key - see SHADOW_ALPHA_CUTOFF.
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

    // Lean axis from the rig's sun. The fold above pushes toward -axis for
    // a caster above its origin, so the axis is the *negated* horizontal of
    // the light's travel direction - the blob then extends away from the
    // sun, the same way the CSM projects. No rig (login scenes) keeps the
    // old +X-formula lean.
    const sun = sunLightOf(mesh.getScene());
    let axisX = 1;
    let axisZ = 0;
    if (sun) {
      const d = sun.direction;
      const len = Math.hypot(d.x, d.z);
      if (len > 1e-4) {
        axisX = -d.x / len;
        axisZ = -d.z / len;
      }
    }
    effect.setFloat2('shadowSunDir', axisX, axisZ);

    effect.setTexture('terrainHeightMap', heightMap);
  });

  material.freeze();

  return material;
}

export function getShadowMaterial(scene: Scene, slot: number): CustomMaterial {
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
 * (MainScene.cpp:402), so there is no floor for a blob to land on - the
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
 * The projected sun blob - the Classic-tier shadow, and the only one this
 * module still draws. On Enhanced/Ultra the cascades own the sun, and two sun
 * shadows read wrong, so the blob steps aside.
 *
 * `GameOptions.shadows` is the player's "Object shadows" toggle. It gates the
 * cascades too (`controllers/render/scenes/shadows.ts`), so unchecking it removes every shadow in
 * the scene rather than only the tier that happens to be running.
 */
export function blobShadowsActive(): boolean {
  return shadowsAllowed && GameOptions.shadows && !csmActive();
}

/**
 * Bumped whenever something that `blobShadowsActive` depends on changes (the
 * shadows toggle, the lighting tier taking the sun off the blobs). Each
 * `ModelObject` re-applies its own slots' enabled state when it sees a new
 * value, instead of this walking every mesh in the scene - and, unlike that
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
   * original has it off, which is everywhere - see `WingObject`.
   */
  readonly blendMesh: boolean;
  /**
   * Alpha-keyed meshes cast, cut by their own texture (SHADOW_ALPHA_CUTOFF).
   *
   * On for characters and their gear, which is what the original's shadow
   * pass covers and where the key *is* the shape - armour trim, robes,
   * skirts, a weapon's blade. Off for map objects, which are this project's
   * own extension of the pass and carry cards the original never meant to
   * cast: the pre-baked shadow decals under Lorencia's bridges would throw a
   * second, real shadow of themselves, and every barred gate its own bars.
   */
  readonly keyed: boolean;
};

/**
 * One projected blob for `slot`, or null when this caster has nothing to
 * project. Built on demand - every clone is a full copy of the caster's
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

/**
 * Whether a caster's mesh is in the silhouette. `AddMeshShadowTriangles`
 * (ZzzBMD.cpp:2295) skips only `BlendMesh` and `HiddenMesh`; keyed meshes follow `rules.keyed`.
 */
export function meshCasts(mesh: AbstractMesh, rules: ShadowMeshRules): boolean {
  const blendMesh = mesh.metadata?.brightMesh === true;
  const hidden =
    mesh.metadata?.hiddenByScript === true ||
    mesh.metadata?.shadowSkip === true ||
    mesh.isVisible === false;
  const keyed = mesh.material?.needAlphaBlending() === true;

  return !hidden && (!blendMesh || rules.blendMesh) && (!keyed || rules.keyed);
}

function createOneShadow(
  root: Mesh,
  parent: TransformNode,
  originNode: TransformNode,
  slot: number,
  rules: ShadowMeshRules
): AbstractMesh | null {
  // Decide on the caster before paying for a clone. A map object built
  // entirely of alpha cards (Noria's fairy-forest foliage) has nothing to
  // cast, and cloning its hierarchy just to strip every mesh and dispose the
  // rest was the dominant frame cost of the whole map - see issue #6.
  const casts = [root, ...root.getChildMeshes(false)].some(
    mesh => meshCasts(mesh, rules) && mesh.getTotalVertices() > 0
  );

  if (!casts) return null;

  const clone = root.clone(`${root.name}_shadow${slot}`, parent, false);
  if (!clone) return null;

  const material = getShadowMaterial(root.getScene(), slot);

  let hasGeometry = false;

  for (const mesh of [clone, ...clone.getChildMeshes(false)]) {
    if (!meshCasts(mesh, rules)) {
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
    // vertex shader - no ground projection - so a clone would sit on the
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
