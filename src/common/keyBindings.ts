import { makeAutoObservable, runInAction } from 'mobx';
import { LocalStorage } from '../libs/localStorage';
import type { TextKey } from '../i18n';

const KEYS_STORAGE_KEY = 'mu_keys';

/**
 * User-configurable hot keys. Each action maps to a `KeyboardEvent.code`
 * (physical key, so `Backquote` is `º` on a Spanish layout, `~` on a US one).
 * Stored in localStorage; the Options window's Keys tab rebinds them.
 */
export type KeyAction =
  | 'minimap'
  | 'emoteMenu'
  | 'inventory'
  | 'characterInfo'
  | 'party'
  | 'guild'
  | 'friends'
  | 'quests'
  | 'options'
  | 'warpList'
  | 'repair'
  | 'command'
  | 'masterSkills'
  | 'skillList'
  | 'muHelper'
  | 'muHelperConfig'
  | 'hideUi'
  | 'sessionStats'
  | 'sortInventory'
  | 'targetNearest'
  | 'replyWhisper';

export type KeyBindings = Record<KeyAction, string>;

/** What the Keys tab calls each action - text keys, printed with `t()`. */
export const KEY_ACTION_LABEL_KEYS: Record<KeyAction, TextKey> = {
  minimap: 'keys.minimap',
  emoteMenu: 'keys.emoteMenu',
  inventory: 'keys.inventory',
  characterInfo: 'keys.characterInfo',
  party: 'keys.party',
  guild: 'keys.guild',
  friends: 'keys.friends',
  quests: 'keys.quests',
  options: 'keys.options',
  warpList: 'keys.warpList',
  repair: 'keys.repair',
  command: 'keys.command',
  masterSkills: 'keys.masterSkills',
  skillList: 'keys.skillList',
  muHelper: 'keys.muHelper',
  muHelperConfig: 'keys.muHelperConfig',
  hideUi: 'keys.hideUi',
  sessionStats: 'keys.sessionStats',
  sortInventory: 'keys.sortInventory',
  targetNearest: 'keys.targetNearest',
  replyWhisper: 'keys.replyWhisper',
};

export const KEY_ACTIONS = Object.keys(KEY_ACTION_LABEL_KEYS) as KeyAction[];

const DEFAULTS: KeyBindings = {
  minimap: 'Tab',
  emoteMenu: 'Backquote',
  inventory: 'KeyI',
  characterInfo: 'KeyC',
  party: 'KeyP',
  guild: 'KeyG',
  friends: 'KeyF',
  quests: 'KeyT',
  options: 'KeyO',
  warpList: 'KeyM',
  repair: 'KeyL',
  // `GetAsyncKeyState('D')` (ZzzInterface.cpp:9098).
  command: 'KeyD',
  masterSkills: 'KeyA',
  skillList: 'KeyK',
  // The retail client's Home key; this C++ port only has the Start / Stop
  // button on `CNewUIHeroPositionInfo`.
  muHelper: 'Home',
  // The original opens the config from the position panel's button; a key
  // stands in for the panel here.
  muHelperConfig: 'End',
  // No original analog: the arrange run is this client's own.
  hideUi: 'KeyH',
  sessionStats: 'KeyU',
  sortInventory: 'KeyS',
  targetNearest: 'KeyN',
  replyWhisper: 'KeyY',
};

/** Keys that cannot be bound: they already mean something else. */
const RESERVED = new Set([
  'Escape',
  'Enter',
  'NumpadEnter',
  'AltLeft',
  'AltRight',
  'ControlLeft',
  'ControlRight',
  'ShiftLeft',
  'ShiftRight',
  'MetaLeft',
  'MetaRight',
  // Potion bar and skill slots are printed on the bottom bar.
  'KeyQ',
  'KeyW',
  'KeyE',
  'KeyR',
  ...Array.from({ length: 10 }, (_, i) => `Digit${i}`),
  ...Array.from({ length: 10 }, (_, i) => `Numpad${i}`),
]);

export function isReservedKey(code: string): boolean {
  return RESERVED.has(code);
}

type Listener = (bindings: KeyBindings) => void;

const listeners = new Set<Listener>();

/**
 * Whose bindings are live: a character name, or '' for the shared set every
 * character starts from. A Summoner and a Blade Knight want different keys,
 * and before this they fought over one file.
 */
let profile = '';

function storageKeyOf(name: string): string {
  return name ? `${KEYS_STORAGE_KEY}:${name}` : KEYS_STORAGE_KEY;
}

function readStored(name: string): Partial<KeyBindings> | null {
  const stored = LocalStorage.load(storageKeyOf(name));
  if (!stored) return null;
  try {
    return JSON.parse(stored) as Partial<KeyBindings>;
  } catch {
    return null;
  }
}

function load(): KeyBindings {
  // The character's own set if it has one, else the shared one.
  const parsed = (profile ? readStored(profile) : null) ?? readStored('');
  if (!parsed) return { ...DEFAULTS };

  try {
    const loaded = { ...DEFAULTS };
    for (const action of KEY_ACTIONS) {
      const code = parsed[action];
      if (typeof code === 'string' && code && !RESERVED.has(code)) {
        loaded[action] = code;
      }
    }
    return loaded;
  } catch {
    return { ...DEFAULTS };
  }
}

/** The live bindings; observable so the Keys tab re-renders on a rebind. */
export const KeyBindings: KeyBindings = makeAutoObservable(load());

function save(): void {
  LocalStorage.save(storageKeyOf(profile), JSON.stringify(KeyBindings));
  for (const listener of listeners) listener(KeyBindings);
}

/**
 * Switch to a character's own bindings (or back to the shared set with an
 * empty name). Called when a character enters the world.
 */
export function setKeyProfile(name: string): void {
  if (profile === name) return;
  profile = name;
  runInAction(() => Object.assign(KeyBindings, load()));
  for (const listener of listeners) listener(KeyBindings);
}

/** The character whose bindings are live, '' for the shared set. */
export function keyProfile(): string {
  return profile;
}

/** The code bound to `action`. */
export function keyFor(action: KeyAction): string {
  return KeyBindings[action];
}

/** Whether `code` is the key bound to `action`. */
export function isKey(action: KeyAction, code: string): boolean {
  return KeyBindings[action] === code;
}

/** The action `code` is bound to, if any. */
export function actionOfKey(code: string): KeyAction | null {
  for (const action of KEY_ACTIONS) {
    if (KeyBindings[action] === code) return action;
  }
  return null;
}

/**
 * Binds `code` to `action`. Another action already on that key is swapped
 * onto the old key so no action is left without one. Returns false when the
 * key is reserved.
 */
export function setKeyBinding(action: KeyAction, code: string): boolean {
  if (RESERVED.has(code)) return false;
  const previous = KeyBindings[action];
  if (previous === code) return true;

  const other = actionOfKey(code);
  runInAction(() => {
    if (other) KeyBindings[other] = previous;
    KeyBindings[action] = code;
  });

  save();
  return true;
}

export function resetKeyBindings(): void {
  runInAction(() => Object.assign(KeyBindings, DEFAULTS));
  save();
}

export function onKeyBindingsChanged(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Set while the Options window waits for the next key press to rebind; the
 * keyboard system stops broadcasting hot keys meanwhile.
 */
let capturing = false;

export function isCapturingKey(): boolean {
  return capturing;
}

export function setCapturingKey(value: boolean): void {
  capturing = value;
}

const CODE_LABELS: Record<string, string> = {
  Backquote: '` / º',
  Tab: 'Tab',
  Space: 'Space',
  Minus: '-',
  Equal: '=',
  BracketLeft: '[',
  BracketRight: ']',
  Backslash: '\\',
  Semicolon: ';',
  Quote: "'",
  Comma: ',',
  Period: '.',
  Slash: '/',
  Backspace: 'Backspace',
  Delete: 'Del',
  Insert: 'Ins',
  Home: 'Home',
  End: 'End',
  PageUp: 'PgUp',
  PageDown: 'PgDn',
  CapsLock: 'Caps',
  IntlBackslash: '< >',
  NumpadAdd: 'Num +',
  NumpadSubtract: 'Num -',
  NumpadMultiply: 'Num *',
  NumpadDivide: 'Num /',
  NumpadDecimal: 'Num .',
};

/** Short, human-readable name of a `KeyboardEvent.code`. */
export function keyLabel(code: string): string {
  if (CODE_LABELS[code]) return CODE_LABELS[code];
  const letter = /^Key([A-Z])$/.exec(code);
  if (letter) return letter[1];
  const arrow = /^Arrow(\w+)$/.exec(code);
  if (arrow) return arrow[1];
  return code;
}
