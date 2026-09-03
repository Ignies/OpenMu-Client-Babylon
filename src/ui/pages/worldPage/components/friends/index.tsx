import './style.less';
import { t, type TextKey } from '../../../../../i18n';
import { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { isKey } from '../../../../../common/keyBindings';
import { Store } from '../../../../../store';
import { Messenger, type MessengerTab } from '../../../../../messenger';
import { ChatRooms } from '../../../../../chatRooms';
import {
  MAX_FRIENDS,
  MAX_LETTER_TEXT,
  MAX_LETTER_TITLE,
  isFriendOnline,
} from '../../../../../common/messenger';
import { useEventBus } from '../../../../../hooks/useEventBus';
import { uiClick } from '../../../../../libs/sfx';
import { MuButton } from '../../../../components/muButton';
import { MuSpriteFrame } from '../../../../components/muSprite';
import { MuItemWindow, MuTableFrame } from '../../../../components/muWindow';

/**
 * `CNewUIFriendWindow` (NewUIFriendWindow.cpp) - the friend list and the
 * letter box, in the original's item-window frame with the `newui_guild_tab`
 * strip on top, plus the third tab: the chat-room list
 * (`CUIChatRoomListTabWindow`), listing the rooms open on MU's separate chat
 * server (chatRooms.ts). Talk on an online friend opens a chat room, like
 * the original's button 3; on an offline friend it falls back to the chat
 * box's whisper field.
 */

const WINDOW_ID = 'friend-window';
const HOT_KEY = 'friends';

const TITLE_Y = 12;
/** The X in the frame art. `left`/`top`, not `x`/`y`: those are not CSS on a div. */
const HEAD_CLOSE = { left: 169, top: 7, width: 13, height: 12 };

// GuildConstants::UILayout, shared with the guild window's tab strip.
const TAB = { x: 12, y: 68, width: 166, height: 22 };
const TAB_WIDTH = 55;
const LIST = { x: 12, y: 96, width: 166, height: 250 };
const BUTTONS_Y = 352;
const EXIT_BUTTON = { x: 13, y: 392, width: 36, height: 29 };

const TAB_STRIP_SPRITE = 'newui_guild_tab01.OZT';
const TAB_ON_SPRITE = 'newui_guild_tab02.OZT';
const EXIT_SPRITE = 'newui_exit_00.OZT';

const TABS: { key: MessengerTab; labelKey: TextKey }[] = [
  { key: 'friends', labelKey: 'friends.tab.friends' },
  { key: 'letters', labelKey: 'friends.tab.letters' },
  { key: 'rooms', labelKey: 'friends.tab.rooms' },
];

const TabStrip = observer(() => (
  <>
    <MuSpriteFrame
      file={TAB_STRIP_SPRITE}
      width={TAB.width}
      height={TAB.height}
      className="messenger-tab-strip"
      style={{ left: TAB.x, top: TAB.y, backgroundSize: '100% 100%' }}
    />
    {TABS.map((tab, i) => (
      <div
        key={tab.key}
        className={`messenger-tab${Messenger.tab === tab.key ? ' active' : ''}`}
        data-no-drag="true"
        style={{ left: TAB.x + i * TAB_WIDTH, top: TAB.y, width: TAB_WIDTH, height: TAB.height }}
        onClick={uiClick(() => Messenger.setTab(tab.key))}
      >
        {Messenger.tab === tab.key && (
          <MuSpriteFrame
            file={TAB_ON_SPRITE}
            width={TAB_WIDTH}
            height={TAB.height}
            style={{ position: 'absolute', left: 0, top: 0, backgroundSize: '100% 100%' }}
          />
        )}
        <span>{t(tab.labelKey)}</span>
      </div>
    ))}
  </>
));

/** The original's button 3: chat room when online, whisper otherwise. */
function talkTo(name: string): void {
  const friend = Messenger.friends.find(f => f.name === name);
  if (friend && isFriendOnline(friend)) ChatRooms.openRoomWith(name);
  else Messenger.whisperFriend(name);
}

const FriendsTab = observer(() => {
  const [name, setName] = useState('');
  const selected = Messenger.selectedFriend;

  const add = () => {
    if (Messenger.requestAddFriend(name)) setName('');
  };

  return (
    <div
      className="messenger-body"
      data-no-drag="true"
      style={{ left: LIST.x + 8, top: LIST.y + 8, width: LIST.width - 16, height: LIST.height - 16 }}
    >
      <div className="messenger-head">
        {t('friends.count', {
          count: Messenger.friends.length,
          max: MAX_FRIENDS,
        })}
      </div>
      <div className="messenger-list">
        {Messenger.friends.length === 0 && (
          <div className="messenger-empty">{t('friends.empty')}</div>
        )}
        {Messenger.friends.map(friend => {
          const online = isFriendOnline(friend);
          return (
            <div
              key={friend.name}
              className={`messenger-row${selected === friend.name ? ' selected' : ''}${
                online ? '' : ' offline'
              }`}
              onClick={uiClick(() => Messenger.selectFriend(friend.name))}
              onDoubleClick={() => talkTo(friend.name)}
            >
              <span className={`messenger-dot${online ? ' on' : ''}`} />
              <span className="messenger-name">{friend.name}</span>
              <span className="messenger-meta">
                {online
                  ? t('friends.server', { server: friend.server })
                  : t('common.offline')}
              </span>
            </div>
          );
        })}
      </div>

      <label className="messenger-add">
        <input
          value={name}
          maxLength={10}
          spellCheck={false}
          placeholder={t('friends.namePlaceholder')}
          onChange={e => setName(e.target.value.replace(/[^A-Za-z0-9]/g, ''))}
          onKeyDown={e => {
            if (e.key === 'Enter') add();
          }}
        />
        <button type="button" onClick={uiClick(add)} disabled={!name}>
          {t('friends.add')}
        </button>
      </label>
    </div>
  );
});

const FriendsButtons = observer(() => {
  const selected = Messenger.selectedFriend;
  const has = !!selected && Messenger.friends.some(f => f.name === selected);

  return (
    <div className="messenger-buttons" data-no-drag="true" style={{ top: BUTTONS_Y }}>
      <button type="button" disabled={!has} onClick={uiClick(() => talkTo(selected))}>
        {t('friends.talk')}
      </button>
      <button type="button" disabled={!has} onClick={uiClick(() => Messenger.composeLetter(selected))}>
        {t('friends.letterButton')}
      </button>
      <button type="button" disabled={!has} onClick={uiClick(() => Messenger.deleteFriend(selected))}>
        {t('friends.delete')}
      </button>
      <label className="messenger-hide">
        <input
          type="checkbox"
          checked={Messenger.appearOffline}
          onChange={e => Messenger.setAppearOffline(e.target.checked)}
        />
        {t('friends.hide')}
      </label>
    </div>
  );
});

/**
 * `CUIChatRoomListTabWindow`: the open chat-room windows by name;
 * double-click brings one up (or puts it away when it is already on top).
 */
const RoomsTab = observer(() => (
  <div
    className="messenger-body"
    data-no-drag="true"
    style={{ left: LIST.x + 8, top: LIST.y + 8, width: LIST.width - 16, height: LIST.height - 16 }}
  >
    <div className="messenger-head">
      {t('friends.roomsCount', { count: ChatRooms.rooms.length })}
    </div>
    <div className="messenger-list">
      {ChatRooms.rooms.length === 0 && (
        <div className="messenger-empty">{t('friends.roomsEmpty')}</div>
      )}
      {ChatRooms.rooms.map(room => (
        <div
          key={room.key}
          className={`messenger-row${ChatRooms.activeKey === room.key ? ' selected' : ''}`}
          onClick={uiClick(() => ChatRooms.setActiveRoom(room.key))}
          onDoubleClick={() => ChatRooms.openWindow(room.key)}
        >
          <span className={`messenger-dot${room.state === 'open' ? ' on' : ''}`} />
          <span className="messenger-name">{room.friendName}</span>
          <span className="messenger-meta">
            {room.unread
              ? t('friends.roomAlert')
              : room.state === 'closed'
                ? t('common.offline')
                : ''}
          </span>
        </div>
      ))}
    </div>
  </div>
));

const RoomsButtons = observer(() => {
  const room = ChatRooms.activeRoom;

  return (
    <div className="messenger-buttons" data-no-drag="true" style={{ top: BUTTONS_Y }}>
      <button
        type="button"
        disabled={!room}
        onClick={uiClick(() => room && ChatRooms.openWindow(room.key))}
      >
        {t('friends.open')}
      </button>
      <button
        type="button"
        disabled={!room}
        onClick={uiClick(() => room && ChatRooms.leaveRoom(room.key))}
      >
        {t('chatRoom.leave')}
      </button>
    </div>
  );
});

const LettersTab = observer(() => {
  const selected = Messenger.selectedLetter;

  return (
    <div
      className="messenger-body"
      data-no-drag="true"
      style={{ left: LIST.x + 8, top: LIST.y + 8, width: LIST.width - 16, height: LIST.height - 16 }}
    >
      <div className="messenger-head">
        {t('friends.lettersCount', {
          count: Messenger.letters.length,
          max: Messenger.maxLetters || '-',
        })}
        {Messenger.unreadLetters > 0 && (
          <span className="messenger-unread">
            {t('friends.unread', { count: Messenger.unreadLetters })}
          </span>
        )}
      </div>
      <div className="messenger-list">
        {Messenger.letters.length === 0 && (
          <div className="messenger-empty">{t('friends.lettersEmpty')}</div>
        )}
        {Messenger.letters.map(letter => (
          <div
            key={letter.index}
            className={`messenger-row letter${selected === letter.index ? ' selected' : ''}${
              letter.read ? '' : ' unread'
            }`}
            onClick={uiClick(() => Messenger.selectLetter(letter.index))}
            onDoubleClick={() => Messenger.openLetter(letter.index)}
          >
            <span className="messenger-name">{letter.sender}</span>
            <span className="messenger-subject">{letter.subject}</span>
            <span className="messenger-meta">{letter.timestamp}</span>
          </div>
        ))}
      </div>
    </div>
  );
});

const LettersButtons = observer(() => {
  const index = Messenger.selectedLetter;
  const letter = Messenger.letters.find(l => l.index === index);

  return (
    <div className="messenger-buttons" data-no-drag="true" style={{ top: BUTTONS_Y }}>
      <button type="button" onClick={uiClick(() => Messenger.composeLetter())}>
        {t('friends.write')}
      </button>
      <button type="button" disabled={!letter} onClick={uiClick(() => Messenger.openLetter(index))}>
        {t('friends.read')}
      </button>
      <button
        type="button"
        disabled={!letter}
        onClick={uiClick(() =>
          Messenger.composeLetter(
            letter!.sender,
            t('friends.replyPrefix', { subject: letter!.subject })
          )
        )}
      >
        {t('friends.reply')}
      </button>
      <button type="button" disabled={!letter} onClick={uiClick(() => Messenger.deleteLetter(index))}>
        {t('friends.delete')}
      </button>
    </div>
  );
});

/** `CUILetterReadWindow` / `CUILetterWriteWindow`, over the letter box. */
const LetterSheet = observer(() => {
  const view = Messenger.letterView;
  if (!view) return null;

  if (view.kind === 'read') {
    const letter = Messenger.letters.find(l => l.index === view.index);
    return (
      <div className="letter-sheet">
        <div className="letter-sheet-title">
          {letter?.subject ?? t('friends.letter')}
        </div>
        <div className="letter-sheet-meta">
          {t('friends.from', {
            sender: letter?.sender ?? '?',
            time: letter?.timestamp ?? '',
          })}
        </div>
        <div className="letter-sheet-body">
          {letter?.body ?? t('friends.openingLetter')}
        </div>
        <div className="letter-sheet-buttons">
          <button
            type="button"
            disabled={!letter}
            onClick={uiClick(() =>
              Messenger.composeLetter(
                letter!.sender,
                t('friends.replyPrefix', { subject: letter!.subject })
              )
            )}
          >
            {t('friends.reply')}
          </button>
          <button type="button" onClick={uiClick(() => Messenger.closeLetterView())}>
            {t('common.close')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="letter-sheet">
      <div className="letter-sheet-title">{t('friends.writeLetter')}</div>
      <label className="letter-field">
        {t('friends.to')}
        <input
          value={view.to}
          maxLength={10}
          spellCheck={false}
          onChange={e => Messenger.updateDraft({ to: e.target.value.replace(/[^A-Za-z0-9]/g, '') })}
        />
      </label>
      <label className="letter-field">
        {t('friends.subject')}
        <input
          value={view.subject}
          maxLength={MAX_LETTER_TITLE}
          spellCheck={false}
          onChange={e => Messenger.updateDraft({ subject: e.target.value })}
        />
      </label>
      <textarea
        className="letter-text"
        value={view.body}
        maxLength={MAX_LETTER_TEXT}
        spellCheck={false}
        onChange={e => Messenger.updateDraft({ body: e.target.value })}
      />
      <div className="letter-sheet-buttons">
        <button
          type="button"
          disabled={Messenger.sending || !view.to || !view.subject}
          onClick={uiClick(() => Messenger.sendLetter())}
        >
          {Messenger.sending ? t('common.sending') : t('common.send')}
        </button>
        <button type="button" onClick={uiClick(() => Messenger.closeLetterView())}>
          {t('common.cancel')}
        </button>
      </div>
    </div>
  );
});

export const FriendWindow = observer(() => {
  useEventBus('keyPressed', key => {
    if (isKey(HOT_KEY, key) && Store.world?.playerEntity) Messenger.toggleWindow();
  });

  // Escape closes the read/write sheet first, then the window.
  const onClose = () => {
    if (Messenger.letterView) Messenger.closeLetterView();
    else Messenger.closeWindow();
  };

  if (!Messenger.windowEnabled) return null;

  const tab = Messenger.tab;

  return (
    <MuItemWindow
      id={WINDOW_ID}
      className="messenger-window"
      column={2}
      label={t('friends.title')}
      onClose={onClose}
    >
      <div className="messenger-title" style={{ top: TITLE_Y }}>
        Friend List
      </div>
      <div
        className="head-close"
        data-no-drag="true"
        style={HEAD_CLOSE}
        onClick={() => Messenger.closeWindow()}
      />

      <TabStrip />

      <div
        className="table-fill"
        style={{ left: LIST.x, top: LIST.y, width: LIST.width, height: LIST.height }}
      />
      <MuTableFrame left={LIST.x} top={LIST.y} width={LIST.width} height={LIST.height} />

      {tab === 'letters' ? <LettersTab /> : tab === 'rooms' ? <RoomsTab /> : <FriendsTab />}
      {tab === 'letters' ? <LettersButtons /> : tab === 'rooms' ? <RoomsButtons /> : <FriendsButtons />}

      <LetterSheet />

      <div
        data-no-drag="true"
        style={{ position: 'absolute', left: EXIT_BUTTON.x, top: EXIT_BUTTON.y }}
      >
        <MuButton
          file={EXIT_SPRITE}
          width={EXIT_BUTTON.width}
          height={EXIT_BUTTON.height}
          frames={{ up: 0, down: 1 }}
          onClick={() => Messenger.closeWindow()}
        />
      </div>
    </MuItemWindow>
  );
});
