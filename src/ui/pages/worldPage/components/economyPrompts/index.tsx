import './style.less';
import { t } from '../../../../../i18n';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import { Store } from '../../../../../store';
import { Economy, type EconomyPrompt } from '../../../../../economy';
import { uiClick } from '../../../../../libs/sfx';
import { itemDisplayName } from '../../../../../common/itemTooltip';

const zen = (gold: number) => `${gold.toLocaleString('en-US')} Zen`;

type Spec = {
  title: string;
  /** The line under the title; the amount / pin field sits below it. */
  hint: string;
  field: 'amount' | 'pin' | 'pin+password' | 'password' | 'none';
  okLabel: string;
  max?: number;
};

/**
 * `CZenReceiptMsgBoxLayout`, `CZenPaymentMsgBoxLayout`,
 * `CStorageLockKeyPadMsgBoxLayout`, `CStorageUnlockMsgBoxLayout`,
 * `CTradeZenMsgBoxLayout` and `CPersonalShopItemValueMsgBoxLayout`: one
 * modal at a time, exactly like the original's message-box stack.
 */
function specOf(prompt: EconomyPrompt): Spec {
  switch (prompt.kind) {
    case 'vault-deposit':
      return {
        title: t('prompt.storeZen'),
        hint: t('prompt.carrying', { amount: zen(Store.playerData.money) }),
        field: 'amount',
        okLabel: t('prompt.store'),
        max: Store.playerData.money,
      };
    case 'vault-withdraw':
      return {
        title: t('prompt.takeZen'),
        hint: t('prompt.vaultHolds', { amount: zen(Economy.vaultMoney) }),
        field: 'amount',
        okLabel: t('prompt.take'),
        max: Economy.vaultMoney,
      };
    case 'vault-unlock':
      return {
        title: t('prompt.unlockVault'),
        hint: t('prompt.enterPin'),
        field: 'pin',
        okLabel: t('prompt.unlock'),
      };
    case 'vault-set-pin':
      return {
        title: t('prompt.setPin'),
        hint: t('prompt.newPinHint'),
        field: 'pin+password',
        okLabel: t('prompt.setPinButton'),
      };
    case 'vault-remove-pin':
      return {
        title: t('prompt.removePin'),
        hint: t('prompt.removePinHint'),
        field: 'password',
        okLabel: t('prompt.remove'),
      };
    case 'trade-money':
      return {
        title: t('prompt.offerZen'),
        hint: t('prompt.carrying', {
          amount: zen(Store.playerData.money + Economy.myTradeMoney),
        }),
        field: 'amount',
        okLabel: t('prompt.offer'),
        max: Store.playerData.money + Economy.myTradeMoney,
      };
    case 'shop-price': {
      const item = Economy.myShopItems[prompt.slot];
      const name = item ? itemDisplayName(item) : undefined;
      return {
        title: t('prompt.setPrice'),
        hint: name
          ? t('prompt.askingPriceFor', { name })
          : t('prompt.askingPrice'),
        field: 'amount',
        okLabel: t('prompt.set'),
        max: 2000000000,
      };
    }
    case 'shop-buy': {
      const entry = Economy.browsing?.items[prompt.slot];
      const name = entry ? itemDisplayName(entry.item) : undefined;
      return {
        title: t('prompt.buy'),
        hint: entry
          ? t('prompt.itemCosts', {
              name: name ?? t('prompt.thisItem'),
              price: zen(entry.price),
            })
          : t('prompt.itemGone'),
        field: 'none',
        okLabel: t('prompt.buy'),
      };
    }
  }
}

const digitsOnly = (value: string) => value.replace(/[^0-9]/g, '');

export const EconomyPrompts = observer(() => {
  const prompt = Economy.prompt;

  const [amount, setAmount] = useState('');
  const [pin, setPin] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    setAmount('');
    setPin('');
    setPassword('');
  }, [prompt?.kind, prompt && 'slot' in prompt ? prompt.slot : -1]);

  if (!prompt) return null;

  const spec = specOf(prompt);
  const value = Number(amount || '0');

  const confirm = () => {
    switch (prompt.kind) {
      case 'vault-deposit':
        Economy.moveVaultMoney(value, true);
        break;
      case 'vault-withdraw':
        Economy.moveVaultMoney(value, false);
        break;
      case 'vault-unlock':
        Economy.unlockVault(Number(pin || '0'));
        break;
      case 'vault-set-pin':
        Economy.setVaultPin(Number(pin || '0'), password);
        break;
      case 'vault-remove-pin':
        Economy.removeVaultPin(password);
        break;
      case 'trade-money':
        Economy.setTradeMoney(value);
        break;
      case 'shop-price':
        Economy.setItemPrice(prompt.slot, value);
        break;
      case 'shop-buy':
        Economy.buyFromShop(prompt.slot);
        break;
    }

    Economy.closePrompt();
  };

  const cancel = () => Economy.closePrompt();

  const okDisabled =
    (spec.field === 'amount' && (value <= 0 || (spec.max !== undefined && value > spec.max))) ||
    (spec.field === 'pin' && pin.length < 4) ||
    (spec.field === 'pin+password' && (pin.length < 4 || !password)) ||
    (spec.field === 'password' && !password);

  return (
    <div className="economy-prompt-layer">
      <div
        className="economy-prompt"
        onKeyDown={event => {
          if (event.key === 'Enter' && !okDisabled) confirm();
          else if (event.key === 'Escape') cancel();
          event.stopPropagation();
        }}
      >
        <div className="economy-prompt-title">{spec.title}</div>
        <div className="economy-prompt-hint">{spec.hint}</div>

        {spec.field === 'amount' && (
          <label className="economy-prompt-field">
            Zen
            <input
              autoFocus
              inputMode="numeric"
              value={amount}
              spellCheck={false}
              onChange={event => setAmount(digitsOnly(event.target.value).slice(0, 10))}
            />
          </label>
        )}

        {(spec.field === 'pin' || spec.field === 'pin+password') && (
          <label className="economy-prompt-field">
            Pin
            <input
              autoFocus
              inputMode="numeric"
              maxLength={5}
              value={pin}
              spellCheck={false}
              onChange={event => setPin(digitsOnly(event.target.value))}
            />
          </label>
        )}

        {(spec.field === 'password' || spec.field === 'pin+password') && (
          <label className="economy-prompt-field">
            Password
            <input
              autoFocus={spec.field === 'password'}
              type="password"
              maxLength={20}
              value={password}
              spellCheck={false}
              onChange={event => setPassword(event.target.value)}
            />
          </label>
        )}

        <div className="economy-prompt-buttons">
          <button type="button" disabled={okDisabled} onClick={uiClick(confirm)}>
            {spec.okLabel}
          </button>
          <button type="button" onClick={uiClick(cancel)}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
});

/** `CTradeMsgBoxLayout`: "<name> wants to trade with you." */
export const TradePrompt = observer(() => {
  const request = Economy.tradeRequest;

  useEffect(() => {
    if (!request) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Enter') Economy.answerTradeRequest(true);
      else if (event.key === 'Escape') Economy.answerTradeRequest(false);
      else return;
      event.preventDefault();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  if (!request) return null;

  return (
    <div className="economy-prompt-layer">
      <div className="economy-prompt">
        <div className="economy-prompt-title">{t('prompt.trade')}</div>
        <div className="economy-prompt-hint">
          {`${request.name} wants to trade with you.`}
        </div>
        <div className="economy-prompt-buttons">
          <button
            type="button"
            onClick={uiClick(() => Economy.answerTradeRequest(true))}
          >
            Accept
          </button>
          <button
            type="button"
            onClick={uiClick(() => Economy.answerTradeRequest(false))}
          >
            Refuse
          </button>
        </div>
      </div>
    </div>
  );
});
