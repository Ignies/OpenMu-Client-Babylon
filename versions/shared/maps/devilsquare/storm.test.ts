import { afterEach, describe, expect, it, vi } from 'vitest';
import type { World } from '@/ecs/world';

// Every flash the storm lit; a test puts one out by clearing `alive`.
const flashes = vi.hoisted(() => [] as { alive: boolean; dispose(): void }[]);

vi.mock('@/controllers/lighting', () => ({
  lighting: {
    flash: () => {
      const source = { alive: true, dispose() {} };
      flashes.push(source);
      return source;
    },
  },
}));
vi.mock('@/controllers/lighting/lightSource', () => ({ PRIORITY_TORCH: 1 }));

const { DevilSquareStorm } = await import('./storm');

/** A storm over a hero at the origin, with its frames stepped 40 ms (one tick) at a time. */
function stormy() {
  const frames: (() => void)[] = [];
  const scene = {
    onBeforeRenderObservable: { add: (frame: () => void) => (frames.push(frame), frame), remove() {} },
    getEngine: () => ({ getDeltaTime: () => 40 }),
  };
  const world = { scene, playerEntity: { transform: { pos: { x: 0, y: 0, z: 0 } } } } as unknown as World;
  const storm = new DevilSquareStorm(world);
  const tick = () => {
    for (const frame of frames) frame();
  };
  return { storm, tick };
}

afterEach(() => {
  vi.restoreAllMocks();
  flashes.length = 0;
});

describe('the Devil Square storm (ZzzObject.cpp:3630-3644)', () => {
  // Every tick drops the strikes that went out: in place, with no new array or callback a tick.
  it('keeps at most two strikes alight and makes room as one goes out, with no array made a tick', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const { storm, tick } = stormy();
    const filter = vi.spyOn(Array.prototype, 'filter');
    tick();
    tick();
    tick();
    expect(flashes.length).toBe(2);
    flashes[0].alive = false;
    tick();
    expect(flashes.length).toBe(3);
    tick();
    expect(flashes.length).toBe(3);
    expect(filter).not.toHaveBeenCalled();
    storm.dispose();
  });
});
