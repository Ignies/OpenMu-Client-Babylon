import './style.less';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import { runInAction } from 'mobx';
import { Store } from '../../../../../store';
import { SessionStats } from '../../../../../common/sessionStats';
import { isKey } from '../../../../../common/keyBindings';
import { useEventBus } from '../../../../../hooks/useEventBus';
import { uiClick } from '../../../../../libs/sfx';
import { MuText } from '../../../../components/muText';
import { useWindowChrome } from '../../../../components/muWindow/useWindowChrome';
import { t } from '../../../../../i18n';

/**
 * The session panel: what this sitting has been worth, and what the rates
 * say about the next level. No original analog - the C++ client has no such
 * window - so it is drawn in the same black plate the move list uses rather
 * than pretending to be a ported sheet.
 */

const WINDOW_ID = 'session-stats';
const HOT_KEY = 'sessionStats';

const WIDTH = 132;
const ROW_HEIGHT = 12;
const TITLE_Y = 4;
const FIRST_ROW = 20;
const ROWS = 5;
const HEIGHT = FIRST_ROW + ROWS * ROW_HEIGHT + 16;
const LABEL_X = 6;
const VALUE_X = WIDTH - 6;
const CLOSE_HEIGHT = 12;

const TITLE_COLOR = 'rgb(255, 204, 26)';
const LABEL_COLOR = 'rgb(127, 178, 255)';
const VALUE_COLOR = '#fff';

/** 1 234 567 -> "1.23M": the panel is 132 px wide, the numbers are not. */
function compact(value: number): string {
  const n = Math.floor(value);
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 10_000) return `${(n / 1000).toFixed(1)}K`;
  return n.toLocaleString('en-US');
}

function clock(ms: number): string {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const rest = s % 60;
  const pad = (v: number) => String(v).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(rest)}` : `${pad(m)}:${pad(rest)}`;
}

const Row = ({ label, value, top }: { label: string; value: string; top: number }) => (
  <>
    <MuText className="session-label" color={LABEL_COLOR} style={{ left: LABEL_X, top }} text={label} />
    <MuText className="session-value" color={VALUE_COLOR} style={{ left: VALUE_X, top }} text={value} />
  </>
);

export const SessionStatsWindow = observer(() => {
  const open = Store.sessionStatsEnabled;
  const chrome = useWindowChrome(WINDOW_ID, {
    width: WIDTH,
    height: HEIGHT,
    onClose: () => runInAction(() => (Store.sessionStatsEnabled = false)),
  });

  useEventBus('keyPressed', key => {
    if (!Store.world?.playerEntity) return;
    if (isKey(HOT_KEY, key)) {
      runInAction(() => (Store.sessionStatsEnabled = !Store.sessionStatsEnabled));
    }
  });

  // The counters listen from the first open; the clock only runs while the
  // panel is up, so a closed tracker costs nothing per frame.
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!open) return;
    SessionStats.watch();
    const id = setInterval(() => {
      SessionStats.tick();
      setTick(v => v + 1);
    }, 1000);
    return () => clearInterval(id);
  }, [open]);

  if (!open) return null;

  const rate = (value: number) => (value > 0 ? `${compact(value)}/h` : '-');
  const toLevel = SessionStats.msToLevel;

  return (
    <div
      ref={chrome.ref as React.Ref<HTMLDivElement>}
      role="dialog"
      aria-label={t('session.title')}
      className="session-window"
      onPointerDown={chrome.onPointerDown}
      style={{ width: WIDTH, height: HEIGHT, ...chrome.style, transformOrigin: '0 0' }}
    >
      <MuText
        face="bold"
        className="session-title"
        color={TITLE_COLOR}
        style={{ left: WIDTH / 2, top: TITLE_Y }}
        text={t('session.title')}
      />

      <Row label={t('session.time')} value={clock(SessionStats.elapsedMs)} top={FIRST_ROW} />
      <Row
        label={t('session.exp')}
        value={rate(SessionStats.experiencePerHour)}
        top={FIRST_ROW + ROW_HEIGHT}
      />
      <Row
        label={t('session.kills')}
        value={`${SessionStats.kills} (${rate(SessionStats.killsPerHour)})`}
        top={FIRST_ROW + ROW_HEIGHT * 2}
      />
      <Row
        label={t('session.zen')}
        value={rate(SessionStats.zenPerHour)}
        top={FIRST_ROW + ROW_HEIGHT * 3}
      />
      <Row
        label={t('session.toLevel')}
        value={toLevel === null ? '-' : clock(toLevel)}
        top={FIRST_ROW + ROW_HEIGHT * 4}
      />

      <div
        className="session-reset"
        data-no-drag="true"
        style={{ top: HEIGHT - CLOSE_HEIGHT - 2, height: CLOSE_HEIGHT, lineHeight: `${CLOSE_HEIGHT}px` }}
        onClick={uiClick(() => SessionStats.reset())}
      >
        <MuText text={t('session.reset')} />
      </div>
    </div>
  );
});
