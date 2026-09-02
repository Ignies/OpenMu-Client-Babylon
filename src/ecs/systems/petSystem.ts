import { Vector3 } from '../../libs/babylon/exports';
import {
  DARK_HORSE,
  DARK_RAVEN,
  MOUNT_ACTION_MOVE,
  MOUNT_ACTION_STAND,
  PET_GROUP,
  petFactoryFor,
  petSpec,
  type PetSpec,
} from '../../common/pets';
import { createAngleDeg, turnAngle } from '../../common/turnAngle';
import { inChaosCastle } from '../../common/locomotion';
import type { Entity, ISystemFactory, Item } from '../world';

/**
 * `Mounts[]` — the pet objects that live in the world rather than on the
 * wearer's skeleton (GOBoid.cpp:66-680).
 *
 *  - **Guardian Angel**: a boid. It drifts on a heading it re-rolls roughly
 *    every 32 ticks, turns back towards its owner once it is more than
 *    `FlyRange` away, and is nudged to stay between 100 and 200 units above
 *    the owner's feet.
 *  - **Uniria / Dinorant**: pinned to the rider's position and yaw, standing
 *    (action 0) or moving (action 2). A Dinorant drops 30 units below the
 *    rider, who is lifted the same 30 off the terrain (AnimationSystem).
 *
 * Both fade out inside a safe zone (`o->Alpha = 0`, GOBoid.cpp:497-501) and
 * are never created in Chaos Castle (`CreateMountSub`:68). The Imp is *not*
 * here: it is link-rendered on the owner's bone 34 (`PlayerObject.Pet`).
 *
 *  - **Dark Raven** (`CSPetDarkSpirit`, CSPetSystem.cpp:291-610): worn in the
 *    *left hand*, so it gets its own slot beside the helper pet. It circles
 *    its owner ~250 units up (350 over a Dark Horse, FlyRange 150) and, in a
 *    safe zone, lands beside the owner's shoulder instead of fading out.
 *    The perch is an approximation: the original glues it to bone 37, which
 *    a world object here cannot reach.
 *
 * **Not ported:** the Dark Horse and the four Fenrirs, which need the Dark
 * Lord / Rage Fighter ride clip families the player model in this tree has
 * no actions for.
 */

const MU_UNIT = 1 / 100;
const TICKS_PER_SECOND = 25;

/** `TurnAngle2(o->Angle[2], Angle, 20.f)` — 20° per tick (GOBoid.cpp:636). */
const TURN_DEGREES_PER_TICK = 20;

/** The `rand_fps_check(32)` re-roll interval, in ticks. */
const REROLL_TICKS = 32;

/** Height band the angel is nudged back into, in MU units (GOBoid.cpp:656-657). */
const ANGEL_MIN_HEIGHT = 100;
const ANGEL_MAX_HEIGHT = 200;
const ANGEL_HEIGHT_NUDGE = 1.5;

/** `o->Velocity` — the PlaySpeed each pet's clip runs at. */
const ANGEL_PLAY_SPEED = 0.5;
const MOUNT_PLAY_SPEED = 0.34;
/** `CSPetSystem::PlayAnimation`: the raven's clips run at 0.4. */
const RAVEN_PLAY_SPEED = 0.4;

/** Raven heights over the owner, in MU units (CSPetSystem.cpp:450-470). */
const RAVEN_HEIGHT = 250;
const RAVEN_HEIGHT_HORSE = 350;
const RAVEN_HEIGHT_NUDGE = 1.5;
/** `Position[2] += 300` when the raven is created. */
const RAVEN_SPAWN_HEIGHT = 300;
/** `Distance > 409600` (640 units) — the far failsafe that snaps it home. */
const RAVEN_SNAP_DISTANCE = 640;

/** DarkSpirit.bmd clips: 0 glide, 1 flap, 2 perch, 3 attack. */
const RAVEN_ACTION_FLY = 0;
const RAVEN_ACTION_FLYING = 1;
const RAVEN_ACTION_STAND = 2;

/** The perch beside the owner's shoulder, in world units (see header). */
const RAVEN_PERCH_UP = 1.4;
const RAVEN_PERCH_SIDE = 0.25;
/** `o->Angle[2] -= 120` while perched. */
const RAVEN_PERCH_YAW = -120 * (Math.PI / 180);

const DEG = Math.PI / 180;

const rand = (n: number) => Math.floor(Math.random() * n);

function sameItem(a: Item | null, b: Item | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.group === b.group && a.num === b.num;
}

function ravenOf(item: Item | null | undefined): Item | null {
  return item && item.group === PET_GROUP && item.num === DARK_RAVEN
    ? item
    : null;
}

export const PetSystem: ISystemFactory = world => {
  const owners = world.with('charAppearance', 'transform', 'visibility');
  const actors = world.with('petActor', 'transform');

  /** The pet item each owner currently has an actor for, per slot. */
  const spawned = new Map<Entity, Item | null>();
  const spawnedRaven = new Map<Entity, Item | null>();

  function despawn(owner: Entity, raven: boolean) {
    (raven ? spawnedRaven : spawned).delete(owner);

    for (const actor of [...actors.entities]) {
      if (actor.petActor.owner !== owner) continue;
      if ((actor.petActor.kind === 'raven') !== raven) continue;
      world.remove(actor);
      actor.modelObject?.dispose();
    }
  }

  owners.onEntityRemoved.subscribe(owner => {
    despawn(owner, false);
    despawn(owner, true);
  });

  function spawn(owner: Entity, item: Item, spec: PetSpec) {
    const pos = owner.transform!.pos;

    // CreateMountSub seeds the angel a couple of tiles away and above its
    // owner; a mount starts exactly on him (GOBoid.cpp:114-125). The raven
    // starts 300 units straight up (CSPetSystem.cpp:299).
    const angel = spec.kind === 'angel';
    const raven = spec.kind === 'raven';

    world.add({
      worldIndex: owner.worldIndex ?? world.mapIndex,
      transform: {
        pos: new Vector3(
          pos.x + (angel ? (rand(512) - 256) * MU_UNIT : 0),
          pos.y +
            (angel ? (rand(128) + 128) * MU_UNIT : 0) +
            (raven ? RAVEN_SPAWN_HEIGHT * MU_UNIT : 0),
          pos.z + (angel ? (rand(512) - 256) * MU_UNIT : 0)
        ),
        rot: new Vector3(0, owner.transform!.rot.y, 0),
        scale: spec.scale,
        posOffset: new Vector3(0.5, 0, 0.5),
      },
      modelFactory: petFactoryFor(spec),
      visibility: { state: 'hidden', lastChecked: 0 },
      petActor: {
        owner,
        kind: angel ? 'angel' : raven ? 'raven' : 'mount',
        yaw: owner.transform!.rot.y,
        dir: { x: 0, y: 0, z: 0 },
        reroll: 0,
        flyRange: (spec.flyRange ?? 0) * MU_UNIT,
        drop: spec.mountDrop ?? 0,
        standAction: spec.standAction ?? MOUNT_ACTION_STAND,
        moveAction: spec.moveAction ?? MOUNT_ACTION_MOVE,
      },
    });

    (raven ? spawnedRaven : spawned).set(owner, item);
  }

  function updateAngel(actor: Entity, dt: number) {
    const state = actor.petActor!;
    const pos = actor.transform!.pos;
    const target = state.owner.transform?.pos;
    if (!target) return;

    const ticks = dt * TICKS_PER_SECOND;

    const dx = target.x - pos.x;
    const dz = target.z - pos.z;
    const far = dx * dx + dz * dz >= state.flyRange * state.flyRange;

    if (far) {
      const heading = createAngleDeg(pos.x, pos.z, target.x, target.z) * DEG;
      state.yaw = turnAngle(
        state.yaw,
        heading,
        TURN_DEGREES_PER_TICK * DEG * ticks
      );
    }

    // rand_fps_check(32): a fresh heading and speed roughly every 32 ticks.
    state.reroll -= ticks;
    if (state.reroll <= 0) {
      state.reroll = REROLL_TICKS;

      // Forward is -Y in the original's object space, so the speed is negative.
      const speed = far ? -(rand(64) + 128) * 0.1 : -(rand(64) + 16) * 0.1;

      if (!far) state.yaw = rand(360) * DEG;

      state.dir.y = speed;
      state.dir.z = (rand(64) - 32) * 0.1;
    }

    // Height band, applied to the direction rather than to the position.
    const height = (pos.y - target.y) / MU_UNIT;
    if (height < ANGEL_MIN_HEIGHT) state.dir.z += ANGEL_HEIGHT_NUDGE * ticks;
    if (height > ANGEL_MAX_HEIGHT) state.dir.z -= ANGEL_HEIGHT_NUDGE * ticks;

    // VectorRotate((0, speed, dz), AngleMatrix(0, 0, yaw)) with a negative
    // speed points along the facing direction.
    const step = state.dir.y * MU_UNIT * ticks;
    pos.x += -Math.sin(state.yaw) * step;
    pos.z += Math.cos(state.yaw) * step;
    pos.y += state.dir.z * MU_UNIT * ticks;
    // o->Position[2] += rand() % 16 - 8: a flutter on top of the drift.
    pos.y += (rand(16) - 8) * MU_UNIT * ticks;

    actor.transform!.rot.y = state.yaw;

    actor.modelObject?.setAnimationSpeed(ANGEL_PLAY_SPEED);
    actor.modelObject?.playAction(MOUNT_ACTION_STAND, true);
  }

  /**
   * `CSPetDarkSpirit::MovePet`, PET_FLY / PET_FLYING (CSPetSystem.cpp:420-505):
   * the same boid drift as the angel, but 250 units over the owner (350 when
   * he rides a Dark Horse), dashing home once it drifts past FlyRange. The
   * original steers height through the pitch angle; the angel's direction
   * nudge stands in for it.
   */
  function updateRaven(actor: Entity, dt: number) {
    const state = actor.petActor!;
    const pos = actor.transform!.pos;
    const owner = state.owner;
    const target = owner.transform?.pos;
    if (!target) return;

    const ticks = dt * TICKS_PER_SECOND;

    const dx = target.x - pos.x;
    const dz = target.z - pos.z;
    const distance2 = dx * dx + dz * dz;
    const far = distance2 >= state.flyRange * state.flyRange;

    // The far failsafe (:598-608): way off or far below, snap back home.
    const snap = RAVEN_SNAP_DISTANCE * MU_UNIT;
    if (distance2 > snap * snap || pos.y < target.y - 2) {
      pos.x = target.x;
      pos.z = target.z;
      pos.y = target.y + RAVEN_SPAWN_HEIGHT * MU_UNIT;
    }

    if (far) {
      // TurnAngle2(..., RangeFloat(0,14) + 5): 5..19 degrees per tick.
      const heading = createAngleDeg(pos.x, pos.z, target.x, target.z) * DEG;
      state.yaw = turnAngle(state.yaw, heading, (rand(15) + 5) * DEG * ticks);
    }

    state.reroll -= ticks;
    if (state.reroll <= 0) {
      state.reroll = REROLL_TICKS;

      // Far: a dash back (128..191); near: a lazy circle (32..39) on a
      // rerolled heading. Speeds are negative - forward is -Y (see the angel).
      const speed = far ? -(rand(64) + 128) * 0.1 : -(rand(8) + 32) * 0.1;
      if (!far) state.yaw += rand(60) * DEG;

      state.dir.y = (speed + state.dir.y) / 2;
      state.dir.z = (rand(64) - 32) * 0.1;
    }

    const ridesHorse =
      owner.charAppearance?.pet?.group === PET_GROUP &&
      owner.charAppearance.pet.num === DARK_HORSE;
    const wanted = ridesHorse ? RAVEN_HEIGHT_HORSE : RAVEN_HEIGHT;
    const height = (pos.y - target.y) / MU_UNIT;
    if (height < wanted) state.dir.z += RAVEN_HEIGHT_NUDGE * ticks;
    if (height > wanted + 100) state.dir.z -= RAVEN_HEIGHT_NUDGE * ticks;

    const step = state.dir.y * MU_UNIT * ticks;
    pos.x += -Math.sin(state.yaw) * step;
    pos.z += Math.cos(state.yaw) * step;
    pos.y += state.dir.z * MU_UNIT * ticks;

    actor.transform!.rot.y = state.yaw;

    actor.modelObject?.setAnimationSpeed(RAVEN_PLAY_SPEED);
    // `Direction[1] < -12` flips PET_FLY (glide) into PET_FLYING (flap).
    actor.modelObject?.playAction(
      state.dir.y < -12 ? RAVEN_ACTION_FLYING : RAVEN_ACTION_FLY,
      true
    );
  }

  /** PET_STAND (:556-562): perched beside the shoulder, facing 120° off. */
  function perchRaven(actor: Entity) {
    const state = actor.petActor!;
    const target = state.owner.transform?.pos;
    if (!target) return;

    const yaw = state.owner.transform!.rot.y;
    const pos = actor.transform!.pos;
    pos.x = target.x + Math.cos(yaw) * RAVEN_PERCH_SIDE;
    pos.z = target.z + Math.sin(yaw) * RAVEN_PERCH_SIDE;
    pos.y = target.y + RAVEN_PERCH_UP;

    state.yaw = yaw + RAVEN_PERCH_YAW;
    actor.transform!.rot.y = state.yaw;

    actor.modelObject?.setAnimationSpeed(RAVEN_PLAY_SPEED);
    actor.modelObject?.playAction(RAVEN_ACTION_STAND, true);
  }

  function updateMount(actor: Entity) {
    const state = actor.petActor!;
    const target = state.owner.transform?.pos;
    if (!target) return;

    const pos = actor.transform!.pos;
    pos.x = target.x;
    pos.y = target.y - state.drop;
    pos.z = target.z;
    actor.transform!.rot.y = state.owner.transform!.rot.y;

    const velocity = state.owner.movement?.velocity;
    const moving = !!velocity && (velocity.x !== 0 || velocity.y !== 0);

    actor.modelObject?.setAnimationSpeed(MOUNT_PLAY_SPEED);
    actor.modelObject?.playAction(
      moving ? state.moveAction : state.standAction,
      true
    );
  }

  return {
    update: dt => {
      const chaosCastle = inChaosCastle(world.mapIndex);

      for (const owner of owners) {
        const wanted = chaosCastle ? null : owner.charAppearance.pet;
        const spec = petSpec(wanted);
        // The Imp is not a world object — PlayerObject.Pet carries it.
        const wantsActor = spec && spec.kind !== 'imp' ? wanted : null;

        if (!sameItem(spawned.get(owner) ?? null, wantsActor)) {
          despawn(owner, false);
          if (wantsActor && spec) spawn(owner, wantsActor, spec);
        }

        // The raven rides the left-hand slot, beside whatever the pet slot holds.
        const raven = chaosCastle
          ? null
          : ravenOf(owner.charAppearance.leftHand);
        if (!sameItem(spawnedRaven.get(owner) ?? null, raven)) {
          despawn(owner, true);
          const ravenSpec = petSpec(raven);
          if (raven && ravenSpec) spawn(owner, raven, ravenSpec);
        }
      }

      for (const actor of actors) {
        const state = actor.petActor;

        const inSafeZone =
          state.owner.attributeSystem?.isAboveZero('inSafeZone') ?? false;

        // The raven stays visible in town: it perches instead of fading.
        if (state.kind === 'raven') {
          actor.modelObject?.setAlpha(1);
          if (inSafeZone) perchRaven(actor);
          else updateRaven(actor, dt);
          continue;
        }

        // Safe zone: the original just fades them out (o->Alpha = 0).
        actor.modelObject?.setAlpha(inSafeZone ? 0 : 1);
        if (inSafeZone) continue;

        if (state.kind === 'angel') updateAngel(actor, dt);
        else updateMount(actor);
      }
    },
  };
};
