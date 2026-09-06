import { uiClick } from '../../../libs/sfx';
import './style.less';
import { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { Store } from '../../../store';
import { useEventBus } from '../../../hooks/useEventBus';
import { MuSpriteFrame } from '../muSprite';
import { MuButton } from '../muButton';
import { MuResizeGrip, useWindowChrome } from '../muWindow/useWindowChrome';
import { TEXT_COLOR } from '../../pages/serversPage/layout';
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
  GameOptions,
  setGameOption,
  type GameOptions as GameOptionsType,
} from '../../../common/gameOptions';
import { invalidateShadowState } from '../../../common/objectShadow';
import {
  KEY_ACTIONS,
  KEY_ACTION_LABEL_KEYS,
  KeyBindings,
  isKey,
  isReservedKey,
  keyLabel,
  resetKeyBindings,
  setCapturingKey,
  setKeyBinding,
  type KeyAction,
} from '../../../common/keyBindings';
import {
  ITEM_EFFECT_MODE_LABEL_KEYS,
  ITEM_EFFECT_MODE_MAX,
} from '../../../common/itemEffectMode';
import {
  LIGHTING_QUALITY_LABEL_KEYS,
  LIGHTING_QUALITY_MAX,
} from '../../../common/lightingQuality';
import {
  MATERIAL_QUALITY_LABEL_KEYS,
  MATERIAL_DETAIL_MAX,
  MATERIAL_QUALITY_MAX,
} from '../../../common/materialQuality';
import { LOOT_ZEN_MAX, lootZenThreshold } from '../../../common/lootFilter';
import {
  RENDER_DISTANCE_MAX,
  renderDistanceRanges,
} from '../../../common/renderDistance';
import { MuWindows } from '../muWindow/windowState';
import { t, type TextKey } from '../../../i18n';
import { LanguageSelect } from './languageSelect';
import {
  TIER_PRESETS,
  TIER_PRESET_LABEL_KEYS,
  activeTierPreset,
  applyTierPreset,
} from './presets';

const WINDOW_ID = 'options';

/** The tone mapper names, as text keys - the slider prints `t()` of these. */
const TONE_MAPPER_LABEL_KEYS: readonly TextKey[] = [
  'options.toneMapper.none',
  'options.toneMapper.standard',
  'options.toneMapper.aces',
  'options.toneMapper.neutral',
];

const ART_WIDTH = 213;

const WIN_WIDTH = ART_WIDTH * 2;
const COLUMN_WIDTH = 180;
const COLUMN_X = [28, 28 + COLUMN_WIDTH + 30];

const TOP_HEIGHT = 65;
const BOTTOM_HEIGHT = 43;
const SIDE_TILE_HEIGHT = 8;

const CHECK_SIZE = 16;

const CONTENT_TOP = TOP_HEIGHT + 14;

const SECTION_HEADER_H = 24;
const CHECK_ROW_H = 24;
const SLIDER_ROW_H = 40;
const KEY_ROW_H = 24;
const BUTTON_ROW_H = 30;
/** Label plus the row of tier plates under it. */
const PRESET_ROW_H = 40;
const PRESET_GAP = 4;
/** Label plus the closed selector plate under it. */
const LANGUAGE_ROW_H = 30;
const KEY_BOX_WIDTH = 64;
const KEY_BOX_HEIGHT = 18;
const SECTION_GAP = 16;

const CLOSE_WIDTH = 108;
const CLOSE_HEIGHT = 30;

const SLIDER_WIDTH = 98;
const SLIDER_HEIGHT = 13;
/** The value plate reaches past the slider: 'Tone mapper' + 'Standard' overrun 98. */
const VALUE_WIDTH = 140;
const THUMB_SIZE = 13;

const GAUGE_INSET_X = 3;
const GAUGE_INSET_Y = 3;
const GAUGE_WIDTH = 95 - GAUGE_INSET_X;
const GAUGE_HEIGHT = 10 - GAUGE_INSET_Y;

type CheckRow = {
  key: keyof GameOptionsType;
  textId: number;
  labelKey: TextKey;
  needsPostProcessing?: boolean;
  /** Dim while the walk keys, which the pointer lock leans on, are off. */
  needsWsadMovement?: boolean;
};

type KeyRow = { action: KeyAction; labelKey: TextKey };

type ButtonRow = { id: string; labelKey: TextKey; onClick: () => void };

/** The language picker: one row, its own widget (`languageSelect.tsx`). */
type LanguageRow = { id: 'language' };

/** The tier presets: one plate per tier (`presets.ts`). */
type PresetRow = { id: 'presets'; labelKey: TextKey };

type Row =
  | ({ kind: 'check' } & CheckRow)
  | ({ kind: 'slider' } & SliderRow)
  | ({ kind: 'key' } & KeyRow)
  | ({ kind: 'button' } & ButtonRow)
  | ({ kind: 'language' } & LanguageRow)
  | ({ kind: 'presets' } & PresetRow);

type Section = {
  titleKey: TextKey;
  rows: Row[];
};

const check = (
  key: keyof GameOptionsType,
  textId: number,
  labelKey: TextKey,
  needsPostProcessing = false
): Row => ({ kind: 'check', key, textId, labelKey, needsPostProcessing });

type SliderRow = {
  key:
    | 'cameraFov'
    | 'volume'
    | 'effectLevel'
    | 'itemEffects'
    | 'lightingQuality'
    | 'materialQuality'
    | 'materialDetail'
    | 'sharpness'
    | 'filmGrain'
    | 'bloom'
    | 'glow'
    | 'chromatic'
    | 'toneMapper'
    | 'brightness'
    | 'vignette'
    | 'lootZen'
    | 'uiScale'
    | 'renderDistance';
  textId: number;
  labelKey: TextKey;
  max: number;
  min?: number;
  display: (value: number) => number | string;
  needsPostProcessing?: boolean;
  /** Bloom and the image-processing pass exist on tiers >= 1 only. */
  needsTier?: boolean;
  /** Dim and lock while the classic framing, not the facade, owns the camera. */
  needsCameraControl?: boolean;
};

const slider = (row: SliderRow): Row => ({ kind: 'slider', ...row });

const keyRow = (action: KeyAction): Row => ({
  kind: 'key',
  action,
  labelKey: KEY_ACTION_LABEL_KEYS[action],
});

const KEY_COLUMN_SPLIT = Math.ceil(KEY_ACTIONS.length / 2);

const gradeSlider = (
  key:
    | 'sharpness'
    | 'filmGrain'
    | 'bloom'
    | 'glow'
    | 'chromatic'
    | 'vignette',
  labelKey: TextKey,
  needsTier: boolean
): Row =>
  slider({
    key,
    textId: -1,
    labelKey,
    max: 9,
    display: v => (v === 0 ? t('common.off') : v),
    needsPostProcessing: true,
    needsTier,
  });

type Tab = {
  id: string;
  labelKey: TextKey;
  columns: Section[][];
};

const TABS: Tab[] = [
  {
    id: 'game',
    labelKey: 'options.tab.game',
    columns: [
      [
        {
          titleKey: 'options.section.gameplay',
          rows: [
            check('autoAttack', 386, 'options.autoAttack'),
            check('whisperBeep', 387, 'options.whisperBeep'),
            check('slideHelp', 919, 'options.slideHelp'),
            check('cameraControl', -1, 'options.cameraControl'),
            slider({
              key: 'cameraFov',
              textId: -1,
              labelKey: 'options.cameraFov',
              min: CAMERA_FOV_MIN_DEG,
              max: CAMERA_FOV_MAX_DEG,
              display: v => `${v}°`,
              needsCameraControl: true,
            }),
            check('wsadMovement', -1, 'options.wsadMovement'),
            {
              kind: 'check',
              key: 'thirdPersonMouseLook',
              textId: -1,
              labelKey: 'options.thirdPersonMouseLook',
              needsWsadMovement: true,
            },
            check('chatTimestamps', -1, 'options.chatTimestamps'),
            check('stateWarnings', -1, 'options.stateWarnings'),
          ],
        },
        {
          titleKey: 'options.section.interface',
          rows: [
            slider({
              key: 'uiScale',
              textId: -1,
              labelKey: 'options.uiScale',
              max: UI_SCALE_MAX,
              display: v => `${Math.round(uiScaleFactor(v) * 100)}%`,
            }),
            check('lockWindows', -1, 'options.lockWindows'),
            check('autoReconnect', -1, 'options.autoReconnect'),
            {
              kind: 'button',
              id: 'reset-windows',
              labelKey: 'options.resetWindows',
              onClick: () => MuWindows.resetAll(),
            },
          ],
        },
        {
          titleKey: 'options.section.language',
          rows: [{ kind: 'language', id: 'language' }],
        },
      ],
      [
        {
          titleKey: 'options.section.sound',
          rows: [
            slider({
              key: 'volume',
              textId: 389,
              labelKey: 'options.volume',
              max: 9,
              display: v => v,
            }),
          ],
        },
        {
          titleKey: 'options.section.performance',
          rows: [
            slider({
              key: 'effectLevel',
              textId: 1840,
              labelKey: 'options.effectLevel',
              max: 4,
              display: v => v * 2 + 5,
            }),
          ],
        },
        {
          titleKey: 'options.section.loot',
          rows: [
            check('lootFilter', -1, 'options.lootFilter'),
            check('lootJewels', -1, 'options.lootJewels'),
            check('lootExcellent', -1, 'options.lootExcellent'),
            check('lootAncient', -1, 'options.lootAncient'),
            check('lootHighLevel', -1, 'options.lootHighLevel'),
            check('lootOther', -1, 'options.lootOther'),
            slider({
              key: 'lootZen',
              textId: -1,
              labelKey: 'options.lootZen',
              max: LOOT_ZEN_MAX,
              display: v => (v === 0 ? t('common.off') : lootZenThreshold(v)),
            }),
          ],
        },
      ],
    ],
  },
  {
    id: 'video',
    labelKey: 'options.tab.video',
    columns: [
      [
        {
          titleKey: 'options.section.quality',
          rows: [
            { kind: 'presets', id: 'presets', labelKey: 'options.preset' },
            slider({
              key: 'lightingQuality',
              textId: -1,
              labelKey: 'options.lightingQuality',
              max: LIGHTING_QUALITY_MAX,
              display: v => t(LIGHTING_QUALITY_LABEL_KEYS[v]) ?? v,
            }),
            slider({
              key: 'materialQuality',
              textId: -1,
              labelKey: 'options.materialQuality',
              max: MATERIAL_QUALITY_MAX,
              display: v => t(MATERIAL_QUALITY_LABEL_KEYS[v]) ?? v,
            }),
            slider({
              key: 'materialDetail',
              textId: -1,
              labelKey: 'options.materialDetail',
              max: MATERIAL_DETAIL_MAX,
              display: v => (v === 0 ? t('common.off') : v),
            }),
          ],
        },
        {
          titleKey: 'options.section.rendering',
          rows: [
            check('shadows', -1, 'options.shadows'),
            check('dynamicLights', -1, 'options.dynamicLights'),
            check('postProcessing', -1, 'options.postProcessing'),
            check('ambientParticles', -1, 'options.ambientParticles'),
            check('weatherEffects', -1, 'options.weatherEffects'),
            check('animatedWater', -1, 'options.animatedWater'),
            check('advancedEffects', -1, 'options.advancedEffects'),
            slider({
              key: 'renderDistance',
              textId: -1,
              labelKey: 'options.renderDistance',
              max: RENDER_DISTANCE_MAX,
              display: v => renderDistanceRanges(v).nearby,
            }),
          ],
        },
        {
          titleKey: 'options.section.items',
          rows: [
            slider({
              key: 'itemEffects',
              textId: -1,
              labelKey: 'options.itemEffects',
              max: ITEM_EFFECT_MODE_MAX,
              display: v => t(ITEM_EFFECT_MODE_LABEL_KEYS[v]) ?? v,
            }),
          ],
        },
      ],
      [
        {
          titleKey: 'options.section.image',
          rows: [
            slider({
              key: 'toneMapper',
              textId: -1,
              labelKey: 'options.toneMapper',
              max: TONE_MAPPER_MAX,
              display: v => t(TONE_MAPPER_LABEL_KEYS[v]) ?? v,
              needsPostProcessing: true,
              needsTier: true,
            }),
            slider({
              key: 'brightness',
              textId: -1,
              labelKey: 'options.brightness',
              min: BRIGHTNESS_MIN,
              max: BRIGHTNESS_MAX,
              display: v =>
                v === 0 ? t('common.off') : v > 0 ? `+${v}` : `-${-v}`,
              needsPostProcessing: true,
              needsTier: true,
            }),
            gradeSlider('bloom', 'options.bloom', true),
            gradeSlider('glow', 'options.glow', false),
            gradeSlider('sharpness', 'options.sharpness', false),
            gradeSlider('filmGrain', 'options.filmGrain', true),
            gradeSlider('chromatic', 'options.chromatic', true),
            gradeSlider('vignette', 'options.vignette', true),
            check('fxaa', -1, 'options.fxaa', true),
          ],
        },
      ],
    ],
  },
  {
    id: 'keys',
    labelKey: 'options.tab.keys',
    columns: [
      [
        {
          titleKey: 'options.section.windows',
          rows: KEY_ACTIONS.slice(0, KEY_COLUMN_SPLIT).map(keyRow),
        },
      ],
      [
        {
          titleKey: 'options.section.actions',
          rows: [
            ...KEY_ACTIONS.slice(KEY_COLUMN_SPLIT).map(keyRow),
            {
              kind: 'button',
              id: 'reset-keys',
              labelKey: 'options.resetKeys',
              onClick: resetKeyBindings,
            },
          ],
        },
      ],
    ],
  },
];

const TAB_HEIGHT = 24;
const TAB_GAP = 4;
const TAB_WIDTH = 96;

function rowHeight(row: Row): number {
  switch (row.kind) {
    case 'check':
      return CHECK_ROW_H;
    case 'key':
      return KEY_ROW_H;
    case 'button':
      return BUTTON_ROW_H;
    case 'language':
      return LANGUAGE_ROW_H;
    case 'presets':
      return PRESET_ROW_H;
    default:
      return SLIDER_ROW_H;
  }
}

function columnHeight(sections: Section[]): number {
  return sections.reduce(
    (total, section) =>
      total +
      SECTION_HEADER_H +
      section.rows.reduce((h, row) => h + rowHeight(row), 0) +
      SECTION_GAP,
    0
  );
}

const CONTENT_HEIGHT = Math.max(
  ...TABS.flatMap(tab => tab.columns.map(columnHeight))
);

const WIN_HEIGHT =
  Math.ceil(
    (CONTENT_TOP + TAB_HEIGHT + 12 + CONTENT_HEIGHT + 20) / SIDE_TILE_HEIGHT
  ) *
    SIDE_TILE_HEIGHT +
  BOTTOM_HEIGHT;

const CLOSE_Y = WIN_HEIGHT - 47;

const TAB_CONTENT_TOP = CONTENT_TOP + TAB_HEIGHT + 12;

const HOT_KEY = 'options';

export const OptionsWindow = observer(() => {
  const [activeTab, setActiveTab] = useState(TABS[0].id);

  // Key being rebound: the next key press goes to it instead of the game.
  const [capturing, setCapturing] = useState<KeyAction | null>(null);

  useEffect(() => {
    setCapturingKey(capturing !== null);
    if (capturing === null) return;

    const onKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopImmediatePropagation();
      if (e.code !== 'Escape' && !isReservedKey(e.code)) {
        setKeyBinding(capturing, e.code);
      }
      setCapturing(null);
    };

    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      setCapturingKey(false);
    };
  }, [capturing]);

  useEventBus('keyPressed', key => {
    if (isKey(HOT_KEY, key)) {
      Store.optionsEnabled = !Store.optionsEnabled;
    }
  });

  // A stack member: Escape reaches it through the window stack (`onClose`).
  const chrome = useWindowChrome(WINDOW_ID, {
    width: WIN_WIDTH,
    height: WIN_HEIGHT,
    onClose: () => {
      Store.optionsEnabled = false;
    },
  });

  useEffect(() => {
    if (!Store.optionsEnabled) setCapturing(null);
  }, [Store.optionsEnabled]);

  if (!Store.optionsEnabled) return null;

  const tab = TABS.find(t => t.id === activeTab) ?? TABS[0];

  const set = <K extends keyof GameOptionsType>(
    key: K,
    value: GameOptionsType[K]
  ) => {
    setGameOption(key, value);

    if (key === 'shadows') {
      // Each ModelObject re-applies its own slots next frame; `shadowSlotActive`
      // already reads GameOptions.shadows.
      invalidateShadowState();
    }
  };

  const close = () => {
    Store.optionsEnabled = false;
  };

  return (
    <div className="options-window-page">
      <div
        ref={chrome.ref as React.Ref<HTMLDivElement>}
        className="options-window"
        style={{
          ...chrome.style,
          position: chrome.anchored ? 'relative' : 'absolute',
          transformOrigin: chrome.anchored ? 'center' : '0 0',
        }}
      >
        {}
        <MuSpriteFrame
          file="op1_stone.OZJ"
          width={WIN_WIDTH - 6}
          height={WIN_HEIGHT - 6}
          style={{
            position: 'absolute',
            left: 3,
            top: 3,
            backgroundRepeat: 'repeat',
          }}
        />
        <MuSpriteFrame
          file="op1_back3.OZJ"
          width={5}
          height={WIN_HEIGHT - TOP_HEIGHT - BOTTOM_HEIGHT}
          style={{
            position: 'absolute',
            left: 0,
            top: TOP_HEIGHT,
            backgroundRepeat: 'repeat-y',
          }}
        />
        <MuSpriteFrame
          file="op1_back4.OZJ"
          width={5}
          height={WIN_HEIGHT - TOP_HEIGHT - BOTTOM_HEIGHT}
          style={{
            position: 'absolute',
            right: 0,
            top: TOP_HEIGHT,
            backgroundRepeat: 'repeat-y',
          }}
        />
        {}
        {[false, true].map(mirrored => (
          <MuSpriteFrame
            key={`top-${mirrored}`}
            file="op2_back1.OZT"
            width={ART_WIDTH}
            height={TOP_HEIGHT}
            style={{
              position: 'absolute',
              left: mirrored ? ART_WIDTH : 0,
              top: 0,
              ...(mirrored && { transform: 'scaleX(-1)' }),
            }}
          />
        ))}
        {[false, true].map(mirrored => (
          <MuSpriteFrame
            key={`bottom-${mirrored}`}
            file="op1_back2.OZT"
            width={ART_WIDTH}
            height={BOTTOM_HEIGHT}
            style={{
              position: 'absolute',
              left: mirrored ? ART_WIDTH : 0,
              bottom: 0,
              ...(mirrored && { transform: 'scaleX(-1)' }),
            }}
          />
        ))}

        {}
        <div
          className="options-title"
          style={{ top: 10, cursor: 'move' }}
          onPointerDown={chrome.onPointerDown}
        >
          {t('options.title')}
        </div>

        {}
        {TABS.map((tab, i) => {
          const stripWidth =
            TABS.length * TAB_WIDTH + (TABS.length - 1) * TAB_GAP;
          const x =
            Math.floor((WIN_WIDTH - stripWidth) / 2) +
            i * (TAB_WIDTH + TAB_GAP);

          return (
            <div
              key={tab.id}
              className={`options-tab${tab.id === activeTab ? ' is-active' : ''}`}
              style={{
                left: x,
                top: CONTENT_TOP,
                width: TAB_WIDTH,
                height: TAB_HEIGHT,
              }}
              onClick={uiClick(() => setActiveTab(tab.id))}
            >
              {t(tab.labelKey)}
            </div>
          );
        })}

        {tab.columns.map((sections, columnIndex) => {
          const x = COLUMN_X[columnIndex];

          let y = TAB_CONTENT_TOP;

          return (
            <div key={columnIndex}>
              {sections.map(section => {
                const headerY = y;
                y += SECTION_HEADER_H;

                const body = section.rows.map(row => {
                  const rowY = y;
                  y += rowHeight(row);

                  if (row.kind === 'check') {
                    const checked = GameOptions[row.key] as boolean;

                    const dim =
                      (row.needsPostProcessing === true &&
                        !GameOptions.postProcessing) ||
                      (row.needsWsadMovement === true &&
                        !GameOptions.wsadMovement);

                    return (
                      <div
                        key={row.key}
                        style={dim ? { opacity: 0.4 } : undefined}
                      >
                        {}
                        <MuSpriteFrame
                          file="op2_ch.OZT"
                          y={checked ? CHECK_SIZE : 0}
                          width={CHECK_SIZE}
                          height={CHECK_SIZE}
                          style={{
                            position: 'absolute',
                            left: x,
                            top: rowY,
                            cursor: 'pointer',
                            pointerEvents: 'auto',
                          }}
                          onClick={uiClick(() => set(row.key, !checked))}
                        />
                        <span
                          className="options-label options-clickable"
                          style={{ left: x + 24, top: rowY + 4 }}
                          onClick={uiClick(() => set(row.key, !checked))}
                        >
                          {t(row.labelKey)}
                        </span>
                      </div>
                    );
                  }

                  if (row.kind === 'key') {
                    const active = capturing === row.action;

                    return (
                      <div key={row.action}>
                        <span
                          className="options-label"
                          style={{ left: x, top: rowY + 4 }}
                        >
                          {t(row.labelKey)}
                        </span>
                        <div
                          className={`options-keybox${active ? ' is-active' : ''}`}
                          style={{
                            left: x + COLUMN_WIDTH - KEY_BOX_WIDTH,
                            top: rowY,
                            width: KEY_BOX_WIDTH,
                            height: KEY_BOX_HEIGHT,
                          }}
                          title={t('options.keyHint')}
                          onClick={uiClick(() =>
                            setCapturing(active ? null : row.action)
                          )}
                        >
                          {active ? '...' : keyLabel(KeyBindings[row.action])}
                        </div>
                      </div>
                    );
                  }

                  if (row.kind === 'button') {
                    return (
                      <div key={row.id}>
                        <MuButton
                          file="op1_b_all.OZT"
                          width={CLOSE_WIDTH}
                          height={CLOSE_HEIGHT}
                          frames={{ up: 0, active: 1, down: 2 }}
                          color={TEXT_COLOR.brightGray}
                          activeColor={TEXT_COLOR.white}
                          label={t(row.labelKey)}
                          onClick={() => {
                            row.onClick();
                            setCapturing(null);
                          }}
                          style={{
                            position: 'absolute',
                            left: x + Math.floor((COLUMN_WIDTH - CLOSE_WIDTH) / 2),
                            top: rowY,
                          }}
                          labelStyle={{
                            fontSize: 11,
                            textShadow: '1px 1px 0 rgba(0,0,0,.85)',
                          }}
                        />
                      </div>
                    );
                  }

                  if (row.kind === 'language') {
                    return (
                      <LanguageSelect
                        key={row.id}
                        left={x}
                        top={rowY}
                        width={COLUMN_WIDTH}
                      />
                    );
                  }

                  if (row.kind === 'presets') {
                    const active = activeTierPreset();
                    const plateWidth = Math.floor(
                      (COLUMN_WIDTH - PRESET_GAP * (TIER_PRESETS.length - 1)) /
                        TIER_PRESETS.length
                    );

                    return (
                      <div key={row.id}>
                        <span
                          className="options-label"
                          style={{ left: x, top: rowY }}
                        >
                          {t(row.labelKey)}
                        </span>
                        {TIER_PRESETS.map((preset, i) => (
                          <div
                            key={TIER_PRESET_LABEL_KEYS[i]}
                            className={`options-keybox options-preset${i === active ? ' is-active' : ''}`}
                            style={{
                              left: x + i * (plateWidth + PRESET_GAP),
                              top: rowY + 16,
                              width: plateWidth,
                              height: KEY_BOX_HEIGHT,
                            }}
                            onClick={uiClick(() => {
                              applyTierPreset(preset);
                              invalidateShadowState();
                            })}
                          >
                            {t(TIER_PRESET_LABEL_KEYS[i])}
                          </div>
                        ))}
                      </div>
                    );
                  }

                  const min = row.min ?? 0;
                  const value = Math.min(
                    Math.max(min, GameOptions[row.key]),
                    row.max
                  );

                  const span = row.max - min;
                  const ratio = span === 0 ? 0 : (value - min) / span;

                  const inert =
                    (row.needsPostProcessing === true &&
                      !GameOptions.postProcessing) ||
                    (row.needsTier === true && GameOptions.lightingQuality === 0) ||
                    (row.needsCameraControl === true &&
                      !GameOptions.cameraControl);

                  return (
                    <div
                      key={row.key}
                      style={inert ? { opacity: 0.4 } : undefined}
                    >
                      <span
                        className="options-label"
                        style={{ left: x, top: rowY }}
                      >
                        {t(row.labelKey)}
                      </span>
                      {}
                      <span
                        className="options-label options-value"
                        style={{ left: x, top: rowY, width: VALUE_WIDTH }}
                      >
                        {row.display(value)}
                      </span>

                      <div
                        className="options-slider"
                        style={{
                          left: x,
                          top: rowY + 16,
                          width: SLIDER_WIDTH,
                          height: SLIDER_HEIGHT,
                        }}
                      >
                        <MuSpriteFrame
                          file="op2_volume1.OZT"
                          width={SLIDER_WIDTH}
                          height={SLIDER_HEIGHT}
                          style={{ position: 'absolute', left: 0, top: 0 }}
                        />
                        <MuSpriteFrame
                          file="op2_volume2.OZJ"
                          width={Math.round(GAUGE_WIDTH * ratio)}
                          height={GAUGE_HEIGHT}
                          style={{
                            position: 'absolute',
                            left: GAUGE_INSET_X,
                            top: GAUGE_INSET_Y,
                            backgroundRepeat: 'repeat',
                          }}
                        />
                        <MuSpriteFrame
                          file="op2_volume3.OZT"
                          width={THUMB_SIZE}
                          height={THUMB_SIZE}
                          style={{
                            position: 'absolute',
                            left: Math.round(
                              (SLIDER_WIDTH - THUMB_SIZE) * ratio
                            ),
                            top: 0,
                            pointerEvents: 'none',
                          }}
                        />

                        {}
                        <input
                          type="range"
                          className="options-range"
                          min={min}
                          max={row.max}
                          step={1}
                          value={value}
                          disabled={inert}
                          onChange={e => set(row.key, Number(e.target.value))}
                        />
                      </div>
                    </div>
                  );
                });

                y += SECTION_GAP;

                return (
                  <div key={section.titleKey}>
                    <span
                      className="options-section"
                      style={{ left: x, top: headerY, width: COLUMN_WIDTH }}
                    >
                      {t(section.titleKey)}
                    </span>
                    {body}
                  </div>
                );
              })}
            </div>
          );
        })}

        <MuButton
          file="op1_b_all.OZT"
          width={CLOSE_WIDTH}
          height={CLOSE_HEIGHT}
          frames={{ up: 0, active: 1, down: 2 }}
          color={TEXT_COLOR.brightGray}
          activeColor={TEXT_COLOR.white}
          label={t('common.close')}
          onClick={close}
          style={{
            position: 'absolute',
            left: Math.floor((WIN_WIDTH - CLOSE_WIDTH) / 2),
            top: CLOSE_Y,
          }}
          labelStyle={{ fontSize: 11, textShadow: '1px 1px 0 rgba(0,0,0,.85)' }}
        />

        <MuResizeGrip id={WINDOW_ID} width={WIN_WIDTH} />
      </div>
    </div>
  );
});
