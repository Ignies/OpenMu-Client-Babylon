import { CREATE_MESSAGES } from './messages';
import { CharacterClassCreationUnlockPacket, CharacterCreationSuccessfulPacket, CharacterDeleteResponseCharacterDeleteResultEnum, CharacterDeleteResponsePacket } from '@versions/shared/packets/ServerToClientPackets';
import { EventBus } from '@/core/eventBus';
import { MsgWinCode } from '@/controllers/interface/msgWin';
import { CharSelect } from './state';
import { addNotification } from '@/modules/chat';
import { MsgBox } from '@/controllers/interface';
import { emptyAppearance, isAppearanceBlank, withAppearanceClass } from '@/controllers/actors/deserializeAppearance';
import { runInAction } from 'mobx';

/** Registers this module's packet listeners (see ../module.ts). */
export function installNet(): void {
  EventBus.on('CharacterDeleteResponse', bytes => {
    const p = new CharacterDeleteResponsePacket(bytes);

    const name = CharSelect.deletingChar;
    CharSelect.deletingChar = null;

    switch (p.Result) {
      case CharacterDeleteResponseCharacterDeleteResultEnum.Successful:
        runInAction(() => {
          CharSelect.charactersList = CharSelect.charactersList.filter(c => c.Name !== name);
          if (CharSelect.focusedChar === name) CharSelect.focusedChar = '';
        });

        MsgBox.popUpMsgWin(MsgWinCode.DeleteCharacterSuccess);
        break;

      case CharacterDeleteResponseCharacterDeleteResultEnum.Unsuccessful:
        MsgBox.popUpMsgWin(MsgWinCode.DeleteCharacterGuildWarning);
        break;

      case CharacterDeleteResponseCharacterDeleteResultEnum.WrongSecurityCode:
        MsgBox.popUpMsgWin(MsgWinCode.StorageResidentWrong);
        break;

      default:
        if (p.Result === 3) {
          MsgBox.popUpMsgWin(MsgWinCode.DeleteCharacterItemBlock);
          break;
        }

        console.warn(`unknown CharacterDeleteResponse result ${p.Result}`);
        MsgBox.popUpMsgWin(MsgWinCode.StorageResidentWrong);
        break;
    }
  });

  EventBus.on('CharacterClassCreationUnlock', bytes => {
    const p = new CharacterClassCreationUnlockPacket(bytes);

    CharSelect.creationUnlockFlags = p.UnlockFlags;
  });

  EventBus.on('CharacterCreationSuccessful', bytes => {
    const p = new CharacterCreationSuccessfulPacket(bytes);

    if (!p.Success) {
      CharSelect.charCreationPending = false;
      addNotification(CREATE_MESSAGES.failed, 'error');
      return;
    }

    const preview = p.PreviewData;

    CharSelect.addCreatedCharacter({
      SlotIndex: p.CharacterSlot,
      Name: p.CharacterName,
      Level: p.Level,
      Status: p.CharacterStatus,
      Appearance: isAppearanceBlank(preview)
        ? emptyAppearance(p.Class)
        : withAppearanceClass(preview, p.Class),
    });
  });

  EventBus.on('CharacterCreationFailed', () => {
    CharSelect.charCreationPending = false;
    addNotification(CREATE_MESSAGES.failed, 'error');
  });
}
