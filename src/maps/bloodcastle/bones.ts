import type { BonedEmission } from '../../common/effectParticles';
import type { ModelObject } from '../../common/modelObject';

export type BoneNode = BonedEmission['node'];

/**
 * The transform node the converter left for BMD bone `index`
 * (`bone_<i>_<bmdName>`, tools/bmdToGlb.ts:283) — the same two-step lookup
 * Stadium's brazier and the login wall torch make: the skeleton's linked node
 * first, the node graph by name second.
 */
export function findBone(obj: ModelObject, index: number): BoneNode | null {
  const gltf = obj.gltf;
  if (!gltf) return null;

  const prefix = `bone_${index}_`;

  for (const bone of gltf.skeleton?.bones ?? []) {
    const node = bone.getTransformNode();
    if (node?.name.startsWith(prefix)) return node;
  }

  const node = gltf.mesh
    .getDescendants(false)
    .find(n => n.name.startsWith(prefix));

  return node && 'getAbsolutePosition' in node ? (node as BoneNode) : null;
}

/**
 * BMD bone transforms only exist once a render has posed the skeleton, so a
 * bone that still reports the object origin is not ready to anchor a sprite.
 */
export function bonePosed(obj: ModelObject, bone: BoneNode): boolean {
  const origin = obj.node.getAbsolutePosition();
  const p = bone.getAbsolutePosition();

  return (
    Math.abs(p.x - origin.x) > 1e-3 ||
    Math.abs(p.y - origin.y) > 1e-3 ||
    Math.abs(p.z - origin.z) > 1e-3
  );
}
