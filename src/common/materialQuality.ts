import type { AbstractMesh } from '../libs/babylon/exports';
import { GameOptions } from './gameOptions';
import type { TextKey } from '../i18n';

/**
 * Material quality. Classic is the faithful flat pipeline — the
 * shared Standard-derived item material, byte-for-byte what the game shipped
 * with. The two tiers above it swap the lit object materials for a PBR
 * variant fed with normal / metallic-roughness / emissive maps derived from
 * the diffuse art (`pbrMaps.ts`), or authored overrides from `Data/PBR/`
 * when present.
 *
 * Only *lit* surfaces move: additive `_R` blend cards and flat-lit UI models
 * stay on the Standard path in every mode, so the texture-script flags keep
 * working untouched. Terrain is still the hand-written shader in both modes
 * (its NME port is the next slice).
 *
 * What separates Characters from Enhanced is the *scope of the derived maps*,
 * not which material is bound. That distinction is deliberate and load-
 * bearing: `directLightGain` raises the sun and the torch pool by π to undo
 * Burley's 1/π, and that gain lands on every light in the scene at once. A
 * mode that left some lit meshes on the Standard path would blow those meshes
 * out by π — so every lit mesh stays on the PBR material above Classic, and
 * the tier only decides whose diffuse gets a derived normal / metal-rough /
 * emissive set. Meshes outside the scope bind the flat placeholders, which is
 * a smooth, fully rough, non-metal surface — PBR lighting with none of the
 * derived relief that makes MU's 128² world art read as plastic.
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

/** True while *any* lit surface is on the PBR variant. */
export function pbrMaterialsOn(): boolean {
  return materialQuality() >= 1;
}

/** True while *every* lit surface is on the PBR variant (the Enhanced tier). */
export function pbrMaterialsEverywhere(): boolean {
  return materialQuality() >= 2;
}

/**
 * Whether a mesh from this kind of asset takes the PBR material. Characters
 * only on tier 1, everything lit on tier 2.
 */
export function pbrCovers(characterAsset: boolean): boolean {
  if (materialQuality() >= 2) return true;
  if (materialQuality() < 1) return false;

  return characterAsset;
}

/**
 * Asset folders that count as "a character": the animated figures and the
 * gear worn on them. `Item/` is in the list because a knight whose skin takes
 * the derived maps and whose plate does not reads as two different materials
 * bolted together — the armour is also where the metal/rough derivation
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
 * Whether this mesh is on the PBR material, and so takes a derived map set
 * rather than the flat placeholders. Used by the glow layer's trim selector
 * (`sceneLook`), which sees meshes from both paths at once.
 */
export function meshTakesPbrMaps(mesh: AbstractMesh): boolean {
  return pbrCovers(mesh.metadata?.characterAsset === true);
}

/**
 * Gain on the key (sun) and pooled torch lights, for the tier where *every*
 * lit surface is PBR.
 *
 * Babylon's PBR direct diffuse is the Burley BRDF, which carries a 1/π the
 * Standard path's plain lambert never had; the hemispheric sky term is a
 * `mix` on both and needs no gain. Without this, a torch that paints a
 * Classic character orange barely registers on the Enhanced one — the sky
 * light dominates and the figure reads flat and grey.
 *
 * `light.intensity` is scene-wide, so this is only safe while nothing lit is
 * left on the Standard path: on the Characters tier the world *is* on
 * Standard, and a π on the sun would brighten every wall and crate in the map
 * by π. That tier leaves the lights at their Classic values and lets the PBR
 * material make the difference up on its own — see `pbrKeyGain`.
 */
export function directLightGain(): number {
  return pbrMaterialsEverywhere() ? Math.PI : 1;
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

let keyGain = 1;

/**
 * Diffuse lift the PBR material applies to itself when the lights are at
 * their Classic intensities (the Characters tier), so a figure standing next
 * to a Standard-lit wall is exposed like it.
 *
 * With no π on the lights, the PBR figure keeps the sky term whole — the
 * hemispheric is a `mix` on both paths — but takes only 1/π of the sun and
 * the torches. This restores the *total* key budget rather than each light's
 * share, which is the part that reads as "the character is in a different
 * scene": the figure lands at the Classic exposure with its sun shaping a
 * little softer and its torches a little cooler than a Classic figure's.
 *
 * The exact fix is per-light routing, which Babylon can only express with
 * per-mesh include/exclude lists or a layer-mask bit shared with the camera —
 * both of which cost more than the residual error does.
 */
export function setPbrKeyGain(skyIntensity: number, sunIntensity: number) {
  keyGain =
    pbrMaterialsEverywhere() || sunIntensity <= 0
      ? 1
      : (skyIntensity + sunIntensity) /
        (skyIntensity + sunIntensity / Math.PI);
}

export function pbrKeyGain(): number {
  return keyGain;
}

/**
 * Scale for a light's `specular` colour, cancelling `directLightGain` back out
 * of the specular term.
 *
 * `light.intensity` scales *both* `vLightDiffuse` and `vLightSpecular`
 * (`Light.transferToEffect`), but the gain above exists only to undo Burley's
 * 1/π on the diffuse — the GGX specular never carried that factor. Left
 * alone, every highlight the PBR material draws came out π× too hot, which is
 * what blew the tavern counter and the floor sheen out to flat yellow under
 * the torches. Pre-dividing the specular colour restores the intended
 * highlight and leaves the diffuse match with Classic intact.
 */
export function specularLightScale(): number {
  return 1 / directLightGain();
}
