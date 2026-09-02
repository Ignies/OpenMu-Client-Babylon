import { registerDebugModule } from '../common/debugMenu';
import {
  cycleT,
  getCycleOverride,
  parseCycleTime,
  type CyclePhase,
} from './dayCycle';
import { runTimeCommand } from './sceneLook';
import { serverNow } from '../common/serverTime';
import { GameOptions, setGameOption } from '../common/gameOptions';
import { dynamicLightGain } from '../common/lightingQuality';
import { maps } from '../maps';
import { Store } from '../store';

/**
 * The day/night cycle's tab in the offline debug menu
 * (documentation/debug_menu/ARCHITECTURE.md): the feature registers itself,
 * the menu knows nothing about it. Everything drives `runTimeCommand` - the
 * exact seam the `/time` chat command and the `?tod=` URL parameter use, so
 * a chip here and a typed command cannot disagree.
 *
 * The phase chips freeze the clock at the phase centre, Live releases it,
 * the slider scrubs the whole day. The state lines answer "why is nothing
 * changing": the option may be off, the map may not take the cycle
 * (interiors are 0), and the gain line shows what the clock is currently
 * doing to the dynamic-light layer.
 *
 * Loaded for its side effect by `main.tsx`; registering is free, the menu
 * only renders offline.
 */

const PHASES: readonly CyclePhase[] = ['dawn', 'noon', 'dusk', 'night'];

/** The clock as a day of 24 game hours, `hh:mm`. */
function clockLabel(t: number): string {
  const minutes = Math.floor(t * 24 * 60);
  const hh = String(Math.floor(minutes / 60)).padStart(2, '0');
  const mm = String(minutes % 60).padStart(2, '0');
  return `${hh}:${mm}`;
}

registerDebugModule({
  id: 'day-night',
  title: 'Day',
  order: 20,
  rows: () => [
    { kind: 'section', id: 'freeze', label: 'Freeze' },
    {
      kind: 'buttons',
      id: 'phases',
      items: [
        ...PHASES.map(phase => ({
          id: phase,
          label: phase.charAt(0).toUpperCase() + phase.slice(1),
          active: () => getCycleOverride() === parseCycleTime(phase),
          onClick: () => runTimeCommand(phase),
        })),
        {
          id: 'live',
          label: 'Live',
          active: () => getCycleOverride() === null,
          onClick: () => runTimeCommand('off'),
        },
      ],
    },
    {
      kind: 'slider',
      id: 'time',
      label: 'Time of day',
      max: 100,
      get: () => Math.round(cycleT(serverNow()) * 100),
      set: value => runTimeCommand(String(value / 100)),
      display: value => clockLabel(value / 100),
    },
    { kind: 'section', id: 'state', label: 'State' },
    {
      kind: 'check',
      id: 'option',
      label: 'Day/night cycle option',
      get: () => GameOptions.dayNightCycle,
      set: value => setGameOption('dayNightCycle', value),
    },
    {
      kind: 'info',
      id: 'clock',
      label: 'Clock',
      value: () =>
        getCycleOverride() === null
          ? `live, ${clockLabel(cycleT(serverNow()))}`
          : `frozen at ${clockLabel(cycleT(serverNow()))}`,
    },
    {
      kind: 'info',
      id: 'scale',
      label: 'Map cycle scale',
      value: () => {
        const world = Store.world?.mapIndex;
        return world === undefined ? '-' : maps.cycleScaleFor(world).toFixed(2);
      },
    },
    {
      kind: 'info',
      id: 'gain',
      label: 'Dynamic light gain',
      value: () => dynamicLightGain().toFixed(2),
    },
  ],
});
