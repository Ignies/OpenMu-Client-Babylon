import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import { CreateGreasedLine } from '@babylonjs/core/Meshes/Builders/greasedLineBuilder';
import { GreasedLineMeshMaterialType } from '@babylonjs/core/Materials/GreasedLine/greasedLineMaterialInterfaces';
import { GreasedLineMaterialDefaults } from '@babylonjs/core/Materials/GreasedLine/greasedLineMaterialDefaults';
import type { GreasedLineMesh } from '@babylonjs/core/Meshes/GreasedLine/greasedLineMesh';
import '@babylonjs/core/Materials/GreasedLine/greasedLineSimpleMaterial';
import { releaseGreasedLineMaterial } from './greasedLineRelease';

/**
 * Two traps sit on the way out of a GreasedLine material, and both bit the
 * game silently: `GreasedLineSimpleMaterial.dispose()` takes the shared
 * empty-colours texture down with it (every later ribbon and crackle stops
 * rendering), and its public `colorsTexture` setter dereferences the value
 * it is given, so "detaching" through it with `null` throws — which, from an
 * effect's release inside the frame loop, killed Babylon's render loop and
 * froze the picture (the Drain Life "hang"). The helper has to avoid both.
 */
describe('releaseGreasedLineMaterial', () => {
  let engine: NullEngine;
  let scene: Scene;

  beforeEach(() => {
    engine = new NullEngine();
    scene = new Scene(engine);
  });

  afterEach(() => {
    engine.dispose();
  });

  function line(materialType: GreasedLineMeshMaterialType): GreasedLineMesh {
    return CreateGreasedLine(
      'line',
      { points: [[0, 0, 0, 1, 1, 1]], updatable: true },
      { width: 0.1, materialType },
      scene
    ) as GreasedLineMesh;
  }

  it('releases an untextured (simple material) line without throwing', () => {
    const mesh = line(GreasedLineMeshMaterialType.MATERIAL_TYPE_SIMPLE);
    expect(() => {
      releaseGreasedLineMaterial(mesh);
      mesh.dispose();
    }).not.toThrow();
  });

  it('keeps the shared empty-colours texture alive for the next line', () => {
    const first = line(GreasedLineMeshMaterialType.MATERIAL_TYPE_SIMPLE);
    const shared = GreasedLineMaterialDefaults.EmptyColorsTexture;
    expect(shared).toBeTruthy();
    expect(scene.textures).toContain(shared);

    releaseGreasedLineMaterial(first);
    first.dispose();

    // Disposing a texture removes it from the scene; the shared one must stay.
    expect(scene.textures).toContain(shared);
    expect(GreasedLineMaterialDefaults.EmptyColorsTexture).toBe(shared);

    const second = line(GreasedLineMeshMaterialType.MATERIAL_TYPE_SIMPLE);
    expect(second.material).toBeTruthy();
    releaseGreasedLineMaterial(second);
    second.dispose();
  });

  it('releases a textured (standard + plugin) line without throwing', () => {
    const mesh = line(GreasedLineMeshMaterialType.MATERIAL_TYPE_STANDARD);
    expect(() => {
      releaseGreasedLineMaterial(mesh);
      mesh.dispose();
    }).not.toThrow();
  });
});
