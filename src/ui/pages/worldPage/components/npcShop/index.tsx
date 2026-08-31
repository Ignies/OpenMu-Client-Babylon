import './style.less';
import { t } from '../../../../../i18n';
import { observer } from 'mobx-react-lite';
import { useMemo, useRef, useState } from 'react';
import { Store } from '../../../../../store';
import { ItemIcon } from '../../../../components/itemIcon';
import { ItemTooltip } from '../../../../components/itemTooltip';
import { Item } from '../../../../../ecs/world';
import {
  GridSquares,
  hoveredMask,
  occupancyStamp,
  usedMask,
} from '../../../../components/itemGrid';
import { ItemsDatabase } from '../../../../../common/itemsDatabase';
import { isSellingBanned } from '../../../../../common/itemValue';
import { MuSpriteFrame } from '../../../../components/muSprite';
import { MuButton } from '../../../../components/muButton';
import { MuItemWindow, MuTableFrame } from '../../../../components/muWindow';
import {
  BUTTON_FRAMES,
  BUTTON_HEIGHT,
  BUTTON_WIDTH,
  BUTTON_Y,
  COLUMNS,
  GRID_FRAME_HEIGHT,
  GRID_FRAME_WIDTH,
  GRID_FRAME_X,
  GRID_FRAME_Y,
  GRID_X,
  GRID_Y,
  HEAD_CLOSE_HEIGHT,
  HEAD_CLOSE_WIDTH,
  HEAD_CLOSE_X,
  HEAD_CLOSE_Y,
  REPAIR_ALL_BUTTON_X,
  REPAIR_ALL_TOOLTIP,
  REPAIR_BUTTON_X,
  REPAIR_LABEL,
  REPAIR_LABEL_X,
  REPAIR_MONEY_HEIGHT,
  REPAIR_MONEY_SPRITE,
  REPAIR_MONEY_WIDTH,
  REPAIR_MONEY_X,
  REPAIR_MONEY_Y,
  REPAIR_SPRITE,
  REPAIR_TEXT_X,
  REPAIR_TEXT_Y,
  REPAIR_TOOLTIP,
  ROWS,
  SQUARE,
  SQUARES,
  TAX_Y,
  TITLE,
  TITLE_Y,
  taxText,
} from './layout';

const WINDOW_ID = 'npc-shop';

function itemSize(item: Item): { w: number; h: number } {
  const config = ItemsDatabase.getItem(item.group, item.num);
  return { w: config?.X ?? 1, h: config?.Y ?? 1 };
}

type Placed = {
  slot: number;
  item: Item;
  column: number;
  row: number;
  w: number;
  h: number;
};

/** Which square belongs to which stock entry (`m_pdwItemCheckBox`). */
function buildOccupancy(items: (Item | null)[]) {
  const squares: (Placed | null)[] = new Array(SQUARES).fill(null);
  const placed: Placed[] = [];

  for (let slot = 0; slot < SQUARES; slot++) {
    const item = items[slot];
    if (!item) continue;

    const column = slot % COLUMNS;
    const row = (slot - column) / COLUMNS;
    const { w, h } = itemSize(item);

    const entry: Placed = { slot, item, column, row, w, h };
    placed.push(entry);

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (column + x >= COLUMNS || row + y >= ROWS) continue;
        squares[slot + y * COLUMNS + x] = entry;
      }
    }
  }

  return { squares, placed };
}

type HoverInfo = { entry: Placed; x: number; y: number };

/**
 * `CNewUINPCShop`: the merchant's stock beside the inventory. A click on a
 * stock item buys it; the carried inventory item dropped on the grid is
 * sold; at a smith the two bottom buttons toggle repair mode / repair all.
 */
export const NpcShop = observer(() => {
  const shop = Store.npcShop;
  const gridRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<HoverInfo | null>(null);

  const picked = Store.pickedItem;
  const items = shop?.items ?? null;
  const stamp = items ? occupancyStamp(items, 0, SQUARES) : '';
  const { squares, placed } = useMemo(
    () => buildOccupancy(items ?? []),
    // `stamp` stands in for the item contents.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, stamp]
  );
  const used = useMemo(() => usedMask(squares), [squares]);
  // Re-resolve by square: a stock refresh rebuilds the entries.
  const hoveredEntry = hover ? squares[hover.entry.slot] ?? null : null;
  const hovered = useMemo(
    () => hoveredMask(squares, picked ? null : hoveredEntry),
    [squares, hoveredEntry, picked]
  );

  if (!shop) return null;

  const squareAt = (clientX: number, clientY: number) => {
    const rect = gridRef.current?.getBoundingClientRect();
    if (!rect) return -1;

    const scale = rect.width / (COLUMNS * SQUARE);
    if (!scale) return -1;

    const column = Math.floor((clientX - rect.left) / scale / SQUARE);
    const row = Math.floor((clientY - rect.top) / scale / SQUARE);

    if (column < 0 || column >= COLUMNS || row < 0 || row >= ROWS) return -1;
    return row * COLUMNS + column;
  };

  const onGridPointerDown = (event: React.PointerEvent) => {
    if (event.button !== 0) return;

    // `InventoryProcess`: the carried item lands here → sold.
    if (picked) {
      Store.sellPickedItemToNpc();
      return;
    }

    const square = squareAt(event.clientX, event.clientY);
    if (square < 0) return;

    const entry = squares[square];
    if (!entry) return;

    Store.buyItemFromNpc(entry.slot);
  };

  const sellingBanned = !!picked && isSellingBanned(picked.item);

  const gridClass = [
    'shop-items',
    Store.shopBuyPending || Store.pendingItemMove ? 'busy' : '',
    picked ? 'selling' : '',
    sellingBanned ? 'selling-banned' : '',
  ]
    .filter(Boolean)
    .join(' ');

  // The original parks the shop left of the inventory (and of the character
  // window when that is open too): `SetPos(640 - 190 * 3, 0)`.
  const column = Store.characterInfoEnabled ? 2 : 1;

  return (
    <MuItemWindow
      id={WINDOW_ID}
      className="npc-shop"
      column={column}
      onClose={() => Store.closeNpcShop()}
    >
      <div className="window-title" style={{ top: TITLE_Y }}>
        {t(TITLE)}
      </div>
      {shop.taxRate > 0 && (
        <div className="shop-tax" style={{ top: TAX_Y }}>
          {taxText(shop.taxRate)}
        </div>
      )}

      <div
        className="head-close"
        data-no-drag="true"
        style={{
          left: HEAD_CLOSE_X,
          top: HEAD_CLOSE_Y,
          width: HEAD_CLOSE_WIDTH,
          height: HEAD_CLOSE_HEIGHT,
        }}
        onClick={() => Store.closeNpcShop()}
      />

      <MuTableFrame
        left={GRID_FRAME_X}
        top={GRID_FRAME_Y}
        width={GRID_FRAME_WIDTH}
        height={GRID_FRAME_HEIGHT}
      />

      <div
        ref={gridRef}
        className={gridClass}
        data-no-drag="true"
        style={{
          left: GRID_X,
          top: GRID_Y,
          width: COLUMNS * SQUARE,
          height: ROWS * SQUARE,
        }}
        onPointerDown={onGridPointerDown}
        onContextMenu={event => event.preventDefault()}
        onPointerMove={event => {
          // State only moves when the hovered *item* changes, not per event.
          const square = squareAt(event.clientX, event.clientY);
          const entry = square >= 0 ? squares[square] : null;
          setHover(current => {
            if (!entry) return current === null ? current : null;
            if (current && current.entry === entry) return current;
            return { entry, x: event.clientX, y: event.clientY };
          });
        }}
        onPointerLeave={() => setHover(null)}
      >
        <GridSquares
          columns={COLUMNS}
          rows={ROWS}
          used={used}
          hovered={hovered}
          squareClass="shop-square"
        />

        {placed.map(entry => (
          <div
            key={entry.slot}
            className="shop-item"
            style={{
              left: entry.column * SQUARE,
              top: entry.row * SQUARE,
              width: entry.w * SQUARE,
              height: entry.h * SQUARE,
            }}
          >
            <ItemIcon item={entry.item} />
          </div>
        ))}
      </div>

      {!picked && !!hoveredEntry && !!hover && (
        <ItemTooltip item={hoveredEntry.item} x={hover.x} y={hover.y} context="shop" />
      )}

      {shop.repairShop && (
        <>
          <MuSpriteFrame
            file={REPAIR_MONEY_SPRITE}
            width={REPAIR_MONEY_WIDTH}
            height={REPAIR_MONEY_HEIGHT}
            style={{
              position: 'absolute',
              left: REPAIR_MONEY_X,
              top: REPAIR_MONEY_Y,
            }}
          />
          <div
            className="shop-repair-label"
            style={{ left: REPAIR_LABEL_X, top: REPAIR_TEXT_Y }}
          >
            {t(REPAIR_LABEL)}
          </div>
          <div
            className="shop-repair-money"
            style={{ left: REPAIR_TEXT_X, top: REPAIR_TEXT_Y }}
          >
            {Store.repairAllPrice.toLocaleString('en-US')}
          </div>

          <div
            className="window-button"
            data-no-drag="true"
            style={{ left: REPAIR_BUTTON_X, top: BUTTON_Y }}
          >
            <MuButton
              file={REPAIR_SPRITE}
              width={BUTTON_WIDTH}
              height={BUTTON_HEIGHT}
              frames={BUTTON_FRAMES}
              checked={Store.repairMode}
              onClick={() => Store.toggleRepairMode()}
            >
              <span className="button-tooltip">{t(REPAIR_TOOLTIP)}</span>
            </MuButton>
          </div>
          <div
            className="window-button"
            data-no-drag="true"
            style={{ left: REPAIR_ALL_BUTTON_X, top: BUTTON_Y }}
          >
            <MuButton
              file={REPAIR_SPRITE}
              width={BUTTON_WIDTH}
              height={BUTTON_HEIGHT}
              frames={BUTTON_FRAMES}
              disabled={Store.repairAllPrice <= 0}
              onClick={() => Store.repairAllRequest()}
            >
              <span className="button-tooltip">{t(REPAIR_ALL_TOOLTIP)}</span>
            </MuButton>
          </div>
        </>
      )}
    </MuItemWindow>
  );
});
