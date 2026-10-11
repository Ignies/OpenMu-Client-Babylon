import './style.less';
import { useState } from 'react';
import { runInAction } from 'mobx';
import { observer } from 'mobx-react-lite';
import { t, type TextKey } from '@/i18n';
import { MuWindows } from '@/controllers/interface';
import { MuSpriteFrame } from '@/controllers/interface/components/mu_sprite';
import { useWindowStackEntry } from '@/controllers/interface/components/mu_window';
import { UI_STAGE_HEIGHT, UI_STAGE_WIDTH, useUiViewport } from '@/controllers/interface/components/ui_stage';
import { playUiSound } from '@/controllers/sound/sfx';
import { SessionExit } from '@/modules/session/sessionExit';
import { Social } from '@/modules/social/social';

/**
 * `CNewUIWindowMenu` (NewUIWindowMenu.cpp): the main frame's fifth button. Six rows in the
 * `newui_commamd` frame over the bottom right of the stage; the hovered row turns yellow between two
 * arrows. Help (`CNewUIHelp`) and Gens Info (`CNewUIGensRanking`) are not ported: those rows do nothing.
 */

export const WINDOW_MENU = 'window_menu';

const WIDTH = 112;
/** `MENU_MAX_INDEX`: Gens Info is the sixth (`PBG_ADD_GENSRANKING`). */
const ROWS = 6;
/** `STANDARD_POS_X`, `STANDARD_POS_Y - 20 * (MENU_MAX_INDEX - 4)`. */
const X = UI_STAGE_WIDTH - WIDTH;
const Y = UI_STAGE_HEIGHT - 156 - 20 * (ROWS - 4);
const HEIGHT = 105 + (ROWS - 4) * 20;
const ROW = 20;
/** `newui_commamd03` sits at `REFERENCE_HEIGHT - 50 - 45`, not under the middle slices. */
const BOTTOM_Y = UI_STAGE_HEIGHT - 50 - 45 - Y;
const MIDDLE_COUNT = Math.trunc((HEIGHT - 90) / 15) + 1;

const LABELS: readonly TextKey[] = [
  'windowMenu.system',
  'windowMenu.help',
  'windowMenu.guild',
  'windowMenu.move',
  'windowMenu.map',
  'windowMenu.gens',
];

const close = () => MuWindows.setOpen(WINDOW_MENU, false);

/** A click on row `index` (`UpdateMouseEvent`, NewUIWindowMenu.cpp:60-110). */
export function chooseWindowMenu(index: number): void {
  runInAction(() => {
    switch (index) {
      case 0:
        close();
        SessionExit.menuOpen = true;
        break;
      case 2:
        Social.guildWindowEnabled = true;
        close();
        break;
      case 3:
        MuWindows.setOpen('move_command', !MuWindows.isOpen('move_command'));
        break;
      case 4:
        close();
        MuWindows.setOpen('minimap', !MuWindows.isOpen('minimap'));
        break;
    }
  });
}

export const WindowMenu = observer(() => {
  const { width, height, scale } = useUiViewport();
  const [selected, setSelected] = useState(-1);
  const open = MuWindows.isOpen(WINDOW_MENU);
  // Escape hides it with a click (`UpdateKeyEvent`, NewUIWindowMenu.cpp:113-124).
  useWindowStackEntry(WINDOW_MENU, open, () => {
    close();
    playUiSound('click');
  });
  if (!open) return null;

  const left = (width - UI_STAGE_WIDTH * scale) / 2 + X * scale;
  const top = (height - UI_STAGE_HEIGHT * scale) / 2 + Y * scale;

  return (
    <div
      className="window-menu"
      style={{ left, top, width: WIDTH, height: HEIGHT, transform: `scale(${scale})` }}
      onPointerLeave={() => setSelected(-1)}
    >
      <MuSpriteFrame file="newui_msgbox_back.OZJ" width={WIDTH} height={HEIGHT} className="window-menu-art" />
      <MuSpriteFrame file="newui_commamd01.OZT" width={WIDTH} height={45} className="window-menu-art" />
      {Array.from({ length: MIDDLE_COUNT }, (_, i) => (
        <MuSpriteFrame key={i} file="newui_commamd02.OZT" width={WIDTH} height={15} className="window-menu-art" style={{ top: 45 + i * 15 }} />
      ))}
      <MuSpriteFrame file="newui_commamd03.OZT" width={WIDTH} height={45} className="window-menu-art" style={{ top: BOTTOM_Y }} />
      {LABELS.slice(1).map((_, i) => (
        <MuSpriteFrame key={i} file="newui_commamd_Line.OZJ" width={82} height={2} className="window-menu-art" style={{ left: 15, top: 33 + i * ROW }} />
      ))}
      {selected >= 0 && (
        <>
          <MuSpriteFrame file="newui_arrow(L).OZT" width={6} height={9} className="window-menu-art" style={{ left: 16, top: ROW + selected * ROW }} />
          <MuSpriteFrame file="newui_arrow(R).OZT" width={6} height={9} className="window-menu-art" style={{ left: 90, top: ROW + selected * ROW }} />
        </>
      )}
      {LABELS.map((key, i) => (
        <div
          key={key}
          className={`window-menu-row${selected === i ? ' selected' : ''}`}
          style={{ top: ROW + i * ROW }}
          onPointerEnter={() => setSelected(i)}
          onClick={() => chooseWindowMenu(i)}
        >
          <span className="window-menu-label">{t(key)}</span>
        </div>
      ))}
    </div>
  );
});
