import type { CombatLayer } from './layer';
import { inputGateLayer } from './inputGate';
import { attackTimingLayer } from './attackTiming';
import { weaponRangeLayer } from './weaponRange';
import { skillClipsLayer } from './skillClips';
import { skillMovementLayer } from './skillMovement';
import { castTargetsLayer } from './castTargets';
import { novaChargeLayer } from './novaCharge';
import { areaHitLayer } from './areaHit';
import { comboLayer } from './combo';
import { rageLayer } from './rage';

/**
 * THE list. Every combat-timing entry in the game is one line here, and
 * adding one is adding one line. Nothing else in the codebase enumerates
 * them.
 *
 * Order is update order. Nothing here reads another entry during `update`
 * — the consumers (`attackSystem`, `skillCastSystem`) combine them — so the
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
  novaChargeLayer, // right-button hold
  areaHitLayer, // 0xDB counters
  comboLayer, // combo flash / knock-up timers
  rageLayer, // Dark Side follow-ups, streak timeout
];
