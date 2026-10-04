import { reaction } from 'mobx';
import { sound } from '.';
import { pregameLoad } from '../loading/pregameLoad';

/**
 * `MUSIC_LOGIN_THEME`: `LoginScene::Init` starts `login_theme.mp3`
 * (Scenes/LoginScene.cpp:300) and `LoadingScene` stops it on the way into
 * the world (LoadingScene.cpp:83). The server list, the login window and the
 * character select all sit in that one scene, so the theme spans the three
 * pages; the per-map music takes over once the world loads
 * (`controllers/sound/music.ts`).
 *
 * The browser only unlocks audio on the first gesture, so the theme is asked
 * for again on a short timer until `sound.unlocked` is true.
 *
 * A consumer of the sound layer, kept beside the UI state it reacts to.
 */

const LOGIN_THEME = 'Music/login_theme';
/** How often to retry while the audio context is still locked. */
const RETRY_MS = 500;

/** Which page is up, read through `installLoginMusic`'s port (the app owns the pages). */
let inMenus = (): boolean => false;
let onPreloader = (): boolean => false;

/** The theme's screens: the three menus, and the worlds page once its card is open. */
function wanted(): boolean {
  return inMenus() || (onPreloader() && pregameLoad.worldsOpen);
}

let retry: number | null = null;

function stopRetry(): void {
  if (retry !== null) window.clearInterval(retry);
  retry = null;
}

function tryPlay(): void {
  if (!wanted()) {
    stopRetry();
    return;
  }
  if (!sound.unlocked) return;
  sound.playMusic(LOGIN_THEME);
  stopRetry();
}

/**
 * Call once from app/boot.tsx after `sound.init`. `menus`: the server list, login or character
 * page is up; `preloader`: the preloader page is.
 */
export function installLoginMusic(menus: () => boolean, preloader: () => boolean): void {
  inMenus = menus;
  onPreloader = preloader;
  reaction(
    wanted,
    on => {
      if (on) {
        stopRetry();
        tryPlay();
        if (retry === null && !sound.unlocked) {
          retry = window.setInterval(tryPlay, RETRY_MS);
        }
      } else {
        stopRetry();
        if (sound.currentMusic === LOGIN_THEME) sound.stopMusic();
      }
    },
    { fireImmediately: true }
  );
}
