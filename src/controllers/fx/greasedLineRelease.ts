import { GreasedLineMaterialDefaults, type GreasedLineMesh } from '../render/babylon/exports';

/**
 * Release a GreasedLine mesh's material without disposing the shared
 * `GreasedLineMaterialDefaults.EmptyColorsTexture` (detached through the private
 * `_colorsTexture`; the public setter throws on null). See fx/readme.md.
 */
export function releaseGreasedLineMaterial(mesh: GreasedLineMesh): void {
  // Cast through `unknown`: `_colorsTexture` is private on the real class, so
  // an intersection with it collapses to `never`.
  const material = mesh.material as unknown as
    | { _colorsTexture?: unknown; dispose(): void }
    | null;

  if (!material) return;

  const shared: unknown = GreasedLineMaterialDefaults.EmptyColorsTexture;

  // Only ever detach the shared one: a material that owns its colours texture
  // must still take it with it.
  if (shared && material._colorsTexture === shared) {
    material._colorsTexture = null;
  }

  // `dispose()` without flags leaves the sheet textures alone - a textured
  // ribbon's sheet is loadEffectTexture's shared cache.
  material.dispose();
}
