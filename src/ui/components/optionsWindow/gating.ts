import {
  GameOptions,
  type GameOptions as GameOptionsType,
} from '../../../common/gameOptions';
import {
  LIGHTING_QUALITY_LABEL_KEYS,
} from '../../../common/lightingQuality';
import { MATERIAL_QUALITY_LABEL_KEYS } from '../../../common/materialQuality';
import { ITEM_EFFECT_MODE_LABEL_KEYS } from '../../../common/itemEffectMode';
import {
  OUTLINE_MODE_LABEL_KEYS,
  RENDERING_STYLES,
  RENDERING_STYLE_LABEL_KEYS,
  hullOutlineActive,
  inkLinesActive,
  renderingStyle,
  type RenderingStyle,
} from '../../../common/renderingStyle';
import { i18n, t, type TextKey } from '../../../i18n';

type BoolKey = {
  [K in keyof GameOptionsType]: GameOptionsType[K] extends boolean ? K : never;
}[keyof GameOptionsType];

type NumberKey = {
  [K in keyof GameOptionsType]: GameOptionsType[K] extends number ? K : never;
}[keyof GameOptionsType];

type StyleCap = 'ramp' | 'outline' | 'dialled' | 'tuned';

/**
 * Something a row needs before it changes anything on screen. Each one was
 * traced to the code that reads the value, so a greyed row is always a row
 * that does nothing right now.
 */
export type Need =
  | { kind: 'on'; key: BoolKey }
  | { kind: 'above'; key: NumberKey }
  | { kind: 'tier' }
  | { kind: 'style'; cap: StyleCap }
  /** The screen-space ink pass: Anime 1.0, or 2.0 with Screen-space / Both. */
  | { kind: 'inkLines' }
  /** Any outline at all: the ink pass (with post or the grass ink), or the hull. */
  | { kind: 'outline' }
  | { kind: 'renderScaled' }
  | { kind: 'materials' }
  | { kind: 'itemEffects' }
  /** The item halo still follows Glow with post off, on Both / Improved. */
  | { kind: 'glow' }
  /** The FSR entry pass carries the samples when post is off. */
  | { kind: 'msaa' }
  | { kind: 'notEnglish' };

export const needOn = (key: BoolKey): Need => ({ kind: 'on', key });
export const needAbove = (key: NumberKey): Need => ({ kind: 'above', key });
export const NEED_TIER: Need = { kind: 'tier' };
export const NEED_POST: Need = needOn('postProcessing');
export const needStyle = (cap: StyleCap): Need => ({ kind: 'style', cap });

/** Why a row does nothing, and which row would change that. */
export type Blocker = {
  text: TextKey;
  params: Record<string, string>;
  /** The option that unlocks the row; clicking the greyed row goes there. */
  target: keyof GameOptionsType | 'language' | null;
};

/** The controlling rows, as the reasons name them. */
const CONTROL_LABEL: Partial<Record<keyof GameOptionsType, TextKey>> = {
  postProcessing: 'options.postProcessing',
  lightingQuality: 'options.lightingQuality',
  renderingStyle: 'options.renderingStyle',
  animeOutlineMode: 'options.animeOutlineMode',
  cameraControl: 'options.cameraControl',
  wsadMovement: 'options.wsadMovement',
  lowHealthWarning: 'options.lowHealthWarning',
  lowManaWarning: 'options.lowManaWarning',
  lootFilter: 'options.lootFilter',
  dropSoundFilter: 'options.dropSoundFilter',
  renderScale: 'options.renderScale',
  materialQuality: 'options.materialQuality',
  itemEffects: 'options.itemEffects',
  animeRim: 'options.animeRim',
  animeHalftone: 'options.animeHalftone',
  grassDensity: 'options.grassDensity',
};

const label = (key: keyof GameOptionsType): string => {
  const text = CONTROL_LABEL[key];
  return text ? t(text) : key;
};

const anyOf = (keys: readonly TextKey[]): string =>
  keys.map(key => t(key)).join(' / ');

const turnOn = (key: BoolKey): Blocker => ({
  text: 'options.needs.on',
  params: { option: label(key) },
  target: key,
});

const setTo = (
  key: keyof GameOptionsType,
  values: readonly TextKey[]
): Blocker => ({
  text: 'options.needs.value',
  params: { option: label(key), value: anyOf(values) },
  target: key,
});

const stylesWith = (cap: StyleCap): TextKey[] =>
  RENDERING_STYLES.flatMap((style, i) =>
    style?.[cap] ? [RENDERING_STYLE_LABEL_KEYS[i]] : []
  );

const hasCap = (style: RenderingStyle | null, cap: StyleCap): boolean =>
  style?.[cap] === true;

function blockerOfNeed(need: Need): Blocker | null {
  switch (need.kind) {
    case 'on':
      return GameOptions[need.key] ? null : turnOn(need.key);

    case 'above':
      return GameOptions[need.key] > 0
        ? null
        : {
            text: 'options.needs.raise',
            params: { option: label(need.key) },
            target: need.key,
          };

    case 'tier':
      return GameOptions.lightingQuality >= 1
        ? null
        : setTo('lightingQuality', LIGHTING_QUALITY_LABEL_KEYS.slice(1));

    case 'style':
      return hasCap(renderingStyle(), need.cap)
        ? null
        : setTo('renderingStyle', stylesWith(need.cap));

    case 'inkLines':
      return inkLinesActive()
        ? null
        : setTo('animeOutlineMode', [
            OUTLINE_MODE_LABEL_KEYS[1],
            OUTLINE_MODE_LABEL_KEYS[3],
          ]);

    case 'outline': {
      if (hullOutlineActive()) return null;
      if (!inkLinesActive()) {
        return setTo('animeOutlineMode', OUTLINE_MODE_LABEL_KEYS.slice(1));
      }
      // Ink only: the pass needs post, the grass ink does not.
      return GameOptions.postProcessing || GameOptions.grassOutline
        ? null
        : turnOn('postProcessing');
    }

    case 'renderScaled':
      return GameOptions.renderScale > 0
        ? null
        : {
            text: 'options.needs.lower',
            params: { option: label('renderScale'), value: '100%' },
            target: 'renderScale',
          };

    case 'materials':
      return GameOptions.materialQuality >= 1
        ? null
        : setTo('materialQuality', MATERIAL_QUALITY_LABEL_KEYS.slice(1));

    case 'itemEffects':
      return GameOptions.itemEffects !== 0
        ? null
        : setTo('itemEffects', [1, 2, 3].map(i => ITEM_EFFECT_MODE_LABEL_KEYS[i]));

    case 'glow':
      return GameOptions.postProcessing ||
        GameOptions.itemEffects === 2 ||
        GameOptions.itemEffects === 3
        ? null
        : turnOn('postProcessing');

    case 'msaa':
      return GameOptions.postProcessing ||
        (GameOptions.upscale > 0 && GameOptions.renderScale > 0)
        ? null
        : turnOn('postProcessing');

    case 'notEnglish':
      return i18n.current.code !== 'en'
        ? null
        : { text: 'options.needs.english', params: {}, target: 'language' };
  }
}

/** The first thing in the way, or null when the row is live. */
export function blockerOf(needs: readonly Need[] | undefined): Blocker | null {
  if (!needs) return null;

  for (const need of needs) {
    const blocker = blockerOfNeed(need);
    if (blocker) return blocker;
  }

  return null;
}

/**
 * A row that only exists for another rendering style is left off its page
 * rather than greyed: the Style page shows what the chosen style has.
 * Search still finds it, greyed, with its reason.
 */
export function hiddenByStyle(needs: readonly Need[] | undefined): boolean {
  if (!needs) return false;

  const style = renderingStyle();
  return needs.some(need => need.kind === 'style' && !hasCap(style, need.cap));
}
