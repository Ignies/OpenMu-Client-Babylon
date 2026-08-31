import './style.less';
import { t } from '../../../../../i18n';
import { observer } from 'mobx-react-lite';
import { Store } from '../../../../../store';
import { Economy, vaultOpenCost } from '../../../../../economy';
import { StorageKind, isVaultBanned } from '../../../../../common/itemStorage';
import { MuSpriteFrame } from '../../../../components/muSprite';
import { MuButton } from '../../../../components/muButton';
import { MuItemWindow } from '../../../../components/muWindow';
import { ItemGrid } from '../../../../components/itemGrid';
import { useEventBus } from '../../../../../hooks/useEventBus';
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
  GRID_X,
  GRID_Y,
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
  if (!Economy.vaultOpen) return null;

  const picked = Store.pickedItem;
  const banned = !!picked && isVaultBanned(picked.item);
  const locked = Economy.vaultLocked;

  const fee = vaultOpenCost(
    Store.playerData.level,
    Store.playerData.masterLevel,
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
  const column = 1 + (Store.inventoryEnabled ? 1 : 0) + (Store.characterInfoEnabled ? 1 : 0);

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

      {}
      <ItemGrid
        items={Economy.vaultItems}
        columns={COLUMNS}
        rows={ROWS}
        left={GRID_X}
        top={GRID_Y}
        disabled={!!Store.pendingItemMove}
        dropTint={picked ? (banned ? 'ban' : 'ok') : 'none'}
        onPick={square => {
          if (!unlock()) return;
          Store.pickItem(StorageKind.Vault, square);
        }}
        onPlace={square => Store.placePickedItem(square, StorageKind.Vault)}
        onUse={square => {
          if (!unlock()) return;
          Store.autoMoveItem(StorageKind.Vault, square, StorageKind.Inventory);
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
        style={{ right: 190 - MONEY_TEXT_RIGHT, top: MONEY_TEXT_Y }}
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
