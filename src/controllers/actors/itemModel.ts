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
}

/**
 * An item's model with no entity behind it (a bag icon): dressed as above, under `parent`, casting
 * nothing. A worn part (`Player/`) keeps the skeleton of its own file, posed at its first frame.
 */
export async function loadItemModel(scene: Scene, parent: TransformNode, group: number, num: number, file: string): Promise<ModelObject> {
  const object = new ModelObject(scene, parent);
  dressItemModel(object, group, num);
  object.CastsShadow = false;
  try {
    object.load(await loadGLTF(file, { scene }));
  } catch (error) {
    object.dispose();
    throw error;
  }
  return object;
}
