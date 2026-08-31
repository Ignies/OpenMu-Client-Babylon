import './style.less';
import { t } from '../../../../../i18n';
import { observer } from 'mobx-react-lite';
import { Store } from '../../../../../store';
import { Economy, MIX_MENU } from '../../../../../economy';
import { StorageKind } from '../../../../../common/itemStorage';
import { MuButton } from '../../../../components/muButton';
import { MuItemWindow, MuTableFrame } from '../../../../components/muWindow';
import { ItemGrid } from '../../../../components/itemGrid';
import { useEventBus } from '../../../../../hooks/useEventBus';
import { uiClick } from '../../../../../libs/sfx';
import {
  COLUMNS,
  GRID_X,
  GRID_Y,
  HEAD_CLOSE_HEIGHT,
  HEAD_CLOSE_WIDTH,
  HEAD_CLOSE_X,
  HEAD_CLOSE_Y,
  MENU_HEIGHT,
  MENU_WIDTH,
  MENU_X,
  MENU_Y,
  MIX_BUTTON_FRAMES,
  MIX_BUTTON_HEIGHT,
  MIX_BUTTON_WIDTH,
  MIX_BUTTON_X,
  MIX_BUTTON_Y,
  MIX_SPRITE,
  MIX_TOOLTIP,
  RECIPE_HEIGHT,
  RECIPE_WIDTH,
  RECIPE_X,
  RECIPE_Y,
  ROWS,
  SUBTITLE_Y,
  TITLE,
  TITLE_Y,
} from './layout';

const WINDOW_ID = 'chaos-machine';

/**
 * `CNewUIMixInventory`: the goblin's tray. Items go in from the inventory,
 * the menu picks which combination to attempt and the button sends
 * `ChaosMachineMixRequest`; the result comes back as `ItemCraftingResult`
 * and lands in the tray, where it has to be dragged out before the window
 * will close (`ClosingProcess`).
 */
export const ChaosMachine = observer(() => {
  if (!Economy.mixOpen) return null;

  const picked = Store.pickedItem;
  const selected = MIX_MENU.find(entry => entry.type === Economy.mixType);

  const column = 1 + (Store.inventoryEnabled ? 1 : 0) + (Store.characterInfoEnabled ? 1 : 0);

  return (
    <MuItemWindow
      id={WINDOW_ID}
      className="chaos-machine"
      column={column}
      label={t(TITLE)}
      onClose={() => Economy.closeMix()}
    >
      <div className="window-title" style={{ top: TITLE_Y }}>
        {t(TITLE)}
      </div>
      <div className="chaos-subtitle" style={{ top: SUBTITLE_Y }}>
        {Economy.mixPending ? 'Combining…' : selected?.label ?? ''}
      </div>

      <div
        className="head-close"
        data-no-drag="true"
        style={{
          left: HEAD_CLOSE_X,
          top: HEAD_CLOSE_Y,
          width: HEAD_CLOSE_WIDTH,
          height: HEAD_CLOSE_HEIGHT,
        }}
        onClick={() => Economy.closeMix()}
      />

      {}
      <div
        className={`chaos-recipe${Economy.mixResult ? ` ${Economy.mixResult}` : ''}`}
        style={{
          left: RECIPE_X,
          top: RECIPE_Y,
          width: RECIPE_WIDTH,
          height: RECIPE_HEIGHT,
        }}
      >
        {Economy.mixResult === 'success' && <div>The combination succeeded.</div>}
        {Economy.mixResult === 'failed' && <div>The combination failed.</div>}
        {!Economy.mixResult && <div className="hint">{selected?.hint ?? ''}</div>}
      </div>

      <ItemGrid
        items={Economy.mixItems}
        columns={COLUMNS}
        rows={ROWS}
        left={GRID_X}
        top={GRID_Y}
        disabled={Economy.mixPending || !!Store.pendingItemMove}
        dropTint={picked ? 'ok' : 'none'}
        onPick={square => Store.pickItem(StorageKind.ChaosMachine, square)}
        onPlace={square => Store.placePickedItem(square, StorageKind.ChaosMachine)}
        onUse={square =>
          Store.autoMoveItem(
            StorageKind.ChaosMachine,
            square,
            StorageKind.Inventory
          )
        }
      />

      {}
      <MuTableFrame
        left={MENU_X - 4}
        top={MENU_Y - 3}
        width={MENU_WIDTH + 9}
        height={MENU_HEIGHT + 9}
      />
      <div
        className="chaos-menu"
        data-no-drag="true"
        style={{ left: MENU_X, top: MENU_Y, width: MENU_WIDTH, height: MENU_HEIGHT }}
      >
        {MIX_MENU.map(entry => (
          <div
            key={entry.type}
            className={`chaos-menu-row${entry.type === Economy.mixType ? ' active' : ''}`}
            title={entry.hint}
            onClick={uiClick(() => Economy.setMixType(entry.type))}
          >
            {entry.label}
          </div>
        ))}
      </div>

      <div
        className="window-button"
        data-no-drag="true"
        style={{ left: MIX_BUTTON_X, top: MIX_BUTTON_Y }}
      >
        <MuButton
          file={MIX_SPRITE}
          width={MIX_BUTTON_WIDTH}
          height={MIX_BUTTON_HEIGHT}
          frames={MIX_BUTTON_FRAMES}
          disabled={Economy.mixPending}
          onClick={() => Economy.mix()}
        >
          <span className="button-tooltip">{t(MIX_TOOLTIP)}</span>
        </MuButton>
      </div>
    </MuItemWindow>
  );
});
