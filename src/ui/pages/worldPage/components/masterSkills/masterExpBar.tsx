import './style.less';
import { observer } from 'mobx-react-lite';
import { MuSpriteFrame } from '../../../../components/muSprite';
import { MuNumber } from '../../../../components/muNumber';
import { skills } from '../../../../../skills';
import { MASTER_EXP_SUB_BARS } from '../../../../../skills/masterLevel';
import { formatMasterText, MASTER_TEXT } from '../../../../../skills/masterTree';

/**
 * `CNewUIMainFrameWindow::RenderExperience`, master branch: once the hero is
 * levelling as a master the bar at the bottom fills with `Exbar_Master` from
 * the level's base experience, in ten sub-bars, and the number at the right
 * end counts the filled ones. Drawn inside the bottom bar, over the regular
 * bar, in its local coordinates (bar top = 429 on the 480 screen).
 */

const BOTTOM_BAR_TOP = 480 - 51;
const local = (screenY: number) => screenY - BOTTOM_BAR_TOP;

const FILL_SPRITE = 'Exbar_Master.OZJ';
const EXP_X = 2;
const EXP_Y = local(473);
const EXP_WIDTH = 629;
const EXP_HEIGHT = 4;
const EXP_NUMBER_X = 635;
const EXP_NUMBER_Y = local(469);

export const MasterExpBar = observer(() => {
  if (!skills.inMasterProgression) return null;

  const progress = skills.masterExpPercent;
  const { current, next } = skills.masterExperience;

  return (
    <>
      <MuSpriteFrame
        file={FILL_SPRITE}
        className="master-exp-fill"
        title={formatMasterText(MASTER_TEXT.expTip, current, next)}
        style={{
          left: EXP_X,
          top: EXP_Y,
          width: Math.round(progress * EXP_WIDTH),
          height: EXP_HEIGHT,
          backgroundSize: '100% 100%',
        }}
      />
      <MuNumber
        value={Math.trunc(progress * MASTER_EXP_SUB_BARS)}
        x={EXP_NUMBER_X}
        y={EXP_NUMBER_Y}
      />
    </>
  );
});
