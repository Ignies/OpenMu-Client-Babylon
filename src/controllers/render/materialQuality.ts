import { Texture, type AbstractMesh } from './babylon/exports';
import { GameOptions } from '../../features/options/gameOptions';
import { lightingTier } from '../lighting/lightingQuality';
import type { TextKey } from '../../i18n';

/**
 * Material quality: 0 Classic (Standard path); 1 and 2 put every lit mesh on
 * PBR, with derived maps on figures and gear (1) or on everything (2).
 */
/** The tier names, as text keys - the Options slider prints `t()` of these. */
export const MATERIAL_QUALITY_LABEL_KEYS: readonly TextKey[] = [
  'options.quality.classic',
  'options.quality.characters',
  'options.quality.enhanced',
];

export const MATERIAL_QUALITY_MAX = MATERIAL_QUALITY_LABEL_KEYS.length - 1;

export function materialQuality(): number {
  return Math.max(
    0,
    Math.min(MATERIAL_QUALITY_MAX, Math.round(GameOptions.materialQuality))
  );
}

/** True while every lit surface is on the PBR variant (tiers >= 1). */
export function pbrMaterialsOn(): boolean {
  return materialQuality() >= 1;
}

/** True while every lit surface also takes a derived map set (tier 2). */
export function pbrMaterialsEverywhere(): boolean {
  return materialQuality() >= 2;
}

/** Whether a lit mesh takes the PBR material: every one of them above Classic. */
export function pbrCovers(_characterAsset: boolean): boolean {
  return pbrMaterialsOn();
}

/**
 * Asset folders that count as "a character": the animated figures and the
 * gear worn on them. `Item/` is in the list because a knight whose skin takes
 * the derived maps and whose plate does not reads as two different materials
 * bolted together - the armour is also where the metal/rough derivation
 * earns its keep. Drop `'item/'` here to leave equipment flat.
 */
const CHARACTER_ROOTS = ['player/', 'monster/', 'npc/', 'skill/', 'item/'];

/**
 * Whether a model path is character art. Takes the path `loadGLTF` was
 * handed, so it is folder-based and needs no per-texture bookkeeping.
 */
export function isCharacterAsset(path: string): boolean {
  const lower = path.toLowerCase().replace(/\\/g, '/');

  return CHARACTER_ROOTS.some(root => lower.includes(root));
}

/**
 * Whether this mesh takes a derived map set rather than the flat
 * placeholders: characters on tier 1, everything lit on tier 2. Used by the
 * PBR bind and by the glow layer's trim selector (`sceneLook`).
 */
export function meshTakesPbrMaps(mesh: AbstractMesh): boolean {
  if (pbrMaterialsEverywhere()) return true;
  if (!pbrMaterialsOn()) return false;

  return mesh.metadata?.characterAsset === true;
}

/**
 * Gain on the key (sun) and pooled torch lights while the lit meshes are PBR.
 *
 * Babylon's PBR direct diffuse is the Burley BRDF, which carries a 1/pi the
 * Standard path's plain lambert never had; the hemispheric sky term is a
 * `mix` on both and needs no gain. The one place the pi lives (§4.5).
 */
export function directLightGain(): number {
  return pbrMaterialsOn() ? Math.PI : 1;
}

/** Top of the detail slider; the notch at which the maps land full strength. */
export const MATERIAL_DETAIL_MAX = 9;

/**
 * How much of the derived normal / metalness the PBR material keeps, 0..1.
 * See `syncPbrDetail` for what each end of it does.
 */
export function pbrDetailStrength(): number {
  const value = Math.max(
    0,
    Math.min(MATERIAL_DETAIL_MAX, GameOptions.materialDetail)
  );

  return value / MATERIAL_DETAIL_MAX;
}

/**
 * The anisotropy slider's notches, on the art's samplers on tiers >= 1
 *. Babylon clamps the request to `caps.maxAnisotropy`.
 */
export const ANISOTROPY_STEPS: readonly number[] = [1, 2, 4, 8, 16];

export const ANISOTROPY_MAX = ANISOTROPY_STEPS.length - 1;

/** The player's anisotropy, whatever the tier. 1 is off. */
export function filterAnisotropy(): number {
  const step = Math.max(
    0,
    Math.min(ANISOTROPY_MAX, Math.round(GameOptions.anisotropy))
  );

  return ANISOTROPY_STEPS[step] ?? 16;
}

export type TextureFiltering = { sampling: number; anisotropy: number };

/**
 * Sampler state for the art, per lighting tier. Classic reads level 0 with
 * nearest filtering, the way the original binds every texture
 * (GlobalBitmap.cpp:680: one level, no mip chain); tiers >= 1 filter
 * trilinear with the player's anisotropy. Mip chains are built at load on
 * every tier so the flip is a sampler write, not a reload; Classic's mode
 * never reads them.
 */
export function textureFiltering(): TextureFiltering {
  if (lightingTier() === null) {
    return { sampling: Texture.NEAREST_NEAREST, anisotropy: 1 };
  }

  return {
    sampling: Texture.TRILINEAR_SAMPLINGMODE,
    anisotropy: filterAnisotropy(),
  };
}

/**
 * Scale for a light's `specular` colour, cancelling `directLightGain` back out
 * of the specular term.
 *
 * `light.intensity` scales *both* `vLightDiffuse` and `vLightSpecular`
 * (`Light.transferToEffect`), but the gain above exists only to undo Burley's
 * 1/pi on the diffuse - the GGX specular never carried that factor. Left
 * alone, every highlight the PBR material draws came out pi times too hot.
 */
export function specularLightScale(): number {
  return 1 / directLightGain();
}
