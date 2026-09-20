import type { ENUM_WORLD } from '../common/types';
import type { Entity, World } from '../ecs/world';
import { SoundsManager } from '../libs/soundsManager';
import type { SoundBus } from './buses';
import type { Sounds } from './recipes';
import type { SoundLayer } from './layer';
import { listenerWorld, playSfx } from './listener';

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
 * Driven by: the ECS character entities (`npcType` + `transform` +
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

// ---- 2. state + readers ----------------------------------------------------

function buildQuery(world: World) {
  return world.with('npcType', 'transform', 'modelObject');
}

/** The character query, rebuilt when the world behind the listener changes. */
let queried: World | null = null;
let characters: ReturnType<typeof buildQuery> | null = null;

/** Unpaid time, in seconds, shared by every roll this frame. */
let bank = 0;

/** Whether a frame-gated NPC was inside its window on the previous tick. */
const inWindow = new WeakMap<Entity, boolean>();

function update(_map: ENUM_WORLD, dt: number): void {
  const world = listenerWorld();
  if (!world) return;

  if (queried !== world || !characters) {
    characters = buildQuery(world);
    queried = world;
  }

  bank += dt;
  let ticks = 0;
  while (bank >= TICK && ticks < MAX_TICKS_PER_FRAME) {
    bank -= TICK;
    ticks++;
  }
  if (bank >= TICK) bank = 0;
  if (ticks === 0) return;

  for (const e of characters) {
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
  bank = 0;
}

// ---- 3. the layer ----------------------------------------------------------

export const npcVoicesLayer: SoundLayer = { name: 'npcVoices', update, reset };
