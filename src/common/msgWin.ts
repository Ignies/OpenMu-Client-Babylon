import type { TextKey } from '../i18n';
import { t } from '../i18n';

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
}

export type MsgWinMessage = {
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
    textKey: 'msgWin.enterPassword',
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
};

/** A `%s` line takes the one string; a `{hole}` line takes the named set. */
export type MsgWinArg = string | Record<string, string | number>;

export function formatMsgWinText(code: MsgWinCode, arg?: MsgWinArg): string {
  const key = MSG_WIN_MESSAGES[code].textKey;

  if (arg === undefined) return t(key);
  if (typeof arg === 'string') return t(key).replace('%s', arg);

  return t(key, arg);
}
