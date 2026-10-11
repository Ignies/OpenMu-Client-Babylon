import { afterAll, describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import { ModelObject } from '../render/modelObject';
import { dressItemModel } from './itemModel';

const engine = new NullEngine();
const scene = new Scene(engine);
afterAll(() => engine.dispose());

/** An item model dressed as the ground and the bag dress it. */
function dressed(group: number, num: number) {
  const object = new ModelObject(scene);
  dressItemModel(object, group, num);
  const { tint, chromeOnly } = object.BodyShine;
  return { tint: [tint.x, tint.y, tint.z], chromeOnly, lit: object.ShineLight, mesh: object.ShineMesh };
}

// RenderPartObjectBody (ZzzObject.cpp:8067-8121): BodyLight set to the element's colour, then RENDER_TEXTURE and
// RENDER_BRIGHT | RENDER_CHROME over it; a sphere draws its mesh 1 first at the body's light and leaves it out.
describe('the seeds and seed spheres', () => {
  it('draw a seed whole in its element\'s colour with Chrome01 over it', () => {
    expect(dressed(12, 60)).toEqual({ tint: [0.9, 0.1, 0.2], chromeOnly: true, lit: true, mesh: -1 }); // fire
    expect(dressed(12, 61).tint).toEqual([0.4, 0.5, 1]); // water
    expect(dressed(12, 65).tint).toEqual([1, 0.4, 1]); // earth
  });

  it('draw a sphere but its mesh 1 so, by its element at every level', () => {
    expect(dressed(12, 100)).toEqual({ tint: [0.9, 0.1, 0.2], chromeOnly: true, lit: true, mesh: 0 });
    expect(dressed(12, 118).tint).toEqual([0.9, 0.1, 0.2]); // level 4 fire
    expect(dressed(12, 129).tint).toEqual([1, 0.4, 1]); // level 5 earth
  });

  it('leave every other item unshone', () => {
    expect(dressed(12, 66)).toEqual({ tint: [0, 0, 0], chromeOnly: undefined, lit: false, mesh: -1 });
    expect(dressed(14, 13).tint).toEqual([0, 0, 0]);
  });
});

// RenderPartObjectEffect's MODEL_FIRECRACKER branch (ZzzObject.cpp:9602-9620): mesh 0 textured at BodyLight 1, 1, 1,
// then mesh 1 textured and RENDER_BRIGHT | RENDER_CHROME at BodyLight 1, 0, 0.
describe('the fireworks', () => {
  it('draw mesh 0 at full light and mesh 1 red with Chrome01 over it', () => {
    const object = new ModelObject(scene);
    dressItemModel(object, 14, 63);
    expect(dressed(14, 63)).toEqual({ tint: [1, 0, 0], chromeOnly: true, lit: true, mesh: 1 });
    expect(object.FixedLight).toBe(true);
    expect([object.Light.x, object.Light.y, object.Light.z]).toEqual([1, 1, 1]);
    expect(new ModelObject(scene).FixedLight).toBe(false);
  });
});
