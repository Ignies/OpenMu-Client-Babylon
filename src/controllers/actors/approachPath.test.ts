import { describe, expect, it } from 'vitest';
import { distanceAlongPath, truncatePathWithinRange } from './approachPath';

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

describe('distanceAlongPath', () => {
  const pos = (x: number, z: number) => ({ x, z });

  it('measures along the path, not straight to the stop', () => {
    // An L: two tiles east, then two north. Straight line would be 2.83.
    const path = [
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 2, y: 1 },
      { x: 2, y: 2 },
    ];
    expect(distanceAlongPath(pos(0, 0), path, path[3])).toBeCloseTo(4);
  });

  it('stops at the sent step, not at the end of the path', () => {
    const path = [
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 3, y: 0 },
      { x: 4, y: 0 },
    ];
    expect(distanceAlongPath(pos(0, 0), path, path[1])).toBeCloseTo(2);
  });

  it('counts the part-tile the hero is already into', () => {
    const path = [{ x: 1, y: 0 }, { x: 2, y: 0 }];
    expect(distanceAlongPath(pos(0.25, 0), path, path[1])).toBeCloseTo(1.75);
  });

  it('is zero once the stop has been walked off the front', () => {
    // NetworkSystem has not handed over the next chunk yet: hold, rather than
    // walking past what the server was told.
    const path = [{ x: 5, y: 0 }, { x: 6, y: 0 }];
    expect(distanceAlongPath(pos(4, 0), path, { x: 3, y: 0 })).toBe(0);
  });

  it('is zero standing exactly on the stop', () => {
    const path = [{ x: 2, y: 0 }];
    expect(distanceAlongPath(pos(2, 0), path, path[0])).toBeCloseTo(0);
  });
});

describe('the stall that looked like a speedhack', () => {
  /** 30 tiles east; a WalkRequest carries 15 steps, so the server has half. */
  const longWalk = () => Array.from({ length: 30 }, (_, i) => ({ x: i + 1, y: 0 }));
  /** 3.75 tiles/s (movement speed 15) x the 6 s catch-up ceiling. */
  const CATCH_UP_TILES = 22.5;

  it('caps a stalled frame at the last step the server was sent', () => {
    const path = longWalk();
    const sentThrough = path[14];
    const budget = distanceAlongPath({ x: 0, z: 0 }, path, sentThrough);

    // Unclamped the frame would carry the hero 22.5 tiles, 7.5 past where the
    // server's walker stopped - the ">5 tiles, resynchronizing client" case.
    expect(Math.min(CATCH_UP_TILES, budget)).toBeCloseTo(15);
    expect(CATCH_UP_TILES - budget).toBeGreaterThan(5);
  });

  it('leaves a stall the server walked through it alone', () => {
    const path = longWalk();
    const sentThrough = path[14];
    // A 2 s hitch is 7.5 tiles, well inside the chunk: the server walked those
    // too, so there is nothing to hold back.
    expect(Math.min(7.5, distanceAlongPath({ x: 0, z: 0 }, path, sentThrough))).toBeCloseTo(7.5);
  });
});
