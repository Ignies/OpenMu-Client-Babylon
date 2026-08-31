import './style.less';
import { t } from '../../../../../i18n';
import { observer } from 'mobx-react-lite';
import { Store } from '../../../../../store';
import { Economy } from '../../../../../economy';
import { StorageKind, isTradeBanned } from '../../../../../common/itemStorage';
import { MuSpriteFrame } from '../../../../components/muSprite';
import { MuButton } from '../../../../components/muButton';
import { MuItemWindow } from '../../../../components/muWindow';
import { ItemGrid } from '../../../../components/itemGrid';
import { useEventBus } from '../../../../../hooks/useEventBus';
import {
  ACCEPT_FRAMES,
  ACCEPT_HEIGHT,
  ACCEPT_SPRITE,
  ACCEPT_TOOLTIP,
  ACCEPT_WIDTH,
  BUTTON_FRAMES,
  BUTTON_HEIGHT,
  BUTTON_WIDTH,
  BUTTON_Y,
  CLOSE_BUTTON_X,
  CLOSE_SPRITE,
  CLOSE_TOOLTIP,
  COLUMNS,
  HEAD_CLOSE_HEIGHT,
  HEAD_CLOSE_WIDTH,
  HEAD_CLOSE_X,
  HEAD_CLOSE_Y,
  LINE_HEIGHT,
  LINE_SPRITE,
  LINE_WIDTH,
  LINE_X,
  LINE_Y,
  MONEY_HEIGHT,
  MONEY_SPRITE,
  MONEY_TEXT_OFFSET_Y,
  MONEY_TEXT_RIGHT,
  MONEY_WIDTH,
  MY_ACCEPT_X,
  MY_ACCEPT_Y,
  MY_GRID_X,
  MY_GRID_Y,
  MY_MONEY_X,
  MY_MONEY_Y,
  MY_NAME_TEXT_X,
  MY_NAME_TEXT_Y,
  MY_NAME_X,
  MY_NAME_Y,
  NAME_HEIGHT,
  NAME_SPRITE,
  NAME_WIDTH,
  ROWS,
  TITLE,
  TITLE_Y,
  WARN_LINES,
  WARN_TITLE,
  WARN_X,
  WARN_Y,
  YOUR_ACCEPT_X,
  YOUR_ACCEPT_Y,
  YOUR_GRID_X,
  YOUR_GRID_Y,
  YOUR_LEVEL_X,
  YOUR_LEVEL_Y,
  YOUR_MONEY_X,
  YOUR_MONEY_Y,
  YOUR_NAME_TEXT_X,
  YOUR_NAME_TEXT_Y,
  YOUR_NAME_X,
  YOUR_NAME_Y,
  ZEN_BUTTON_X,
  ZEN_SPRITE,
  ZEN_TOOLTIP,
  levelBand,
} from './layout';

const WINDOW_ID = 'trade';

/**
 * `CNewUITrade`: the partner's half on top (read-only) and the hero's below.
 * Items only move in and out of the lower tray; every change drops both
 * accept marks, which is what the server does anyway.
 */
export const TradeWindow = observer(() => {
  if (!Economy.tradeOpen) return null;

  const picked = Store.pickedItem;
  const banned = !!picked && isTradeBanned(picked.item);
  const partner = Economy.tradePartner;
  const band = levelBand(partner?.level ?? 0);

  const column = 1 + (Store.inventoryEnabled ? 1 : 0) + (Store.characterInfoEnabled ? 1 : 0);

  return (
    <MuItemWindow
      id={WINDOW_ID}
      className="trade"
      column={column}
      label={t(TITLE)}
      onClose={() => Economy.cancelTrade()}
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
        onClick={() => Economy.cancelTrade()}
      />

      {}
      <MuSpriteFrame
        file={NAME_SPRITE}
        width={NAME_WIDTH}
        height={NAME_HEIGHT}
        style={{ position: 'absolute', left: YOUR_NAME_X, top: YOUR_NAME_Y }}
      />
      <div
        className="trade-partner-name"
        style={{ left: YOUR_NAME_TEXT_X, top: YOUR_NAME_TEXT_Y }}
      >
        {partner?.name ?? ''}
      </div>
      <div
        className="trade-partner-level"
        style={{ left: YOUR_LEVEL_X, top: YOUR_LEVEL_Y, color: band.color }}
      >
        {`Lv.${band.text}`}
      </div>

      <ItemGrid
        items={Economy.yourTradeItems}
        columns={COLUMNS}
        rows={ROWS}
        left={YOUR_GRID_X}
        top={YOUR_GRID_Y}
        disabled
      />

      <MuSpriteFrame
        file={MONEY_SPRITE}
        width={MONEY_WIDTH}
        height={MONEY_HEIGHT}
        style={{ position: 'absolute', left: YOUR_MONEY_X, top: YOUR_MONEY_Y }}
      />
      <div
        className="trade-money"
        style={{
          right: 190 - MONEY_TEXT_RIGHT,
          top: YOUR_MONEY_Y + MONEY_TEXT_OFFSET_Y,
        }}
      >
        {Economy.yourTradeMoney.toLocaleString('en-US')}
      </div>

      {}
      <MuSpriteFrame
        file={ACCEPT_SPRITE}
        y={Economy.yourTradeConfirm ? ACCEPT_HEIGHT : 0}
        width={ACCEPT_WIDTH}
        height={ACCEPT_HEIGHT}
        style={{ position: 'absolute', left: YOUR_ACCEPT_X, top: YOUR_ACCEPT_Y }}
      />

      {}
      <div className="trade-warn-title" style={{ left: WARN_X, top: WARN_Y }}>
        {t(WARN_TITLE)}
      </div>
      {WARN_LINES.map(line => (
        <div
          key={line.textKey}
          className="trade-warn-line"
          style={{ left: line.x, top: line.y }}
        >
          {t(line.textKey)}
        </div>
      ))}

      <MuSpriteFrame
        file={LINE_SPRITE}
        width={LINE_WIDTH}
        height={LINE_HEIGHT}
        style={{ position: 'absolute', left: LINE_X, top: LINE_Y }}
      />

      {}
      <MuSpriteFrame
        file={NAME_SPRITE}
        width={NAME_WIDTH}
        height={NAME_HEIGHT}
        style={{ position: 'absolute', left: MY_NAME_X, top: MY_NAME_Y }}
      />
      <div
        className="trade-my-name"
        style={{ left: MY_NAME_TEXT_X, top: MY_NAME_TEXT_Y }}
      >
        {Store.playerData.name}
      </div>

      <ItemGrid
        items={Economy.myTradeItems}
        columns={COLUMNS}
        rows={ROWS}
        left={MY_GRID_X}
        top={MY_GRID_Y}
        disabled={!!Store.pendingItemMove}
        dropTint={picked ? (banned ? 'ban' : 'ok') : 'none'}
        onPick={square => Store.pickItem(StorageKind.Trade, square)}
        onPlace={square => {
          // `SendRequestItemToTrade`: putting anything in withdraws our accept.
          if (Economy.myTradeConfirm) Economy.setMyConfirm(false);
          Store.placePickedItem(square, StorageKind.Trade);
        }}
        onUse={square => {
          if (Economy.myTradeConfirm) Economy.setMyConfirm(false);
          Store.autoMoveItem(StorageKind.Trade, square, StorageKind.Inventory);
        }}
      />

      <MuSpriteFrame
        file={MONEY_SPRITE}
        width={MONEY_WIDTH}
        height={MONEY_HEIGHT}
        style={{ position: 'absolute', left: MY_MONEY_X, top: MY_MONEY_Y }}
      />
      <div
        className="trade-money"
        style={{
          right: 190 - MONEY_TEXT_RIGHT,
          top: MY_MONEY_Y + MONEY_TEXT_OFFSET_Y,
        }}
      >
        {Economy.myTradeMoney.toLocaleString('en-US')}
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
          onClick={() => Economy.cancelTrade()}
        >
          <span className="button-tooltip">{t(CLOSE_TOOLTIP)}</span>
        </MuButton>
      </div>

      <div
        className="window-button"
        data-no-drag="true"
        style={{ left: ZEN_BUTTON_X, top: BUTTON_Y }}
      >
        <MuButton
          file={ZEN_SPRITE}
          width={BUTTON_WIDTH}
          height={BUTTON_HEIGHT}
          frames={BUTTON_FRAMES}
          onClick={() => Economy.openPrompt({ kind: 'trade-money' })}
        >
          <span className="button-tooltip">{t(ZEN_TOOLTIP)}</span>
        </MuButton>
      </div>

      <div
        className="window-button"
        data-no-drag="true"
        style={{ left: MY_ACCEPT_X, top: MY_ACCEPT_Y }}
      >
        <MuButton
          file={ACCEPT_SPRITE}
          width={ACCEPT_WIDTH}
          height={ACCEPT_HEIGHT}
          frames={ACCEPT_FRAMES}
          checked={Economy.myTradeConfirm}
          onClick={() => Economy.toggleMyConfirm()}
        >
          <span className="button-tooltip">{t(ACCEPT_TOOLTIP)}</span>
        </MuButton>
      </div>
    </MuItemWindow>
  );
});
