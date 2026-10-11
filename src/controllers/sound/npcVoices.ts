import { monsterRegistry, type NpcGlobalVoice, type NpcVoice } from '@/controllers/monsters';
import type { ENUM_WORLD } from '../../core/types';
import type { Entity, World } from '../../ecs/world';
import { SoundsManager } from './soundsManager';
import type { SoundBus } from './buses';
import type { Sounds } from './recipes';
import type { SoundLayer } from './layer';
import { listenerHero, listenerWorld, playSfx } from './listener';

/**
 * Town NPC noises (Hanzo's anvil, the Chaos Machine goblin, the elf's harp) from `MoveCharacterVisual`
 * (ZzzCharacter.cpp:6080-6093, DSPlaySound.cpp:303), plus the `PlayMonsterSoundGlobal` voices. Which type
 * sounds like what is its monster folder's `voice` / `globalVoice`. Notes in readme.md.
 */

// ---- 1. tuning -------------------------------------------------------------

/** These belong to the place they stand in, so ambience (`controllers/sound/buses.ts`). */
const BUS: SoundBus = 'ambient';

/** One original tick: `MoveCharacterVisual` runs at 25 Hz. */
const TICK = 1 / 25;

/** Ticks one frame may pay out, so a hitch cannot dump a backlog of rolls. */
const MAX_TICKS_PER_FRAME = 4;

/** Share of the effects track at the source, 0…1 - under the beds' SFX. */
const GAIN = 0.55;

/** `if (fDistance > 500.0f) return true`, in tiles. */
export const GLOBAL_RANGE_TILES = 5;

/** MAX_CHANNEL (DSPlaySound.h:8); loop / hold cues take 1 so a line never stacks. */
const GLOBAL_CHANNELS = 4;

// ---- 2. readers + state ----------------------------------------------------

/**
 * The town noise an NPC type makes, if any: `voice` in its monster folder (ZzzCharacter.cpp:6080-6093,
 * waves ZzzOpenData.cpp:1870-1902).
 */
export function npcVoiceOf(type: number): NpcVoice | undefined {
  return monsterRegistry.def(type)?.voice;
}

/**
 * The `PlayMonsterSoundGlobal` voice (ZzzCharacter.cpp:15118-15216) of the monster a character is drawn
 * as, its NPC type or a player's skin: `globalVoice` in that monster's folder. A cue fires on the
 * clip's start, each loop of it (:3734) or while it holds (SetPlayerWalk each frame, :6439).
 */
export function globalNpcVoiceOf(type: number): NpcGlobalVoice | undefined {
  return monsterRegistry.def(type)?.globalVoice;
}

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

function stepGlobalVoice(e: Voiced | Skinned, voice: NpcGlobalVoice): void {
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
    const ms = playSfx(cue.sound as Sounds, null, {
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
    const voice = globalNpcVoiceOf(e.skin);
    if (voice && e.npcType === undefined) stepGlobalVoice(e, voice);
  }

  for (const e of characters) {
    const voice = globalNpcVoiceOf(e.npcType);
    if (voice) {
      stepGlobalVoice(e, voice);
      continue;
    }

    const row = npcVoiceOf(e.npcType);
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
    if (SoundsManager.isPlaying(row.sound as Sounds)) continue;

    playSfx(row.sound as Sounds, e.transform.pos, { bus: BUS, gain: GAIN });
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
