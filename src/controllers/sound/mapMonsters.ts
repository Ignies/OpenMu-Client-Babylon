import { MonsterActionType } from '@versions/shared/objects/enum';
import type { ENUM_WORLD } from '../../core/types';
import { maps, type MapLayer } from '../maps';
import type { Sounds } from './recipes';

/**
 * Per-map monster voices: `PlayMonsterSound(o)` (ZzzCharacter.cpp:215-236), run before
 * `Models[].Sounds[]` at walk (:760), attack (:1282), flinch (:1404) and death (:1536).
 * NPC-model voices (:15167-15221) are in `npcVoices.ts`. Notes in readme.md.
 */

/** One rule: an action set, the sound, and how often / when it fires. */
export type MonsterCue = {
  /** Actions this cue answers to. */
  readonly on: readonly MonsterActionType[];
  /** The sound; a pair is the original's `rand_fps_check(2) ? a : b`. */
  readonly play: Sounds | readonly [Sounds, Sounds];
  /**
   * `rand_fps_check(n)`, rolled where the original calls `PlayMonsterSound`:
   * every frame while walking (`SetPlayerWalk` runs each frame the monster
   * moves), each time the idle clip loops, and once when any other clip
   * starts. A walk cue without a chance repeats for as long as it walks.
   */
  readonly chance?: number;
  /**
   * `1.f <= AnimationFrame && AnimationFrame < 2.f`: fires once as the clip
   * crosses the window, even when a single frame steps over all of it. A
   * one-shot that has run out counts as past every window.
   */
  readonly frame?: readonly [number, number];
  /**
   * A hook's `if (o->SubType == FALSE) { o->SubType = TRUE; PlayBuffer(..) }`:
   * one latch per monster, shared by all its `once` cues, cleared when it
   * idles. `'life'` is for the hooks that never clear it.
   */
  readonly once?: true | 'life';
  /** Rolled every frame whatever the clip, not only while walking. */
  readonly perFrame?: true;
  /** Plays as the monster is created, from the map's CreateMonster. */
  readonly spawn?: true;
  /** From a hook's bare `PlayBuffer`: 2D in the original, so no five-tile gate. */
  readonly unranged?: true;
  /**
   * From a move / render hook, which only runs while `o->Visible`
   * (ZzzCharacter.cpp:5605, :11471): silent while the monster is not drawn.
   */
  readonly drawn?: true;
  /** A `timeGetTime()` timer: a walk cue plays every `period` ms, started or dropped. */
  readonly period?: number;
  /**
   * The wave's `LoadWaveFile` channel count. Unset is the monster tables' 2;
   * the sets loaded with MAX_CHANNEL's 4 are held to that 2 on purpose.
   */
  readonly channels?: number;
};

const A = MonsterActionType;

/** Model type -> its cues. Keys are `MONSTER_MODEL_x`, as in the body files (versions/shared/monster_models). */
export type VoiceSet = Readonly<Record<number, readonly MonsterCue[]>>;

/** `fDistance > 500.0f` in MU units - five tiles. */
export const MAP_VOICE_RANGE_TILES = 5;

const ATTACK_1_2: readonly MonsterActionType[] = [A.Attack1, A.Attack2];

// ---- 1. the global list ----------------------------------------------------

/**
 * `PlayMonsterSoundGlobal` (ZzzCharacter.cpp:15118-15196): voices that follow
 * their monster onto any map. `DarkSanta_Damage02` is not shipped, so the
 * flinch pair collapses to `Damage01`.
 */
export const GLOBAL_VOICES: VoiceSet = {
  // CURSED_SANTA
  155: [
    { on: [A.Stop1], play: ['Sound/xmas/DarkSanta_Idle01', 'Sound/xmas/DarkSanta_Idle02'] },
    { on: [A.Walk], play: ['Sound/xmas/DarkSanta_Walk01', 'Sound/xmas/DarkSanta_Walk02'] },
    { on: ATTACK_1_2, play: 'Sound/xmas/DarkSanta_Attack01' },
    // Damage01 or Damage02 at even odds, and Damage02 is not shipped.
    { on: [A.Shock], play: 'Sound/xmas/DarkSanta_Damage01', chance: 2 },
    { on: [A.Die], play: 'Sound/xmas/DarkSanta_Death01' },
  ],
};

// ---- 2. the world index ----------------------------------------------------

/*
 * The per-map sets are each map's own: `MapSound.monsterCues` (the worlds a
 * handler's guard names) and `MapSound.monsterCuesAnyMap` (hooks that check
 * no world) in `versions/shared/maps/<map>/sound.ts`.
 */

const cuesOf = (l: MapLayer) => l.sound?.monsterCues;

/** Every map's unguarded hooks, merged in list order; rebuilt when the list grows. */
let anyMap: { readonly from: number; readonly set: VoiceSet } | null = null;

function anyMapHooks(): VoiceSet {
  const all = maps.all;
  if (anyMap?.from !== all.length) {
    const set: Record<number, readonly MonsterCue[]> = {};
    for (const layer of all) Object.assign(set, layer.sound?.monsterCuesAnyMap);
    anyMap = { from: all.length, set };
  }
  return anyMap.set;
}

/**
 * The cues a monster model has here, global list first - or null when this
 * map has nothing to say about it and the generic table is the only voice.
 */
export function mapMonsterCues(
  world: ENUM_WORLD,
  modelType: number
): readonly MonsterCue[] | null {
  return (
    GLOBAL_VOICES[modelType] ??
    maps.rowFor(world, cuesOf)?.[modelType] ??
    anyMapHooks()[modelType] ??
    null
  );
}

// ---- 3. the stepper --------------------------------------------------------

/** `rand_fps_check(n)` (Random.cpp:75): one in n per frame at the 25 fps reference. */
export function fpsCheck(n: number, dt: number): boolean {
  return Math.random() * n <= Math.min(1, dt * 25);
}
const oneIn = (n: number) => Math.random() * n < 1;

/** `rand_fps_check(2) ? a : b`, or the single sound a cue carries. */
function cueSound(cue: MonsterCue): Sounds {
  return Array.isArray(cue.play)
    ? cue.play[Math.random() < 0.5 ? 0 : 1]
    : (cue.play as Sounds);
}

/** Per monster with cues: what they have done in the clip it is in. */
export type CueState = {
  /** Frame-window cues already fired this pass through the clip. */
  fired: boolean[];
  /** When a repeating cue may play again: its last play's end, or its period. */
  until: number[];
  /** `o->SubType`: 0 clear, 1 set until the next idle, 2 set for good. */
  latch: 0 | 1 | 2;
  lastFrame: number;
};

/** A repeating cue whose play was dropped waits this long before it tries again. */
export const CUE_RETRY_MS = 100;

export function newCueState(count: number, frame: number): CueState {
  return {
    fired: new Array<boolean>(count).fill(false),
    until: new Array<number>(count).fill(0),
    latch: 0,
    lastFrame: frame,
  };
}

/** Starts `key` at `at`; returns how long it lasts in ms, 0 if nothing started. */
export type CuePlayer<P> = (key: Sounds, channels: number | undefined, at: P) => number;

/**
 * One frame of one monster's cues. `frame` is `o->AnimationFrame`, or
 * Infinity once a one-shot has run out; `started` is a clip (re)start since
 * the last step; `drawn` is `o->Visible`. Allocation-free.
 */
export function stepCues<P>(
  s: CueState,
  cues: readonly MonsterCue[],
  action: MonsterActionType,
  started: boolean,
  frame: number,
  dt: number,
  now: number,
  inRange: boolean,
  drawn: boolean,
  at: P,
  play: CuePlayer<P>
): void {
  // A fresh clip or a wrapped loop is a new pass through every window.
  const looped = !started && frame < s.lastFrame;
  const prev = started || looped ? -Infinity : s.lastFrame;
  s.lastFrame = frame;
  if (started || looped) s.fired.fill(false);

  const walking = action === A.Walk || action === A.Run;
  const idle = action === A.Stop1 || action === A.Stop2;
  // The hooks clear it, so only on a frame they run.
  if (idle && drawn && s.latch === 1) s.latch = 0;
  // Every `once` cue answering this clip sits behind the one latch test.
  const latched = s.latch !== 0;

  for (let i = 0; i < cues.length; i++) {
    const cue = cues[i];
    if (!cue.on.includes(action)) continue;
    if (!inRange && !cue.unranged) continue;
    if (!drawn && cue.drawn) continue;

    if (cue.frame) {
      if (s.fired[i] || frame < cue.frame[0] || prev >= cue.frame[1]) continue;
      s.fired[i] = true;
    } else if (cue.once) {
      // The latch below is the whole trigger: tested every frame.
    } else if (walking || cue.perFrame) {
      if (cue.chance ? !fpsCheck(cue.chance, dt) : now < s.until[i]) continue;
    } else if (idle) {
      if (!looped) continue;
      if (cue.chance && !oneIn(cue.chance)) continue;
    } else {
      if (!started) continue;
      if (cue.chance && !oneIn(cue.chance)) continue;
    }

    if (cue.once) {
      if (latched) continue;
      s.latch = cue.once === 'life' ? 2 : 1;
    }
    const ms = play(cueSound(cue), cue.channels, at);
    s.until[i] = now + (cue.period ?? (ms > 0 ? ms : CUE_RETRY_MS));
  }
}

/** The cues a map's CreateMonster plays as the monster is created. */
export function playSpawnCues<P>(
  cues: readonly MonsterCue[],
  at: P,
  play: CuePlayer<P>
): void {
  for (const cue of cues) if (cue.spawn) play(cueSound(cue), cue.channels, at);
}
