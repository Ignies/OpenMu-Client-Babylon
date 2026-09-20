import type { Entity, World } from '../ecs/world';
import { Vector3 } from '../libs/babylon/exports';
import { loadGLTF } from './modelLoader';
import { ModelObject } from './modelObject';
import type { Item } from '../ecs/world';
import { PlayerAction } from './objects/enum';
import {
  improvedItemEffectsOn,
  legacyItemEffectsOn,
} from './itemEffectMode';

/**
 * `c->Helper` - the pet / mount slot of the appearance (group 13, indices
 * 0-3). The original splits them three ways:
 *
 *  - **Guardian Angel** (`MODEL_GUARDIAN_ANGEL` → `MODEL_HELPER`) becomes a
 *    free-flying `Mounts[]` object with its own boid AI: `CreateMountSub` +
 *    `MoveMount`, GOBoid.cpp:66-660.
 *  - **Imp / Satan** (`MODEL_IMP`) is *not* a mount - it is link-rendered on
 *    the wearer's bone 34 every frame (`RenderCharacterBackItem`,
 *    ZzzCharacter.cpp:15144-15180) with a red light sprite on top.
 *  - **Horn of Uniria / Dinorant** (`MODEL_UNICON` / `MODEL_PEGASUS`) are
 *    mounts pinned to the rider: same position and yaw, action 0 standing /
 *    2 moving (GOBoid.cpp:494-556). The rider switches to the `*_RIDE` clips
 *    and, on a Dinorant, floats 30 units off the ground
 *    (`MoveCharacterPosition`, ZzzCharacter.cpp:6263-6273).
 *
 * `Data/Player/Helper0n.bmd` is the model behind `MODEL_HELPER + n`
 * (ZzzOpenData.cpp:705) and `Data/Skill/Rider0n.bmd` behind the two mounts
 * (:3969-3970) - **not** the `Item/helper0n` path items.json carries for the
 * horn items, which is the inventory icon model and does not exist as a GLB.
 *
 * The rest of the slot - Demon, Spirit of Guardian, Rudolph, Panda, Pet
 * Unicorn, Pet Skeleton - goes through a system of its own: `CreatePet`
 * rather than `CreateMount` (ZzzCharacter.cpp:12992-12999), one world object
 * per pet holding station on its owner and never ridden. See `PetFollow`.
 */

export * from './petConstants';
import {
  PET_GROUP,
  GUARDIAN_ANGEL,
  IMP,
  HORN_OF_UNIRIA,
  HORN_OF_DINORANT,
  DARK_HORSE,
  DARK_RAVEN,
  HORN_OF_FENRIR,
  DEMON,
  SPIRIT_OF_GUARDIAN,
  PET_RUDOLF,
  PET_PANDA,
  PET_UNICORN,
  PET_SKELETON,
} from './petConstants';

/** `w->LinkBone = 34` for the Imp (ZzzCharacter.cpp:15148). */
export const IMP_BONE = 34;

/** MU units → world units. */
const MU_UNIT = 1 / 100;

export type PetKind = 'angel' | 'imp' | 'mount' | 'raven' | 'follower';

/**
 * How a follower pet holds station on its owner. All six run their model's
 * clip 0 at the `PlaySpeed` of `Data/Local/pet.bmd`; what separates them is
 * where they sit and what they chase:
 *
 *  - **hover** (`PetActionStand` / `PetActionDemon`): 230 units over the
 *    owner's feet, heading straight for him. The original never takes the
 *    square root there, so the stop radius and the log the speed comes out
 *    of are both in square units, which is why these two drift a long way
 *    before they bother catching up.
 *  - **orbit** (`PetActionCollecter` / `PetActionCollecterAdd`): down beside
 *    him on the ground, chasing a point that circles him once every four
 *    seconds.
 *  - **trail** (`PetActionUnicorn` / `PetActionCollecterSkeleton`): hovering
 *    like the first pair, but chasing the owner's own tile and stopping on a
 *    squared radius compared against an unsquared distance
 *    (`FlyRange * FlyRange >= Distance`), so it sits much closer in.
 */
export type PetFollow = {
  readonly motion: 'hover' | 'orbit' | 'trail';
  /** `o->Position[2] = Owner->Position[2] + hover`, in MU units. */
  readonly hover: number;
  /** Whether that height is taken times the owner's `Object.Scale`. */
  readonly hoverScaled?: boolean;
  /** The distance the pet stops at, in whatever metric the motion uses. */
  readonly stopAt: number;
  /** `FlyRange` in MU units, which is what it stops at on its way home. */
  readonly flyRange: number;
  /**
   * `FindZen`: the pet fetches zen dropped near its owner. The four that do
   * are the ones whose action class carries it - Rudolph, the Panda, the Pet
   * Unicorn and the Pet Skeleton; the Demon and the Spirit of Guardian just
   * keep station.
   */
  readonly collects?: boolean;
  /** `TurnAngle2(o->Angle[2], Angle, n)` - degrees per tick. */
  readonly turn: number;
  /** `Speed = log(Distance) * scale + bias`, in MU units per tick. */
  readonly speedScale: number;
  readonly speedBias?: number;
  /** `o->Velocity` factors while standing and while moving (the Unicorn's). */
  readonly idleSpeed?: number;
  readonly moveSpeed?: number;
};

export type PetSpec = {
  readonly kind: PetKind;
  readonly model: string;
  /** `o->Scale` from `CreateMountSub` (GOBoid.cpp:96-113). */
  readonly scale: number;
  /** `o->BlendMesh` the mount is created with. */
  readonly blendMesh?: number;
  /** `f->PlaySpeed` for a link-rendered pet. */
  readonly playSpeed?: number;
  /** `FlyRange` in MU units - how far a follower drifts before turning back. */
  readonly flyRange?: number;
  /** World units the mount sits below its rider (`o->Position[2] -= 30`). */
  readonly mountDrop?: number;
  /** World units the *rider* floats above the terrain. */
  readonly riderLift?: number;
  /**
   * Which rider clip family the mount puts its owner in. The horns use
   * `PLAYER_*_RIDE`; the Dark Horse has its own `PLAYER_*_RIDE_HORSE` pair
   * (SetPlayerStop:189-195, SetPlayerWalk:477-480); a Fenrir the weapon-split
   * `PLAYER_FENRIR_*` families (SetPlayerStop:164-187, SetAction_Fenrir_*).
   */
  readonly riderClips?: 'ride' | 'horse' | 'fenrir';
  /** `SetAction(o, n)` while the mount stands. Defaults to MOUNT_ACTION_STAND. */
  readonly standAction?: number;
  /** `SetAction(o, n)` while the mount moves. Defaults to MOUNT_ACTION_MOVE. */
  readonly moveAction?: number;
  /** Fenrir only: the variant's lightning tint (ZzzObject.cpp:869-893). */
  readonly thunder?: readonly [number, number, number];
  /**
   * Fenrir only: `iSubType` of the lightning under its feet, which is what
   * decides the colour the footprint drains to (`Move_MODEL_FENRIR_FOOT_THUNDER`,
   * MoveHandlers.cpp:6780-6805).
   */
  readonly footSubType?: number;
  /**
   * The one mesh an extra `RENDER_BRIGHT | RENDER_CHROME` pass is drawn over
   * (`ModelObject.ShineMesh`). A Fenrir redraws the mesh that carries its
   * colour: mesh 1 for red / blue / black, mesh 0 for gold.
   */
  readonly shineMesh?: number;
  /** `b->BodyLight = 1,1,1`: drawn at full brightness, unlit by the map. */
  readonly fullBright?: boolean;
  /**
   * `o->Light`, added on top of the terrain light under the pet.
   * `PetObject::Create` gives every follower 3,3,3 (w_BasePet.cpp:76), which
   * is what makes them read as glowing companions rather than as small
   * monsters walking beside their owner.
   */
  readonly selfLight?: number;
  /**
   * Seconds of the sine `selfLight` rides when the pet pulses rather than
   * holding still: `PetActionDemon::Model` overwrites `o->Light` with
   * `sin(pi * (t mod 10000) / 10000)` every frame.
   */
  readonly pulseSeconds?: number;
  /**
   * MU units north of its owner a follower is created at, times the owner's
   * scale. Only the Pet Skeleton has one (`PetObject::Create`, w_BasePet.cpp:
   * 88-91), and it needs it: its motion aims at the owner's own tile and
   * stops well short, so without the offset it is created inside him and
   * has no reason to ever step out.
   */
  readonly spawnOffset?: number;
  /** Set on the six `CreatePet` followers - see `PetFollow`. */
  readonly follow?: PetFollow;
  /**
   * The improved look's sheen for `shineMesh`, in the wolf's own colour, in
   * place of the original's grey sphere map. See `fenrirShine`.
   */
  readonly improvedRim?: readonly [number, number, number];
};

const PETS: Readonly<Record<number, PetSpec>> = {
  [GUARDIAN_ANGEL]: {
    kind: 'angel',
    model: 'Player/Helper01.glb',
    scale: 0.7,
    blendMesh: 1,
    flyRange: 150,
  },
  [IMP]: {
    kind: 'imp',
    model: 'Player/Helper02.glb',
    scale: 1,
    playSpeed: 0.5,
  },
  [HORN_OF_UNIRIA]: {
    kind: 'mount',
    model: 'Skill/Rider01.glb',
    scale: 0.9,
  },
  [HORN_OF_DINORANT]: {
    kind: 'mount',
    model: 'Skill/Rider02.glb',
    scale: 0.9,
    mountDrop: 30 * MU_UNIT,
    riderLift: 30 * MU_UNIT,
  },
  // The Dark Lord's horse (GOBoid.cpp:107-109, :322-346): owner position and
  // yaw, no drop, and it walks on clip 1 rather than the horns' clip 2.
  [DARK_HORSE]: {
    kind: 'mount',
    model: 'Skill/DarkHorse.glb',
    scale: 1,
    riderClips: 'horse',
    moveAction: 1,
  },
  // `CSPetDarkSpirit` (CSPetSystem.cpp:291-303): the Dark Raven is worn in
  // the *left hand*, not the pet slot - a world object flying a boid orbit
  // ~250 units above its owner (FlyRange 150) and perching in safe zones.
  [DARK_RAVEN]: {
    kind: 'raven',
    model: 'Skill/darkspirit.glb',
    scale: 0.7,
    playSpeed: 0.4,
    flyRange: 150,
  },

  // The six followers. Scale, blend mesh and clip speed are `Data/Local/
  // pet.bmd`'s own records (types 64 / 65 / 67 / 80 / 106 / 123) and the
  // model paths are ZzzOpenData.cpp:837-843 - not the `Item/` icon models
  // items.json carries under the same numbers.
  [DEMON]: {
    kind: 'follower',
    model: 'Item/partcharge4/demon.glb',
    scale: 0.2,
    playSpeed: 0.5,
    selfLight: 3,
    pulseSeconds: 10,
    follow: {
      motion: 'hover',
      hover: 230,
      hoverScaled: true,
      stopAt: 50 * 50,
      flyRange: 50,
      turn: 10,
      speedScale: 1,
      speedBias: 5,
    },
  },
  [SPIRIT_OF_GUARDIAN]: {
    kind: 'follower',
    model: 'Item/partcharge4/maria.glb',
    scale: 0.4,
    blendMesh: 0,
    playSpeed: 0.5,
    selfLight: 3,
    follow: {
      motion: 'hover',
      hover: 230,
      hoverScaled: true,
      stopAt: 50 * 50,
      flyRange: 50,
      turn: 10,
      speedScale: 1.8,
    },
  },
  [PET_RUDOLF]: {
    kind: 'follower',
    model: 'Item/xmas/xmas_deer.glb',
    scale: 0.8,
    playSpeed: 0.5,
    selfLight: 3,
    follow: {
      motion: 'orbit',
      hover: 20,
      stopAt: 10,
      flyRange: 10,
      collects: true,
      turn: 8,
      speedScale: 2.3,
    },
  },
  [PET_PANDA]: {
    kind: 'follower',
    model: 'Item/PandaPet.glb',
    scale: 0.8,
    playSpeed: 0.5,
    selfLight: 3,
    follow: {
      motion: 'orbit',
      hover: 20,
      stopAt: 10,
      flyRange: 10,
      collects: true,
      turn: 8,
      speedScale: 2.3,
    },
  },
  [PET_UNICORN]: {
    kind: 'follower',
    model: 'Item/partcharge7/pet_unicorn.glb',
    scale: 0.6,
    playSpeed: 0.8,
    selfLight: 3,
    follow: {
      motion: 'trail',
      hover: 200,
      hoverScaled: true,
      stopAt: 10 * 10,
      flyRange: 10,
      collects: true,
      turn: 8,
      speedScale: 2.3,
      idleSpeed: 0.35,
      moveSpeed: 1.2,
    },
  },
  [PET_SKELETON]: {
    kind: 'follower',
    model: 'Item/skeletonpet.glb',
    scale: 0.4,
    playSpeed: 0.5,
    selfLight: 3,
    spawnOffset: 60,
    follow: {
      motion: 'trail',
      hover: 50,
      hoverScaled: true,
      stopAt: 12 * 12,
      flyRange: 12,
      collects: true,
      turn: 8,
      speedScale: 2.3,
    },
  },
};

export type FenrirVariant = 'red' | 'blue' | 'black' | 'gold';

/**
 * `GetFenrirType` (ZzzCharacter.cpp:98-108): the horn's option bits, carried
 * in `Helper.ExcellentFlags` - 0x01 black (Destruction), 0x02 blue
 * (Protection), 0x04 gold (Illusion), none red.
 */
export function fenrirVariant(item: Item | null | undefined): FenrirVariant {
  const flags = item?.excellentFlags ?? 0;
  if (flags & 0x01) return 'black';
  if (flags & 0x02) return 'blue';
  if (flags & 0x04) return 'gold';
  return 'red';
}

function fenrirSpec(
  variant: FenrirVariant,
  thunder: readonly [number, number, number],
  footSubType: number,
  shineMesh: number,
  improvedRim: readonly [number, number, number]
): PetSpec {
  // CreateMountSub: Scale 0.9; pinned to the rider like the Dark Horse
  // (MoveMount, GOBoid.cpp:174-266), clips driven by fenrirMountAction.
  return {
    kind: 'mount',
    model: `Skill/fenril_${variant}.glb`,
    scale: 0.9,
    riderClips: 'fenrir',
    thunder,
    footSubType,
    shineMesh,
    improvedRim,
    fullBright: true,
  };
}

/**
 * The four wolves of the Fenrir render branch (ZzzObject.cpp:793-940).
 *
 * `thunder` is the lightning tint and `footSubType` the matching footprint
 * subtype (:875-893). `shineMesh` is the mesh redrawn `RENDER_BRIGHT |
 * RENDER_CHROME` over its own pass, and it is the one place the gold wolf
 * is written differently: gold shines on mesh 0 and draws mesh 1 flat
 * (:805-816), the other three shine on mesh 1 (:822-830). In both cases it
 * is the mesh carrying the variant's own sheet - `fenril_<colour>` for the
 * three, `panril_golden` for gold - so the colour is what catches the light.
 */
const FENRIRS: Readonly<Record<FenrirVariant, PetSpec>> = {
  red: fenrirSpec('red', [0.8, 0, 0], 1, 1, [1.0, 0.25, 0.12]),
  blue: fenrirSpec('blue', [0.1, 0.1, 0.8], 2, 1, [0.25, 0.5, 1.0]),
  black: fenrirSpec('black', [1.0, 1.0, 0.2], 3, 1, [0.95, 0.85, 0.3]),
  gold: fenrirSpec('gold', [0.8, 0.8, 0.1], 4, 0, [1.0, 0.72, 0.18]),
};

/**
 * Improved sheen while the original's chrome pass is drawn as well ("Both"),
 * the same reduction the item tiers make for the same reason.
 */
const BOTH_SCALE = 0.65;

/**
 * Which of the wolf's two body passes are live, from Options -> Video ->
 * Item effects:
 *
 *  - **Legacy** - the original's own: Chrome01 sphere-mapped over the mesh
 *    that carries the variant's colour, additive and grey, so a dark wolf
 *    comes up a polished one (ZzzObject.cpp:805-830).
 *  - **Improved** - ours: the in-surface sheen every item's improved glow
 *    uses, in the wolf's own colour. It rides the texel's own brightness, so
 *    the black Fenrir stays black and lights along its edges instead.
 *  - **Both** - the two together, the improved half held back.
 *  - **Off** - neither; the plain model.
 *
 * `casting` is the skill clip, where the original draws the chrome pass a
 * second time (:832-838).
 */
export function fenrirShine(
  model: ModelObject,
  spec: PetSpec,
  casting = false
): void {
  if (spec.shineMesh === undefined) return;

  const legacy = legacyItemEffectsOn();
  const improved = improvedItemEffectsOn();
  const shine = model.BodyShine;

  // `glColor3fv(BodyLight)` on the chrome pass, and BodyLight is white.
  shine.tint.setAll(legacy ? (casting ? 2 : 1) : 0);

  const rim = spec.improvedRim;
  shine.improved ??= new Vector3();
  if (!improved || !rim) {
    shine.improved.setAll(0);
    return;
  }

  const scale = (legacy ? BOTH_SCALE : 1) * (casting ? 1.8 : 1);
  shine.improved.set(rim[0] * scale, rim[1] * scale, rim[2] * scale);
}

export function petSpec(item: Item | null | undefined): PetSpec | null {
  if (!item || item.group !== PET_GROUP) return null;
  if (item.num === HORN_OF_FENRIR) return FENRIRS[fenrirVariant(item)];
  return PETS[item.num] ?? null;
}

/** True while the pet slot holds a Horn of Uniria or Dinorant. */
export function isRidingMount(item: Item | null | undefined): boolean {
  return petSpec(item)?.kind === 'mount';
}

/**
 * `c->Helper.Type` reduced to the four values every skill switch of the
 * original tests for (`MODEL_HORN_OF_UNIRIA` / `_DINORANT` / `_FENRIR` /
 * `MODEL_DARK_HORSE_ITEM`). `null` means on foot - and so does a safe zone,
 * because each of those branches is written `&& !c->SafeZone`: the caller
 * passes `inSafeZone` and gets the on-foot clip back inside town.
 */
export type MountKind = 'uniria' | 'dinorant' | 'horse' | 'fenrir';

export function mountKind(
  item: Item | null | undefined,
  inSafeZone = false
): MountKind | null {
  if (!item || item.group !== PET_GROUP || inSafeZone) return null;
  switch (item.num) {
    case HORN_OF_UNIRIA:
      return 'uniria';
    case HORN_OF_DINORANT:
      return 'dinorant';
    case DARK_HORSE:
      return 'horse';
    case HORN_OF_FENRIR:
      return 'fenrir';
    default:
      return null;
  }
}

/** Mount clip indices (`SetAction(o, n)` in GOBoid.cpp:494-556). */
export const MOUNT_ACTION_STAND = 0;
export const MOUNT_ACTION_MOVE = 2;

/** fenril_*.bmd clips (_define.h:508-513). */
export const FENRIR_ACTION_STAND = 0;
export const FENRIR_ACTION_WALK = 1;
export const FENRIR_ACTION_RUN = 2;
export const FENRIR_ACTION_ATTACK = 3;
export const FENRIR_ACTION_SKILL = 4;
export const FENRIR_ACTION_DAMAGE = 5;

/**
 * The Fenrir half of `MoveMount` (GOBoid.cpp:200-266): which of its own six
 * clips the wolf plays under a given rider action, and the `o->Velocity` it
 * runs it at - attack / skill / damage mirror the rider, anything else falls
 * back to standing.
 */
export function fenrirMountAction(rider: number): {
  action: number;
  playSpeed: number;
} {
  const A = PlayerAction;
  if (
    (rider >= A.PLAYER_FENRIR_ATTACK && rider <= A.PLAYER_FENRIR_ATTACK_BOW) ||
    rider === A.PLAYER_SKILL_CHAIN_LIGHTNING_FENRIR ||
    rider === A.PLAYER_SKILL_LIGHTNING_ORB_FENRIR ||
    rider === A.PLAYER_SKILL_DRAIN_LIFE_FENRIR ||
    rider === A.PLAYER_RAGE_FENRIR_ATTACK_RIGHT
  ) {
    return { action: FENRIR_ACTION_ATTACK, playSpeed: 0.4 };
  }
  if (
    (rider >= A.PLAYER_FENRIR_SKILL &&
      rider <= A.PLAYER_FENRIR_SKILL_ONE_LEFT) ||
    (rider >= A.PLAYER_RAGE_FENRIR && rider <= A.PLAYER_RAGE_FENRIR_ONE_LEFT)
  ) {
    return { action: FENRIR_ACTION_SKILL, playSpeed: 0.4 };
  }
  if (
    (rider >= A.PLAYER_FENRIR_DAMAGE &&
      rider <= A.PLAYER_FENRIR_DAMAGE_ONE_LEFT) ||
    (rider >= A.PLAYER_RAGE_FENRIR_DAMAGE &&
      rider <= A.PLAYER_RAGE_FENRIR_DAMAGE_ONE_LEFT)
  ) {
    return { action: FENRIR_ACTION_DAMAGE, playSpeed: 0.4 };
  }
  if (
    (rider >= A.PLAYER_FENRIR_WALK && rider <= A.PLAYER_FENRIR_WALK_ONE_LEFT) ||
    (rider >= A.PLAYER_RAGE_FENRIR_WALK &&
      rider <= A.PLAYER_RAGE_FENRIR_WALK_TWO_SWORD)
  ) {
    return { action: FENRIR_ACTION_WALK, playSpeed: 1.0 };
  }
  if (
    (rider >= A.PLAYER_FENRIR_RUN &&
      rider <= A.PLAYER_FENRIR_RUN_ONE_LEFT_ELF) ||
    (rider >= A.PLAYER_RAGE_FENRIR_RUN &&
      rider <= A.PLAYER_RAGE_FENRIR_RUN_ONE_LEFT)
  ) {
    return { action: FENRIR_ACTION_RUN, playSpeed: 0.6 };
  }
  return { action: FENRIR_ACTION_STAND, playSpeed: 0.4 };
}

const factories = new Map<string, typeof ModelObject>();

/**
 * A `ModelObject` subclass for one pet model. Cached per model path so all
 * angels in scope share one class (and the loader's container cache).
 */
export function petFactoryFor(spec: PetSpec): typeof ModelObject {
  const cached = factories.get(spec.model);
  if (cached) return cached;

  class PetModel extends ModelObject {
    static {
      PetModel.OverrideScale = spec.scale;
    }

    async init(world: World, _entity: Entity) {
      if (spec.blendMesh !== undefined) this.BlendMesh = spec.blendMesh;

      if (spec.fullBright) {
        this.FixedLight = true;
        this.Light.set(1, 1, 1);
      }

      if (spec.selfLight !== undefined) {
        this.SelfLight.setAll(spec.selfLight);
      }

      if (spec.shineMesh !== undefined) {
        this.ShineMesh = spec.shineMesh;
        this.BodyShine.chromeOnly = true;
        fenrirShine(this, spec);
      }

      this.load(await loadGLTF(spec.model, world));
    }
  }

  Object.defineProperty(PetModel, 'name', {
    value: spec.model.replace(/^.*\/|\.glb$/g, ''),
  });

  factories.set(spec.model, PetModel);

  return PetModel;
}
