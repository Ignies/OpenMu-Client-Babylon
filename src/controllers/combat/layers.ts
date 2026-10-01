import type { CombatLayer } from './layer';
import { inputGateLayer } from './inputGate';
import { attackTimingLayer } from './attackTiming';
import { weaponRangeLayer } from './weaponRange';
import { skillClipsLayer } from './skillClips';
import { skillMovementLayer } from './skillMovement';
import { castTargetsLayer } from './castTargets';
import { playerTargetLayer } from './playerTarget';
import { areaHitLayer } from './areaHit';

/**
 * THE list. Every combat-timing entry in the game is one line here, and
 * adding one is adding one line. Nothing else in the codebase enumerates
 * them.
 *
 * Order is update order. Nothing here reads another entry during `update`
 * - the consumers (`attackSystem`, `skillCastSystem`) combine them - so the
 * order is the order the original steps them: input poll, swing counter,
 * then the per-skill timers.
 */
export const COMBAT_LAYERS: readonly CombatLayer[] = [
  inputGateLayer, // MouseUpdateTime, stepped before any click is honoured
  attackTimingLayer, // AttackTime latch; fires the hit-frame callback
  weaponRangeLayer, // readers only
  skillClipsLayer, // readers only
  skillMovementLayer, // readers only
  castTargetsLayer, // readers only
  playerTargetLayer, // readers only
  areaHitLayer, // 0xDB counters
  // Skill-owned layers (Nova charge, Combo, Dark Side) join from their skill files via registerSkills.
];
