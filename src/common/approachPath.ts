/**
 * Where a walk toward something the hero means to act on has to end.
 *
 * Both approaches - the swing's and the cast's - aim their walk at the
 * target's own cell and rely on the caller stopping once it is in reach.
 * That cell must never survive into the path that is actually walked: it is
 * the array `NetworkSystem` turns into a WalkRequest *and* the array
 * `MoveAlongPathSystem` steps the hero along, so leaving it in place walks
 * the server onto the target (and the next ObjectMoved correction snaps the
 * hero there), and lets a frame that catches up on a long stall carry the
 * hero the whole remaining way in one go.
 */

/** Cut `path` at the first cell already within `range` tiles of (x, y). */
export function truncatePathWithinRange(
  path: { x: number; y: number }[],
  x: number,
  y: number,
  range: number
): void {
  const rangeSq = range * range;
  for (let i = 0; i < path.length; i++) {
    const dx = x - path[i].x;
    const dy = y - path[i].y;
    if (dx * dx + dy * dy <= rangeSq) {
      path.length = i + 1;
      return;
    }
  }
}
