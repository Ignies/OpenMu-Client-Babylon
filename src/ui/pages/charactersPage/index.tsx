import { t } from '../../../i18n';
import './style.less';
import { runInAction } from 'mobx';
import { observer } from 'mobx-react-lite';
import { Fragment, useEffect, useRef, useState } from 'react';
import { Store } from '../../../store';
import { useEventBus } from '../../../hooks/useEventBus';
import { playUiSound } from '../../../libs/sfx';
import { isTypingInField } from '../../../ecs/systems/keyboardInputSystem';
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
import { CharacterSelectionPlate } from './CharacterSelectionPlate';

const BTN_WIDTH = 54;
const BTN_HEIGHT = 30;
const BTN_GAP = 1;
const STATUS_GAP = 2;
const STATUS_OFFSET_Y = 5;
const STATUS_HEIGHT = 21;

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
  // From the request until the world replaces this screen: a second
  // SelectCharacter finds OpenMU past CharacterSelection and it drops the
  // connection (SelectCharacterAction.cs:20-24). The original leaves for the
  // loading scene at once (CharacterScene.cpp:80).
  const [selecting, setSelecting] = useState(false);

  useEffect(() => {
    Store.refreshCharactersListRequest();
  }, [Store]);

  useEventBus('CharacterList', bytes => {
    const p = new CharacterListPacket(bytes);
    const characters = p.getCharacters();
    setSelecting(false);
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
    if (!selected || selecting) return;
    setSelecting(true);
    Store.selectCharacterRequest(selected.Name);
  };

  // Enter is the Connect button while nothing else is up
  // (CharacterScene.cpp:193-207); the create window keeps its own Enter.
  const onEnter = () => {
    if (creating || selecting || Store.optionsEnabled || !selected) return;
    playUiSound('click'); // CharacterScene.cpp:199
    onConnect();
  };
  const enterAction = useRef(onEnter);
  useEffect(() => {
    enterAction.current = onEnter;
  });

  // Its own keydown, not the keyPressed broadcast: that one takes the first
  // repeat of an Enter pressed in a field or a message box for a new press, so
  // an Enter held through the login would start a character. Document bubble
  // runs before the message box's own window listener.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' || e.repeat) return;
      if (e.isComposing || e.keyCode === 229) return;
      if (Store.msgWin) return;
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        isTypingInField()
      ) {
        return;
      }
      enterAction.current();
    };

    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

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
      <CharacterSelectionPlate />

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

        {!selected && (
          <div
            className="char-sel-status"
            style={{
              left: BTN_WIDTH * 2 + BTN_GAP + STATUS_GAP,
              right: BTN_WIDTH * 2 + BTN_GAP + STATUS_GAP,
              top: STATUS_OFFSET_Y,
              height: STATUS_HEIGHT,
            }}
          >
            {Store.loadingCharactersList
              ? t('characters.loading')
              : Store.charactersList.length > 0
                ? t('characters.select')
                : null}
          </div>
        )}

        <MuButton
          file="b_connect.OZT"
          width={BTN_WIDTH}
          height={BTN_HEIGHT}
          frames={{ ...CREATE_FRAMES, check: 3 }}
          disabled={!selected || selecting}
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
