import {
  createMovableFlare,
  type MovableFlare,
} from '../../common/effectLights';
import { MapTileObject } from '../../common/mapTileObject';
import { lightMapObjectWith } from '../../lighting/mapObjectLights';
import { PRIORITY_TORCH, type LightSource } from '../../lighting/lightSource';
import { Store } from '../../store';
import type { Entity, World } from '../../ecs/world';
import { findBone, bonePosed, type BoneNode } from './bones';

/**
 * `wchar_t indexLight[7] = { 1, 2, 4, 6, 9, 10, 11 }` (ZzzObject.cpp:3169):
 * the seven candle tips of `Object12/Object12.glb`.
 */
const FLAME_BONES: readonly number[] = [1, 2, 4, 6, 9, 10, 11];

/** `CreateSprite(BITMAP_LIGHT, Position, 0.5f, Light, o)`: sprite scale. */
const FLARE_SCALE = 0.5;

/**
 * `Luminosity = sinf((o->Angle[2] * 20 + WorldTime) * 0.001f) * 0.5f + 0.5f`
 * (ZzzObject.cpp:3171): a 6.3 s breath phased by the candelabra's yaw x 20 ms,
 * so eleven of them along the walls do not pulse together.
 */
const PULSE_SPEED = 0.001;
const YAW_PHASE_MS = 20;

/** `Vector(Luminosity * 1.f, Luminosity * 0.5f, 0.f, Light)`: candle orange. */
const FLARE_COLOR: readonly [number, number, number] = [1, 0.5, 0];

/**
 * Ours: the original lights nothing on this map (`AddTerrainLight` is never
 * called in Blood Castle), but eleven seven-flame candelabra that leave the
 * stone around them black read as props. One pooled light per candelabra at
 * the object, range 3 tiles, candle colour, riding the same breath.
 */
const LIGHT_RANGE = 3;
const POINT_RANGE = 5;

/** Updates to wait for the skeleton to be posed before lighting anyway. */
const POSE_WAIT_LIMIT = 120;

/**
 * Blood Castle type 11, the candelabra (x11, EncTerrain12.obj): seven light
 * sprites on the candle-tip bones, brightness a slow sine phased by yaw
 * (ZzzObject.cpp:3165-3181). Sprites are sized once and only their
 * brightness follows the sine — the same trade Stadium's brazier makes.
 */
export class BloodCastleCandelabraObject extends MapTileObject {
  #bones: BoneNode[] = [];
  #flares: MovableFlare[] = [];
  #source: LightSource | null = null;
  #lit = false;
  #waited = 0;
  #disposed = false;

  async init(world: World, entity: Entity) {
    await super.init(world, entity);

    for (const index of FLAME_BONES) {
      const bone = findBone(this, index);
      if (bone) this.#bones.push(bone);
    }
  }

  /** `o->Angle[2]` in degrees, back out of the render rotation. */
  #yawDegrees(): number {
    return (this.node.rotation.y * 180) / Math.PI;
  }

  #light(world: World): void {
    this.#lit = true;

    const scale = this.node.scaling.x;

    for (const bone of this.#bones) {
      void createMovableFlare(
        world.scene,
        FLARE_SCALE * scale,
        FLARE_COLOR
      ).then(flare => {
        if (!flare) return;
        if (this.#disposed) {
          flare.dispose();
          return;
        }
        const p = bone.getAbsolutePosition();
        flare.moveTo(p.x, p.y, p.z);
        this.#flares.push(flare);
      });
    }

    const phaseMs = (this.#yawDegrees() * YAW_PHASE_MS) | 0;
    this.#source = lightMapObjectWith(
      world.scene,
      {
        color: FLARE_COLOR,
        range: LIGHT_RANGE,
        pointRange: POINT_RANGE,
        pulse: { speed: PULSE_SPEED, amount: 0.5, base: 0, phase: phaseMs },
        priority: PRIORITY_TORCH,
        instant: false,
      },
      this.node.getAbsolutePosition()
    );
  }

  dispose(): void {
    this.#disposed = true;
    for (const f of this.#flares) f.dispose();
    this.#flares = [];
    this.#source?.dispose();
    this.#source = null;
    this.#bones = [];
    super.dispose();
  }

  Update(gameTime: World['gameTime']): void {
    super.Update(gameTime);

    if (!this.Ready || this.#bones.length === 0) return;

    const world = Store.world;
    if (!world) return;

    if (!this.#lit) {
      if (
        bonePosed(this, this.#bones[0]) ||
        ++this.#waited >= POSE_WAIT_LIMIT
      ) {
        this.#light(world);
      }
      return;
    }

    if (this.OutOfView || this.#flares.length === 0) return;

    const worldTime = gameTime.TotalGameTime.TotalSeconds * 1000;
    const lumi =
      Math.sin((this.#yawDegrees() * YAW_PHASE_MS + worldTime) * PULSE_SPEED) *
        0.5 +
      0.5;

    for (const flare of this.#flares) flare.setLuminosity(lumi);
  }
}
