/**
 * What a slowing debuff does to the body that carries it while it holds: the
 * BodyLight it is drawn at, a monster's additive pass over itself and the
 * slower walk. The original reads the buff list at draw and move time; so do
 * RenderSystem (light, bright pass), AnimationSystem (clip rate) and
 * MoveAlongPathSystem (speed). The looks that come and go (the ice at the
 * feet) stay in skillVisuals.ts BUFF_VISUALS.
 *
 * Ids are OpenMU's MagicEffectNumber, the original's `eBuffState`.
 */
import type { RGB } from '../effects/core';

/** eDeBuff_Freeze (Ice, the Chilling / Ice Storm slow). */
const FREEZE = 56;
/** eDeBuff_BlowOfDestruction (Cold: Strike of Destruction, Chain Drive). */
const COLD = 86;

/** Draw_RenderObject's monster BodyLight for either (ZzzObject.cpp:1091-1098). */
const MONSTER_ICE: RGB = [0.3, 0.5, 1];
/** RenderPartObjectBody's for a player's parts: Cold is tested first and gets (0.3, 1, 1) (ZzzObject.cpp:10134-10161). */
const PLAYER_COLD: RGB = [0.3, 1, 1];
const PLAYER_FREEZE: RGB = [0.3, 0.5, 1];

/** The BodyLight the body is drawn at instead of its terrain light, or null. */
export function debuffBodyLight(buffs: ReadonlySet<number> | undefined, player: boolean): RGB | null {
  if (!buffs || buffs.size === 0) return null;
  if (player) return buffs.has(COLD) ? PLAYER_COLD : buffs.has(FREEZE) ? PLAYER_FREEZE : null;
  return buffs.has(FREEZE) || buffs.has(COLD) ? MONSTER_ICE : null;
}

/**
 * A monster's whole body drawn a second time additive at BlendMeshLight 1
 * (`RenderBody(RENDER_TEXTURE, Alpha, -2, 1.f)`, ZzzObject.cpp:2581-2589). A
 * player's parts have no such pass.
 */
export function debuffBrightBody(buffs: ReadonlySet<number> | undefined, player: boolean): boolean {
  return !player && !!buffs && (buffs.has(FREEZE) || buffs.has(COLD));
}

/**
 * The walk and run rate: `Speed *= 0.5` / `0.33` in CharacterMoveSpeed
 * (ZzzCharacter.cpp:6352-6359) and the same on the player's walk and run
 * PlaySpeed (:500-541). Freeze is tested first.
 */
export function debuffSlow(buffs: ReadonlySet<number> | undefined): number {
  if (!buffs || buffs.size === 0) return 1;
  return buffs.has(FREEZE) ? 0.5 : buffs.has(COLD) ? 0.33 : 1;
}
