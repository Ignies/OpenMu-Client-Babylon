import type { Scene, TransformNode } from '../render/babylon/exports';
import { ModelObject } from '../render/modelObject';
import { loadGLTF } from '../assets/modelLoader';
import { itemWornHeight } from './itemAngle';
import { itemObjectAttribute } from './itemObjectAttribute';
import { hideSkinMeshes, hideSkinTexture } from './skinTexture';

/**
 * What the original does to an item model it draws loose, on the ground (`RenderItems`,
 * ZzzObject.cpp:6403-6421) or in the bag (`RenderObjectScreen`, ZzzInventory.cpp:8861-8905): a worn
 * part is brought down by `ItemHeight`, drawn with `HideSkin` and frozen at frame 0, and the model
 * takes its `ItemObjectAttribute` mesh rules.
 */
export function dressItemModel(object: ModelObject, group: number, num: number): void {
  object.BodyHeight = itemWornHeight(group);
  object.HideSkin = true;
  object.FrozenPose = true;
  object.HideSkinTexture = hideSkinTexture(group, num);
  object.HideSkinMeshes = hideSkinMeshes(group, num);
  const rule = itemObjectAttribute(group, num);
  object.BlendMesh = rule.blendMesh;
  object.HiddenMesh = rule.hiddenMesh;
  object.BlendMeshLightAt = rule.blendMeshLight ?? null;
  dressSeed(object, group, num);
}

/** RenderPartObjectBody's element colours, fire, water, ice, wind, lightning, earth (ZzzObject.cpp:8070-8088). */
const SEED_COLOURS = [
  [0.9, 0.1, 0.2],
  [0.4, 0.5, 1],
  [1, 1, 1],
  [0.4, 1, 0.6],
  [1, 0.8, 0.4],
  [1, 0.4, 1],
] as const;

/**
 * A seed (12/60-65) is drawn in its element's colour with Chrome01 added (RENDER_BRIGHT | RENDER_CHROME);
 * a seed sphere (12/100-129, element `(num - 100) % 6`) so too, but for its mesh 1, drawn first at the
 * body's light (ZzzObject.cpp:8067-8121). The sphere models have two meshes, so the shine is mesh 0's.
 */
function dressSeed(object: ModelObject, group: number, num: number): void {
  if (group !== 12) return;
  const element = num >= 60 && num <= 65 ? num - 60 : num >= 100 && num <= 129 ? (num - 100) % 6 : -1;
  if (element < 0) return;
  const [r, g, b] = SEED_COLOURS[element];
  object.BodyShine.tint.set(r, g, b);
  object.BodyShine.chromeOnly = true;
  object.ShineLight = true;
  object.ShineMesh = num >= 100 ? 0 : -1;
}

/**
 * An item's model with no entity behind it (a bag icon): dressed as above, under `parent`, casting
 * nothing, at `bodyHeight` when the caller has its own (the bag's, world units). A worn part
 * (`Player/`) keeps the skeleton of its own file, posed at its first frame.
 */
export async function loadItemModel(
  scene: Scene,
  parent: TransformNode,
  group: number,
  num: number,
  file: string,
  bodyHeight?: number
): Promise<ModelObject> {
  const object = new ModelObject(scene, parent);
  dressItemModel(object, group, num);
  if (bodyHeight !== undefined) object.BodyHeight = bodyHeight;
  object.CastsShadow = false;
  try {
    object.load(await loadGLTF(file, { scene }));
  } catch (error) {
    object.dispose();
    throw error;
  }
  return object;
}
