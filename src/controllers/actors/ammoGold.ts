import { Vector3 } from '../render/babylon/exports';
import type { BodyShine, ModelObject } from '../render/modelObject';

/**
 * Infinity Arrow's quiver (see readme.md): while eBuff_InfinityArrow holds, MODEL_BOLT and MODEL_ARROWS are drawn at
 * BodyLight (1, 0.8, 0.2) and again RENDER_CHROME | RENDER_BRIGHT in it (ZzzObject.cpp:8023-8030).
 */

/** eBuff_InfinityArrow, OpenMU's MagicEffectNumber 6. */
const INFINITY_ARROW = 6;
const GOLD = new Vector3(1, 0.8, 0.2);
const GOLD_SHINE: BodyShine = { tint: GOLD, star: false, chromeOnly: true };

type Ammo = { group: number; num: number } | null | undefined;

/** Bolt (4/7) or Arrows (4/15), the models the original turns gold, while the buff holds. */
export function ammoGoldWanted(buffs: ReadonlySet<number> | undefined, item: Ammo): boolean {
  return !!item && item.group === 4 && (item.num === 7 || item.num === 15) && !!buffs?.has(INFINITY_ARROW);
}

/** Draws the part gold with chrome, or gives each mesh back the light and shine it had. Called on a change only. */
export function paintAmmo(part: ModelObject, gold: boolean): void {
  for (const mesh of part.getMeshes(true)) {
    const md = (mesh.metadata ??= {});
    if (gold && !md.ammoPlain) {
      md.ammoPlain = { bodyLight: md.bodyLight, bodyShine: md.bodyShine };
      md.bodyLight = GOLD;
      md.bodyShine = GOLD_SHINE;
    } else if (!gold && md.ammoPlain) {
      md.bodyLight = md.ammoPlain.bodyLight;
      md.bodyShine = md.ammoPlain.bodyShine;
      md.ammoPlain = undefined;
    }
  }
}
