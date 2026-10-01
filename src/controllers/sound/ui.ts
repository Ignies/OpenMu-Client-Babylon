import type { SoundBus } from './buses';
import type { Sounds } from './recipes';
import type { SoundLayer } from './layer';
import { playSfx } from './listener';

/**
 * Interface sounds (DSPlaySound.h: SOUND_CLICK01, SOUND_ERROR01,
 * SOUND_INTERFACE01, SOUND_GET_ITEM01, SOUND_DROP_ITEM01, SOUND_DROP_GOLD01,
 * SOUND_DRINK01, SOUND_EAT_APPLE01, SOUND_JEWEL01/02, SOUND_LEVEL_UP,
 * SOUND_MENU01, SOUND_REPAIR, SOUND_WHISPER, SOUND_FRIEND_CHAT_ALERT,
 * SOUND_CHANGE_UP, SOUND_KUNDUN_ITEM_SOUND).
 *
 * Driven by: the UI (`uiClick`, `playUiSound`). Command-only: no per-frame
 * state.
 * Read by: nothing - it only plays.
 */

// ---- 1. tuning -------------------------------------------------------------

/** Every sound in here is the interface talking back (`sound/buses.ts`). */
export const UI_BUS: SoundBus = 'ui';

/** Interface sound → catalogue key. Data, so callers name the intent. */
export const UI_SOUNDS = {
  click: 'Sound/iButtonClick',
  error: 'Sound/iButtonError',
  window: 'Sound/iCreateWindow',
  menuMove: 'Sound/iButtonMove',
  getItem: 'Sound/pGetItem',
  dropItem: 'Sound/pDropItem',
  dropMoney: 'Sound/pDropMoney',
  drink: 'Sound/pDrink',
  eatApple: 'Sound/pEatApple',
  jewel: 'Sound/eGem',
  gemstone: 'Sound/Jewel_Sound',
  levelUp: 'Sound/pLevelUp',
  repair: 'Sound/iRepair',
  whisper: 'Sound/iWhisper',
  chatAlert: 'Sound/iFMSGAlert',
  changeUp: 'Sound/nMalonSkillMaster',
  kundunItem: 'Sound/kundunitem',
  mix: 'Sound/eMix',
  mixFailed: 'Sound/eBreak',
  duelWindow: 'Sound/iDuel_Window',
  duelStart: 'Sound/iDuelStart',
  // The cash shop's own, not the original client's, so the catalogue's only
  // non-.ogg files: Babylon's end-of-string extension check takes .wav and .mp3.
  coin: 'Sound/coin',
  win: 'Sound/win',
} as const satisfies Record<string, Sounds>;

export type UiSound = keyof typeof UI_SOUNDS;
/** Sound key behind each interface sound, for callers that position it. */
export const UI_SOUND_KEYS: Record<UiSound, Sounds> = UI_SOUNDS;

/**
 * `LoadWaveFile` channel counts for the sounds that can arrive in bursts
 * (one alert per chat line, one level-up or class change per character in
 * view).
 */
const UI_CHANNELS: Partial<Record<UiSound, number>> = {
  chatAlert: 1,
  changeUp: 1,
  levelUp: 1,
};

/** Item group of the potions, the apple and the jewels (`ITEM_POTION`). */
const POTION_GROUP = 14;

// ---- 2. state + commands ---------------------------------------------------
// One-shots: nothing to hold between frames.

export function playUiSound(kind: UiSound): void {
  playSfx(UI_SOUNDS[kind], null, { bus: UI_BUS, channels: UI_CHANNELS[kind] });
}

/**
 * The noise of using an item (`TryConsumeItem`,
 * NewUIInventoryActionController.cpp:634-652): the apple crunches, the
 * potions 14/1-9 and 14/35-40 gulp, anything else is used in silence.
 */
export function consumeSound(group: number, num: number): UiSound | null {
  if (group !== POTION_GROUP) return null;
  if (num === 0) return 'eatApple';
  if (num <= 9 || (num >= 35 && num <= 40)) return 'drink';
  return null;
}

/**
 * The item a jewel or a combination just changed (`ReceiveModifyItem`,
 * WSclient.cpp:6395-6406): a Lost Map (14/28) or 14/111 plays the Kundun
 * chime, anything else the jewel. The original's silent gamble-shop branch
 * has no counterpart: OpenMU never opens that window.
 */
export function upgradedItemSound(group: number, num: number): UiSound {
  if (group === POTION_GROUP && (num === 28 || num === 111)) return 'kundunItem';
  return 'jewel';
}

/** `onClick` wrapper for interface buttons (Button.cpp:134 SOUND_CLICK01). */
export function uiClick<T extends unknown[]>(
  handler?: (...args: T) => void
): (...args: T) => void {
  return (...args: T) => {
    playUiSound('click');
    handler?.(...args);
  };
}

// ---- 3. the layer ----------------------------------------------------------

export const uiLayer: SoundLayer = { name: 'ui' };
