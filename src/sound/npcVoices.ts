import { MonsterActionType } from '../common/objects/enum';
import type { ENUM_WORLD } from '../common/types';
import type { Entity, World } from '../ecs/world';
import { SoundsManager } from '../libs/soundsManager';
import type { SoundBus } from './buses';
import type { Sounds } from './recipes';
import type { SoundLayer } from './layer';
import { listenerHero, listenerWorld, playSfx } from './listener';

/**
 * The noises town NPCs make while they stand there: Hanzo's hammer on the
 * anvil, the Chaos Machine's goblin, the elf wizard's harp.
 *
 * The original plays these from `MoveCharacterVisual`'s per-model switch
 * (ZzzCharacter.cpp:6080-6093) - the same switch the forge sparks and the
 * forge light come out of. It is a `PlayBuffer` re-issued every tick, and a
 * `Play` on a channel that is still sounding is a no-op
 * (DSPlaySound.cpp:303), so each row reads as "start it again once it has
 * finished, while the condition still holds". `SoundsManager.isPlaying` is
 * that no-op here.
 *
 * Two of the three are 2D in the original (`PlayBuffer(sound)` with no
 * object): full volume for as long as the NPC is in the character update
 * set. That set reaches much further here than the original's draw distance
 * did, so all three are positioned instead - a harp two screens away should
 * not be as loud as the one you are standing next to.
 *
 * Also the few voices `PlayMonsterSoundGlobal` plays on every map (Titus,
 * Lugard, the Doppelganger boxes, the snowman), which stay 2D as in the
 * original: that call has its own 500-unit cut-off.
 *
 * Driven by: the ECS character entities (`npcType` or `skin` + `transform` +
 * `modelObject`, read-only) and the listener hero's position.
 * Read by: nobody; it only commands the mixer.
 */

// ---- 1. tuning -------------------------------------------------------------

/** These belong to the place they stand in, so ambience (`sound/buses.ts`). */
const BUS: SoundBus = 'ambient';

/** One original tick: `MoveCharacterVisual` runs at 25 Hz. */
const TICK = 1 / 25;

/** Ticks one frame may pay out, so a hitch cannot dump a backlog of rolls. */
const MAX_TICKS_PER_FRAME = 4;

/** Share of the effects track at the source, 0…1 - under the beds' SFX. */
const GAIN = 0.55;

/**
 * A voice an NPC type carries. `oneIn` is the original's
 * `rand_fps_check(n)`: one chance in n, per tick. `frames` is a window on
 * the idle clip instead, and the sound fires as the clip enters it.
 */
type NpcVoice = {
  readonly sound: Sounds;
  readonly oneIn?: number;
  /** `[from, to]` on `o->AnimationFrame` while `o->CurrentAction == 0`. */
  readonly frames?: readonly [number, number];
};

/**
 * ZzzCharacter.cpp:6080-6093, with the wave names from
 * ZzzOpenData.cpp:1870-1902. Keyed by NPC type number
 * (`common/npcs/npcModelTable.ts`).
 */
const NPC_VOICES: Readonly<Record<number, NpcVoice>> = {
  // 238 Chaos Machine goblin (MODEL_MIX_NPC): `rand_fps_check(64)`, :6081.
  238: { sound: 'Sound/nMix', oneIn: 64 },
  // 242 Elf wizard (MODEL_ELF_WIZARD): `rand_fps_check(256)`, :6085.
  242: { sound: 'Sound/nHarp', oneIn: 256 },
  // 251 Hanzo the Blacksmith (MODEL_SMITH): every tick the idle clip sits in
  // frames 5-10, so one clang per swing of the hammer (:6090-6092). The
  // sparks off that same swing are `effects/monsterVisuals.ts`.
  251: { sound: 'Sound/nBlackSmith', frames: [5, 10] },
};

/**
 * `PlayMonsterSoundGlobal` (ZzzCharacter.cpp:15118-15216): on the clip's start,
 * each loop of it (:3734) or while it holds (SetPlayerWalk each frame, :6439).
 */
type GlobalCue = {
  readonly on: MonsterActionType;
  readonly when: 'start' | 'loop' | 'hold';
  readonly sound: Sounds;
  /** `rand_fps_check(n)` on the event. */
  readonly oneIn?: number;
};

type GlobalVoice = {
  readonly bus: SoundBus;
  readonly cues: readonly GlobalCue[];
};

/** `if (fDistance > 500.0f) return true`, in tiles. */
export const GLOBAL_RANGE_TILES = 5;

/** MAX_CHANNEL (DSPlaySound.h:8); loop / hold cues take 1 so a line never stacks. */
const GLOBAL_CHANNELS = 4;

const TREASURE_BOX: GlobalVoice = {
  bus: BUS,
  cues: [
    {
      on: MonsterActionType.Die,
      when: 'start',
      sound: 'Sound/Doppelganger/treasurebox_open',
    },
  ],
};

/** Keyed by the monster the character is drawn as: its NPC type, or a player's skin. */
export const GLOBAL_NPC_VOICES: Readonly<Record<number, GlobalVoice>> = {
  // 477 Transformed Snowman, also the Snowman ring's skin (:15167-15189). Its
  // death line needs `LifeTime == 100`, which CreateMonster always sets for it
  // (:14781-14786).
  477: {
    bus: 'monsters',
    cues: [
      {
        on: MonsterActionType.Walk,
        when: 'hold',
        sound: 'Sound/xmas/SnowMan_Walk01',
      },
      {
        on: MonsterActionType.Attack1,
        when: 'start',
        sound: 'Sound/xmas/SnowMan_Attack01',
      },
      {
        on: MonsterActionType.Attack2,
        when: 'start',
        sound: 'Sound/xmas/SnowMan_Attack02',
      },
      {
        on: MonsterActionType.Shock,
        when: 'start',
        sound: 'Sound/xmas/SnowMan_Damage01',
      },
      {
        on: MonsterActionType.Die,
        when: 'start',
        sound: 'Sound/xmas/SnowMan_Death01',
      },
    ],
  },
  // 479 Gatekeeper Titus: every idle loop.
  479: {
    bus: BUS,
    cues: [
      {
        on: MonsterActionType.Stop1,
        when: 'loop',
        sound: 'Sound/w64/GatekeeperTitus',
      },
    ],
  },
  // 540 Lugard: one idle loop in two.
  540: {
    bus: BUS,
    cues: [
      {
        on: MonsterActionType.Stop1,
        when: 'loop',
        sound: 'Sound/Doppelganger/Lugard',
        oneIn: 2,
      },
    ],
  },
  // 541 / 542 the Doppelganger boxes, as they open.
  541: TREASURE_BOX,
  542: TREASURE_BOX,
};

// ---- 2. state + readers ----------------------------------------------------

function buildQuery(world: World) {
  return world.with('npcType', 'transform', 'modelObject');
}

function buildSkinQuery(world: World) {
  return world.with('skin', 'transform', 'modelObject');
}

type Voiced = ReturnType<typeof buildQuery>['entities'][number];
type Skinned = ReturnType<typeof buildSkinQuery>['entities'][number];

/** The character queries, rebuilt when the world behind the listener changes. */
let queried: World | null = null;
let characters: ReturnType<typeof buildQuery> | null = null;
let skinned: ReturnType<typeof buildSkinQuery> | null = null;

/** Unpaid time, in seconds, shared by every roll this frame. */
let bank = 0;

/** Seconds of layer time, the clock `hold` voices wait on. */
let now = 0;

/** Whether a frame-gated NPC was inside its window on the previous tick. */
const inWindow = new WeakMap<Entity, boolean>();

/** Per character with a global voice: its clip as of the last tick. */
type VoiceClock = {
  serial: number;
  action: number;
  frame: number;
  holdUntil: number;
};
const clocks = new WeakMap<Entity, VoiceClock>();

function stepGlobalVoice(e: Voiced | Skinned, voice: GlobalVoice): void {
  const model = e.modelObject;
  if (!model.Ready) return;

  const action = model.CurrentAction;
  const frame = model.actionFrame();
  const serial = model.actionSerial;
  const clock = clocks.get(e);
  if (!clock) {
    // First sighting: the pose it spawned in is not an event.
    clocks.set(e, { serial, action, frame, holdUntil: 0 });
    return;
  }
  const started = serial !== clock.serial;
  const looped = !started && action === clock.action && frame < clock.frame;
  clock.serial = serial;
  clock.action = action;
  clock.frame = frame;

  if (e.objOutOfScope) return;
  const hero = listenerHero();
  if (!hero) return;
  const at = e.transform.pos;
  const from = hero.transform.pos;
  if (Math.hypot(at.x - from.x, at.z - from.z) > GLOBAL_RANGE_TILES) return;

  for (const cue of voice.cues) {
    if (cue.on !== action) continue;
    if (
      cue.when === 'start'
        ? !started
        : cue.when === 'loop'
          ? !looped
          : now < clock.holdUntil
    ) {
      continue;
    }
    if (cue.oneIn && Math.random() * cue.oneIn >= 1) continue;
    const ms = playSfx(cue.sound, null, {
      bus: voice.bus,
      channels: cue.when === 'start' ? GLOBAL_CHANNELS : 1,
    });
    if (cue.when === 'hold') clock.holdUntil = now + ms / 1000;
  }
}

function update(_map: ENUM_WORLD, dt: number): void {
  const world = listenerWorld();
  if (!world) return;

  if (queried !== world || !characters || !skinned) {
    characters = buildQuery(world);
    skinned = buildSkinQuery(world);
    queried = world;
  }

  now += dt;
  bank += dt;
  let ticks = 0;
  while (bank >= TICK && ticks < MAX_TICKS_PER_FRAME) {
    bank -= TICK;
    ticks++;
  }
  if (bank >= TICK) bank = 0;
  if (ticks === 0) return;

  for (const e of skinned) {
    const voice = GLOBAL_NPC_VOICES[e.skin];
    if (voice && e.npcType === undefined) stepGlobalVoice(e, voice);
  }

  for (const e of characters) {
    const voice = GLOBAL_NPC_VOICES[e.npcType];
    if (voice) {
      stepGlobalVoice(e, voice);
      continue;
    }

    const row = NPC_VOICES[e.npcType];
    if (!row) continue;

    const model = e.modelObject;
    if (!model.Ready) continue;
    // Out of the server's scope the character is not in the update set the
    // original's switch walks, so it makes no noise either.
    if (e.objOutOfScope) continue;

    if (row.frames) {
      // The clip's own phase is the clock: one shot as it enters the window,
      // nothing more until it has left and come round again.
      const frame = model.actionFrame();
      const inside =
        model.CurrentAction === 0 &&
        frame >= row.frames[0] &&
        frame <= row.frames[1];
      const was = inWindow.get(e) ?? false;
      inWindow.set(e, inside);
      if (!inside || was) continue;
    } else if (row.oneIn && Math.random() >= ticks / row.oneIn) {
      continue;
    }

    // `PlayBuffer` on a channel that is still sounding is a no-op.
    if (SoundsManager.isPlaying(row.sound)) continue;

    playSfx(row.sound, e.transform.pos, { bus: BUS, gain: GAIN });
  }
}

function reset(): void {
  queried = null;
  characters = null;
  skinned = null;
  bank = 0;
}

// ---- 3. the layer ----------------------------------------------------------

export const npcVoicesLayer: SoundLayer = { name: 'npcVoices', update, reset };
