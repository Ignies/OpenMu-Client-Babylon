import { t } from '../../../i18n';
import './style.less';
import { runInAction } from 'mobx';
import { observer } from 'mobx-react-lite';
import { Fragment, useEffect, useState } from 'react';
import { Store } from '../../../store';
import { useEventBus } from '../../../hooks/useEventBus';
import {
  CharacterFocusedPacket,
  CharacterListPacket,
  GuildMemberRoleEnum,
} from '../../../common/packets/ServerToClientPackets';
import { MsgWinCode } from '../../../common/msgWin';
import { MuButton } from '../../components/muButton';
import { MuSpriteFrame } from '../../components/muSprite';
import { MsgWindow } from '../../components/msgWindow';
import { TEXT_COLOR } from '../serversPage/layout';
import { CharMakeWin } from './CharMakeWin';

const BTN_WIDTH = 54;
const BTN_HEIGHT = 30;
const BTN_GAP = 1;
const INFO_GAP = 2;
const INFO_OFFSET_Y = 5;
const INFO_HEIGHT = 21;
const INFO_ALPHA = 143 / 255;

const DECO_WIDTH = 189;
const DECO_HEIGHT = 103;
const DECO_OFFSET_X = 22;
const DECO_OFFSET_Y = 59;

const WIN_MARGIN_X = 22;

const CREATE_FRAMES = { up: 0, active: 1, down: 2 } as const;

const CTLCODE_02BLOCKITEM = 0x02;

function isDeleteBlocked(
  character: ReturnType<CharacterListPacket['getCharacters']>[number]
): boolean {
  return (
    !!character.IsItemBlockActive ||
    (character.Status & CTLCODE_02BLOCKITEM) !== 0
  );
}

export const CharactersPage = observer(() => {
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    Store.refreshCharactersListRequest();
  }, [Store]);

  useEventBus('CharacterList', bytes => {
    const p = new CharacterListPacket(bytes);
    const characters = p.getCharacters();
    runInAction(() => {
      Store.loadingCharactersList = false;
      Store.charactersList = characters;
      Store.creationUnlockFlags = p.UnlockFlags;
    });
  });

  useEventBus('CharacterCreationSuccessful', () => setCreating(false));

  useEventBus('CharacterFocused', bytes => {
    const p = new CharacterFocusedPacket(bytes);

    Store.focusedChar = p.CharacterName;
  });

  const selected = Store.charactersList.find(c => c.Name === Store.focusedChar);

  const hasFreeSlot = Store.charactersList.length < 5;

  const onConnect = () => {
    if (!selected) return;
    Store.selectCharacterRequest(selected.Name);
  };

  const onDelete = () => {
    if (!selected) return;

    if (selected.GuildPosition !== GuildMemberRoleEnum.Undefined) {
      Store.popUpMsgWin(MsgWinCode.DeleteCharacterGuildWarning);
      return;
    }

    if (isDeleteBlocked(selected)) {
      Store.popUpMsgWin(MsgWinCode.DeleteCharacterIdBlock);
      return;
    }

    Store.popUpMsgWin(MsgWinCode.DeleteCharacterConfirm, selected.Name);
  };

  return (
    <div className="characters-page">
      <div className="char-sel-bar" style={{ height: BTN_HEIGHT }}>
        {}
        <MuSpriteFrame
          file="deco.OZT"
          width={DECO_WIDTH}
          height={DECO_HEIGHT}
          style={{
            position: 'absolute',
            right: -DECO_OFFSET_X,
            top: -DECO_OFFSET_Y,
            pointerEvents: 'none',
          }}
        />

        <MuButton
          file="b_create.OZT"
          width={BTN_WIDTH}
          height={BTN_HEIGHT}
          frames={{ ...CREATE_FRAMES, check: 3 }}
          disabled={!hasFreeSlot}
          onClick={() => setCreating(v => !v)}
          style={{ position: 'absolute', left: 0, top: 0 }}
        />
        <MuButton
          file="server_menu_b_all.OZT"
          width={BTN_WIDTH}
          height={BTN_HEIGHT}
          frames={CREATE_FRAMES}
          onClick={() => (Store.optionsEnabled = !Store.optionsEnabled)}
          style={{
            position: 'absolute',
            left: BTN_WIDTH + BTN_GAP,
            top: 0,
          }}
        />

        {}
        <div
          className="char-sel-info"
          style={{
            left: BTN_WIDTH * 2 + BTN_GAP + INFO_GAP,
            right: BTN_WIDTH * 2 + BTN_GAP + INFO_GAP,
            top: INFO_OFFSET_Y,
            height: INFO_HEIGHT,
            background: `rgba(0, 0, 0, ${INFO_ALPHA})`,
          }}
        >
          {selected
            ? `${selected.Name}   Level ${selected.Level}`
            : Store.loadingCharactersList
              ? t('characters.loading')
              : t('characters.select')}
        </div>

        <MuButton
          file="b_connect.OZT"
          width={BTN_WIDTH}
          height={BTN_HEIGHT}
          frames={{ ...CREATE_FRAMES, check: 3 }}
          disabled={!selected}
          onClick={onConnect}
          style={{
            position: 'absolute',
            right: BTN_WIDTH + BTN_GAP,
            top: 0,
          }}
        />
        <MuButton
          file="b_delete.OZT"
          width={BTN_WIDTH}
          height={BTN_HEIGHT}
          frames={{ ...CREATE_FRAMES, check: 3 }}
          disabled={!selected}
          onClick={onDelete}
          style={{ position: 'absolute', right: 0, top: 0 }}
        />
      </div>

      {}
      <MsgWindow />

      {}
      {creating && <CharMakeWin onClose={() => setCreating(false)} />}
    </div>
  );
});
