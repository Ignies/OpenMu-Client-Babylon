import { Store } from '../store';
import type { Entity } from '../ecs/world';

/**
 * Why the hero was just moved by the server.
 *
 * `ObjectMoved` (C1 15) is the only packet that repositions the hero without
 * him walking there, so every unexplained jump in game is one of these. It
 * arrives for a gate, for a teleport, for an `InstantMoveRequest` we asked
 * for - and for a resynchronisation, which is the server saying our idea of
 * where he stands drifted past its tolerance. Those cases are impossible to
 * tell apart from the outside, which is what makes a jump like this so hard
 * to chase from a bug report.
 *
 * So say it out loud. One line per jump, carrying what the client believed at
 * that moment: where it thought he stood, what walk it had last told the
 * server about, and which approach was driving him. A jump whose `sentWalk`
 * ends where the server put him is a walk we failed to stop; one with no walk
 * behind it at all is the server moving him on its own account.
 */

/** Below this a jump is the server nudging a rounding difference, not a move. */
const NOTABLE_TILES = 1.5;

export function traceHeroInstantMove(
  hero: Entity,
  to: { x: number; y: number },
  approach: { attack: Entity | null; cast: { x: number; y: number; range: number } | null }
): void {
  const pos = hero.transform?.pos;
  if (!pos) return;

  const from = { x: Math.round(pos.x), y: Math.round(pos.z) };
  const tiles = Math.hypot(to.x - from.x, to.y - from.y);
  if (tiles < NOTABLE_TILES) return;

  const walk = Store.lastWalkRequest;
  const path = hero.pathfinding?.path;
  const attack = approach.attack?.transform?.pos;

  console.warn(
    `hero moved by server: ${tiles.toFixed(1)} tiles, ` +
      `(${from.x}, ${from.y}) -> (${to.x}, ${to.y})`,
    {
      skill: Store.currentSkill,
      // The walk the server was last told about. If it ends where the hero
      // was just put, the server was still walking one we thought we stopped.
      sentWalk: walk
        ? { from: [walk.x, walk.y], steps: walk.steps, msAgo: Math.round(performance.now() - walk.at) }
        : null,
      // What the client was steering by when the jump landed.
      walking: path ? path.length : 0,
      pathEnd: path?.length ? [path[path.length - 1].x, path[path.length - 1].y] : null,
      attackTarget: attack ? [Math.round(attack.x), Math.round(attack.z)] : null,
      castApproach: approach.cast ? [approach.cast.x, approach.cast.y, approach.cast.range] : null,
    }
  );
}
