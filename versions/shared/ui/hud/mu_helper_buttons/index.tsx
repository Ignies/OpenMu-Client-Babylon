import { observer } from 'mobx-react-lite';
import { isOn } from '@/controllers/fidelity';
import { MuButton } from '@/controllers/interface/components/mu_button';
import { GameOptions, uiScaleFactor } from '@/controllers/settings';
import { Ecs } from '@/ecs/current';
import { MuHelper } from '@/modules/mu_helper';
import { toggleMuHelperWindow } from '@/modules/mu_helper/state';
import { eventSchedule } from '@/modules/events/schedule';
import { t } from '@/i18n';
import {
  EVENT_ROW_GAP,
  EVENT_ROW_HEIGHT,
  MINIMAP_SLOT_HEIGHT,
  MINIMAP_SLOT_TOP,
} from '../../windows/events/layout';

const RIGHT = 10;
const GAP = 6;

/**
 * Ours (`muHelperButtons`): the Home and End keys as buttons, top right under the minimap slot
 * and the event timers. Draws nothing on Classic.
 */
export const MuHelperButtons = observer(() => {
  if (!isOn('muHelperButtons') || !Ecs.world?.playerEntity) return null;

  const ui = uiScaleFactor(GameOptions.uiScale);
  // The event timers' slot (`events/eventTimers.tsx`), then below their rows.
  const rows = GameOptions.eventTimers ? eventSchedule().length : 0;
  const top = MINIMAP_SLOT_TOP + (MINIMAP_SLOT_HEIGHT + EVENT_ROW_GAP + rows * EVENT_ROW_HEIGHT + GAP) * ui;

  return (
    <div
      style={{
        position: 'absolute',
        top,
        right: RIGHT,
        display: 'flex',
        gap: 4,
        transform: `scale(${ui})`,
        transformOrigin: '100% 0',
        pointerEvents: 'auto',
        zIndex: 10,
      }}
    >
      <MuButton
        file="newui_btn_empty.OZT"
        width={108}
        height={29}
        frames={{ up: 0, active: 1, down: 2 }}
        label={t(MuHelper.active ? 'muHelperButtons.stop' : 'muHelperButtons.start')}
        labelStyle={{ fontWeight: 'bold', fontSize: 11, color: MuHelper.active ? '#7CFC7C' : '#FFD700' }}
        onClick={() => MuHelper.toggleMuHelper()}
      />
      <MuButton
        file="newui_btn_empty.OZT"
        width={108}
        height={29}
        frames={{ up: 0, active: 1, down: 2 }}
        label={t('muHelperButtons.settings')}
        labelStyle={{ fontWeight: 'bold', fontSize: 11 }}
        onClick={() => toggleMuHelperWindow()}
      />
    </div>
  );
});
