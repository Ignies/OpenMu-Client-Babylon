import { Vector3 } from '../../libs/babylon/exports';
import {
  DARK_HORSE,
  DARK_RAVEN,
  FENRIR_ACTION_RUN,
  FENRIR_ACTION_SKILL,
  FENRIR_ACTION_WALK,
  MOUNT_ACTION_MOVE,
  MOUNT_ACTION_STAND,
  PET_GROUP,
  fenrirMountAction,
  petFactoryFor,
  petSpec,
  type PetSpec,
} from '../../common/pets';
import { createAngleDeg, turnAngle } from '../../common/turnAngle';
import { inChaosCastle } from '../../common/locomotion';
import { effects } from '../../effects';
import {
  boneLocalPos,
  bonePos,
  delay,
  entityPos,
  fxNow,
  inWindow,
} from '../../effects/core';
import { FOOT_THUNDER_FRAMES, MODEL, TEX } from '../../effects/recipes';
import type { Entity, ISystemFactory, Item } from '../world';

/**
 * `Mounts[]` - the pet objects that live in the world rather than on the
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
 * Only the *mounts* fade out inside a safe zone (`o->Alpha = 0`, the branch
 * each rideable type opens with - GOBoid.cpp:182, :323, :497). MODEL_HELPER
 * has no such branch (:604-621): the angel keeps flying, in town too. None
 * of them are created in Chaos Castle (`CreateMountSub`:68). The Imp is *not*
 * here: it is link-rendered on the owner's bone 34 (`PlayerObject.Pet`).
 *
 *  - **Dark Raven** (`CSPetDarkSpirit`, CSPetSystem.cpp:291-610): worn in the
 *    *left hand*, so it gets its own slot beside the helper pet. It circles
 *    its owner ~250 units up (350 over a Dark Horse, FlyRange 150) and, in a
 *    safe zone, lands beside the owner's shoulder instead of fading out.
 *    The perch is an approximation: the original glues it to bone 37, which
 *    a world object here cannot reach.
 *
 *  - **Dark Horse / Fenrir**: pinned like the horns. The horse walks on
 *    clip 1; a Fenrir mirrors its rider's `PLAYER_FENRIR_*` clip family
 *    (`fenrirMountAction`, MoveMount GOBoid.cpp:200-266) and carries the
 *    eye / jaw glow and the variant-coloured body lightning of
 *    ZzzObject.cpp:855-895.
 */

const MU_UNIT = 1 / 100;
const TICKS_PER_SECOND = 25;

/** `TurnAngle2(o->Angle[2], Angle, 20.f)` - 20° per tick (GOBoid.cpp:636). */
const TURN_DEGREES_PER_TICK = 20;

/** The `rand_fps_check(32)` re-roll interval, in ticks. */
const REROLL_TICKS = 32;

/** Height band the angel is nudged back into, in MU units (GOBoid.cpp:656-657). */
const ANGEL_MIN_HEIGHT = 100;
const ANGEL_MAX_HEIGHT = 200;
const ANGEL_HEIGHT_NUDGE = 1.5;

/** `o->Velocity` - the PlaySpeed each pet's clip runs at. */
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
/** `Distance > 409600` (640 units) - the far failsafe that snaps it home. */
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

/**
 * Fenrir glow cadence. The original re-creates its sprites and lightning
 * every render frame and spawns two bolts each time (ZzzObject.cpp:855-899);
 * at 25 Hz that is ~8 bolts alive at once. Stepping at 14 Hz with two bolts
 * a step keeps the crackle continuous at a third of the spawns.
 */
const FENRIR_GLOW_TICK = 0.07;
const FENRIR_BOLTS_PER_TICK = 2;
/** Eye and jaw anchors: `TransformPosition(BoneTransform[11 / 13], …)`. */
const FENRIR_HEAD_BONE = 11;
const FENRIR_JAW_BONE = 13;
const FENRIR_SKILL_BONE = 14;
const FENRIR_EYE_LOCALS = [
  new Vector3(0.5, 0.02, 0.11),
  new Vector3(0.5, 0.02, -0.11),
];
const FENRIR_JAW_LOCAL = new Vector3(0.4, 0.15, 0);
const FENRIR_EYE_RGB = [0.9, 0.2, 0.1] as const;
const FENRIR_JAW_RGB = [1.0, 0.3, 0.2] as const;
/** `CreateSprite(…, 1.5f)` then `1.0f` on the same point. */
const FENRIR_JAW_SIZES = [1.05, 0.7] as const;

/**
 * Where one body bolt lands, as `rand() % 30` rolls it (ZzzEffect.cpp:4264-4306).
 * Seven rolls in thirty pin it to a bone, two kill it outright, and the
 * remaining twenty leave it at the wolf's own position - scattered wide in x
 * and lifted 110 units - which is what makes the arcs read as a cloud around
 * the body rather than a string of beads on the skeleton.
 */
const DEAD_ROLL = -1;
const FENRIR_BOLT_BONES: readonly (number | null)[] = [
  null,
  10,
  10,
  14,
  2,
  2,
  50,
  51,
  53,
  DEAD_ROLL,
  DEAD_ROLL,
];
/** The four paws `TransformPosition` anchors the footprints to. */
const FENRIR_PAW_BONES = [22, 28, 36, 44] as const;
const FENRIR_FRONT_PAWS = [22, 28] as const;
const FENRIR_BACK_PAWS = [36, 44] as const;
/** `RenderTerrainAlphaBitmap(…, 0.6f, 0.6f, …)`: the splash is 0.6 tiles across. */
const FOOT_THUNDER_TILES = 0.6;
/** `m_iAnimation++` every 200 ms while `Alpha` falls 0.05 a tick. */
const FOOT_THUNDER_FRAME_SECONDS = 0.2;
const FOOT_THUNDER_FRAMES_SHOWN = 4;
/**
 * Which channels `Move_MODEL_FENRIR_FOOT_THUNDER` drains, per variant
 * subtype (MoveHandlers.cpp:6786-6805). The splash is born white and loses
 * these at 0.05 a tick, so it burns down into the wolf's own colour.
 */
const FOOT_THUNDER_DRAIN: Readonly<Record<number, readonly [number, number, number]>> = {
  1: [0, 1, 1],
  2: [1, 1, 0],
  3: [1, 0, 1],
  4: [0, 0, 1],
};

const DEG = Math.PI / 180;

const rand = (n: number) => Math.floor(Math.random() * n);

function sameItem(a: Item | null, b: Item | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.group === b.group && a.num === b.num;
}

/** What an owner currently has an actor for in one slot, and where. */
type Spawned = { item: Item; map: number };

/**
 * A slot has to be rebuilt when the item changed, and when its actor was left
 * behind on another map: `unloadMap` sweeps the actors of the map just left,
 * and one spawned in the gap before the hero is moved sits on his old tile.
 */
function stale(current: Spawned | undefined, item: Item | null, map: number) {
  if (!sameItem(current?.item ?? null, item)) return true;
  return current !== undefined && current.map !== map;
}

function ravenOf(item: Item | null | undefined): Item | null {
  return item && item.group === PET_GROUP && item.num === DARK_RAVEN
    ? item
    : null;
}

export const PetSystem: ISystemFactory = world => {
  const owners = world.with('charAppearance', 'transform', 'visibility');
  const actors = world.with('petActor', 'transform');

  /** The pet each owner currently has an actor for, per slot. */
  const spawned = new Map<Entity, Spawned>();
  const spawnedRaven = new Map<Entity, Spawned>();

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

  // A warp removes every entity of the map just left (`unloadMap`), the pet
  // actors among them. Without this the slot still reads as filled on the new
  // map and the pet only comes back on a re-equip.
  actors.onEntityRemoved.subscribe(actor => {
    glowClocks.delete(actor);
    const state = actor.petActor;
    (state.kind === 'raven' ? spawnedRaven : spawned).delete(state.owner);
  });

  function spawn(owner: Entity, item: Item, spec: PetSpec) {
    const pos = owner.transform!.pos;
    const map = owner.worldIndex ?? world.mapIndex;

    // CreateMountSub seeds the angel a couple of tiles away and above its
    // owner; a mount starts exactly on him (GOBoid.cpp:114-125). The raven
    // starts 300 units straight up (CSPetSystem.cpp:299).
    const angel = spec.kind === 'angel';
    const raven = spec.kind === 'raven';

    world.add({
      worldIndex: map,
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
        fenrirThunder: spec.thunder,
        fenrirFoot: spec.footSubType,
      },
    });

    (raven ? spawnedRaven : spawned).set(owner, { item, map });
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

  /** Per-actor clock for the Fenrir glow spawns. */
  const glowClocks = new Map<Entity, number>();

  const tmpGlow = new Vector3();
  const tmpFoot = new Vector3();

  /**
   * One body bolt: `CreateEffect(MODEL_FENRIR_THUNDER, o->Position, …, 0, o)`
   * plus the `BITMAP_LIGHT` sprite the original hangs on every one of them
   * (ZzzEffect.cpp:4249-4312). The flash lasts about a sixth of a second -
   * alpha 0.7 up to 1 and back down at 0.3 a tick (MoveHandlers.cpp:6645-6675).
   */
  function spawnFenrirBolt(
    actor: Entity,
    colour: readonly [number, number, number]
  ) {
    const scene = world.scene;
    if (!scene) return;

    const roll = FENRIR_BOLT_BONES[rand(30)] ?? null;
    if (roll === DEAD_ROLL) return;

    let scale = 0.3 + Math.random() * 0.2;

    if (roll === null) {
      // The wolf's own position, thrown wide and lifted: ±120 / ±5 / +110.
      entityPos(actor, 0, tmpGlow);
      tmpGlow.x += (rand(240) - 120) * MU_UNIT;
      tmpGlow.z += (rand(10) - 5) * MU_UNIT;
      tmpGlow.y += 110 * MU_UNIT;
      scale += 0.1;
    } else {
      bonePos(actor, roll, tmpGlow, 0.6);
      scale -= 0.2;
    }

    effects.spawn('model', scene, tmpGlow, {
      model: MODEL.lightningType,
      colour,
      seconds: 0.18,
      scale: Math.max(0.1, scale),
      yaw: Math.random() * Math.PI * 2,
      alpha: 0.9,
      fadeIn: 0.25,
      fadeTail: 0.7,
    });

    // `CreateSprite(BITMAP_LIGHT, o->Position, 2.0f, Light − 0.3)`: the halo
    // that makes a bolt read as light rather than as a lit wireframe.
    effects.spawn('sprite', scene, tmpGlow, {
      texture: TEX.flare,
      colour: [
        Math.max(0, colour[0] - 0.3),
        Math.max(0, colour[1] - 0.3),
        Math.max(0, colour[2] - 0.3),
      ],
      size: 0.7,
      seconds: 0.18,
      fadeTail: 0.7,
    });
  }

  /**
   * The splash one paw leaves: `RenderTerrainAlphaBitmap(BITMAP_FENRIR_FOOT_
   * THUNDER1 + (m_iAnimation % 5), …)`, a frame every 200 ms while the object
   * fades and its light drains to the variant's colour (ZzzEffect.cpp:9058,
   * MoveHandlers.cpp:6780-6810). Four frames is where the alpha reaches zero.
   */
  function spawnFootThunder(at: Vector3, subType: number) {
    const drain = FOOT_THUNDER_DRAIN[subType] ?? [0, 0, 0];
    const x = at.x;
    const z = at.z;

    for (let i = 0; i < FOOT_THUNDER_FRAMES_SHOWN; i++) {
      const fade = 1 - i / FOOT_THUNDER_FRAMES_SHOWN;
      // The art is a JPG with a black ground, so it is drawn additive and
      // the fading alpha rides the colour rather than a blend factor.
      const colour: [number, number, number] = [
        fade * (1 - drain[0] * (1 - fade)),
        fade * (1 - drain[1] * (1 - fade)),
        fade * (1 - drain[2] * (1 - fade)),
      ];
      const draw = () => {
        const live = world.scene;
        if (!live) return;
        tmpFoot.set(x, 0, z);
        effects.spawn('ring', live, tmpFoot, {
          texture: FOOT_THUNDER_FRAMES[i],
          colour,
          scale: FOOT_THUNDER_TILES,
          seconds: FOOT_THUNDER_FRAME_SECONDS,
          fadeTail: 0.25,
        });
      };
      if (i === 0) draw();
      else delay(i * FOOT_THUNDER_FRAME_SECONDS, draw);
    }
  }

  /**
   * `MODEL_FENRIR_FOOT_THUNDER` (ZzzObject.cpp:900-940): lightning under the
   * paws on the frames they touch down - all four across the first keys of
   * the walk, the front and back pairs apart on the run.
   */
  function updateFootThunder(actor: Entity) {
    const state = actor.petActor!;
    const model = actor.modelObject;
    if (!model?.gltf || state.fenrirFoot === undefined) return;

    const action = model.CurrentAction;
    const frame = model.actionFrame();
    const prev = state.fenrirFrame ?? -1;
    state.fenrirFrame = frame;

    let paws: readonly number[] | null = null;

    if (action === FENRIR_ACTION_WALK) {
      if (inWindow(prev, frame, 0, 1.5)) paws = FENRIR_PAW_BONES;
    } else if (action === FENRIR_ACTION_RUN) {
      if (inWindow(prev, frame, 1, 1.4)) paws = FENRIR_FRONT_PAWS;
      else if (inWindow(prev, frame, 4.8, 5.2)) paws = FENRIR_BACK_PAWS;
    }

    if (!paws) return;

    for (const bone of paws) {
      bonePos(actor, bone, tmpGlow, 0);
      spawnFootThunder(tmpGlow, state.fenrirFoot);
    }
  }

  /**
   * The per-frame eye / jaw sprites and the variant-coloured body lightning
   * of the original's Fenrir render branch (ZzzObject.cpp:793-940), as
   * periodic effect spawns. Not called in a safe zone - the mount is faded
   * out there and the original skips the branch with it.
   */
  function updateFenrirGlow(actor: Entity, dt: number) {
    const state = actor.petActor!;

    // Read every frame: a footfall window is a fifth of a clip and the glow
    // tick would step straight over it.
    updateFootThunder(actor);

    const clock = (glowClocks.get(actor) ?? 0) + dt;
    if (clock < FENRIR_GLOW_TICK) {
      glowClocks.set(actor, clock);
      return;
    }
    glowClocks.set(actor, clock % FENRIR_GLOW_TICK);

    const scene = world.scene;
    if (!scene || !actor.modelObject?.gltf) return;

    // `sinf(WorldTime * 0.002f) * 0.2f` on a clock in milliseconds: the eyes
    // breathe rather than sitting on one red.
    const lum = Math.sin(fxNow() * 2) * 0.2;

    for (const local of FENRIR_EYE_LOCALS) {
      boneLocalPos(actor, FENRIR_HEAD_BONE, local, tmpGlow);
      effects.spawn('sprite', scene, tmpGlow, {
        texture: TEX.flare,
        colour: [
          FENRIR_EYE_RGB[0] + lum,
          FENRIR_EYE_RGB[1] + lum * 0.5,
          FENRIR_EYE_RGB[2] + lum * 0.5,
        ],
        size: 0.35 + lum * 0.07,
        seconds: 0.16,
        fadeTail: 0.6,
      });
    }

    // Two cards on the jaw, a small one inside a big one.
    boneLocalPos(actor, FENRIR_JAW_BONE, FENRIR_JAW_LOCAL, tmpGlow);
    for (const size of FENRIR_JAW_SIZES) {
      effects.spawn('sprite', scene, tmpGlow, {
        texture: TEX.flare,
        colour: FENRIR_JAW_RGB,
        size,
        seconds: 0.16,
        fadeTail: 0.6,
      });
    }

    for (let i = 0; i < FENRIR_BOLTS_PER_TICK; i++) {
      spawnFenrirBolt(actor, state.fenrirThunder!);
    }

    // The skill clip: the chrome pass is drawn a second time and a red chip
    // flies off the jaw (ZzzObject.cpp:812-840). The tint object is the one
    // the material binds every frame, so raising it is that second pass.
    const casting = actor.modelObject.CurrentAction === FENRIR_ACTION_SKILL;
    actor.modelObject.BodyShine.tint.setAll(casting ? 2 : 1);

    if (casting) {
      tmpFoot.set(
        (rand(10) - 10) * 0.5 * MU_UNIT,
        0,
        (rand(40) - 20) * 0.5 * MU_UNIT
      );
      boneLocalPos(actor, FENRIR_SKILL_BONE, tmpFoot, tmpGlow);
      effects.spawn('sprite', scene, tmpGlow, {
        texture: TEX.spark3,
        colour: [1, 0, 0],
        size: 0.7 + lum * 0.05,
        seconds: 0.3,
        rise: 0.6,
        fadeTail: 0.5,
      });
    }
  }

  function updateMount(actor: Entity, dt: number, inSafeZone: boolean) {
    const state = actor.petActor!;
    const target = state.owner.transform?.pos;
    if (!target) return;

    const pos = actor.transform!.pos;
    pos.x = target.x;
    pos.y = target.y - state.drop;
    pos.z = target.z;
    actor.transform!.rot.y = state.owner.transform!.rot.y;

    // Faded out in town: pinned, but no clip and no Fenrir glow behind it.
    if (inSafeZone) return;

    // A Fenrir mirrors its rider's clip family instead of the stand/move
    // pair, at the per-clip velocities of MoveMount.
    if (state.fenrirThunder) {
      const rider = state.owner.modelObject?.CurrentAction ?? -1;
      const mirrored = fenrirMountAction(rider);
      actor.modelObject?.setAnimationSpeed(mirrored.playSpeed);
      actor.modelObject?.playAction(mirrored.action, true);
      updateFenrirGlow(actor, dt);
      return;
    }

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
        const map = owner.worldIndex ?? world.mapIndex;
        const wanted = chaosCastle ? null : owner.charAppearance.pet;
        const spec = petSpec(wanted);
        // The Imp is not a world object - PlayerObject.Pet carries it.
        const wantsActor = spec && spec.kind !== 'imp' ? wanted : null;

        if (stale(spawned.get(owner), wantsActor, map)) {
          despawn(owner, false);
          if (wantsActor && spec) spawn(owner, wantsActor, spec);
        }

        // The raven rides the left-hand slot, beside whatever the pet slot holds.
        const raven = chaosCastle
          ? null
          : ravenOf(owner.charAppearance.leftHand);
        if (stale(spawnedRaven.get(owner), raven, map)) {
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

        // The angel has no safe-zone branch of its own: it keeps flying, and
        // in town too. Freezing it there left the actor a town behind, with
        // nothing but a re-equip to bring it home.
        if (state.kind === 'angel') {
          actor.modelObject?.setAlpha(1);
          updateAngel(actor, dt);
          continue;
        }

        // A mount is faded out instead (o->Alpha = 0), but stays pinned to its
        // rider so it is already in place the moment he steps out of town.
        actor.modelObject?.setAlpha(inSafeZone ? 0 : 1);
        updateMount(actor, dt, inSafeZone);
      }
    },
  };
};
