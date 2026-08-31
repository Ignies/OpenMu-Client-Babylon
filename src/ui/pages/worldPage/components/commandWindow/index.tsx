import './style.less';
import { t, type TextKey } from '../../../../../i18n';
import { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { Store } from '../../../../../store';
import { Commands } from '../../../../../commands';
import { isKey } from '../../../../../common/keyBindings';
import type { CommandKind } from '../../../../../common/chatCommands';
import { useEventBus } from '../../../../../hooks/useEventBus';
import { uiClick } from '../../../../../libs/sfx';
import { MuButton } from '../../../../components/muButton';
import { MuSpriteFrame } from '../../../../components/muSprite';
import { MuItemWindow, WINDOW_WIDTH } from '../../../../components/muWindow';
import { MuText } from '../../../../components/muText';
import { TEXT_COLOR } from '../../../serversPage/layout';

/**
 * `CNewUICommandWindow` (NewUICommandWindow.cpp): the "D" window - eleven
 * 108x29 `newui_btn_empty` buttons down the inventory-style frame, one per
 * player-to-player command. Clicking one arms it (the button stays in its
 * pressed frame and its label goes bold); the next right click on a player
 * within two tiles runs it (`RunCommand`, in commands.ts). While armed, the
 * name of the player under the cursor follows the mouse on
 * `newUI_cursorid_wnd` (128x32), white when the command can run and red when
 * it cannot (`m_bCanCommand`).
 */

const WINDOW_ID = 'command-window';
const HOT_KEY = 'command';

/** `RenderText(m_Pos.x + 60, m_Pos.y + 12, GlobalText[938], 72, …, RT3_SORT_CENTER)`. */
const TITLE = { x: 60, y: 12, width: 72 };
/** The X in the frame art (`ptExitBtn1`). */
const HEAD_CLOSE = { left: 169, top: 7, width: 13, height: 12 };
/** `ChangeButtonInfo(m_Pos.x + 13, m_Pos.y + 392, 36, 29)`. */
const EXIT_BUTTON = { x: 13, y: 392, width: 36, height: 29 };
/** `(COMMAND_WINDOW_WIDTH / 2 - 108 / 2)`, `m_Pos.y + 33`, one 29 px button per `29 + 1`. */
const BUTTON = { width: 108, height: 29 };
const BUTTON_X = WINDOW_WIDTH / 2 - BUTTON.width / 2;
const BUTTON_Y = 33;
const BUTTON_STEP = BUTTON.height + 1;
/** `RenderBitmap(BITMAP_COMMAND_WINDOW_BEGIN, MouseX + 5, MouseY + 5, 128, 32)`. */
const ID_TAG = { dx: 5, dy: 5, width: 128, height: 32 };

const EXIT_SPRITE = 'newui_exit_00.OZT';
const BUTTON_SPRITE = 'newui_btn_empty.OZT';
const ID_TAG_SPRITE = 'newui_Cursorid_wnd.OZJ';

/** GlobalText 943, 1124, 944, 945, 946, 1352, 1321, 1322, 947, 948, 949 - the window's order. */
const ENTRIES: { kind: CommandKind; labelKey: TextKey }[] = [
  { kind: 'trade', labelKey: 'command.trade' },
  { kind: 'purchase', labelKey: 'command.purchase' },
  { kind: 'party', labelKey: 'command.party' },
  { kind: 'whisper', labelKey: 'command.whisper' },
  { kind: 'guild', labelKey: 'command.guild' },
  { kind: 'guildUnion', labelKey: 'command.guildUnion' },
  { kind: 'rival', labelKey: 'command.rival' },
  { kind: 'rivalOff', labelKey: 'command.rivalOff' },
  { kind: 'addFriend', labelKey: 'command.addFriend' },
  { kind: 'follow', labelKey: 'command.follow' },
  { kind: 'battle', labelKey: 'command.battle' },
];

/** `g_iFollowCharacter` is re-aimed by `MoveHero` every step; once a second is enough for a walk. */
const FOLLOW_TICK_MS = 1000;
/** How often the id tag re-reads the object under the cursor. */
const ID_TAG_TICK_MS = 100;

const CommandButton = observer(({ kind, labelKey, index }: { kind: CommandKind; labelKey: TextKey; index: number }) => {
  const armed = Commands.pending === kind;
  return (
    <div
      data-no-drag="true"
      className={`command-entry${armed ? ' armed' : ''}`}
      style={{ position: 'absolute', left: BUTTON_X, top: BUTTON_Y + index * BUTTON_STEP }}
    >
      <MuButton
        file={BUTTON_SPRITE}
        width={BUTTON.width}
        height={BUTTON.height}
        // `SetBtnState`: armed = frame 2 in every state.
        frames={armed ? { up: 2, active: 2, down: 2 } : { up: 0, active: 1, down: 2 }}
        color={TEXT_COLOR.brightGray}
        activeColor={TEXT_COLOR.white}
        label={t(labelKey)}
        onClick={() => Commands.arm(kind)}
        labelStyle={{ fontSize: 11, fontWeight: armed ? 600 : 400 }}
      />
    </div>
  );
});

/** The `CURSOR_IDSELECT` name tag that follows the mouse while an entry is armed. */
const CursorIdTag = observer(() => {
  const [mouse, setMouse] = useState({ x: -1000, y: -1000 });
  const [target, setTarget] = useState<{ name: string; ok: boolean } | null>(null);

  useEffect(() => {
    const onMove = (e: PointerEvent) => setMouse({ x: e.clientX, y: e.clientY });
    window.addEventListener('pointermove', onMove);
    const id = window.setInterval(() => {
      const hovered = Store.world?.currentPointerTarget;
      if (!hovered || !hovered.playerAnimation || hovered.localPlayer) {
        setTarget(null);
        return;
      }
      setTarget({
        name: hovered.objectNameInWorld ?? '',
        ok: Commands.canRunOn(hovered),
      });
    }, ID_TAG_TICK_MS);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.clearInterval(id);
    };
  }, []);

  if (!target) return null;

  return (
    <MuSpriteFrame
      file={ID_TAG_SPRITE}
      width={ID_TAG.width}
      height={ID_TAG.height}
      className="command-id-tag"
      style={{ left: mouse.x + ID_TAG.dx, top: mouse.y + ID_TAG.dy }}
    >
      {/* `g_hFontBig`, white when `m_bCanCommand`, else red, centred at +64/+7. */}
      <MuText
        face="big"
        color={target.ok ? '#fff' : 'rgb(255,0,0)'}
        className="command-id-name"
        text={target.name}
      />
    </MuSpriteFrame>
  );
});

export const CommandWindow = observer(() => {
  useEventBus('keyPressed', key => {
    if (!Store.world?.playerEntity) return;
    if (isKey(HOT_KEY, key)) Commands.toggleWindow();
  });

  // `g_iFollowCharacter`: keep walking after the followed player.
  useEffect(() => {
    const id = window.setInterval(() => Commands.followTick(), FOLLOW_TICK_MS);
    return () => window.clearInterval(id);
  }, []);

  const close = uiClick(() => Commands.closeWindow());

  return (
    <>
      {Commands.pending && <CursorIdTag />}
      {Commands.windowOpen && (
        <MuItemWindow
          id={WINDOW_ID}
          className="command-window"
          column={2}
          label={t('command.title')}
          // `UpdateKeyEvent`: Escape closes the window (and disarms).
          onClose={() => Commands.closeWindow()}
        >
          {/* GlobalText 938 in `g_hFontBold`. */}
          <MuText
            face="bold"
            align="center"
            className="command-title"
            style={{ left: TITLE.x, top: TITLE.y, width: TITLE.width }}
            text={t('command.title')}
          />
          <div className="head-close" data-no-drag="true" style={HEAD_CLOSE} onClick={close} />

          {ENTRIES.map((entry, i) => (
            <CommandButton key={entry.kind} kind={entry.kind} labelKey={entry.labelKey} index={i} />
          ))}

          <div
            data-no-drag="true"
            style={{ position: 'absolute', left: EXIT_BUTTON.x, top: EXIT_BUTTON.y }}
          >
            <MuButton
              file={EXIT_SPRITE}
              width={EXIT_BUTTON.width}
              height={EXIT_BUTTON.height}
              frames={{ up: 0, down: 1 }}
              onClick={close}
            />
          </div>
        </MuItemWindow>
      )}
    </>
  );
});
