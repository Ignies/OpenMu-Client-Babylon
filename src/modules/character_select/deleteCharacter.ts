import { MsgBox, MsgWinCode } from '@/controllers/interface';
import { Store } from '@/app/store';

/**
 * The delete button's boxes: `MESSAGE_DELETE_CHARACTER_CONFIRM`, then `..._RESIDENT`, whose
 * typed resident number goes out with the delete of the focused character; `Wait` until the answer.
 */
export function confirmDeleteCharacter(name: string): void {
  MsgBox.popUpMsgWin(MsgWinCode.DeleteCharacterConfirm, name, () =>
    MsgBox.popUpMsgWin(MsgWinCode.DeleteCharacterResident, undefined, securityCode => {
      const focused = Store.focusedChar;
      if (!focused) return;

      Store.deleteCharacterRequest(focused, securityCode);

      MsgBox.popUpMsgWin(MsgWinCode.Wait);
    })
  );
}
