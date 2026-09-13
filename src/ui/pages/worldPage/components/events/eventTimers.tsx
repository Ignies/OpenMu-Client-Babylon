import { observer } from 'mobx-react-lite';
import { Store } from '../../../../../store';
import { GameOptions, uiScaleFactor } from '../../../../../common/gameOptions';
import { events } from '../../../../../events';
import {
  eventSchedule,
  refreshEventSchedule,
  type EventScheduleKey,
  type EventScheduleRow,
} from '../../../../../events/schedule';
import { rowText } from '../../../../../events/scheduleClock';
import { EVENT_TEXT } from '../../../../../events/recipes';
import { MuText } from '../../../../components/muText';
import {
  EVENT_ROW_CLOCK_WIDTH,
  EVENT_ROW_COLOR,
  EVENT_ROW_COLOR_OPEN,
  EVENT_ROW_COLOR_UNKNOWN,
  EVENT_ROW_GAP,
  EVENT_ROW_HEIGHT,
  EVENT_ROW_LABEL_WIDTH,
  MINIMAP_SLOT_HEIGHT,
  MINIMAP_SLOT_TOP,
} from './layout';

/**
 * When the three events OpenMU runs next open, as three lines under the
 * corner minimap's slot. Ours: the original only ever answered the question
 * at the NPC or on a ticket, one notice at a time.
 *
 * No chrome of its own - the lines are the small HUD font the in-event timer
 * figure and the match notices draw in, in their colours. The rows keep the
 * slot's place whether the minimap panel is drawn in it or not, so nothing
 * below them moves when that option is toggled.
 *
 * Reads `events/schedule.ts` and writes nothing.
 */

const LABEL: Readonly<Record<EventScheduleKey, () => string>> = {
  bloodCastle: () => EVENT_TEXT.bloodCastle,
  devilSquare: () => EVENT_TEXT.devilSquare,
  chaosCastle: () => EVENT_TEXT.chaosCastle,
};

/** Open the entry the event already has, or ask the server again. */
function clickRow(row: EventScheduleRow): void {
  if (!row.open) {
    refreshEventSchedule(row.key);
    return;
  }
  if (row.key === 'bloodCastle') events.openBloodCastle();
  else if (row.key === 'devilSquare') events.openDevilSquare();
  else events.askChaosCastleOpening();
}

const Row = observer(({ row }: { row: EventScheduleRow }) => {
  // Grey is for silence only: a row the server answered reads in the timer's
  // own colour even when all it said was that the wait is a long one.
  const color = row.open
    ? EVENT_ROW_COLOR_OPEN
    : row.seconds === null && !row.far
      ? EVENT_ROW_COLOR_UNKNOWN
      : EVENT_ROW_COLOR;
  const value = rowText(row);

  return (
    <div
      className="event-row"
      style={{ height: EVENT_ROW_HEIGHT, lineHeight: `${EVENT_ROW_HEIGHT}px` }}
      onClick={() => clickRow(row)}
    >
      <MuText
        className="event-row-label"
        text={LABEL[row.key]()}
        color={color}
        style={{ width: EVENT_ROW_LABEL_WIDTH }}
      />
      <MuText
        className="event-row-clock"
        text={value}
        color={color}
        style={{ width: EVENT_ROW_CLOCK_WIDTH }}
      />
    </div>
  );
});

export const EventTimers = observer(() => {
  const rows = eventSchedule();
  if (!GameOptions.eventTimers || !Store.world) return null;

  const scale = uiScaleFactor(GameOptions.uiScale);

  return (
    <div
      className="event-timers"
      style={{
        top: MINIMAP_SLOT_TOP + (MINIMAP_SLOT_HEIGHT + EVENT_ROW_GAP) * scale,
        transform: `scale(${scale})`,
      }}
    >
      {rows.map(row => (
        <Row key={row.key} row={row} />
      ))}
    </div>
  );
});
