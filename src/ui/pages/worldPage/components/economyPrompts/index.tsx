import './style.less';
import { t } from '../../../../../i18n';
import { observer } from 'mobx-react-lite';
import {
  useEffect,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react';
import { Store } from '../../../../../store';
import { Economy, type EconomyPrompt } from '../../../../../economy';
import { itemDisplayName } from '../../../../../common/itemTooltip';
import { itemValue } from '../../../../../common/itemValue';
import { QuickItemActions } from '../../../../../common/quickItemActions';
import { MAX_BULK_BUY } from '../../../../../common/quickItemRules';
import { MuSpriteFrame } from '../../../../components/muSprite';
import { MuButton } from '../../../../components/muButton';
import { TEXT_COLOR } from '../../../serversPage/layout';
import {
  BACK_SPRITE,
  BTN_BOTH_CANCEL_X,
  BTN_BOTH_OK_X,
  BTN_HEIGHT,
  BTN_INPUT_CANCEL_X,
  BTN_INPUT_OK_X,
  BTN_WIDTH,
  BTN_Y,
  CANCEL_SPRITE,
  INPUT_HEIGHT,
  INPUT_SPRITE,
  INPUT_TEXT_INSET_X,
  INPUT_TEXT_INSET_Y,
  INPUT_WIDTH,
  INPUT_X,
  INPUT_Y,
  OK_SPRITE,
  TEXT_INSET_X,
  TEXT_LINE_HEIGHT,
  TEXT_LINES,
  TEXT_TOP,
  WIN_HEIGHT,
  WIN_WIDTH,
} from '../../../../components/msgWindow/layout';
import {
  TALL_BACK_HEIGHT,
  TALL_BACK_SPRITE,
  TALL_BACK_TOP,
  TALL_BACK_WIDTH,
  TALL_BOTTOM_HEIGHT,
  TALL_BOTTOM_SPRITE,
  TALL_BTN_CANCEL_X,
  TALL_BTN_OK_X,
  TALL_BTN_Y,
  TALL_FIELD_ONE_INPUT_Y,
  TALL_FIELD_ONE_LABEL_Y,
  TALL_FIELD_TWO_INPUT_Y,
  TALL_FIELD_TWO_LABEL_Y,
  TALL_HEIGHT,
  TALL_INPUT_X,
  TALL_LABEL_HEIGHT,
  TALL_MIDDLE_HEIGHT,
  TALL_MIDDLE_LINES,
  TALL_MIDDLE_SPRITE,
  TALL_TEXT_INSET_X,
  TALL_TEXT_LINE_HEIGHT,
  TALL_TEXT_LINES,
  TALL_TEXT_TOP,
  TALL_TOP_HEIGHT,
  TALL_TOP_SPRITE,
  TALL_WIDTH,
} from './layout';

const zen = (gold: number) => `${gold.toLocaleString('en-US')} Zen`;

type Spec = {
  title: string;
  /** The line under the title; the amount / pin field sits below it. */
  hint: string;
  field: 'amount' | 'pin' | 'pin+password' | 'password' | 'none';
  max?: number;
  /** What the number box counts; Zen unless something else is. */
  amountLabel?: string;
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
        max: Store.playerData.money,
      };
    case 'vault-withdraw':
      return {
        title: t('prompt.takeZen'),
        hint: t('prompt.vaultHolds', { amount: zen(Economy.vaultMoney) }),
        field: 'amount',
        max: Economy.vaultMoney,
      };
    case 'vault-unlock':
      return {
        title: t('prompt.unlockVault'),
        hint: t('prompt.enterPin'),
        field: 'pin',
      };
    case 'vault-set-pin':
      return {
        title: t('prompt.setPin'),
        hint: t('prompt.newPinHint'),
        field: 'pin+password',
      };
    case 'vault-remove-pin':
      return {
        title: t('prompt.removePin'),
        hint: t('prompt.removePinHint'),
        field: 'password',
      };
    case 'trade-money':
      return {
        title: t('prompt.offerZen'),
        hint: t('prompt.carrying', {
          amount: zen(Store.playerData.money + Economy.myTradeMoney),
        }),
        field: 'amount',
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
      };
    }
    case 'npc-buy-many': {
      const item = Store.npcShop?.items[prompt.slot] ?? null;
      return {
        title: t('prompt.buy'),
        hint: item
          ? t('prompt.buyHowMany', {
              name: itemDisplayName(item),
              price: zen(itemValue(item, 0)),
            })
          : t('prompt.itemGone'),
        field: 'amount',
        max: MAX_BULK_BUY,
        amountLabel: t('prompt.quantity'),
      };
    }
  }
}

const digitsOnly = (value: string) => value.replace(/[^0-9]/g, '');

/** `message_back.OZT`, the 352x113 box the sell confirmation is drawn on. */
const SmallBox = ({ children }: { children: ReactNode }) => (
  <MuSpriteFrame
    file={BACK_SPRITE}
    width={WIN_WIDTH}
    height={WIN_HEIGHT}
    className="economy-prompt"
  >
    {children}
  </MuSpriteFrame>
);

/** The three-slice box, for the one prompt that asks for two things. */
const TallBox = ({ children }: { children: ReactNode }) => (
  <div className="economy-prompt" style={{ width: TALL_WIDTH, height: TALL_HEIGHT }}>
    <MuSpriteFrame
      file={TALL_BACK_SPRITE}
      style={{
        position: 'absolute',
        left: 0,
        top: TALL_BACK_TOP,
        width: TALL_BACK_WIDTH,
        height: TALL_BACK_HEIGHT,
        backgroundSize: '100% 100%',
      }}
    />
    <MuSpriteFrame
      file={TALL_TOP_SPRITE}
      width={TALL_WIDTH}
      height={TALL_TOP_HEIGHT}
      style={{ position: 'absolute', left: 0, top: 0 }}
    />
    <MuSpriteFrame
      file={TALL_MIDDLE_SPRITE}
      width={TALL_WIDTH}
      height={TALL_MIDDLE_HEIGHT * TALL_MIDDLE_LINES}
      style={{
        position: 'absolute',
        left: 0,
        top: TALL_TOP_HEIGHT,
        backgroundRepeat: 'repeat-y',
      }}
    />
    <MuSpriteFrame
      file={TALL_BOTTOM_SPRITE}
      width={TALL_WIDTH}
      height={TALL_BOTTOM_HEIGHT}
      style={{
        position: 'absolute',
        left: 0,
        top: TALL_HEIGHT - TALL_BOTTOM_HEIGHT,
      }}
    />
    {children}
  </div>
);

type TextBlockProps = {
  title: string;
  hint: string;
  inset: number;
  top: number;
  lineHeight: number;
  lines: number;
  /** The narrow box lets the message run onto a second line. */
  wrapHint?: boolean;
};

const PromptText = ({
  title,
  hint,
  inset,
  top,
  lineHeight,
  lines,
  wrapHint,
}: TextBlockProps) => (
  <div
    className="economy-prompt-text"
    style={{
      left: inset,
      right: inset,
      top,
      height: lineHeight * lines,
      lineHeight: `${lineHeight}px`,
    }}
  >
    <div className="economy-prompt-line">{title}</div>
    <div className={wrapHint ? 'economy-prompt-line-wrap' : 'economy-prompt-line'}>
      {hint}
    </div>
  </div>
);

type PromptInputProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  left: number;
  top: number;
  autoFocus?: boolean;
  password?: boolean;
  numeric?: boolean;
  maxLength?: number;
};

/** `delete_secret_number.OZT` with the field itself invisible on top of it. */
const PromptInput = ({
  label,
  value,
  onChange,
  left,
  top,
  autoFocus,
  password,
  numeric,
  maxLength,
}: PromptInputProps) => (
  <MuSpriteFrame
    file={INPUT_SPRITE}
    width={INPUT_WIDTH}
    height={INPUT_HEIGHT}
    style={{ position: 'absolute', left, top }}
  >
    <input
      className="economy-prompt-input"
      aria-label={label}
      autoFocus={autoFocus}
      type={password ? 'password' : 'text'}
      inputMode={numeric ? 'numeric' : undefined}
      maxLength={maxLength}
      value={value}
      spellCheck={false}
      onChange={event => onChange(event.target.value)}
      style={{ paddingLeft: INPUT_TEXT_INSET_X, paddingTop: INPUT_TEXT_INSET_Y }}
    />
  </MuSpriteFrame>
);

const labelStyle = (top: number): CSSProperties => ({
  left: TALL_INPUT_X,
  width: INPUT_WIDTH,
  top,
  height: TALL_LABEL_HEIGHT,
  lineHeight: `${TALL_LABEL_HEIGHT}px`,
});

type ButtonsProps = {
  okX: number;
  cancelX: number;
  top: number;
  okDisabled?: boolean;
  onOk: () => void;
  onCancel: () => void;
};

const PromptButtons = ({
  okX,
  cancelX,
  top,
  okDisabled,
  onOk,
  onCancel,
}: ButtonsProps) => (
  <>
    <MuButton
      file={OK_SPRITE}
      width={BTN_WIDTH}
      height={BTN_HEIGHT}
      frames={{ up: 0, active: 1, down: 2 }}
      color={TEXT_COLOR.brightGray}
      activeColor={TEXT_COLOR.white}
      disabled={okDisabled}
      onClick={onOk}
      style={{ position: 'absolute', left: okX, top }}
    />
    <MuButton
      file={CANCEL_SPRITE}
      width={BTN_WIDTH}
      height={BTN_HEIGHT}
      frames={{ up: 0, active: 1, down: 2 }}
      color={TEXT_COLOR.brightGray}
      activeColor={TEXT_COLOR.white}
      onClick={onCancel}
      style={{ position: 'absolute', left: cancelX, top }}
    />
  </>
);

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
      case 'npc-buy-many':
        QuickItemActions.startBuyRun(prompt.slot, value);
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

  const onKeyDown = (event: ReactKeyboardEvent) => {
    if (event.key === 'Enter' && !okDisabled) confirm();
    else if (event.key === 'Escape') cancel();
    event.stopPropagation();
  };

  if (spec.field === 'pin+password') {
    return (
      <div className="economy-prompt-layer" onKeyDown={onKeyDown}>
        <TallBox>
          <PromptText
            title={spec.title}
            hint={spec.hint}
            inset={TALL_TEXT_INSET_X}
            top={TALL_TEXT_TOP}
            lineHeight={TALL_TEXT_LINE_HEIGHT}
            lines={TALL_TEXT_LINES}
            wrapHint
          />

          <div className="economy-prompt-label" style={labelStyle(TALL_FIELD_ONE_LABEL_Y)}>
            {t('prompt.pin')}
          </div>
          <PromptInput
            label={t('prompt.pin')}
            value={pin}
            onChange={next => setPin(digitsOnly(next))}
            left={TALL_INPUT_X}
            top={TALL_FIELD_ONE_INPUT_Y}
            autoFocus
            numeric
            maxLength={5}
          />

          <div className="economy-prompt-label" style={labelStyle(TALL_FIELD_TWO_LABEL_Y)}>
            {t('prompt.password')}
          </div>
          <PromptInput
            label={t('prompt.password')}
            value={password}
            onChange={setPassword}
            left={TALL_INPUT_X}
            top={TALL_FIELD_TWO_INPUT_Y}
            password
            maxLength={20}
          />

          <PromptButtons
            okX={TALL_BTN_OK_X}
            cancelX={TALL_BTN_CANCEL_X}
            top={TALL_BTN_Y}
            okDisabled={okDisabled}
            onOk={confirm}
            onCancel={cancel}
          />
        </TallBox>
      </div>
    );
  }

  const hasField = spec.field !== 'none';

  return (
    <div className="economy-prompt-layer" onKeyDown={onKeyDown}>
      <SmallBox>
        <PromptText
          title={spec.title}
          hint={spec.hint}
          inset={TEXT_INSET_X}
          top={TEXT_TOP}
          lineHeight={TEXT_LINE_HEIGHT}
          lines={TEXT_LINES}
        />

        {spec.field === 'amount' && (
          <PromptInput
            label={spec.amountLabel ?? t('common.zen')}
            value={amount}
            onChange={next => setAmount(digitsOnly(next).slice(0, 10))}
            left={INPUT_X}
            top={INPUT_Y}
            autoFocus
            numeric
          />
        )}

        {spec.field === 'pin' && (
          <PromptInput
            label={t('prompt.pin')}
            value={pin}
            onChange={next => setPin(digitsOnly(next))}
            left={INPUT_X}
            top={INPUT_Y}
            autoFocus
            numeric
            maxLength={5}
          />
        )}

        {spec.field === 'password' && (
          <PromptInput
            label={t('prompt.password')}
            value={password}
            onChange={setPassword}
            left={INPUT_X}
            top={INPUT_Y}
            autoFocus
            password
            maxLength={20}
          />
        )}

        <PromptButtons
          okX={hasField ? BTN_INPUT_OK_X : BTN_BOTH_OK_X}
          cancelX={hasField ? BTN_INPUT_CANCEL_X : BTN_BOTH_CANCEL_X}
          top={BTN_Y}
          okDisabled={okDisabled}
          onOk={confirm}
          onCancel={cancel}
        />
      </SmallBox>
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
      <SmallBox>
        <PromptText
          title={t('prompt.trade')}
          hint={t('prompt.wantsToTrade', { name: request.name })}
          inset={TEXT_INSET_X}
          top={TEXT_TOP}
          lineHeight={TEXT_LINE_HEIGHT}
          lines={TEXT_LINES}
        />
        <PromptButtons
          okX={BTN_BOTH_OK_X}
          cancelX={BTN_BOTH_CANCEL_X}
          top={BTN_Y}
          onOk={() => Economy.answerTradeRequest(true)}
          onCancel={() => Economy.answerTradeRequest(false)}
        />
      </SmallBox>
    </div>
  );
});
