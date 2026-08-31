import { MuButton } from '../../components/muButton';
import { MuSpriteFrame } from '../../components/muSprite';
import {
  GAUGE_HEIGHT,
  GAUGE_OFFSET_X,
  GAUGE_OFFSET_Y,
  GAUGE_WIDTH,
  SERVER_BTN_HEIGHT,
  SERVER_BTN_WIDTH,
  SPRITE,
  TEXT_COLOR,
} from './layout';

interface ServerItemProps {
  name: string;
  load: number;
  top: number;
  onClick?: () => void;
}

export const ServerItem = ({ name, load, top, onClick }: ServerItemProps) => {
  const filled = Math.max(0, Math.min(100, load));

  const full = filled >= 100;

  return (
    <MuButton
      file={SPRITE.serverButton}
      width={SERVER_BTN_WIDTH}
      height={SERVER_BTN_HEIGHT}
      frames={{ up: 0, active: 1, down: 2 }}
      color={TEXT_COLOR.brightGray}
      activeColor={TEXT_COLOR.white}
      disabled={full}
      onClick={onClick}
      style={{ position: 'absolute', left: 0, top }}
      labelStyle={{
        alignItems: 'flex-start',
        paddingTop: 3,
        fontSize: 11,
        textShadow: '1px 1px 0 rgba(0, 0, 0, 0.85)',
      }}
      label={name}
    >
      <div
        style={{
          position: 'absolute',
          left: GAUGE_OFFSET_X,
          top: GAUGE_OFFSET_Y,
          width: GAUGE_WIDTH,
          height: GAUGE_HEIGHT,
          background: 'rgba(0, 0, 0, 0.55)',
          overflow: 'hidden',
        }}
      >
        <MuSpriteFrame
          file={SPRITE.gauge}
          width={GAUGE_WIDTH}
          height={GAUGE_HEIGHT}
          style={{
            clipPath: `inset(0 ${100 - filled}% 0 0)`,
          }}
        />
      </div>
    </MuButton>
  );
};
