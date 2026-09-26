import {
  CAMERA_FOV_MAX_DEG,
  CAMERA_FOV_MIN_DEG,
} from '../../../camera/recipes';
import {
  BRIGHTNESS_MAX,
  BRIGHTNESS_MIN,
  TONE_MAPPER_MAX,
  UI_SCALE_MAX,
  uiScaleFactor,
  type GameOptions as GameOptionsType,
} from '../../../common/gameOptions';
import {
  KEY_ACTION_LABEL_KEYS,
  type KeyAction,
} from '../../../common/keyBindings';
import {
  ITEM_EFFECT_MODE_LABEL_KEYS,
  ITEM_EFFECT_MODE_MAX,
} from '../../../common/itemEffectMode';
import {
  COMPARE_TOOLTIP_LABEL_KEYS,
  COMPARE_TOOLTIP_MAX,
} from '../../../common/itemCompare';
import {
  LIGHTING_QUALITY_LABEL_KEYS,
  LIGHTING_QUALITY_MAX,
  MSAA_MAX,
  MSAA_STEPS,
} from '../../../common/lightingQuality';
import {
  ANISOTROPY_MAX,
  ANISOTROPY_STEPS,
  MATERIAL_DETAIL_MAX,
  MATERIAL_QUALITY_LABEL_KEYS,
  MATERIAL_QUALITY_MAX,
} from '../../../common/materialQuality';
import {
  ANIME_HALFTONE_SCALE_MAX,
  ANIME_HALFTONE_SCALE_MIN,
  ANIME_SLIDER_MAX,
  LINE_PLACEMENT_LABEL_KEYS,
  LINE_PLACEMENT_MAX,
  LINE_STRENGTH_MAX,
  LINE_STRENGTH_MIN,
  LINE_WIDTH_MAX,
  LINE_WIDTH_MIN,
  OUTLINE_MODE_LABEL_KEYS,
  OUTLINE_MODE_MAX,
  RENDERING_STYLE_LABEL_KEYS,
  RENDERING_STYLE_MAX,
  SHADE_STEPS_MAX,
  SHADE_STEPS_MIN,
  STYLE_STRENGTH_MAX,
  STYLE_STRENGTH_MIN,
} from '../../../common/renderingStyle';
import {
  RENDER_SCALE_STEP_MAX,
  renderScaleForStep,
} from '../../../libs/renderScale';
import { LOOT_ZEN_MAX, lootZenThreshold } from '../../../common/lootFilter';
import { BUS_VOLUME_MAX } from '../../../sound/buses';
import {
  LOW_VITAL_MAX_PERCENT,
  LOW_VITAL_MIN_PERCENT,
} from '../../../common/lowVitals';
import {
  RENDER_DISTANCE_MAX,
  renderDistanceRanges,
} from '../../../common/renderDistance';
import { t, type TextKey } from '../../../i18n';
import {
  NEED_POST,
  NEED_TIER,
  needAbove,
  needOn,
  needStyle,
  type Need,
} from './gating';

export type BoolKey = {
  [K in keyof GameOptionsType]: GameOptionsType[K] extends boolean ? K : never;
}[keyof GameOptionsType];

export type NumberKey = {
  [K in keyof GameOptionsType]: GameOptionsType[K] extends number ? K : never;
}[keyof GameOptionsType];

type RowBase = {
  labelKey: TextKey;
  helpKey: TextKey;
  needs?: Need[];
  /** Sits under the row it belongs to (a filter's kinds, a mixer's buses). */
  indent?: boolean;
  /** Said under the help when a change waits for something. */
  appliesKey?: TextKey;
};

export type ToggleRow = RowBase & { kind: 'toggle'; key: BoolKey };

/**
 * A number the player sets. `slider` is a magnitude on the gauge, `choice`
 * a mode picked with the arrows; both store an index and print `display`.
 */
export type NumberRow = RowBase & {
  kind: 'slider' | 'choice';
  key: NumberKey;
  min?: number;
  max: number;
  display: (value: number) => string;
};

export type KeyRow = { kind: 'key'; action: KeyAction; labelKey: TextKey };

export type ButtonRow = RowBase & {
  kind: 'button';
  id: 'install' | 'resetWindows';
  buttonKey: TextKey;
};

export type WidgetRow = RowBase & {
  kind: 'presets' | 'language' | 'texturePack' | 'fullscreen';
};

export type Row = ToggleRow | NumberRow | KeyRow | ButtonRow | WidgetRow;

export type Section = { titleKey?: TextKey; rows: Row[] };

export type Page = {
  id: string;
  labelKey: TextKey;
  /** What the help strip says with nothing hovered. */
  hintKey?: TextKey;
  sections: Section[];
};

export type Category = { id: string; labelKey: TextKey; pages: Page[] };

/** The option a row writes, when it writes one. */
export function optionKeyOf(row: Row): keyof GameOptionsType | null {
  return row.kind === 'toggle' || row.kind === 'slider' || row.kind === 'choice'
    ? row.key
    : null;
}

export function rowId(row: Row): string {
  switch (row.kind) {
    case 'toggle':
    case 'slider':
    case 'choice':
      return row.key;
    case 'key':
      return `key:${row.action}`;
    case 'button':
      return row.id;
    default:
      return row.kind;
  }
}

export function helpKeyOf(row: Row): TextKey {
  return row.kind === 'key' ? 'options.keyHint' : row.helpKey;
}

const off = (value: number) => (value === 0 ? t('common.off') : `${value}`);
const plain = (value: number) => `${value}`;
const percent = (value: number) => `${value}%`;
const named =
  (keys: readonly TextKey[] | Record<number, TextKey>) => (value: number) => {
    const key = (keys as Record<number, TextKey>)[value];
    return key ? t(key) : `${value}`;
  };
const times = (steps: readonly number[]) => (value: number) =>
  steps[value] > 1 ? `${steps[value]}x` : t('common.off');

const toggle = (
  key: BoolKey,
  extra: Partial<RowBase> = {}
): ToggleRow => ({
  kind: 'toggle',
  key,
  labelKey: `options.${key}` as TextKey,
  helpKey: `options.help.${key}` as TextKey,
  ...extra,
});

const number = (
  kind: 'slider' | 'choice',
  key: NumberKey,
  max: number,
  display: (value: number) => string,
  extra: Partial<RowBase> & { min?: number } = {}
): NumberRow => ({
  kind,
  key,
  max,
  display,
  labelKey: `options.${key}` as TextKey,
  helpKey: `options.help.${key}` as TextKey,
  ...extra,
});

const slider = (
  key: NumberKey,
  max: number,
  display: (value: number) => string,
  extra: Partial<RowBase> & { min?: number } = {}
) => number('slider', key, max, display, extra);

const choice = (
  key: NumberKey,
  max: number,
  display: (value: number) => string,
  extra: Partial<RowBase> & { min?: number } = {}
) => number('choice', key, max, display, extra);

const lootKind = (key: BoolKey): ToggleRow =>
  toggle(key, {
    indent: true,
    helpKey: 'options.help.lootKind',
    needs: [needOn('lootFilter')],
  });

/** The drop-sound kinds reuse the loot filter's names for the same kinds. */
const dropSoundKind = (key: BoolKey, labelKey: TextKey): ToggleRow =>
  toggle(key, {
    indent: true,
    labelKey,
    helpKey: 'options.help.dropSoundKind',
    needs: [needOn('dropSoundFilter')],
  });

const bus = (key: NumberKey): NumberRow =>
  slider(key, BUS_VOLUME_MAX, off, { indent: true });

const grade = (key: NumberKey, needs: Need[]): NumberRow =>
  slider(key, 9, off, { needs });

const TONE_MAPPER_LABEL_KEYS: readonly TextKey[] = [
  'options.toneMapper.none',
  'options.toneMapper.standard',
  'options.toneMapper.aces',
  'options.toneMapper.neutral',
];

/** Windows first, then what a key does in the world. */
const WINDOW_KEYS: readonly KeyAction[] = [
  'inventory',
  'characterInfo',
  'skillList',
  'masterSkills',
  'quests',
  'party',
  'guild',
  'friends',
  'command',
  'warpList',
  'minimap',
  'emoteMenu',
  'muHelperConfig',
  'sessionStats',
  'options',
];

const ACTION_KEYS: readonly KeyAction[] = [
  'targetNearest',
  'replyWhisper',
  'muHelper',
  'repair',
  'sortInventory',
  'hideUi',
  'performanceReadout',
];

const keyRow = (action: KeyAction): KeyRow => ({
  kind: 'key',
  action,
  labelKey: KEY_ACTION_LABEL_KEYS[action],
});

const TIER_STYLE = (cap: 'ramp' | 'outline' | 'dialled' | 'tuned'): Need[] => [
  NEED_TIER,
  needStyle(cap),
];

export const CATEGORIES: Category[] = [
  {
    id: 'game',
    labelKey: 'options.tab.game',
    pages: [
      {
        id: 'general',
        labelKey: 'options.page.general',
        sections: [
          {
            titleKey: 'options.section.items',
            rows: [
              toggle('quickItemActions'),
              toggle('confirmValuableItems'),
              choice('compareTooltips', COMPARE_TOOLTIP_MAX, named(COMPARE_TOOLTIP_LABEL_KEYS)),
            ],
          },
          {
            titleKey: 'options.section.character',
            rows: [toggle('statPointAmounts')],
          },
          {
            titleKey: 'options.section.connection',
            rows: [toggle('autoReconnect')],
          },
        ],
      },
      {
        id: 'loot',
        labelKey: 'options.page.loot',
        sections: [
          {
            rows: [
              toggle('dropTooltips'),
              toggle('lootFilter'),
              lootKind('lootJewels'),
              lootKind('lootExcellent'),
              lootKind('lootAncient'),
              lootKind('lootHighLevel'),
              toggle('lootOther', {
                indent: true,
                needs: [needOn('lootFilter')],
              }),
              slider(
                'lootZen',
                LOOT_ZEN_MAX,
                v => (v === 0 ? t('common.off') : lootZenThreshold(v).toLocaleString()),
                { indent: true, needs: [needOn('lootFilter')] }
              ),
            ],
          },
        ],
      },
      {
        id: 'alerts',
        labelKey: 'options.page.alerts',
        sections: [
          {
            titleKey: 'options.section.chat',
            rows: [toggle('chatTimestamps'), toggle('whisperBeep')],
          },
          {
            titleKey: 'options.section.notices',
            rows: [toggle('slideHelp'), toggle('stateWarnings')],
          },
          {
            titleKey: 'options.section.vitals',
            rows: [
              toggle('lowHealthWarning'),
              slider('lowHealthPercent', LOW_VITAL_MAX_PERCENT, percent, {
                min: LOW_VITAL_MIN_PERCENT,
                indent: true,
                needs: [needOn('lowHealthWarning')],
              }),
              toggle('lowManaWarning'),
              slider('lowManaPercent', LOW_VITAL_MAX_PERCENT, percent, {
                min: LOW_VITAL_MIN_PERCENT,
                indent: true,
                needs: [needOn('lowManaWarning')],
              }),
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'controls',
    labelKey: 'options.tab.controls',
    pages: [
      {
        id: 'camera',
        labelKey: 'options.page.camera',
        sections: [
          {
            titleKey: 'options.section.camera',
            rows: [
              toggle('cameraControl'),
              slider('cameraFov', CAMERA_FOV_MAX_DEG, v => `${v}°`, {
                min: CAMERA_FOV_MIN_DEG,
                needs: [needOn('cameraControl')],
              }),
              toggle('firstPersonBob', { needs: [needOn('cameraControl')] }),
            ],
          },
          {
            titleKey: 'options.section.movement',
            rows: [
              toggle('wsadMovement'),
              toggle('thirdPersonMouseLook', {
                needs: [needOn('wsadMovement'), needOn('cameraControl')],
              }),
            ],
          },
          {
            titleKey: 'options.section.keyboard',
            rows: [toggle('blockBrowserKeys')],
          },
        ],
      },
      {
        id: 'keys',
        labelKey: 'options.page.keys',
        hintKey: 'options.help.keysIdle',
        sections: [
          { titleKey: 'options.section.windows', rows: WINDOW_KEYS.map(keyRow) },
          { titleKey: 'options.section.actions', rows: ACTION_KEYS.map(keyRow) },
        ],
      },
    ],
  },
  {
    id: 'video',
    labelKey: 'options.tab.video',
    pages: [
      {
        id: 'quality',
        labelKey: 'options.section.quality',
        sections: [
          {
            rows: [
              {
                kind: 'presets',
                labelKey: 'options.preset',
                helpKey: 'options.help.presets',
              },
            ],
          },
          {
            titleKey: 'options.section.lightingAndMaterials',
            rows: [
              choice(
                'lightingQuality',
                LIGHTING_QUALITY_MAX,
                named(LIGHTING_QUALITY_LABEL_KEYS),
                { appliesKey: 'options.applies.partlyMapLoad' }
              ),
              choice(
                'materialQuality',
                MATERIAL_QUALITY_MAX,
                named(MATERIAL_QUALITY_LABEL_KEYS)
              ),
              slider('materialDetail', MATERIAL_DETAIL_MAX, off, {
                indent: true,
                needs: [{ kind: 'materials' }],
              }),
              {
                kind: 'texturePack',
                labelKey: 'options.texturePack',
                helpKey: 'options.texturePackHint',
              },
            ],
          },
          {
            titleKey: 'options.section.resolution',
            rows: [
              slider('renderScale', RENDER_SCALE_STEP_MAX, v =>
                `${Math.round(renderScaleForStep(v) * 100)}%`
              ),
              choice('upscale', 1, v => (v > 0 ? 'FSR' : t('common.off')), {
                indent: true,
                needs: [{ kind: 'renderScaled' }],
              }),
              choice('msaa', MSAA_MAX, times(MSAA_STEPS), {
                needs: [NEED_TIER, { kind: 'msaa' }],
              }),
              choice('anisotropy', ANISOTROPY_MAX, times(ANISOTROPY_STEPS), {
                needs: [NEED_TIER],
              }),
            ],
          },
        ],
      },
      {
        id: 'world',
        labelKey: 'options.page.world',
        sections: [
          {
            titleKey: 'options.section.world',
            rows: [
              slider('renderDistance', RENDER_DISTANCE_MAX, v =>
                `${renderDistanceRanges(v).nearby}`
              ),
              slider('grassDensity', 9, off),
              toggle('clouds', { needs: [NEED_TIER] }),
              toggle('weatherEffects'),
              toggle('ambientParticles'),
              toggle('animatedWater', {
                appliesKey: 'options.applies.mapLoad',
              }),
              toggle('advancedEffects', {
                appliesKey: 'options.applies.partlyMapLoad',
              }),
            ],
          },
          {
            titleKey: 'options.section.effects',
            rows: [
              toggle('shadows'),
              toggle('dynamicLights'),
              toggle('monsterEffects'),
              choice(
                'itemEffects',
                ITEM_EFFECT_MODE_MAX,
                named(ITEM_EFFECT_MODE_LABEL_KEYS)
              ),
              slider('effectLevel', 4, v => `${v * 2 + 5}`, {
                indent: true,
                needs: [{ kind: 'itemEffects' }],
              }),
            ],
          },
          {
            titleKey: 'options.section.performance',
            rows: [toggle('propBatching')],
          },
        ],
      },
      {
        id: 'image',
        labelKey: 'options.section.image',
        sections: [
          { rows: [toggle('postProcessing')] },
          {
            titleKey: 'options.section.light',
            rows: [
              choice('toneMapper', TONE_MAPPER_MAX, named(TONE_MAPPER_LABEL_KEYS), {
                needs: [NEED_TIER, NEED_POST],
              }),
              slider(
                'brightness',
                BRIGHTNESS_MAX,
                v => (v > 0 ? `+${v}` : `${v}`),
                { min: BRIGHTNESS_MIN, needs: [NEED_TIER, NEED_POST] }
              ),
              grade('bloom', [NEED_TIER, NEED_POST]),
              grade('glow', [{ kind: 'glow' }]),
              grade('sunShafts', [NEED_TIER, NEED_POST]),
            ],
          },
          {
            titleKey: 'options.section.lens',
            rows: [
              grade('sharpness', [NEED_POST]),
              toggle('fxaa', { needs: [NEED_POST] }),
              grade('filmGrain', [NEED_TIER, NEED_POST]),
              grade('chromatic', [NEED_TIER, NEED_POST]),
              grade('vignette', [NEED_TIER, NEED_POST]),
            ],
          },
        ],
      },
      {
        id: 'style',
        labelKey: 'options.section.style',
        hintKey: 'options.help.styleIdle',
        sections: [
          {
            rows: [
              choice(
                'renderingStyle',
                RENDERING_STYLE_MAX,
                named(RENDERING_STYLE_LABEL_KEYS),
                { needs: [NEED_TIER] }
              ),
              slider('shadeSteps', SHADE_STEPS_MAX, plain, {
                min: SHADE_STEPS_MIN,
                needs: TIER_STYLE('ramp'),
              }),
              slider('styleStrength', STYLE_STRENGTH_MAX, plain, {
                min: STYLE_STRENGTH_MIN,
                needs: TIER_STYLE('dialled'),
              }),
            ],
          },
          {
            titleKey: 'options.section.shading',
            rows: [
              slider('animeShading', ANIME_SLIDER_MAX, plain, {
                needs: TIER_STYLE('tuned'),
              }),
              slider('animeRim', ANIME_SLIDER_MAX, off, {
                needs: TIER_STYLE('tuned'),
              }),
              slider('animeRimWidth', ANIME_SLIDER_MAX, plain, {
                indent: true,
                needs: [...TIER_STYLE('tuned'), needAbove('animeRim')],
              }),
              slider('animeMatcap', ANIME_SLIDER_MAX, off, {
                needs: TIER_STYLE('tuned'),
              }),
              slider('animePaint', ANIME_SLIDER_MAX, off, {
                needs: TIER_STYLE('tuned'),
              }),
              slider('animeHalftone', ANIME_SLIDER_MAX, off, {
                needs: TIER_STYLE('tuned'),
              }),
              slider('animeHalftoneScale', ANIME_HALFTONE_SCALE_MAX, plain, {
                min: ANIME_HALFTONE_SCALE_MIN,
                indent: true,
                needs: [...TIER_STYLE('tuned'), needAbove('animeHalftone')],
              }),
            ],
          },
          {
            titleKey: 'options.section.lines',
            rows: [
              choice('animeOutlineMode', OUTLINE_MODE_MAX, named(OUTLINE_MODE_LABEL_KEYS), {
                needs: TIER_STYLE('tuned'),
              }),
              slider('lineStrength', LINE_STRENGTH_MAX, plain, {
                min: LINE_STRENGTH_MIN,
                needs: [...TIER_STYLE('outline'), { kind: 'outline' }],
              }),
              slider('lineWidth', LINE_WIDTH_MAX, plain, {
                min: LINE_WIDTH_MIN,
                needs: [...TIER_STYLE('outline'), { kind: 'outline' }],
              }),
              choice('linePlacement', LINE_PLACEMENT_MAX, named(LINE_PLACEMENT_LABEL_KEYS), {
                needs: [...TIER_STYLE('outline'), { kind: 'inkLines' }, NEED_POST],
              }),
              toggle('grassOutline', {
                needs: [
                  ...TIER_STYLE('outline'),
                  { kind: 'inkLines' },
                  needAbove('grassDensity'),
                ],
              }),
            ],
          },
          {
            titleKey: 'options.section.effects',
            rows: [
              toggle('animeEffects', {
                needs: [...TIER_STYLE('outline'), { kind: 'inkLines' }, NEED_POST],
              }),
              slider('animeSpeedLines', ANIME_SLIDER_MAX, off, {
                needs: [...TIER_STYLE('tuned'), NEED_POST],
              }),
              slider('animeFilm', ANIME_SLIDER_MAX, off, {
                needs: [...TIER_STYLE('tuned'), NEED_POST],
              }),
              toggle('animeImpacts', { needs: TIER_STYLE('tuned') }),
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'sound',
    labelKey: 'options.tab.sound',
    pages: [
      {
        id: 'volume',
        labelKey: 'options.page.volume',
        sections: [
          {
            titleKey: 'options.section.mixer',
            rows: [
              slider('volume', 9, off),
              slider('musicVolume', BUS_VOLUME_MAX, off),
              slider('effectsVolume', BUS_VOLUME_MAX, off),
              toggle('muteInBackground'),
            ],
          },
          {
            titleKey: 'options.section.sfx',
            rows: [
              bus('combatVolume'),
              bus('monsterVolume'),
              bus('ambientVolume'),
              bus('stepsVolume'),
              bus('dropVolume'),
              bus('uiVolume'),
              bus('instrumentsVolume'),
              toggle('hearInstruments', { indent: true }),
            ],
          },
        ],
      },
      {
        id: 'dropSounds',
        labelKey: 'options.section.dropSounds',
        sections: [
          {
            rows: [
              toggle('dropSoundFilter'),
              dropSoundKind('dropSoundJewels', 'options.lootJewels'),
              dropSoundKind('dropSoundExcellent', 'options.lootExcellent'),
              dropSoundKind('dropSoundAncient', 'options.lootAncient'),
              dropSoundKind('dropSoundHighLevel', 'options.lootHighLevel'),
              dropSoundKind('dropSoundZen', 'common.zen'),
              toggle('dropSoundOther', {
                indent: true,
                labelKey: 'options.lootOther',
                needs: [needOn('dropSoundFilter')],
              }),
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'interface',
    labelKey: 'options.tab.interface',
    pages: [
      {
        id: 'screen',
        labelKey: 'options.page.screen',
        sections: [
          {
            titleKey: 'options.section.windows',
            rows: [
              slider('uiScale', UI_SCALE_MAX, v =>
                `${Math.round(uiScaleFactor(v) * 100)}%`
              ),
              toggle('lockWindows'),
              {
                kind: 'button',
                id: 'resetWindows',
                labelKey: 'options.windowLayout',
                helpKey: 'options.help.resetWindows',
                buttonKey: 'options.reset',
              },
            ],
          },
          {
            titleKey: 'options.section.hud',
            rows: [
              toggle('minimapCorner'),
              toggle('eventTimers'),
              toggle('questTracker'),
              toggle('performanceReadout'),
            ],
          },
          {
            titleKey: 'options.section.display',
            rows: [
              {
                kind: 'fullscreen',
                labelKey: 'options.fullscreen',
                helpKey: 'options.help.fullscreen',
              },
              {
                kind: 'button',
                id: 'install',
                labelKey: 'options.installApp',
                helpKey: 'options.help.install',
                buttonKey: 'options.install',
              },
            ],
          },
        ],
      },
      {
        id: 'language',
        labelKey: 'options.section.language',
        sections: [
          {
            rows: [
              {
                kind: 'language',
                labelKey: 'options.tab.language',
                helpKey: 'options.help.language',
              },
              toggle('englishItemNames', { needs: [{ kind: 'notEnglish' }] }),
            ],
          },
        ],
      },
    ],
  },
];

export const ALL_PAGES: Page[] = CATEGORIES.flatMap(category => category.pages);

export function categoryOf(page: Page): Category {
  return CATEGORIES.find(category => category.pages.includes(page)) ?? CATEGORIES[0];
}

/** The page and row that write an option, for the jump from a greyed row. */
export function findOptionRow(
  key: keyof GameOptionsType | 'language'
): { page: Page; row: Row } | null {
  for (const page of ALL_PAGES) {
    for (const section of page.sections) {
      for (const row of section.rows) {
        if (key === 'language' ? row.kind === 'language' : optionKeyOf(row) === key) {
          return { page, row };
        }
      }
    }
  }
  return null;
}
