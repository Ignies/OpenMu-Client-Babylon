import { MapTileObject } from '../../common/mapTileObject';
import {
  lightMapObjectWith,
  tarkanGlowLamp,
} from '../../lighting/mapObjectLights';
import type { LightSource } from '../../lighting/lightSource';
import type { AbstractMesh } from '../../libs/babylon/exports';
import type { Entity, World } from '../../ecs/world';

/**
 * `sinf((WorldTime + (o->Angle[2] * 100)) * 0.002f) * 0.35f + 0.65f`
 * (ZzzObject.cpp:4060). One sine, used twice: as the lamp's own
 * `BlendMeshLight` and as the luminosity of its terrain light.
 *
 * The `* 100` is the whole reason this is a class. `o->Angle[2]` is the map
 * record's yaw in degrees, so each lamp's sine is offset by its own
 * orientation — EncTerrain9.obj gives type 7 eighteen distinct yaws between
 * -660 deg and +330 deg, i.e. offsets from -66 s to +33 s against a 3.14 s
 * period. The 98 lamps pulse out of step with each other, which is what the
 * `phase` on the recipe's pulse carries (`tarkanGlowLamp` in the lighting
 * layer's map-object table); the table in `meshAnimation.ts` cannot express
 * it, because it builds its functions from `WorldTime` alone.
 */
const PHASE_MS_PER_DEGREE = 100;

const DEGREES_PER_RADIAN = 180 / Math.PI;

/**
 * Tarkan 7 (ZzzObject.cpp:4058-4069), ×98 — the red glow lamp that lines the
 * temple approaches and the sunken stairs, at scales from 0.12 to 1.5. The
 * densest cluster (7.7/229.9) has 27 inside the 32-tile load radius, all
 * pulsing on different phases.
 *
 * The terrain colour `(L, L*0.6, L*0.2)` is the same warm ramp the braziers
 * use; the lamp reads red because `redB.jpg` on its blend mesh is red, not
 * because the light is.
 */
export class TarkanGlowLampObject extends MapTileObject {
  #blendMesh: AbstractMesh | null = null;

  #source: LightSource | null = null;

  async init(world: World, entity: Entity): Promise<void> {
    // `entity.transform.rot.y` is `toRadians(Angle[2])` straight off the map
    // record (loadMapIntoScene.createObjects). Not `node.rotation.y`: that
    // has been through `toRenderAngles`, which mirrors the yaw for the
    // left-handed scene and would phase every lamp backwards.
    const yawDegrees = (entity.transform?.rot.y ?? 0) * DEGREES_PER_RADIAN;
    const phaseMs = yawDegrees * PHASE_MS_PER_DEGREE;

    await super.init(world, entity);

    this.#blendMesh = this.getMesh(this.BlendMesh) ?? null;

    this.#source = lightMapObjectWith(
      world.scene,
      tarkanGlowLamp(phaseMs),
      this.node.position
    );
  }

  dispose(): void {
    this.#source?.dispose();
    this.#source = null;
    this.#blendMesh = null;

    super.dispose();
  }

  Update(gameTime: World['gameTime']): void {
    super.Update(gameTime);

    // `metadata.blendMeshLight` is what `bindBodyLight` multiplies the body
    // light by (itemMaterial.ts:285-297) — the port's `BlendMeshLight`. The
    // light's red channel *is* the sine (colour `(L, 0.6L, 0.2L)`), so the
    // mesh reads it from the source and the two can never drift apart. Off
    // screen only the mesh write is skipped, because a terrain light behind
    // the camera still lights tiles the camera sees.
    if (this.OutOfView || !this.#blendMesh?.metadata || !this.#source) return;

    this.#blendMesh.metadata.blendMeshLight = this.#source.color.r;
  }
}
