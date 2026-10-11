import { EnterGateRequestPacket, WarpCommandRequestPacket } from '@versions/shared/packets/ClientToServerPackets';
import { NetStats } from '@/controllers/net';
import { Session } from '../session';

/** EnterGateRequest: the hero stepped on a gate (`gateSystem`). */
export function enterGateRequest(gateNumber: number): void {
  const packet = EnterGateRequestPacket.createPacket();
  packet.GateNumber = gateNumber;
  packet.TeleportTargetX = 0;
  packet.TeleportTargetY = 0;

  NetStats.markSent('warp');
  Session.sendToGS(packet.buffer);
}

/**
 * `SendWarpCommandRequest` (C1 8E 02): a Move window row was clicked.
 * `index` is `MOVEREQINFO.index` from MoveReq_eng.bmd, which is the
 * `WarpInfo.Index` OpenMU looks up (`WarpHandlerPlugIn`). The original's
 * `CommandKey` is an anti-bot rolling key the server ignores, so it is 0.
 * The server answers with `MapChanged` or a blue message; nothing moves
 * locally.
 */
export function warpCommandRequest(index: number): void {
  const packet = WarpCommandRequestPacket.createPacket();
  packet.CommandKey = 0;
  packet.WarpInfoIndex = index;

  NetStats.markSent('warp');
  Session.sendToGS(packet.buffer);
}
