import './style.less';
import { observer } from 'mobx-react-lite';
import { Store } from '../../../../../store';
import { Social } from '../../../../../social';
import { ENUM_WORLD } from '../../../../../common/types';
import { guildMarkDataUrl } from '../../../../../common/guildMark';
import { MuSpriteFrame } from '../../../../components/muSprite';
import { MuText } from '../../../../components/muText';
import {
  useUiStageScale,
  UI_STAGE_HEIGHT,
  UI_STAGE_WIDTH,
} from '../../../../components/uiStage';

/**
 * `CNewUIBattleSoccerScore` (NewUIBattleSoccerScore.cpp) - the Battle Soccer
 * scoreboard: `newui_Figure_ground` 131x70 at (509, 359), a goals / mark /
 * name row per team at (30, 33) and 22 px lower, red team in (255,60,0) and
 * blue in (0,150,255) on black(128). The remaining match time
 * (GuildSoccerTimeUpdate) is the clock line the figure's head area holds.
 */

const PANEL = { x: 509, y: 359, width: 131, height: 70 };
const ROW_X = 30;
const ROW_Y = 33;
const ROW_STEP = 22;
const MARK_X = 21;
const NAME_X = 33;
const MARK_PX = 8;
const CLOCK_Y = 12;
const RED = 'rgb(255,60,0)';
const BLUE = 'rgb(0,150,255)';
const CLOCK_COLOR = 'rgb(255,150,0)';
/** `SetBgColor(0, 0, 0, 128)`. */
const TEXT_BG = 'rgba(0,0,0,0.5)';

const SPRITE = 'newui_Figure_ground.OZT';

/** `FindGuildMark`: the mark table by name; the viewport may not have it yet. */
function logoOf(name: string): number[] | null {
  for (const guild of Store.guilds.values()) {
    if (guild.name === name) return guild.logo;
  }
  return null;
}

function clock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

const TeamRow = ({
  goals,
  name,
  color,
  top,
}: {
  goals: number;
  name: string;
  color: string;
  top: number;
}) => {
  const logo = logoOf(name);
  return (
    <div className="soccer-row" style={{ left: ROW_X, top }}>
      <MuText
        face="bold"
        text={String(goals)}
        color={color}
        background={TEXT_BG}
        className="soccer-goals"
      />
      {logo && (
        <img
          className="soccer-mark"
          src={guildMarkDataUrl(logo)}
          width={MARK_PX}
          height={MARK_PX}
          alt=""
          style={{ left: MARK_X }}
        />
      )}
      <MuText
        face="bold"
        text={name}
        color={color}
        background={TEXT_BG}
        className="soccer-name"
        style={{ left: NAME_X }}
      />
    </div>
  );
};

export const SoccerScoreHud = observer(() => {
  // Read the observable before the map check so the mount reacts to it.
  const match = Social.battleSoccer;
  const scale = useUiStageScale();
  if (!match || Store.world?.mapIndex !== ENUM_WORLD.WD_6STADIUM) return null;

  const offsetX = (window.innerWidth - UI_STAGE_WIDTH * scale) / 2;
  const offsetY = (window.innerHeight - UI_STAGE_HEIGHT * scale) / 2;

  return (
    <MuSpriteFrame
      file={SPRITE}
      width={PANEL.width}
      height={PANEL.height}
      className="soccer-score"
      style={{
        left: offsetX + PANEL.x * scale,
        top: offsetY + PANEL.y * scale,
        transform: `scale(${scale})`,
      }}
    >
      {match.seconds >= 0 && (
        <MuText
          face="bold"
          text={clock(match.seconds)}
          color={CLOCK_COLOR}
          background={TEXT_BG}
          className="soccer-clock"
          style={{ top: CLOCK_Y }}
        />
      )}
      <TeamRow goals={match.redGoals} name={match.redTeam} color={RED} top={ROW_Y} />
      <TeamRow
        goals={match.blueGoals}
        name={match.blueTeam}
        color={BLUE}
        top={ROW_Y + ROW_STEP}
      />
    </MuSpriteFrame>
  );
});
