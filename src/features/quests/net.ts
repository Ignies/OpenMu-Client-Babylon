import { EventBus } from '@/core/eventBus';
import { OpenNpcDialogPacket } from '@versions/shared/packets/ServerToClientPackets';
import { quests } from './';

/**
 * F9 01 - `ReceiveNPCDlgUIStart`: the server opened the Season 6 NPC
 * dialogue (`g_QuestMng.SetNPC`, `INTERFACE_NPC_DIALOGUE`). Routed to the
 * quests facade, which opens what it can for that NPC number.
 */
EventBus.on('OpenNpcDialog', packet => {
  if (packet.byteLength < OpenNpcDialogPacket.Length!) return;
  const p = new OpenNpcDialogPacket(packet);
  quests.openNpcDialog(p.NpcNumber, p.GensContributionPoints);
});
