import { CREATE_MESSAGES } from '@versions/shared/ui/pages/character_select/layout';
import { CharacterClassCreationUnlockPacket, CharacterCreationSuccessfulPacket, CharacterDeleteResponseCharacterDeleteResultEnum, CharacterDeleteResponsePacket } from '@versions/shared/packets/ServerToClientPackets';
import { EventBus } from '@/core/eventBus';
import { MsgWinCode } from '@/controllers/interface/msgWin';
import { Store } from '@/app/store';
import { emptyAppearance, isAppearanceBlank, withAppearanceClass } from '@/controllers/actors/deserializeAppearance';
import { runInAction } from 'mobx';

EventBus.on('CharacterDeleteResponse', bytes => {
  const p = new CharacterDeleteResponsePacket(bytes);

  const name = Store.deletingChar;
  Store.deletingChar = null;

  switch (p.Result) {
    case CharacterDeleteResponseCharacterDeleteResultEnum.Successful:
      runInAction(() => {
        Store.charactersList = Store.charactersList.filter(c => c.Name !== name);
        if (Store.focusedChar === name) Store.focusedChar = '';
      });

      Store.popUpMsgWin(MsgWinCode.DeleteCharacterSuccess);
      break;

    case CharacterDeleteResponseCharacterDeleteResultEnum.Unsuccessful:
      Store.popUpMsgWin(MsgWinCode.DeleteCharacterGuildWarning);
      break;

    case CharacterDeleteResponseCharacterDeleteResultEnum.WrongSecurityCode:
      Store.popUpMsgWin(MsgWinCode.StorageResidentWrong);
      break;

    default:
      if (p.Result === 3) {
        Store.popUpMsgWin(MsgWinCode.DeleteCharacterItemBlock);
        break;
      }

      console.warn(`unknown CharacterDeleteResponse result ${p.Result}`);
      Store.popUpMsgWin(MsgWinCode.StorageResidentWrong);
      break;
  }
});

EventBus.on('CharacterClassCreationUnlock', bytes => {
  const p = new CharacterClassCreationUnlockPacket(bytes);

  Store.creationUnlockFlags = p.UnlockFlags;
});

EventBus.on('CharacterCreationSuccessful', bytes => {
  const p = new CharacterCreationSuccessfulPacket(bytes);

  if (!p.Success) {
    Store.charCreationPending = false;
    Store.addNotification(CREATE_MESSAGES.failed, 'error');
    return;
  }

  const preview = p.PreviewData;

  Store.addCreatedCharacter({
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
  Store.charCreationPending = false;
  Store.addNotification(CREATE_MESSAGES.failed, 'error');
});
