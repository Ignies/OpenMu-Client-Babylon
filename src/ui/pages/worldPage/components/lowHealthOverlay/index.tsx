import './style.less';
import { useEffect } from 'react';
import { reaction } from 'mobx';
import { observer } from 'mobx-react-lite';
import { Store } from '../../../../../store';
import { GameOptions } from '../../../../../common/gameOptions';
import {
  heartbeatDue,
  NO_WARNING,
  vitalWarning,
  type VitalWarning,
} from '../../../../../common/lowVitals';
import { playSfx } from '../../../../../libs/sfx';
import { Heartbeat } from './heartbeat';

/**
 * The screen-edge warning: a soft red gradient round the frame once health
 * drops under the player's threshold, beating like a heart near death, and
 * the same in blue for mana. The original client flashed the whole screen red
 * on a hit; this holds that colour for as long as the danger does, because
 * the life orb sits in a corner nobody watches mid-fight.
 *
 * Drawn over the world and under every window, `pointer-events: none`, and
 * rendered outside the HUD so the hide-interface key cannot take a warning
 * away. The strength is a CSS custom property and the beat a CSS animation,
 * so a change costs one style write and nothing per frame.
 */

/**
 * SOUND_HEART: the original's low-life (and poison) heartbeat, one channel
 * (ZzzOpenData.cpp:4780).
 */
const HEARTBEAT = 'Sound/pHeartBeat';
const HEARTBEAT_CHANNELS = 1;

const Edge = ({
  kind,
  warning,
}: {
  kind: 'health' | 'mana';
  warning: VitalWarning;
}) => (
  <div
    className={`low-vital-edge is-${kind}`}
    style={
      {
        '--low-vital-strength': warning.strength,
        '--low-vital-beat': `${warning.beatSeconds}s`,
      } as React.CSSProperties
    }
  >
    <div
      className={`low-vital-glow${warning.beatSeconds > 0 ? ' is-beating' : ''}`}
    />
  </div>
);

export const LowHealthOverlay = observer(() => {
  const health = GameOptions.lowHealthWarning
    ? vitalWarning(Store.playerData.hpPercent, GameOptions.lowHealthPercent)
    : NO_WARNING;

  const mana = GameOptions.lowManaWarning
    ? vitalWarning(Store.playerData.mpPercent, GameOptions.lowManaPercent)
    : NO_WARNING;

  // The heart is the original's and ignores the edge options: it follows the
  // life bar crossing a fifth, then books each beat for when the last ends.
  useEffect(() => {
    const heart = new Heartbeat(() =>
      playSfx(HEARTBEAT, null, { channels: HEARTBEAT_CHANNELS })
    );
    const stop = reaction(
      () => heartbeatDue(Store.playerData.currentHP, Store.playerData.maxHP),
      due => heart.set(due),
      { fireImmediately: true }
    );
    return () => {
      stop();
      heart.stop();
    };
  }, []);

  return (
    <div className="low-vitals">
      <Edge kind="mana" warning={mana} />
      <Edge kind="health" warning={health} />
    </div>
  );
});
