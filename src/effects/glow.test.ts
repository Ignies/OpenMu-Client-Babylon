import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AbstractMesh, GlowLayer, RenderTargetTexture } from '../libs/babylon/exports';

type Glow = typeof import('./glow');

let loaded: Glow | null = null;

/** Fresh modules per test: the seam is read once at load. */
async function load(query = '') {
  vi.resetModules();
  vi.stubGlobal('location', { search: query });

  const [glow, bjs, { NullEngine }] = await Promise.all([
    import('./glow'),
    import('../libs/babylon/exports'),
    import('@babylonjs/core/Engines/nullEngine'),
  ]);

  loaded = glow;

  const engine = new NullEngine();
  const scene = new bjs.Scene(engine);
  const camera = new bjs.ArcRotateCamera('cam', 0, 0, 10, bjs.Vector3.Zero(), scene);

  camera.setPosition(new bjs.Vector3(0, 0, -10));
  scene.activeCamera = camera;

  const plane = (name: string, z = 0): AbstractMesh => {
    const mesh = bjs.CreatePlane(name, { size: 1 }, scene);
    mesh.position.z = z;
    return mesh;
  };

  const layer = (): GlowLayer =>
    scene.effectLayers.find(l => l.name === 'fxGlow') as GlowLayer;

  const target = (): RenderTargetTexture =>
    (layer() as unknown as { _mainTexture: RenderTargetTexture })._mainTexture;

  /** One frame; returns the meshes the halo drew into its map, in order. */
  const frame = (): string[] => {
    const drawn: string[] = [];
    const observer = layer().onBeforeRenderMeshToEffect.add(m => drawn.push(m.name));

    scene.render();
    layer().onBeforeRenderMeshToEffect.remove(observer);

    return drawn;
  };

  const listed = (): string[] | null => target().renderList?.map(m => m.name) ?? null;

  /**
   * An included card in view, a mesh in view the halo does not own, an
   * included card behind the camera, one at visibility 0 and one dropped.
   */
  const stage = () => {
    const card = plane('card');
    plane('wall', 1);
    const behind = plane('behind', -20);
    const faded = plane('faded');
    const dropped = plane('dropped');

    faded.visibility = 0;

    for (const mesh of [card, behind, faded, dropped]) glow.addEffectGlow(scene, mesh);
    glow.dropEffectGlow(dropped);
  };

  return { glow, scene, plane, layer, target, frame, listed, stage };
}

afterEach(() => {
  loaded?.disposeEffectGlow();
  loaded = null;
  vi.unstubAllGlobals();
});

describe('effect halo render list', { timeout: 30_000 }, () => {
  it('draws the same meshes as the unlisted walk, from a list of just those', async () => {
    const on = await load();
    on.stage();

    const drawnOn = [on.frame(), on.frame()];

    expect(on.listed()).toEqual(['card']);
    on.glow.disposeEffectGlow();

    const off = await load('?fxHaloList=0');
    off.stage();

    const drawnOff = [off.frame(), off.frame()];

    expect(off.listed()).toBeNull();
    expect(drawnOff).toEqual([['card'], ['card']]);
    expect(drawnOn).toEqual(drawnOff);
  });

  it('follows the include set without a re-drive', async () => {
    const { glow, plane, scene, frame, listed, stage } = await load();
    stage();
    frame();

    const late = plane('late');
    glow.addEffectGlow(scene, late);

    expect(frame()).toEqual(['card', 'late']);
    expect(listed()).toEqual(['card', 'late']);

    glow.dropEffectGlow(late);

    expect(frame()).toEqual(['card']);
    expect(listed()).toEqual(['card']);
  });

  it('drives the target a resize rebuilds', async () => {
    const { layer, target, frame, listed, stage } = await load();
    stage();
    frame();

    const first = target();

    // EffectLayer.render()'s size-change branch, run after a frame's draw. The
    // null engine never composes, so the layer never reaches it by itself.
    const rebuild = layer() as unknown as {
      _disposeTextureAndPostProcesses(): void;
      _createMainTexture(): void;
      _createTextureAndPostProcesses(): void;
    };

    rebuild._disposeTextureAndPostProcesses();
    rebuild._createMainTexture();
    rebuild._createTextureAndPostProcesses();

    expect(target() === first).toBe(false);
    expect(listed()).toBeNull();

    expect(frame()).toEqual(['card']);
    expect(listed()).toEqual(['card']);
  });

  it('drives the next layer after a map change', async () => {
    const { glow, scene, plane, target, frame, listed, stage } = await load();
    stage();
    frame();

    const first = target();
    glow.disposeEffectGlow();

    expect(first.renderList === null).toBe(true);

    glow.addEffectGlow(scene, plane('next'));

    expect(frame()).toEqual(['next']);
    expect(listed()).toEqual(['next']);
  });

  it('leaves a layer that never turns on list-less', async () => {
    const { glow, scene, plane, layer, frame, listed } = await load();
    const card = plane('card');

    glow.addEffectGlow(scene, card);
    glow.dropEffectGlow(card);

    expect(layer().isEnabled).toBe(false);
    frame();
    expect(listed()).toBeNull();
  });
});
