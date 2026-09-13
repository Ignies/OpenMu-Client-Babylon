import './style.less';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import { GameOptions, setGameOption } from '../../../../../common/gameOptions';
import { formatRoundTrip } from '../../../../../common/hudFormat';
import { isKey } from '../../../../../common/keyBindings';
import { NetStats } from '../../../../../common/netStats';
import { Store } from '../../../../../store';
import { useEventBus } from '../../../../../hooks/useEventBus';
import { MuText } from '../../../../components/muText';
import { useUiStageScale } from '../../../../components/uiStage';
import { t } from '../../../../../i18n';

/**
 * Frames, frame time and the server round trip, in the top left under the
 * map name banner. No original analog and no window: three lines of HUD text
 * with the usual shadow, the way the coordinates the original prints there
 * are drawn.
 *
 * The engine is polled twice a second into one piece of state, so a running
 * readout is two React renders a second whatever the frame rate is. Off, the
 * component renders nothing and holds no timer.
 */

const HOT_KEY = 'performanceReadout';

/** Twice a second: fast enough to feel live, far below a frame. */
const SAMPLE_MS = 500;

/** 640x480 UI space, clear of the buff row (y 15..48) and the banner. */
const X = 6;
const Y = 54;
const LINE_HEIGHT = 12;
const LABEL_WIDTH = 42;

const LABEL_COLOR = 'rgb(127, 178, 255)';

type Reading = { fps: number; frameMs: number; roundTripMs: number | null };

const EMPTY: Reading = { fps: 0, frameMs: 0, roundTripMs: null };

function read(): Reading {
  const engine = Store.world?.scene.getEngine();
  if (!engine) return { ...EMPTY, roundTripMs: NetStats.roundTripMs };

  return {
    fps: engine.getFps(),
    frameMs: engine.getDeltaTime(),
    roundTripMs: NetStats.roundTripMs,
  };
}

const Line = observer(({ label, value, index }: { label: string; value: string; index: number }) => (
  <>
    <MuText
      className="perf-label"
      color={LABEL_COLOR}
      style={{ left: 0, top: index * LINE_HEIGHT }}
      text={label}
    />
    <MuText
      className="perf-value"
      style={{ left: LABEL_WIDTH, top: index * LINE_HEIGHT }}
      text={value}
    />
  </>
));

export const PerfReadout = observer(() => {
  const on = GameOptions.performanceReadout;
  const scale = useUiStageScale();
  const [reading, setReading] = useState<Reading>(EMPTY);

  useEventBus('keyPressed', key => {
    if (!Store.world?.playerEntity) return;
    if (isKey(HOT_KEY, key)) {
      setGameOption('performanceReadout', !GameOptions.performanceReadout);
    }
  });

  useEffect(() => {
    if (!on) return;
    setReading(read());
    const id = setInterval(() => setReading(read()), SAMPLE_MS);
    return () => clearInterval(id);
  }, [on]);

  if (!on) return null;

  return (
    <div
      className="perf-readout"
      style={{ left: X * scale, top: Y * scale, transform: `scale(${scale})` }}
    >
      <Line label={t('perf.fps')} value={reading.fps.toFixed(0)} index={0} />
      <Line label={t('perf.frame')} value={`${reading.frameMs.toFixed(1)} ms`} index={1} />
      <Line label={t('perf.ping')} value={formatRoundTrip(reading.roundTripMs)} index={2} />
    </div>
  );
});
