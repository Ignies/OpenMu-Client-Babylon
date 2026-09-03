import { wsAddress } from '../../common/serverConfig';
import { Xor32Encryptor } from '../../common/encryption/xor32';
import {
  ChatFrameSplitter,
  decodeChatServerFrame,
  encodeAuthenticate,
  encodeChatMessage,
  encodeKeepAlive,
  encodeLeave,
  type ChatServerEvent,
} from '../../common/chatRoomProtocol';

/**
 * One connection to the OpenMU ChatServer, carried over the same ws proxy the
 * game sockets use (`?host=&port=`). Deliberately separate from
 * `createSocket`: the chat server speaks its own small protocol - plain
 * C1/C2 frames in, Xor32 on every frame out (the reference client opens this
 * connection with `isEncrypted=true`, UIWindows.cpp ConnectToChatServer),
 * no SimpleModulus in either direction.
 */

/** `CHATCONNECT_TIMER`: the original pings every open room each 15 s. */
const KEEP_ALIVE_MS = 15_000;

export type ChatRoomSocketOptions = {
  host: string;
  port: number;
  roomId: number;
  token: number;
  onEvent: (event: ChatServerEvent) => void;
  /** Fired once, whether the connect failed or an open socket died. */
  onClose: (everOpened: boolean) => void;
};

export type ChatRoomSocket = {
  readonly isOpen: boolean;
  sendMessage(text: string): void;
  /** SendLeaveChatRoom + close; onClose is not fired for a deliberate leave. */
  leave(): void;
};

export function openChatRoomSocket(options: ChatRoomSocketOptions): ChatRoomSocket {
  const { host, port, roomId, token } = options;
  // The chat server always uses OpenMU's default Xor32 key, whatever game
  // version the login went through.
  const xor32 = new Xor32Encryptor();
  const splitter = new ChatFrameSplitter();

  let opened = false;
  let finished = false;
  let keepAlive: ReturnType<typeof setInterval> | null = null;

  const socket = new WebSocket(`${wsAddress()}?host=${host}&port=${port}`);
  socket.binaryType = 'arraybuffer';

  function send(frame: Uint8Array): void {
    if (socket.readyState === WebSocket.OPEN) socket.send(xor32.Encrypt(frame));
  }

  function finish(deliberate: boolean): void {
    if (finished) return;
    finished = true;
    if (keepAlive !== null) clearInterval(keepAlive);
    keepAlive = null;
    if (!deliberate) options.onClose(opened);
  }

  socket.addEventListener('open', () => {
    opened = true;
    send(encodeAuthenticate(roomId, token));
    keepAlive = setInterval(() => send(encodeKeepAlive()), KEEP_ALIVE_MS);
  });

  socket.addEventListener('message', event => {
    if (finished) return;
    for (const frame of splitter.push(new Uint8Array(event.data as ArrayBuffer))) {
      const decoded = decodeChatServerFrame(frame);
      if (decoded) options.onEvent(decoded);
    }
  });

  // The proxy closes the ws when its TCP connect fails, so a bad chat server
  // address lands here too.
  socket.addEventListener('close', () => finish(false));
  socket.addEventListener('error', () => finish(false));

  return {
    get isOpen() {
      return opened && !finished && socket.readyState === WebSocket.OPEN;
    },
    sendMessage(text: string) {
      // The original always sends index 0; the server stamps the real one.
      send(encodeChatMessage(0, text));
    },
    leave() {
      send(encodeLeave());
      finish(true);
      socket.close();
    },
  };
}
