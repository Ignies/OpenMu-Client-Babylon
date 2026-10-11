import './style.less';
import { observer } from 'mobx-react-lite';
import { Social } from '@/modules/social/social';
import { isOn } from '@/controllers/fidelity';
import { t } from '@/i18n';
import { MuText } from '@/controllers/interface/components/mu_text';
import { DEFAULT_SCALE } from '@/controllers/interface/windowManager';
import { UI_STAGE_HEIGHT } from '@/controllers/interface/components/ui_stage';

/**
 * `RenderTournamentInterface` (ZzzInterface.cpp:3740-3790): the match time (`g_wtMatchTimeLeft`,
 * F3 22) in the big face at the centre, y = 350, while it is not 0 and at most 10 minutes: red,
 * yellow under a minute, then the same line in white 1 px right and down. Type 3 ("It will start
 * after") never comes: OpenMU sends no type byte. Centred on the whole stage (our windows do not
 * narrow it as `GetScreenWidth` does). soccerBoardClock moves the time onto the scoreboard.
 */

const Y = 350;
const RED = 'rgb(255,10,10)';
const YELLOW = 'rgb(255,255,10)';
const WHITE = 'rgb(255,255,255)';

export const MatchTime = observer(() => {
  const time = Social.soccerSeconds;
  if (time <= 0 || isOn('soccerBoardClock')) return null;
  const min = Math.floor(time / 60);
  const sec = time % 60;
  if (min > 10) return null;
  // GlobalText 1390 / 1391.
  const text = t(sec < 10 ? 'matchTime.padded' : 'matchTime.plain', { min, sec });

  return (
    <div className="match-time" style={{ top: `${(Y / UI_STAGE_HEIGHT) * 100}%` }}>
      <div
        className="match-time-line"
        style={{ transform: `scale(${DEFAULT_SCALE})`, transformOrigin: 'center top' }}
      >
        <MuText face="big" text={text} color={time < 60 ? YELLOW : RED} />
        <MuText face="big" text={text} color={WHITE} className="match-time-front" />
      </div>
    </div>
  );
});
