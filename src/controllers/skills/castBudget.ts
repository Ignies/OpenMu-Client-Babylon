import { GameOptions } from '@/controllers/settings';
import type { Entity } from '@/ecs/world';
import { shedLevel } from '@/controllers/render/loadShed';

/**
 * Whether a cast is drawn at all (ours, the crowd options; see readme.md). The blow, its damage
 * and its sound are the server's and the combat layer's: only the visual and its light are left out.
 */

/** With the budget on, one drawn cast per caster this often, ms: 10 a second, past any normal attack speed. */
export const CASTER_GAP_MS = 100;
/** With the budget on, other players' drawn casts together per second; a busy town stays under it. */
export const OTHERS_PER_SECOND = 40;
/** `SkillDef.heavyVisualGap` by skill, seconds: a longer gap for a visual that outlives a fast caster's rate. */
export const HEAVY_VISUAL_GAP: Partial<Record<number, number>> = {};
/** With `effectShedding` on, the divisor of `OTHERS_PER_SECOND` per shed level (`render/loadShed.ts`). */
const SHED_DIVISOR = [1, 2, 4] as const;

const lastDrawn = new WeakMap<Entity, number>();
let windowStart = -Infinity;
let windowCount = 0;

/** Whether `caster`'s cast of `skill` (its base skill, 0 for a bow shot) at `now` ms is drawn; counts it if so. */
export function castIsDrawn(caster: Entity, skill: number, now: number): boolean {
  const otherPlayer = !!caster.playerAnimation && !caster.localPlayer;
  if (otherPlayer && !GameOptions.otherSkillEffects) return false;
  const budget = GameOptions.skillVisualBudget;
  const shed = otherPlayer && GameOptions.effectShedding ? shedLevel(now) : 0;
  if (!budget && shed === 0) return true;

  if (budget) {
    const gap = Math.max(CASTER_GAP_MS, (HEAVY_VISUAL_GAP[skill] ?? 0) * 1000);
    const last = lastDrawn.get(caster);
    if (last !== undefined && now - last < gap) return false;
  }

  if (otherPlayer) {
    if (now - windowStart >= 1000) {
      windowStart = now;
      windowCount = 0;
    }
    if (windowCount >= OTHERS_PER_SECOND / SHED_DIVISOR[shed]) return false;
    windowCount++;
  }

  lastDrawn.set(caster, now);
  return true;
}
