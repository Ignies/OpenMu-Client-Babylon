/**
 * The hero's master level, master experience and unspent master points —
 * the original's `Master_Level_Data` (`nMLevel`, `lMasterLevel_Experince`,
 * `lNext_MasterLevel_Experince`, `nMLevelUpMPoint`).
 *
 * Driven by the packets: `MasterStatsUpdate` (F3 50, on entering the game
 * with a master character), `MasterCharacterLevelUpdate` (F3 51, a master
 * level-up), `ExperienceGained` / `ExperienceGainedExtended` (C3 16, every
 * kill share — master experience once the hero is in master progression)
 * and, through `masterTree.ts`, the point count `MasterSkillLevelUpdate`
 * echoes back after a point is spent.
 *
 * Read by the master exp bar (`ui/…/masterSkills/masterExpBar`) and the
 * master tree window through `skills.masterLevel` / `skills.masterExp…`, and
 * by `masterTree.ts` (the point gate).
 */
import { observable, runInAction } from 'mobx';
import type { ENUM_WORLD } from '../common/types';
import { EventBus } from '../libs/eventBus';
import {
  ExperienceGainedExtendedPacket,
  ExperienceGainedPacket,
  MasterCharacterLevelUpdateExtendedPacket,
  MasterCharacterLevelUpdatePacket,
  MasterStatsUpdatePacket,
} from '../common/packets/ServerToClientPackets';
import type { SkillLayer } from './layer';

// ---- 1. tuning -------------------------------------------------------------

/**
 * `RenderExperience` / `CNewUIMasterLevel::RenderText`: a master level is
 * counted on top of the 400 regular levels (400 is the cap), and the
 * experience curve breaks at level 255 — the two terms of the base formula.
 */
const REGULAR_LEVEL_CAP = 400;
const CURVE_BREAK_LEVEL = 255;
/** The constant the original subtracts before halving (`iBaseExperience`). */
const BASE_EXPERIENCE_OFFSET = 3892250000;
/** `fExpBarNum`: the master bar is ten sub-bars, like the regular one. */
export const MASTER_EXP_SUB_BARS = 10;

// ---- 2. state + readers ----------------------------------------------------

export interface MasterLevelState {
  /** `nMLevel`, 0 until `MasterStatsUpdate` arrives. */
  level: number;
  /** `lMasterLevel_Experince`: total master experience. */
  experience: number;
  /** `lNext_MasterLevel_Experince`: total needed for the next master level. */
  experienceOfNextLevel: number;
  /** `nMLevelUpMPoint`: master points not yet spent in the tree. */
  levelUpPoints: number;
  /** A master packet has arrived: the hero is in master progression. */
  received: boolean;
}

const state = observable.object<MasterLevelState>({
  level: 0,
  experience: 0,
  experienceOfNextLevel: 0,
  levelUpPoints: 0,
  received: false,
});

/** The master level, 0 for a hero that has none. */
export function masterLevel(): number {
  return state.level;
}

/** Master points waiting to be spent in the tree. */
export function masterLevelUpPoints(): number {
  return state.levelUpPoints;
}

/** Total master experience and the total the next master level needs. */
export function masterExperience(): { current: number; next: number } {
  return { current: state.experience, next: state.experienceOfNextLevel };
}

/**
 * Whether the hero is levelling as a master — the exp bar and the tree read
 * master values instead of the regular ones (`IsMasterLevel`).
 */
export function inMasterProgression(): boolean {
  return state.received;
}

/**
 * `iBaseExperience`: the total experience at which the current master level
 * began, from the original's two-term cubic (`RenderExperience`).
 */
export function masterLevelBaseExperience(level: number): number {
  const total = level + REGULAR_LEVEL_CAP;
  const over = total - CURVE_BREAK_LEVEL;
  const a = (9 + total) * total * total * 10 + (9 + over) * over * over * 1000;
  return Math.trunc((a - BASE_EXPERIENCE_OFFSET) / 2);
}

/** Progress through the current master level, 0…1. */
export function masterExpPercent(): number {
  if (state.experienceOfNextLevel <= 0) return 0;
  const base = masterLevelBaseExperience(state.level);
  const need = state.experienceOfNextLevel - base;
  const have = state.experience - base;
  if (need <= 0 || have <= 0) return 0;
  return Math.min(1, have / need);
}

/** `MasterSkillLevelUpdate` echoes the remaining points after a spend. */
export function setMasterLevelUpPoints(points: number): void {
  runInAction(() => {
    state.levelUpPoints = points;
  });
}

EventBus.on('MasterStatsUpdate', packet => {
  const p = new MasterStatsUpdatePacket(packet);
  runInAction(() => {
    state.level = p.MasterLevel;
    state.experience = Number(p.MasterExperience);
    state.experienceOfNextLevel = Number(p.MasterExperienceOfNextLevel);
    state.levelUpPoints = p.MasterLevelUpPoints;
    state.received = true;
  });
});

function levelUp(p: { MasterLevel: number; CurrentMasterPoints: number }): void {
  runInAction(() => {
    state.level = p.MasterLevel;
    state.levelUpPoints = p.CurrentMasterPoints;
    state.received = true;
    // The packet has no experience fields: move the bar to the new bracket
    // and let the next kill shares fill it (the regular bar does the same).
    const base = masterLevelBaseExperience(p.MasterLevel);
    if (state.experience < base) state.experience = base;
    if (state.experienceOfNextLevel <= state.experience) {
      state.experienceOfNextLevel = masterLevelBaseExperience(p.MasterLevel + 1);
    }
  });
}

EventBus.on('MasterCharacterLevelUpdate', packet =>
  levelUp(new MasterCharacterLevelUpdatePacket(packet))
);
// F3 51 extended (client >= 106.3): the same, with 32-bit maximum stats
// (`Receive_Master_LevelUp` reads `LPPMSG_MASTERLEVEL_UP_EXTENDED`).
EventBus.on('MasterCharacterLevelUpdateExtended', packet =>
  levelUp(new MasterCharacterLevelUpdateExtendedPacket(packet))
);

function gained(p: { AddedExperience: number }): void {
  if (!state.received || p.AddedExperience <= 0) return;
  runInAction(() => {
    state.experience += p.AddedExperience;
  });
}

EventBus.on('ExperienceGained', packet => gained(new ExperienceGainedPacket(packet)));
EventBus.on('ExperienceGainedExtended', packet =>
  gained(new ExperienceGainedExtendedPacket(packet))
);

function reset(): void {
  // The server sends master stats once, on entering the game, and nothing
  // on a warp: the level, experience and points survive the map change.
  // A new character's MasterStatsUpdate replaces them wholesale.
}

// ---- 3. the layer ----------------------------------------------------------

export const masterLevelLayer: SkillLayer = {
  name: 'masterLevel',
  reset,
};
