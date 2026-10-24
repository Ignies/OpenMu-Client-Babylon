import { GameOptions } from '@/controllers/settings';
import type { Entity } from '@/ecs/world';
import { shedLevel } from '@/controllers/render/loadShed';
import { isMobileDevice } from '@/controllers/interface/mobile';
import { Ecs } from '@/ecs/current';

/**
 * Whether a cast is drawn at all (ours, the crowd options; see readme.md). The blow, its damage
 * and its sound are the server's and the combat layer's: only the visual and its light are left out.
 */

/** With the budget on, one drawn cast per caster this often, ms: 10 a second, past any normal attack speed. */
export const CASTER_GAP_MS = 100;
/**
 * With the budget on, an other player's drawn casts at most this often, ms. At 100 ms a Lost Tower
 * with 8 players kept 300+ skill cards alive, each drawn again in the effect glow (27 FPS on an
 * RTX 5070 Ti). The hero keeps `CASTER_GAP_MS`.
 */
export const OTHER_CASTER_GAP_MS = 400;
/**
 * With the budget on, other players' drawn casts together per second (it was 40); a phone draws
 * half. Halved and quartered again by `effectShedding` under load.
 */
export const OTHERS_PER_SECOND = 8;
export const OTHERS_PER_SECOND_PHONE = 4;
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
    const gap = Math.max(otherPlayer ? OTHER_CASTER_GAP_MS : CASTER_GAP_MS, (HEAVY_VISUAL_GAP[skill] ?? 0) * 1000);
    const last = lastDrawn.get(caster);
    if (last !== undefined && now - last < gap) return false;
  }

  if (otherPlayer) {
    if (now - windowStart >= 1000) {
      windowStart = now;
      windowCount = 0;
    }
    const perSecond = isMobileDevice() ? OTHERS_PER_SECOND_PHONE : OTHERS_PER_SECOND;
    if (windowCount >= perSecond / SHED_DIVISOR[shed]) return false;
    windowCount++;
  }

  lastDrawn.set(caster, now);
  return true;
}

/** this many other players in scope make a crowd for `othersGlowSkipped`. */
export const CROWD_PLAYERS = 4;
const CROWD_READ_MS = 500;
let crowdAt = -Infinity;
let crowd = 0;

function otherPlayersNear(now: number): number {
  if (now - crowdAt < CROWD_READ_MS) return crowd;
  crowdAt = now;
  crowd = 0;
  for (const e of Ecs.world?.netObjsQuery.entities ?? []) if (e.playerAnimation && !e.localPlayer) crowd++;
  return crowd;
}

/**
 * Whether an other player's cast leaves its effects out of the effect glow
 * (fx/glow.ts `withoutEffectGlow`): with `effectShedding` on, in a crowd of `CROWD_PLAYERS` or while
 * the frame rate is being shed. The hero and the monsters always keep it.
 */
export function othersGlowSkipped(caster: Entity, now: number): boolean {
  if (!caster.playerAnimation || caster.localPlayer || !GameOptions.effectShedding) return false;
  return shedLevel(now) >= 1 || otherPlayersNear(now) >= CROWD_PLAYERS;
}
