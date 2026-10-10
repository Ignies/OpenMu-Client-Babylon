import { afterAll, describe, expect, it, vi } from 'vitest';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { World } from '../world';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

// The click lands on the ground at (110, 110).
vi.mock('../../controllers/terrain/terrainPick', () => ({ pickGround: () => new Vector3(110, 0, 110) }));

const { PlayerControllerSystem } = await import('./playerControllerSystem');

const engine = new NullEngine();
const scene = new Scene(engine);
afterAll(() => {
  scene.dispose();
  engine.dispose();
});

/** A left click on the ground while a cast is standing: whether it walked, and whether the cast is still there. */
function clickGround(rightHeld: boolean) {
  const hero = { playerMoveTo: { point: { x: 0, y: 0 }, handled: true }, pathfinding: {}, transform: {} };
  const world = {
    scene,
    playerEntity: hero,
    pointerPressed: true,
    rightPointerPressed: rightHeld,
    castRequest: { target: null, point: { x: 120, y: 120 }, forced: false },
    with: () => [],
    isWalkable: () => true,
  } as unknown as World;
  PlayerControllerSystem(world).update?.(1);
  return { walked: !hero.playerMoveTo.handled, cast: world.castRequest !== null };
}

describe('a ground click', () => {
  it('calls off the cast waiting on its approach walk, as MOVEMENT_MOVE replaces MOVEMENT_SKILL (ZzzInterface.cpp:3285)', () => {
    expect(clickGround(false)).toEqual({ walked: true, cast: false });
  });

  it('leaves it alone while the right button is held (the right-drag repeat)', () => {
    expect(clickGround(true)).toEqual({ walked: true, cast: true });
  });
});
