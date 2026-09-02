import {
  registerDebugModule,
  type DebugRow,
} from '../../../../common/debugMenu';
import { GameOptions, setGameOption } from '../../../../common/gameOptions';
import { invalidateShadowState } from '../../../../common/objectShadow';

/**
 * Lighting: the lighting knobs of `GameOptions`, written through
 * `setGameOption` - the exact writes the Options window makes, so this tab
 * adds no writer of its own. Shadows re-validate the blob-shadow slots the
 * way the Options window does.
 */

const TIER_NAMES = ['Classic', 'Enhanced', 'Ultra'];

const check = (
  key: 'dynamicLights' | 'shadows' | 'postProcessing' | 'toneMapping' | 'sceneDarkening',
  label: string
): DebugRow => ({
  kind: 'check',
  id: key,
  label,
  get: () => GameOptions[key],
  set: value => {
    setGameOption(key, value);
    if (key === 'shadows') invalidateShadowState();
  },
});

const slider = (
  key: 'glow' | 'darkness' | 'exposure' | 'contrast',
  label: string,
  max: number
): DebugRow => ({
  kind: 'slider',
  id: key,
  label,
  max,
  get: () => GameOptions[key],
  set: value => setGameOption(key, value),
  display: value => (value === 0 ? 'off' : String(value)),
});

registerDebugModule({
  id: 'lighting',
  title: 'Light',
  order: 30,
  rows: () => [
    { kind: 'section', id: 'quality', label: 'Quality' },
    {
      kind: 'slider',
      id: 'lightingQuality',
      label: 'Lighting quality',
      max: TIER_NAMES.length - 1,
      get: () => GameOptions.lightingQuality,
      set: value => setGameOption('lightingQuality', value),
      display: value => TIER_NAMES[value] ?? String(value),
    },
    check('dynamicLights', 'Dynamic lights'),
    check('shadows', 'Shadows'),
    check('sceneDarkening', 'Scene darkening'),
    { kind: 'section', id: 'grade', label: 'Grade' },
    check('postProcessing', 'Post-processing'),
    check('toneMapping', 'Tone mapping'),
    slider('glow', 'Glow', 9),
    slider('darkness', 'Darkness', 25),
    slider('exposure', 'Exposure', 25),
    slider('contrast', 'Contrast', 25),
  ],
});
