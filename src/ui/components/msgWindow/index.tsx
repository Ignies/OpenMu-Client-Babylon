import './style.less';
import { useEffect, useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { Store } from '../../../store';
import { MuSpriteFrame } from '../muSprite';
import { MuButton } from '../muButton';
import { TEXT_COLOR } from '../../pages/serversPage/layout';
import { MSG_WIN_MESSAGES, MsgWinCode, MsgWinType } from '../../../common/msgWin';
import {
  BACK_SPRITE,
  BTN_BOTH_CANCEL_X,
  BTN_BOTH_OK_X,
  BTN_HEIGHT,
  BTN_INPUT_CANCEL_X,
  BTN_INPUT_OK_X,
  BTN_SINGLE_X,
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
  SECURITY_CODE_MAX_LENGTH,
  TEXT_INSET_X,
  TEXT_LINE_HEIGHT,
  TEXT_LINES,
  TEXT_TOP,
  TEXT_TOP_NO_BUTTONS,
  WIN_HEIGHT,
  WIN_WIDTH,
} from './layout';

export const MsgWindow = observer(() => {
  const state = Store.msgWin;
  const code = state?.code;
  const type = code === undefined ? null : MSG_WIN_MESSAGES[code].type;

  const [securityCode, setSecurityCode] = useState('');

  useEffect(() => {
    if (code !== MsgWinCode.DeleteCharacterResident) setSecurityCode('');
  }, [code]);

  const onOk = () => {
    if (!code) return;

    Store.closeMsgWin();

    switch (code) {
      case MsgWinCode.DeleteCharacterConfirm:
        Store.popUpMsgWin(MsgWinCode.DeleteCharacterResident);
        break;

      case MsgWinCode.DeleteCharacterResident: {
        const name = Store.focusedChar;
        if (!name) break;

        Store.deleteCharacterRequest(name, securityCode);

        Store.popUpMsgWin(MsgWinCode.Wait);
        break;
      }

      default:
        break;
    }
  };

  const onCancel = () => Store.closeMsgWin();

  // The handlers close over `securityCode`; the ref keeps the one listener
  // (registered once per window type) calling the current pair.
  const actions = useRef({ onOk, onCancel });
  useEffect(() => {
    actions.current = { onOk, onCancel };
  });

  useEffect(() => {
    if (type === null) return;

    const handler = (e: KeyboardEvent) => {
      if (e.isComposing || e.keyCode === 229) return;
      const { onOk, onCancel } = actions.current;
      if (e.key === 'Enter') {
        if (type > MsgWinType.Cancel) onOk();
        else if (type === MsgWinType.Cancel) onCancel();
      } else if (e.key === 'Escape') {
        if (type === MsgWinType.Ok) onOk();
        else if (type > MsgWinType.None) onCancel();
      } else {
        return;
      }

      e.preventDefault();
    };

    window.addEventListener('keydown', handler);

    return () => window.removeEventListener('keydown', handler);
  }, [type]);

  if (!state || type === null) return null;

  const showOk = type === MsgWinType.Ok || type >= MsgWinType.Both;
  const showCancel = type === MsgWinType.Cancel || type >= MsgWinType.Both;

  let okX = BTN_SINGLE_X;
  let cancelX = BTN_SINGLE_X;

  if (type === MsgWinType.Both) {
    okX = BTN_BOTH_OK_X;
    cancelX = BTN_BOTH_CANCEL_X;
  } else if (type === MsgWinType.StrInput) {
    okX = BTN_INPUT_OK_X;
    cancelX = BTN_INPUT_CANCEL_X;
  }

  return (
    <div className="msg-window-layer">
      {}
      <MuSpriteFrame
        file={BACK_SPRITE}
        width={WIN_WIDTH}
        height={WIN_HEIGHT}
        className="msg-window"
      >
        <div
          className="msg-window-text"
          style={{
            left: TEXT_INSET_X,
            right: TEXT_INSET_X,
            top: type === MsgWinType.None ? TEXT_TOP_NO_BUTTONS : TEXT_TOP,
            height: TEXT_LINE_HEIGHT * TEXT_LINES,
            lineHeight: `${TEXT_LINE_HEIGHT}px`,
          }}
        >
          {state.text}
        </div>

        {type === MsgWinType.StrInput && (
          <MuSpriteFrame
            file={INPUT_SPRITE}
            width={INPUT_WIDTH}
            height={INPUT_HEIGHT}
            style={{ position: 'absolute', left: INPUT_X, top: INPUT_Y }}
          >
            {}
            <input
              className="msg-window-input"
              type="password"
              autoFocus
              value={securityCode}
              onChange={e => setSecurityCode(e.target.value)}
              maxLength={SECURITY_CODE_MAX_LENGTH}
              style={{
                paddingLeft: INPUT_TEXT_INSET_X,
                paddingTop: INPUT_TEXT_INSET_Y,
              }}
            />
          </MuSpriteFrame>
        )}

        {showOk && (
          <MuButton
            file={OK_SPRITE}
            width={BTN_WIDTH}
            height={BTN_HEIGHT}
            frames={{ up: 0, active: 1, down: 2 }}
            color={TEXT_COLOR.brightGray}
            activeColor={TEXT_COLOR.white}
            onClick={onOk}
            style={{ position: 'absolute', left: okX, top: BTN_Y }}
          />
        )}
        {showCancel && (
          <MuButton
            file={CANCEL_SPRITE}
            width={BTN_WIDTH}
            height={BTN_HEIGHT}
            frames={{ up: 0, active: 1, down: 2 }}
            color={TEXT_COLOR.brightGray}
            activeColor={TEXT_COLOR.white}
            onClick={onCancel}
            style={{ position: 'absolute', left: cancelX, top: BTN_Y }}
          />
        )}
      </MuSpriteFrame>
    </div>
  );
});
