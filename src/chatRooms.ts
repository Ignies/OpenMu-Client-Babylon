import { t } from './i18n';
import { action, makeObservable, observable, reaction, runInAction } from 'mobx';
import { Store, UIState } from './store';
import { Social } from './social';
import {
  ChatRoomCreateRequestPacket,
  ChatRoomInvitationRequestPacket,
} from './common/packets/ClientToServerPackets';
import { CHAT_SERVER_PORT, type ChatClient } from './common/chatRoomProtocol';
import { openChatRoomSocket, type ChatRoomSocket } from './libs/sockets/chatRoomSocket';
import { playUiSound } from './libs/sfx';

export type ChatRoomLine = {
  sender: string;
  text: string;
  system?: boolean;
};

export type ChatRoomState = 'connecting' | 'open' | 'closed';

export type ChatRoom = {
  /** Stable UI key; the server room id can change when a room is reused. */
  key: number;
  roomId: number;
  /** The other side of the create request; the tab label. */
  friendName: string;
  state: ChatRoomState;
  clients: ChatClient[];
  lines: ChatRoomLine[];
  unread: boolean;
};

/** The original refuses invitations past 30 members (UIWindows.cpp). */
const MAX_ROOM_CLIENTS = 30;
const MAX_LINES = 200;
/** An 0xCA create request the server never answered is forgotten after this. */
const CREATE_TIMEOUT_MS = 10_000;

/**
 * The chat rooms of MU's separate chat server: `CUIChatWindow` and the
 * chat-room tab of the friend window, on OpenMU's ChatServer. The game
 * server only brokers the room (0xCA/0xCB and ChatRoomConnectionInfo); the
 * talking happens on a second connection owned by chatRoomSocket.ts.
 */
export const ChatRooms = new (class _ChatRooms {
  windowEnabled = false;
  rooms: ChatRoom[] = [];
  activeKey = -1;

  /** Sockets by room key; not observable state. */
  private sockets = new Map<number, ChatRoomSocket>();
  /** In-flight 0xCA creates by friend name (`AddRequestWindow` dedupe). */
  private pendingCreates = new Map<string, ReturnType<typeof setTimeout>>();
  /** In-flight 0xCB invites: RequestId -> invited name. */
  private pendingInvites = new Map<number, string>();
  private nextKey = 1;
  private nextRequestId = 1;
  private stopWatching: (() => void) | null = null;

  constructor() {
    makeObservable(this, {
      windowEnabled: observable,
      rooms: observable,
      activeKey: observable,
      openWindow: action,
      closeWindow: action,
      setActiveRoom: action,
      onConnectionInfo: action,
      leaveRoom: action,
      reset: action,
    });
  }

  /**
   * Rooms live on their own connections but belong to the character: gone
   * with the world (relog, lost server, back to the server list). Armed
   * lazily, not in the constructor: store.ts imports this module through
   * logic.ts, so at module-evaluation time `Store` is still in its temporal
   * dead zone and a top-level reaction throws (same as skills/buffs.ts).
   */
  private ensureWatching(): void {
    if (this.stopWatching) return;
    this.stopWatching = reaction(
      () => Store.uiState,
      state => {
        if (state !== UIState.World) this.reset();
      }
    );
  }

  get activeRoom(): ChatRoom | null {
    return this.rooms.find(r => r.key === this.activeKey) ?? null;
  }

  reset(): void {
    for (const socket of this.sockets.values()) socket.leave();
    this.sockets.clear();
    for (const timer of this.pendingCreates.values()) clearTimeout(timer);
    this.pendingCreates.clear();
    this.pendingInvites.clear();
    this.windowEnabled = false;
    this.rooms = [];
    this.activeKey = -1;
  }

  // ---- window ---------------------------------------------------------------

  openWindow(key?: number): void {
    if (this.rooms.length === 0) return;
    this.windowEnabled = true;
    const room =
      (key !== undefined ? this.rooms.find(r => r.key === key) : this.activeRoom) ??
      this.rooms[0];
    this.activeKey = room.key;
    room.unread = false;
  }

  closeWindow(): void {
    this.windowEnabled = false;
  }

  setActiveRoom(key: number): void {
    const room = this.rooms.find(r => r.key === key);
    if (!room) return;
    this.activeKey = key;
    room.unread = false;
  }

  get unreadRooms(): number {
    return this.rooms.filter(r => r.unread).length;
  }

  // ---- game server side (create / invite) ------------------------------------

  /**
   * The friend window's Talk button (`CUIFriendListTabWindow` button 3):
   * reuse an existing room with that friend, otherwise ask the game server
   * for a new one and wait for ChatRoomConnectionInfo.
   */
  openRoomWith(friendName: string): void {
    this.ensureWatching();
    const existing = this.rooms.find(
      r => r.friendName === friendName && r.state !== 'closed'
    );
    if (existing) {
      this.openWindow(existing.key);
      return;
    }
    if (this.pendingCreates.has(friendName)) return;
    this.pendingCreates.set(
      friendName,
      setTimeout(() => this.pendingCreates.delete(friendName), CREATE_TIMEOUT_MS)
    );
    const packet = ChatRoomCreateRequestPacket.createPacket();
    packet.setFriendName(friendName);
    Store.sendToGS(packet.buffer);
  }

  /** The invite list of the room window: pull one more friend in. */
  inviteFriend(friendName: string): void {
    const room = this.activeRoom;
    if (!room || room.state !== 'open') return;
    if (room.clients.some(c => c.name === friendName)) return;
    if (room.clients.length >= MAX_ROOM_CLIENTS) {
      Social.errorMessage(t('chatRoom.full'));
      return;
    }
    const requestId = this.nextRequestId++;
    this.pendingInvites.set(requestId, friendName);
    const packet = ChatRoomInvitationRequestPacket.createPacket();
    packet.setFriendName(friendName);
    packet.RoomId = room.roomId;
    packet.RequestId = requestId;
    Store.sendToGS(packet.buffer);
  }

  /** FriendInvitationResult echoes our RequestId; true when it was ours. */
  inviteResult(success: boolean, requestId: number): boolean {
    const name = this.pendingInvites.get(requestId);
    if (name === undefined) return false;
    this.pendingInvites.delete(requestId);
    if (!success) Social.errorMessage(t('chatRoom.inviteFailed', { name }));
    return true;
  }

  /**
   * ChatRoomConnectionInfo: the game server brokered a room and hands over
   * where to meet. `initiated` = an own create request was pending, so the
   * window pops open; an incoming invitation stays a tab with an alert until
   * it is looked at (the original's `UISTATE_READY` rooms).
   */
  onConnectionInfo(info: {
    host: string;
    roomId: number;
    token: number;
    friendName: string;
    success: boolean;
  }): void {
    this.ensureWatching();
    const pending = this.pendingCreates.get(info.friendName);
    const initiated = pending !== undefined;
    if (pending !== undefined) {
      clearTimeout(pending);
      this.pendingCreates.delete(info.friendName);
    }

    if (!info.success) {
      Social.errorMessage(
        info.friendName
          ? t('chatRoom.openFailedWith', { name: info.friendName })
          : t('chatRoom.openFailed')
      );
      return;
    }

    // A second info for the same friend reconnects the existing room with
    // the fresh room id and token (the original's Type 1 path).
    let room = this.rooms.find(r => r.friendName === info.friendName) ?? null;
    if (room) {
      this.sockets.get(room.key)?.leave();
      this.sockets.delete(room.key);
      room.roomId = info.roomId;
      room.state = 'connecting';
      room.clients = [];
    } else {
      room = {
        key: this.nextKey++,
        roomId: info.roomId,
        friendName: info.friendName,
        state: 'connecting',
        clients: [],
        lines: [],
        unread: false,
      };
      this.rooms.push(room);
    }

    this.connect(room.key, info.host, info.roomId, info.token);

    if (initiated) {
      this.openWindow(room.key);
    } else {
      room.unread = true;
      Social.systemMessage(t('chatRoom.opened', { name: info.friendName }));
      playUiSound('whisper');
    }
  }

  // ---- chat server side -------------------------------------------------------

  private connect(key: number, host: string, roomId: number, token: number): void {
    const socket = openChatRoomSocket({
      host,
      port: CHAT_SERVER_PORT,
      roomId,
      token,
      onEvent: event => {
        const room = this.rooms.find(r => r.key === key);
        if (!room) return;
        runInAction(() => {
          switch (event.kind) {
            case 'clients':
              // The list follows a successful authentication: the room is live.
              room.state = 'open';
              room.clients = event.clients;
              break;
            case 'joined':
              room.state = 'open';
              if (!room.clients.some(c => c.index === event.index)) {
                room.clients.push({ index: event.index, name: event.name });
              }
              this.addLine(room, {
                sender: '',
                text: t('chatRoom.joined', { name: event.name }),
                system: true,
              });
              break;
            case 'left':
              room.clients = room.clients.filter(c => c.index !== event.index);
              this.addLine(room, {
                sender: '',
                text: t('chatRoom.left', { name: event.name }),
                system: true,
              });
              break;
            case 'message': {
              const sender =
                room.clients.find(c => c.index === event.senderIndex)?.name ?? '?';
              this.addLine(room, { sender, text: event.text });
              if (sender !== Store.playerData.name) {
                const visible =
                  this.windowEnabled && this.activeKey === room.key;
                if (!visible) {
                  room.unread = true;
                  playUiSound('whisper');
                }
              }
              break;
            }
          }
        });
      },
      onClose: everOpened => {
        const room = this.rooms.find(r => r.key === key);
        this.sockets.delete(key);
        if (!room) return;
        runInAction(() => {
          room.state = 'closed';
          this.addLine(room, {
            sender: '',
            text: everOpened
              ? t('chatRoom.connectionLost')
              : t('chatRoom.unreachable'),
            system: true,
          });
        });
        if (!everOpened) Social.errorMessage(t('chatRoom.unreachable'));
      },
    });
    this.sockets.set(key, socket);
  }

  private addLine(room: ChatRoom, line: ChatRoomLine): void {
    room.lines.push(line);
    if (room.lines.length > MAX_LINES) room.lines.splice(0, room.lines.length - MAX_LINES);
  }

  sendMessage(text: string): boolean {
    const room = this.activeRoom;
    const trimmed = text.trim();
    if (!room || !trimmed) return false;
    const socket = this.sockets.get(room.key);
    if (room.state !== 'open' || !socket?.isOpen) return false;
    // The server relays the message back to everyone in the room, the sender
    // included; the line is drawn when the echo arrives, like the original.
    socket.sendMessage(trimmed);
    return true;
  }

  leaveRoom(key: number): void {
    this.sockets.get(key)?.leave();
    this.sockets.delete(key);
    this.rooms = this.rooms.filter(r => r.key !== key);
    if (this.activeKey === key) {
      this.activeKey = this.rooms.length > 0 ? this.rooms[this.rooms.length - 1].key : -1;
    }
    if (this.rooms.length === 0) this.windowEnabled = false;
  }
})();

// A hot update that reaches this module must reload the page: Vite would
// otherwise re-execute it and hand later-loaded importers a second instance
// of this singleton (same guard as store.ts).
const hot = (import.meta as { hot?: { decline(): void } }).hot;
if (hot) hot.decline();
