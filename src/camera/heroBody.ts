/**
 * The hero's body, hidden while the camera sits inside it (first person and
 * the step or two before it).
 *
 * Same effect as `HiddenMesh = HIDDEN_MESH_ALL` (`common/modelObject.ts`),
 * but reversible and applied at runtime: `isVisible` goes off, so world
 * matrices keep updating and nameplates, effect anchors and the pick ray are
 * unaffected - which `setEnabled(false)` would not give.
 *
 * Only meshes this module hid are restored, so a part that was already hidden
 * for its own reason (an operate box, a stowed weapon) stays hidden.
 */

import type { AbstractMesh, TransformNode } from '../libs/babylon/exports';
import { HERO_RESCAN_SECONDS } from './recipes';

const hidden: AbstractMesh[] = [];

let node: TransformNode | null = null;
let sinceScan = 0;

function scan(root: TransformNode): void {
  for (const mesh of root.getChildMeshes(false)) {
    if (!mesh.isVisible) continue;

    mesh.isVisible = false;
    hidden.push(mesh);
  }
}

/**
 * Hide the model rooted at `root`, and keep it hidden: equipment and wings
 * are sub-models of the same node and can finish loading later, so the list
 * is re-scanned on a cadence rather than every frame.
 */
export function hideHeroBody(root: TransformNode, dt: number): void {
  if (node !== root) {
    showHeroBody();
    node = root;
    sinceScan = HERO_RESCAN_SECONDS;
  }

  sinceScan += dt;
  if (sinceScan < HERO_RESCAN_SECONDS) return;

  sinceScan = 0;
  scan(root);
}

/** Restore every mesh this module hid. Safe to call when nothing is hidden. */
export function showHeroBody(): void {
  for (const mesh of hidden) {
    if (!mesh.isDisposed()) mesh.isVisible = true;
  }

  hidden.length = 0;
  node = null;
}
