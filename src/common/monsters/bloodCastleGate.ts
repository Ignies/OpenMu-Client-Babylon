import type { Entity, World } from '../../ecs/world';
import { entityPos, tmpA, type RGB } from '../../effects/core';
import { spawnCrystalShards } from '../deathVisuals';
import { loadGLTF } from '../modelLoader';
import { MonsterObject } from '../monsterObject';
import { monsterModelFile, monsterScaleOf } from './monsterModelTable';

/**
 * The two things in Blood Castle you break instead of kill. OpenMU sends them
 * as ordinary NPCs (`Destructible`, numbers 131 and 132-134), so they arrive
 * through the monster path and only their look is special.
 *
 * Shared by both (ZzzCharacter.cpp:13407-13425): scale 0.8, no shadow at all
 * - they sit in a wall and on an altar, and the original turns
 * `EnableShadow` off for each - and a body drawn from an origin pushed north
 * of where the server says they stand, which is how the big models line up
 * with the masonry (`RenderObject`, ZzzObject.cpp:264-279).
 *
 * Their hits are in `common/impactVisuals.ts` and their deaths in
 * `common/deathVisuals.ts`, next to every other special hit and death.
 */

/** [NpcInfo(131, "Castle Gate")] - MONSTER_MODEL_CASTLE_GATE. */
const CASTLE_GATE_NPC = 131;
const CASTLE_GATE_MODEL = 61;

/** [NpcInfo(132, "Statue of Saint")] - MONSTER_MODEL_STATUE_OF_SAINT. */
const STATUE_NPC = 132;
const STATUE_MODEL = 60;

/** `Position[1] += 60` / `+= 120` (ZzzObject.cpp:266, :274) - MU y, so north. */
const GATE_ORIGIN_NORTH = 0.6;
const STATUE_ORIGIN_NORTH = 1.2;

/**
 * `RENDER_BRIGHT | RENDER_CHROME` at white and `RENDER_BRIGHT | RENDER_METAL`
 * at (0.3, 0.3, 1) over the lit body (ZzzObject.cpp:1389-1393). Both passes
 * sample BITMAP_CHROME and differ only in how the sphere map is generated, so
 * they fold into the one additive pass `BodyShine` runs, at the tint their
 * sum reads as: a cold blue-white over the crystal.
 */
const STATUE_SHINE: RGB = [0.65, 0.65, 1];

/**
 * `(WorldTime - o->InitialSceneTime) < 1000` (ZzzObject.cpp:1377): for its
 * first second the statue is not drawn at all and its mesh is thrown out as
 * crystal instead - it assembles out of the storm.
 */
const ASSEMBLE_SECONDS = 1;
/** Bursts over that second, and crystals a burst; the original rolls per vertex per frame. */
const ASSEMBLE_BURSTS = 6;
const ASSEMBLE_SHARDS = 2;
/** Tiles up the storm centres, about the statue's own height. */
const ASSEMBLE_HEIGHT = 1;

/** The body the original draws is `posOffset` tiles north of the server's tile. */
function pushOriginNorth(entity: Entity, tiles: number): void {
  if (entity.transform) entity.transform.posOffset = { x: 0, y: 0, z: tiles };
}

// [NpcInfo(131, "Castle Gate")] - the gate in the castle wall on the far side
// of the moat. Breaking it is what opens the way in.
export class CastleGate extends MonsterObject {
  static {
    CastleGate.OverrideScale = monsterScaleOf(CASTLE_GATE_NPC);
  }

  CastsShadow = false;

  async init(world: World, entity: Entity) {
    await super.init(world, entity);

    pushOriginNorth(entity, GATE_ORIGIN_NORTH);

    this.load(await loadGLTF(monsterModelFile(CASTLE_GATE_MODEL), world));
  }
}

// [NpcInfo(132, "Statue of Saint")] - the crystal statue on the altar, the
// thing the whole run is for. 133 and 134 are the same statue on the later
// floors.
export class StatueOfSaint extends MonsterObject {
  static {
    StatueOfSaint.OverrideScale = monsterScaleOf(STATUE_NPC);
  }

  CastsShadow = false;

  #world: World | null = null;
  #entity: Entity | null = null;
  #assembleLeft = ASSEMBLE_SECONDS;
  #nextBurst = 0;

  async init(world: World, entity: Entity) {
    this.#world = world;
    this.#entity = entity;
    await super.init(world, entity);

    pushOriginNorth(entity, STATUE_ORIGIN_NORTH);

    this.BodyShine.tint.set(STATUE_SHINE[0], STATUE_SHINE[1], STATUE_SHINE[2]);

    this.load(await loadGLTF(monsterModelFile(STATUE_MODEL), world));

    this.setAlpha(0);
  }

  dispose(): void {
    this.#world = null;
    this.#entity = null;
    super.dispose();
  }

  Update(gameTime: World['gameTime']): void {
    super.Update(gameTime);

    if (!this.Ready || this.#assembleLeft <= 0) return;

    const world = this.#world;
    const entity = this.#entity;
    if (!world || !entity) return;

    const dt = world.scene.getEngine().getDeltaTime() / 1000;
    this.#assembleLeft -= dt;

    if (this.#assembleLeft <= 0) {
      this.setAlpha(1);
      return;
    }

    this.#nextBurst -= dt;
    if (this.#nextBurst > 0) return;
    this.#nextBurst = ASSEMBLE_SECONDS / ASSEMBLE_BURSTS;

    spawnCrystalShards(
      world.scene,
      entityPos(entity, ASSEMBLE_HEIGHT, tmpA),
      ASSEMBLE_SHARDS,
      STATUE_SHINE
    );
  }
}
