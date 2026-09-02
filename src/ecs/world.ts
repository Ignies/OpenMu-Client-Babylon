import type { EmoteId } from '../common/emotes';
import type { EmojiBubbleId } from '../common/emojiBubbles';
import type { GuildMemberRoleEnum } from '../common/packets/ServerToClientPackets';
import { type Bucket, type With, World as ECSWorld } from 'miniplex';
import type { IVector2Like, IVector3Like, Mesh } from '../libs/babylon/exports';
import type { ModelObject } from '../common/modelObject';
import type { MonsterActionType, PlayerAction } from '../common/objects/enum';
import type { MUAttributeSystem } from '../libs/attributeSystem';
import { TransformNode } from '../libs/babylon/exports';
import { createPathfinding } from '../libs/pathfinding';
import { CharacterClassNumber, ENUM_WORLD } from '../common';
import { TILE_CM } from '../common/terrain/consts';
import {
  Color3,
  Vector3,
  Viewport,
} from '../libs/babylon/exports';
import type { HighlightLayer } from '../libs/babylon/exports';
import type { TestScene } from '../scenes/testScene';
import type { CursorHover } from '../ui/components/gameCursor/cursors';

export type EntityTypeFromQuery<TB extends Bucket<any> = Bucket<any>> =
  TB extends Bucket<infer T> ? T : never;

/** An entity the server named: it has a `netId` and, like every scoped object, a `transform`. */
export type NetEntity = With<Entity, 'netId' | 'transform'>;

/** A tile's two mapping layers and the blend between them. See `World.getTerrainLayers`. */
export type TerrainLayers = {
  layer1: number;
  /** 255 when the tile has no second layer. */
  layer2: number;
  /** 0…1: how far layer 2 is painted over layer 1. */
  alpha: number;
};

export type ISystemFactory = (world: World) => {
  update?: (deltaTime: number) => void;
};

export type Item = {
  num: number;
  group: number;
  lvl?: number;
  isExcellent?: boolean;
  isAncient?: boolean;
  /** Socket slots the item carries (0 for unsocketed gear). */
  socketCount?: number;
  /** Socket bytes 7-11 as sent (option number, 0xFE = empty slot). */
  sockets?: number[];
  /** Socket bonus / 380 option byte 6. */
  socketBonus?: number;
  hasSkill?: boolean;
  /** Luck: +5% critical, +25% Jewel of Soul (byte 1, bit 2). */
  luck?: boolean;
  /** Option level 0..7 (+4 damage/defense each): byte 1 bits 0-1 + byte 3 bit 6. */
  optionLevel?: number;
  /** Excellent option bits 0-5 of byte 3 (CalcExcellentOptions order). */
  excellentFlags?: number;
  /** Ancient set discriminator (byte 4 bits 0-1) and +5/+10 bonus level (bits 2-3). */
  ancientDiscriminator?: number;
  ancientBonusLevel?: number;
  durability?: number;
  raw?: number[];
};

/**
 * The original's `OBJECT` fields a dying body borrows for its motion
 * (`Direction`, `Velocity`, `Gravity`, `m_vDownAngle`), in cm and cm/tick
 * like the C++ so the constants read straight off it.
 */
export type DeathMotion =
  | {
      /** `AT_SKILL_NOVA` / `AT_SKILL_COMBO` (ZzzCharacter.cpp:3173-3182): a slide along `HeadAngle`. */
      kind: 'knock';
      /** Unit direction in the map plane (toward the killer, `CreateAngle2D`). */
      dirX: number;
      dirZ: number;
      /** `o->Direction[1]`: cm per tick, 40…54 to start. */
      speed: number;
      /** `o->Velocity`: the per-tick loss, 1.0…1.4, +1 a tick. */
      decel: number;
    }
  | {
      /** Blood Castle bridge edge (`TW_ACTION`) or Chaos Castle pit (`TW_NOGROUND`), WSclient.cpp:5440-5487. */
      kind: 'fall';
      /** +1 / -1: which side of the bridge is the void (`m_vDownAngle` sign); 0 = straight down. */
      side: number;
      /** `o->Direction[0]`: sideways acceleration, cm/tick². */
      accel: number;
      /** `o->Direction[1]`: sideways speed, cm/tick. */
      speed: number;
      /** `o->Gravity`: height above the death spot, cm (starts upward!). */
      height: number;
      /** `o->Velocity`: vertical speed, cm/tick. */
      vy: number;
      /** `o->Direction[2]`: vertical loss a tick. */
      drop: number;
    };

export type Entity = Partial<{
  netId: number;
  modelId: number;
  worldIndex: ENUM_WORLD;
  modelFilePath: string;
  npcType: number;
  /** AddSummonedMonstersToScope: name of the player who summoned this monster. */
  summonedBy: string;
  localPlayer: true;
  transform: {
    pos: IVector3Like;
    /** Target orientation; `rot.y` is the yaw the character *wants* to face. */
    rot: IVector3Like;
    scale: number;
    posOffset?: IVector3Like;
    /** Smoothed yaw actually rendered for characters (TurnAngle2 ×0.1/tick). */
    visualRotY?: number;
  };
  modelObject: ModelObject;
  modelFactory: typeof ModelObject;
  objOutOfScope: true;
  pathfinding: {
    from: IVector2Like;
    to: IVector2Like;
    path: IVector2Like[] | null;
    calculated: boolean;
  };
  playerMoveTo: {
    point: IVector2Like;
    handled: boolean;
    sendToServer?: boolean;
  };
  movement: {
    velocity: IVector2Like;
  };
  playerAnimation: {
    action: PlayerAction;
    /**
     * `c->Run` (ZzzCharacter.cpp:159, :387-408): 0…40, climbing 25 per second
     * while the character walks outside a safe zone and its class/boots allow
     * it. At 40 the run clips take over. See common/locomotion.ts.
     */
    run: number;
  };
  monsterAnimation: {
    action: MonsterActionType;
  };
  /**
   * Death state (the original's c->Dead / c->Rot / o->Alpha, ZzzCharacter.cpp:3105,3958).
   * Added by ObjectGotKilled; DeathSystem drives the delay, Die clip, blood,
   * fade + sink and the final despawn.
   */
  dying: {
    /** Seconds since the kill packet arrived. */
    time: number;
    /** Die clip started (SetPlayerDie ran). */
    started: boolean;
    /** c->Rot accumulator: 0.02 per 25 Hz tick; fade begins at 1. */
    rot: number;
    /** Model alpha, 1 → 0 during the fade. */
    alpha: number;
    /** World-unit drop applied while fading (0.4 cm per tick in the original). */
    sink: number;
    /** The hero landed the killing blow: the death waits for the swing to connect. */
    killedByHero: boolean;
    /** ObjectGotKilled `SkillId` (`c->m_byDieType`, WSclient.cpp:5504): Nova / Combo pick the knock-up. */
    skill: number;
    /** ObjectGotKilled `KillerId` (the `TKey` a Nova / Combo victim turns to face, :5537-5546). */
    killerNetId: number;
    /** The body burst into pieces (`o->Live = false`, ZzzCharacter.cpp:1397-1416): no fade, no sink. */
    shattered: boolean;
    /**
     * Render-only displacement from `transform.pos` in tiles (y up) and a
     * pitch in radians: the Nova / Combo slide (ZzzCharacter.cpp:3173-3182)
     * and the Blood / Chaos Castle fall (`FallingCharacter`, :3014-3032).
     */
    offset: { x: number; y: number; z: number };
    pitch: number;
    /** Integrator state of that motion; set by DeathSystem when the kill arrives. */
    motion?: DeathMotion;
  };
  attributeSystem: MUAttributeSystem;
  /** HeroStateChanged: PK / hero status byte of a player (name tint later). */
  heroState: number;
  /** Active MagicEffectStatus effect ids on this object (everyone in scope). */
  buffs: Set<number>;
  visibility: {
    state: 'visible' | 'nearby' | 'hidden';
    lastChecked: number;
  };
  screenPosition: {
    x: number;
    y: number;
    worldOffsetZ: number;
  };
  /**
   * A short-lived emoji over (or beside) a character — see
   * `common/emojiBubbles.ts`. `EmojiBubbleSystem` owns the lifetime and the
   * side anchor, `CalculateScreenPositionSystem` projects that anchor, and
   * the `EmojiBubbles` overlay draws it.
   */
  emojiBubble: {
    id: EmojiBubbleId;
    /** Seconds left before it disappears. */
    life: number;
    /** Full lifetime, so the overlay can drive the fade. */
    duration: number;
    /** Bumped on every (re)trigger so the overlay can restart its animation. */
    serial: number;
    /** Cached `placement === 'side'`, so the hot paths need no catalogue lookup. */
    isSide: boolean;
    /**
     * The bubble's own world anchor — over the head, or on the shoulder
     * currently facing the camera. Without `mapParent` (the projection adds
     * it, as it does for the main anchor).
     */
    anchor: IVector3Like;
    /** Projected `anchor` in CSS pixels; only meaningful while `onScreen`. */
    screenX: number;
    screenY: number;
    onScreen: boolean;
  };
  objectNameInWorld: string;
  /**
   * The original's `CHAT` balloon (ZzzInterface.cpp:703): a hovered NPC's or
   * player's name, plus up to two chat lines. Lifetimes are 25 Hz ticks;
   * NameTagSystem owns it, the `NameTags` overlay draws it.
   */
  nameTag: {
    /** `IDLifeTime`: the name shows while > 0 or while a chat line lives. */
    idLife: number;
    /** `Color`: the PK byte the name is tinted by (0 for NPCs). */
    color: number;
    /** `Text[0]` (newest, drawn last) and `Text[1]` (older, drawn above it). */
    text: [string, string];
    /** `LifeTime[0..1]` in ticks. */
    life: [number, number];
  };
  /** AssignCharacterToGuild: the guild a player belongs to (name via Store.guilds). */
  guild: {
    id: number;
    role: GuildMemberRoleEnum;
  };
  /**
   * `bGmMode` of `RenderBoolean`: the original reads `CtlCode` / the GM buff,
   * neither of which OpenMU sends. The one GM signal it does give is the `#`
   * shout, so the flag is raised the first time a player in scope sends one.
   */
  isGm: true;
  charAppearance: {
    helm: Item | null;
    armor: Item | null;
    pants: Item | null;
    gloves: Item | null;
    boots: Item | null;
    leftHand: Item | null;
    rightHand: Item | null;
    wings: Item | null;
    /** `c->Helper`: Guardian Angel, Imp, Horn of Uniria / Dinorant (group 13). */
    pet: Item | null;
    charClass: CharacterClassNumber;
    changed: boolean;
    /**
     * Bumped by AppearanceSystem every time it applies these slots to the
     * model — not only when they differ from last time. Item effects are
     * re-stamped on every apply (`PlayerObject.loadPartAsync`), so anything
     * else a character's items own has to be re-examined on the same beat, or
     * it survives exactly until something re-applies the same gear underneath
     * it (a warp, a re-scope). ItemGlowSystem's lamp reads it.
     */
    applied?: number;
  };
  /**
   * A pet or mount object owned by another entity: the free-flying Guardian
   * Angel and the two ridden mounts (`Mounts[]` in the original, GOBoid.cpp).
   * Created and driven by PetSystem; the Imp is not one of these — it is a
   * bone-linked child of its owner's PlayerObject.
   */
  petActor: {
    owner: Entity;
    kind: 'angel' | 'mount';
    /** `o->Angle[2]` in radians (MU yaw convention, like `transform.rot.y`). */
    yaw: number;
    /** `o->Direction` in MU units per 25 Hz tick. */
    dir: { x: number; y: number; z: number };
    /** Seconds until the next `rand_fps_check(32)` direction re-roll. */
    reroll: number;
    /** `FlyRange` in world units. */
    flyRange: number;
    /** World units the mount sits below its rider. */
    drop: number;
    /** `SetAction(o, n)` while standing / moving — mounts differ. */
    standAction: number;
    moveAction: number;
  };
  highlighted: {
    color: Color3;
    layer: HighlightLayer | null;
  };
  interactable: true;
  keyboardInput: {
    pressedKeys: Set<string>;
  };
  interactiveArea: {
    min: IVector2Like;
    max: IVector2Like;
    inside?: boolean;
    onEnter?: () => void;
    onLeave?: () => void;
  };
  droppedItem: {
    isMoney: boolean;
    /** Parsed item (level / excellent) for name tints and ground glow. */
    item?: Item;
    /** `IsFreshDrop`: it just left a hand or a corpse — falls and tumbles in (dropMotionSystem). */
    fresh?: boolean;
    /** `ITEM_GROUP_*` and the index inside it: what `ItemAngle` poses the drop by. */
    group: number;
    num: number;
  };
  onDispose?: () => void;
}>;

export class World extends ECSWorld<Entity> {
  /** Centimetres per tile (the original's `TERRAIN_SCALE`); see `common/terrain/consts.ts`. */
  readonly terrainScale = TILE_CM;

  viewport = new Viewport(0, 0, 1, 1);

  readonly gameTime = { TotalGameTime: { TotalSeconds: 0.1 } };

  readonly mapParent: TransformNode;

  readonly netObjsQuery = this.with('netId', 'transform');

  /**
   * Every entity that carries a `netId`, keyed by it — the server's object id
   * is how every packet names its subject, so this is the lookup the packet
   * handlers do. Maintained by `netObjsQuery`'s add / remove hooks; a
   * stale entity that shares an id with a newer one never shadows it (the
   * newest add wins, a remove only clears its own entry). `netId` is never
   * reassigned in place, so the index cannot drift from the component.
   */
  readonly byNetId = new Map<number, NetEntity>();

  /** The entity the server calls `netId`, or `undefined` when it is not in the world. */
  getByNetId(netId: number): NetEntity | undefined {
    return this.byNetId.get(netId);
  }

  readonly playersQuery = this.with(
    'attributeSystem',
    'transform',
    'playerAnimation',
    'playerMoveTo',
    'pathfinding'
  );

  #localPlayerQuery = this.playersQuery.with('localPlayer');

  get playerEntity() {
    return this.#localPlayerQuery.entities[0];
  }

  #keyboardInputQuery = this.with('keyboardInput');

  get keyboardInput() {
    return this.#keyboardInputQuery.entities[0].keyboardInput;
  }

  mapIndex = ENUM_WORLD.WD_55LOGINSCENE;

  terrain: {
    mesh: Mesh;
    MapTileObjects: (typeof ModelObject)[];
    extraHeight: number;
  } | null = null;

  readonly pathfinder = createPathfinding({
    width: 256,
    height: 256,
  });

  currentPointerTarget: Entity | null = null;

  attackTarget: Entity | null = null;

  /** Drop the hero walks to and picks up (MOVEMENT_GET); ItemPickupSystem. */
  pickupTarget: Entity | null = null;

  /** NPC the hero walks to and talks to (MOVEMENT_TALK); NpcTalkSystem. */
  talkTarget: Entity | null = null;

  pointerPressed = false;

  /** Right mouse button held (repeats the current skill, like MouseRButton). */
  rightPointerPressed = false;

  /** Pending right-click cast: object under the cursor and/or the ground point. */
  castRequest: {
    target: Entity | null;
    point: { x: number; y: number } | null;
    /** Ctrl was held: the cast goes at the ground point, whatever is under the cursor. */
    forced?: boolean;
  } | null = null;

  cursorHover: CursorHover | null = null;

  /** Emote picked in the radial menu, consumed by EmoteSystem next frame. */
  emoteRequest: EmoteId | null = null;

  /** Emoji bubble picked in the radial menu, consumed by EmojiBubbleSystem. */
  emojiRequest: EmojiBubbleId | null = null;

  cursorBlocked = false;

  constructor(readonly scene: TestScene) {
    super();

    // `netIdCount` only exists for the transient case of two entities sharing
    // an id (a re-scoped object before `removeNetObject` purged the stale
    // one): when the indexed entity of a still-shared id goes, the survivor
    // is found by the one linear scan this index otherwise never does.
    const netIdCount = new Map<number, number>();
    this.netObjsQuery.onEntityAdded.subscribe(e => {
      this.byNetId.set(e.netId, e);
      netIdCount.set(e.netId, (netIdCount.get(e.netId) ?? 0) + 1);
    });
    this.netObjsQuery.onEntityRemoved.subscribe(e => {
      const id = e.netId;
      const left = (netIdCount.get(id) ?? 1) - 1;
      if (left <= 0) netIdCount.delete(id);
      else netIdCount.set(id, left);
      if (this.byNetId.get(id) !== e) return;
      this.byNetId.delete(id);
      if (left > 0) {
        for (const other of this.netObjsQuery.entities) {
          if (other !== e && other.netId === id) {
            this.byNetId.set(id, other);
            break;
          }
        }
      }
    });

    this.add({
      keyboardInput: {
        pressedKeys: new Set(),
      },
    });

    this.mapParent = new TransformNode('mapParent', scene);
  }

  getTerrainHeight(x: number, y: number): number {
    return -9999;
  }

  isWalkable(x: number, y: number): boolean {
    return true;
  }

  getTerrainFlag(x: number, y: number): number {
    return 0;
  }

  /**
   * `AddTerrainAttributeRange`: set (`set` true) or clear one `TW_*` flag over
   * the `w`×`h` tile block at (x, y). Bound by `loadMapIntoScene` to the
   * current terrain's attribute array; a no-op until a map is loaded.
   */
  setTerrainFlags(
    x: number,
    y: number,
    w: number,
    h: number,
    flag: number,
    set: boolean
  ): void {}

  getTerrainTile(x: number, y: number): number {
    return 0;
  }

  /**
   * Both mapping layers under tile (x, y) and the alpha (0…1) the second is
   * painted over the first with, written into `out`. `getTerrainTile` is the
   * original's `TerrainMappingLayer1` lookup and stays that way for the
   * things that copy the original (footstep sounds); this is for anything
   * that has to agree with what the ground is *drawn* as.
   */
  getTerrainLayers(x: number, y: number, out: TerrainLayers): void {
    out.layer1 = this.getTerrainTile(x, y);
    out.layer2 = 255;
    out.alpha = 0;
  }

  getTerrainLight(x: number, y: number): IVector3Like {
    return Vector3.OneReadOnly;
  }
}

// A hot update must reload the page: a re-executed module would hand
// later-loaded importers a second `World` class (and a second `Entity`
// type identity for instanceof-free checks), forking the ECS.
const hot = (import.meta as { hot?: { decline(): void } }).hot;
if (hot) hot.decline();
