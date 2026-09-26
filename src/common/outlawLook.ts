import { Vector3 } from '../libs/babylon/exports';
import type { ModelObject } from './modelObject';
import { tierIndex } from './lightingQuality';
import { requestGlowProbe } from '../scenes/sceneLook';
import { itemVisualTier, type ItemVisualTier } from './itemVisualTier';
import {
  createItemCrackle,
  type CrackleBody,
  type ItemCrackle,
} from '../effects/itemCrackle';

/**
 * Ultra's outlaw: in place of the original's flat red body light, the body
 * goes almost black and a red sheen and halo run over body, weapons and
 * wings. Classic and Enhanced keep the original red (`outlawBodyLight`).
 *
 * The sheen and halo ride `BodyShine`, which every part hangs on its wearer
 * by reference, so writing the character's own reaches the whole outfit.
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
 * The item crackle (+13 shape) in the outlaw's red, over a body wide and
 * tall enough to take in the wings: arcs run over the dark armour and the
 * wing membranes instead of sprites sitting on the joints.
 */
const CRACKLE_TIER: ItemVisualTier = {
  ...itemVisualTier(null),
  glow: 4,
  emissive: [1, 0.05, 0.02],
  crackleRate: 70,
};
const CRACKLE_BODY: CrackleBody = { radius: 0.55, bottom: 0.25, top: 1.45 };

const crackles = new WeakMap<ModelObject, ItemCrackle>();

const dressed = new WeakSet<ModelObject>();

/** Puts the sheen and halo on the character, or takes them off again. */
export function applyOutlawLook(
  model: ModelObject,
  on: boolean,
  timeMs: number,
  at: { x: number; y: number; z: number }
): void {
  const shine = model.BodyShine;

  if (!on) {
    if (!dressed.has(model)) return;
    dressed.delete(model);
    crackles.get(model)?.dispose();
    crackles.delete(model);
    shine.improved?.set(0, 0, 0);
    shine.aura?.set(0, 0, 0);
    return;
  }

  if (!dressed.has(model)) {
    dressed.add(model);
    requestGlowProbe();
  }

  // A map change ends every crackle (effects facade reset); start another.
  let crackle = crackles.get(model);
  if (!crackle?.alive) {
    const scene = model.node.getScene();
    crackle =
      createItemCrackle(
        scene,
        CRACKLE_TIER,
        'character',
        at.x,
        at.y,
        at.z,
        CRACKLE_BODY
      ) ?? undefined;
    if (crackle) crackles.set(model, crackle);
  }
  crackle?.position.set(at.x, at.y, at.z);

  const p = pulse(timeMs);
  shine.improved ??= new Vector3();
  shine.aura ??= new Vector3();
  shine.improved.set(SHEEN[0] * p, SHEEN[1] * p, SHEEN[2] * p);
  shine.aura.set(AURA[0] * p, AURA[1] * p, AURA[2] * p);
}
