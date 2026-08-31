import soundFiles from './recipes.json';
import { resolveUrlToDataFolder } from '../common/resolveUrlToDataFolder';

/**
 * Pure data shared by every sound entry: the sound catalogue. `recipes.json`
 * maps a sound key (`Sound/eBow`, `Music/Devias`) to its file under the data
 * folder; the key set is the `Sounds` union every entry and consumer types
 * against. Nothing here plays anything — the mixer
 * (`libs/soundsManager.ts`) turns a key into a Babylon `Sound`.
 */
export const SOUND_FILES: Readonly<Record<string, string>> = soundFiles;

/** Every sound the client can ask for, by key. */
export type Sounds = keyof typeof soundFiles;

/** Keys the mixer routes to the music track instead of the effects track. */
const MUSIC_PREFIX = 'Music/';

/** All catalogue keys, for the mixer's eager preload. */
export const SOUND_KEYS: readonly Sounds[] = Object.keys(
  soundFiles
) as Sounds[];

/** Resolved URL of a sound's file. */
export function soundUrl(key: Sounds): string {
  return resolveUrlToDataFolder(soundFiles[key]);
}

/** Whether a key is a music track (`Music/…`) rather than an effect. */
export function isMusicKey(key: Sounds): boolean {
  return key.startsWith(MUSIC_PREFIX);
}
