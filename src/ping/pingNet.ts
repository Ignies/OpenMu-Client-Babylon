import { Vector3 } from '../libs/babylon/exports';
import { EventBus } from '../libs/eventBus';
import { Store } from '../store';
import { effects } from '../effects';
import { followEntity } from '../effects/core';
import { TRAIL_ANCHOR, pingLiveFor } from '../effects/ping';
import {
  PING_VERSION,
  PingSub,
  decodeRelayFrame,
  encodePoint,
  type PingPoint,
} from '../common/pingProtocol';

/**
 * The map ping's one wire listener, and the one place a ping is asked for.
 * Inbound: the proxy's `PingRelay` frames (C1 FB) - a player in scope
 * pointed somewhere, or the relay's hello. Outbound: `requestPing`, called
 * by the gesture in `PointerInputSystem`, which sends the point and draws
 * the pointer locally in the same breath - waiting for the round trip would
 * put a visible lag on the player's own gesture.
 *
 * Installed once from `logic.ts`. It decides whether a ping happens; it
 * draws nothing itself - `effects/ping.ts` owns every pointer on screen.
 */

/** Tiles above the terrain the marker's own point sits at; the decal drapes from there. */
const MARKER_HEIGHT = 0.05;

let installed = false;
let available = false;
let helloSocket: WebSocket | null = null;

/** Whether the proxy on this connection relays pings at all. */
export function pingAvailable(): boolean {
  return available;
}

function targetOf(point: PingPoint): Vector3 | null {
  const world = Store.world;
  if (!world) return null;
  const y = world.getTerrainHeight(point.x, point.z);
  if (!Number.isFinite(y)) return null;
  return new Vector3(point.x, y + MARKER_HEIGHT, point.z);
}

/**
 * The gesture's one entry point: point at `(x, z)` in world tiles. Refused
 * while this player's own pointer is still live, which is the rule the proxy
 * enforces too - so a refusal here is the honest client staying inside it,
 * not an error. Returns whether a pointer was dropped.
 */
export function requestPing(x: number, z: number): boolean {
  const world = Store.world;
  const self = Store.playerId ?? -1;
  if (!world || self < 0) return false;
  if (pingLiveFor(self)) return false;

  const at = targetOf({ x, z });
  if (!at) return false;

  const hero = world.playerEntity;
  effects.spawn('ping', world.scene, at, {
    ownerId: self,
    owner: hero ? followEntity(hero, TRAIL_ANCHOR) : undefined,
  });

  // Offline, or through a proxy without the relay, the pointer is still the
  // player's own to see; it simply reaches nobody.
  if (available && !Store.isOffline) Store.sendPingFrame(encodePoint({ x, z }));
  return true;
}

export function installPingNet(): void {
  if (installed) return;
  installed = true;

  // The hello arrives on the game socket. Availability is tied to that
  // socket, not to "a socket closed": the connect-server socket is shut
  // after the game socket opens, and its close can land after the hello.
  EventBus.on('wsClosed', ({ socket }) => {
    if (socket !== helloSocket) return;
    helloSocket = null;
    available = false;
  });

  EventBus.on('PingRelay', view => {
    const msg = decodeRelayFrame(new Uint8Array(view.buffer, view.byteOffset, view.byteLength));
    if (!msg) return;

    if (msg.sub === PingSub.Hello) {
      helloSocket = Store.gsSocket ?? null;
      available = msg.version === PING_VERSION;
      console.info(`ping: relay hello, version ${msg.version} (this client speaks ${PING_VERSION})`);
      return;
    }

    // The sender drew their own pointer on the gesture; the relay never
    // echoes it back, so anything wearing this client's id is a stray.
    if (msg.senderId === (Store.playerId ?? -1)) return;

    const world = Store.world;
    if (!world) return;

    // A trail has to start at a body: a ping from someone this client cannot
    // see is dropped rather than drawn hanging in the air.
    const owner = world.getByNetId(msg.senderId);
    if (!owner || owner.objOutOfScope) return;

    const at = targetOf(msg.point);
    if (!at) return;

    effects.spawn('ping', world.scene, at, {
      ownerId: msg.senderId,
      owner: followEntity(owner, TRAIL_ANCHOR),
    });
  });
}
