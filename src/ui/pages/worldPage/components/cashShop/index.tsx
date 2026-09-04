import './style.less';
import { useMemo, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { runInAction } from 'mobx';
import type { Item } from '../../../../../ecs/world';
import { Store } from '../../../../../store';
import { uiClick } from '../../../../../libs/sfx';
import { MuSpriteFrame } from '../../../../components/muSprite';
import { MuButton } from '../../../../components/muButton';
import { MuItemWindow, MuTableFrame } from '../../../../components/muWindow';
import { ItemIcon } from '../../../../components/itemIcon';
import { ItemTooltip } from '../../../../components/itemTooltip';
import { GridSquares, hoveredMask, usedMask } from '../../../../components/itemGrid';
import { JEWEL, JEWEL_GROUP } from '../../../../../common/jewelUpgrade';
import { t, type TextKey } from '../../../../../i18n';
import {
  CashShopState,
  rollGacha,
  toggleCashShopWindow,
  walletOnHand,
  type Product,
} from '../../../../../cashShop/state';
import {
  COLUMNS,
  EXIT,
  EXIT_SPRITE,
  ROLL,
  ROLL_SPRITE,
  GRID_FRAME_HEIGHT,
  GRID_FRAME_WIDTH,
  GRID_FRAME_X,
  GRID_FRAME_Y,
  GRID_X,
  GRID_Y,
  ROWS,
  SQUARE,
  SQUARES,
  STAGE_HEIGHT,
  STAGE_WIDTH,
  STAGE_X,
  STAGE_Y,
  TAB_HEIGHT,
  TAB_SPRITE,
  TAB_WIDTH,
  TAB_X,
  TAB_Y,
  TITLE_Y,
  WALLET_HEIGHT,
  WALLET_SPRITE,
  WALLET_WIDTH,
  WALLET_X,
  WALLET_Y,
} from './layout';

/**
 * The cash shop, in the game's own 190x429 item window.
 *
 * It is the NPC shop with jewels for zen: the same grid of 20px squares, the
 * same item icons and tooltips, the same money bar on the bottom edge. A player
 * who can read a merchant can read this without being taught anything.
 *
 * No sign-in. The player is already logged in - the window opens off the item
 * shop button that has been sitting unwired on the bottom bar - and the wallet
 * is counted off the inventory the client already holds, so it is exact and
 * live rather than a minute-stale reading from the shop's database.
 *
 * Nothing here spends anything yet: buying needs the delivery queue, because a
 * player looking at this window is by definition logged in, and the shop only
 * ever writes to an account the game server does not have in memory.
 */

/** The API's labels are written for a web page; four tabs across 148px are not. */
const TAB_LABEL: Record<string, TextKey> = {
  wings: 'cashShop.tab.wings',
  quest: 'cashShop.tab.quest',
  boxes: 'cashShop.tab.boxes',
  gacha: 'cashShop.tab.gacha',
};

const WINDOW_ID = 'cash-shop';

/** The catalogue laid out on the grid, each entry taking its real footprint. */
type Placed = {
  product: Product;
  item: Item;
  slot: number;
  column: number;
  row: number;
  w: number;
  h: number;
};

/**
 * First fit, left to right and top to bottom, exactly as a merchant's stock is
 * packed. Items keep their real size, so a 5x3 pair of wings looks as big here
 * as it will in the bag.
 */
function layOut(products: Product[]): { squares: (Placed | null)[]; placed: Placed[] } {
  const squares: (Placed | null)[] = new Array(SQUARES).fill(null);
  const placed: Placed[] = [];

  const fits = (column: number, row: number, w: number, h: number) => {
    if (column + w > COLUMNS || row + h > ROWS) return false;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (squares[(row + y) * COLUMNS + column + x]) return false;
      }
    }

    return true;
  };

  for (const product of products) {
    if (product.group === null || product.number === null) continue;

    const w = Math.max(1, product.width);
    const h = Math.max(1, product.height);

    let found = -1;

    for (let slot = 0; slot < SQUARES && found < 0; slot++) {
      const column = slot % COLUMNS;
      const row = (slot - column) / COLUMNS;
      if (fits(column, row, w, h)) found = slot;
    }

    if (found < 0) continue;

    const column = found % COLUMNS;
    const row = (found - column) / COLUMNS;
    const entry: Placed = {
      product,
      item: { group: product.group, num: product.number, lvl: product.level },
      slot: found,
      column,
      row,
      w,
      h,
    };

    placed.push(entry);

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) squares[(row + y) * COLUMNS + column + x] = entry;
    }
  }

  return { squares, placed };
}

const JEWEL_ITEMS = {
  bless: { group: JEWEL_GROUP, num: JEWEL.bless } as Item,
  soul: { group: JEWEL_GROUP, num: JEWEL.soul } as Item,
};

/** A jewel count drawn with the game's own icon, as the money bar draws zen. */
const JewelCount = ({ kind, count, short }: { kind: 'bless' | 'soul'; count: number; short?: boolean }) => (
  <span className={`cash-jewel${short ? ' is-short' : ''}`}>
    <span className="cash-jewel-icon">
      <ItemIcon item={JEWEL_ITEMS[kind]} />
    </span>
    {count}
  </span>
);

/* ------------------------------------------------------------------ gacha */

const RAYS = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];

const GachaStage = observer(() => {
  const { rolling, roll } = CashShopState;
  const rarity = roll?.rarity ?? 'common';

  return (
    <div
      className={`cash-gacha rarity-${rarity}${rolling ? ' is-rolling' : ''}${roll ? ' is-revealed' : ''}`}
      style={{ left: STAGE_X, top: STAGE_Y, width: STAGE_WIDTH, height: STAGE_HEIGHT }}
    >
      <div className="cash-orb">
        <span className="cash-ring ring-1" />
        <span className="cash-ring ring-2" />
        <span className="cash-core" />
      </div>

      {roll && !rolling && (
        <div className="cash-reveal" key={roll.seed}>
          <span className="cash-burst" />
          {RAYS.map(angle => (
            <span key={angle} className="cash-ray" style={{ transform: `rotate(${angle}deg)` }} />
          ))}

          <div
            className="cash-prize"
            style={{ width: roll.width * SQUARE * 2, height: roll.height * SQUARE * 2 }}
          >
            <ItemIcon
              item={{ group: roll.group, num: roll.num, lvl: roll.level, isExcellent: true }}
            />
          </div>

          <div className="cash-prize-name">
            {t('item.excellentPrefix', { name: roll.name })}{' '}
            <span className="cash-prize-level">+{roll.level}</span>
          </div>

          <ul className="cash-prize-options">
            {roll.options.map(option => (
              <li key={option}>{option}</li>
            ))}
          </ul>
        </div>
      )}

      {!roll && !rolling && (
        <p className="cash-gacha-hint">{t('cashShop.gachaHint')}</p>
      )}
    </div>
  );
});

/* ----------------------------------------------------------------- window */

export const CashShop = observer(() => {
  const [hover, setHover] = useState<{ entry: Placed; x: number; y: number } | null>(null);

  const { windowOpen, tab, catalogue, lines, status, error, rolling } = CashShopState;

  const shown = useMemo(
    () => catalogue.filter(product => product.line === tab),
    [catalogue, tab]
  );
  const { squares, placed } = useMemo(() => layOut(shown), [shown]);
  const used = useMemo(() => usedMask(squares), [squares]);
  const hoveredEntry = hover ? squares[hover.entry.slot] ?? null : null;
  const hovered = useMemo(() => hoveredMask(squares, hoveredEntry), [squares, hoveredEntry]);

  if (!windowOpen) return null;

  const wallet = walletOnHand(Store.playerData.items);
  const isGacha = tab === 'gacha';

  return (
    <MuItemWindow
      id={WINDOW_ID}
      label={t('cashShop.title')}
      className="cash-shop"
      onClose={() => toggleCashShopWindow(false)}
    >
      <div className="cash-title" style={{ top: TITLE_Y }}>
        {t('cashShop.title')}
      </div>

      <div className="cash-tabs" data-no-drag="true" style={{ left: TAB_X, top: TAB_Y }}>
        {lines.map((line, index) => (
          <MuSpriteFrame
            key={line.id}
            file={TAB_SPRITE}
            width={TAB_WIDTH}
            height={TAB_HEIGHT}
            className={`cash-tab${line.id === tab ? ' is-active' : ''}`}
            style={{ position: 'absolute', left: index * (TAB_WIDTH + 1), top: 0 }}
            onClick={uiClick(() => runInAction(() => (CashShopState.tab = line.id)))}
          >
            <span>{TAB_LABEL[line.id] ? t(TAB_LABEL[line.id]) : line.label}</span>
          </MuSpriteFrame>
        ))}
      </div>

      <MuTableFrame
        left={GRID_FRAME_X}
        top={GRID_FRAME_Y}
        width={GRID_FRAME_WIDTH}
        height={GRID_FRAME_HEIGHT}
      />

      {status === 'loading' && <p className="cash-note">{t('cashShop.loading')}</p>}
      {status === 'failed' && <p className="cash-note is-bad">{error}</p>}

      {isGacha ? (
        <GachaStage />
      ) : (
        <div
          className="cash-grid"
          data-no-drag="true"
          style={{ left: GRID_X, top: GRID_Y, width: COLUMNS * SQUARE, height: ROWS * SQUARE }}
          onPointerMove={event => {
            const rect = event.currentTarget.getBoundingClientRect();
            const scale = rect.width / (COLUMNS * SQUARE);
            const column = Math.floor((event.clientX - rect.left) / scale / SQUARE);
            const row = Math.floor((event.clientY - rect.top) / scale / SQUARE);
            const inside = column >= 0 && column < COLUMNS && row >= 0 && row < ROWS;
            const entry = inside ? squares[row * COLUMNS + column] : null;

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
            squareClass="cash-square"
          />

          {placed.map(entry => (
            <div
              key={entry.slot}
              className="cash-item"
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
      )}

      {!!hoveredEntry && !!hover && !isGacha && (
        <>
          <ItemTooltip item={hoveredEntry.item} x={hover.x} y={hover.y} context="shop" />
          <div className="cash-hover-price">
            <JewelCount
              kind="bless"
              count={hoveredEntry.product.bless}
              short={wallet.bless < hoveredEntry.product.bless}
            />
            <JewelCount
              kind="soul"
              count={hoveredEntry.product.soul}
              short={wallet.soul < hoveredEntry.product.soul}
            />
          </div>
        </>
      )}

      <MuSpriteFrame
        file={WALLET_SPRITE}
        width={WALLET_WIDTH}
        height={WALLET_HEIGHT}
        style={{ position: 'absolute', left: WALLET_X, top: WALLET_Y }}
      />
      <div className="cash-wallet" style={{ left: WALLET_X, top: WALLET_Y, width: WALLET_WIDTH }}>
        <JewelCount kind="bless" count={wallet.bless} />
        <JewelCount kind="soul" count={wallet.soul} />
      </div>

      {isGacha && (
        <MuButton
          file={ROLL_SPRITE}
          width={ROLL.width}
          height={ROLL.height}
          frames={{ up: 0, active: 1, down: 2 }}
          disabled={rolling}
          onClick={uiClick(() => void rollGacha())}
          label={rolling ? '...' : t('cashShop.roll')}
          style={{ position: 'absolute', left: ROLL.x, top: ROLL.y }}
        />
      )}

      <MuButton
        file={EXIT_SPRITE}
        width={EXIT.width}
        height={EXIT.height}
        frames={{ up: 0, active: 1, down: 2 }}
        onClick={uiClick(() => toggleCashShopWindow(false))}
        style={{ position: 'absolute', left: isGacha ? 100 : EXIT.x, top: EXIT.y }}
      />
    </MuItemWindow>
  );
});
