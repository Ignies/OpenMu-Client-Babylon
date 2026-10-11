import { afterAll, describe, expect, it, vi } from 'vitest';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { PointerEventTypes, type PointerInfo } from '@babylonjs/core/Events/pointerEvents';
import type { Entity, World } from '../world';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

// The click lands on the ground at (110, 110).
vi.mock('../../controllers/terrain/terrainPick', () => ({ pickGround: () => new Vector3(110, 0, 110) }));

const { PlayerControllerSystem } = await import('./playerControllerSystem');
const { PositionSlideSystem, startPositionSlide } = await import('./positionSlideSystem');

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

describe('a ground click while the server slides the hero in', () => {
  it('is dropped, as MoveHero drops it (JumpTime > 0): no walk then or after, the attack left alone', () => {
    const hero = {
      localPlayer: true,
      playerMoveTo: { point: { x: 0, y: 0 }, handled: true },
      pathfinding: {},
      transform: { pos: new Vector3(100, 0, 100), rot: new Vector3(), scale: 1 },
    };
    const monster = {};
    const world = {
      scene,
      playerEntity: hero,
      pointerPressed: false,
      rightPointerPressed: false,
      attackTarget: monster,
      castRequest: null,
      with: () => [],
      isWalkable: () => true,
      getTerrainHeight: () => 0,
      keyboardInput: { pressedKeys: new Set() },
    } as unknown as World;
    const walker = PlayerControllerSystem(world);
    const slide = PositionSlideSystem(world);

    startPositionSlide(hero as unknown as Entity, 100, 0, 100);
    scene.onPointerObservable.notifyObservers({
      type: PointerEventTypes.POINTERDOWN,
      event: { button: 0, clientX: 10, clientY: 10 },
    } as unknown as PointerInfo);
    walker.update?.(1);
    for (let i = 0; i < 15; i++) slide.update?.(1 / 25);
    walker.update?.(1);

    expect(hero.playerMoveTo.handled).toBe(true);
    expect(world.attackTarget).toBe(monster);
  });
});
