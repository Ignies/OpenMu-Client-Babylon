/** What a model is made of, for the PBR character looks. See readme.md. */
export const SURFACE_NONE = 0;
export const SURFACE_GEAR = 1;
export const SURFACE_CLOTH = 2;
export const SURFACE_SKIN = 3;

export type Surface = 0 | 1 | 2 | 3;

type SurfaceRule = (modelKey: string) => Surface | undefined;

let rule: SurfaceRule = () => undefined;

/** Content's classifier, handed in at boot; it is asked with `modelKey`'s form. */
export function registerSurfaces(next: SurfaceRule): void {
  rule = next;
}

/** `Data/Player/ArmorMale10.glb` -> `player/armormale10`: folder and file, lowercase, no extension. */
export function modelKey(path: string): string {
  const parts = path.toLowerCase().replace(/\\/g, '/').split('/');
  const file = (parts.at(-1) ?? '').replace(/\.[^.]*$/, '');

  return parts.length > 1 ? `${parts.at(-2)}/${file}` : file;
}

export function surfaceOf(path: string): Surface {
  return rule(modelKey(path)) ?? SURFACE_NONE;
}
