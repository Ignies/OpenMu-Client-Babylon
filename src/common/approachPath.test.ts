import { describe, expect, it } from 'vitest';
import { truncatePathWithinRange } from './approachPath';

describe('truncatePathWithinRange', () => {
  /** A straight walk from (0, 0) to (10, 0), one cell per step. */
  const line = () => Array.from({ length: 11 }, (_, i) => ({ x: i, y: 0 }));

  it('ends the walk on the first cell inside range', () => {
    const path = line();
    truncatePathWithinRange(path, 10, 0, 6);
    expect(path[path.length - 1]).toEqual({ x: 4, y: 0 });
  });

  it('never leaves the target cell in the path', () => {
    const path = line();
    truncatePathWithinRange(path, 10, 0, 1.5);
    expect(path).not.toContainEqual({ x: 10, y: 0 });
  });

  it('leaves a walk that never comes into range alone', () => {
    const path = line();
    truncatePathWithinRange(path, 10, 40, 6);
    expect(path).toHaveLength(11);
  });

  it('keeps the start cell when the hero already stands in range', () => {
    const path = line();
    truncatePathWithinRange(path, 2, 0, 6);
    expect(path).toEqual([{ x: 0, y: 0 }]);
  });

  it('measures the reach as a circle, not a square', () => {
    // (3, 3) is 4.24 tiles from (6, 6), outside a reach of 4, so the cut has
    // to wait for (4, 4) rather than stopping a diagonal short.
    const path = [
      { x: 0, y: 0 },
      { x: 3, y: 3 },
      { x: 4, y: 4 },
    ];
    truncatePathWithinRange(path, 6, 6, 4);
    expect(path).toHaveLength(3);
  });
});
