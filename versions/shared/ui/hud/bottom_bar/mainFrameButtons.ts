import { MuWindows } from '@/controllers/interface/windowManager';
import type { TextKey } from '@/i18n';
import { Messenger } from '@/modules/friends/messenger';
import { toggleMarketplace } from '@/modules/marketplace/gameBridge';
import { Marketplace } from '@/modules/marketplace/state';

/**
 * The five buttons on the right of the main frame (`newui_menu_Bt01..05`), in
 * the order the bar draws them.
 *
 * Listed here rather than inline in the bar because the mobile HUD draws the
 * same five at a touchable size - on a phone the bar's own copies sit past
 * the right edge of the screen - and the two must not drift apart.
 */
type MainFrameButton = {
  file: string;
  titleKey: TextKey;
  toggle: () => void;
  /** Its window is up: `SetBtnState(.., true)` draws the button pressed (NewUIMainFrameWindow.cpp:2683). */
  pressed: () => boolean;
};

export const MAIN_FRAME_BUTTONS: readonly MainFrameButton[] = [
  {
    file: 'partCharge1/newui_menu_Bt05.OZJ',
    titleKey: 'bottomBar.itemShop',
    toggle: () => toggleMarketplace(),
    pressed: () => Marketplace.open,
  },
  {
    file: 'partCharge1/newui_menu_Bt01.OZJ',
    titleKey: 'bottomBar.characterInfo',
    toggle: () => {
      MuWindows.setOpen('character_info', !MuWindows.isOpen('character_info'));
    },
    pressed: () => MuWindows.isOpen('character_info'),
  },
  {
    file: 'partCharge1/newui_menu_Bt02.OZJ',
    titleKey: 'bottomBar.inventory',
    toggle: () => {
      MuWindows.setOpen('inventory', !MuWindows.isOpen('inventory'));
    },
    pressed: () => MuWindows.isOpen('inventory'),
  },
  {
    file: 'partCharge1/newui_menu_Bt03.OZJ',
    titleKey: 'bottomBar.friendList',
    toggle: () => Messenger.toggleWindow(),
    pressed: () => Messenger.windowEnabled,
  },
  // `m_BtnWindow` toggles `CNewUIWindowMenu` (NewUIMainFrameWindow.cpp:866-868), GlobalText 1744.
  {
    file: 'partCharge1/newui_menu_Bt04.OZJ',
    titleKey: 'bottomBar.menu',
    toggle: () => {
      MuWindows.setOpen('window_menu', !MuWindows.isOpen('window_menu'));
    },
    pressed: () => MuWindows.isOpen('window_menu'),
  },
];

/** `newui_menu_Bt0*` frame geometry: four 30x41 frames stacked, the last the pressed button hovered. */
export const MAIN_FRAME_BUTTON_WIDTH = 30;
export const MAIN_FRAME_BUTTON_HEIGHT = 41;
export const MAIN_FRAME_BUTTON_FRAMES = { up: 0, active: 1, down: 2 } as const;
/** `SetBtnState(.., true)`: up and down on frame 2, over on 3. */
export const MAIN_FRAME_BUTTON_PRESSED_FRAMES = { up: 2, active: 3, down: 2 } as const;
