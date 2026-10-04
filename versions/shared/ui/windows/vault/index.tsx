import { MuWindows } from '@/controllers/interface/windowManager';
import './style.less';
import { masterLevel } from '@/modules/skills/masterLevel';
import { t } from '@/i18n';
import { observer } from 'mobx-react-lite';
import { Bag } from '@/modules/inventory';
import { Hero } from '@/modules/hero';
import { Economy, vaultOpenCost } from '@/modules/economy/economy';
import { StorageKind, isVaultBanned } from '@/modules/inventory/itemStorage';
import { MuSpriteFrame } from '@/controllers/interface/components/mu_sprite';
import { MuButton } from '@/controllers/interface/components/mu_button';
import { MuItemWindow } from '@/controllers/interface/components/mu_window';
import { ItemGrid } from '@/controllers/interface/components/item_grid';
import { ItemSearchBox, useItemSearch } from '@/controllers/interface/components/item_search';
import { BulkMove } from '@/modules/inventory/bulkMove';
import { QuickItemActions } from '@/modules/inventory/quickItemActions';
import { isJewel, itemDef } from '@/controllers/item_rules';

import { goldColor } from '@/controllers/item_rules';
import {
  BUTTON_FRAMES,
  BUTTON_HEIGHT,
  BUTTON_WIDTH,
  BUTTON_Y,
  COLUMNS,
  DEPOSIT_BUTTON_X,
  DEPOSIT_SPRITE,
  DEPOSIT_TOOLTIP,
  FEE_LABEL,
  FEE_LABEL_X,
  FEE_TEXT_Y,
  BULK_WIDTH,
  GRID_X,
  GRID_Y,
  SEARCH_WIDTH,
  SEARCH_X,
  SEARCH_Y,
  HEAD_CLOSE_HEIGHT,
  HEAD_CLOSE_WIDTH,
  HEAD_CLOSE_X,
  HEAD_CLOSE_Y,
  LOCKED_SPRITE,
  LOCK_BUTTON_X,
  LOCK_TOOLTIP,
  MONEY_HEIGHT,
  MONEY_SPRITE,
  MONEY_TEXT_RIGHT,
  MONEY_TEXT_Y,
  MONEY_WIDTH,
  MONEY_X,
  MONEY_Y,
  ROWS,
  TITLE,
  TITLE_LOCKED,
  TITLE_UNLOCKED,
  TITLE_Y,
  UNLOCKED_SPRITE,
  WITHDRAW_BUTTON_X,
  WITHDRAW_SPRITE,
  WITHDRAW_TOOLTIP,
} from './layout';

const WINDOW_ID = 'vault';

/**
 * `CNewUIStorageInventory`: the warehouse. Items cross by drag or by the
 * right click that shuttles them (`ProcessStorageItemAutoMove`); the two
 * money buttons open the zen prompts and the padlock the pin ones.
 */
export const Vault = observer(() => {
  const search = useItemSearch();

  if (!Economy.vaultOpen) return null;

  const picked = Bag.pickedItem;
  const banned = !!picked && isVaultBanned(picked.item);
  const locked = Economy.vaultLocked;

  const fee = vaultOpenCost(
    Hero.level,
    masterLevel(),
    locked
  );

  /**
   * `SendRequestItemToMyInven`: a locked vault asks for the pin before it
   * lets anything out, instead of sending a move the server would refuse.
   */
  const unlock = () => {
    if (Economy.vaultUsable) return true;
    Economy.openPrompt({ kind: 'vault-unlock' });
    return false;
  };

  // The original parks each item window left of the last one.
  const column = 1 + (MuWindows.isOpen('inventory') ? 1 : 0) + (MuWindows.isOpen('character_info') ? 1 : 0);

  return (
    <MuItemWindow
      id={WINDOW_ID}
      className="vault"
      column={column}
      label={t(TITLE)}
      onClose={() => Economy.closeVault()}
    >
      <div
        className={`window-title${locked ? ' locked' : ''}`}
        style={{ top: TITLE_Y }}
      >
        {`${t(TITLE)} (${t(locked ? TITLE_LOCKED : TITLE_UNLOCKED)})`}
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
        onClick={() => Economy.closeVault()}
      />

      <ItemSearchBox search={search} left={SEARCH_X} top={SEARCH_Y} width={SEARCH_WIDTH} />

      {/* Everything the chaos machine eats, out of the way in one click. */}
      <div
        className="vault-bulk"
        data-no-drag="true"
        title={t('vault.depositJewelsHint')}
        style={{ left: SEARCH_X + SEARCH_WIDTH + 4, top: SEARCH_Y, width: BULK_WIDTH }}
        onClick={() => {
          if (!unlock()) return;
          BulkMove.start(StorageKind.Inventory, StorageKind.Vault, item => {
            const def = itemDef(item.group, item.num);
            return !!def && isJewel(def);
          });
        }}
      >
        {t('vault.depositJewels')}
      </div>

      {}
      <ItemGrid
        items={Economy.vaultItems}
        columns={COLUMNS}
        rows={ROWS}
        left={GRID_X}
        top={GRID_Y}
        disabled={!!Bag.pendingItemMove}
        dropTint={picked ? (banned ? 'ban' : 'ok') : 'none'}
        dimmed={search.active ? item => !search.matches(item) : undefined}
        onPick={square => {
          if (!unlock()) return;
          Bag.pickItem(StorageKind.Vault, square);
        }}
        onPlace={square => Bag.placePickedItem(square, StorageKind.Vault)}
        onUse={square => {
          if (!unlock()) return;
          Bag.autoMoveItem(StorageKind.Vault, square, StorageKind.Inventory);
        }}
        onQuickAction={square => {
          if (!unlock()) return;
          QuickItemActions.toInventory(StorageKind.Vault, square);
        }}
      />

      <MuSpriteFrame
        file={MONEY_SPRITE}
        width={MONEY_WIDTH}
        height={MONEY_HEIGHT}
        style={{ position: 'absolute', left: MONEY_X, top: MONEY_Y }}
      />
      <div
        className="vault-money"
        style={{
          right: 190 - MONEY_TEXT_RIGHT,
          top: MONEY_TEXT_Y,
          color: goldColor(Economy.vaultMoney),
        }}
      >
        {Economy.vaultMoney.toLocaleString('en-US')}
      </div>

      <div className="vault-fee-label" style={{ left: FEE_LABEL_X, top: FEE_TEXT_Y }}>
        {t(FEE_LABEL)}
      </div>
      <div
        className="vault-fee"
        style={{ right: 190 - MONEY_TEXT_RIGHT, top: FEE_TEXT_Y }}
      >
        {fee.toLocaleString('en-US')}
      </div>

      <div
        className="window-button"
        data-no-drag="true"
        style={{ left: DEPOSIT_BUTTON_X, top: BUTTON_Y }}
      >
        <MuButton
          file={DEPOSIT_SPRITE}
          width={BUTTON_WIDTH}
          height={BUTTON_HEIGHT}
          frames={BUTTON_FRAMES}
          onClick={() => Economy.openPrompt({ kind: 'vault-deposit' })}
        >
          <span className="button-tooltip">{t(DEPOSIT_TOOLTIP)}</span>
        </MuButton>
      </div>

      <div
        className="window-button"
        data-no-drag="true"
        style={{ left: WITHDRAW_BUTTON_X, top: BUTTON_Y }}
      >
        <MuButton
          file={WITHDRAW_SPRITE}
          width={BUTTON_WIDTH}
          height={BUTTON_HEIGHT}
          frames={BUTTON_FRAMES}
          onClick={() => Economy.openPrompt({ kind: 'vault-withdraw' })}
        >
          <span className="button-tooltip">{t(WITHDRAW_TOOLTIP)}</span>
        </MuButton>
      </div>

      {}
      <div
        className="window-button"
        data-no-drag="true"
        style={{ left: LOCK_BUTTON_X, top: BUTTON_Y }}
      >
        <MuButton
          file={locked ? LOCKED_SPRITE : UNLOCKED_SPRITE}
          width={BUTTON_WIDTH}
          height={BUTTON_HEIGHT}
          frames={BUTTON_FRAMES}
          onClick={() =>
            Economy.openPrompt({
              kind: locked
                ? Economy.vaultUnlocked
                  ? 'vault-remove-pin'
                  : 'vault-unlock'
                : 'vault-set-pin',
            })
          }
        >
          <span className="button-tooltip">{t(LOCK_TOOLTIP)}</span>
        </MuButton>
      </div>
    </MuItemWindow>
  );
});
