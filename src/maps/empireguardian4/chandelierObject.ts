import {
  BonedParticleEmitter,
  type BonedEmission,
} from '../../common/effectParticles';
import { MapTileObject } from '../../common/mapTileObject';
import { lightMapObject } from '../../lighting/mapObjectLights';
import type { LightSource } from '../../lighting/lightSource';
import { Store } from '../../store';
import type { Entity, World } from '../../ecs/world';
import { findBone } from './bones';
import { EMPIRE_GUARDIAN_4_CHANDELIER } from './spec';

/** `int arriCandleFire[] = {22, 23, 25}` (GMEmpireGuardian4.cpp:1063). */
const FIRE_BONES = [22, 23, 25] as const;

/** `int arriCandleSmoke[] = {26, 24, 21}` (:1064). */
const SMOKE_BONES = [26, 24, 21] as const;

/** Updates to wait for a posed skeleton before lighting anyway. */
const POSE_WAIT_LIMIT = 120;

/**
 * Day 4's chandelier, type 157 (`Object73/Object158.glb`, `Chandelier.smd`,
 * 27 bones, x6 in EncTerrain73.obj).
 *
 * `RenderObjectVisual` case 157 (GMEmpireGuardian4.cpp:1050-1098) burns three
 * wick bones and smokes three others, and its first line is
 *
 * ```cpp
 * if (WorldActive == WD_73NEW_LOGIN_SCENE || WorldActive == WD_74NEW_CHARACTER_SCENE)
 *     return true;
 * ```
 *
 * so the chandelier is lit on **day 4 only** and is deliberately cold on the
 * login and character scenes. `common/mapTileObject.ts` has it the other way
 * round - it builds the bone fire when `WorldIndex === WD_73NEW_LOGIN_SCENE`
 * and never on `WD_72EMPIREGUARDIAN4` - which is why this class exists and
 * why it is registered for day 4 alone.
 *
 * **Sprite counts.** The original spawns five of each flame kind per bone per
 * tick and four smokes per bone per tick: 30 sprites a tick from one
 * chandelier, 180 from the six on World73, against a shared 2048 pool with
 * the 120 braziers of type 79 already in it. The counts below are the shared
 * login-scene recipe's (two flames, one smoke), which fills the same volume
 * and leaves the pool something to spend on the rest of the map.
 *
 * `vLightFlareFire` (:1066) is computed and never used in the original; there
 * is no flare card on this object, only the light.
 */
export class EmpireGuardian4ChandelierObject extends MapTileObject {
  static Batchable = false;

  #fire: BonedParticleEmitter | null = null;
  #source: LightSource | null = null;
  #lit = false;
  #waited = 0;
  #anchors: BonedEmission['node'][] = [];

  async init(world: World, entity: Entity): Promise<void> {
    await super.init(world, entity);

    const scale = this.node.scaling.x;
    const points: BonedEmission[] = [];

    for (const bone of FIRE_BONES) {
      const node = findBone(this, bone);
      if (!node) continue;

      this.#anchors.push(node);

      points.push(
        {
          node,
          kinds: ['fire157'],
          count: 2,
          scale: scale * 0.2,
          light: [0.9, 0.5, 0],
        },
        {
          node,
          kinds: ['fire157'],
          count: 2,
          scale: scale * 0.1,
          light: [0.75, 0.3, 0],
        }
      );
    }

    for (const bone of SMOKE_BONES) {
      const node = findBone(this, bone);
      if (!node) continue;

      points.push({
        node,
        kinds: ['smoke65'],
        count: 1,
        scale: scale * 0.1,
        light: [1, 1, 1],
      });
    }

    if (points.length) this.#fire = new BonedParticleEmitter(world.scene, points);
  }

  /** The wicks have left the object origin, so the skeleton has been posed. */
  #posed(): boolean {
    const origin = this.node.getAbsolutePosition();

    for (const anchor of this.#anchors) {
      const p = anchor.getAbsolutePosition();

      if (
        Math.abs(p.x - origin.x) > 1e-3 ||
        Math.abs(p.y - origin.y) > 1e-3 ||
        Math.abs(p.z - origin.z) > 1e-3
      ) {
        return true;
      }
    }

    return false;
  }

  dispose(): void {
    this.#fire = null;
    this.#anchors = [];

    this.#source?.dispose();
    this.#source = null;

    super.dispose();
  }

  Update(gameTime: World['gameTime']): void {
    super.Update(gameTime);

    if (!this.Ready) return;

    if (!this.#lit) {
      const world = Store.world;
      if (!world) return;

      if (this.#posed() || ++this.#waited >= POSE_WAIT_LIMIT) {
        this.#lit = true;

        // At the object origin, the way the original's own light would hang:
        // the chandelier is a ceiling fixture and its six wicks are within a
        // tile of each other, so following them buys nothing.
        this.#source = lightMapObject(
          world.scene,
          EMPIRE_GUARDIAN_4_CHANDELIER,
          this.node.position
        );
      }

      return;
    }

    if (this.OutOfView) return;

    this.#fire?.update();
  }
}
