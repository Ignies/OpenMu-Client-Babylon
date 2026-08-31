import { reaction } from 'mobx';
import { Store, UIState } from '../store';
import { sound } from '../sound';

/**
 * `MUSIC_LOGIN_THEME`: `LoginScene::Init` starts `login_theme.mp3`
 * (Scenes/LoginScene.cpp:300) and `LoadingScene` stops it on the way into
 * the world (LoadingScene.cpp:83). The server list, the login window and the
 * character select all sit in that one scene, so the theme spans the three
 * pages; the per-map music takes over once the world loads
 * (`sound/music.ts`).
 *
 * The browser only unlocks audio on the first gesture, so the theme is asked
 * for again on a short timer until `sound.unlocked` is true.
 *
 * A consumer of the sound layer, kept beside the UI state it reacts to.
 */

const LOGIN_THEME = 'Music/login_theme';
/** How often to retry while the audio context is still locked. */
const RETRY_MS = 500;

const MENU_STATES = new Set([UIState.Servers, UIState.Login, UIState.Characters]);

let retry: number | null = null;

function stopRetry(): void {
  if (retry !== null) window.clearInterval(retry);
  retry = null;
}

function tryPlay(): void {
  if (!MENU_STATES.has(Store.uiState)) {
    stopRetry();
    return;
  }
  if (!sound.unlocked) return;
  sound.playMusic(LOGIN_THEME);
  stopRetry();
}

/** Call once from main.tsx after `sound.init`. */
export function installLoginMusic(): void {
  reaction(
    () => Store.uiState,
    state => {
      if (MENU_STATES.has(state)) {
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
