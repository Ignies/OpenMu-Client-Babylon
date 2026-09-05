import {
  registerDebugModule,
  type DebugRow,
} from '../../../../common/debugMenu';
import {
  BRIGHTNESS_MAX,
  BRIGHTNESS_MIN,
  GameOptions,
  TONE_MAPPER_MAX,
  setGameOption,
} from '../../../../common/gameOptions';
import { invalidateShadowState } from '../../../../common/objectShadow';
import { lookDirector } from '../../../../lighting/director';

/**
 * Lighting: the lighting knobs of `GameOptions`, written through
 * `setGameOption` - the exact writes the Options window makes, so this tab
 * adds no writer of its own - and a read-out of the director's `LookState`.
 */

const TIER_NAMES = ['Classic', 'Enhanced', 'Ultra'];

const TONE_MAPPER_LABELS = ['None', 'Standard', 'ACES', 'Neutral'];

const check = (
  key: 'dynamicLights' | 'shadows' | 'postProcessing',
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
  key: 'glow' | 'bloom' | 'vignette',
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

const signed = (value: number): string =>
  value === 0 ? 'off' : value > 0 ? `+${value}` : String(value);

const stateLine = (): string => {
  const s = lookDirector()?.state();
  if (!s) return 'no director';
  return `ev ${s.ev.toFixed(2)} tm ${s.toneMapper} shadow ${s.shadow.strength.toFixed(2)} [${s.passes.join(' ')}]`;
};

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
    { kind: 'section', id: 'image', label: 'Image' },
    check('postProcessing', 'Post-processing'),
    {
      kind: 'slider',
      id: 'toneMapper',
      label: 'Tone mapper',
      max: TONE_MAPPER_MAX,
      get: () => GameOptions.toneMapper,
      set: value => setGameOption('toneMapper', value),
      display: value => TONE_MAPPER_LABELS[value] ?? String(value),
    },
    {
      kind: 'slider',
      id: 'brightness',
      label: 'Brightness',
      min: BRIGHTNESS_MIN,
      max: BRIGHTNESS_MAX,
      get: () => GameOptions.brightness,
      set: value => setGameOption('brightness', value),
      display: signed,
    },
    slider('bloom', 'Bloom', 9),
    slider('glow', 'Glow', 9),
    slider('vignette', 'Vignette', 9),
    { kind: 'section', id: 'state', label: stateLine() },
  ],
});
