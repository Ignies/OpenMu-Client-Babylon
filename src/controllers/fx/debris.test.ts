import { afterEach, describe, expect, it, vi } from 'vitest';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';

// What each piece hands the model entry, and what it is told afterwards.
const pieces = vi.hoisted(() => [] as { opts: Record<string, unknown>; at: { x: number; y: number; z: number }; alpha: number[]; angles: number[][]; stopped: boolean }[]);

vi.mock('./model', () => ({
  spawnModel: (_s: unknown, _at: unknown, opts: Record<string, unknown>) => {
    const p = { opts, at: { x: 0, y: 0, z: 0 }, alpha: [] as number[], angles: [] as number[][], stopped: false };
    pieces.push(p);
    return {
      get alive() {
        return !p.stopped;
      },
      stop: () => void (p.stopped = true),
      pitchTo() {},
      setAlpha: (a: number) => void p.alpha.push(a),
      setAngle: (a: readonly number[]) => void p.angles.push([...a]),
    };
  },
}));
vi.mock('../../ecs/current', () => ({ Ecs: { world: { getTerrainHeight: () => 0 } } }));
vi.mock('./core', async importOriginal => ({ ...(await importOriginal<object>()), emitBurst: () => {} }));

const { debrisLayer, spawnDebris } = await import('./debris');

afterEach(() => {
  debrisLayer.reset?.();
  pieces.length = 0;
  vi.restoreAllMocks();
});

describe('debris', () => {
  // MODEL_EFFECT_BROKEN_ICE SubType 0 (ZzzEffect.cpp:2796-2830, :7317-7354): 35-50 ticks, Scale 0.6-3, thrown
  // 6.4-19.1 cm a tick along its yaw and 25 cm up, falling 3-5 cm a tick more each tick; on the ground it keeps 0.6
  // of its throw, bounces by its LifeTime and loses 0.1 of its alpha a tick.
  it('throws broken ice the way the original moves it', () => {
    // Every roll 0.5: 43 ticks, Scale 1.8, gravity 4, thrown 12.8 cm a tick.
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    spawnDebris(null as never, new Vector3(0, 1, 0), { model: 'Effect/ice_stone00.glb', ice: true, colour: [0.3, 0.5, 1] });
    expect(pieces).toHaveLength(1);
    const p = pieces[0];
    expect(p.opts).toMatchObject({ scale: 1.8, colour: [0.3, 0.5, 1], blendMesh: -1 });
    const follow = p.opts.follow as (out: Vector3) => Vector3;
    const at = () => follow(new Vector3());
    debrisLayer.update?.(0, 1 / 25);
    // One tick: up 25 - 4 = 21 cm, 12.8 cm along its yaw.
    expect(at().y).toBeCloseTo(1.21);
    expect(Math.hypot(at().x, at().z)).toBeCloseTo(0.128);
    // Tumbling 0.5 x LifeTime degrees a tick on its pitch and roll.
    expect(p.angles[0].slice(0, 2)).toEqual([21.5, 21.5]);
    for (let i = 0; i < 14; i++) debrisLayer.update?.(0, 1 / 25);
    // Down by tick 15 (1 + 0.21 + 0.17 + ... crosses 0): on the ground, fading.
    expect(at().y).toBeGreaterThanOrEqual(0);
    expect(p.alpha.at(-1)).toBeLessThan(1);
    for (let i = 0; i < 40; i++) debrisLayer.update?.(0, 1 / 25);
    expect(p.stopped).toBe(true);
  });
});
