import './style.less';
import { useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { t } from '../../../../../i18n';
import { events } from '../../../../../events';
import {
  duelBars,
  duelRequest,
  duelResult,
  duelScoreboard,
  duelSpectators,
  duelWatchWindow,
} from '../../../../../events/duel';
import { DUEL_CHANNELS } from '../../../../../events/duelRules';
import { MuButton } from '../../../../components/muButton';
import { MuSpriteFrame } from '../../../../components/muSprite';
import { MuItemWindow } from '../../../../components/muWindow';
import {
  useUiStageScale,
  UI_STAGE_HEIGHT,
  UI_STAGE_WIDTH,
} from '../../../../components/uiStage';
import { TEXT_COLOR } from '../../../serversPage/layout';
import {
  BACK_SPRITE as MSG_BACK_SPRITE,
  BTN_BOTH_CANCEL_X,
  BTN_BOTH_OK_X,
  BTN_HEIGHT as MSG_BTN_HEIGHT,
  BTN_WIDTH as MSG_BTN_WIDTH,
  BTN_Y as MSG_BTN_Y,
  CANCEL_SPRITE,
  OK_SPRITE,
  WIN_HEIGHT as MSG_HEIGHT,
  WIN_WIDTH as MSG_WIDTH,
} from '../../../../components/msgWindow/layout';
import {
  BAR_BACK,
  BAR_EXIT,
  BAR_EXIT_SPRITE,
  BAR_NAME1_X,
  BAR_NAME2_X,
  BAR_NAME_WIDTH,
  BAR_NAME_Y,
  BAR_Y,
  HEAD_CLOSE,
  HP1,
  HP2,
  HP_COLOR,
  PIP,
  PIP1_X,
  PIP2_X,
  PIP_SPRITE,
  PIP_STEP,
  SCORE,
  SCORE_ENEMY_COLOR,
  SCORE_ENEMY_Y,
  SCORE_HERO_COLOR,
  SCORE_HERO_Y,
  SCORE_NAME_WIDTH,
  SCORE_NAME_X,
  SCORE_SPRITE,
  SCORE_VALUE_WIDTH,
  SCORE_VALUE_X,
  SD1,
  SD2,
  SD_COLOR,
  SPECTATOR_LIST_BOTTOM,
  SPECTATOR_LIST_X,
  SPECTATOR_ROW,
  WATCH_BUTTON,
  WATCH_BUTTON_SPRITE,
  WATCH_BUTTON_X,
  WATCH_BUTTON_OFFSET,
  WATCH_HEAD_COLOR,
  WATCH_HEAD_OFFSET,
  WATCH_NAMES_OFFSET,
  WATCH_ROWS_Y,
  WATCH_ROW_STEP,
  WATCH_TITLE_Y,
  WATCH_VS_COLOR,
} from './layout';

/**
 * Everything the duel draws: the challenge prompt, the duelist score panel,
 * the Titus channel window, the spectator bar + name list and the winner
 * box. Render-only: state lives in `events/duel.ts`, commands go through
 * the `events` facade.
 */

/** Places a 640x480-stage rectangle on the window, scaled like the sheets. */
function useStage() {
  const scale = useUiStageScale();
  const offsetX = (window.innerWidth - UI_STAGE_WIDTH * scale) / 2;
  const offsetY = (window.innerHeight - UI_STAGE_HEIGHT * scale) / 2;
  return {
    scale,
    at: (x: number, y: number) => ({
      left: offsetX + x * scale,
      top: offsetY + y * scale,
      transform: `scale(${scale})`,
    }),
  };
}

// ---- the challenge prompt --------------------------------------------------

/** `CDuelMsgBoxLayout`: Enter accepts, Escape refuses. */
const DuelPrompt = observer(() => {
  const request = duelRequest();
  const text = request ? t('duel.request', { name: request.requesterName }) : '';

  useEffect(() => {
    if (!text) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Enter') events.answerDuelRequest(true);
      else if (e.key === 'Escape') events.answerDuelRequest(false);
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  if (!text) return null;

  return (
    <div className="duel-prompt-layer">
      <MuSpriteFrame
        file={MSG_BACK_SPRITE}
        width={MSG_WIDTH}
        height={MSG_HEIGHT}
        className="duel-prompt"
      >
        <div className="duel-prompt-text">{text}</div>
        <MuButton
          file={OK_SPRITE}
          width={MSG_BTN_WIDTH}
          height={MSG_BTN_HEIGHT}
          frames={{ up: 0, active: 1, down: 2 }}
          color={TEXT_COLOR.brightGray}
          activeColor={TEXT_COLOR.white}
          onClick={() => events.answerDuelRequest(true)}
          style={{ position: 'absolute', left: BTN_BOTH_OK_X, top: MSG_BTN_Y }}
        />
        <MuButton
          file={CANCEL_SPRITE}
          width={MSG_BTN_WIDTH}
          height={MSG_BTN_HEIGHT}
          frames={{ up: 0, active: 1, down: 2 }}
          color={TEXT_COLOR.brightGray}
          activeColor={TEXT_COLOR.white}
          onClick={() => events.answerDuelRequest(false)}
          style={{ position: 'absolute', left: BTN_BOTH_CANCEL_X, top: MSG_BTN_Y }}
        />
      </MuSpriteFrame>
    </div>
  );
});

// ---- the duelist score panel -----------------------------------------------

/** `CNewUIDuelWindow::RenderContents`: hero line blue, enemy line red. */
const DuelScorePanel = observer(() => {
  const duel = duelScoreboard();
  const stage = useStage();
  if (!duel || duel.watching) return null;

  const line = (y: number, color: string, score: number, name: string) => (
    <>
      <div
        className="duel-score-line"
        style={{ left: SCORE_VALUE_X, top: y, width: SCORE_VALUE_WIDTH, color }}
      >
        {score}
      </div>
      <div
        className="duel-score-line"
        style={{ left: SCORE_NAME_X, top: y, width: SCORE_NAME_WIDTH, color }}
      >
        {name}
      </div>
    </>
  );

  return (
    <MuSpriteFrame
      file={SCORE_SPRITE}
      width={SCORE.width}
      height={SCORE.height}
      className="duel-score"
      style={stage.at(SCORE.x, SCORE.y)}
    >
      {line(SCORE_HERO_Y, SCORE_HERO_COLOR, duel.score1, duel.side1.name)}
      {line(SCORE_ENEMY_Y, SCORE_ENEMY_COLOR, duel.score2, duel.side2.name)}
    </MuSpriteFrame>
  );
});

// ---- the Titus channel window ----------------------------------------------

/** `CNewUIDuelWatchWindow`: four channel blocks, a join button each. */
const DuelWatchWindow = observer(() => {
  const w = duelWatchWindow();
  if (!w.open) return null;

  const close = () => events.closeAll();

  return (
    <MuItemWindow id="duel-watch" className="duel-watch" label={t('duel.watchTitle')} onClose={close}>
      <div className="duel-watch-title" style={{ top: WATCH_TITLE_Y }}>
        {t('duel.watchTitle')}
      </div>
      <div className="head-close" data-no-drag="true" style={HEAD_CLOSE} onClick={close} />

      {Array.from({ length: DUEL_CHANNELS }, (_, i) => {
        const channel = w.channels[i];
        const y = WATCH_ROWS_Y + i * WATCH_ROW_STEP;
        const joinable = !!channel && channel.running && channel.open;
        return (
          <div key={i}>
            <div
              className="duel-watch-line"
              style={{ top: y + WATCH_HEAD_OFFSET, color: WATCH_HEAD_COLOR, fontWeight: 'bold' }}
            >
              {t('duel.channel', { number: i + 1 })}
            </div>
            {channel?.running ? (
              <div className="duel-watch-line" style={{ top: y + WATCH_NAMES_OFFSET }}>
                {channel.name1}{' '}
                <span style={{ color: WATCH_VS_COLOR }}>{t('duel.vs')}</span>{' '}
                {channel.name2}
              </div>
            ) : (
              <div className="duel-watch-line" style={{ top: y + WATCH_NAMES_OFFSET }}>
                {t('duel.emptyChannel')}
              </div>
            )}
            <div
              className="duel-watch-button"
              data-no-drag="true"
              style={{ left: WATCH_BUTTON_X, top: y + WATCH_BUTTON_OFFSET }}
            >
              <MuButton
                file={WATCH_BUTTON_SPRITE}
                width={WATCH_BUTTON.width}
                height={WATCH_BUTTON.height}
                frames={{ up: 0, active: 1, down: 2 }}
                label={t('duel.join')}
                disabled={!joinable}
                color={joinable ? 'rgb(255,255,255)' : 'rgb(100,100,100)'}
                onClick={() => events.joinDuelChannel(i)}
                labelStyle={{ fontSize: 10 }}
              />
            </div>
          </div>
        );
      })}
    </MuItemWindow>
  );
});

// ---- the spectator bar + name list -----------------------------------------

/** `CNewUIDuelWatchMainFrameWindow`: names, score pips, HP/SD gauges, exit. */
const DuelSpectatorBar = observer(() => {
  const duel = duelScoreboard();
  const bars = duelBars();
  const stage = useStage();
  if (!duel || !duel.watching) return null;

  const gauge = (
    box: { left?: number; right?: number; width: number; y: number; height: number },
    percent: number,
    color: string
  ) => {
    const width = (box.width * Math.max(0, Math.min(100, percent))) / 100;
    const left = box.right !== undefined ? box.right - width : (box.left ?? 0);
    return (
      <div
        className="duel-bar-gauge"
        style={{ left, top: box.y, width, height: box.height, background: color }}
      />
    );
  };

  return (
    <div className="duel-bar" style={stage.at(0, BAR_Y)}>
      {BAR_BACK.map(part => (
        <MuSpriteFrame
          key={part.sprite}
          file={part.sprite}
          width={part.width}
          height={51}
          className="duel-bar-back"
          style={{ left: part.x }}
        />
      ))}

      {bars && (
        <>
          {gauge(HP1, bars.hp1, HP_COLOR)}
          {gauge(HP2, bars.hp2, HP_COLOR)}
          {gauge(SD1, bars.sd1, SD_COLOR)}
          {gauge(SD2, bars.sd2, SD_COLOR)}
        </>
      )}

      {Array.from({ length: duel.score1 }, (_, i) => (
        <MuSpriteFrame
          key={`p1-${i}`}
          file={PIP_SPRITE}
          width={PIP.width}
          height={PIP.height}
          className="duel-bar-back"
          style={{ left: PIP1_X + i * PIP_STEP, top: PIP.y }}
        />
      ))}
      {Array.from({ length: duel.score2 }, (_, i) => (
        <MuSpriteFrame
          key={`p2-${i}`}
          file={PIP_SPRITE}
          width={PIP.width}
          height={PIP.height}
          className="duel-bar-back"
          style={{ left: PIP2_X - i * PIP_STEP, top: PIP.y }}
        />
      ))}

      <div
        className="duel-bar-name"
        style={{ left: BAR_NAME1_X, top: BAR_NAME_Y, width: BAR_NAME_WIDTH }}
      >
        {duel.side1.name}
      </div>
      <div
        className="duel-bar-name"
        style={{ left: BAR_NAME2_X, top: BAR_NAME_Y, width: BAR_NAME_WIDTH }}
      >
        {duel.side2.name}
      </div>

      <div
        className="duel-bar-exit"
        style={{ left: BAR_EXIT.x, top: BAR_EXIT.y - BAR_Y }}
        title={t('duel.leaveWatch')}
      >
        <MuButton
          file={BAR_EXIT_SPRITE}
          width={BAR_EXIT.width}
          height={BAR_EXIT.height}
          frames={{ up: 0, active: 1, down: 2 }}
          onClick={() => events.quitDuelChannel()}
        />
      </div>
    </div>
  );
});

/** `CNewUIDuelWatchUserListWindow`: name rows stacked upward. */
const DuelSpectatorList = observer(() => {
  const duel = duelScoreboard();
  const spectators = duelSpectators();
  const stage = useStage();
  if (!duel || !duel.watching || spectators.length === 0) return null;

  return (
    <div className="duel-spectators" style={stage.at(SPECTATOR_LIST_X, 0)}>
      {spectators.map((name, i) => (
        <div
          key={name}
          className="duel-spectator-row"
          style={{
            left: 0,
            top: SPECTATOR_LIST_BOTTOM - (SPECTATOR_ROW.height + 1) * (i + 1),
            width: SPECTATOR_ROW.width,
            height: SPECTATOR_ROW.height,
            lineHeight: `${SPECTATOR_ROW.height}px`,
          }}
        >
          {name}
        </div>
      ))}
    </div>
  );
});

// ---- the winner box ---------------------------------------------------------

/** `CDuelResultMsgBox`: one line, self-clearing (events/duel.ts counts). */
const DuelResultBox = observer(() => {
  const result = duelResult();
  const stage = useStage();
  if (!result) return null;
  return (
    <div
      className="duel-result"
      style={{
        ...stage.at(UI_STAGE_WIDTH / 2, 150),
        transform: `${stage.at(0, 0).transform} translateX(-50%)`,
      }}
    >
      {t('duel.wins', { winner: result.winner, loser: result.loser })}
    </div>
  );
});

// ---- the one line the world page mounts -------------------------------------

export const DuelWindows = observer(() => (
  <>
    <DuelPrompt />
    <DuelScorePanel />
    <DuelWatchWindow />
    <DuelSpectatorBar />
    <DuelSpectatorList />
    <DuelResultBox />
  </>
));
