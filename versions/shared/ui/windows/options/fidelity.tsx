import { observer } from 'mobx-react-lite';
import { uiClick } from '@/controllers/sound';
import {
  improvementOn,
  improvements,
  isCustom,
  withImprovement,
} from '@/controllers/fidelity';
import { GameOptions, setGameOption } from '@/controllers/settings';
import { t } from '@/i18n';
import { Checkbox, FitText } from './controls';
import type { Row, Section } from './catalogue';
import { LIGHTING_QUALITY_LABEL_KEYS } from '@/controllers/lighting/lightingQuality';

/**
 * The Fidelity page: the preset (Classic / Enhanced / Ultra) and one check per registered
 * improvement, built from `controllers/fidelity`'s registry (see its readme).
 */

const PRESET_GAP = 4;

/** The presets share the quality tier names (not the quality presets' Low). */
const PRESET_LABEL_KEYS = LIGHTING_QUALITY_LABEL_KEYS;

/** Reads the observable options, so an observer redraws when they change. */
export function fidelityCustom(): boolean {
  return isCustom(GameOptions.fidelity, GameOptions.fidelityOverrides);
}

function improvementChecked(id: string): boolean {
  return improvementOn(id, GameOptions.fidelity, GameOptions.fidelityOverrides);
}

/** A preset clears the per-improvement choices. */
function applyFidelity(level: number): void {
  setGameOption('fidelity', level);
  setGameOption('fidelityOverrides', {});
}

export function toggleImprovement(id: string): void {
  setGameOption(
    'fidelityOverrides',
    withImprovement(id, !improvementChecked(id), GameOptions.fidelity, GameOptions.fidelityOverrides)
  );
}

export function fidelitySections(): Section[] {
  const checks: Row[] = improvements().map(def => ({
    kind: 'improvement',
    id: def.id,
    labelKey: def.labelKey,
    helpKey: def.hintKey,
  }));

  return [
    { rows: [{ kind: 'fidelity', labelKey: 'options.fidelity', helpKey: 'options.help.fidelity' }] },
    { titleKey: 'options.section.improvements', rows: checks },
  ];
}

export const FidelityPresets = observer(({ width }: { width: number }) => {
  const active = fidelityCustom() ? -1 : GameOptions.fidelity;
  const plate = Math.floor(
    (width - PRESET_GAP * (PRESET_LABEL_KEYS.length - 1)) / PRESET_LABEL_KEYS.length
  );

  return (
    <div className="options-presets" style={{ gap: PRESET_GAP }}>
      {PRESET_LABEL_KEYS.map((key, i) => (
        <div
          key={key}
          className={`options-plate options-preset${i === active ? ' is-active' : ''}`}
          style={{ width: plate }}
          data-no-drag="true"
          onClick={uiClick(() => applyFidelity(i))}
        >
          <FitText style={{ width: '100%' }}>{t(key)}</FitText>
        </div>
      ))}
    </div>
  );
});

export const ImprovementCheck = observer(({ id }: { id: string }) => (
  <Checkbox checked={improvementChecked(id)} />
));
