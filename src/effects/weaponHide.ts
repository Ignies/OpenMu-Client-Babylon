/**
 * Weapon hide - the wielded weapon leaves the hand for a while. The original
 * skips `c->Weapon[0]` in `RenderCharacter` while a skill has thrown a copy
 * of it: Twisting Slash's `PostMoveProcess_Active` (ZzzCharacter.cpp:4421,
 * :10082-10087) and Rageful Blow's `FURY_STRIKE && AnimationFrame <= 4`
 * (:10077-10080).
 *
 * Only the meshes this hid are shown again, so a part hidden for its own
 * reason stays hidden, and a map reset ends every hide with the rest of the
 * effects - a warp mid-swing never leaves a knight empty-handed.
 *
 * Driven by: `effects.spawn('weaponHide', …)` from the skill table. Read by: nobody.
 */
import type { AbstractMesh, Scene, Vector3 } from '../libs/babylon/exports';
import type { Entity } from '../ecs/world';
import type { ModelObject } from '../common/modelObject';
import { LiveList } from './core';
import { DEAD_HANDLE, type EffectHandle, type EffectLayer } from './layer';

// ---- 1. tuning -------------------------------------------------------------

/** Seconds between re-scans for a weapon part that finished loading after the hide began. */
const RESCAN_SECONDS = 0.1;

// ---- 2. state + readers ----------------------------------------------------

export interface WeaponHideOptions {
  /** The character whose slot-0 weapon (`Weapon1`, the right hand) is hidden. */
  entity: Entity;
  /** The longest the hide lasts. */
  seconds: number;
  /** Ends it early when true (the clip passed the key that brings the weapon back). */
  until?: () => boolean;
}

const live = new LiveList();

/** How many hides are running (debug). */
export function weaponHideCount(): number {
  return live.size;
}

function weaponPart(e: Entity): ModelObject | null {
  return (e.modelObject as { Weapon1?: ModelObject } | undefined)?.Weapon1 ?? null;
}

function hide(part: ModelObject, hidden: AbstractMesh[]): void {
  for (const mesh of part.getMeshes(true)) {
    if (!mesh.isVisible || mesh.isDisposed()) continue;
    mesh.isVisible = false;
    hidden.push(mesh);
  }
}

function spawn(_scene: Scene, _at: Vector3, opts: WeaponHideOptions): EffectHandle {
  const part = weaponPart(opts.entity);
  if (!part) return DEAD_HANDLE;
  const hidden: AbstractMesh[] = [];
  hide(part, hidden);
  let t = 0;
  let sinceScan = 0;
  return live.push({
    update(dt) {
      t += dt;
      if (t >= opts.seconds || opts.until?.()) return false;
      sinceScan += dt;
      if (sinceScan >= RESCAN_SECONDS) {
        sinceScan = 0;
        hide(part, hidden);
      }
      return true;
    },
    release() {
      for (const mesh of hidden) if (!mesh.isDisposed()) mesh.isVisible = true;
      hidden.length = 0;
    },
  });
}

function update(_map: number, dt: number): void {
  live.update(dt);
}

function reset(): void {
  live.clear();
}

// ---- 3. the layer ----------------------------------------------------------

export const weaponHideLayer: EffectLayer<WeaponHideOptions, 'weaponHide'> = {
  name: 'weaponHide',
  update,
  reset,
  spawn,
};
