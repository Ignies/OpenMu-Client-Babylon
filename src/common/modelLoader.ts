import {
  AnimationGroup,
  AssetContainer,
  Bone,
  CustomMaterial,
  PBRBaseSimpleMaterial,
  PBRCustomMaterial,
  Scene,
  SceneLoader,
  Skeleton,
  Texture,
  TransformNode,
  type AbstractMesh,
  type Node,
} from '../libs/babylon/exports';
import type { World } from '../ecs/world';
import { BMD, BMDReader } from './BMD';
import { downloadDataBytesBuffer } from './utils';
import { resolveUrlToDataFolder } from './resolveUrlToDataFolder';
import {
  createItemMaterial,
  createItemPbrMaterial,
  useMeshAlphaTestTexture,
} from './itemMaterial';
import { isCharacterAsset, pbrCovers } from './materialQuality';
import { textureSourceName } from './pbrMaps';
import { getEmptyTexture } from '../libs/babylon/emptyTexture';
import { BlendState } from './objects/enum';
import { parseTextureScriptFromPath } from './textureScript';

const reader = new BMDReader();
const Models: Partial<Record<number, Promise<BMD>>> = {};
const ModelsFactory: Record<number, () => Promise<BMD>> = {};

export async function getModel(modelId: number) {
  if (Models[modelId]) return Models[modelId];

  if (!ModelsFactory[modelId])
    throw new Error(`Model factory for ID ${modelId} not found`);

  Models[modelId] = ModelsFactory[modelId]();
  return Models[modelId];
}

const cache: Partial<Record<string, Promise<BMD>>> = {};

export async function loadBMD(filePath: string): Promise<BMD> {
  if (cache[filePath]) return cache[filePath];

  const dir = filePath.split('/').slice(0, -1).join('/') + '/';

  cache[filePath] = new Promise(async r => {
    try {
      r(reader.read(await downloadDataBytesBuffer(filePath), dir));
    } catch (error) {
      console.error(`Error loading BMD from ${filePath}:`, error);
      throw error;
    }
  });

  return cache[filePath];
}

let skelId = 100;

type ItemMaterial = CustomMaterial | PBRCustomMaterial;

type MaterialArgs = readonly [
  backFaceCulling: boolean,
  transparencyMode: number,
  alphaMode: BlendState,
  bright: boolean,
  flatLit: boolean,
];

const materialsCache: Map<string, ItemMaterial> = new Map();

/** What each cached material was asked for, so a quality flip can re-resolve it. */
const materialArgs: Map<ItemMaterial, MaterialArgs> = new Map();

/** Babylon `Material.MATERIAL_ALPHATESTANDBLEND`. */
const ALPHA_TEST_AND_BLEND = 3;
/** glAlphaFunc(GL_GREATER, 0.25f) — the threshold the original runs with. */
const ALPHA_TEST_CUTOFF = 0.25;

export function getMaterial(
  scene: Scene,
  backFaceCulling: boolean,
  transparencyMode: number,
  alphaMode: BlendState,
  bright = false,
  flatLit = false,
  characterAsset = false
) {
  // Additive blend cards (bright `_R` meshes, and anything on an additive
  // blend such as wings) and flat-lit UI models are glow cards, not lit
  // surfaces; they stay on the Standard path in every quality.
  const additive =
    alphaMode === BlendState.ALPHA_ADD || alphaMode === BlendState.ALPHA_ONEOE;
  const pbr = pbrCovers(characterAsset) && !bright && !flatLit && !additive;

  const name = `${backFaceCulling}_${transparencyMode}_${BlendState[alphaMode]}${
    bright ? '_bright' : ''
  }${flatLit ? '_flat' : ''}${pbr ? '_pbr' : ''}`;

  if (materialsCache.has(name)) return materialsCache.get(name)!;

  let material: ItemMaterial;

  if (pbr) {
    const m = createItemPbrMaterial(scene);
    m.useAlphaFromAlbedoTexture = true;
    m.albedoTexture = getEmptyTexture(scene);
    // The placeholder decides the GAMMAALBEDO define for every texture bound
    // through it. It must be gamma (decode the texel) to sit on the Standard
    // path's curve: under IMAGEPROCESSINGPOSTPROCESS the Standard fragment
    // ends with `toLinearSpace(color)`, i.e. (texel × light)^2.2, while PBR
    // decodes its inputs and writes linear. A linear placeholder skipped the
    // decode and put every Enhanced object a stop *above* its Classic twin
    // (Enhanced materials read a stop light).
    m.albedoTexture.gammaSpace = true;
    material = m;
  } else {
    const m = createItemMaterial(scene, bright, flatLit);
    m.useAlphaFromDiffuseTexture = true;
    m.diffuseTexture = getEmptyTexture(scene);
    material = m;
  }

  material.name = name;
  material.backFaceCulling = backFaceCulling;
  material.transparencyMode = transparencyMode;
  material.alphaMode = alphaMode;

  if (bright) {
    material.disableDepthWrite = true;
  }

  if (transparencyMode === ALPHA_TEST_AND_BLEND) {
    // MU's EnableAlphaTest (ZzzOpenglUtil.cpp:395): alpha test + SRC_ALPHA
    // blend with the depth mask left on — and it calls DisableCullFace(), so
    // every alpha-keyed mesh is drawn double-sided. Babylon drops depth writes
    // for anything in the blend pass unless forced.
    material.forceDepthWrite = true;
    material.alphaCutOff = ALPHA_TEST_CUTOFF;
  }

  // Every off-screen pass (G-buffer, cascades, glow layer) alpha-tests
  // against whatever getAlphaTestTexture() returns and never runs the bind
  // observable that hands over the mesh's real texture.
  useMeshAlphaTestTexture(material);

  material.freeze();

  materialsCache.set(name, material);
  materialArgs.set(material, [
    backFaceCulling,
    transparencyMode,
    alphaMode,
    bright,
    flatLit,
  ]);

  return material;
}

/**
 * The scrolling variants, kept in their own cache and deliberately **not**
 * shared with `getMaterial`.
 *
 * The UV-scroll uniform and its extra texel fetch exist on perhaps twenty
 * meshes in the whole game — Dungeon's flesh curtains, Noria's waterfalls,
 * Lost Tower's conduits, Stadium's fountain, Tarkan's sand-falls. Putting
 * them on the shared bright/flat-lit materials meant recompiling the shader
 * that draws *every* additive card in the game, foliage included, to serve
 * those twenty. That is a bad trade even when it works, and it is an
 * unnecessary one: a separate variant leaves the shared material byte-for-byte
 * what it was.
 */
const scrollMaterialsCache: Map<string, ItemMaterial> = new Map();

export function getScrollMaterial(
  scene: Scene,
  backFaceCulling: boolean,
  transparencyMode: number,
  alphaMode: BlendState,
  bright: boolean,
  flatLit: boolean
): ItemMaterial {
  const name = `scroll_${backFaceCulling}_${transparencyMode}_${BlendState[alphaMode]}${
    bright ? '_bright' : ''
  }${flatLit ? '_flat' : ''}`;

  const cached = scrollMaterialsCache.get(name);
  if (cached) return cached;

  const material = createItemMaterial(scene, bright, flatLit, true);

  material.name = name;
  material.backFaceCulling = backFaceCulling;
  material.transparencyMode = transparencyMode;
  material.alphaMode = alphaMode;

  if (bright) material.disableDepthWrite = true;

  if (transparencyMode === ALPHA_TEST_AND_BLEND) {
    material.forceDepthWrite = true;
    material.alphaCutOff = ALPHA_TEST_CUTOFF;
  }

  // Every off-screen pass (G-buffer, cascades, glow layer) alpha-tests
  // against whatever getAlphaTestTexture() returns and never runs the bind
  // observable that hands over the mesh's real texture.
  useMeshAlphaTestTexture(material);

  material.freeze();

  scrollMaterialsCache.set(name, material);

  // Deliberately not in `materialArgs`: a quality flip must not re-resolve
  // these back to the shared non-scrolling material. Nothing is lost — bright
  // and flat-lit never take the PBR path anyway.
  return material;
}

/**
 * `Models[type].StreamMesh = N` (ZzzBMD.cpp:997-1001): mesh N keeps its
 * texture and its blend state but is drawn *unlit* - flat `BodyLight`
 * instead of the per-vertex terrain light. Everything else about the
 * material is whatever the mesh already resolved to, so a keyed sand-fall
 * sheet stays alpha-tested and an opaque flesh curtain stays opaque.
 *
 * Returns null when the mesh is not on a shared item material (nothing to
 * re-resolve from).
 */
export function getFlatLitVariant(
  scene: Scene,
  mesh: AbstractMesh
): ItemMaterial | null {
  const args = materialArgs.get(mesh.material as ItemMaterial);
  if (!args) return null;

  const [backFaceCulling, transparencyMode, alphaMode] = args;

  return getScrollMaterial(
    scene,
    backFaceCulling,
    transparencyMode,
    alphaMode,
    false,
    true
  );
}

/**
 * The scrolling twin of whatever material a mesh already resolved to, keeping
 * its blend state and culling. Used for a `blend`-kind scroller, whose mesh
 * `applyBlendMesh` has already put on the shared additive material.
 */
export function getScrollVariant(
  scene: Scene,
  mesh: AbstractMesh
): ItemMaterial | null {
  const args = materialArgs.get(mesh.material as ItemMaterial);
  if (!args) return null;

  const [backFaceCulling, transparencyMode, alphaMode, bright, flatLit] = args;

  return getScrollMaterial(
    scene,
    backFaceCulling,
    transparencyMode,
    alphaMode,
    bright,
    flatLit
  );
}

/**
 * Re-resolve every mesh on a shared item material against the current
 * `GameOptions.materialQuality` (Classic ⇄ PBR). The cache keeps both
 * variants, so flipping back is a pointer swap, not a recompile.
 */
export function syncMaterialQuality(scene: Scene): void {
  for (const mesh of scene.meshes) {
    const args = materialArgs.get(mesh.material as ItemMaterial);
    if (!args) continue;

    // Whose art this is comes off the mesh, not off `materialArgs`: on
    // Classic a character and a crate share one material, so the cached args
    // cannot tell the two apart when the tier moves to Characters.
    const material = getMaterial(
      scene,
      ...args,
      mesh.metadata?.characterAsset === true
    );
    if (mesh.material !== material) mesh.material = material;
  }
}

const texturesCache: Map<string, Texture> = new Map();

function getTexture(key: string, fallback: Texture) {
  if (texturesCache.has(key)) return texturesCache.get(key)!;

  fallback.isBlocking = true;
  fallback.updateSamplingMode(Texture.NEAREST_NEAREST);

  texturesCache.set(key, fallback);

  return fallback;
}


export type LoadedModel = {
  mesh: AbstractMesh;
  skeleton: Skeleton;
  animationGroups: AnimationGroup[];
};

/**
 * One parsed copy of each GLB, kept for the whole session and cloned per
 * entity (`instantiateModelsToScene`). Before this, every instance of every
 * map object ran its own glTF parse, geometry upload and WebP decode — a
 * Lorencia field with 40 grass tufts paid for 40 identical models, and paid
 * again every time the hero walked out of `CalculateVisibilitySystem`'s
 * radius and back. Clones share the geometry (`Geometry.applyToMesh`), so the
 * cache is strictly less GPU memory than the duplication it replaces.
 */
const containersCache = new Map<string, Promise<AssetContainer>>();

/**
 * Set to false to bypass the cache entirely and give every request its own
 * freshly parsed, non-cloned copy — what the loader did before the container
 * cache landed.
 *
 * Kept as a one-line A/B. If a model ever renders in its raw BMD orientation
 * (see the coordinate note in `modelObject.load`), flipping this says at once
 * whether the clone path is responsible or whether the problem predates it.
 */
const USE_MODEL_CONTAINER_CACHE = true;

/**
 * Per-file preparation: everything that used to run inside the per-instance
 * mesh task and only ever produced the same result. On the cached path it
 * runs exactly once per GLB and the clones inherit it (Babylon's
 * `DeepCopier` carries the flags, `_geometry.applyToMesh` shares the buffers).
 */
function prepareMeshes(
  meshes: AbstractMesh[],
  skeletons: Skeleton[],
  fileName: string,
  scene: Scene,
  characterAsset: boolean
): void {
  const root = meshes[0];

  if (root) root.name = fileName;

  meshes.forEach(mesh => {
    mesh.metadata ??= {};
    // Which folder the model came out of, for the Characters material tier.
    // Stamped rather than re-derived because the mesh has no path of its own
    // once the container is cloned, and the clone copies metadata.
    mesh.metadata.characterAsset = characterAsset;
    mesh.metadata.itemLvl = 0;
    mesh.metadata.isExcellent = false;
    mesh.metadata.timeOffset = 0;
    // Let Babylon frustum-cull model meshes; in Lorencia ~3/4 of the
    // meshes inside the visibility radius are behind the camera.
    // Shadow clones keep alwaysSelectAsActiveMesh (objectShadow.ts):
    // their vertex shader moves them away from their bounds.
    mesh.alwaysSelectAsActiveMesh = false;
    mesh.isPickable = false;
    mesh.doNotSyncBoundingInfo = false;

    const m = mesh.material as PBRBaseSimpleMaterial;
    if (m && !!m._albedoTexture) {
      const cached = getTexture(
        fileName + m._albedoTexture.name,
        m._albedoTexture as Texture
      );
      const diffuseTexture = cached;

      const script = parseTextureScriptFromPath(
        textureSourceName(m._albedoTexture as Texture)
      );

      if (script?.hiddenMesh) {
        mesh.setEnabled(false);
        mesh.metadata.hiddenByScript = true;
      }

      const bright = script?.bright === true;
      // The converter marks every TGA-textured mesh BLEND; the
      // original draws those through EnableAlphaTest — alpha test +
      // blend, depth-written, and with face culling disabled. The
      // spider's legs (single-sided alpha cards) vanish from behind
      // and get overdrawn by the body without this.
      const alphaTested = !bright && m.transparencyMode === 2;

      const clonedMaterial = getMaterial(
        scene,
        bright || alphaTested ? false : m.backFaceCulling,
        bright
          ? 2
          : alphaTested
            ? ALPHA_TEST_AND_BLEND
            : m.transparencyMode ?? 0,
        bright
          ? BlendState.ALPHA_ONEOE
          : m.alphaMode ?? BlendState.ALPHA_DISABLE,
        bright,
        false,
        characterAsset
      );
      mesh.visibility = m.alpha;
      mesh.metadata.diffuseTexture = diffuseTexture;
      mesh.metadata.brightMesh = bright;

      if (m._albedoTexture !== cached) {
        m._albedoTexture.dispose();
      }
      m._albedoTexture = null;

      mesh.material = clonedMaterial;
      m.dispose(true, false);
    }

    if (mesh.skeleton) {
      mesh.numBoneInfluencers = 1;
    }
  });

  skeletons.forEach(skeleton => {
    skeleton.name = `skeleton_${fileName}`;
  });
}

function loadContainer(
  filePath: string,
  scene: Scene,
  fileName: string,
  characterAsset: boolean
): Promise<AssetContainer> {
  const cached = containersCache.get(filePath);
  if (cached) return cached;

  const pending = SceneLoader.LoadAssetContainerAsync(filePath, '', scene)
    .then(container => {
      prepareMeshes(
        container.meshes,
        container.skeletons,
        fileName,
        scene,
        characterAsset
      );
      return container;
    })
    .catch(error => {
      // A failed load must not poison the cache: the next request retries.
      containersCache.delete(filePath);
      console.error(`Could not load model ${filePath}:`, error);
      throw error;
    });

  containersCache.set(filePath, pending);

  return pending;
}

/**
 * `player.glb` is a rig with 62 nodes, 284 clips and *no meshes* — the glTF
 * loader only materialises a `Skeleton` for a skin a mesh actually
 * references, so this one has to be built by hand from the instantiated
 * `skin_*` subtree. `PlayerObject` then hands it to the body-part models
 * through `LinkParent`.
 */
function synthesizeRigSkeleton(
  root: Node,
  fileName: string,
  scene: Scene
): Skeleton {
  const skeleton = new Skeleton(
    `skeleton_${fileName}`,
    `skeleton_${fileName}_${skelId++}`,
    scene
  );

  const descendants = root.getDescendants(false);
  const skinRoot = descendants.find(node => node.name.startsWith('skin_'));

  if (skinRoot) {
    // Bone ORDER is load-bearing, not just membership: the mesh's
    // `matricesIndices` are the converter's `vertex.Node + 1`, and
    // `ParentBoneLink` indexes `skeleton.bones` directly (weaponAttachment's
    // LEFT_HAND_BONE / RIGHT_HAND_BONE). The converter emits the skin root
    // first and then `bone_<i>_<name>` in ascending `i`, so the list has to be
    // rebuilt in that order — a depth-first walk of the same nodes gives a
    // different order as soon as the bone tree branches, which skins every
    // vertex to the wrong bone.
    const bones: Node[] = [skinRoot];

    const numbered: { index: number; node: Node }[] = [];

    for (const node of descendants) {
      const match = /^bone_(\d+)_/.exec(node.name);
      if (match) numbered.push({ index: Number(match[1]), node });
    }

    numbered.sort((a, b) => a.index - b.index);

    for (const { node } of numbered) bones.push(node);

    // The converter guarantees a bone's parent has a lower index than the
    // bone itself (it re-roots anything else), so parents are always already
    // in the map by the time their children are read.
    const boneByNode = new Map<Node, Bone>();

    for (const node of bones) {
      const bone = new Bone(node.name, skeleton, null);
      bone.linkTransformNode(node as TransformNode);
      boneByNode.set(node, bone);
      bone.parent = node.parent ? boneByNode.get(node.parent) ?? null : null;
    }
  }

  skeleton.prepare();

  return skeleton;
}

export async function loadGLTF(
  filePath: string,
  world: World
): Promise<LoadedModel> {
  const characterAsset = isCharacterAsset(filePath);

  filePath = resolveUrlToDataFolder(filePath);
  const fileName = filePath.split('/').at(-1)!;

  const scene = world.scene;

  if (!USE_MODEL_CONTAINER_CACHE) {
    // Uncached: one fresh parse per request, added to the scene as-is. No
    // clone, no shared geometry — the pre-cache behaviour, kept for A/B.
    const own = await SceneLoader.LoadAssetContainerAsync(filePath, '', scene);

    prepareMeshes(
      own.meshes,
      own.skeletons,
      fileName,
      scene,
      characterAsset
    );
    own.addAllToScene();

    const ownRoot = own.meshes[0];

    return {
      mesh: ownRoot,
      skeleton:
        own.skeletons[0] ??
        (filePath.includes('player.glb')
          ? synthesizeRigSkeleton(ownRoot, fileName, scene)
          : own.skeletons[0]),
      animationGroups: own.animationGroups,
    };
  }

  const container = await loadContainer(filePath, scene, fileName, characterAsset);

  // doNotInstantiate defaults to true, so every node is cloned rather than
  // turned into an InstancedMesh. That is deliberate: the shared item
  // materials bind `metadata.diffuseTexture` and `metadata.bodyLight` per
  // mesh in `onBindObservable`, and hardware instances draw in one call with
  // one uniform set — every object would take the last one's terrain light.
  const entries = container.instantiateModelsToScene(name => name, false);

  const root = entries.rootNodes[0] as AbstractMesh;
  root.name = fileName;

  // Babylon shares `metadata` by reference across clones (mesh.js:395). The
  // per-mesh render contract (bodyLight, itemTier, itemLvl, diffuseColor…) is
  // per instance, so each clone needs its own object.
  root.metadata = { ...root.metadata };
  for (const mesh of root.getChildMeshes(false)) {
    mesh.metadata = { ...mesh.metadata };
  }

  let skeleton = entries.skeletons[0];

  if (!skeleton && filePath.includes('player.glb')) {
    skeleton = synthesizeRigSkeleton(root, fileName, scene);
  }

  // The glTF loader auto-starts the first clip (`animationStartMode` defaults
  // to FIRST), and BMD models carry their rest pose *in* that clip — the
  // converter leaves every bone node at identity, so an unplayed model sits in
  // the raw, tilted BMD orientation. Instantiated clones do not inherit the
  // auto-play, so reproduce it here.
  const first = entries.animationGroups[0];

  if (first) {
    first.play(true);
    // ...and write frame 0 straight away rather than waiting for the next
    // `scene.animate()`. Anything that renders the model outside the main pass
    // (the item-icon render target) can otherwise catch it still unposed.
    first.goToFrame(first.from);
  }

  return {
    mesh: root,
    skeleton,
    animationGroups: entries.animationGroups,
  };
}

/**
 * Drop every cached container whose path contains `pathPrefix` (an asset
 * folder such as `Object4/`): `loadMapIntoScene` calls it when the asset
 * world changes, after the old map's entities — the clones that shared the
 * containers' geometry — are gone. Without this the cache grew by one map's
 * worth of GLBs per warp for the whole session. Shared folders (`Player/`,
 * `Item/`, `Npc/`) are never passed here.
 */
export function evictContainers(pathPrefix: string): void {
  for (const [key, pending] of containersCache) {
    if (!key.includes(pathPrefix)) continue;
    containersCache.delete(key);
    pending.then(
      container => container.dispose(),
      () => {}
    );
  }
}
