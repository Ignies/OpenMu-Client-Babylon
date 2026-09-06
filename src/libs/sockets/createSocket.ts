import { EventBus } from "../eventBus";
import { ConnectServerPackets, ServerToClientPackets, SimpleModulusDecryptor, SimpleModulusKeys } from "../../common";
import { gameVersion } from "../../version";
import { byteToString, getPacketSize, getSizeOfPacketType } from "../../common/utils";
import { sessionNonce } from "../../common/sessionNonce";

type Options = {
  wsAddress: string;
  tcpIP: string;
  tcpPort: number;
};

const STCPackets = [...ConnectServerPackets, ...ServerToClientPackets].filter(p => p.Direction === 'ServerToClient');

const packetsCacheByCode: (typeof STCPackets)[] = [];

STCPackets.forEach(p => {
  const code = p.Code;

  if (packetsCacheByCode[code] == null) {
    packetsCacheByCode[code] = [p];
  } else {
    packetsCacheByCode[code].push(p);
  }
});

/**
 * Several packets share a code with no sub-code and a variable length (e.g.
 * 0x12 AddCharactersToScope / …075 / …095 / AddCharacterToScopeExtended), so
 * they cannot be told apart from the header. The server picks the variant by
 * the client version we log in with (OpenMU `MinimumClient`): the classic
 * Season 6 layout. Prefer it over the old-version (075/095) and the
 * "extended" (client >= 106.3) variants, whatever the generated order.
 */
function variantRank(p: (typeof STCPackets)[number]): number {
  // The rank is the game version's (`gameVersion.protocol.variantRank`).
  return gameVersion.protocol.variantRank(p.Name);
}

/** Server → client SimpleModulus keys of the game version we speak. */
const SERVER_TO_CLIENT_KEYS = SimpleModulusKeys.CreateDecryptionKeys([
  ...gameVersion.protocol.encryption.serverToClient,
]);

packetsCacheByCode.forEach(list => {
  list?.sort((a, b) => variantRank(a) - variantRank(b));
});

/**
 * ChatMessage (C1, code 0x00) keeps its `ChatMessageType` in the code byte
 * itself (field index 2): OpenMU writes `Whisper` = 0x02 there
 * (`ChatMessageRef.Type`, GameServer/RemoteView/ChatViewPlugIn.cs), so an
 * inbound whisper arrives as "code 0x02", which no generated class claims.
 * Route it to the same parser; logic.ts reads `p.Type` off that byte and
 * colours the line as a whisper. OpenMU emits only Normal (0x00) and Whisper
 * (0x02) - party / guild / alliance lines are Normal with a text prefix.
 */
const WHISPER_CHAT_CODE = 0x02;
const chatMessageDef = STCPackets.find(p => p.Name === 'ChatMessage');
if (
  chatMessageDef &&
  !packetsCacheByCode[WHISPER_CHAT_CODE]?.some(p => p.Name === 'ChatMessage')
) {
  // In front: the ConnectServer's PatchVersionOkay is also code 0x02 with no
  // sub-code, and the dispatcher's last fallback takes the first such entry.
  // On the game server a 0x02 is always the whisper.
  (packetsCacheByCode[WHISPER_CHAT_CODE] ??= []).unshift(chatMessageDef);
}

const HEADERS = new Set<number>([0xc1, 0xc2, 0xc3, 0xc4]);

const DEBUG_LOG = false;
const INFO_LOG = false;

/** Packet names already reported as unhandled (once per session). */
const unhandledReported = new Set<string>();

export function createSocket({ wsAddress, tcpIP, tcpPort }: Options) {
  const LOG_PREFIX = `[${tcpIP}:${tcpPort}]`;

  const decryptor = new SimpleModulusDecryptor();
  decryptor.decryptionKeys = SERVER_TO_CLIENT_KEYS;

  // `&session=`: the page's nonce (src/common/sessionNonce.ts), so the proxy
  // can put the login it reads off this socket to the cash shop's ticket
  // route. Only the sockets built here carry it, because they are the ones a
  // login travels on. `chatRoomSocket.ts` builds the same URL and does not: a
  // chat socket never logs in, so the nonce would name nothing there and only
  // be one more place a credential travels. `serverProbe.ts` must not: it
  // dials other people's proxies two at a time, and a nonce handed to a
  // stranger's proxy is a name their presence server gets to claim.
  const socket = new WebSocket(
    `${wsAddress}?host=${tcpIP}&port=${tcpPort}&session=${sessionNonce()}`
  );
  socket.binaryType = "arraybuffer";

  let bytes = new Uint8Array(0);

  /**
   * Decrypt problems, with the wire bytes so a real framing bug can be read
   * off the console. A counter resync is a warning (the packet was kept); a
   * malformed packet is an error (dropped, queue advanced by its wire size).
   * Both are rate-limited: the first few with a hex dump, then a count every
   * 50 so a bad stream can't flood the console.
   */
  let decryptReports = 0;
  function reportDecrypt(kept: boolean, reason: string, wire: Uint8Array) {
    decryptReports++;
    if (decryptReports > 3 && decryptReports % 50 !== 0) return;
    const hex = Array.from(wire.subarray(0, 32), byteToString).join(' ');
    const line = `${LOG_PREFIX}${kept ? 'decrypt resync' : "can't decrypt packet"} #${decryptReports}: ${reason}; wire(${wire.length}): ${hex}${wire.length > 32 ? ' …' : ''}`;
    kept ? console.warn(line) : console.error(line);
  }

  const subCodeOf = (p: (typeof STCPackets)[number]) =>
    (p as { SubCode?: number }).SubCode;
  const lengthOf = (p: (typeof STCPackets)[number]) =>
    (p as { Length?: number }).Length;

  function handlePacketsQueue() {
    while (bytes.length > 0) {
      const packetType = bytes[0];

      if (!HEADERS.has(packetType)) {
        // Not a header byte: drop it and rescan, so garbage can't jam the queue.
        console.error(`${LOG_PREFIX}NOT_MU_PACKET: 0x${byteToString(packetType)}`);
        bytes = bytes.subarray(1);
        continue;
      }

      const packetHeaderSize = getSizeOfPacketType(packetType);

      // Wait for the full header, then the full packet, before parsing.
      if (bytes.length < packetHeaderSize + 1) return;

      const length = getPacketSize(bytes);

      if (length < packetHeaderSize + 1) {
        console.error(`${LOG_PREFIX}bad packet length ${length}, resyncing`);
        bytes = bytes.subarray(1);
        continue;
      }

      if (bytes.length < length) return;

      // Copy: generated packet classes slice the raw buffer with view-relative
      // indices, so their DataView must start at byteOffset 0.
      let packet = new DataView(
        bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + length)
      );
      DEBUG_LOG && console.log(`${LOG_PREFIX}Try to find packet 0x${byteToString(packetType)}, lng: ${length}`);

      if (packetType >= 0xc3) {
        // `length` is the encrypted wire size (11-byte blocks); the queue is
        // advanced by it below. The decrypted packet is shorter (8-byte
        // blocks, minus the counter byte) and carries its own length header,
        // which is what the parsers read.
        const wire = new Uint8Array(bytes.buffer, bytes.byteOffset, length);
        let ok = false;
        let decryptedPacket: Uint8Array = wire;
        try {
          [ok, decryptedPacket] = decryptor.Decrypt(wire);
        } catch (e) {
          // Never let a decoder throw escape: it would leave `bytes` untouched
          // and every later frame would re-hit the same packet forever.
          decryptor.lastError = `threw ${e instanceof Error ? e.message : String(e)}`;
        }

        if (decryptor.lastError != null) {
          reportDecrypt(ok, decryptor.lastError, wire);
        }

        if (!ok) {
          bytes = bytes.subarray(length);
          continue;
        }
        packet = new DataView(decryptedPacket.buffer as ArrayBuffer);
        DEBUG_LOG && console.log(`${LOG_PREFIX}Decrypted packet 0x${byteToString(packetType)}, lng: ${length}:`, decryptedPacket);
      }

      const codeIndex = packetHeaderSize === 3 ? 3 : 2;
      const packetCode = packet.getUint8(codeIndex);

      const subCode =
        packet.byteLength > codeIndex + 1 ? packet.getUint8(codeIndex + 1) : -1;

      const decodedLength =
        packetHeaderSize === 2
          ? packet.getUint8(1)
          : (packet.getUint8(1) << 8) | packet.getUint8(2);

      const packetsByCode = packetsCacheByCode[packetCode] ?? [];

      const pDef =
        packetsByCode.find(
          p => subCodeOf(p) === subCode && lengthOf(p) === decodedLength
        ) ??
        packetsByCode.find(
          p => subCodeOf(p) === subCode && lengthOf(p) == null
        ) ??
        packetsByCode.find(
          p => subCodeOf(p) == null && lengthOf(p) === decodedLength
        ) ??
        packetsByCode.find(p => subCodeOf(p) == null);

      if (pDef) {
        INFO_LOG && console.log(
          `${LOG_PREFIX}[${pDef.name}][${pDef.HeaderType}]0x${byteToString(pDef.Code)}${subCodeOf(pDef) != null ? `(0x${byteToString(subCodeOf(pDef)!)})` : ""
          } lng:${length}`
        );

        if (!EventBus.all.get(pDef.Name)?.length && !unhandledReported.has(pDef.Name)) {
          // Netcode audit: a packet we can parse but nobody listens to.
          unhandledReported.add(pDef.Name);
          console.warn(`${LOG_PREFIX}unhandled packet ${pDef.Name} (0x${byteToString(pDef.Code)}${subCodeOf(pDef) != null ? `/0x${byteToString(subCodeOf(pDef)!)}` : ''})`);
        }

        // A throwing handler must not jam the queue: consume the packet regardless.
        try {
          EventBus.emit(pDef.Name, packet);
        } catch (e) {
          console.error(`${LOG_PREFIX}handler for ${pDef.Name} threw:`, e);
        }
      } else {
        console.error(`${LOG_PREFIX}no packet: 0x` + byteToString(packetCode));
      }

      bytes = bytes.subarray(length);
    }
  }

  socket.addEventListener("message", (event) => {
    const buffer = event.data as ArrayBuffer;

    const newBytes = new Uint8Array(buffer);
    DEBUG_LOG && console.log(`${LOG_PREFIX}received ${newBytes.length} bytes:`, newBytes);

    if (bytes.length === 0) {
      bytes = newBytes;
    } else {
      const combined = new Uint8Array(bytes.length + newBytes.length);
      combined.set(bytes);
      combined.set(newBytes, bytes.length);
      bytes = combined;
    }

    handlePacketsQueue();
  });

  socket.addEventListener("open", (event) => {
    console.log(`${LOG_PREFIX}opened:`, event);
    EventBus.emit('wsOpened', { socket });
  });

  socket.addEventListener("close", (event) => {
    console.log(`${LOG_PREFIX}closed:`, event);
    EventBus.emit('wsClosed', { socket });
  });

  socket.addEventListener("error", (event) => {
    console.log(`${LOG_PREFIX}error:`, event);
    EventBus.emit('wsError', { socket, error: (event as ErrorEvent).error });
  });

return { socket } as const;
}