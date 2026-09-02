import './style.less';
import { useEffect, useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { t } from '../../../../../i18n';
import { ChatRooms, type ChatRoom } from '../../../../../chatRooms';
import { Messenger } from '../../../../../messenger';
import { isFriendOnline } from '../../../../../common/messenger';
import { Store } from '../../../../../store';
import { uiClick } from '../../../../../libs/sfx';
import { useWindowChrome } from '../../../../components/muWindow/useWindowChrome';

/**
 * `CUIChatWindow`, folded into one window with a tab per room the way the
 * original's `CUIChatRoomListTabWindow` lists them. Talking happens on the
 * chat server connection held by chatRooms.ts; this component only renders
 * its state.
 */

const WINDOW_ID = 'chat-room-window';
const WIDTH = 340;
const HEIGHT = 300;
/** `MAX_CHATROOM_TEXT_LENGTH - 1`: the original's input limit. */
const MAX_INPUT = 149;

const RoomBody = observer(({ room }: { room: ChatRoom }) => {
  const [draft, setDraft] = useState('');
  const [inviting, setInviting] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [room.lines.length, room.key]);

  useEffect(() => {
    setDraft('');
    setInviting(false);
  }, [room.key]);

  const send = () => {
    if (ChatRooms.sendMessage(draft)) setDraft('');
  };

  const others = room.clients.filter(c => c.name !== Store.playerData.name);
  const invitable = Messenger.friends.filter(
    f => isFriendOnline(f) && !room.clients.some(c => c.name === f.name)
  );

  return (
    <>
      <div className="chat-room-members">
        {room.state === 'connecting' && t('chatRoom.connecting')}
        {room.state === 'closed' && t('chatRoom.closed')}
        {room.state === 'open' &&
          (others.length === 0
            ? t('chatRoom.waiting', { name: room.friendName })
            : `${t('chatRoom.members', { count: room.clients.length })}: ${room.clients
                .map(c => c.name)
                .join(', ')}`)}
      </div>

      <div className="chat-room-lines" ref={listRef} data-no-drag="true">
        {room.lines.map((line, i) =>
          line.system ? (
            <div key={i} className="chat-room-line system">
              {line.text}
            </div>
          ) : (
            <div key={i} className="chat-room-line">
              <span className="sender">{line.sender}:</span> {line.text}
            </div>
          )
        )}
      </div>

      {inviting && (
        <div className="chat-room-invite-list" data-no-drag="true">
          {invitable.length === 0 && (
            <div className="chat-room-invite-empty">{t('chatRoom.inviteEmpty')}</div>
          )}
          {invitable.map(f => (
            <div
              key={f.name}
              className="chat-room-invite-row"
              onClick={uiClick(() => {
                ChatRooms.inviteFriend(f.name);
                setInviting(false);
              })}
            >
              {f.name}
            </div>
          ))}
        </div>
      )}

      <div className="chat-room-input" data-no-drag="true">
        <input
          value={draft}
          maxLength={MAX_INPUT}
          spellCheck={false}
          placeholder={t('chatRoom.inputPlaceholder')}
          disabled={room.state !== 'open'}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') send();
            e.stopPropagation();
          }}
        />
        <button
          type="button"
          disabled={room.state !== 'open'}
          onClick={uiClick(() => setInviting(v => !v))}
        >
          {t('chatRoom.invite')}
        </button>
        <button type="button" onClick={uiClick(() => ChatRooms.leaveRoom(room.key))}>
          {t('chatRoom.leave')}
        </button>
      </div>
    </>
  );
});

export const ChatRoomWindow = observer(() => {
  const chrome = useWindowChrome(WINDOW_ID, {
    width: WIDTH,
    height: HEIGHT,
    onClose: () => ChatRooms.closeWindow(),
  });

  if (!ChatRooms.windowEnabled) return null;
  const room = ChatRooms.activeRoom;
  if (!room) return null;

  return (
    <div
      ref={chrome.ref as React.Ref<HTMLDivElement>}
      role="dialog"
      aria-label={t('chatRoom.title')}
      className="chat-room-window"
      onPointerDown={chrome.onPointerDown}
      style={{ ...chrome.style, transformOrigin: '0 0' }}
    >
      <div className="chat-room-tabs">
        {ChatRooms.rooms.map(r => (
          <div
            key={r.key}
            className={`chat-room-tab${r.key === room.key ? ' active' : ''}${
              r.unread ? ' unread' : ''
            }`}
            data-no-drag="true"
            onClick={uiClick(() => ChatRooms.setActiveRoom(r.key))}
          >
            {r.friendName}
          </div>
        ))}
        <div
          className="chat-room-close"
          data-no-drag="true"
          onClick={uiClick(() => ChatRooms.closeWindow())}
        >
          ×
        </div>
      </div>

      <RoomBody room={room} />
    </div>
  );
});
