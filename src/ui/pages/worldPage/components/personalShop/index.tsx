import './style.less';
import { t } from '../../../../../i18n';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import { Store } from '../../../../../store';
import { Economy, MAX_SHOP_TITLE } from '../../../../../economy';
import {
  StorageKind,
  isPersonalShopBanned,
} from '../../../../../common/itemStorage';
import { MuSpriteFrame } from '../../../../components/muSprite';
import { MuButton } from '../../../../components/muButton';
import { MuItemWindow } from '../../../../components/muWindow';
import { ItemGrid } from '../../../../components/itemGrid';
import { useEventBus } from '../../../../../hooks/useEventBus';
import {
  BROWSE_TITLE_Y,
  BUTTON_FRAMES,
  BUTTON_HEIGHT,
  BUTTON_WIDTH,
  BUTTON_Y,
  CLOSE_BUTTON_X,
  CLOSE_SPRITE,
  CLOSE_TOOLTIP,
  COLUMNS,
  EXIT_BUTTON_X,
  EXIT_SPRITE,
  EXIT_TOOLTIP,
  GRID_X,
  GRID_Y,
  HEAD_CLOSE_HEIGHT,
  HEAD_CLOSE_WIDTH,
  HEAD_CLOSE_X,
  HEAD_CLOSE_Y,
  INFO_BOTTOM,
  INFO_LINES,
  INFO_TITLE,
  INFO_TITLE_Y,
  INFO_WIDTH,
  INFO_X,
  NAME_HEIGHT,
  NAME_INPUT_WIDTH,
  NAME_INPUT_X,
  NAME_INPUT_Y,
  NAME_SPRITE,
  NAME_WIDTH,
  NAME_X,
  NAME_Y,
  OPEN_BUTTON_X,
  OPEN_SPRITE,
  OPEN_TOOLTIP,
  ROWS,
  SELLING_TEXT,
  SELLING_Y,
  TITLE,
  TITLE_Y,
} from './layout';

const MY_WINDOW_ID = 'my-shop';
const BROWSE_WINDOW_ID = 'shop-browse';

/** The rules block, wrapped inside the frame rather than run off its edge. */
const InfoBlock = () => (
  <div
    className="shop-info"
    style={{
      left: INFO_X,
      top: INFO_TITLE_Y,
      width: INFO_WIDTH,
      maxHeight: INFO_BOTTOM - INFO_TITLE_Y,
    }}
  >
    <div className="shop-info-title">{t(INFO_TITLE)}</div>
    {INFO_LINES.map(line => (
      <div
        key={line.textKey}
        className={`shop-info-line${line.warn ? ' warn' : ''}`}
      >
        {t(line.textKey)}
      </div>
    ))}
  </div>
);

/**
 * `CNewUIMyShopInventory`: the hero's own stall. Items dragged in from the
 * inventory land in the store slots the server keeps behind
 * `FirstStoreItemSlotIndex`; each needs a price before the stall may open.
 */
export const MyShop = observer(() => {
  const [name, setName] = useState(Economy.myShopName);

  useEffect(() => {
    if (Economy.myShopOpen) setName(Economy.myShopName);
  }, [Economy.myShopOpen, Economy.myShopName]);

  if (!Economy.myShopOpen) return null;

  const picked = Store.pickedItem;
  const banned = !!picked && isPersonalShopBanned(picked.item);

  const column = 1 + (Store.inventoryEnabled ? 1 : 0) + (Store.characterInfoEnabled ? 1 : 0);

  return (
    <MuItemWindow
      id={MY_WINDOW_ID}
      className="personal-shop"
      column={column}
      label={t(TITLE)}
      onClose={() => Economy.closeMyShop()}
    >
      <div className="window-title" style={{ top: TITLE_Y }}>
        {t(TITLE)}
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
        onClick={() => Economy.closeMyShop()}
      />

      <MuSpriteFrame
        file={NAME_SPRITE}
        width={NAME_WIDTH}
        height={NAME_HEIGHT}
        style={{ position: 'absolute', left: NAME_X, top: NAME_Y }}
      />
      <input
        className="shop-name-input"
        data-no-drag="true"
        maxLength={MAX_SHOP_TITLE}
        spellCheck={false}
        placeholder={t('personalShop.namePlaceholder')}
        value={name}
        disabled={Economy.myShopSelling}
        style={{ left: NAME_INPUT_X, top: NAME_INPUT_Y, width: NAME_INPUT_WIDTH }}
        onChange={event => setName(event.target.value)}
        onKeyDown={event => {
          if (event.key === 'Enter') Economy.startSelling(name);
          // A focused field swallows every key (KeyboardInputSystem routes
          // to it first), so Escape has to give the focus back itself or the
          // window behind it can never be closed with the keyboard.
          else if (event.key === 'Escape') event.currentTarget.blur();
          event.stopPropagation();
        }}
      />

      <ItemGrid
        items={Economy.myShopItems}
        columns={COLUMNS}
        rows={ROWS}
        left={GRID_X}
        top={GRID_Y}
        disabled={!!Store.pendingItemMove}
        dropTint={picked ? (banned ? 'ban' : 'ok') : 'none'}
        tooltipContext="playerShop"
        priceOf={square => Economy.myShopPrices[square]}
        onPick={square => {
          // A priced item may be lifted back out only while the stall is down.
          if (Economy.myShopSelling) Economy.stopSelling();
          Store.pickItem(StorageKind.PersonalShop, square);
        }}
        onPlace={square =>
          Store.placePickedItem(square, StorageKind.PersonalShop)
        }
        onUse={square => Economy.openPrompt({ kind: 'shop-price', slot: square })}
      />

      {Economy.myShopSelling && (
        <div className="shop-selling" style={{ top: SELLING_Y }}>
          {t(SELLING_TEXT)}
        </div>
      )}

      <InfoBlock />

      <div
        className="window-button"
        data-no-drag="true"
        style={{ left: EXIT_BUTTON_X, top: BUTTON_Y }}
      >
        <MuButton
          file={EXIT_SPRITE}
          width={BUTTON_WIDTH}
          height={BUTTON_HEIGHT}
          frames={BUTTON_FRAMES}
          onClick={() => Economy.closeMyShop()}
        >
          <span className="button-tooltip">{t(EXIT_TOOLTIP)}</span>
        </MuButton>
      </div>

      <div
        className="window-button"
        data-no-drag="true"
        style={{ left: OPEN_BUTTON_X, top: BUTTON_Y }}
      >
        <MuButton
          file={OPEN_SPRITE}
          width={BUTTON_WIDTH}
          height={BUTTON_HEIGHT}
          frames={BUTTON_FRAMES}
          disabled={Economy.myShopSelling}
          onClick={() => Economy.startSelling(name)}
        >
          <span className="button-tooltip">{t(OPEN_TOOLTIP)}</span>
        </MuButton>
      </div>

      <div
        className="window-button"
        data-no-drag="true"
        style={{ left: CLOSE_BUTTON_X, top: BUTTON_Y }}
      >
        <MuButton
          file={CLOSE_SPRITE}
          width={BUTTON_WIDTH}
          height={BUTTON_HEIGHT}
          frames={BUTTON_FRAMES}
          disabled={!Economy.myShopSelling}
          onClick={() => Economy.stopSelling()}
        >
          <span className="button-tooltip">{t(CLOSE_TOOLTIP)}</span>
        </MuButton>
      </div>
    </MuItemWindow>
  );
});

/**
 * `CNewUIPurchaseShopInventory`: someone else's stall. Read-only - a click
 * on a square asks to buy it at the seller's price.
 */
export const ShopBrowser = observer(() => {
  const browse = Economy.browsing;
  if (!browse) return null;

  const items = browse.items.map(entry => entry?.item ?? null);

  const column = 1 + (Store.inventoryEnabled ? 1 : 0) + (Store.characterInfoEnabled ? 1 : 0);

  return (
    <MuItemWindow
      id={BROWSE_WINDOW_ID}
      className="personal-shop shop-browse"
      label={t('personalShop.button')}
      onClose={() => Economy.closeBrowsedShop()}
      column={column}
    >
      <div className="window-title" style={{ top: TITLE_Y }}>
        {t(TITLE)}
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
        onClick={() => Economy.closeBrowsedShop()}
      />

      <MuSpriteFrame
        file={NAME_SPRITE}
        width={NAME_WIDTH}
        height={NAME_HEIGHT}
        style={{ position: 'absolute', left: NAME_X, top: NAME_Y }}
      />
      <div className="shop-browse-title" style={{ top: BROWSE_TITLE_Y }}>
        {browse.shopName || browse.playerName}
      </div>

      <ItemGrid
        items={items}
        columns={COLUMNS}
        rows={ROWS}
        left={GRID_X}
        top={GRID_Y}
        tooltipContext="playerShop"
        priceOf={square => browse.items[square]?.price}
        onPick={square => Economy.openPrompt({ kind: 'shop-buy', slot: square })}
      />

      <InfoBlock />

      <div
        className="window-button"
        data-no-drag="true"
        style={{ left: EXIT_BUTTON_X, top: BUTTON_Y }}
      >
        <MuButton
          file={EXIT_SPRITE}
          width={BUTTON_WIDTH}
          height={BUTTON_HEIGHT}
          frames={BUTTON_FRAMES}
          onClick={() => Economy.closeBrowsedShop()}
        >
          <span className="button-tooltip">{t(EXIT_TOOLTIP)}</span>
        </MuButton>
      </div>
    </MuItemWindow>
  );
});
