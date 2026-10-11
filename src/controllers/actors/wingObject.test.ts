import { afterAll, describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>;
  g.location ??= { href: 'http://localhost/', search: '', hostname: 'localhost', protocol: 'http:' };
});

// The layer is fetched from Data/ in the browser; here it never lands.
vi.mock('../assets/mu', async importOriginal => ({
  ...(await importOriginal<object>()),
  loadMuSprite: () => new Promise(() => {}),
}));

import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import { CreateBox, Mesh, Skeleton, TransformNode, type Texture } from '../render/babylon/exports';
import { FIDELITY_CLASSIC, FIDELITY_DEFAULT, setFidelityChoice } from '@/controllers/fidelity';
import type { World } from '../../ecs/world';
import { WingObject } from './wingObject';
import { wingSpec } from './wings';

const engine = new NullEngine();
const scene = new Scene(engine);
afterAll(() => engine.dispose());

/** A converted wing: one mesh per BMD mesh; an unskinned GLB hangs them under its `model_<name>` node. */
function wing(meshes: number, nested = false) {
  const root = new Mesh('wing', scene);
  const parent = nested ? new TransformNode('model_wing', scene) : root;
  parent.parent = nested ? root : null;
  for (let i = 0; i < meshes; i++) {
    const mesh = new Mesh(`mesh${i}`, scene);
    mesh.parent = parent;
    mesh.metadata = {};
  }
  return { mesh: root, skeleton: new Skeleton('wing', 'wing', scene), animationGroups: [] };
}

const tick = { TotalGameTime: { TotalSeconds: 1 } } as World['gameTime'];

// Wing of Ruin draws mesh 1 again with BITMAP_3RDWING_LAYER (ZzzObject.cpp:6944-6946).
describe('the Wing of Ruin layer', () => {
  it('is read top-down, like the GLB textures it shares the UVs of', () => {
    const object = new WingObject(scene);
    object.prepare(wingSpec({ group: 12, num: 39 } as Parameters<typeof wingSpec>[0]));
    object.load(wing(2));
    object.Update(tick);

    const layer = object.getMesh(2)?.metadata?.diffuseTexture as Texture;
    expect(layer.name).toContain('Item/msword01_r.OZJ');
    expect(layer.invertY).toBe(false);
  });

  it('is drawn on an unskinned model too, whose meshes sit under its model node', () => {
    const object = new WingObject(scene);
    object.prepare(wingSpec({ group: 12, num: 39 } as Parameters<typeof wingSpec>[0]));
    object.load(wing(2, true));
    object.Update(tick);
    expect(object.getMesh(2)?.metadata?.diffuseTexture).toBeDefined();
  });
});

// RenderLinkObject draws every wing's shadow, blend mesh included, and a cape's cloth alone (ZzzCharacter.cpp:8404-8447).
describe('the Classic shadow of the back item', () => {
  /** A one-mesh model with geometry, named so its shadow clone can be found. */
  function solid(name: string) {
    const root = new Mesh(name, scene);
    CreateBox(`${name}_body`, { size: 1 }, scene).parent = root;
    return { mesh: root, skeleton: new Skeleton(name, name, scene), animationGroups: [] };
  }
  const item = (num: number) => wingSpec({ group: 12, num } as Parameters<typeof wingSpec>[0]);

  it('is cast by a wing on Classic, its blend card too, and never by a cape model, whose cloth casts it', () => {
    setFidelityChoice(FIDELITY_CLASSIC, {});
    const elf = new WingObject(scene);
    elf.prepare(item(0));
    elf.load(solid('wingOfElf'));
    const cape = new WingObject(scene);
    cape.prepare(item(40));
    cape.load(solid('capeOfEmperor'));
    setFidelityChoice(FIDELITY_DEFAULT, {});

    expect(scene.getMeshByName('wingOfElf_shadow0')).not.toBeNull();
    expect(scene.getMeshByName('capeOfEmperor_shadow0')).toBeNull();
    // The cascades still take the cape.
    expect(cape.CastsShadow).toBe(true);
  });
});
