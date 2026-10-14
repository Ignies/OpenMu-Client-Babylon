import { describe, expect, it, vi } from 'vitest';
import type { Camera, Scene } from '../render/babylon/exports';

vi.mock('../render/babylon/exports', () => {
  const rgb = () => ({
    r: 0,
    g: 0,
    b: 0,
    set(r: number, g: number, b: number) {
      Object.assign(this, { r, g, b });
    },
    copyFrom() {
      return this;
    },
    scaleInPlace() {
      return this;
    },
  });
  class PointLight {
    intensity = 0;
    range = 0;
    specular = rgb();
    diffuse = rgb();
    position = {
      x: 0,
      y: 0,
      z: 0,
      set(x: number, y: number, z: number) {
        Object.assign(this, { x, y, z });
      },
    };
    constructor(public name: string, _at: unknown, scene: { lights: unknown[] }) {
      scene.lights.push(this);
    }
  }
  return { PointLight, Vector3: { Zero: () => ({}) }, Color3: { Black: () => rgb() } };
});
vi.mock('@/controllers/settings', () => ({ GameOptions: { dynamicLights: true } }));
vi.mock('../render/materialQuality', () => ({ pbrMaterialsOn: () => false }));
vi.mock('./lightingQuality', () => ({ dynamicLightGain: () => 1, pointLightBudget: () => 2 }));
vi.mock('../../core/devSeams', () => ({ devQueryNumber: () => null }));
vi.mock('./director', () => ({ lookDirector: () => null }));

const { initPointLightPool, pointLightPoolLights, registerPointLightEmitter, updatePointLightPool } = await import('./pointLightPool');

/** A torch `x` tiles east of the camera's target. */
const torch = (x: number) => ({ position: { x, y: 0, z: 0 }, heightOffset: 0, color: () => ({ r: 1, g: 0.5, b: 0.2 }) });

describe('the point-light pool', () => {
  // Ranked every frame: one comparator and one row per emitter, kept from frame to frame.
  it('gives its slots to the nearest torches, ranking them on rows it keeps', () => {
    initPointLightPool({ lights: [] } as unknown as Scene);
    const camera = { target: { x: 0, y: 0, z: 0 } } as unknown as Camera;
    for (const x of [10, 1, 2]) registerPointLightEmitter(torch(x));

    const real = Array.prototype.sort;
    const ranked: { by: unknown; rows: unknown[] }[] = [];
    const sort = vi.spyOn(Array.prototype, 'sort').mockImplementation(function (this: unknown[], by) {
      ranked.push({ by, rows: [...this] });
      return real.call(this, by);
    });
    updatePointLightPool(16, camera);
    updatePointLightPool(32, camera);
    sort.mockRestore();

    expect(ranked.length).toBe(2);
    expect(ranked[1].by).toBe(ranked[0].by);
    expect(ranked[1].rows.every(row => ranked[0].rows.includes(row))).toBe(true);
    expect(pointLightPoolLights().map(light => light.position.x).sort()).toEqual([1, 2]);
  });
});
