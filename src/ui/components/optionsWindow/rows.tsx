import { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { MuSpriteFrame } from '../muSprite';
import { uiClick } from '../../../libs/sfx';
import { t } from '../../../i18n';
import {
  GameOptions,
  type GameOptions as GameOptionsType,
} from '../../../common/gameOptions';
import {
  KeyBindings,
  keyLabel,
  type KeyAction,
} from '../../../common/keyBindings';
import { isFullscreen, toggleFullscreen } from '../../../common/browserHotkeys';
import { PwaInstall } from '../../../common/pwaInstall';
import {
  TIER_PRESETS,
  TIER_PRESET_LABEL_KEYS,
  activeTierPreset,
  type TierPreset,
} from './presets';
import { LanguageSelect } from './languageSelect';
import { TexturePackSelect } from './texturePackSelect';
import { blockerOf, type Blocker } from './gating';
import { rowId, type ButtonRow, type Row } from './catalogue';
import { Checkbox, FitText, OptionsButton, Slider, Stepper } from './controls';

/** The control column: every control starts on the same x. */
export const CONTROL_WIDTH = 176;
const VALUE_GAP = 10;
const PRESET_GAP = 4;
const SELECT_ROWS = 7;

export type RowActions = {
  set: <K extends keyof GameOptionsType>(key: K, value: GameOptionsType[K]) => void;
  applyPreset: (preset: TierPreset) => void;
  capturing: KeyAction | null;
  capture: (action: KeyAction | null) => void;
  press: (row: ButtonRow) => void;
  hover: (row: Row) => void;
  jump: (blocker: Blocker) => void;
};

function useFullscreen(): boolean {
  const [on, setOn] = useState(isFullscreen);

  useEffect(() => {
    const sync = () => setOn(isFullscreen());
    document.addEventListener('fullscreenchange', sync);
    document.addEventListener('webkitfullscreenchange', sync);
    return () => {
      document.removeEventListener('fullscreenchange', sync);
      document.removeEventListener('webkitfullscreenchange', sync);
    };
  }, []);

  return on;
}

const FullscreenCheck = () => <Checkbox checked={useFullscreen()} />;

const Presets = observer(({ actions }: { actions: RowActions }) => {
  const active = activeTierPreset();
  const width = Math.floor(
    (CONTROL_WIDTH - PRESET_GAP * (TIER_PRESETS.length - 1)) / TIER_PRESETS.length
  );

  return (
    <div className="options-presets" style={{ gap: PRESET_GAP }}>
      {TIER_PRESETS.map((preset, i) => (
        <div
          key={TIER_PRESET_LABEL_KEYS[i]}
          className={`options-plate options-preset${i === active ? ' is-active' : ''}`}
          style={{ width }}
          data-no-drag="true"
          onClick={uiClick(() => actions.applyPreset(preset))}
        >
          <FitText style={{ width: '100%' }}>{t(TIER_PRESET_LABEL_KEYS[i])}</FitText>
        </div>
      ))}
    </div>
  );
});

const Control = observer(
  ({ row, inert, actions }: { row: Row; inert: boolean; actions: RowActions }) => {
    switch (row.kind) {
      case 'toggle':
        return <Checkbox checked={GameOptions[row.key]} />;

      case 'fullscreen':
        return <FullscreenCheck />;

      case 'slider':
      case 'choice': {
        const min = row.min ?? 0;
        const value = Math.min(Math.max(min, GameOptions[row.key]), row.max);
        const write = (next: number) => actions.set(row.key, next);

        if (row.kind === 'choice') {
          return (
            <Stepper
              value={value}
              min={min}
              max={row.max}
              text={row.display(value)}
              disabled={inert}
              width={CONTROL_WIDTH}
              onChange={write}
            />
          );
        }

        return (
          <>
            <Slider
              value={value}
              min={min}
              max={row.max}
              disabled={inert}
              onChange={write}
            />
            <FitText
              align="left"
              className="options-value"
              style={{ marginLeft: VALUE_GAP, flex: 1 }}
            >
              {row.display(value)}
            </FitText>
          </>
        );
      }

      case 'key': {
        const active = actions.capturing === row.action;

        return (
          <div
            className={`options-plate options-keybox${active ? ' is-active' : ''}`}
            data-no-drag="true"
            onClick={uiClick(() => actions.capture(active ? null : row.action))}
          >
            <FitText style={{ width: '100%' }}>
              {active ? '...' : keyLabel(KeyBindings[row.action])}
            </FitText>
          </div>
        );
      }

      case 'button': {
        if (row.id === 'install' && PwaInstall.installed) {
          return (
            <FitText align="left" className="options-value">
              {t('options.appInstalled')}
            </FitText>
          );
        }

        return (
          <OptionsButton
            label={t(row.buttonKey)}
            width={96}
            disabled={row.id === 'install' && PwaInstall.busy}
            onClick={() => actions.press(row)}
            style={{ left: 0, top: -5 }}
          />
        );
      }

      case 'presets':
        return <Presets actions={actions} />;

      case 'language':
        return (
          <LanguageSelect
            left={0}
            top={1}
            width={CONTROL_WIDTH}
            visibleRows={SELECT_ROWS}
            bare
          />
        );

      case 'texturePack':
        return (
          <TexturePackSelect
            left={0}
            top={1}
            width={CONTROL_WIDTH}
            visibleRows={SELECT_ROWS}
            bare
          />
        );
    }
  }
);

/**
 * One setting: a bullet, the label (which wraps rather than running into the
 * control), and the control in the shared column. A greyed row takes no
 * input; clicking it goes to the option that would bring it to life.
 */
export const OptionRow = observer(
  ({
    row,
    flash,
    actions,
  }: {
    row: Row;
    flash: boolean;
    actions: RowActions;
  }) => {
    const blocker = row.kind === 'key' ? null : blockerOf(row.needs);
    const inert = blocker !== null;
    const indented = row.kind !== 'key' && row.indent === true;

    const onClick = () => {
      if (blocker) {
        if (blocker.target) actions.jump(blocker);
        return;
      }
      if (row.kind === 'toggle') actions.set(row.key, !GameOptions[row.key]);
      if (row.kind === 'fullscreen') toggleFullscreen();
    };

    const clickable =
      (blocker !== null && blocker.target !== null) ||
      (!inert && (row.kind === 'toggle' || row.kind === 'fullscreen'));

    return (
      <div
        className={[
          'options-row',
          indented && 'is-indented',
          inert && 'is-inert',
          clickable && 'is-clickable',
          flash && 'is-flash',
        ]
          .filter(Boolean)
          .join(' ')}
        data-row-id={rowId(row)}
        data-no-drag="true"
        onPointerEnter={() => actions.hover(row)}
        onClick={clickable ? uiClick(onClick) : undefined}
      >
        <MuSpriteFrame
          file="newui_option_point.OZT"
          width={10}
          height={10}
          className="options-row-bullet"
        />
        <span className="options-row-label">{t(row.labelKey)}</span>
        <div className="options-row-control" style={{ width: CONTROL_WIDTH }}>
          <Control row={row} inert={inert} actions={actions} />
        </div>
      </div>
    );
  }
);
