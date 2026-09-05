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
import { ENUM_WORLD } from '../../../../common/types';
import { lookDirector, type LookState } from '../../../../lighting/director';

/**
 * Lighting: the director's `LookState` read live, plus the two image knobs
 * a tuner turns while reading it. Both are written through `setGameOption`,
 * the exact writes the Options window makes, so this tab adds no writer of
 * its own.
 */

const TIER_NAMES = ['Classic', 'Enhanced', 'Ultra'];

const TONE_MAPPER_LABELS = ['None', 'Standard', 'ACES', 'Neutral'];

const signed = (value: number): string =>
  value === 0 ? 'off' : value > 0 ? `+${value}` : String(value);

/** A `LookState` field, '-' while no director is live. */
const state = (label: string, read: (s: LookState) => string): DebugRow => ({
  kind: 'info',
  id: `state-${label}`,
  label,
  value: () => {
    const s = lookDirector()?.state();
    return s ? read(s) : '-';
  },
});

const rect = (s: LookState): string =>
  s.area
    ? `${s.area.name} [${s.area.rect.minX},${s.area.rect.minY} - ${s.area.rect.maxX},${s.area.rect.maxY}]`
    : 'none';

registerDebugModule({
  id: 'lighting',
  title: 'Light',
  order: 30,
  rows: () => [
    { kind: 'section', id: 'image', label: 'Image' },
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
    { kind: 'section', id: 'state', label: 'Look state' },
    state('World', s => `${ENUM_WORLD[s.world]} (${s.world})`),
    state('Area', rect),
    state('Tier', s => `${TIER_NAMES[s.tier]} (${s.tier})`),
    state(
      'Level',
      s =>
        `ev ${s.ev.toFixed(2)} gain ${s.keyGain.toFixed(3)} exposure ${s.exposure.toFixed(3)}`
    ),
    state('Tone mapper', s => s.toneMapper),
    state(
      'Shadow',
      s =>
        `${s.shadow.casters} x${s.shadow.strength.toFixed(2)} soft ${s.shadow.softness}`
    ),
    state('Passes', s => (s.passes.length ? s.passes.join(' ') : 'none')),
  ],
});
