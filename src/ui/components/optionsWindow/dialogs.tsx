import { useEffect } from 'react';
import { MuSpriteFrame } from '../muSprite';
import { MuButton } from '../muButton';
import { WINDOW_Z_MODAL } from '../muWindow/windowState';
import { TEXT_COLOR } from '../../pages/serversPage/layout';
import {
  BACK_SPRITE,
  BTN_BOTH_CANCEL_X,
  BTN_BOTH_OK_X,
  BTN_HEIGHT,
  BTN_SINGLE_X,
  BTN_WIDTH,
  BTN_Y,
  CANCEL_SPRITE,
  OK_SPRITE,
  WIN_HEIGHT,
  WIN_WIDTH,
} from '../msgWindow/layout';

/**
 * Enter and Escape answer the box, in the capture phase so the window stack
 * never sees that Escape and closes the options behind it.
 */
function useAnswerKeys(answer: (yes: boolean) => void): void {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' && e.key !== 'Escape') return;
      e.preventDefault();
      e.stopImmediatePropagation();
      answer(e.key === 'Enter');
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [answer]);
}

const button = (file: string, left: number, onClick: () => void) => (
  <MuButton
    file={file}
    width={BTN_WIDTH}
    height={BTN_HEIGHT}
    frames={{ up: 0, active: 1, down: 2 }}
    color={TEXT_COLOR.brightGray}
    activeColor={TEXT_COLOR.white}
    onClick={onClick}
    style={{ position: 'absolute', left, top: BTN_Y }}
  />
);

/** `CMsgWin` over the option window: a question, OK and Cancel. */
export const ConfirmBox = ({
  text,
  onAnswer,
}: {
  text: string;
  onAnswer: (yes: boolean) => void;
}) => {
  useAnswerKeys(onAnswer);

  return (
    <div className="options-exit-confirm" style={{ zIndex: WINDOW_Z_MODAL }}>
      <MuSpriteFrame file={BACK_SPRITE} width={WIN_WIDTH} height={WIN_HEIGHT}>
        <div className="options-exit-text">{text}</div>
        {button(OK_SPRITE, BTN_BOTH_OK_X, () => onAnswer(true))}
        {button(CANCEL_SPRITE, BTN_BOTH_CANCEL_X, () => onAnswer(false))}
      </MuSpriteFrame>
    </div>
  );
};

/** The same box with one button: something said, nothing asked. */
export const NoticeBox = ({
  text,
  onClose,
}: {
  text: string;
  onClose: () => void;
}) => {
  useAnswerKeys(onClose);

  return (
    <div className="options-exit-confirm" style={{ zIndex: WINDOW_Z_MODAL }}>
      <MuSpriteFrame file={BACK_SPRITE} width={WIN_WIDTH} height={WIN_HEIGHT}>
        <div className="options-exit-text">{text}</div>
        {button(OK_SPRITE, BTN_SINGLE_X, onClose)}
      </MuSpriteFrame>
    </div>
  );
};
