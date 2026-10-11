import { describe, expect, it } from 'vitest';
import { createPathfinding } from './pathfinding';

/**
 * The Elbeland rope bridge at (150, 100): the chasm leaves one diagonal
 * opening, with (149, 99) and (150, 100) both flagged TW_NOGROUND. The map is
 * laid out here the way `PathfindingSystem` builds it - every unwalkable tile
 * closed, everything else open.
 */
function bridgeMap() {
  const pathfinder = createPathfinding({ width: 8, height: 8 });
  // (x, y) with the pinch between (3, 3) and (4, 2); the tiles the diagonal
  // cuts past, (4, 3) and (3, 2), are the hole.
  const closed = [
    [0, 0], [1, 0], [2, 0], [3, 0],
    [0, 1], [1, 1], [2, 1], [3, 1],
    [3, 2], [4, 3],
    [5, 4], [6, 4], [7, 4],
    [4, 5], [5, 5], [6, 5], [7, 5],
  ];
  pathfinder.applyClosedPatch(
    closed.map(([x, y]) => pathfinder.indexToId(x, y))
  );
  return pathfinder;
}

describe('createPathfinding', () => {
  it('crosses a bridge whose only opening is a diagonal between two holes', () => {
    const path = bridgeMap().search({ x: 2, y: 4 }, { x: 5, y: 1 });

    expect(path[path.length - 1]).toEqual({ x: 5, y: 1 });
    expect(path).toContainEqual({ x: 3, y: 3 });
    expect(path).toContainEqual({ x: 4, y: 2 });
    // Straight over the pinch, not the long way round the chasm.
    expect(path.length).toBeLessThanOrEqual(5);
  });

  it('still refuses to walk onto a closed tile', () => {
    const path = bridgeMap().search({ x: 2, y: 4 }, { x: 5, y: 1 });

    expect(path).not.toContainEqual({ x: 3, y: 2 });
    expect(path).not.toContainEqual({ x: 4, y: 3 });
  });
});
