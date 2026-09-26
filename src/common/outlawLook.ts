import { Vector3 } from '../libs/babylon/exports';
import type { ModelObject } from './modelObject';
import { tierIndex } from './lightingQuality';
import { requestGlowProbe } from '../scenes/sceneLook';

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
export const OUTLAW_ULTRA_LIGHT = [0.06, 0.012, 0.012] as const;

const SHEEN = [0.6, 0.02, 0.01] as const;
const AURA = [0.8, 0.03, 0.01] as const;

/** Slow pulse, one beat every ~2.1 s. */
const pulse = (timeMs: number) => 0.8 + 0.2 * Math.sin(timeMs * 0.003);

export function outlawUltraActive(outlaw: boolean): boolean {
  return outlaw && tierIndex() === ULTRA_TIER;
}

const dressed = new WeakSet<ModelObject>();

/** Puts the sheen and halo on the character, or takes them off again. */
export function applyOutlawLook(model: ModelObject, on: boolean, timeMs: number): void {
  const shine = model.BodyShine;

  if (!on) {
    if (!dressed.has(model)) return;
    dressed.delete(model);
    shine.improved?.set(0, 0, 0);
    shine.aura?.set(0, 0, 0);
    return;
  }

  if (!dressed.has(model)) {
    dressed.add(model);
    requestGlowProbe();
  }

  const p = pulse(timeMs);
  shine.improved ??= new Vector3();
  shine.aura ??= new Vector3();
  shine.improved.set(SHEEN[0] * p, SHEEN[1] * p, SHEEN[2] * p);
  shine.aura.set(AURA[0] * p, AURA[1] * p, AURA[2] * p);
}
