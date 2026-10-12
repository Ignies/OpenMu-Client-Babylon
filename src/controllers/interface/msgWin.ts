import { makeObservable, observable } from 'mobx';
import type { TextKey } from '../../i18n';
import { t } from '../../i18n';

export enum MsgWinType {
  None = 0,
  Cancel = 1,
  Ok = 2,
  Both = 3,
  StrInput = 4,
}

export enum MsgWinCode {
  Wait = 'MESSAGE_WAIT',
  DeleteCharacterConfirm = 'MESSAGE_DELETE_CHARACTER_CONFIRM',
  DeleteCharacterResident = 'MESSAGE_DELETE_CHARACTER_RESIDENT',
  DeleteCharacterSuccess = 'MESSAGE_DELETE_CHARACTER_SUCCESS',
  DeleteCharacterIdBlock = 'MESSAGE_DELETE_CHARACTER_ID_BLOCK',
  DeleteCharacterItemBlock = 'MESSAGE_DELETE_CHARACTER_ITEM_BLOCK',
  DeleteCharacterGuildWarning = 'MESSAGE_DELETE_CHARACTER_GUILDWARNING',
  StorageResidentWrong = 'MESSAGE_STORAGE_RESIDENTWRONG',
  ConfirmSellItem = 'MESSAGE_CONFIRM_SELL_ITEM',
  ConfirmDropItem = 'MESSAGE_CONFIRM_DROP_ITEM',
  ConfirmAddPoints = 'MESSAGE_CONFIRM_ADD_POINTS',
  ConfirmMix = 'MESSAGE_CONFIRM_MIX',
  GameEndCountdown = 'MESSAGE_GAME_END_COUNTDOWN',
  ConfirmModule = 'MESSAGE_CONFIRM_MODULE',
  ConfirmCancelBuff = 'MESSAGE_CONFIRM_CANCEL_BUFF',
}

type MsgWinMessage = {
  type: MsgWinType;
  textId: number;
  /** Resolved by `formatMsgWinText`, so the box follows the language. */
  textKey: TextKey;
};

export const MSG_WIN_MESSAGES: Record<MsgWinCode, MsgWinMessage> = {
  [MsgWinCode.Wait]: {
    type: MsgWinType.None,
    textId: 471,
    textKey: 'msgWin.pleaseWait',
  },
  [MsgWinCode.DeleteCharacterConfirm]: {
    type: MsgWinType.Both,
    textId: 1712,
    textKey: 'msgWin.deleteCharacter',
  },
  [MsgWinCode.DeleteCharacterResident]: {
    type: MsgWinType.StrInput,
    textId: 1713,
    textKey: 'msgWin.enterSecurityCode',
  },
  [MsgWinCode.DeleteCharacterSuccess]: {
    type: MsgWinType.Ok,
    textId: 1714,
    textKey: 'msgWin.characterDeleted',
  },
  [MsgWinCode.DeleteCharacterIdBlock]: {
    type: MsgWinType.Ok,
    textId: 417,
    textKey: 'msgWin.accountBlocked',
  },
  [MsgWinCode.DeleteCharacterItemBlock]: {
    type: MsgWinType.Ok,
    textId: 439,
    textKey: 'msgWin.itemBlocked',
  },
  [MsgWinCode.DeleteCharacterGuildWarning]: {
    type: MsgWinType.Ok,
    textId: 1654,
    textKey: 'msgWin.guildCharacter',
  },
  [MsgWinCode.StorageResidentWrong]: {
    type: MsgWinType.Ok,
    textId: 401,
    textKey: 'msgWin.wrongPassword',
  },
  // The original never asked; these two are ours (`quickItemActions.ts`), so
  // they carry no GlobalText id.
  [MsgWinCode.ConfirmSellItem]: {
    type: MsgWinType.Both,
    textId: -1,
    textKey: 'msgWin.confirmSell',
  },
  [MsgWinCode.ConfirmDropItem]: {
    type: MsgWinType.Both,
    textId: -1,
    textKey: 'msgWin.confirmDrop',
  },
  [MsgWinCode.ConfirmAddPoints]: {
    type: MsgWinType.Both,
    textId: -1,
    textKey: 'msgWin.confirmAddPoints',
  },
  // `CMixCheckMsgBox`: the recipe's name, then GlobalText[539] (NewUICommonMessageBox.cpp:1895-1925).
  [MsgWinCode.ConfirmMix]: {
    type: MsgWinType.Both,
    textId: 539,
    textKey: 'msgWin.confirmMix',
  },
  // `CSysMenuWin`'s Exit Game: no button, the seconds left (MsgWin.cpp:310-315).
  [MsgWinCode.GameEndCountdown]: {
    type: MsgWinType.None,
    textId: 380,
    textKey: 'msgWin.exitCountdown',
  },
  // Ours: a world's third-party module asks to run (src/modules/_api, "Streaming").
  [MsgWinCode.ConfirmModule]: {
    type: MsgWinType.Both,
    textId: -1,
    textKey: 'msgWin.confirmModule',
  },
  // `CInfinityArrowCancelMsgBoxLayout` / `CBuffSwellOfMPCancelMsgBoxLayOut`: the skill's name, then
  // "would you like to cancel" (NewUICommonMessageBox.cpp:1503-1580).
  [MsgWinCode.ConfirmCancelBuff]: {
    type: MsgWinType.Both,
    textId: -1,
    textKey: 'msgWin.cancelBuff',
  },
};

/** A `%s` line takes the one string; a `{hole}` line takes the named set. */
export type MsgWinArg = string | Record<string, string | number>;

export function formatMsgWinText(code: MsgWinCode, arg?: MsgWinArg): string {
  const key = MSG_WIN_MESSAGES[code].textKey;

  if (arg === undefined) return t(key);
  if (typeof arg === 'string') return t(key).replace('%s', arg);

  return t(key, arg);
}

/**
 * The message box that is up (`CMsgWin`), drawn by `components/msg_window`. `popUpMsgWin` raises one;
 * `onOk` is what its Yes does (it gets the box's input text, the resident number of a delete).
 */
export const MsgBox = new (class {
  msgWin: { code: MsgWinCode; text: string } | null = null;

  /**
   * What the Yes of the box currently up does, when it was raised with one
   * (the valuable-item confirmations). Kept off `msgWin` so the observable
   * state stays plain data.
   */
  private msgWinOk: ((input: string) => void) | null = null;

  constructor() {
    makeObservable(this, { msgWin: observable });
  }

  popUpMsgWin(code: MsgWinCode, arg?: MsgWinArg, onOk?: (input: string) => void): void {
    this.msgWin = { code, text: formatMsgWinText(code, arg) };
    this.msgWinOk = onOk ?? null;
  }

  /** The Yes handler of the box that is up, cleared as it is handed over. */
  takeMsgWinOk(): ((input: string) => void) | null {
    const onOk = this.msgWinOk;
    this.msgWinOk = null;
    return onOk;
  }

  closeMsgWin(): void {
    this.msgWin = null;
    this.msgWinOk = null;
  }
})();
