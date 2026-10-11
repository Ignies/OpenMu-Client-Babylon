import type { PlayerObject } from '../../controllers/actors/playerObject';
import { settle } from '../../controllers/assets';
import { Hero } from '../../modules/hero';
import type { Entity } from '../world';

/** `eBuff_GMEffect` and `eBuff_Cloaking` (`eBuffState`, _enum.h:3893-3923). */
const GM_EFFECT = 28;
const CLOAKING = 18;

/**
 * `ShouldAssignWebzenPart` (CSParts.cpp:28-33): the GM buff, or an operator `CtlCode`, which only
 * the hero's own character information carries here (`Hero.isGameMaster`). Nothing is drawn
 * while cloaked (`RenderParts`, CSParts.cpp:131-134).
 */
export function wantsGmMark(e: Entity, heroIsGm: boolean): boolean {
  if (e.buffs?.has(CLOAKING)) return false;
  return !!e.buffs?.has(GM_EFFECT) || (!!e.localPlayer && heroIsGm);
}

/**
 * The Webzen mark over a game master's head (`CreatePartsFactory` / `RenderParts`,
 * ZzzCharacter.cpp:15394-15395): on or off when the wish changed. Called every frame by
 * `AppearanceSystem`, as it follows buffs, not equipment; the part is `PlayerObject.setGmMarkAsync`.
 */
export function syncGmMark(e: Entity, model: PlayerObject): void {
  const wants = wantsGmMark(e, Hero.isGameMaster);
  if (wants !== model.gmMarkOn) void settle(model.setGmMarkAsync(wants), 'gm mark');
}
