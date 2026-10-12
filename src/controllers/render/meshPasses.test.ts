import { afterAll, describe, expect, it, vi } from 'vitest';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { Skeleton } from '@babylonjs/core/Bones/skeleton';
import type { AnimationGroup } from '@babylonjs/core/Animations/animationGroup';
import { BlendState } from '@versions/shared/objects/enum';
import { getMaterial } from '../assets/modelLoader';
import { ModelObject } from './modelObject';
import type { MeshPassSet } from './meshPasses';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

const engine = new NullEngine();
const scene = new Scene(engine);
afterAll(() => engine.dispose());

const at = (seconds: number) => ({ TotalGameTime: { TotalSeconds: seconds } }) as Parameters<ModelObject['Update']>[0];

/** A model with `count` lit meshes on the shared item material, as the loader hands them out. */
function body(count: number) {
  const root = new Mesh('body', scene);
  for (let i = 0; i < count; i++) {
    const mesh = new Mesh(`mesh${i}`, scene);
    mesh.parent = root;
    mesh.material = getMaterial(scene, false, 0, BlendState.ALPHA_DISABLE);
  }
  return { mesh: root, skeleton: new Skeleton('body', 'body', scene), animationGroups: [] as AnimationGroup[] };
}

function loaded(set: MeshPassSet, count = 3) {
  const object = new ModelObject(scene);
  object.MeshPasses = set;
  const gltf = body(count);
  object.load(gltf);
  const meshes = gltf.mesh.getChildMeshes(false);
  return { object, meshes, base: meshes.slice(0, count), passes: meshes.slice(count) };
}

describe('a model branch\'s mesh passes (RenderPartObjectBody)', () => {
  it('draws an additive copy over the lit mesh, its BlendMeshLight and UVs moving with WorldTime', () => {
    const { object, base, passes } = loaded({
      passes: [{ mesh: 1, kind: 'add', gain: ms => ms / 1000, v: ms => ms * 0.0005 }],
    });
    expect(passes).toHaveLength(1);
    const [pass] = passes;
    expect(base[1].isVisible).toBe(true);
    expect(pass.isVisible).toBe(true);
    expect(pass.metadata.brightMesh).toBe(true);
    expect(pass.metadata.bodyLight).toBe(object.Light);
    expect(pass.metadata.shadowSkip).toBe(true);
    object.Update(at(2));
    expect(pass.metadata.blendMeshLight).toBeCloseTo(2);
    expect(pass.metadata.uvScroll.v).toBeCloseTo(1);
  });

  it('hides the meshes the branch does not draw and those a bright or unlit pass replaces', () => {
    const { base, passes } = loaded({
      drawn: [0, 1],
      passes: [
        { mesh: 0, kind: 'unlit', texture: 'Effect/Chrome01.OZJ', map: 'chrome' },
        { mesh: 1, kind: 'bright' },
      ],
    });
    expect(base.map(m => m.isVisible)).toEqual([false, false, false]);
    expect(passes.map(m => m.isVisible)).toEqual([true, true]);
    expect(passes[0].metadata.uvMap).toBe(1);
    expect(passes[0].metadata.brightMesh).toBe(false);
    expect(passes[1].metadata.brightMesh).toBe(true);
  });

  it('writes a pass\'s own BodyLight from the body\'s every frame', () => {
    const { object, passes } = loaded({
      passes: [{ mesh: 2, kind: 'add', light: (ms, b, out) => out.set(b.x * ms, 0, 0.5) }],
    });
    object.Light.set(0.5, 1, 1);
    object.Update(at(0.002));
    const light = passes[0].metadata.bodyLight;
    expect(light).not.toBe(object.Light);
    expect([light.x, light.y, light.z]).toEqual([1, 0, 0.5]);
  });

  it('copies every drawn mesh for a RenderBody pass (mesh -1)', () => {
    const { passes } = loaded({ drawn: [0, 2], passes: [{ mesh: -1, kind: 'add', map: 'chrome' }] });
    expect(passes.map(m => m.name)).toEqual(['mesh0_pass', 'mesh2_pass']);
  });

  it('puts the model back as it was while the option leaves the passes off', () => {
    let on = true;
    const { object, base, passes } = loaded({ drawn: [0], passes: [{ mesh: 1, kind: 'bright' }], shown: () => on });
    on = false;
    object.Update(at(1));
    expect(base.map(m => m.isVisible)).toEqual([true, true, true]);
    expect(passes[0].isVisible).toBe(false);
    on = true;
    object.Update(at(2));
    expect(base.map(m => m.isVisible)).toEqual([true, false, false]);
    expect(passes[0].isVisible).toBe(true);
  });
});
