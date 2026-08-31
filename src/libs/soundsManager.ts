import '@babylonjs/core/Audio/audioSceneComponent';
import { Sound } from '@babylonjs/core/Audio/sound';
import { SoundTrack } from '@babylonjs/core/Audio/soundTrack';
import { Engine, PointerEventTypes, type Scene } from './babylon/exports';
import { isMusicKey, soundUrl, type Sounds } from '../sound/recipes';
import { ENABLE_BG_MUSIC } from '../consts';
import { LocalStorage } from './localStorage';

/**
 * The mixer: two Babylon `SoundTrack`s (music / effects), one `Sound` per
 * catalogue key, created on first use. Entries in `src/sound/` decide *what*
 * plays; this only knows how to play a key.
 *
 * Music keys are created `streaming` (an `<audio>` element feeding the
 * context) so a 2 MB track is never decoded into a 30 MB buffer, and always
 * `loop`. Effects are decoded buffers, evicted when they have not been asked
 * for on the last `EVICT_AFTER_MAPS` maps (`evictStale`, from `sound.reset`).
 */

const getSoundUrls = (key: Sounds) => soundUrl(key);

export const MUSIC_TRACK_ID = 1000;
export const SOUND_TRACK_ID = 1001;

/** Seconds a track fades out under the next one (and the next fades in). */
export const MUSIC_CROSSFADE_SECONDS = 0.5;

/** Decoded effects unused for this many map changes are dropped. */
const EVICT_AFTER_MAPS = 2;

/** `localStorage` key of the per-track gains (`{ music, effects }`). */
const VOLUME_KEY = 'mu_audio';

/** The original's slider curve: level 0…9 → gain `level / 10` (SceneCommon.cpp:220-234). */
export const gainForLevel = (level: number): number =>
  Math.max(0, Math.min(1, level / 10));

const sounds = new Map<Sounds, Sound>();

/** Map epoch a buffer was last asked for, for `evictStale`. */
const lastUsed = new Map<Sounds, number>();
let mapEpoch = 0;

/**
 * Independent looping instances of a buffer, keyed `${key}#${slot}` — the
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

type StoredVolumes = { music?: number; effects?: number };

function loadStoredVolumes(): StoredVolumes | null {
  const raw = LocalStorage.load(VOLUME_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredVolumes;
  } catch {
    return null;
  }
}

export class SoundsManager {
  static musicVolume = 0.5;
  static effectsVolume = 0.5;

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
   * Boot the tracks. `defaultGain` is the options slider's level as a gain;
   * a per-track gain stored by `setMusicVolume` / `setEffectsVolume` wins
   * over it.
   *
   * A track's gain node only exists once its audio graph is built, which
   * Babylon does on the first `addSound` — `setVolume` before that is a
   * no-op, and the constructor option is skipped when it is 0 (falsy). So
   * the gains are handed to the constructor for the common case AND
   * re-applied by `syncTrackGains` after every sound is added.
   */
  static initializeSounds(scene: Scene, defaultGain = this.musicVolume) {
    this.scene = scene;

    const stored = loadStoredVolumes();
    this.musicVolume = stored?.music ?? defaultGain;
    this.effectsVolume = stored?.effects ?? defaultGain;

    if (this.musicTrack) {
      this.musicTrack.dispose();
    }
    this.musicTrack = new SoundTrack(scene, {
      volume: ENABLE_BG_MUSIC ? this.musicVolume : 0,
    });
    this.musicTrack.id = MUSIC_TRACK_ID;

    if (this.effectsTrack) {
      this.effectsTrack.dispose();
    }
    this.effectsTrack = new SoundTrack(scene, { volume: this.effectsVolume });
    this.effectsTrack.id = SOUND_TRACK_ID;
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
    this.musicTrack?.setVolume(ENABLE_BG_MUSIC ? this.musicVolume : 0);
    this.effectsTrack?.setVolume(this.effectsVolume);
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

  /** Stop one buffer (a bed, a track, a loop) — a real stop, not a pause. */
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

  private static persistVolumes() {
    LocalStorage.save(
      VOLUME_KEY,
      JSON.stringify({ music: this.musicVolume, effects: this.effectsVolume })
    );
  }

  /** Music track gain, 0…1, applied now and remembered (respects the ENABLE_BG_MUSIC kill switch). */
  static setMusicVolume(volume: number) {
    this.musicVolume = volume;
    this.musicTrack?.setVolume(ENABLE_BG_MUSIC ? volume : 0);
    this.persistVolumes();
  }

  /** Effects track gain, 0…1, applied now and remembered. */
  static setEffectsVolume(volume: number) {
    this.effectsVolume = volume;
    this.effectsTrack?.setVolume(volume);
    this.persistVolumes();
  }

  /**
   * The options slider (one level for both tracks, as the original). It
   * replaces whatever per-track gains were stored: the slider is the one
   * control the player can see.
   */
  static setVolumeLevel(level: number) {
    const gain = gainForLevel(level);
    this.musicVolume = gain;
    this.effectsVolume = gain;
    this.musicTrack?.setVolume(ENABLE_BG_MUSIC ? gain : 0);
    this.effectsTrack?.setVolume(gain);
    LocalStorage.delete(VOLUME_KEY);
  }

  static stopAllMusic() {
    this.fadeOutMusic();
  }
}
