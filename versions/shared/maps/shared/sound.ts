import { MonsterActionType } from '@versions/shared/objects/enum';
import type {
  HeroContext,
  MapAmbientBed,
  MapObjectLoop,
  MonsterCue,
  Sounds,
  StepRule,
  VoiceSet,
} from '@/controllers/sound';

/**
 * Building blocks the maps' `sound.ts` rows share: the wind bed and the
 * shorthands for the original's per-map monster hooks. Plain data, no engine.
 */

const A = MonsterActionType;

/** `SOUND_WIND01` (SceneManager.cpp:578-628): Lorencia, Devias, Noria, the hatchery, the market. */
export const WIND: MapAmbientBed = { sound: 'Sound/aWind', volume: 0.35 };

/** An object loop that carries like a brook or a gear (`MapObjectLoop.reach`). */
export const smallLoop = (
  types: readonly number[],
  sound: Sounds,
  gain: number,
  when?: MapObjectLoop['when']
): MapObjectLoop => ({ types, sound, gain, reach: 'small', when });

/** An object loop that carries like a waterfall, the great wheel, the volcano. */
export const largeLoop = (
  types: readonly number[],
  sound: Sounds,
  gain: number,
  when?: MapObjectLoop['when']
): MapObjectLoop => ({ types, sound, gain, reach: 'large', when });

/** `!bSafeZone`: an object loop muted while the hero stands in the safe zone. */
export const outsideSafeZone = (h: HeroContext): boolean => !h.inSafeZone;

export type Play = MonsterCue['play'];

export const ATTACK_1_2: readonly MonsterActionType[] = [A.Attack1, A.Attack2];
export const WALK: readonly MonsterActionType[] = [A.Walk];
export const WALK_RUN: readonly MonsterActionType[] = [A.Walk, A.Run];

/** Hook waves are 2D, and `MapManager` loads each with one channel. */
export const HOOK = { unranged: true, drawn: true, channels: 1 } as const;
/** `AttackEffect` runs from MoveCharacter for every live monster, drawn or not (:4133). */
export const ATTACK_EFFECT = { unranged: true } as const;

/** A set whose waves `LoadWaveFile` loads with one channel. */
export const oneChannel = (set: VoiceSet): VoiceSet =>
  Object.fromEntries(
    Object.entries(set).map(([type, cues]) => [type, cues.map(c => ({ ...c, channels: 1 }))])
  );

/** `if (rand_fps_check(n)) PlayBuffer(MOVE1 + rand() % 2)` in a walk clip. */
export const hookWalk = (play: Play, chance = 15, on = WALK_RUN): MonsterCue => ({
  on,
  play,
  chance,
  ...HOOK,
});

/** Behind the `o->SubType` latch. */
export const hookOnce = (
  on: readonly MonsterActionType[],
  play: Play,
  once: true | 'life' = true
): MonsterCue => ({ on, play, once, ...HOOK });

/** Re-issued every frame of the clip in the original: once per clip here. */
export const hookPlay = (on: readonly MonsterActionType[], play: Play): MonsterCue => ({
  on,
  play,
  ...HOOK,
});

/*
 * About the hooks: the move / render hooks run every frame the monster is
 * drawn and are silent while it is not (`drawn`); only the `AttackEffect`
 * ones run for every live monster. Walk chatter is a per-frame roll, the rest
 * goes through the `o->SubType` latch. A sound a hook re-issues every frame
 * of a clip (the deaths, the frame windows) plays once here.
 *
 * Their waves are loaded by `MapManager` for the home map only and stay
 * loaded after it, so a hook with no world guard voices its monsters wherever
 * they appear - Devil Square 7's Kanturu monsters, Devil Square 5-6's Land of
 * Trials ones (`MapSound.monsterCuesAnyMap`). Those sets assume the home map
 * was visited, which the original does not guarantee.
 */

// ---- footsteps (`PlayWalkSound`, ZzzCharacter.cpp:5347-5385) ---------------

/** Snow on every tile: Ice City (`IsIceCity` counts Doppelganger 1) and Santa Town. */
export const SNOW_STEPS: readonly StepRule[] = [{ sound: 'Sound/pWalk(Snow)' }];

/** Grass on tile 0 (`HeroTile == 0`): Lorencia and Noria. */
export const GRASS_STEPS: readonly StepRule[] = [{ sound: 'Sound/pWalk(Grass)', on: tile => tile === 0 }];

/** `SOUND_HUMAN_WALK_SWIM` wherever the hero is not in the safe zone: Atlans, Kalima, Doppelganger 3. */
export const SWIM_STEPS: readonly StepRule[] = [{ sound: 'Sound/pSwim', outsideSafeZone: true }];
