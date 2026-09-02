import type { Entity, World } from '../../ecs/world';
import { effects } from '../../effects';
import { bonePos, entityPos, tmpA } from '../../effects/core';
import {
  EXPLOSION_CELLS,
  MODEL,
  SAND_SMOKE,
  TEX,
} from '../../effects/recipes';
import { loadGLTF } from '../modelLoader';
import { MonsterObject } from '../monsterObject';
import { MonsterActionType } from '../objects/enum';
import { monsterModelFile, monsterScaleOf } from './monsterModelTable';

// [NpcInfo(349, "Balgass")] - MODEL_BALGASS at Scale 2.0
// (GMCrywolf1st.cpp:667-677). His voice (MapManager.cpp:224-230, played per
// action at :1618-1652) is in sound/monsters.ts. Not ported: the
// BITMAP_JOINT_ENERGY mesh wraps (:674-675) and the per-mesh
// RENDER_CHROME2 overlay (:1423-1436) - no mesh-wrap ribbon or monster
// chrome pass exists.
const NPC_TYPE = 349;

/** MONSTER_MODEL_BALGASS. */
const MODEL_TYPE = 89;

/** Attack2 ground slam: bone 33 at key 7.5 (GMCrywolf1st.cpp:806-820). */
const SLAM_BONE = 33;
const SLAM_FRAME = 7.5;
/** 6 x MODEL_BIG_STONE1 plus the BITMAP_EXPLOTION card of the slam. */
const SLAM_STONES = 6;
const SLAM_CARD_TILES = 2.56;
const SLAM_CARD_SECONDS = 0.8;

/** Walking drops a BITMAP_SMOKE + 1 puff per `rand_fps_check(10)` (:824-829). */
const WALK_SMOKE_INTERVAL = 0.4;

export class Balgass extends MonsterObject {
  static {
    Balgass.OverrideScale = monsterScaleOf(NPC_TYPE);
  }

  #world: World | null = null;
  #entity: Entity | null = null;
  #slamSerial = -1;
  #nextSmoke = 0;

  async init(world: World, entity: Entity) {
    await super.init(world, entity);

    this.#world = world;
    this.#entity = entity;

    this.load(await loadGLTF(monsterModelFile(MODEL_TYPE), world));
  }

  Update(gameTime: World['gameTime']): void {
    super.Update(gameTime);

    const world = this.#world;
    const entity = this.#entity;
    if (!this.Ready || !world || !entity || entity.dying) return;

    if (
      this.CurrentAction === MonsterActionType.Attack2 &&
      this.actionSerial !== this.#slamSerial &&
      this.actionFrame() >= SLAM_FRAME
    ) {
      this.#slamSerial = this.actionSerial;

      const at = bonePos(entity, SLAM_BONE, tmpA, 0);
      const light: [number, number, number] = [
        this.Light.x,
        this.Light.y,
        this.Light.z,
      ];
      effects.spawn('sprite', world.scene, at, {
        texture: TEX.explosion,
        colour: [1, 1, 1],
        size: SLAM_CARD_TILES,
        seconds: SLAM_CARD_SECONDS,
        cells: EXPLOSION_CELLS,
      });
      effects.spawn('debris', world.scene, at, {
        model: MODEL.bigStone,
        count: SLAM_STONES,
        colour: light,
      });
      return;
    }

    if (this.CurrentAction === MonsterActionType.Walk && !this.OutOfView) {
      const now = gameTime.TotalGameTime.TotalSeconds;
      if (now < this.#nextSmoke) return;
      this.#nextSmoke = now + WALK_SMOKE_INTERVAL;

      const at = entityPos(entity, 0, tmpA);
      effects.spawn('particles', world.scene, at, {
        recipe: SAND_SMOKE,
        count: 1,
      });
    }
  }
}
