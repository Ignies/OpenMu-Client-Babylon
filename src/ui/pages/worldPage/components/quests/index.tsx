import './style.less';
import { t } from '../../../../../i18n';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { observable, runInAction } from 'mobx';
import { observer } from 'mobx-react-lite';
import { Store } from '../../../../../store';
import { isKey } from '../../../../../common/keyBindings';
import { useEventBus } from '../../../../../hooks/useEventBus';
import { playUiSound, uiClick } from '../../../../../libs/sfx';
import { monsterDisplayName } from '../../../../../common/monstersDatabase';
import { ConditionTypeEnum } from '../../../../../common/packets/ServerToClientPackets';
import { MuButton } from '../../../../components/muButton';
import { MuSpriteFrame } from '../../../../components/muSprite';
import { MuItemWindow, MuTableFrame } from '../../../../components/muWindow';
import { MsgBoxFrame, msgBoxHeight } from '../../../../components/msgBoxFrame';
import { quests } from '../../../../../quests';
import { objectiveDone, objectiveProgress } from '../../../../../quests/objectives';
import { questDefinition } from '../../../../../quests/questData';
import {
  LegacyQuestState,
  answerLegacyQuest,
  closeLegacyQuestWindow,
  completeLegacyQuest,
  legacyQuestAnswers,
  legacyQuestCanComplete,
  legacyQuestCurrentIndex,
  legacyQuestLines,
  legacyQuestListReceived,
  legacyQuestNeedZen,
  legacyQuestObjectives,
  legacyQuestPreviewLines,
  legacyQuestState,
  legacyQuestWindowOpen,
  legacyQuestWindowTitle,
  wrapDialogText,
} from '../../../../../quests/legacyQuests';
import {
  answerNpcDialogue,
  closeNpcDialogue,
  npcDialogueAnswers,
  npcDialogueBusy,
  npcDialogueContribution,
  npcDialogueLines,
  npcDialogueNpcName,
  npcDialogueOpen,
} from '../../../../../quests/npcDialogue';
import {
  activeQuests,
  advanceQuestWords,
  answerQuestStep,
  cancelQuest,
  closeQuestList,
  closeQuestProgress,
  completeQuest,
  myQuestEmptyMessage,
  myQuestSelectedKey,
  myQuestTab,
  myQuestWindowOpen,
  openSelectedQuest,
  questListEntries,
  questListNpcNumber,
  questListOpen,
  questProgressAnswers,
  questProgressBusy,
  questProgressKey,
  questProgressMode,
  questProgressNpcLines,
  questProgressOf,
  questProgressOpen,
  questProgressPlayerLines,
  questSubject,
  questSummaryLines,
  selectMyQuest,
  selectMyQuestTab,
  selectQuest,
  showMyQuestWindow,
  type MyQuestTab,
  type QuestRequirementLine,
} from '../../../../../quests/questLog';
import {
  COLOR,
  COMPLETE_BUTTON,
  EMPTY_BUTTON,
  EMPTY_BUTTON_FRAMES,
  EMPTY_BUTTON_SPRITE,
  EXIT_BUTTON,
  EXIT_FRAMES,
  EXIT_SPRITE,
  GIVEUP_BUTTON,
  GIVEUP_BUTTON_SPRITE,
  HEAD_CLOSE,
  LINE,
  LINE_SPRITE,
  MONEY_BOX,
  MONEY_SPRITE,
  MQ_JOB_LINE_Y,
  MQ_JOB_STATE_Y,
  MQ_JOB_TEXT_STEP,
  MQ_JOB_TEXT_Y,
  MQ_JOB_TITLE_Y,
  MQ_LINE_Y,
  MQ_LIST_HEIGHT,
  MQ_LIST_Y,
  MQ_MESSAGE_Y,
  MQ_SUMMARY_HEIGHT,
  MQ_SUMMARY_Y,
  MSGBOX_BUTTON,
  MSGBOX_BUTTON_BOTTOM,
  MSGBOX_BUTTON_FRAMES,
  MSGBOX_CANCEL_SPRITE,
  MSGBOX_CANCEL_X,
  MSGBOX_FRAME_LINES,
  MSGBOX_LINE_STEP,
  MSGBOX_OK_SPRITE,
  MSGBOX_OK_X,
  MSGBOX_TEXT_TOP,
  MSGBOX_TEXT_WIDTH,
  MSGBOX_TEXT_X,
  ND_CONTRIBUTE_BOX,
  ND_CONTRIBUTE_Y,
  ND_LINE_CHARS,
  ND_LINE_Y,
  ND_NAME_Y,
  ND_NPC_LINES_PER_PAGE,
  ND_NPC_PAGE_Y,
  ND_NPC_TEXT_Y,
  ND_PAGE_L_X,
  ND_PAGE_R_X,
  ND_SEL_BLOCK_Y,
  ND_SEL_LINES_PER_PAGE,
  ND_SEL_PAGE_Y,
  ND_SEL_TEXT_Y,
  ND_SEL_WIDTH,
  ND_SEL_X,
  ND_TEXT_GAP,
  ND_TEXT_X,
  NPC_ANSWERS_Y,
  NPC_COMPLETE_BUTTON,
  NPC_ING_LINE_Y,
  NPC_ITEM_X,
  NPC_LINES_MAX,
  NPC_LINE_STEP,
  NPC_LINE_Y,
  NPC_MONSTER_X,
  NPC_NAME_Y,
  NPC_OBJECTIVE_STEP,
  NPC_OBJECTIVE_Y,
  NPC_QUEST_TITLE_Y,
  NPC_TEXT_TOP,
  NPC_ZEN_TEXT_Y,
  OPEN_BUTTON,
  OPEN_BUTTON_SPRITE,
  PAGE_BUTTON,
  PAGE_BUTTON_FRAMES,
  PAGE_BUTTON_L,
  PAGE_BUTTON_L_X,
  PAGE_BUTTON_R,
  PAGE_BUTTON_R_X,
  PAGE_BUTTON_Y,
  QP_ANSWERS_Y,
  QP_ANSWER_WIDTH,
  QP_LINES_PER_PAGE,
  QP_LINE_Y,
  QP_LIST_HEIGHT,
  QP_LIST_Y,
  QP_NPC_NAME_Y,
  QP_NPC_TEXT_Y,
  QP_PLAYER_NAME_Y,
  QP_PLAYER_TEXT_Y,
  QP_SUBJECT_Y,
  QP_TEXT_GAP,
  QP_TEXT_X,
  SMALL_BUTTON_FRAMES,
  TAB,
  TABS,
  TAB_BIG_SPRITE,
  TAB_LABEL_ADVANCE,
  TAB_LABEL_FONT_PX,
  TAB_LABEL_MIN_FONT_PX,
  TAB_LABEL_PADDING,
  TAB_LABEL_Y,
  TAB_SMALL_SPRITE,
  TAB_STRIP_SPRITE,
  TITLE_Y,
} from './layout';

const NPC_WINDOW_ID = 'npc-quest';
const PROGRESS_WINDOW_ID = 'quest-progress';
const LIST_WINDOW_ID = 'quest-list';
const NPC_DIALOGUE_WINDOW_ID = 'npc-dialogue';
const MY_QUEST_WINDOW_ID = 'my-quest';
const HOT_KEY = 'quests';

/** `DivideStringByPixel(…, 160)`: about 30 characters of `g_hFont` fit 160 px. */
const S6_LINE_CHARS = 30;

const monsterName = (type: number) =>
  monsterDisplayName(type, t('quest.npcFallback', { type }));

const lineColor = (line: QuestRequirementLine) =>
  line.kind === 'header' ? COLOR.yellow : line.kind === 'request' ? (line.done ? COLOR.done : COLOR.missing) : COLOR.text;

/**
 * The tab and button art is fixed-width, so a translated label - `Job change`
 * is already wider than the small tab - has to be shrunk to fit; below
 * `TAB_LABEL_MIN_FONT_PX` a tab's CSS ellipsis cuts it.
 */
function fitFontSize(label: string, width: number): number {
  const fits = (width - TAB_LABEL_PADDING) / (label.length * TAB_LABEL_ADVANCE);
  return Math.max(TAB_LABEL_MIN_FONT_PX, Math.min(TAB_LABEL_FONT_PX, Math.floor(fits)));
}

const Line = ({
  y,
  text,
  color,
  bold,
  left,
}: {
  y: number;
  text: string;
  color: string;
  bold?: boolean;
  left?: number;
}) => (
  <div
    className={`quest-line${left !== undefined ? ' left' : ''}`}
    style={{ top: y, color, fontWeight: bold ? 'bold' : undefined, left }}
  >
    {text}
  </div>
);

const Separator = ({ y }: { y: number }) => (
  <MuSpriteFrame
    file={LINE_SPRITE}
    width={LINE.width}
    height={LINE.height}
    style={{ position: 'absolute', left: 1, top: y }}
  />
);

const ExitButton = ({ onClick }: { onClick: () => void }) => (
  <div className="quest-button" data-no-drag="true" style={{ left: EXIT_BUTTON.x, top: EXIT_BUTTON.y }}>
    <MuButton
      file={EXIT_SPRITE}
      width={EXIT_BUTTON.width}
      height={EXIT_BUTTON.height}
      frames={EXIT_FRAMES}
      onClick={onClick}
    />
  </div>
);

const RequirementList = ({ lines, top, height }: { lines: readonly QuestRequirementLine[]; top: number; height: number }) => (
  <>
    <div className="table-fill" style={{ left: 10, top, width: 171, height }} />
    <MuTableFrame left={10} top={top} width={171} height={height} />
    <div className="quest-list" data-no-drag="true" style={{ left: 14, top: top + 4, width: 163, height: height - 8 }}>
      {lines.length === 0 && (
        <div className="row" style={{ color: COLOR.tabOff, cursor: 'default' }}>
          {t('quest.waitingServer')}
        </div>
      )}
      {lines.map((line, i) => (
        <div key={i} className={`row${line.kind === 'header' ? ' header' : ''}`} style={{ color: lineColor(line), cursor: 'default' }}>
          {line.text}
        </div>
      ))}
    </div>
  </>
);

// ---- CNewUINPCQuest ---------------------------------------------------------

/**
 * `CNewUINPCQuest`: the legacy quest NPC's page. The NPC's lines are
 * centred in the 7-line box. In progress the answers follow them and the
 * item / kill list sits under the separator, over the Proceed button;
 * otherwise the answers sit under the separator and a zen box shows the
 * offering.
 */
const NpcQuestWindow = observer(() => {
  if (!legacyQuestWindowOpen()) return null;

  const index = legacyQuestCurrentIndex();
  const quest = questDefinition(index);
  const state = legacyQuestState(index);
  const lines = legacyQuestLines();
  const answers = legacyQuestAnswers();
  const needZen = legacyQuestNeedZen();
  const inProgress = state === LegacyQuestState.InProgress;
  // `QUEST_NO` is OpenMU's 3; None is a quest the list never named.
  const notStarted = state === LegacyQuestState.No || state === LegacyQuestState.None;

  const total = lines.length + answers.length;
  const textTop = NPC_TEXT_TOP + Math.floor(((NPC_LINES_MAX - total) * NPC_LINE_STEP) / 2);
  const answersTop = inProgress ? textTop + lines.length * NPC_LINE_STEP : NPC_ANSWERS_Y;

  // `RenderItemMobText` reads `GetKillMobCount`: the server's counts, not the tracker's.
  const objectives = inProgress ? legacyQuestObjectives(index, false) : [];
  const proceed = t('quest.proceed');

  return (
    <MuItemWindow id={NPC_WINDOW_ID} className="quest-window" column={1} onClose={closeLegacyQuestWindow}>
      <Line y={NPC_NAME_Y} text={quest ? monsterName(quest.npcType) : ''} color={COLOR.npcName} />
      <Line y={NPC_QUEST_TITLE_Y} text={quest?.name ?? ''} color={COLOR.questTitle} />
      <div className="head-close" data-no-drag="true" style={HEAD_CLOSE} onClick={uiClick(closeLegacyQuestWindow)} />

      <Separator y={NPC_LINE_Y} />

      {lines.map((line, i) => (
        <Line key={i} y={textTop + i * NPC_LINE_STEP} text={line} color={COLOR.text} />
      ))}

      {inProgress && (
        <>
          <Separator y={NPC_ING_LINE_Y} />
          {objectives.map((objective, i) => {
            const kills = objective.type === ConditionTypeEnum.MonsterKills;
            return (
              <Line
                key={i}
                y={NPC_OBJECTIVE_Y + i * NPC_OBJECTIVE_STEP}
                left={kills ? NPC_MONSTER_X : NPC_ITEM_X}
                text={
                  kills
                    ? `${objective.name}  ${objectiveProgress(objective)}`
                    : t('quest.reward.item', { name: objective.name, count: objective.required })
                }
                bold
                color={objectiveDone(objective) ? COLOR.done : COLOR.missing}
              />
            );
          })}
          <div
            className="quest-button"
            data-no-drag="true"
            style={{ left: NPC_COMPLETE_BUTTON.x, top: NPC_COMPLETE_BUTTON.y }}
          >
            <MuButton
              file={EMPTY_BUTTON_SPRITE}
              width={EMPTY_BUTTON.width}
              height={EMPTY_BUTTON.height}
              frames={EMPTY_BUTTON_FRAMES}
              label={proceed}
              color={COLOR.text}
              disabled={!legacyQuestCanComplete()}
              onClick={completeLegacyQuest}
              labelStyle={{ fontSize: fitFontSize(proceed, EMPTY_BUTTON.width), fontWeight: 'bold' }}
            />
          </div>
        </>
      )}

      {answers.map((answer, i) => (
        <div
          key={i}
          className="quest-answer"
          data-no-drag="true"
          style={{ top: answersTop + i * NPC_LINE_STEP, color: COLOR.answer }}
          onClick={() => answerLegacyQuest(i)}
        >
          {answer.text}
        </div>
      ))}

      {notStarted && needZen > 0 && (
        <>
          <MuSpriteFrame
            file={MONEY_SPRITE}
            width={MONEY_BOX.width}
            height={MONEY_BOX.height}
            style={{ position: 'absolute', left: MONEY_BOX.x, top: MONEY_BOX.y }}
          />
          <Line y={NPC_ZEN_TEXT_Y} left={20} text={t('common.zen')} bold color={COLOR.zenLabel} />
          <div
            className="quest-line"
            style={{ top: NPC_ZEN_TEXT_Y, left: 0, right: 20, textAlign: 'right', fontWeight: 'bold', color: COLOR.answer }}
          >
            {needZen.toLocaleString()}
          </div>
        </>
      )}

      <ExitButton onClick={closeLegacyQuestWindow} />
    </MuItemWindow>
  );
});

// ---- the NPC's quest list (CNewUINPCDialogue::ProcessQuestListReceive) ------

const QuestListDialog = observer(() => {
  if (!questListOpen()) return null;

  const entries = questListEntries();
  const busy = questProgressBusy();

  return (
    <MuItemWindow id={LIST_WINDOW_ID} className="quest-window" column={1} onClose={closeQuestList}>
      <div className="window-title" style={{ top: TITLE_Y, color: COLOR.title }}>
        {t('quest.tab.quest')}
      </div>
      <Line y={QP_NPC_NAME_Y} left={QP_TEXT_X} text={monsterName(questListNpcNumber())} bold color={COLOR.s6NpcName} />
      <div className="head-close" data-no-drag="true" style={HEAD_CLOSE} onClick={uiClick(closeQuestList)} />
      <Line y={QP_NPC_TEXT_Y} left={QP_TEXT_X} text={t('quest.whichQuest')} color={COLOR.text} />

      <Separator y={QP_NPC_TEXT_Y + QP_TEXT_GAP} />
      {entries.map((entry, i) => (
        <div
          key={entry.key}
          className={`quest-answer block${busy ? ' disabled' : ''}`}
          data-no-drag="true"
          style={{
            top: QP_NPC_TEXT_Y + QP_TEXT_GAP * 3 + i * QP_TEXT_GAP,
            left: 11,
            width: QP_ANSWER_WIDTH,
            color: COLOR.text,
            textAlign: 'left',
            fontWeight: 'normal',
          }}
          onClick={uiClick(() => selectQuest(entry.number, entry.group))}
        >
          {i + 1}.{entry.subject}
        </div>
      ))}

      <ExitButton onClick={closeQuestList} />
    </MuItemWindow>
  );
});

// ---- CNewUIQuestProgress ----------------------------------------------------

/**
 * `CNewUIQuestProgress`: the NPC's words paged seven lines at a time, then
 * the hero's answers, or - once the quest runs - the requirement / reward
 * list with the Complete button.
 */
const QuestProgressWindow = observer(() => {
  const [page, setPage] = useState(0);

  if (!questProgressOpen()) return null;

  const key = questProgressKey();
  const mode = questProgressMode();
  const npcLines = questProgressNpcLines().flatMap(l => wrapDialogText(l, 99, S6_LINE_CHARS));
  const maxPage = Math.max(0, Math.ceil(npcLines.length / QP_LINES_PER_PAGE) - 1);
  const shownPage = Math.min(page, maxPage);
  const pageLines = npcLines.slice(shownPage * QP_LINES_PER_PAGE, (shownPage + 1) * QP_LINES_PER_PAGE);
  const playerLines = questProgressPlayerLines()
    .flatMap(l => wrapDialogText(l, 2, S6_LINE_CHARS))
    .slice(0, 2);
  const answers = questProgressAnswers();
  const busy = questProgressBusy();
  const progress = questProgressOf(key);
  const npcName = questListNpcNumber()
    ? monsterName(questListNpcNumber())
    : t('quest.npc');

  const right = () => {
    if (shownPage < maxPage) setPage(shownPage + 1);
    else advanceQuestWords();
  };

  return (
    <MuItemWindow id={PROGRESS_WINDOW_ID} className="quest-window" column={1} onClose={closeQuestProgress}>
      <div className="window-title" style={{ top: TITLE_Y, color: COLOR.title }}>
        {t('quest.tab.quest')}
      </div>
      <Line y={QP_SUBJECT_Y} text={questSubject(key)} bold color={COLOR.subject} />
      <Line y={QP_NPC_NAME_Y} left={QP_TEXT_X} text={npcName} bold color={COLOR.s6NpcName} />
      <div className="head-close" data-no-drag="true" style={HEAD_CLOSE} onClick={uiClick(closeQuestProgress)} />

      {pageLines.map((line, i) => (
        <Line key={i} y={QP_NPC_TEXT_Y + i * QP_TEXT_GAP} left={QP_TEXT_X} text={line} color={COLOR.text} />
      ))}

      {shownPage > 0 && (
        <div className="quest-button" data-no-drag="true" style={{ left: PAGE_BUTTON_L_X, top: PAGE_BUTTON_Y }}>
          <MuButton
            file={PAGE_BUTTON_L}
            width={PAGE_BUTTON.width}
            height={PAGE_BUTTON.height}
            frames={PAGE_BUTTON_FRAMES}
            onClick={() => setPage(shownPage - 1)}
          />
        </div>
      )}
      {(shownPage < maxPage || mode === 'npcWords') && (
        <div className="quest-button" data-no-drag="true" style={{ left: PAGE_BUTTON_R_X, top: PAGE_BUTTON_Y }}>
          <MuButton
            file={PAGE_BUTTON_R}
            width={PAGE_BUTTON.width}
            height={PAGE_BUTTON.height}
            frames={PAGE_BUTTON_FRAMES}
            onClick={right}
          />
        </div>
      )}

      <Separator y={QP_LINE_Y} />

      {mode !== 'requestReward' && (
        <Line y={QP_PLAYER_NAME_Y} left={QP_TEXT_X} text={Store.playerData.name} bold color={COLOR.heroName} />
      )}

      {mode === 'playerWords' && (
        <>
          {playerLines.map((line, i) => (
            <Line key={i} y={QP_PLAYER_TEXT_Y + i * QP_TEXT_GAP} left={QP_TEXT_X} text={line} color={COLOR.text} />
          ))}
          {answers.map((answer, i) => (
            <div
              key={i}
              className={`quest-answer block${busy ? ' disabled' : ''}`}
              data-no-drag="true"
              style={{
                top: QP_ANSWERS_Y + i * QP_TEXT_GAP,
                left: 11,
                width: QP_ANSWER_WIDTH,
                color: COLOR.text,
                textAlign: 'left',
                fontWeight: 'normal',
              }}
              onClick={() => answerQuestStep(i)}
            >
              {answer}
            </div>
          ))}
        </>
      )}

      {mode === 'requestReward' && (
        <>
          <RequirementList lines={progress?.lines ?? []} top={QP_LIST_Y} height={QP_LIST_HEIGHT} />
          <div className="quest-button" data-no-drag="true" style={{ left: COMPLETE_BUTTON.x, top: COMPLETE_BUTTON.y }}>
            <MuButton
              file={EMPTY_BUTTON_SPRITE}
              width={EMPTY_BUTTON.width}
              height={EMPTY_BUTTON.height}
              frames={EMPTY_BUTTON_FRAMES}
              label={t('quest.complete')}
              color={COLOR.text}
              disabled={!progress?.complete || busy}
              onClick={() => completeQuest(key)}
              labelStyle={{ fontSize: 10, fontWeight: 'bold' }}
            />
          </div>
        </>
      )}
    </MuItemWindow>
  );
});

// ---- CNewUINPCDialogue ------------------------------------------------------

/**
 * `CNewUINPCDialogue`: the Season 6 NPC's talk. The NPC's words are paged
 * seven lines at a time above the separator; below it the answers (or, after
 * "Accept a quest.", the NPC's quest list) are paged eleven lines at a time,
 * each answer a block that lights up under the mouse (`RenderSelTextBlock`).
 */
const NpcDialogueWindow = observer(() => {
  const [npcPage, setNpcPage] = useState(0);
  const [selPage, setSelPage] = useState(0);

  if (!npcDialogueOpen()) return null;

  const npcLines = npcDialogueLines().flatMap(l => wrapDialogText(l, 99, ND_LINE_CHARS));
  const maxNpcPage = Math.max(0, Math.ceil(npcLines.length / ND_NPC_LINES_PER_PAGE) - 1);
  const shownNpcPage = Math.min(npcPage, maxNpcPage);
  const pageLines = npcLines.slice(shownNpcPage * ND_NPC_LINES_PER_PAGE, (shownNpcPage + 1) * ND_NPC_LINES_PER_PAGE);
  // `SetCurNPCWords`: the answers stay hidden until the last page of the words.
  const showAnswers = shownNpcPage === maxNpcPage;

  // `SetCurSelTexts` / `CalculateSelTextMaxPage`: two lines an answer, eleven a page.
  const answers = npcDialogueAnswers().map((a, index) => ({ index, lines: wrapDialogText(a.text, 2, ND_LINE_CHARS) }));
  const pages: (typeof answers)[] = [[]];
  let used = 0;
  for (const answer of answers) {
    if (used + answer.lines.length > ND_SEL_LINES_PER_PAGE && pages[pages.length - 1].length > 0) {
      pages.push([]);
      used = 0;
    }
    pages[pages.length - 1].push(answer);
    used += answer.lines.length;
  }
  const maxSelPage = pages.length - 1;
  const shownSelPage = Math.min(selPage, maxSelPage);
  const busy = npcDialogueBusy();
  const contribution = npcDialogueContribution();

  let blockY = ND_SEL_BLOCK_Y;
  const answerBlocks = pages[shownSelPage].map(answer => {
    const top = blockY;
    blockY += answer.lines.length * ND_TEXT_GAP;
    return { ...answer, top };
  });

  return (
    <MuItemWindow id={NPC_DIALOGUE_WINDOW_ID} className="quest-window" column={1} onClose={closeNpcDialogue}>
      <Line y={ND_NAME_Y} text={npcDialogueNpcName()} bold color={COLOR.npcName} />
      <div className="head-close" data-no-drag="true" style={HEAD_CLOSE} onClick={closeNpcDialogue} />

      {contribution !== null && (
        <>
          <div
            className="table-fill"
            style={{ left: ND_CONTRIBUTE_BOX.x, top: ND_CONTRIBUTE_BOX.y, width: ND_CONTRIBUTE_BOX.width, height: ND_CONTRIBUTE_BOX.height }}
          />
          <Line
            y={ND_CONTRIBUTE_Y}
            text={t('quest.contribution', { value: contribution.toLocaleString() })}
            color={COLOR.text}
          />
        </>
      )}

      {pageLines.map((line, i) => (
        <Line key={i} y={ND_NPC_TEXT_Y + i * ND_TEXT_GAP} left={ND_TEXT_X} text={line} color={COLOR.text} />
      ))}

      {shownNpcPage > 0 && (
        <div className="quest-button" data-no-drag="true" style={{ left: ND_PAGE_L_X, top: ND_NPC_PAGE_Y }}>
          <MuButton file={PAGE_BUTTON_L} width={PAGE_BUTTON.width} height={PAGE_BUTTON.height} frames={PAGE_BUTTON_FRAMES} onClick={() => setNpcPage(shownNpcPage - 1)} />
        </div>
      )}
      {shownNpcPage < maxNpcPage && (
        <div className="quest-button" data-no-drag="true" style={{ left: ND_PAGE_R_X, top: ND_NPC_PAGE_Y }}>
          <MuButton file={PAGE_BUTTON_R} width={PAGE_BUTTON.width} height={PAGE_BUTTON.height} frames={PAGE_BUTTON_FRAMES} onClick={() => setNpcPage(shownNpcPage + 1)} />
        </div>
      )}

      <Separator y={ND_LINE_Y} />

      {showAnswers &&
        answerBlocks.map(answer => (
          <div
            key={answer.index}
            className={`quest-answer block${busy ? ' disabled' : ''}`}
            data-no-drag="true"
            style={{
              top: answer.top,
              left: ND_SEL_X,
              width: ND_SEL_WIDTH,
              height: answer.lines.length * ND_TEXT_GAP,
              color: COLOR.text,
              textAlign: 'left',
              fontWeight: 'normal',
            }}
            onClick={() => answerNpcDialogue(answer.index)}
          >
            {answer.lines.map((line, i) => (
              <div key={i} style={{ position: 'absolute', left: ND_TEXT_X - ND_SEL_X, top: ND_SEL_TEXT_Y - ND_SEL_BLOCK_Y + i * ND_TEXT_GAP, whiteSpace: 'nowrap' }}>
                {line}
              </div>
            ))}
          </div>
        ))}

      {showAnswers && shownSelPage > 0 && (
        <div className="quest-button" data-no-drag="true" style={{ left: ND_PAGE_L_X, top: ND_SEL_PAGE_Y }}>
          <MuButton file={PAGE_BUTTON_L} width={PAGE_BUTTON.width} height={PAGE_BUTTON.height} frames={PAGE_BUTTON_FRAMES} onClick={() => setSelPage(shownSelPage - 1)} />
        </div>
      )}
      {showAnswers && shownSelPage < maxSelPage && (
        <div className="quest-button" data-no-drag="true" style={{ left: ND_PAGE_R_X, top: ND_SEL_PAGE_Y }}>
          <MuButton file={PAGE_BUTTON_R} width={PAGE_BUTTON.width} height={PAGE_BUTTON.height} frames={PAGE_BUTTON_FRAMES} onClick={() => setSelPage(shownSelPage + 1)} />
        </div>
      )}

      <ExitButton onClick={closeNpcDialogue} />
    </MuItemWindow>
  );
});

// ---- CNewUIMyQuestInfoWindow ------------------------------------------------

/** The label of one tab, shrunk to fit its sprite. */
const TabLabel = observer(({ tab }: { tab: (typeof TABS)[number] }) => {
  const label = t(tab.labelKey);
  return (
    <span style={{ top: TAB_LABEL_Y - TAB.y - 1, fontSize: fitFontSize(label, tab.width) }}>
      {label}
    </span>
  );
});

const TabStrip = observer(() => {
  const current = myQuestTab();
  return (
    <>
      <MuSpriteFrame
        file={TAB_STRIP_SPRITE}
        width={TAB.width}
        height={TAB.height}
        style={{ position: 'absolute', left: TAB.x, top: TAB.y }}
      />
      {TABS.map(tab => (
        <div
          key={tab.key}
          className="quest-tab"
          data-no-drag="true"
          style={{
            left: tab.x,
            top: TAB.y,
            width: tab.width,
            height: TAB.height,
            color: current === tab.key ? COLOR.tabOn : COLOR.tabOff,
          }}
          onClick={uiClick(() => selectMyQuestTab(tab.key as MyQuestTab))}
        >
          {current === tab.key && (
            <MuSpriteFrame
              file={tab.width > 48 ? TAB_BIG_SPRITE : TAB_SMALL_SPRITE}
              width={tab.width}
              height={TAB.height}
              style={{ position: 'absolute', left: 0, top: 0 }}
            />
          )}
          <TabLabel tab={tab} />
        </div>
      ))}
    </>
  );
});

/** The Quest tab: running quests, the selected one's summary, Open / Give up. */
const QuestTab = observer(() => {
  const active = activeQuests();
  const selected = myQuestSelectedKey();
  const summary = selected ? questSummaryLines(selected).flatMap(l => wrapDialogText(l, 99, S6_LINE_CHARS)) : [];
  const progress = selected ? questProgressOf(selected) : undefined;

  return (
    <>
      <div className="table-fill" style={{ left: 10, top: MQ_LIST_Y, width: 171, height: MQ_LIST_HEIGHT }} />
      <MuTableFrame left={10} top={MQ_LIST_Y} width={171} height={MQ_LIST_HEIGHT} />
      {active.length === 0 ? (
        <Line y={MQ_MESSAGE_Y} left={23} text={myQuestEmptyMessage()} bold color={COLOR.yellow} />
      ) : (
        <div
          className="quest-list"
          data-no-drag="true"
          style={{ left: 14, top: MQ_LIST_Y + 4, width: 163, height: MQ_LIST_HEIGHT - 8 }}
        >
          {active.map((key, i) => (
            <div
              key={key}
              className={`row${selected === key ? ' selected' : ''}`}
              style={{ color: COLOR.text }}
              onClick={uiClick(() => selectMyQuest(key))}
            >
              {i + 1}.{questSubject(key)}
            </div>
          ))}
        </div>
      )}

      <Separator y={MQ_LINE_Y} />

      <div className="table-fill" style={{ left: 10, top: MQ_SUMMARY_Y, width: 171, height: MQ_SUMMARY_HEIGHT }} />
      <MuTableFrame left={10} top={MQ_SUMMARY_Y} width={171} height={MQ_SUMMARY_HEIGHT} />
      <div
        className="quest-list"
        data-no-drag="true"
        style={{ left: 14, top: MQ_SUMMARY_Y + 4, width: 163, height: MQ_SUMMARY_HEIGHT - 8 }}
      >
        {summary.map((line, i) => (
          <div key={`s${i}`} className="row" style={{ color: COLOR.text, cursor: 'default' }}>
            {line}
          </div>
        ))}
        {progress?.lines.map((line, i) => (
          <div
            key={`p${i}`}
            className={`row${line.kind === 'header' ? ' header' : ''}`}
            style={{ cursor: 'default', color: lineColor(line) }}
          >
            {line.text}
          </div>
        ))}
      </div>

      <div className="quest-button" data-no-drag="true" style={{ left: OPEN_BUTTON.x, top: OPEN_BUTTON.y }}>
        <MuButton
          file={OPEN_BUTTON_SPRITE}
          width={OPEN_BUTTON.width}
          height={OPEN_BUTTON.height}
          frames={SMALL_BUTTON_FRAMES}
          // The original opens only `IsQuestByEtc` (uiType 1) quests here. Every
          // OpenMU quest is uiType 0, and its NPC stops listing it once out-levelled.
          disabled={!selected}
          onClick={openSelectedQuest}
        />
      </div>
      <div className="quest-button" data-no-drag="true" style={{ left: GIVEUP_BUTTON.x, top: GIVEUP_BUTTON.y }}>
        <MuButton
          file={GIVEUP_BUTTON_SPRITE}
          width={GIVEUP_BUTTON.width}
          height={GIVEUP_BUTTON.height}
          frames={SMALL_BUTTON_FRAMES}
          disabled={!selected}
          onClick={() => askGiveUp(selected)}
        />
      </div>
    </>
  );
});

/**
 * The Job change tab (`RenderJobChangeContents` / `RenderJobChangeState`):
 * the chain quest's title and the page `ShowQuestPreviewWindow` picks for
 * it, then the state of the quest the NPC window is on.
 */
const JobChangeTab = observer(() => {
  if (!legacyQuestListReceived()) {
    return (
      <>
        <Line y={MQ_JOB_TEXT_Y} text={t('quest.waitingServer')} color={COLOR.tabOff} />
        <Separator y={MQ_JOB_LINE_Y} />
      </>
    );
  }

  const state = legacyQuestState(legacyQuestCurrentIndex());
  const stateText =
    state === LegacyQuestState.Finished
      ? t('quest.completed')
      : state === LegacyQuestState.InProgress
        ? t('quest.inProgress')
        : t('quest.notStarted');

  return (
    <>
      <Line y={MQ_JOB_TITLE_Y} text={legacyQuestWindowTitle()} bold color={COLOR.subject} />
      {legacyQuestPreviewLines().map((line, i) => (
        <Line key={i} y={MQ_JOB_TEXT_Y + i * MQ_JOB_TEXT_STEP} text={line} color={COLOR.tabOn} />
      ))}
      <Separator y={MQ_JOB_LINE_Y} />
      <Line y={MQ_JOB_STATE_Y} left={23} text={stateText} bold color={COLOR.yellow} />
    </>
  );
});

/** `RenderCastleInfo` / `RenderTempleInfo`: no siege or temple data is served yet. */
const CastleTempleTab = () => (
  <>
    <Separator y={210} />
    <Line y={105} text={t('quest.castleSiege')} bold color={COLOR.yellow} />
    <Line y={125} text={t('quest.noSiegeInfo')} color={COLOR.tabOn} />
    <Line y={285} text={t('quest.illusionTemple')} bold color={COLOR.yellow} />
    <Line y={305} text={t('quest.noTempleInfo')} color={COLOR.tabOn} />
  </>
);

/** `CNewUIMyQuestInfoWindow` (T): the quest log with its three tabs. */
const MyQuestInfoWindow = observer(() => {
  useEventBus('keyPressed', key => {
    if (isKey(HOT_KEY, key) && Store.world?.playerEntity) quests.toggleLog();
    if (key === 'Escape' && quests.anyWindowOpen) quests.closeAll();
  });

  if (!myQuestWindowOpen()) return null;

  const tab = myQuestTab();

  return (
    <MuItemWindow id={MY_QUEST_WINDOW_ID} className="quest-window" column={2} onClose={() => showMyQuestWindow(false)}>
      <div className="window-title" style={{ top: TITLE_Y, color: COLOR.title }}>
        {t('quest.tab.quest')}
      </div>
      <div className="head-close" data-no-drag="true" style={HEAD_CLOSE} onClick={uiClick(() => showMyQuestWindow(false))} />
      <TabStrip />
      {tab === 'quest' && <QuestTab />}
      {tab === 'jobChange' && <JobChangeTab />}
      {tab === 'castleTemple' && <CastleTempleTab />}
      <ExitButton onClick={() => showMyQuestWindow(false)} />
    </MuItemWindow>
  );
});

// ---- CQuestGiveUpMsgBoxLayout -----------------------------------------------

/** The quest the give-up box asks about; 0 while it is not up. */
const giveUp = observable({ key: 0 });

function askGiveUp(key: number): void {
  runInAction(() => (giveUp.key = key));
}

/** OK sends `SendQuestCancelRequest`, Cancel only drops the box. */
function answerGiveUp(ok: boolean): void {
  const key = giveUp.key;
  runInAction(() => (giveUp.key = 0));
  if (ok) cancelQuest(key);
}

/**
 * `CQuestGiveUpMsgBoxLayout`: a modal `CNewUICommonMessageBox` over the log,
 * Enter for OK and Escape for Cancel. The frame grows a middle slice for
 * every line past two, so the text is laid out first and its lines counted.
 */
const GiveUpPrompt = observer(() => {
  const open = myQuestWindowOpen();
  const key = open ? giveUp.key : 0;
  const text = t('quest.giveUpConfirm');
  const textRef = useRef<HTMLDivElement>(null);
  const [textLines, setTextLines] = useState(MSGBOX_FRAME_LINES);

  useEffect(() => {
    if (!open) answerGiveUp(false);
  }, [open]);

  useLayoutEffect(() => {
    const height = textRef.current?.scrollHeight;
    if (height) setTextLines(Math.max(1, Math.round(height / MSGBOX_LINE_STEP)));
  }, [key, text]);

  // Captured ahead of the game's own keyboard handler, which would close the log on Escape.
  useEffect(() => {
    if (!key) return;
    const handler = (e: KeyboardEvent) => {
      if (e.isComposing || (e.key !== 'Enter' && e.key !== 'Escape')) return;
      e.preventDefault();
      e.stopPropagation();
      playUiSound('click');
      answerGiveUp(e.key === 'Enter');
    };
    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, [key]);

  if (!key) return null;

  const middle = Math.max(0, textLines - MSGBOX_FRAME_LINES);
  const buttonTop = msgBoxHeight(middle) - MSGBOX_BUTTON_BOTTOM;

  return (
    <div className="quest-prompt-layer">
      <MsgBoxFrame lines={middle} className="quest-prompt">
        <div
          ref={textRef}
          className="quest-prompt-text"
          style={{ left: MSGBOX_TEXT_X, top: MSGBOX_TEXT_TOP, width: MSGBOX_TEXT_WIDTH, lineHeight: `${MSGBOX_LINE_STEP}px` }}
        >
          {text}
        </div>
        <MuButton
          file={MSGBOX_OK_SPRITE}
          width={MSGBOX_BUTTON.width}
          height={MSGBOX_BUTTON.height}
          frames={MSGBOX_BUTTON_FRAMES}
          onClick={() => answerGiveUp(true)}
          style={{ position: 'absolute', left: MSGBOX_OK_X, top: buttonTop }}
        />
        <MuButton
          file={MSGBOX_CANCEL_SPRITE}
          width={MSGBOX_BUTTON.width}
          height={MSGBOX_BUTTON.height}
          frames={MSGBOX_BUTTON_FRAMES}
          onClick={() => answerGiveUp(false)}
          style={{ position: 'absolute', left: MSGBOX_CANCEL_X, top: buttonTop }}
        />
      </MsgBoxFrame>
    </div>
  );
});

export { QuestTracker } from './tracker';

/** Every quest window; one line in `worldPage/index.tsx`. */
export const QuestWindows = () => (
  <>
    <NpcQuestWindow />
    <NpcDialogueWindow />
    <QuestListDialog />
    <QuestProgressWindow />
    <MyQuestInfoWindow />
    <GiveUpPrompt />
  </>
);
