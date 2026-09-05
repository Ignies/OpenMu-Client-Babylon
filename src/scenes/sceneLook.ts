import {
  GlowLayer,
  type AbstractMesh,
  type ArcRotateCamera,
  type Scene,
  type Texture,
} from '../libs/babylon/exports';
import { GameOptions, onGameOptionsChanged } from '../common/gameOptions';
import {
  itemHaloAt,
  itemGlowClock,
  type ItemVisualTier,
} from '../common/itemVisualTier';
import { improvedItemEffectsOn } from '../common/itemEffectMode';
import {
  meshTakesPbrMaps,
  pbrDetailStrength,
  pbrMaterialsOn,
} from '../common/materialQuality';
import { pbrMapsIfReady } from '../common/pbrMaps';
import { syncMaterialQuality } from '../common/modelLoader';
import { syncPbrDetail } from '../common/itemMaterial';
import { installMaterialDebug } from './materialDebug';
import { lookDirector } from '../lighting/director';
import type { AreaLookName } from '../lighting/profiles';

/**
 * The glow layer and the item-tier emissive selectors, plus the area
 * hand-off to the look director. The look itself - key, shadows, haze, post
 * chain - is composed by `lighting/director.ts`; this file owns nothing that
 * writes a light or the pipeline.
 */

const SLIDER_MAX = 9;

/** GlowLayer strength at the top slider notch; the default 5/9 lands on the
 * 0.25 the layer was tuned at. */
const GLOW_MAX_INTENSITY = 0.45;

export type SceneLook = {
  glow: GlowLayer;
};

export type AreaMoodName = AreaLookName;

/** GlowLayer gain on the trim emissive map (the surface adds its own share). */
const TRIM_GLOW = 0.6;

/** The PBR material's emissive map for a mesh, when it takes one and it exists. */
function trimEmissive(mesh: AbstractMesh) {
  // At Detail 0 the surface adds no emissive of its own, so the halo goes
  // with it.
  if (!meshTakesPbrMaps(mesh) || pbrDetailStrength() <= 0) return null;

  return pbrMapsIfReady(mesh.metadata?.diffuseTexture)?.emissive ?? null;
}

export function applySceneLook(
  scene: Scene,
  _camera: ArcRotateCamera
): SceneLook {
  const glow = new GlowLayer('glow', scene, {
    mainTextureFixedSize: 256,
    blurKernelSize: 32,
  });
  glow.intensity = 0;

  // Item glow: the item materials are shared and frozen with a black
  // emissive, so the layer is a no-op until a mesh carries an `itemTier` -
  // then it glows with the tier's pulsing colour on the shared clock.
  glow.customEmissiveColorSelector = (mesh, _subMesh, _material, result) => {
    const tier = mesh.metadata?.itemTier as ItemVisualTier | null | undefined;

    if (!tier || !tier.improvedActive || !improvedItemEffectsOn()) {
      // Gems and trim glow through their emissive map; the texture selector
      // below hands the map over, this is its gain.
      if (trimEmissive(mesh)) result.set(TRIM_GLOW, TRIM_GLOW, TRIM_GLOW, 1);
      else result.set(0, 0, 0, 1);
      return;
    }

    // The capped halo ladder, not the surface intensity: the layer floods
    // the whole silhouette, and at surface strength it drowns the armor
    // into one bright blob.
    itemHaloAt(tier, itemGlowClock(), result);
  };

  // A tier glow covers the whole mesh, so the trim map only stands in when
  // no tier is active - otherwise it would mask the tier colour to the trim.
  glow.customEmissiveTextureSelector = (mesh, _subMesh, material) => {
    const tier = mesh.metadata?.itemTier as ItemVisualTier | null | undefined;
    const own = (material as { emissiveTexture?: Texture | null }).emissiveTexture ?? null;

    // Babylon types the return as non-null but handles null (no texture).
    if (tier && tier.improvedActive && improvedItemEffectsOn()) return own!;

    return ((trimEmissive(mesh) as Texture | null) ?? own)!;
  };

  const look = { glow };

  syncGlowIntensity(look);
  syncPbrDetail();
  installMaterialDebug(scene);

  onGameOptionsChanged(() => {
    syncMaterialQuality(scene);
    syncPbrDetail();
    syncGlowIntensity(look);
  });

  return look;
}

function syncGlowIntensity(look: SceneLook): void {
  // The improved item look is drawn by the glow layer, so it stays alive
  // without post-processing - otherwise "Improved" is invisible.
  const live = GameOptions.postProcessing || improvedItemEffectsOn();

  look.glow.intensity = live
    ? (Math.max(0, GameOptions.glow) / SLIDER_MAX) * GLOW_MAX_INTENSITY
    : 0;
}

/** Area (tavern) hand-off: the map's `create` calls this at the door. */
export function setAreaMood(name: AreaMoodName | null): void {
  lookDirector()?.setArea(name);
}

/**
 * The GlowLayer has no render list - it draws *every active mesh* into its
 * own render target every frame and lets the emissive selectors decide the
 * colour, so a scene where nothing glows still pays for a second full
 * geometry pass. Nothing glows unless an item tier is stamped, a blend mesh
 * has been handed its own material, or a PBR trim emissive map is live - so
 * the layer is switched off outright the rest of the time.
 */
const GLOW_PROBE_INTERVAL = 0.25;

let glowProbeTimer = 0;
let glowSourcesPresent = false;

/** Re-checks on the next frame instead of waiting out the interval. */
export function requestGlowProbe(): void {
  glowProbeTimer = 0;
}

function anyGlowSource(scene: Scene): boolean {
  const improved = improvedItemEffectsOn();
  // The derivation only binds an emissive map when saturated highlights cover
  // enough of the texture, and most of the world's art clears that bar
  // nowhere, so the probe asks the meshes instead of assuming.
  const pbr = pbrMaterialsOn();

  for (const mesh of scene.meshes) {
    const meta = mesh.metadata;
    if (!meta) continue;

    if (meta.glowOwnMaterial) return true;

    if (pbr && trimEmissive(mesh)) return true;

    const tier = meta.itemTier as ItemVisualTier | null | undefined;
    if (improved && tier?.improvedActive) return true;
  }

  return false;
}

/** Per frame: the glow layer's on/off gate. */
export function updateSceneLook(scene: Scene, look: SceneLook | undefined): void {
  if (!look) return;

  glowProbeTimer -= scene.getEngine().getDeltaTime() / 1000;

  if (glowProbeTimer <= 0) {
    glowProbeTimer = GLOW_PROBE_INTERVAL;
    glowSourcesPresent = anyGlowSource(scene);
  }

  const enabled = glowSourcesPresent && look.glow.intensity > 0;

  if (look.glow.isEnabled !== enabled) look.glow.isEnabled = enabled;
}
