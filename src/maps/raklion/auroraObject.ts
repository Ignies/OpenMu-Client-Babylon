import { MapTileObject } from '../../common/mapTileObject';
import { Vector3 } from '../../libs/babylon/exports';
import type { Entity, World } from '../../ecs/world';

/**
 * `R = sinf(WorldTime * 0.002f) * 0.2f + 0.5f`, `G` at `0.0015f`, `B` at
 * `0.0014f` (GM_Raklion.cpp:2248-2251). Three channels on near-but-not-equal
 * periods - 3.14 s, 4.19 s, 4.49 s - so they never line up and the sheet
 * drifts through green, blue and violet on a beat that takes minutes to
 * repeat. Each stays inside 0.3…0.7; the aurora never goes white and never
 * goes out.
 */
const CENTRE = 0.5;
const AMOUNT = 0.2;
const RATES = [0.002, 0.0015, 0.0014] as const;

/**
 * Raklion 76 (GM_Raklion.cpp:1308-1313 and :2245-2254), ×43 - `ohohroraya_R`,
 * the aurora curtains over the ice field. Hatchery places none.
 *
 * Unlike the scarps this is a colour, not a level, so it has to be written
 * per frame. It goes on a vector of the object's own rather than on
 * `modelObject.Light`, which `RenderSystem` overwrites from the terrain after
 * every `Update` (renderSystem.ts:75-82) - the same reason
 * `iceScarpObject.ts` rebinds the metadata. The original overwrites `o->Light`
 * unconditionally too, so the terrain under a curtain never reaches it
 * either way.
 *
 * Not ported: `o->m_bRenderAfterCharacter = true` (:1310). The original holds
 * 46, 53 and 76 out of the object pass and draws them again after the
 * characters, which on an additive `_R` sheet only changes how it sorts
 * against a player standing inside it. The port has no after-character slot
 * for map geometry, and the one that exists (`EFFECT_RENDERING_GROUP`) would
 * take the curtains out of the G-buffer, the cascades and the SSAO to buy it.
 */
export class RaklionAuroraObject extends MapTileObject {
  /** Batched meshes carry no `bodyLight` at all (propBatches.ts:602-608). */
  static Batchable = false;

  readonly #light = new Vector3(CENTRE, CENTRE, CENTRE);

  async init(world: World, entity: Entity): Promise<void> {
    await super.init(world, entity);

    // Shared by reference, so the per-frame write below reaches every mesh.
    for (const mesh of this.getMeshes(true)) {
      if (!mesh.metadata) continue;
      mesh.metadata.bodyLight = this.#light;
    }
  }

  Update(gameTime: World['gameTime']): void {
    super.Update(gameTime);

    if (!this.Ready || this.OutOfView) return;

    // `WorldTime`, milliseconds - the same clock `updateMeshAnimation` reads.
    const t = gameTime.TotalGameTime.TotalSeconds * 1000;

    this.#light.set(
      Math.sin(t * RATES[0]) * AMOUNT + CENTRE,
      Math.sin(t * RATES[1]) * AMOUNT + CENTRE,
      Math.sin(t * RATES[2]) * AMOUNT + CENTRE
    );
  }
}
