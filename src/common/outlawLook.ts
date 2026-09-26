import {
  Color3,
  HighlightLayer,
  Vector3,
  type GlowLayer,
  type Mesh,
  type Scene,
} from '../libs/babylon/exports';
import type { ModelObject } from './modelObject';
import { tierIndex } from './lightingQuality';
import { requestGlowProbe } from '../scenes/sceneLook';

/**
 * Ultra's outlaw: in place of the original's flat red body light, the art
 * goes greyscale and near black (the aura branch of the item material) and
 * red is drawn over it - hot edges, veins, glowing wing bones - with a red
 * aura around the whole silhouette. Classic and Enhanced keep the original
 * red (`outlawBodyLight`).
 *
 * The red rides `BodyShine`, which every part hangs on its wearer by
 * reference, so writing the character's own reaches the whole outfit.
 */
const ULTRA_TIER = 2;

/** Body light of the dark body: nearly black, a trace of red kept in it. */
export const OUTLAW_ULTRA_LIGHT = [0.03, 0.006, 0.006] as const;

const SHEEN = [1.1, 0.04, 0.02] as const;
const AURA = [1.2, 0.05, 0.02] as const;

/** Slow pulse, one beat every ~2.1 s. */
const pulse = (timeMs: number) => 0.8 + 0.2 * Math.sin(timeMs * 0.003);

export function outlawUltraActive(outlaw: boolean): boolean {
  return outlaw && tierIndex() === ULTRA_TIER;
}

/**
 * The aura is two layers. The glow layer blooms each mesh through its own
 * material, so the black surface adds nothing and the red on it bleeds
 * outward; a highlight layer adds a wide red glow outside the silhouette.
 * Its own highlight layer, apart from the hover outline (`scene.hl`), whose
 * meshes come and go with the cursor.
 */
const EDGE = new Color3(1, 0.05, 0.02);
const layers = new WeakMap<Scene, HighlightLayer>();
const dressedMeshes = new WeakMap<ModelObject, Set<Mesh>>();

function auraLayer(scene: Scene): HighlightLayer {
  let layer = layers.get(scene);
  if (layer) return layer;
  layer = new HighlightLayer('outlawAura', scene, {
    alphaBlendingMode: 1,
    blurHorizontalSize: 3,
    blurVerticalSize: 3,
  });
  layer.innerGlow = false;
  // Same stencil fix as the hover outline (scenes/testScene.ts): the blob
  // shadow's 0x80 bit must not flood the feet.
  const engine = scene.getEngine();
  layer.onBeforeComposeObservable.add(() =>
    engine.setStencilFunctionMask(0x7f)
  );
  layer.onAfterComposeObservable.add(() => engine.setStencilFunctionMask(0xff));
  layers.set(scene, layer);
  return layer;
}

function glowOf(scene: Scene): GlowLayer | null {
  return (scene as { look?: { glow: GlowLayer } }).look?.glow ?? null;
}

function surround(model: ModelObject, on: boolean): void {
  const scene = model.node.getScene();
  const glow = glowOf(scene);
  let set = dressedMeshes.get(model);
  if (!on) {
    if (!set) return;
    const layer = layers.get(scene);
    for (const mesh of set) {
      if (mesh.isDisposed()) continue;
      // An empty layer stops rendering on its own (thinHighlightLayer removeMesh).
      layer?.removeMesh(mesh);
      glow?.unReferenceMeshFromUsingItsOwnMaterial(mesh);
      mesh.metadata.glowOwnMaterial = false;
    }
    dressedMeshes.delete(model);
    return;
  }
  const layer = auraLayer(scene);
  if (!set) dressedMeshes.set(model, (set = new Set()));
  // Gear reloads its meshes, so the set is topped up every frame.
  for (const mesh of model.getMeshes(true)) {
    if (set.has(mesh) || !mesh.metadata || mesh.metadata.brightMesh) continue;
    set.add(mesh);
    layer.addMesh(mesh, EDGE);
    glow?.referenceMeshToUseItsOwnMaterial(mesh);
    mesh.metadata.glowOwnMaterial = true;
  }
}

const dressed = new WeakSet<ModelObject>();

/** Puts the dark look and its aura on the character, or takes them off again. */
export function applyOutlawLook(
  model: ModelObject,
  on: boolean,
  timeMs: number
): void {
  const shine = model.BodyShine;

  if (!on) {
    if (!dressed.has(model)) return;
    dressed.delete(model);
    surround(model, false);
    shine.improved?.set(0, 0, 0);
    shine.aura?.set(0, 0, 0);
    return;
  }

  if (!dressed.has(model)) {
    dressed.add(model);
    requestGlowProbe();
  }

  surround(model, true);

  const p = pulse(timeMs);
  shine.improved ??= new Vector3();
  shine.aura ??= new Vector3();
  shine.improved.set(SHEEN[0] * p, SHEEN[1] * p, SHEEN[2] * p);
  shine.aura.set(AURA[0] * p, AURA[1] * p, AURA[2] * p);
}
