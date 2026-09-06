import './style.less';
import { observer } from 'mobx-react-lite';
import { Store, UIState } from '../../../../../store';
import { useIsMobile } from '../../../../../common/mobile';
import { MoveButton } from './moveButton';
import { MenuCluster } from './menuCluster';
import { SkillPad } from './skillPad';

/**
 * The touch HUD. This one guard is what makes "mobile only" true for
 * everything under it, so no child widget needs a check of its own: on a
 * mouse none of this exists in the DOM at all.
 *
 * It renders into `.hud`, which is `pointer-events: none`, so each button
 * opts itself back in - the pattern every other widget here follows.
 */
export const MobileControls = observer(() => {
  if (!useIsMobile()) return null;
  // Not over the loading screen: `playerEntity` is plain per-frame state and
  // would not re-render this when it arrives, so the observable state is what
  // gates the pad.
  if (Store.uiState !== UIState.World) return null;

  return (
    <div className="mobile-controls">
      <MoveButton />
      <MenuCluster />
      <SkillPad />
    </div>
  );
});
