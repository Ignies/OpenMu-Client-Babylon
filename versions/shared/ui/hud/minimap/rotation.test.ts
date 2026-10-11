import { describe, expect, it } from 'vitest';
import { runInAction } from 'mobx';
import { Ecs } from '@/ecs/current';
import type { World } from '@/ecs/world';
import { CLASSIC_MAP_ROTATION, mapRotation, markerTurn } from './rotation';

const withCamera = (alpha: number) =>
  runInAction(() => {
    Ecs.world = { scene: { activeCamera: { alpha } } } as unknown as World;
  });

// CNewUIMiniMap::Render (NewUIMiniMap.cpp:130): Rot = 45 through RenderBitRotate, which turns in
// y-up space (ZzzOpenglUtil.cpp:1263): 45 degrees counter-clockwise, CSS -45.
describe('the map turn', () => {
  it('is the original 45 degrees counter-clockwise with no world', () => {
    runInAction(() => {
      Ecs.world = null;
    });
    expect(CLASSIC_MAP_ROTATION).toBe(-45);
    expect(mapRotation()).toBe(-45);
  });

  it('is the camera heading', () => {
    withCamera(-Math.PI / 4);
    expect(mapRotation()).toBeCloseTo(-45);
    withCamera(-Math.PI / 2);
    expect(mapRotation()).toBeCloseTo(-90);
  });
});

// RenderPointRotate (ZzzOpenglUtil.cpp:1334): a marker turns by its own Rotation, absolute and
// counter-clockwise, whatever the map's turn.
describe('a marker turn', () => {
  it('is its rotation counter-clockwise at the classic heading', () => {
    expect(markerTurn(90, CLASSIC_MAP_ROTATION)).toBe(-90);
  });

  it('rides the map when the camera turns', () => {
    expect(markerTurn(90, -90)).toBe(-135);
  });
});
