import { MuSpriteFrame } from '../../components/muSprite';
import {
  DESC_EDGE_HEIGHT,
  DESC_HEIGHT,
  DESC_SIDE_HEIGHT,
  DESC_WIDTH,
  DESC_X,
  DESC_Y,
  SPRITE,
  TEXT_COLOR,
} from './layout';

type DescriptionBarProps = {
  text?: string;
};

export const DescriptionBar = ({ text }: DescriptionBarProps) => (
  <div
    style={{
      position: 'absolute',
      left: DESC_X,
      top: DESC_Y,
      width: DESC_WIDTH,
      height: DESC_HEIGHT,
    }}
  >
    {}
    <MuSpriteFrame
      file={SPRITE.descFill}
      width={DESC_WIDTH - 6}
      height={DESC_HEIGHT - 6}
      style={{
        position: 'absolute',
        left: 3,
        top: 3,
        backgroundRepeat: 'repeat',
      }}
    />

    <MuSpriteFrame
      file={SPRITE.descSide}
      x={0}
      width={3}
      height={DESC_HEIGHT - DESC_EDGE_HEIGHT * 2}
      style={{
        position: 'absolute',
        left: 0,
        top: DESC_EDGE_HEIGHT,
        backgroundRepeat: 'repeat-y',
        backgroundSize: `6px ${DESC_SIDE_HEIGHT}px`,
      }}
    />
    <MuSpriteFrame
      file={SPRITE.descSide}
      x={3}
      width={3}
      height={DESC_HEIGHT - DESC_EDGE_HEIGHT * 2}
      style={{
        position: 'absolute',
        right: 0,
        top: DESC_EDGE_HEIGHT,
        backgroundRepeat: 'repeat-y',
        backgroundSize: `6px ${DESC_SIDE_HEIGHT}px`,
      }}
    />

    <MuSpriteFrame
      file={SPRITE.descEdge}
      y={0}
      width={DESC_WIDTH}
      height={DESC_EDGE_HEIGHT}
      style={{ position: 'absolute', left: 0, top: 0 }}
    />
    <MuSpriteFrame
      file={SPRITE.descEdge}
      y={DESC_EDGE_HEIGHT}
      width={DESC_WIDTH}
      height={DESC_EDGE_HEIGHT}
      style={{ position: 'absolute', left: 0, bottom: 0 }}
    />

    {!!text && (
      <div
        style={{
          position: 'absolute',
          inset: `${DESC_EDGE_HEIGHT}px 12px`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: TEXT_COLOR.brightGray,
          fontSize: 11,
          lineHeight: '14px',
          textAlign: 'center',
          textShadow: '1px 1px 0 rgba(0, 0, 0, 0.85)',
          whiteSpace: 'pre-line',
        }}
      >
        {text}
      </div>
    )}
  </div>
);
