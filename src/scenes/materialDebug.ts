import type { Scene } from '../libs/babylon/exports';
import { GameOptions } from '../common/gameOptions';
import { t } from '../i18n';
import {
  MATERIAL_QUALITY_LABEL_KEYS,
  materialQuality,
  pbrDetailStrength,
  pbrKeyGain,
} from '../common/materialQuality';
import { livePbrMaterials } from '../common/itemMaterial';
import { liveTileArrays } from '../libs/mu/tileTextureArray';

/**
 * `muMat()` in the browser console: what the Materials/Detail options are
 * actually doing to the live scene, rather than what they are supposed to do.
 *
 * Exists because three rounds of Classic-vs-Enhanced work landed no visible
 * change, and the difference between "the option is wired wrong" and "the
 * option is wired right but pulls on the wrong thing" is not answerable by
 * reading the source. The last one of these was settled the same
 * way — by measuring instead of reasoning.
 */
export function installMaterialDebug(scene: Scene): void {
  (globalThis as Record<string, unknown>).muMat = () => {
    const tier = materialQuality();

    const materials = livePbrMaterials().map(m => ({
      name: m.name,
      metallic: m.metallic,
      roughness: m.roughness,
      specularIntensity: m.specularIntensity,
      bumpLevel: m.bumpTexture?.level ?? null,
      frozen: m.isFrozen,
    }));

    // Which material each drawn mesh actually ended up on, and whether it
    // carries the character flag `pbrCovers` routes on.
    const census = new Map<string, number>();
    let flagged = 0;
    let missingFlag = 0;

    for (const mesh of scene.meshes) {
      if (!mesh.isEnabled() || !mesh.material) continue;

      const key = mesh.material.name || mesh.material.getClassName();
      census.set(key, (census.get(key) ?? 0) + 1);

      if (mesh.metadata?.characterAsset === true) flagged++;
      else if (mesh.metadata?.characterAsset === undefined) missingFlag++;
    }

    const tiles = liveTileArrays().map(t => ({
      name: t.name,
      samplingMode: t.samplingMode,
      anisotropy: t.anisotropicFilteringLevel,
    }));

    const report = {
      option: {
        materialQuality: GameOptions.materialQuality,
        tier: t(MATERIAL_QUALITY_LABEL_KEYS[tier]),
        materialDetail: GameOptions.materialDetail,
        detailStrength: pbrDetailStrength(),
        keyGain: pbrKeyGain(),
        lightingQuality: GameOptions.lightingQuality,
      },
      pbrMaterials: materials,
      tileArrays: tiles,
      meshes: {
        total: scene.meshes.length,
        withCharacterFlag: flagged,
        withoutCharacterFlagField: missingFlag,
      },
      materialCensus: [...census.entries()].sort((a, b) => b[1] - a[1]),
    };

    console.log(JSON.stringify(report, null, 2));
    return report;
  };

  console.log('[mu] material debug ready — run muMat() in the console');
}
