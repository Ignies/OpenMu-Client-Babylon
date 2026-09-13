/**
 * `CheckAttack`'s `KIND_PLAYER` branch (ZzzInterface.cpp:1752-1783): when
 * another player is a target for a swing or a hostile cast at all. The duel
 * comes first and is exclusive - while the hero fights one, the enemy is
 * the target and nobody else is, Ctrl or not. Outside one an outlaw
 * (`PK >= PVP_MURDERER2`) is always a target, and anyone else only while
 * Ctrl is held. The guild war, rival guild, Chaos Castle and Cursed Temple
 * branches are not ported.
 *
 * Readers only. Read by `attackSystem.canAttackPlayer`, which adds the
 * safe-zone and liveness rules and feeds both click paths.
 */
import { PVP_MURDERER2, PVP_NEUTRAL } from '../common/nameTags';
import type { CombatLayer } from './layer';

// ---- 2. readers ------------------------------------------------------------

export type PlayerTargetContext = {
  /** The other duelist's id while the hero is fighting one, else null. */
  duelEnemyId: number | null;
  /** Ctrl is held: `CheckAttack`'s force attack. */
  ctrl: boolean;
};

/** A player under the cursor: the id and the `HeroState` byte (`c->PK`). */
export type PlayerTargetLike = { netId?: number; heroState?: number };

export function isHostilePlayer(
  target: PlayerTargetLike,
  ctx: PlayerTargetContext
): boolean {
  if (ctx.duelEnemyId !== null) return target.netId === ctx.duelEnemyId;
  if ((target.heroState ?? PVP_NEUTRAL) >= PVP_MURDERER2) return true;
  return ctx.ctrl;
}

// ---- 3. the layer ----------------------------------------------------------

export const playerTargetLayer: CombatLayer = {
  name: 'playerTarget',
};
