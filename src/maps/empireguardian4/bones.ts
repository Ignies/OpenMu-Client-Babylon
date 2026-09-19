import type { ModelObject } from '../../common/modelObject';

export type BoneNode = {
  getAbsolutePosition(): { x: number; y: number; z: number };
};

/**
 * `b->TransformPosition(BoneTransform[i], (0,0,0), out)`: the world position
 * of a BMD bone. The converter stamps `bone_<i>_<bmdName>`
 * (tools/bmdToGlb.ts), and not every skeleton hands its bones a linked
 * transform node, so the node graph is the fallback - the same two-step
 * `stadium/brazierObject.ts` uses.
 *
 * Bone transforms only exist once a render has posed the skeleton, so a
 * caller that places something at one has to wait for the pose; see
 * `wallTorchObject.ts`.
 */
export function findBone(object: ModelObject, index: number): BoneNode | null {
  const gltf = object.gltf;
  if (!gltf) return null;

  const prefix = `bone_${index}_`;

  for (const bone of gltf.skeleton?.bones ?? []) {
    const node = bone.getTransformNode();
    if (node?.name.startsWith(prefix)) return node;
  }

  for (const node of gltf.mesh.getDescendants(false)) {
    if (node.name.startsWith(prefix) && 'getAbsolutePosition' in node) {
      return node as unknown as BoneNode;
    }
  }

  return null;
}
