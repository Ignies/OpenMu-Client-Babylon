/**
 * The Dark Knight combo. The sequence itself is judged by the server
 * (OpenMU's `ComboStateMachine`: three different combo skills in a row); the
 * client sends nothing extra — it only *hears* the result: a
 * `SkillAnimation` carrying `AT_SKILL_COMBO` (59) (`ReceiveMagic`,
 * WSclient.cpp:3763, :4436), on which the original spawns `MODEL_COMBO`,
 * plays `SOUND_COMBO` and knocks the target up (`m_byDieType = COMBO`,
 * ZzzCharacter.cpp:3173).
 *
 * Driven by `logic.ts`'s `SkillAnimation` handler (`observeSkillAnimation`);
 * read by effects / HUD (`comboFlash`) and by the death system for the
 * knock-up (`comboKnockUp`).
 */
import type { Sounds } from '../libs/soundsManager';
import type { ENUM_WORLD } from '../common/types';
import type { CombatLayer } from './layer';
import { SKILL_COMBO } from './recipes';

// ---- 1. tuning -------------------------------------------------------------

/** `SOUND_COMBO`: eCombo.wav, once per landed combo. */
export const COMBO_SOUND: Sounds = 'Sound/eCombo';

/** Seconds the combo flash stays readable for effects (MODEL_COMBO's life). */
const FLASH_SECONDS = 1.0;

/** Seconds a knocked-up target is marked so the death clip can lift it. */
const KNOCK_UP_SECONDS = 0.6;

// ---- 2. state + readers ----------------------------------------------------

let flash = 0;
/** Target netId → seconds of knock-up left. */
const knockUps = new Map<number, number>();
/** Landed combos this session (HUD counter). */
let landed = 0;

/** 1 the frame a combo lands, fading to 0 over `FLASH_SECONDS`. */
export function comboFlash(): number {
  return flash / FLASH_SECONDS;
}

/** The target is being lifted by a combo / Nova knock-up. */
export function comboKnockUp(netId: number): boolean {
  return (knockUps.get(netId) ?? 0) > 0;
}

/** Combos landed since the last reset. */
export function combosLanded(): number {
  return landed;
}

/**
 * Command: a `SkillAnimation` arrived. Returns `true` when it was a combo
 * (the caller plays the sound at the caster).
 */
export function observeSkillAnimation(
  skill: number,
  targetNetId: number | undefined
): boolean {
  if (skill !== SKILL_COMBO) return false;
  flash = FLASH_SECONDS;
  landed++;
  if (targetNetId !== undefined) knockUps.set(targetNetId, KNOCK_UP_SECONDS);
  return true;
}

function update(_map: ENUM_WORLD, dt: number): void {
  if (flash > 0) flash = Math.max(0, flash - dt);
  if (knockUps.size === 0) return;
  for (const [id, left] of knockUps) {
    const next = left - dt;
    if (next <= 0) knockUps.delete(id);
    else knockUps.set(id, next);
  }
}

function reset(): void {
  flash = 0;
  landed = 0;
  knockUps.clear();
}

// ---- 3. the layer ----------------------------------------------------------

export const comboLayer: CombatLayer = {
  name: 'combo',
  update,
  reset,
};
