import { observer } from 'mobx-react-lite';
import { cameraView, resetCamera } from '@/controllers/camera';
import { MuButton } from '@/controllers/interface/components/mu_button';
import { useUiStageScale } from '@/controllers/interface/components/ui_stage';
import { GameOptions, uiScaleFactor } from '@/controllers/settings';
import { Social } from '@/modules/social/social';
import { t } from '@/i18n';
import { cornerPanelSpan } from '../minimap/corner';

/** The party list's plates (77 stage px, 2 in from their edge), which this sits left of. */
const PARTY_SPAN = 79;
const GAP = 8;
const TOP = 10;

/**
 * Ours (`cameraKeepsView`): Reset camera, shown while the view is zoomed, turned or tilted off the
 * map's opening frame. Top right, left of the corner minimap and the party list.
 */
export const CameraReset = observer(() => {
  const stage = useUiStageScale();
  if (!cameraView.moved) return null;

  const minimap = GameOptions.minimapCorner ? cornerPanelSpan() : 0;
  const party = Social.partyMembers.length > 0 ? PARTY_SPAN * stage : 0;

  return (
    <div
      style={{
        position: 'absolute',
        top: TOP,
        right: minimap + party + GAP,
        transform: `scale(${uiScaleFactor(GameOptions.uiScale)})`,
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
        label={t('camera.reset')}
        labelStyle={{ fontWeight: 'bold', fontSize: 11 }}
        onClick={resetCamera}
      />
    </div>
  );
});
