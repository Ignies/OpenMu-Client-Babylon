import { observer } from 'mobx-react-lite';
import { t } from '@/i18n';
import { useUiViewport } from '@/controllers/interface/components/ui_stage';
import {
  MAIN_FRAME_BUTTONS,
  MAIN_FRAME_BUTTON_FRAMES,
  MAIN_FRAME_BUTTON_HEIGHT,
  MAIN_FRAME_BUTTON_WIDTH,
} from '../bottom_bar/mainFrameButtons';
import { MobileButton, ScaledFrame } from './mobileButton';
import { MENU_SCALE } from './consts';
import { quietUiSounds } from '@/controllers/sound/sfx';
import { openSystemMenu } from '@/modules/session/sessionExit';

/**
 * The bar's Options button. A phone has no Escape, so here it opens the system menu instead
 * (`CSystemMenuMsgBox`: Exit Game, Select Server, Switch Character, Option); the tap clicks once.
 */
const SYSTEM_MENU_FILE = 'partCharge1/newui_menu_Bt04.OZJ';
const openMenu = () => quietUiSounds(() => void openSystemMenu());

/**
 * Cash shop, character, inventory, friends, options - the five the bar draws
 * at x 489..619 of a 640-wide frame, which on a 375 px screen is x 357..507:
 * off the right edge and unreachable. Same sprites and actions (but Options, below), at a size a
 * thumb can hit. A column in portrait, a row in landscape, where there is
 * width but little height.
 *
 * The bar keeps its own copies. They are fine where they are on screen (a
 * tablet held sideways) and dropping them would leave five holes in the art.
 */
export const MenuCluster = observer(() => {
  // Rides the stage's own resize observer, so the cluster flips on rotate.
  const { width, height } = useUiViewport();
  const portrait = height >= width;

  return (
    <div className={`mobile-menu-cluster${portrait ? ' portrait' : ' landscape'}`}>
      {MAIN_FRAME_BUTTONS.map(button => (
        <MobileButton
          key={button.file}
          className="mobile-menu-button"
          title={t(button.titleKey)}
          onTap={button.file === SYSTEM_MENU_FILE ? openMenu : button.toggle}
        >
          {pressed => (
            <ScaledFrame
              file={button.file}
              y={
                (pressed ? MAIN_FRAME_BUTTON_FRAMES.down : MAIN_FRAME_BUTTON_FRAMES.up) *
                MAIN_FRAME_BUTTON_HEIGHT
              }
              width={MAIN_FRAME_BUTTON_WIDTH}
              height={MAIN_FRAME_BUTTON_HEIGHT}
              scale={MENU_SCALE}
            />
          )}
        </MobileButton>
      ))}
    </div>
  );
});
