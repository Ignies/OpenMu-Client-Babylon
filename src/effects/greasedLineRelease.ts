import { GreasedLineMaterialDefaults, type GreasedLineMesh } from '../libs/babylon/exports';

/**
 * Releases a GreasedLine mesh's material **without** taking the shared
 * empty-colours texture with it — the one place every ribbon (joint.ts) and
 * crackle (itemCrackle.ts) goes through to drop its line.
 *
 * A GreasedLine material that carries no per-point colours — ours never do,
 * the whole line is one `color` — is handed the process-wide singleton that
 * `GreasedLineTools.PrepareEmptyColorsTexture` caches in
 * `GreasedLineMaterialDefaults.EmptyColorsTexture`. That helper rebuilds the
 * texture only when its static is *null*, and
 * `GreasedLineSimpleMaterial.dispose()` disposes whatever sits in
 * `_colorsTexture` without ever nulling it. So the first line released
 * destroys that texture for **every** GreasedLine material in the game, the
 * ones already on screen included, for the rest of the session.
 *
 * The failure is completely silent. A material holding a disposed texture
 * never gets past the texture loop in `ShaderMaterial.isReady()`, so it never
 * builds an effect, and Babylon skips the mesh every frame while it still
 * reports `isEnabled`, `isVisible` and a live position — nothing renders and
 * nothing is logged. It looked like a teleport bug only because a warp always
 * releases *some* crackle (a player leaving scope, the wearer's lamp being
 * rebuilt for the new map); picking up a +9 drop does it just as well.
 *
 * The detach goes through the private `_colorsTexture` field on purpose. The
 * public `colorsTexture` setter of `GreasedLineSimpleMaterial` dereferences
 * the value it is given (`value.getSize()`), so `colorsTexture = null`
 * throws — and a throw out of an effect's release runs up through the ECS
 * update into Babylon's render loop, which never queues its next frame after
 * an exception: the picture freezes while the socket and the audio go on.
 * That was Drain Life's "hang": its tether is the Summoner's only untextured
 * ribbon, so 70 ticks after every cast the release threw. The plugin
 * variant of the material (textured ribbons) keeps `colorsTexture` as a
 * plain field that only ever holds a texture the material owns, resolving
 * the shared default at bind time instead, so it needs no detach.
 *
 * itemAura.ts carries the same trap for the shared flare01 texture, and solves
 * it the way Babylon allows there — `ps.dispose(false)`. `GreasedLineSimpleMaterial`
 * exposes no such flag, so the shared texture is taken off the material first.
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

  // `dispose()` without flags leaves the sheet textures alone — a textured
  // ribbon's sheet is loadEffectTexture's shared cache.
  material.dispose();
}
