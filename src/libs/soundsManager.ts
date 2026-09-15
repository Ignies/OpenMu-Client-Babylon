import '@babylonjs/core/Audio/audioSceneComponent';
import { Sound } from '@babylonjs/core/Audio/sound';
import { SoundTrack } from '@babylonjs/core/Audio/soundTrack';
import { Engine, PointerEventTypes, type Scene } from './babylon/exports';
import { isMusicKey, soundUrl, type Sounds } from '../sound/recipes';
import { ENABLE_BG_MUSIC } from '../consts';

/**
 * The mixer: two Babylon `SoundTrack`s (music / effects), one `Sound` per
 * catalogue key, created on first use. Entries in `src/sound/` decide *what*
 * plays; this only knows how to play a key.
 *
 * Music keys are created `streaming` (an `<audio>` element feeding the
 * context) so a 2 MB track is never decoded into a 30 MB buffer, and always
 * `loop`. Effects are decoded buffers, evicted when they have not been asked
 * for on the last `EVICT_AFTER_MAPS` maps (`evictStale`, from `sound.reset`).
 *
 * The two track gains are the *only* gains it owns, and `setTrackGains` is
 * their one writer - `sound/index.ts` hands it what the sliders say
 * (`sound/buses.ts`). The per-category share is folded into each play's own
 * volume by whoever plays it, because a sound key belongs to more than one
 * category and a track owns its sounds.
 */

const getSoundUrls = (key: Sounds) => soundUrl(key);

/** Seconds a track fades out under the next one (and the next fades in). */
export const MUSIC_CROSSFADE_SECONDS = 0.5;

/** Decoded effects unused for this many map changes are dropped. */
const EVICT_AFTER_MAPS = 2;

/** Seconds the tracks take to ramp away and back when the page is hidden. */
export const BACKGROUND_FADE_SECONDS = 0.3;

const sounds = new Map<Sounds, Sound>();

/**
 * The background ramp, 1 up and 0 away, multiplied into both track gains.
 *
 * Hand-stepped because `SoundTrack.setVolume` has no time argument the way
 * `Sound.setVolume` does, and the track's gain node is private. Progress
 * comes from the clock rather than a step count, so a hidden tab - where the
 * browser clamps timers to about a second - lands on the target in one late
 * callback instead of crawling.
 */
let backgroundMix = 1;
let fadeFrom = 1;
let fadeStart = 0;
let fading = false;

function stepBackgroundFade(): void {
  const target = SoundsManager.backgrounded ? 0 : 1;
  const elapsed = (performance.now() - fadeStart) / 1000;
  const t = Math.min(1, elapsed / BACKGROUND_FADE_SECONDS);

  backgroundMix = fadeFrom + (target - fadeFrom) * t;
  SoundsManager.syncTrackGains();

  if (t >= 1) {
    fading = false;
    return;
  }

  window.setTimeout(stepBackgroundFade, 16);
}

/** How far the background music is pulled down while an instrument plays nearby. */
const INSTRUMENT_DUCK = 0.15;
/** Seconds the music takes to step aside for a performance, and to come back. */
const DUCK_SECONDS = 0.4;

let bandDuck = 1;
let duckTarget = 1;
let duckFrom = 1;
let duckStart = 0;
let ducking = false;

function stepInstrumentDuck(): void {
  const elapsed = (performance.now() - duckStart) / 1000;
  const t = Math.min(1, elapsed / DUCK_SECONDS);

  bandDuck = duckFrom + (duckTarget - duckFrom) * t;
  SoundsManager.syncTrackGains();

  if (t >= 1) {
    ducking = false;
    return;
  }

  window.setTimeout(stepInstrumentDuck, 16);
}

/** Map epoch a buffer was last asked for, for `evictStale`. */
const lastUsed = new Map<Sounds, number>();
let mapEpoch = 0;

/**
 * Independent looping instances of a buffer, keyed `${key}#${slot}` - the
 * slots of a positional chorus (the torch crackle) where several copies of
 * the same file sound at once at different volumes. Never in `sounds`, so
 * the shared per-key instance the beds and one-shots use is untouched.
 */
const instances = new Map<string, Sound>();

const createSound = (key: Sounds, scene: Scene, track: SoundTrack) => {
  const music = isMusicKey(key);
  const s = new Sound(key, getSoundUrls(key), scene, null, {
    streaming: music,
    loop: music,
  });

  track.addSound(s);
  sounds.set(key, s);
  SoundsManager.syncTrackGains();

  return s;
};

export type { Sounds };

export class SoundsManager {
  static musicVolume = 0.5;
  static effectsVolume = 0.5;

  /** The page is hidden and `muteInBackground` asked for silence. */
  static backgrounded = false;

  static musicTrack: SoundTrack | null = null;
  static effectsTrack: SoundTrack | null = null;

  static scene: Scene | null = null;

  static pageInteracted = false;

  static currentMusic: Sounds | null = null;

  static {
    //@ts-ignore
    typeof window !== 'undefined' && (window.__soundsManager = SoundsManager);
  }

  /**
   * Boot the tracks at the gains the sliders ask for (`setTrackGains` keeps
   * them up to date from then on).
   *
   * A track's gain node only exists once its audio graph is built, which
   * Babylon does on the first `addSound` - `setVolume` before that is a
   * no-op, and the constructor option is skipped when it is 0 (falsy). So
   * the gains are handed to the constructor for the common case AND
   * re-applied by `syncTrackGains` after every sound is added.
   */
  static initializeSounds(scene: Scene, music: number, effects: number) {
    this.scene = scene;

    this.musicVolume = music;
    this.effectsVolume = effects;

    if (this.musicTrack) {
      this.musicTrack.dispose();
    }
    // `SoundTrack.id` is the track's index into `scene.soundTracks`;
    // `Sound.dispose` looks the track up by it. Never overwrite it.
    this.musicTrack = new SoundTrack(scene, {
      volume: ENABLE_BG_MUSIC ? this.musicVolume : 0,
    });

    if (this.effectsTrack) {
      this.effectsTrack.dispose();
    }
    this.effectsTrack = new SoundTrack(scene, { volume: this.effectsVolume });
    this.syncTrackGains();

    if (
      Engine.audioEngine &&
      Engine.audioEngine.onAudioUnlockedObservable &&
      !this.pageInteracted
    ) {
      Engine.audioEngine.onAudioUnlockedObservable.addOnce(() => {
        console.log(`sounds inited`);

        this.pageInteracted = true;
      });
    }

    // The browser unlocks the context on the first user gesture, wherever it
    // lands: the login page's DOM controls as much as the canvas.
    const unlock = () => {
      if (this.pageInteracted) return;
      try {
        Engine.audioEngine && Engine.audioEngine.unlock();
      } catch (e) {
        console.error(e);
      }
    };

    const sub = scene.onPointerObservable.add(ev => {
      if (this.pageInteracted) return;
      if (ev.type !== PointerEventTypes.POINTERUP) return;
      unlock();
      sub && sub.remove();
    });

    if (typeof document !== 'undefined') {
      const opts = { capture: true, once: true } as const;
      document.addEventListener('pointerdown', unlock, opts);
      document.addEventListener('keydown', unlock, opts);
    }
  }

  /** Push the remembered gains onto the tracks' gain nodes (see `initializeSounds`). */
  static syncTrackGains() {
    this.musicTrack?.setVolume(
      (ENABLE_BG_MUSIC ? this.musicVolume : 0) * backgroundMix * bandDuck
    );
    this.effectsTrack?.setVolume(this.effectsVolume * backgroundMix);
  }

  /**
   * A performer is playing an instrument in earshot: step the background music
   * aside so the performance is heard, and bring it back when they stop. The
   * effects track (which the instrument bus sits beside) is left alone.
   */
  /** The current music duck, 1 = full music, `INSTRUMENT_DUCK` = fully ducked (debug). */
  static get instrumentDuck(): number {
    return bandDuck;
  }

  static setInstrumentsActive(active: boolean) {
    const target = active ? INSTRUMENT_DUCK : 1;
    if (duckTarget === target) return;
    duckTarget = target;
    duckFrom = bandDuck;
    duckStart = performance.now();
    if (ducking) return;
    ducking = true;
    stepInstrumentDuck();
  }

  static loadSound(key: Sounds) {
    lastUsed.set(key, mapEpoch);
    const s = sounds.get(key);
    if (s) return s;
    return createSound(
      key,
      this.scene!,
      isMusicKey(key) ? this.musicTrack! : this.effectsTrack!
    );
  }

  /**
   * A map change. Decoded effects nobody asked for on the last
   * `EVICT_AFTER_MAPS` maps are disposed (their buffers go with them); a
   * later request simply re-fetches. Music is streamed, so it costs nothing
   * to keep, and the one playing must not be touched anyway.
   */
  static evictStale() {
    mapEpoch++;

    for (const [key, s] of sounds) {
      if (isMusicKey(key)) continue;
      if (s.isPlaying) continue;
      const used = lastUsed.get(key) ?? 0;
      if (mapEpoch - used < EVICT_AFTER_MAPS) continue;

      s.dispose();
      sounds.delete(key);
      lastUsed.delete(key);
    }
  }

  /**
   * `PlayBuffer(sound, NULL, true)` - the looping ambient bed. The original
   * re-issues this every frame and DirectSound makes it a no-op once the
   * buffer is already looping (DSplaysound.cpp:303-351), so this is safe to
   * call from an update loop too: an already-playing bed only has its volume
   * refreshed, and only when it changed.
   */
  static playAmbientLoop(key: Sounds, volume: number) {
    if (!this.pageInteracted) return;

    const s = this.loadSound(key);

    s.loop = true;
    if (s.getVolume() !== volume) s.setVolume(volume);

    if (!s.isPlaying) {
      s.autoplay = true;
      s.play();
    }

    return s;
  }

  /**
   * One looping instance of `key` in `slot`, created on first use and cached
   * across maps like every other buffer. Not the shared per-key `Sound`: a
   * caller may hold several slots of the same file sounding together at
   * different volumes (the torch crackle chorus). Returns undefined before
   * the audio unlock; the caller sets volume / rate and `play()`s it.
   */
  static loopInstance(key: Sounds, slot: number): Sound | undefined {
    if (!this.pageInteracted || !this.scene || !this.effectsTrack) return;

    const id = `${key}#${slot}`;
    let s = instances.get(id);
    if (s) return s;

    s = new Sound(id, getSoundUrls(key), this.scene, null, { loop: true });
    this.effectsTrack.addSound(s);
    instances.set(id, s);
    this.syncTrackGains();

    return s;
  }

  /** Stop one loop instance (keeps the buffer). */
  static stopLoopInstance(key: Sounds, slot: number) {
    const s = instances.get(`${key}#${slot}`);
    if (!s || !s.isPlaying) return;
    s.stop();
  }

  /** `StopBuffer(sound, true)`. */
  static stopAmbientLoop(key: Sounds) {
    const s = sounds.get(key);
    if (!s || !s.isPlaying) return;

    s.autoplay = false;
    s.stop();
  }

  static loadAndPlaySoundEffect(key: Sounds) {
    if (!this.pageInteracted) return;

    if (isMusicKey(key)) return this.playMusic(key);

    const s = this.loadSound(key);
    s.autoplay = true;
    s.play();
    return s;
  }

  /**
   * Start a music track, looping. The one playing fades out over
   * `MUSIC_CROSSFADE_SECONDS` while the new one fades in; asking for the
   * track already up is a no-op.
   */
  static playMusic(key: Sounds) {
    if (!this.pageInteracted) return;

    if (this.currentMusic === key) {
      const current = sounds.get(key);
      if (current && (current.isPlaying || current.autoplay)) return current;
    }

    this.fadeOutMusic();

    const s = this.loadSound(key);
    s.loop = true;
    s.autoplay = true;
    s.setVolume(0);
    s.play();
    s.setVolume(1, MUSIC_CROSSFADE_SECONDS);

    this.currentMusic = key;

    return s;
  }

  /** Fade every music track out and stop it once it is silent. */
  private static fadeOutMusic() {
    this.currentMusic = null;

    this.musicTrack?.soundCollection.forEach(s => {
      s.autoplay = false;
      if (!s.isPlaying) return;
      s.setVolume(0, MUSIC_CROSSFADE_SECONDS);
      window.setTimeout(() => {
        // Re-asked for during the fade: `playMusic` already ramped it back.
        if (this.currentMusic === s.name) return;
        s.stop();
        s.setVolume(1);
      }, MUSIC_CROSSFADE_SECONDS * 1000);
    });
  }

  /** Stop one buffer (a bed, a track, a loop) - a real stop, not a pause. */
  static stopSoundEffect(key: Sounds) {
    const s = sounds.get(key);

    if (s) {
      s.autoplay = false;
      if (s.isPlaying) s.stop();
    }

    if (this.currentMusic === key) {
      this.currentMusic = null;
    }

    return s;
  }

  static isPlaying(key: Sounds): boolean {
    const s = sounds.get(key);
    if (!s) return false;
    return s.isPlaying;
  }

  /** Whether a music key was created looping and is sounding. */
  static isLooping(key: Sounds): boolean {
    const s = sounds.get(key);
    return !!s && s.isPlaying && s.loop;
  }

  /**
   * The two track gains, 0…1, master already folded in (`sound/buses.ts`).
   * The one writer of `SoundTrack.setVolume`; `sound/index.ts` calls it
   * whenever an option changes, and nothing else may.
   */
  static setTrackGains(music: number, effects: number) {
    this.musicVolume = music;
    this.effectsVolume = effects;
    this.syncTrackGains();
  }

  /**
   * The page went away or came back. Ramps both tracks rather than cutting
   * them, and never unlocks audio on its own: a tab that was never clicked
   * comes back as quiet as it left.
   */
  static setBackgrounded(backgrounded: boolean) {
    if (this.backgrounded === backgrounded) return;
    this.backgrounded = backgrounded;

    fadeFrom = backgroundMix;
    fadeStart = performance.now();
    if (fading) return;

    fading = true;
    stepBackgroundFade();
  }

  static stopAllMusic() {
    this.fadeOutMusic();
  }
}
