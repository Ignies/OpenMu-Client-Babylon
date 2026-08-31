import { MapTileObject } from '../../common/mapTileObject';
import { ParticleEmitter } from '../../common/effectParticles';
import { toRadians } from '../../common/utils';
import { Store } from '../../store';
import type { Entity, World } from '../../ecs/world';
import {
  bloodCastleGateDown,
  bloodCastleGatePitch,
  bloodCastleGateSmokeDue,
  updateBloodCastleGate,
} from './gate';

/**
 * `for (i < 10) CreateParticleFpsChecked(BITMAP_SMOKE + 1, Position + (±150, -600…-620, 0))`
 * (ZzzObject.cpp:116-124): ten puffs, spread 3 tiles across, 6 tiles *south*
 * of the gate — where the top of a 90° gate lands. The one-tick emitter below
 * is run for a single update, so `count` is the whole burst.
 */
const SMOKE_BURST_COUNT = 10;
const SMOKE_SPREAD = 150;
const SMOKE_SOUTH_TILES = 6;

/**
 * Blood Castle type 36, the gate (x1, at 14.5/76.1, pitch 45 in the object
 * list). Stands over the `TW_NOGROUND` pit until the match's gate-destroyed
 * state, then swings down and vanishes (`ActionObject`, ZzzObject.cpp:96-140);
 * the pit opens and the two debris halves appear. `gate.ts` holds the state;
 * this class only writes the pitch and alpha it reads back.
 */
export class BloodCastleGateObject extends MapTileObject {
  #entity: Entity | null = null;
  #smoke: ParticleEmitter | null = null;
  #smokeTicks = 0;
  #basePitch = 0;

  async init(world: World, entity: Entity) {
    await super.init(world, entity);
    this.#entity = entity;
    this.#basePitch = entity.transform?.rot.x ?? 0;
  }

  dispose(): void {
    this.#smoke = null;
    this.#entity = null;
    super.dispose();
  }

  Update(gameTime: World['gameTime']): void {
    super.Update(gameTime);

    if (!this.Ready) return;

    const world = Store.world;
    if (!world) return;

    updateBloodCastleGate(world, world.scene.getEngine().getDeltaTime() / 1000);

    if (bloodCastleGateDown()) {
      if (this.Alpha > 0) this.setAlpha(0);
      this.#smoke = null;
      return;
    }

    const pitch = bloodCastleGatePitch();
    const t = this.#entity?.transform;
    if (pitch !== null && t) {
      // The object list's pitch went in negated (loadMapIntoScene); the
      // original overwrites `Angle[0]` outright, so this does the same.
      t.rot.x = -toRadians(pitch);
    } else if (t && t.rot.x !== this.#basePitch) {
      t.rot.x = this.#basePitch;
    }

    if (bloodCastleGateSmokeDue()) {
      const p = this.node.position;
      this.#smoke = new ParticleEmitter(
        world.scene,
        [{ kinds: ['smoke2'], every: 1, count: SMOKE_BURST_COUNT, jitter: SMOKE_SPREAD }],
        { x: p.x, y: p.y, z: p.z - SMOKE_SOUTH_TILES },
        this.node.rotation.y,
        this.node.scaling.x
      );
      this.#smokeTicks = 2;
    }

    if (this.#smoke && this.#smokeTicks > 0) {
      this.#smoke.update();
      if (--this.#smokeTicks === 0) this.#smoke = null;
    }
  }
}

/**
 * Blood Castle types 9 and 10, the two broken-gate halves beside the gate
 * (x2 each). `MoveObject` keeps them `HiddenMesh = -2` until `PKKey == 4`,
 * which `ActionObject` sets on the tick the gate is gone
 * (ZzzObject.cpp:4143-4149, :84-98).
 */
export class BloodCastleGateDebrisObject extends MapTileObject {
  async init(world: World, entity: Entity) {
    await super.init(world, entity);
    if (!bloodCastleGateDown()) this.setAlpha(0);
  }

  Update(gameTime: World['gameTime']): void {
    super.Update(gameTime);
    if (!this.Ready) return;

    const shown = bloodCastleGateDown();
    if (shown && this.Alpha < 1) this.setAlpha(1);
    else if (!shown && this.Alpha > 0) this.setAlpha(0);
  }
}
