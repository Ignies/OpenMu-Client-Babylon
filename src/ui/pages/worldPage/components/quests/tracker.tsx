/**
 * The quest tracker: the running quests and their counts, on the HUD.
 *
 * The original has no such panel - the counts live in `CNewUIQuestProgress`
 * and the quest tab of `CNewUIMyQuestInfoWindow`, both behind T - so this is
 * ours, drawn with the quest windows' own pieces: their font, their subject
 * colour for a title, their white for a line, and the green they pick a row
 * out with for a quest that is done.
 *
 * It reads the quest layer and writes nothing back: the Season 6 log owns the
 * progress records, `killCounters.ts` owns the legacy chain's kills, and the
 * only state here is which rows the player folded (`trackerCollapse.ts`).
 */
import { observer } from 'mobx-react-lite';
import { t } from '../../../../../i18n';
import { GameOptions, uiScaleFactor } from '../../../../../common/gameOptions';
import { devQueryNumber } from '../../../../../common/devSeams';
import { uiClick } from '../../../../../libs/sfx';
import { MuText } from '../../../../components/muText';
import {
  objectiveCounted,
  objectiveDone,
  objectiveProgress,
  objectiveText,
  type QuestObjective,
} from '../../../../../quests/objectives';
import { activeQuests, questProgressOf, questSubject } from '../../../../../quests/questLog';
import { legacyQuestObjectives, legacyQuestsInProgress } from '../../../../../quests/legacyQuests';
import { questDefinition } from '../../../../../quests/questData';
import { COLOR } from './layout';
import { toggleTrackerFold, trackerFolded } from './trackerCollapse';

/** `.minimap-corner-panel`: 10 px in from the corner of the play area. */
const CORNER_INSET = 10;

/**
 * What the corner minimap takes when it is on: its 240 unit square at the
 * panel's own 0.75, plus the coordinate bar under it. Kept here rather than
 * imported so the two panels only agree on a number, not on a module.
 */
const MINIMAP_SLOT = (240 + 22) * 0.75;

/**
 * Left clear under the minimap slot for the event countdown rows, which sit
 * in the same corner and know nothing about this panel.
 */
const EVENT_ROW_BAND = 60;

/** The corner minimap's drawn width, so the two line up. */
const WIDTH = 240 * 0.75;

/** One quest on the tracker. */
type TrackerRow = {
  /** Stable across reloads: the fold is stored under it. */
  id: string;
  title: string;
  objectives: QuestObjective[];
  complete: boolean;
};

/** The Season 6 log's running quests, then the legacy chain's. */
function trackerRows(): TrackerRow[] {
  const rows: TrackerRow[] = [];

  for (const key of activeQuests()) {
    const progress = questProgressOf(key);
    rows.push({
      id: `s${key}`,
      title: questSubject(key),
      objectives: progress?.objectives ?? [],
      complete: progress?.complete ?? false,
    });
  }

  for (const index of legacyQuestsInProgress()) {
    const objectives = legacyQuestObjectives(index);
    rows.push({
      id: `l${index}`,
      title: questDefinition(index)?.name ?? '',
      objectives,
      complete: objectives.length > 0 && objectives.every(objectiveDone),
    });
  }

  return rows;
}

const TrackerQuest = observer(({ row, folded }: { row: TrackerRow; folded: boolean }) => (
  <div className="quest-tracker-quest">
    <div className="quest-tracker-title" onClick={uiClick(() => toggleTrackerFold(row.id))}>
      <MuText face="bold" color={row.complete ? COLOR.complete : COLOR.subject} text={row.title} />
    </div>
    {!folded &&
      row.objectives.map((objective, i) => {
        // The count goes on a line of its own so a long monster name wraps
        // instead of cutting the number off.
        const line = objectiveText(objective, '');
        return line === null ? null : (
          <div key={i} className="quest-tracker-objective">
            <MuText className="quest-tracker-line" color={COLOR.tabOn} text={line} />
            {objectiveCounted(objective) && (
              <MuText
                className="quest-tracker-count"
                color={objectiveDone(objective) ? COLOR.complete : COLOR.tabOn}
                text={objectiveProgress(objective)}
              />
            )}
          </div>
        );
      })}
    {!folded && row.complete && (
      <MuText
        className="quest-tracker-objective quest-tracker-line"
        color={COLOR.complete}
        text={t('quest.tracker.returnToNpc')}
      />
    )}
  </div>
));

export const QuestTracker = observer(() => {
  if (!GameOptions.questTracker) return null;

  const rows = trackerRows();
  if (rows.length === 0) return null;

  const scale = uiScaleFactor(GameOptions.uiScale);
  const top = CORNER_INSET + (GameOptions.minimapCorner ? MINIMAP_SLOT * scale : 0) + EVENT_ROW_BAND;
  // Dev seam: start the first N rows folded, for a screenshot of both states.
  const devFolded = devQueryNumber('trackerCollapsed') ?? 0;

  return (
    <div className="quest-tracker" style={{ top, width: WIDTH, transform: `scale(${scale})` }}>
      {rows.map((row, i) => (
        <TrackerQuest key={row.id} row={row} folded={trackerFolded(row.id) || i < devFolded} />
      ))}
    </div>
  );
});
