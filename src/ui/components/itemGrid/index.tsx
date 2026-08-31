import './style.less';
import { observer } from 'mobx-react-lite';
import { memo, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import type { Item } from '../../../ecs/world';
import { ItemsDatabase } from '../../../common/itemsDatabase';
import { Store } from '../../../store';
import { ItemIcon } from '../itemIcon';
import { ItemTooltip, type TooltipContext } from '../itemTooltip';
import { MuSpriteFrame } from '../muSprite';
import { MuTableFrame } from '../muWindow';
import { stableKeyOf } from '../partyBars/stableKey';

export const SQUARE = 20;
export const SQUARE_SPRITE = 'newui_item_box.OZT';
export const SQUARE_SPRITE_SIZE = 21;

const WND_TOP_EDGE = 3;
const WND_LEFT_EDGE = 4;
const WND_BOTTOM_EDGE = 8;
const WND_RIGHT_EDGE = 9;
const TABLE_CORNER = 14;

/** The `newui_item_table*` frame the original draws around every grid. */
export function gridFrame(
  left: number,
  top: number,
  columns: number,
  rows: number
) {
  return {
    left: left - WND_LEFT_EDGE,
    top: top - WND_TOP_EDGE,
    width: columns * SQUARE - WND_RIGHT_EDGE + WND_LEFT_EDGE + TABLE_CORNER,
    height: rows * SQUARE - WND_BOTTOM_EDGE + WND_TOP_EDGE + TABLE_CORNER,
  };
}

export function itemSize(item: Item): { w: number; h: number } {
  const config = ItemsDatabase.getItem(item.group, item.num);
  return { w: config?.X ?? 1, h: config?.Y ?? 1 };
}

export type Placed = {
  square: number;
  item: Item;
  column: number;
  row: number;
  w: number;
  h: number;
};

/** `m_pdwItemCheckBox`: which square belongs to which item. */
export function buildOccupancy(
  items: (Item | null)[],
  offset: number,
  columns: number,
  rows: number
) {
  const squares: (Placed | null)[] = new Array(columns * rows).fill(null);
  const placed: Placed[] = [];

  for (let square = 0; square < columns * rows; square++) {
    const item = items[offset + square];
    if (!item) continue;

    const column = square % columns;
    const row = (square - column) / columns;
    const { w, h } = itemSize(item);

    // `square` addresses the grid; `entry.square` is the local array index
    // the callbacks report back.
    const entry: Placed = { square: offset + square, item, column, row, w, h };
    placed.push(entry);

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (column + x >= columns || row + y >= rows) continue;
        squares[square + y * columns + x] = entry;
      }
    }
  }

  return { squares, placed };
}

/**
 * What the occupancy depends on, as a string: which squares hold which item
 * object (by identity — a fresh object from a refresh must rebuild) at what
 * level. Reading it inside an observer is what subscribes the grid to the
 * items, and it is the memo key for `buildOccupancy`.
 */
export function occupancyStamp(
  items: (Item | null)[],
  offset: number,
  count: number
): string {
  let stamp = '';
  for (let square = 0; square < count; square++) {
    const item = items[offset + square];
    if (!item) continue;
    stamp += `${square}:${stableKeyOf(item)}/${item.group}/${item.num}/${item.lvl ?? 0};`;
  }
  return stamp;
}

export function canPlace(
  squares: (Placed | null)[],
  columns: number,
  rows: number,
  column: number,
  row: number,
  w: number,
  h: number
): boolean {
  if (column < 0 || row < 0) return false;
  if (column + w > columns || row + h > rows) return false;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (squares[(row + y) * columns + column + x]) return false;
    }
  }

  return true;
}

// ---- the square sheet -------------------------------------------------------

/** Hoisted per-square `style` objects so `MuSpriteFrame`'s memo holds. */
const squareStyles = new Map<number, CSSProperties[]>();

function squareStyle(columns: number, square: number): CSSProperties {
  let styles = squareStyles.get(columns);
  if (!styles) {
    styles = [];
    squareStyles.set(columns, styles);
  }
  let style = styles[square];
  if (!style) {
    style = {
      left: (square % columns) * SQUARE,
      top: Math.floor(square / columns) * SQUARE,
    };
    styles[square] = style;
  }
  return style;
}

/** One `newui_item_box` per square; memoised on the used / hovered masks. */
export const GridSquares = memo(function GridSquares({
  columns,
  rows,
  used,
  hovered,
  squareClass,
}: {
  columns: number;
  rows: number;
  /** One char per square, '1' when an item covers it. */
  used: string;
  /** One char per square, '1' for the squares of the hovered item. */
  hovered: string;
  squareClass: string;
}) {
  return (
    <>
      {Array.from({ length: columns * rows }, (_, square) => (
        <MuSpriteFrame
          key={square}
          file={SQUARE_SPRITE}
          width={SQUARE_SPRITE_SIZE}
          height={SQUARE_SPRITE_SIZE}
          className={`${squareClass}${used[square] === '1' ? ' used' : ''}${
            hovered[square] === '1' ? ' hovered' : ''
          }`}
          style={squareStyle(columns, square)}
        />
      ))}
    </>
  );
});

export function usedMask(squares: readonly (object | null)[]): string {
  let mask = '';
  for (const entry of squares) mask += entry ? '1' : '0';
  return mask;
}

export function hoveredMask<T extends object>(
  squares: readonly (T | null)[],
  entry: T | null
): string {
  let mask = '';
  for (const at of squares) mask += at && at === entry ? '1' : '0';
  return mask;
}

/** One placed item: its icon (and stall price) at its squares. */
const GridItem = memo(function GridItem({
  entry,
  price,
}: {
  entry: Placed;
  price: number | undefined;
}) {
  return (
    <div
      className="mu-grid-item"
      style={{
        left: entry.column * SQUARE,
        top: entry.row * SQUARE,
        width: entry.w * SQUARE,
        height: entry.h * SQUARE,
      }}
    >
      <ItemIcon item={entry.item} />
      {price !== undefined && (
        <span className={`mu-grid-price${price > 0 ? '' : ' unset'}`}>
          {price > 0 ? price.toLocaleString('en-US') : '?'}
        </span>
      )}
    </div>
  );
});

const GridFrame = memo(MuTableFrame);

/**
 * Screen → grid coordinates for a grid element. The window's CSS scale is
 * folded out through the measured width.
 */
export function gridPointOf(
  grid: HTMLElement | null,
  columns: number,
  clientX: number,
  clientY: number
) {
  const rect = grid?.getBoundingClientRect();
  if (!rect) return null;

  const scale = rect.width / (columns * SQUARE);
  if (!scale) return null;

  return {
    rect,
    x: (clientX - rect.left) / scale,
    y: (clientY - rect.top) / scale,
  };
}

type HoverInfo = { entry: Placed; x: number; y: number; price?: number };
type Target = { column: number; row: number };

export type ItemGridProps = {
  items: (Item | null)[];
  columns: number;
  rows: number;
  left: number;
  top: number;
  /**
   * Local array index of square 0 (`gridFirstIndex`). The callbacks report
   * local indices, so a caller with an offset grid never has to add it back.
   */
  offset?: number;
  className?: string;
  /** Greys the grid out and swallows clicks (`LockInventory`). */
  disabled?: boolean;
  /** Tint under a carried item: blue when it may land here, red when banned. */
  dropTint?: 'none' | 'ok' | 'ban';
  /** Left click on an occupied square with an empty cursor. */
  onPick?: (square: number, item: Item) => void;
  /** Left click while carrying something; `square` is the top-left target. */
  onPlace?: (square: number) => void;
  /** Right click on an occupied square. */
  onUse?: (square: number, item: Item) => void;
  tooltipContext?: TooltipContext;
  /** Personal-shop asking price shown in the tooltip and under the icon. */
  priceOf?: (square: number) => number | undefined;
  frame?: boolean;
};

/**
 * `CNewUIInventoryCtrl`: the square sheet every item window is built from -
 * occupancy from the item sizes, the 20px hit test, the drop preview under a
 * carried item and the tooltip. The inventory keeps its own copy because it
 * also carries the equipment dolls; vault, trade, chaos machine and the
 * personal shop all share this one.
 *
 * Pointer moves never render: the position lives in a ref, and state only
 * changes when the *hovered item* or the *drop target square* changes. The
 * tooltip follows the pointer on its own (itemTooltip).
 */
export const ItemGrid = observer(
  ({
    items,
    columns,
    rows,
    left,
    top,
    offset = 0,
    className,
    disabled = false,
    dropTint = 'none',
    onPick,
    onPlace,
    onUse,
    tooltipContext = 'plain',
    priceOf,
    frame = true,
  }: ItemGridProps) => {
    const gridRef = useRef<HTMLDivElement>(null);
    const pointer = useRef<{ x: number; y: number } | null>(null);
    const [hover, setHover] = useState<HoverInfo | null>(null);
    const [target, setTarget] = useState<Target | null>(null);

    const picked = Store.pickedItem;
    const pickedSize = picked ? itemSize(picked.item) : null;

    const count = columns * rows;
    const stamp = occupancyStamp(items, offset, count);
    const { squares, placed } = useMemo(
      () => buildOccupancy(items, offset, columns, rows),
      // `stamp` stands in for the item contents.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [items, offset, columns, rows, stamp]
    );

    // The handlers read the latest occupancy without being recreated.
    const latest = useRef({ squares, pickedSize });
    latest.current = { squares, pickedSize };

    const squareAt = (clientX: number, clientY: number) => {
      const point = gridPointOf(gridRef.current, columns, clientX, clientY);
      if (!point) return -1;

      const column = Math.floor(point.x / SQUARE);
      const row = Math.floor(point.y / SQUARE);

      if (column < 0 || column >= columns || row < 0 || row >= rows) return -1;
      return row * columns + column;
    };

    /** `GetTargetLinealPos`: the item is centred on the cursor. */
    const targetFor = (clientX: number, clientY: number): Target | null => {
      const size = latest.current.pickedSize;
      if (!size) return null;

      const point = gridPointOf(gridRef.current, columns, clientX, clientY);
      if (!point) return null;

      const { rect } = point;
      if (
        clientX < rect.left ||
        clientX >= rect.right ||
        clientY < rect.top ||
        clientY >= rect.bottom
      ) {
        return null;
      }

      const x = point.x - ((size.w - 1) * SQUARE) / 2;
      const y = point.y - ((size.h - 1) * SQUARE) / 2;

      return { column: Math.floor(x / SQUARE), row: Math.floor(y / SQUARE) };
    };

    const updateTarget = (clientX: number, clientY: number) => {
      const next = targetFor(clientX, clientY);
      setTarget(current =>
        current === next ||
        (current && next && current.column === next.column && current.row === next.row)
          ? current
          : next
      );
    };

    // The carried item is dragged across this grid from anywhere on the page.
    useEffect(() => {
      if (!picked) {
        setTarget(null);
        return;
      }
      const onMove = (event: PointerEvent) => {
        pointer.current = { x: event.clientX, y: event.clientY };
        updateTarget(event.clientX, event.clientY);
      };
      if (pointer.current) updateTarget(pointer.current.x, pointer.current.y);
      window.addEventListener('pointermove', onMove, { passive: true });
      return () => window.removeEventListener('pointermove', onMove);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [!!picked, columns, rows]);

    const targetOk =
      !!target &&
      !!pickedSize &&
      dropTint !== 'ban' &&
      canPlace(
        squares,
        columns,
        rows,
        target.column,
        target.row,
        pickedSize.w,
        pickedSize.h
      );

    const onPointerDown = (event: React.PointerEvent) => {
      if (event.button !== 0 || disabled) return;
      const { squares, pickedSize } = latest.current;

      if (picked && pickedSize) {
        const at = targetFor(event.clientX, event.clientY);
        if (!at) return;
        if (
          !canPlace(
            squares,
            columns,
            rows,
            at.column,
            at.row,
            pickedSize.w,
            pickedSize.h
          )
        ) {
          return;
        }
        onPlace?.(offset + at.row * columns + at.column);
        return;
      }

      const square = squareAt(event.clientX, event.clientY);
      if (square < 0) return;

      const entry = squares[square];
      if (!entry) return;

      onPick?.(entry.square, entry.item);
    };

    const onContextMenu = (event: React.MouseEvent) => {
      event.preventDefault();
      if (disabled) return;

      if (picked) {
        Store.cancelPickedItem();
        return;
      }

      const square = squareAt(event.clientX, event.clientY);
      if (square < 0) return;

      const entry = latest.current.squares[square];
      if (!entry) return;

      onUse?.(entry.square, entry.item);
    };

    const onPointerMove = (event: React.PointerEvent) => {
      pointer.current = { x: event.clientX, y: event.clientY };
      const square = squareAt(event.clientX, event.clientY);
      const entry = square >= 0 ? latest.current.squares[square] : null;
      setHover(current => {
        if (!entry) return current === null ? current : null;
        if (current && current.entry === entry) return current;
        return {
          entry,
          x: event.clientX,
          y: event.clientY,
          price: priceOf?.(entry.square),
        };
      });
    };

    const onPointerLeave = () => {
      pointer.current = null;
      setHover(null);
      if (!picked) setTarget(null);
    };

    // The hovered entry may have been rebuilt by a refresh: re-resolve by square.
    const hoveredEntry =
      hover && squares[hover.entry.square - offset] === hover.entry
        ? hover.entry
        : hover
          ? squares[hover.entry.square - offset] ?? null
          : null;

    const classes = [
      'mu-item-grid',
      className ?? '',
      disabled ? 'busy' : '',
      picked && dropTint === 'ok' ? 'drop-ok' : '',
      picked && dropTint === 'ban' ? 'drop-ban' : '',
    ]
      .filter(Boolean)
      .join(' ');

    const box = gridFrame(left, top, columns, rows);
    const used = useMemo(() => usedMask(squares), [squares]);
    const hoveredSquares = useMemo(
      () => hoveredMask(squares, picked ? null : hoveredEntry),
      [squares, hoveredEntry, picked]
    );

    return (
      <>
        {frame && (
          <GridFrame
            left={box.left}
            top={box.top}
            width={box.width}
            height={box.height}
          />
        )}

        <div
          ref={gridRef}
          className={classes}
          data-no-drag="true"
          style={{ left, top, width: columns * SQUARE, height: rows * SQUARE }}
          onPointerDown={onPointerDown}
          onContextMenu={onContextMenu}
          onPointerMove={onPointerMove}
          onPointerLeave={onPointerLeave}
        >
          <GridSquares
            columns={columns}
            rows={rows}
            used={used}
            hovered={hoveredSquares}
            squareClass="mu-grid-square"
          />

          {placed.map(entry => (
            <GridItem
              key={entry.square}
              entry={entry}
              price={priceOf?.(entry.square)}
            />
          ))}

          {!!target && !!pickedSize && (
            <div
              className={`mu-grid-drop-target${targetOk ? '' : ' warning'}`}
              style={{
                left: target.column * SQUARE,
                top: target.row * SQUARE,
                width: pickedSize.w * SQUARE,
                height: pickedSize.h * SQUARE,
              }}
            />
          )}
        </div>

        {!picked && !!hover && !!hoveredEntry && (
          <ItemTooltip
            item={hoveredEntry.item}
            x={hover.x}
            y={hover.y}
            context={tooltipContext}
            price={hover.price}
            slot={hoveredEntry.square}
          />
        )}
      </>
    );
  }
);
