import type { ENUM_WORLD } from '../common/types';
import type { Scene } from '../libs/babylon/exports';
import type { World } from '../ecs/world';
import { SoundsManager } from '../libs/soundsManager';
import { EventBus } from '../libs/eventBus';
import { GameOptions, onGameOptionsChanged } from '../common/gameOptions';
import { busGain, trackGains, type SoundBus } from './buses';
import type { SoundLayer } from './layer';
import { SOUND_LAYERS } from './layers';
import type { Sounds } from './recipes';
import {
  attachListener,
  clearSfxListener,
  listenerTile,
  playSfx,
  setSfxListener,
  type SfxPosition,
} from './listener';
import { playUiSound, type UiSound } from './ui';
import { playCombat, playSkill } from './combat';
import { playMonster, type MonsterVoice } from './monsters';
import { currentMusic, playMusic, stopMusic } from './music';
import { crackleSources, type CrackleSource } from './crackle';
import { objectLoopSources, type ObjectLoopSource } from './objectLoops';

export type { SoundLayer } from './layer';
export type { SoundBus } from './buses';
export type { Sounds } from './recipes';
export type { SfxPosition, SfxOptions } from './listener';
export type { DropSoundInfo } from './drops';
export type { UiSound } from './ui';
export type { WeaponHands } from './combat';
export type { MonsterSoundSlots, MonsterVoice } from './monsters';
export type { AmbientBed, AmbientOneShot } from './ambientBeds';
export type { CrackleSource } from './crackle';
export type { ObjectLoop, ObjectLoopSource } from './objectLoops';

// The entry functions, re-exported so the pre-migration modules
// (`libs/sfx.ts`, `common/combatSounds.ts`) can stay one-line re-exports.
export {
  playSfx,
  setSfxListener,
  clearSfxListener,
  listenerTile,
} from './listener';
export {
  UI_BUS,
  UI_SOUNDS,
  UI_SOUND_KEYS,
  playUiSound,
  uiClick,
} from './ui';
export { installUiWindowChime } from './windowChime';
export {
  COMBAT_BUS,
  SKILL_SOUNDS,
  hitSound,
  pickupSound,
  playCombat,
  playSkill,
  playerDeathSound,
  playerPainSound,
  playerSwingSound,
  skillSound,
  usesMissileWeapon,
} from './combat';
export {
  MONSTER_ASSASSIN,
  MONSTER_BUS,
  MONSTER_SOUNDS,
  monsterAttackSound,
  monsterDeathSound,
  monsterIdleSound,
  playMonster,
} from './monsters';
export { dropSound, dropSoundAllowed, playDrop } from './drops';
export { currentMusic, mapMusic, playMusic, stopMusic } from './music';
export {
  BUS_VOLUME_MAX,
  BUS_VOLUME_OPTION,
  busGain,
  busSilent,
  masterGain,
  trackGains,
} from './buses';
export { SOUND_FILES, SOUND_KEYS, isMusicKey, soundUrl } from './recipes';
export { OBJECT_LOOPS } from './objectLoops';

/**
 * The sound layer: everything the player hears — the beds under a map, the
 * music, the footsteps, the clicks, the swings, the monster voices — behind
 * one object. Copy `_template.ts` when adding to it.
 *
 * The game talks to `sound.update` once a frame
 * (`ecs/systems/soundSystem.ts`) and `sound.reset` on a map change
 * (`libs/mu/loadMapIntoScene.ts`); both fan out over `SOUND_LAYERS`
 * (`layers.ts`), the only list of entries. Playback itself is the mixer's
 * (`libs/soundsManager.ts`: the Babylon tracks and buffers); entries decide
 * *what* plays and command the mixer. The facade holds no state.
 */
class Sound {
  private readonly layers: SoundLayer[] = [...SOUND_LAYERS];

  /** Add an entry at runtime (tools, experiments). Returns the unregister. */
  register(layer: SoundLayer): () => void {
    this.layers.push(layer);
    return () => {
      const i = this.layers.indexOf(layer);
      if (i >= 0) this.layers.splice(i, 1);
    };
  }

  /** Every entry that exists on this map. */
  layersFor(map: ENUM_WORLD): SoundLayer[] {
    return this.layers.filter(l => !l.maps || l.maps.has(map));
  }

  /**
   * Boot the mixer on the scene (Babylon tracks + the audio-unlock gesture)
   * at the sliders' levels, and follow them from then on.
   *
   * Only the two track gains are pushed here. The categories under `effects`
   * are read per play (`buses.ts`), so a slider move reaches the one-shots
   * and the loops without anything being pushed at all.
   */
  init(scene: Scene): void {
    const boot = trackGains();
    SoundsManager.initializeSounds(scene, boot.music, boot.effects);

    let music = boot.music;
    let effects = boot.effects;

    onGameOptionsChanged(() => {
      const next = trackGains();
      if (next.music !== music || next.effects !== effects) {
        music = next.music;
        effects = next.effects;
        SoundsManager.setTrackGains(music, effects);
      }
    });

    EventBus.on('pageVisibilityChanged', visible => {
      SoundsManager.setBackgrounded(!visible && GameOptions.muteInBackground);
    });
  }

  /** Attach the ECS world the listener lives in. Once, from `soundSystem`. */
  attach(world: World): void {
    attachListener(world);
  }

  /** Step every entry. Call once a frame, after movement. */
  update(map: ENUM_WORLD, dt: number): void {
    for (const layer of this.layers) layer.update?.(map, dt);
  }

  /**
   * Stop what belongs to the map just left, and drop the decoded effects no
   * map has asked for lately. Call when the map changes.
   */
  reset(): void {
    for (const layer of this.layers) layer.reset?.();
    SoundsManager.evictStale();
  }

  // ---- readers -----------------------------------------------------------

  /** Whether the browser has unlocked audio (first gesture seen). */
  get unlocked(): boolean {
    return SoundsManager.pageInteracted;
  }

  /** The music track playing, or null. */
  get currentMusic(): Sounds | null {
    return currentMusic();
  }

  /** Music track gain, 0…1, master folded in. */
  get musicVolume(): number {
    return SoundsManager.musicVolume;
  }

  /**
   * Effects track gain, 0…1, master folded in. Beds, footsteps and one-shots
   * all sit on it, each scaled again by its own category (`buses.ts`).
   */
  get effectsVolume(): number {
    return SoundsManager.effectsVolume;
  }

  /** One category's share of the effects track, 0…1 (`buses.ts`). */
  busVolume(bus: SoundBus): number {
    return busGain(bus);
  }

  /** Whether a buffer is currently sounding. */
  isPlaying(key: Sounds): boolean {
    return SoundsManager.isPlaying(key);
  }

  /** Whether a buffer is sounding *and* set to loop (music, beds). */
  isLooping(key: Sounds): boolean {
    return SoundsManager.isLooping(key);
  }

  /** Terrain tile under the hero, -1 without one. */
  get heroTile(): number {
    return listenerTile();
  }

  /** The fires crackling right now: the nearest flames, with their volumes. */
  get crackling(): readonly CrackleSource[] {
    return crackleSources();
  }

  /** The map-object loops sounding right now: the nearest brooks, gears, gates… */
  get objectLoops(): readonly ObjectLoopSource[] {
    return objectLoopSources();
  }

  // ---- commands ----------------------------------------------------------

  /** An interface sound (click, error, window, pickup…). */
  playUi(kind: UiSound): void {
    playUiSound(kind);
  }

  /**
   * Any catalogue sound once; `at` (tiles) attenuates it by distance to the
   * hero. `bus` names the mixer category, `world` by default - the slider a
   * map door or a firework rides.
   */
  play(key: Sounds, at?: SfxPosition | null, bus?: SoundBus): void {
    playSfx(key, at, { bus });
  }

  /** A skill's cast sound at its caster. */
  playSkill(skill: number, at?: SfxPosition | null): void {
    playSkill(skill, at);
  }

  /** An already-selected combat sound (swing, hit, scream) at a position. */
  playCombat(key: Sounds | null, at?: SfxPosition | null): void {
    playCombat(key, at);
  }

  /** A monster's voice by model type and moment (idle / attack / death). */
  playMonster(
    modelType: number,
    voice: MonsterVoice,
    at?: SfxPosition | null
  ): void {
    playMonster(modelType, voice, at);
  }

  /** Start a music track; the previous one stops. */
  playMusic(key: Sounds): void {
    playMusic(key);
  }

  /** Stop the music. */
  stopMusic(): void {
    stopMusic();
  }

  /** Stop one buffer (a bed, a track, a loop). */
  stop(key: Sounds): void {
    SoundsManager.stopSoundEffect(key);
  }

  /** Pin the listener (hero position, tiles). */
  setListener(x: number, z: number): void {
    setSfxListener(x, z);
  }

  /** Forget the listener: positioned sounds play at full volume. */
  clearListener(): void {
    clearSfxListener();
  }
}

export const sound = new Sound();

// A hot update that reaches this module must reload the page: Vite would
// otherwise re-execute it and hand later-loaded importers a second instance
// of this singleton (same guard as store.ts).
const hot = (import.meta as { hot?: { decline(): void } }).hot;
if (hot) hot.decline();
